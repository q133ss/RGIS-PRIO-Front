import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Button, Dropdown, Form, InputGroup, Spinner, Alert, Pagination, Offcanvas, OverlayTrigger, Tooltip, Modal, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { getMonitoringData, initializeApi } from '../../services/api';

const MAX_API_RETRY_ATTEMPTS = 3;

interface MonitoringItem {
  id: number;
  name: string;
  installed_capacity_gcal_hour: string;
  available_capacity_gcal_hour: string;
  primary_fuel_type: string;
  secondary_fuel_type: string;
  temperature_schedule: string;
  parameters: {
    current_temperature: string;
    current_pressure: string;
    hydraulic_tests: string;
  };
  address: {
    id: number;
    street: {
      name: string;
      city: {
        name: string;
      };
    };
    house_number: string;
    building: string | null;
  };
  type: {
    name: string;
  };
  owner: {
    shortName: string;
    fullName: string;
  };
  org: {
    shortName: string;
    fullName: string;
  };
  period: {
    name: string;
  };
}

interface MonitoringState {
  items: MonitoringItem[];
  loading: boolean;
  error: string | null;
  success: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  selectedSettlement: string | null;
  searchQuery: string;
}

interface TableColumn {
  id: string;
  title: string;
  width: number;
  visible: boolean;
  field: keyof MonitoringItem | 'temperature' | 'pressure' | 'hydraulic_tests' | 'address_full';
}

const MonitoringPage: React.FC = () => {
  const [state, setState] = useState<MonitoringState>({
    items: [],
    loading: true,
    error: null,
    success: '',
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    selectedSettlement: null,
    searchQuery: ''
  });
  
  const [columns, setColumns] = useState<TableColumn[]>([
    { id: 'id', title: '№', width: 70, visible: true, field: 'id' },
    { id: 'name', title: 'НАИМЕНОВАНИЕ', width: 200, visible: true, field: 'name' },
    { id: 'address_full', title: 'АДРЕС', width: 180, visible: true, field: 'address_full' },
    { id: 'owner', title: 'СОБСТВЕННИК', width: 180, visible: true, field: 'owner' },
    { id: 'org', title: 'ОПЕРАТОР', width: 180, visible: true, field: 'org' },
    { id: 'temperature', title: 'ТЕМПЕРАТУРА', width: 140, visible: true, field: 'temperature' },
    { id: 'pressure', title: 'ДАВЛЕНИЕ', width: 140, visible: true, field: 'pressure' },
    { id: 'hydraulic_tests', title: 'ГИДРАВЛИЧЕСКИЕ ИСПЫТАНИЯ', width: 180, visible: true, field: 'hydraulic_tests' },
    { id: 'temperature_schedule', title: 'ТЕМПЕРАТУРНЫЙ ГРАФИК', width: 180, visible: true, field: 'temperature_schedule' },
    { id: 'installed_capacity_gcal_hour', title: 'УСТАНОВЛЕННАЯ МОЩНОСТЬ, ГКАЛ/ЧАС', width: 180, visible: true, field: 'installed_capacity_gcal_hour' },
    { id: 'available_capacity_gcal_hour', title: 'ДОСТУПНАЯ МОЩНОСТЬ, ГКАЛ/ЧАС', width: 180, visible: true, field: 'available_capacity_gcal_hour' },
    { id: 'primary_fuel_type', title: 'ОСНОВНОЙ ВИД ТОПЛИВА', width: 180, visible: true, field: 'primary_fuel_type' },
    { id: 'secondary_fuel_type', title: 'ВТОРИЧНЫЙ ВИД ТОПЛИВА', width: 180, visible: true, field: 'secondary_fuel_type' }
  ]);

  const [activeFilters, setActiveFilters] = useState({
    owner: '',
    operator: '',
    hydraulicTests: ''
  });
  
  const [filterOptions, setFilterOptions] = useState({
    owners: [] as string[],
    operators: [] as string[],
    hydraulicTests: ['Проведены', 'Не проведены']
  });

  const [isTableCustomized, setIsTableCustomized] = useState<boolean>(false);
  const [sortField, setSortField] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchInput, setSearchInput] = useState('');
  const [authError, setAuthError] = useState<boolean>(false);
  const [apiRetryCount, setApiRetryCount] = useState<number>(0);
  const [apiSuccessful, setApiSuccessful] = useState<boolean>(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showColumnsSettings, setShowColumnsSettings] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [currentItem, setCurrentItem] = useState<MonitoringItem | null>(null);
  
  const tableRef = useRef<HTMLTableElement>(null);
  
  useEffect(() => {
    const savedColumns = localStorage.getItem('monitoringColumns');
    if (savedColumns) {
      try {
        const parsedColumns = JSON.parse(savedColumns);
        setColumns(parsedColumns);
        setIsTableCustomized(true);
      } catch (e) {
        setIsTableCustomized(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isTableCustomized) {
      localStorage.setItem('monitoringColumns', JSON.stringify(columns));
    }
  }, [columns, isTableCustomized]);

  const handleResizeStart = (e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isResizing) return;
    
    const column = columns.find(c => c.id === columnId);
    if (!column) return;
    
    const startX = e.clientX;
    const startWidth = column.width;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(50, startWidth + deltaX);
      
      if (tableRef.current) {
        const headerCells = tableRef.current.querySelectorAll('th');
        const dataCells = tableRef.current.querySelectorAll('tbody tr td');
        
        const columnIndex = columns.filter(c => c.visible).findIndex(c => c.id === columnId);
        if (columnIndex >= 0) {
          if (headerCells[columnIndex]) {
            (headerCells[columnIndex] as HTMLElement).style.width = `${newWidth}px`;
            (headerCells[columnIndex] as HTMLElement).style.minWidth = `${newWidth}px`;
          }
          
          for (let i = 0; i < dataCells.length; i++) {
            if ((i % headerCells.length) === columnIndex) {
              (dataCells[i] as HTMLElement).style.width = `${newWidth}px`;
              (dataCells[i] as HTMLElement).style.minWidth = `${newWidth}px`;
            }
          }
        }
      }
    };
    
    const handleMouseUp = (upEvent: MouseEvent) => {
      const deltaX = upEvent.clientX - startX;
      const newWidth = Math.max(50, startWidth + deltaX);
      
      setColumns(prevColumns => 
        prevColumns.map(col => 
          col.id === columnId ? { ...col, width: newWidth } : col
        )
      );
      setIsTableCustomized(true);
      setIsResizing(false);
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.classList.remove('resizing');
    };
    
    setIsResizing(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.classList.add('resizing');
  };

  const handleColumnVisibilityChange = (columnId: string, visible: boolean) => {
    setColumns(prevColumns => 
      prevColumns.map(col => 
        col.id === columnId 
          ? { ...col, visible } 
          : col
      )
    );
    setIsTableCustomized(true);
  };

  const resetTableSettings = () => {
    const defaultColumns: TableColumn[] = [
      { id: 'id', title: '№', width: 70, visible: true, field: 'id' },
      { id: 'name', title: 'НАИМЕНОВАНИЕ', width: 200, visible: true, field: 'name' },
      { id: 'address_full', title: 'АДРЕС', width: 180, visible: true, field: 'address_full' },
      { id: 'owner', title: 'СОБСТВЕННИК', width: 180, visible: true, field: 'owner' },
      { id: 'org', title: 'ОПЕРАТОР', width: 180, visible: true, field: 'org' },
      { id: 'temperature', title: 'ТЕМПЕРАТУРА', width: 140, visible: true, field: 'temperature' },
      { id: 'pressure', title: 'ДАВЛЕНИЕ', width: 140, visible: true, field: 'pressure' },
      { id: 'hydraulic_tests', title: 'ГИДРАВЛИЧЕСКИЕ ИСПЫТАНИЯ', width: 180, visible: true, field: 'hydraulic_tests' },
      { id: 'temperature_schedule', title: 'ТЕМПЕРАТУРНЫЙ ГРАФИК', width: 180, visible: true, field: 'temperature_schedule' },
      { id: 'installed_capacity_gcal_hour', title: 'УСТАНОВЛЕННАЯ МОЩНОСТЬ, ГКАЛ/ЧАС', width: 180, visible: true, field: 'installed_capacity_gcal_hour' },
      { id: 'available_capacity_gcal_hour', title: 'ДОСТУПНАЯ МОЩНОСТЬ, ГКАЛ/ЧАС', width: 180, visible: true, field: 'available_capacity_gcal_hour' },
      { id: 'primary_fuel_type', title: 'ОСНОВНОЙ ВИД ТОПЛИВА', width: 180, visible: true, field: 'primary_fuel_type' },
      { id: 'secondary_fuel_type', title: 'ВТОРИЧНЫЙ ВИД ТОПЛИВА', width: 180, visible: true, field: 'secondary_fuel_type' }
    ];
    setColumns(defaultColumns);
    localStorage.removeItem('monitoringColumns');
    setIsTableCustomized(false);
    setShowColumnsSettings(false);
  };

  const sortData = (data: MonitoringItem[]): MonitoringItem[] => {
    return [...data].sort((a, b) => {
      // Особые случаи для вычисляемых полей
      if (sortField === 'temperature') {
        const aTemp = parseFloat(a.parameters.current_temperature) || 0;
        const bTemp = parseFloat(b.parameters.current_temperature) || 0;
        return sortDirection === 'asc' ? aTemp - bTemp : bTemp - aTemp;
      }
      
      if (sortField === 'pressure') {
        const aPress = parseFloat(a.parameters.current_pressure) || 0;
        const bPress = parseFloat(b.parameters.current_pressure) || 0;
        return sortDirection === 'asc' ? aPress - bPress : bPress - aPress;
      }
      
      if (sortField === 'hydraulic_tests') {
        const aTests = a.parameters.hydraulic_tests || '';
        const bTests = b.parameters.hydraulic_tests || '';
        return sortDirection === 'asc' 
          ? aTests.localeCompare(bTests, 'ru')
          : bTests.localeCompare(aTests, 'ru');
      }
      
      if (sortField === 'address_full') {
        const aAddr = formatAddress(a.address) || '';
        const bAddr = formatAddress(b.address) || '';
        return sortDirection === 'asc' 
          ? aAddr.localeCompare(bAddr, 'ru')
          : bAddr.localeCompare(aAddr, 'ru');
      }
      
      if (sortField === 'owner') {
        const aOwner = a.owner?.shortName || a.owner?.fullName || '';
        const bOwner = b.owner?.shortName || b.owner?.fullName || '';
        return sortDirection === 'asc' 
          ? aOwner.localeCompare(bOwner, 'ru')
          : bOwner.localeCompare(aOwner, 'ru');
      }
      
      if (sortField === 'org') {
        const aOrg = a.org?.shortName || a.org?.fullName || '';
        const bOrg = b.org?.shortName || b.org?.fullName || '';
        return sortDirection === 'asc' 
          ? aOrg.localeCompare(bOrg, 'ru')
          : bOrg.localeCompare(aOrg, 'ru');
      }
      
      // Общий случай для прямых полей
      const aField = a[sortField as keyof MonitoringItem];
      const bField = b[sortField as keyof MonitoringItem];
      
      if (typeof aField === 'number' && typeof bField === 'number') {
        return sortDirection === 'asc' ? aField - bField : bField - aField;
      }
      
      const aStr = String(aField || '').toLowerCase();
      const bStr = String(bField || '').toLowerCase();
      
      return sortDirection === 'asc' 
        ? aStr.localeCompare(bStr, 'ru')
        : bStr.localeCompare(aStr, 'ru');
    });
  };

  const handleSort = (field: string) => {
    if (isResizing) return;
    
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const loadMonitoringData = async (page = 1) => {
    setState(prev => ({ ...prev, loading: true, error: null, success: '' }));
    
    setActiveFilters({
      owner: '',
      operator: '',
      hydraulicTests: ''
    });
    
    if (apiRetryCount >= MAX_API_RETRY_ATTEMPTS && !apiSuccessful) {
      setState(prev => ({ 
        ...prev, 
        error: `Не удалось загрузить данные после ${MAX_API_RETRY_ATTEMPTS} попыток. Пожалуйста, попробуйте позже.`,
        loading: false,
        success: ''
      }));
      return;
    }
    
    try {
      const response = await getMonitoringData(page);
      setApiSuccessful(true);
      
      extractFilterOptions(response.data);
      
      setState(prev => ({ 
        ...prev, 
        items: response.data, 
        currentPage: response.current_page,
        totalPages: response.last_page,
        totalItems: response.total,
        loading: false,
        error: null,
        success: 'success'
      }));
    } catch (error) {
      const errorMsg = String(error);
      
      if (errorMsg.includes('авторизац') || errorMsg.includes('Unauthorized') || errorMsg.includes('Unauthenticated')) {
        setAuthError(true);
        setState(prev => ({ 
          ...prev, 
          error: 'Ошибка авторизации. Пожалуйста, обновите страницу или войдите в систему заново.', 
          loading: false,
          success: ''
        }));
      } else {
        setApiRetryCount(prev => prev + 1);
        
        setState(prev => ({ 
          ...prev, 
          error: `Ошибка при получении данных. Попытка ${apiRetryCount + 1}/${MAX_API_RETRY_ATTEMPTS}`, 
          loading: false,
          success: ''
        }));
      }
    }
  };

  const handleReauth = async () => {
    try {
      setAuthError(false);
      setState(prev => ({ ...prev, loading: true, error: null, success: '' }));
      localStorage.removeItem('auth_token');
      await initializeApi();
      setApiRetryCount(0);
      setApiSuccessful(false);
      await loadMonitoringData();
    } catch (error) {
      setAuthError(true);
      setState(prev => ({ 
        ...prev, 
        error: 'Не удалось авторизоваться. Пожалуйста, обновите страницу или обратитесь к администратору.', 
        loading: false,
        success: ''
      }));
    }
  };

  const handleRefreshData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null, success: '' }));
      setApiRetryCount(0);
      setApiSuccessful(false);
      
      setActiveFilters({
        owner: '',
        operator: '',
        hydraulicTests: ''
      });
      
      await loadMonitoringData();
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: 'Ошибка при обновлении данных. Пожалуйста, попробуйте позже.', 
        loading: false,
        success: ''
      }));
    }
  };

  const extractFilterOptions = (items: MonitoringItem[]) => {
    const owners = new Set<string>();
    const operators = new Set<string>();
    
    items.forEach(item => {
      const ownerName = item.owner?.shortName || item.owner?.fullName;
      const orgName = item.org?.shortName || item.org?.fullName;
      
      if (ownerName) owners.add(ownerName);
      if (orgName) operators.add(orgName);
    });
    
    setFilterOptions(prev => ({
      ...prev,
      owners: Array.from(owners).sort(),
      operators: Array.from(operators).sort()
    }));
  };
  
  const applyFilters = () => {
    if (!state.items.length) return;
    
    let filteredItems = [...state.items];
    
    if (activeFilters.owner) {
      filteredItems = filteredItems.filter(item => 
        (item.owner?.shortName === activeFilters.owner) || 
        (item.owner?.fullName === activeFilters.owner)
      );
    }
    
    if (activeFilters.operator) {
      filteredItems = filteredItems.filter(item => 
        (item.org?.shortName === activeFilters.operator) || 
        (item.org?.fullName === activeFilters.operator)
      );
    }
    
    if (activeFilters.hydraulicTests) {
      filteredItems = filteredItems.filter(item => 
        item.parameters.hydraulic_tests === activeFilters.hydraulicTests
      );
    }
    
    return filteredItems;
  };
  
  const handleFilterChange = (filterType: 'owner' | 'operator' | 'hydraulicTests', value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };
  
  const resetFilters = () => {
    setActiveFilters({
      owner: '',
      operator: '',
      hydraulicTests: ''
    });
  };

  const handleSearch = () => {
    if (!searchInput.trim()) {
      return loadMonitoringData();
    }

    const searchLower = searchInput.toLowerCase();
    
    const filteredItems = state.items.filter(item => {
      // Поиск по имени теплоисточника
      if (item.name?.toLowerCase().includes(searchLower)) return true;
      
      // Поиск по адресу
      const address = formatAddress(item.address)?.toLowerCase();
      if (address?.includes(searchLower)) return true;
      
      // Поиск по собственнику
      const owner = item.owner?.shortName?.toLowerCase() || item.owner?.fullName?.toLowerCase();
      if (owner?.includes(searchLower)) return true;
      
      // Поиск по оператору
      const operator = item.org?.shortName?.toLowerCase() || item.org?.fullName?.toLowerCase();
      if (operator?.includes(searchLower)) return true;
      
      return false;
    });
    
    setState(prev => ({ 
      ...prev, 
      loading: false,
      success: 'success',
      searchQuery: searchInput,
      items: filteredItems
    }));
  };

  const handleViewDetails = (item: MonitoringItem) => {
    setCurrentItem(item);
    setShowDetailsModal(true);
  };

  const handlePageChange = (page: number) => {
    loadMonitoringData(page);
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null, success: '' }));
        await initializeApi();
        const response = await getMonitoringData();
        
        extractFilterOptions(response.data);
        
        setState(prev => ({ 
          ...prev, 
          items: response.data, 
          currentPage: response.current_page,
          totalPages: response.last_page,
          totalItems: response.total,
          loading: false,
          error: null,
          success: 'success'
        }));
      } catch (error) {
        const errorMsg = String(error);
        
        if (errorMsg.includes('авторизац') || errorMsg.includes('Unauthorized') || errorMsg.includes('Unauthenticated')) {
          setAuthError(true);
          setState(prev => ({ 
            ...prev, 
            error: 'Ошибка авторизации. Пожалуйста, обновите страницу или войдите в систему заново.', 
            loading: false,
            success: ''
          }));
        } else {
          setApiRetryCount(prev => prev + 1);
          
          setState(prev => ({ 
            ...prev, 
            error: `Проблема с получением данных. Попытка ${apiRetryCount + 1}/${MAX_API_RETRY_ATTEMPTS}`, 
            loading: false,
            success: ''
          }));
        }
      }
    };
    
    initialize();
  }, []);

  useEffect(() => {
    return () => {
      document.body.style.cursor = '';
      document.body.classList.remove('resizing');
    };
  }, []);

  const renderPagination = () => {
    if (state.totalPages <= 1) return null;

    const items = [];
    for (let i = 1; i <= state.totalPages; i++) {
      items.push(
        <Pagination.Item 
          key={i} 
          active={i === state.currentPage}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Pagination.Item>
      );
    }

    return (
      <Pagination className="mt-3 justify-content-center">
        <Pagination.First onClick={() => handlePageChange(1)} disabled={state.currentPage === 1} />
        <Pagination.Prev onClick={() => handlePageChange(state.currentPage - 1)} disabled={state.currentPage === 1} />
        {items}
        <Pagination.Next onClick={() => handlePageChange(state.currentPage + 1)} disabled={state.currentPage === state.totalPages} />
        <Pagination.Last onClick={() => handlePageChange(state.totalPages)} disabled={state.currentPage === state.totalPages} />
      </Pagination>
    );
  };

  const getStatusColor = (status: string) => {
    if (status === 'Проведены') return 'success';
    return 'danger';
  };

  const getParameterAlert = (value: string, type: 'temperature' | 'pressure') => {
    if (!value) return 'secondary';
    
    // Извлекаем только числовое значение из строки (например, "128 °C" -> 128)
    const numMatch = value.match(/[\d.]+/);
    const numValue = numMatch ? parseFloat(numMatch[0]) : 0;
    
    if (type === 'temperature') {
      if (numValue > 120) return 'danger';
      if (numValue > 100) return 'warning';
      return 'success';
    } else if (type === 'pressure') {
      if (numValue > 15) return 'danger';
      if (numValue > 10) return 'warning';
      return 'success';
    }
    
    return 'success';
  };

  const formatAddress = (address: any) => {
    if (!address) return '-';
    
    let formattedAddress = '';
    
    if (address.street?.city?.name) {
      formattedAddress += `г. ${address.street.city.name}, `;
    }
    
    if (address.street?.name) {
      formattedAddress += `${address.street.name}, `;
    }
    
    formattedAddress += `д. ${address.house_number}`;
    
    if (address.building) {
      formattedAddress += `, корп. ${address.building}`;
    }
    
    return formattedAddress;
  };

  const getData = () => {
    const filteredData = activeFilters.owner || activeFilters.operator || activeFilters.hydraulicTests
      ? applyFilters() || []
      : state.items;
    
    return sortData(filteredData);
  };

  const renderSortIcon = (field: string) => {
    if (field !== sortField) {
      return <i className="ti ti-sort ms-1"></i>;
    }
    
    return sortDirection === 'asc' 
      ? <i className="ti ti-sort-ascending ms-1"></i> 
      : <i className="ti ti-sort-descending ms-1"></i>;
  };

  const renderTableHeaders = () => {
    return columns
      .filter(column => column.visible)
      .map((column, index, filteredColumns) => {
        const isLast = index === filteredColumns.length - 1;
        const style = {
          width: `${column.width}px`,
          minWidth: `${column.width}px`,
          position: 'relative' as 'relative'
        };
        
        return (
          <th 
            key={column.id}
            className="sort-header"
            onClick={() => !isResizing && handleSort(column.id)}
            style={style}
          >
            <div className="th-content">
              {column.title}
              {renderSortIcon(column.id)}
            </div>
            
            {!isLast && (
              <div 
                className="resize-handle"
                onMouseDown={(e) => handleResizeStart(e, column.id)}
              />
            )}
          </th>
        );
      });
  };

  const renderCellContent = (item: MonitoringItem, column: TableColumn) => {
    switch (column.id) {
      case 'temperature':
        return (
          <OverlayTrigger
            placement="top"
            overlay={
              <Tooltip id={`temp-tooltip-${item.id}`}>
                Текущая температура теплоносителя
              </Tooltip>
            }
          >
            <Badge 
              bg={getParameterAlert(item.parameters?.current_temperature || '0', 'temperature')}
              className="px-2 py-1"
            >
              {item.parameters?.current_temperature || '-'}
            </Badge>
          </OverlayTrigger>
        );
      
      case 'pressure':
        return (
          <OverlayTrigger
            placement="top"
            overlay={
              <Tooltip id={`press-tooltip-${item.id}`}>
                Текущее давление в системе
              </Tooltip>
            }
          >
            <Badge 
              bg={getParameterAlert(item.parameters?.current_pressure || '0', 'pressure')}
              className="px-2 py-1"
            >
              {item.parameters?.current_pressure || '-'}
            </Badge>
          </OverlayTrigger>
        );
      
      case 'hydraulic_tests':
        return (
          <Badge 
            bg={getStatusColor(item.parameters?.hydraulic_tests || 'Не проведены')}
            className="px-2 py-1"
          >
            {item.parameters?.hydraulic_tests || 'Не проведены'}
          </Badge>
        );
      
      case 'address_full':
        return formatAddress(item.address);
      
      case 'owner':
        return item.owner?.shortName || item.owner?.fullName || '-';
      
      case 'org':
        return item.org?.shortName || item.org?.fullName || '-';
      
      default:
        const value = item[column.field as keyof MonitoringItem];
        return value !== undefined && value !== null ? String(value) : '-';
    }
  };

  const renderTableRow = (item: MonitoringItem) => {
    return columns
      .filter(column => column.visible)
      .map(column => {
        const style = {
          width: `${column.width}px`,
          minWidth: `${column.width}px`
        };
        
        return (
          <td 
            key={`${item.id}-${column.id}`}
            style={style}
          >
            {renderCellContent(item, column)}
          </td>
        );
      });
  };

  return (
    <React.Fragment>
      <div className="page-header">
        <div className="page-block">
          <div className="row align-items-center">
            <div className="col-md-6">
              <div className="page-header-title">
                <h5 className="m-b-10">Мониторинг теплоисточников</h5>
              </div>
              <ul className="breadcrumb">
                <li className="breadcrumb-item">
                  <Link to="/dashboard">Главная</Link>
                </li>
                <li className="breadcrumb-item">Процессы/Эксплуатация</li>
                <li className="breadcrumb-item">Мониторинг</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <Row>
        <Col sm={12}>
          <Card>
            <Card.Body>
              {authError && (
                <Alert variant="danger">
                  <Alert.Heading>Ошибка авторизации</Alert.Heading>
                  <p>Не удалось подключиться к серверу или произошла ошибка авторизации.</p>
                  <Button variant="danger" onClick={handleReauth}>
                    Попробовать снова
                  </Button>
                </Alert>
              )}
              
              {state.error && !authError && (
                <Alert variant="danger" onClose={() => setState(prev => ({ ...prev, error: null }))} dismissible>
                  {state.error}
                  <div className="mt-2">
                    <Button variant="outline-danger" size="sm" onClick={handleRefreshData}>
                      Попробовать еще раз
                    </Button>
                  </div>
                </Alert>
              )}
              
              {state.success && state.success !== 'success' && (
                <Alert variant="success" onClose={() => setState(prev => ({ ...prev, success: 'success' }))} dismissible>
                  {state.success}
                </Alert>
              )}
              
              <Row className="justify-content-between mb-3 g-3">
                <Col sm="auto">
                  <div className="form-search">
                    <i className="ph-duotone ph-magnifying-glass icon-search"></i>
                    <InputGroup>
                      <Form.Control
                        type="search"
                        placeholder="Поиск..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      />
                      <Button 
                        variant="light-secondary"
                        onClick={handleSearch}
                        disabled={state.loading || authError}
                      >
                        Найти
                      </Button>
                    </InputGroup>
                  </div>
                </Col>
                <Col sm="auto">
                  <div className="d-flex gap-2 align-items-center">
                    <Dropdown className="mini-filter">
                      <Dropdown.Toggle variant="light" size="sm" className="mini-filter-button">
                        <i className="ti ti-filter me-1"></i>
                        Фильтр {(activeFilters.owner || activeFilters.operator || activeFilters.hydraulicTests) && <span className="filter-indicator"></span>}
                      </Dropdown.Toggle>
                      <Dropdown.Menu className="mini-filter-menu">
                        <div className="filter-content p-2">
                          <Form.Group className="mb-3">
                            <Form.Label className="mini-filter-label">Гидравлические испытания</Form.Label>
                            <Form.Select 
                              size="sm"
                              value={activeFilters.hydraulicTests}
                              onChange={(e) => handleFilterChange('hydraulicTests', e.target.value)}
                              disabled={state.loading || authError}
                            >
                              <option value="">Все</option>
                              {filterOptions.hydraulicTests.map(status => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                          
                          <Form.Group className="mb-3">
                            <Form.Label className="mini-filter-label">Собственник</Form.Label>
                            <Form.Select 
                              size="sm"
                              value={activeFilters.owner}
                              onChange={(e) => handleFilterChange('owner', e.target.value)}
                              disabled={state.loading || authError}
                            >
                              <option value="">Все собственники</option>
                              {filterOptions.owners.map(owner => (
                                <option key={owner} value={owner}>
                                  {owner}
                                </option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                          
                          <Form.Group className="mb-3">
                            <Form.Label className="mini-filter-label">Оператор</Form.Label>
                            <Form.Select 
                              size="sm"
                              value={activeFilters.operator}
                              onChange={(e) => handleFilterChange('operator', e.target.value)}
                              disabled={state.loading || authError}
                            >
                              <option value="">Все операторы</option>
                              {filterOptions.operators.map(operator => (
                                <option key={operator} value={operator}>
                                  {operator}
                                </option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                          
                          <div className="d-flex justify-content-between">
                            <Button 
                              variant="outline-secondary" 
                              size="sm"
                              onClick={resetFilters}
                              disabled={state.loading || authError || (!activeFilters.owner && !activeFilters.operator && !activeFilters.hydraulicTests)}
                            >
                              Сбросить
                            </Button>
                            
                            <Button 
                              variant="primary" 
                              size="sm"
                              onClick={() => {
                                document.body.click();
                              }}
                              disabled={state.loading || authError}
                            >
                              Применить
                            </Button>
                          </div>
                        </div>
                      </Dropdown.Menu>
                    </Dropdown>
                    
                    <Button 
                      variant="light-secondary" 
                      onClick={() => setShowColumnsSettings(true)}
                      title="Настройки таблицы"
                    >
                      <i className="ti ti-table-options me-1"></i>
                      Настройки
                    </Button>
                    <Button 
                      variant="primary" 
                      onClick={handleRefreshData}
                      disabled={state.loading || authError}
                      title="Обновить данные"
                    >
                      <i className="ti ti-refresh me-1"></i>
                      Обновить
                    </Button>
                  </div>
                </Col>
              </Row>
              
              <div className="table-responsive">
                {state.loading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" role="status">
                      <span className="visually-hidden">Загрузка...</span>
                    </Spinner>
                    <p className="mt-2">Загрузка данных...</p>
                  </div>
                ) : (
                  <>
                    {state.items.length === 0 ? (
                      <div className="text-center py-5">
                        <p className="mb-0">Нет данных для отображения</p>
                      </div>
                    ) : (
                      <>
                        <table className="table table-hover resizable-table" ref={tableRef}>
                          <thead>
                            <tr>
                              {renderTableHeaders()}
                            </tr>
                          </thead>
                          <tbody>
                            {getData().map((item: MonitoringItem) => (
                              <tr key={item.id} onClick={() => handleViewDetails(item)} style={{ cursor: 'pointer' }}>
                                {renderTableRow(item)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {renderPagination()}
                      </>
                    )}
                  </>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Offcanvas 
        show={showColumnsSettings} 
        onHide={() => setShowColumnsSettings(false)} 
        placement="end"
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title className="f-w-600">Настройки таблицы</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <p>Выберите столбцы для отображения:</p>
          <Form>
            {columns.map(column => (
              <Form.Group key={column.id} className="mb-3">
                <Form.Check 
                  type="checkbox"
                  id={`column-${column.id}`}
                  label={column.title}
                  checked={column.visible}
                  onChange={(e) => handleColumnVisibilityChange(column.id, e.target.checked)}
                />
              </Form.Group>
            ))}
          </Form>
          <div className="mt-4">
            <p className="text-muted mb-2">
              Для изменения ширины столбцов перетащите правую границу заголовка таблицы.
            </p>
            <Button 
              variant="outline-secondary" 
              onClick={resetTableSettings}
              className="w-100"
            >
              Сбросить настройки таблицы
            </Button>
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      <Modal 
        show={showDetailsModal} 
        onHide={() => setShowDetailsModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Детали теплоисточника</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!currentItem ? (
            <div className="text-center py-3">
              <p>Нет данных для отображения</p>
            </div>
          ) : (
            <Row>
              <Col md={6}>
                <div className="d-flex">
                  <div className="flex-shrink-0">
                    <div className="avtar avtar-xs bg-light-secondary">
                      <i className="ti ti-building f-20"></i>
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h5 className="mb-1"><b>Наименование</b></h5>
                    <p className="text-muted">{currentItem.name}</p>
                  </div>
                </div>
                
                <div className="d-flex">
                  <div className="flex-shrink-0">
                    <div className="avtar avtar-xs bg-light-warning">
                      <i className="ti ti-map-pin f-20"></i>
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h5 className="mb-1"><b>Адрес</b></h5>
                    <p className="text-muted">{formatAddress(currentItem.address)}</p>
                  </div>
                </div>
                
                <div className="d-flex">
                  <div className="flex-shrink-0">
                    <div className="avtar avtar-xs bg-light-danger">
                      <i className="ti ti-building-factory f-20"></i>
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h5 className="mb-1"><b>Тип</b></h5>
                    <p className="text-muted">{currentItem.type?.name || '-'}</p>
                  </div>
                </div>
                
                <div className="d-flex">
                  <div className="flex-shrink-0">
                    <div className="avtar avtar-xs bg-light-primary">
                      <i className="ti ti-building-community f-20"></i>
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h5 className="mb-1"><b>Собственник</b></h5>
                    <p className="text-muted">{currentItem.owner?.shortName || currentItem.owner?.fullName || '-'}</p>
                  </div>
                </div>
                
                <div className="d-flex">
                  <div className="flex-shrink-0">
                    <div className="avtar avtar-xs bg-light-success">
                      <i className="ti ti-building-bridge f-20"></i>
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h5 className="mb-1"><b>Эксплуатирующая организация</b></h5>
                    <p className="text-muted">{currentItem.org?.shortName || currentItem.org?.fullName || '-'}</p>
                  </div>
                </div>
              </Col>
              
              <Col md={6}>
                <div className="d-flex">
                  <div className="flex-shrink-0">
                    <div className="avtar avtar-xs bg-light-danger">
                      <i className="ti ti-temperature f-20"></i>
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h5 className="mb-1"><b>Температура</b></h5>
                    <p className="text-muted">
                      <Badge 
                        bg={getParameterAlert(currentItem.parameters?.current_temperature || '0', 'temperature')}
                        className="px-2 py-1"
                      >
                        {currentItem.parameters?.current_temperature || '-'}
                      </Badge>
                    </p>
                  </div>
                </div>
                
                <div className="d-flex">
                  <div className="flex-shrink-0">
                    <div className="avtar avtar-xs bg-light-warning">
                      <i className="ti ti-gauge f-20"></i>
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h5 className="mb-1"><b>Давление</b></h5>
                    <p className="text-muted">
                      <Badge 
                        bg={getParameterAlert(currentItem.parameters?.current_pressure || '0', 'pressure')}
                        className="px-2 py-1"
                      >
                        {currentItem.parameters?.current_pressure || '-'}
                      </Badge>
                    </p>
                  </div>
                </div>
                
                <div className="d-flex">
                  <div className="flex-shrink-0">
                    <div className="avtar avtar-xs bg-light-primary">
                      <i className="ti ti-tool f-20"></i>
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h5 className="mb-1"><b>Гидравлические испытания</b></h5>
                    <p className="text-muted">
                      <Badge 
                        bg={getStatusColor(currentItem.parameters?.hydraulic_tests || 'Не проведены')}
                        className="px-2 py-1"
                      >
                        {currentItem.parameters?.hydraulic_tests || 'Не проведены'}
                      </Badge>
                    </p>
                  </div>
                </div>
                
                <div className="d-flex">
                  <div className="flex-shrink-0">
                    <div className="avtar avtar-xs bg-light-info">
                      <i className="ti ti-thermometer f-20"></i>
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h5 className="mb-1"><b>Температурный график</b></h5>
                    <p className="text-muted">{currentItem.temperature_schedule || '-'}</p>
                  </div>
                </div>
                
                <div className="d-flex">
                  <div className="flex-shrink-0">
                    <div className="avtar avtar-xs bg-light-secondary">
                      <i className="ti ti-flame f-20"></i>
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h5 className="mb-1"><b>Установленная мощность, Гкал/час</b></h5>
                    <p className="text-muted">{currentItem.installed_capacity_gcal_hour || '-'}</p>
                  </div>
                </div>
                
                <div className="d-flex">
                  <div className="flex-shrink-0">
                    <div className="avtar avtar-xs bg-light-primary">
                      <i className="ti ti-bolt f-20"></i>
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h5 className="mb-1"><b>Доступная мощность, Гкал/час</b></h5>
                    <p className="text-muted">{currentItem.available_capacity_gcal_hour || '-'}</p>
                  </div>
                </div>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Закрыть
          </Button>
        </Modal.Footer>
      </Modal>

      <style>
        {`
        .badge {
          font-size: 0.9rem;
          font-weight: 500;
        }
        
        .cursor-pointer {
          cursor: pointer;
        }
        
        .form-search {
          position: relative;
          display: flex;
        }
        
        .form-search .icon-search {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: #6c757d;
          z-index: 10;
        }
        
        .form-search .form-control {
          padding-left: 35px;
          border-top-right-radius: 0;
          border-bottom-right-radius: 0;
        }
        
        .form-search .btn-search {
          border-top-left-radius: 0;
          border-bottom-left-radius: 0;
        }
        
        .avtar {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          width: 32px;
          height: 32px;
        }
        
        .avtar-xs {
          width: 24px;
          height: 24px;
          font-size: 0.75rem;
        }
        
        .f-20 {
          font-size: 20px;
        }
        
        .f-w-600 {
          font-weight: 600;
        }
        
        .sort-header {
          cursor: pointer;
          user-select: none;
        }
        
        .sort-header:hover {
          background-color: rgba(0, 0, 0, 0.03);
        }
        
        .sort-header i {
          font-size: 16px;
          vertical-align: middle;
        }
        
        .mini-filter-button {
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          position: relative;
          border-color: #dee2e6;
        }
        
        .mini-filter-menu {
          min-width: 250px;
          padding: 0;
        }
        
        .filter-content {
          padding: 10px;
        }
        
        .mini-filter-label {
          font-size: 0.85rem;
          font-weight: 500;
          color: #495057;
          margin-bottom: 3px;
        }
        
        .filter-indicator {
          position: absolute;
          top: 2px;
          right: 2px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #0d6efd;
        }
        
        .resizable-table {
          table-layout: fixed;
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        
        .resizable-table th, 
        .resizable-table td {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          position: relative;
          padding-top: 0.3rem;
          padding-bottom: 0.3rem;
          font-size: 0.9rem;
          line-height: 1.2;
        }
        
        .resize-handle {
          position: absolute;
          top: 0;
          right: 0;
          width: 8px;
          height: 100%;
          cursor: col-resize;
          background-color: transparent;
          z-index: 10;
        }
        
        .resize-handle:hover,
        .resize-handle:active {
          background-color: #0d6efd;
          opacity: 0.4;
        }
        
        body.resizing {
          user-select: none !important;
        }
        
        body.resizing * {
          cursor: col-resize !important;
        }
        
        .th-content {
          padding: 0.4rem 0.5rem;
          display: flex;
          align-items: center;
          font-size: 0.9rem;
        }
        `}
      </style>
    </React.Fragment>
  );
};

export default MonitoringPage;