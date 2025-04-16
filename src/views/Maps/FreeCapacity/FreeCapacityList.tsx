import React, { useState, useEffect, useRef } from 'react'
import { Card, Row, Col, Button, Dropdown, Form, InputGroup, Spinner, Alert, Pagination, Offcanvas, OverlayTrigger, Tooltip } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import {
  getFreeCapacityList,
  getFreeCapacityById,
  createFreeCapacity,
  updateFreeCapacity,
  deleteFreeCapacity,
  getResourceTypes,
  getEquipmentTypes,
  getOrganizations,
  FreeCapacityItem,
  FreeCapacityParams,
  FreeCapacityCreateData,
  initializeApi,
  TOKEN_KEY
} from '../../../services/api'
import DeleteModal from "../../../Common/DeleteModal"

const MAX_API_RETRY_ATTEMPTS = 3;

interface TableColumn {
  id: string;
  title: string;
  width: number;
  visible: boolean;
  field: keyof FreeCapacityItem | 'actions';
}

interface FreeCapacityState {
  items: FreeCapacityItem[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  success: string;
}

const FreeCapacityList: React.FC = () => {
  const [state, setState] = useState<FreeCapacityState>({
    items: [],
    loading: true,
    error: null,
    searchQuery: '',
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    success: ''
  });
  const [activeFilters, setActiveFilters] = useState<FreeCapacityParams>({
    resource_type_id: undefined,
    equipment_type_id: undefined,
    org_id: undefined
  });
  const [filterOptions, setFilterOptions] = useState({
    resourceTypes: [] as any[],
    equipmentTypes: [] as any[],
    organizations: [] as any[]
  });
  const [columns, setColumns] = useState<TableColumn[]>([
    { id: 'id', title: '№', width: 70, visible: true, field: 'id' },
    { id: 'resource', title: 'ТИП РЕСУРСА', width: 150, visible: true, field: 'resource' },
    { id: 'equipment', title: 'ТИП ОБОРУДОВАНИЯ', width: 180, visible: true, field: 'equipment' },
    { id: 'org', title: 'ОРГАНИЗАЦИЯ', width: 200, visible: true, field: 'org' },
    { id: 'coordinates', title: 'КОЛИЧЕСТВО ТОЧЕК', width: 150, visible: true, field: 'coordinates' },
    { id: 'created_at', title: 'ДАТА СОЗДАНИЯ', width: 150, visible: true, field: 'created_at' },
    { id: 'actions', title: 'ДЕЙСТВИЯ', width: 130, visible: true, field: 'actions' }
  ]);
  const [isTableCustomized, setIsTableCustomized] = useState<boolean>(false);
  const [sortField, setSortField] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchInput, setSearchInput] = useState('');
  const [authError, setAuthError] = useState<boolean>(false);
  const [apiRetryCount, setApiRetryCount] = useState<number>(0);
  const [_apiSuccessful, setApiSuccessful] = useState<boolean>(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditOffcanvas, setShowEditOffcanvas] = useState(false);
  const [showColumnsSettings, setShowColumnsSettings] = useState(false);
  const [currentItem, setCurrentItem] = useState<FreeCapacityItem | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FreeCapacityCreateData>({
    resource_type_id: 1,
    equipment_type_id: 1,
    org_id: 1,
    coordinates: []
  });
  const [resourceTypes, setResourceTypes] = useState<any[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [isResizing, setIsResizing] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);
  const [coordinatesInput, setCoordinatesInput] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const savedColumns = localStorage.getItem('freeCapacityColumns');
    if (savedColumns) {
      try {
        const parsedColumns = JSON.parse(savedColumns);
        setColumns(parsedColumns);
        setIsTableCustomized(true);
      } catch (e) {
        console.error('Ошибка при загрузке настроек таблицы:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (isTableCustomized) {
      localStorage.setItem('freeCapacityColumns', JSON.stringify(columns));
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
      { id: 'resource', title: 'ТИП РЕСУРСА', width: 150, visible: true, field: 'resource' },
      { id: 'equipment', title: 'ТИП ОБОРУДОВАНИЯ', width: 180, visible: true, field: 'equipment' },
      { id: 'org', title: 'ОРГАНИЗАЦИЯ', width: 200, visible: true, field: 'org' },
      { id: 'coordinates', title: 'КОЛИЧЕСТВО ТОЧЕК', width: 150, visible: true, field: 'coordinates' },
      { id: 'created_at', title: 'ДАТА СОЗДАНИЯ', width: 150, visible: true, field: 'created_at' },
      { id: 'actions', title: 'ДЕЙСТВИЯ', width: 130, visible: true, field: 'actions' }
    ];
    setColumns(defaultColumns);
    localStorage.removeItem('freeCapacityColumns');
    setIsTableCustomized(false);
    setShowColumnsSettings(false);
  };

  const handleReturnToDashboard = () => {
    navigate('/dashboard');
  };

  const handleRelogin = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const loadReferences = async () => {
    try {
      setFormLoading(true);
      console.log("Начало загрузки справочников");
      const resourceTypesPromise = getResourceTypes().catch(error => {
        console.error("Ошибка загрузки типов ресурсов:", error);
        return [];
      });
      const equipmentTypesPromise = getEquipmentTypes().catch(error => {
        console.error("Ошибка загрузки типов оборудования:", error);
        return [];
      });
      const orgsPromise = getOrganizations().catch(error => {
        console.error("Ошибка загрузки организаций:", error);
        return [];
      });
      const [resourceTypesData, equipmentTypesData, orgsData] = await Promise.all([
        resourceTypesPromise,
        equipmentTypesPromise,
        orgsPromise
      ]);
      setResourceTypes(resourceTypesData);
      setEquipmentTypes(equipmentTypesData);
      setOrganizations(orgsData);
      setFilterOptions({
        resourceTypes: resourceTypesData,
        equipmentTypes: equipmentTypesData,
        organizations: orgsData
      });
      setFormLoading(false);
      return {
        success: resourceTypesData.length > 0 && equipmentTypesData.length > 0 && orgsData.length > 0,
        resourceTypesData,
        equipmentTypesData,
        orgsData
      };
    } catch (error) {
      console.error("Общая ошибка загрузки справочников:", error);
      setFormLoading(false);
      return {
        success: false,
        error: error,
        resourceTypesData: [],
        equipmentTypesData: [],
        orgsData: []
      };
    }
  };

  const sortData = (data: FreeCapacityItem[]): FreeCapacityItem[] => {
    return [...data].sort((a, b) => {
      if (sortField === 'resource') {
        const aValue = a.resource?.name || '';
        const bValue = b.resource?.name || '';
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue, 'ru')
          : bValue.localeCompare(aValue, 'ru');
      }
      if (sortField === 'equipment') {
        const aValue = a.equipment?.name || '';
        const bValue = b.equipment?.name || '';
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue, 'ru')
          : bValue.localeCompare(aValue, 'ru');
      }
      if (sortField === 'org') {
        const aValue = a.org?.shortName || '';
        const bValue = b.org?.shortName || '';
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue, 'ru')
          : bValue.localeCompare(aValue, 'ru');
      }
      if (sortField === 'coordinates') {
        const aValue = a.coordinates ? a.coordinates.length : 0;
        const bValue = b.coordinates ? b.coordinates.length : 0;
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      const aField = a[sortField as keyof FreeCapacityItem];
      const bField = b[sortField as keyof FreeCapacityItem];
      
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

  const loadData = async (page = 1) => {
    setState(prev => ({ ...prev, loading: true, error: null, success: '' }));
    
    try {
      // Проверяем авторизацию
      await initializeApi();
      
      // Загружаем данные
      const filters: FreeCapacityParams = { ...activeFilters };
      const data = await getFreeCapacityList(page, filters);
      
      setApiSuccessful(true);
      setState(prev => ({
        ...prev,
        items: data.items,
        currentPage: data.currentPage,
        totalPages: data.totalPages,
        totalItems: data.totalItems,
        loading: false,
        error: null,
        success: 'success'
      }));
    } catch (error) {
      console.error('Ошибка загрузки свободных мощностей:', error);
      const errorMsg = String(error);
      
      if (errorMsg.includes('авторизац') || 
          errorMsg.includes('Unauthorized') || 
          errorMsg.includes('Unauthenticated') || 
          errorMsg.includes('токен')) {
        setAuthError(true);
        setState(prev => ({
          ...prev,
          error: 'У вас нет прав доступа к странице свободных мощностей. Обратитесь к администратору системы.',
          loading: false,
          success: ''
        }));
      } else {
        setApiRetryCount(prev => prev + 1);
        setState(prev => ({
          ...prev,
          error: `Ошибка при получении данных: ${errorMsg}`,
          loading: false,
          success: ''
        }));
      }
    }
  };

  const handleRefreshData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null, success: '' }));
      setApiRetryCount(0);
      setApiSuccessful(false);
      setActiveFilters({
        resource_type_id: undefined,
        equipment_type_id: undefined,
        org_id: undefined
      });
      await loadData();
    } catch (error) {
      console.error('Ошибка обновления данных:', error);
      setState(prev => ({
        ...prev,
        error: 'Ошибка при обновлении данных. Пожалуйста, попробуйте позже.',
        loading: false,
        success: ''
      }));
    }
  };

  const applyFilters = async () => {
    setState(prev => ({ ...prev, loading: true, error: null, success: '' }));
    try {
      await loadData(1);
    } catch (error) {
      console.error('Ошибка фильтрации:', error);
      setApiRetryCount(prev => prev + 1);
      setState(prev => ({
        ...prev,
        error: `Ошибка при фильтрации данных. Попытка ${apiRetryCount + 1}/${MAX_API_RETRY_ATTEMPTS}`,
        loading: false,
        success: ''
      }));
    }
  };

  const handleFilterChange = (filterType: keyof FreeCapacityParams, value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: value ? parseInt(value, 10) : undefined
    }));
  };

  const resetFilters = () => {
    setActiveFilters({
      resource_type_id: undefined,
      equipment_type_id: undefined,
      org_id: undefined
    });
    loadData();
  };

  const handleSearch = async () => {
    if (!searchInput.trim()) {
      return loadData();
    }
    setState(prev => ({ ...prev, loading: true, error: null, searchQuery: searchInput, success: '' }));
    try {
      const filters: FreeCapacityParams = {
        ...activeFilters,
        name: searchInput
      };
      const data = await getFreeCapacityList(1, filters);
      setApiSuccessful(true);
      setState(prev => ({
        ...prev,
        items: data.items,
        currentPage: data.currentPage,
        totalPages: data.totalPages,
        totalItems: data.totalItems,
        loading: false,
        error: null,
        success: 'success'
      }));
    } catch (error) {
      console.error('Ошибка поиска:', error);
      setApiRetryCount(prev => prev + 1);
      setState(prev => ({
        ...prev,
        error: `Ошибка при поиске данных. Попытка ${apiRetryCount + 1}/${MAX_API_RETRY_ATTEMPTS}`,
        loading: false,
        success: ''
      }));
    }
  };

  const handleViewDetails = async (id: number) => {
    try {
      setFormLoading(true);
      const details = await getFreeCapacityById(id);
      setCurrentItem(details);
      setFormLoading(false);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Ошибка получения деталей:', error);
      setFormLoading(false);
    }
  };

  const handleEditRecord = async (id: number) => {
    try {
      setFormError(null);
      setFormLoading(true);
      if (resourceTypes.length === 0) {
        await loadReferences();
      }
      const details = await getFreeCapacityById(id);
      setCurrentItem(details);
      setFormData({
        resource_type_id: details.resource_type_id || details.resource?.id || 1,
        equipment_type_id: details.equipment_type_id || details.equipment?.id || 1,
        org_id: details.org_id || details.org?.id || 1,
        coordinates: details.coordinates || []
      });
      setCoordinatesInput(
        details.coordinates
          .map(coord => `[${coord[0]}, ${coord[1]}]`)
          .join(',\n')
      );
      setFormLoading(false);
      setShowEditOffcanvas(true);
    } catch (error) {
      console.error('Ошибка получения данных для редактирования:', error);
      setFormLoading(false);
      setFormError('Не удалось загрузить данные для редактирования');
    }
  };

  const handleAddNew = async () => {
    setFormError(null);
    setCurrentItem(null);
    setFormLoading(true);
    let referencesLoaded = true;
    if (resourceTypes.length === 0 || equipmentTypes.length === 0 || organizations.length === 0) {
      const result = await loadReferences();
      referencesLoaded = result.success;
      if (!referencesLoaded) {
        setFormError('Не удалось загрузить необходимые справочники. Попробуйте обновить страницу.');
        setFormLoading(false);
        setShowEditOffcanvas(true);
        return;
      }
    }
    setFormData({
      resource_type_id: resourceTypes.length > 0 ? resourceTypes[0].id : 1,
      equipment_type_id: equipmentTypes.length > 0 ? equipmentTypes[0].id : 1,
      org_id: organizations.length > 0 ? organizations[0].id : 1,
      coordinates: [
        [51.695280, 39.182930],
        [51.695884, 39.196807],
        [51.686900, 39.183902],
        [51.688609, 39.200649]
      ]
    });
    setCoordinatesInput(
      `[51.695280, 39.182930],
[51.695884, 39.196807],
[51.686900, 39.183902],
[51.688609, 39.200649]`
    );
    setFormLoading(false);
    setShowEditOffcanvas(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'coordinates') {
      setCoordinatesInput(value);
      return;
    }
    const numericFields = ['resource_type_id', 'equipment_type_id', 'org_id'];
    setFormData(prev => ({
      ...prev,
      [name]: numericFields.includes(name) ? (parseInt(value, 10) || 0) : value
    }));
  };

  const parseCoordinates = (input: string): [number, number][] => {
    try {
      const cleanedInput = input.replace(/\s/g, '');
      const regex = /\[(\d+\.\d+),(\d+\.\d+)\]/g;
      const matches = cleanedInput.matchAll(regex);
      const coordinates: [number, number][] = [];
      for (const match of matches) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        if (!isNaN(lat) && !isNaN(lng)) {
          coordinates.push([lat, lng]);
        }
      }
      return coordinates;
    } catch (error) {
      console.error('Ошибка парсинга координат:', error);
      return [];
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFormError(null);
      setFormLoading(true);
      const parsedCoordinates = parseCoordinates(coordinatesInput);
      if (parsedCoordinates.length < 4) {
        setFormError('Необходимо указать минимум 4 координаты для формирования области');
        setFormLoading(false);
        return;
      }
      const dataToSend: FreeCapacityCreateData = {
        ...formData,
        coordinates: parsedCoordinates
      };
      console.log('Отправляемые данные:', dataToSend);
      let response;
      if (currentItem) {
        response = await updateFreeCapacity(currentItem.id, dataToSend);
      } else {
        response = await createFreeCapacity(dataToSend);
      }
      console.log('Ответ API:', response);
      setFormLoading(false);
      setShowEditOffcanvas(false);
      await loadData(state.currentPage);
      setState(prev => ({
        ...prev,
        success: currentItem ? 'Запись успешно обновлена' : 'Запись успешно создана'
      }));
    } catch (error) {
      console.error('Ошибка сохранения данных:', error);
      setFormLoading(false);
      let errorMessage = 'Ошибка сохранения данных: ';
      if (error instanceof Error) {
        errorMessage += error.message;
        if ((error as any).response && (error as any).response.data) {
          try {
            const errorData = typeof (error as any).response.data === 'string'
              ? JSON.parse((error as any).response.data)
              : (error as any).response.data;
            if (errorData.errors) {
              const fieldErrors = Object.values(errorData.errors)
                .flat()
                .join(', ');
              errorMessage += `: ${fieldErrors}`;
            } else if (errorData.message) {
              errorMessage += `: ${errorData.message}`;
            }
          } catch (e) {}
        }
      } else {
        errorMessage += String(error);
      }
      setFormError(errorMessage);
    }
  };

  const handleDeletePrompt = (item: FreeCapacityItem) => {
    setCurrentItem(item);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!currentItem) return;
    try {
      setFormLoading(true);
      await deleteFreeCapacity(currentItem.id);
      setFormLoading(false);
      setShowDeleteModal(false);
      await loadData(state.currentPage);
      setState(prev => ({
        ...prev,
        success: 'Запись успешно удалена'
      }));
    } catch (error) {
      console.error('Ошибка удаления:', error);
      setFormLoading(false);
      setFormError('Ошибка удаления записи: ' + String(error));
    }
  };

  const handlePageChange = (page: number) => {
    loadData(page);
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null, success: '' }));
        await initializeApi();
        await loadReferences();
        await loadData();
      } catch (error) {
        console.error('Ошибка инициализации:', error);
        if (String(error).includes('авторизац') || String(error).includes('Unauthorized') || String(error).includes('Unauthenticated')) {
          setAuthError(true);
          setState(prev => ({
            ...prev,
            error: 'У вас нет прав доступа к странице свободных мощностей. Обратитесь к администратору системы.',
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

  const getSortedData = () => {
    return sortData(state.items);
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
            className={column.id !== 'actions' ? 'sort-header' : ''}
            onClick={() => column.id !== 'actions' && !isResizing && handleSort(column.id)}
            style={style}
          >
            <div className="th-content">
              {column.title}
              {column.id !== 'actions' && renderSortIcon(column.id)}
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

  const renderTableRow = (item: FreeCapacityItem) => {
    return columns
      .filter(column => column.visible)
      .map(column => {
        const style = {
          width: `${column.width}px`,
          minWidth: `${column.width}px`
        };
        if (column.id === 'actions') {
          return (
            <td
              key={`${item.id}-${column.id}`}
              className="text-center"
              style={style}
            >
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip id="tooltip-view">Просмотр</Tooltip>}
              >
                <i
                  className="ph-duotone ph-info text-info f-18 cursor-pointer me-2"
                  onClick={() => handleViewDetails(item.id)}
                ></i>
              </OverlayTrigger>
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip id="tooltip-edit">Редактировать</Tooltip>}
              >
                <i
                  className="ph-duotone ph-pencil-simple text-primary f-18 cursor-pointer me-2"
                  onClick={() => handleEditRecord(item.id)}
                ></i>
              </OverlayTrigger>
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip id="tooltip-delete">Удалить</Tooltip>}
              >
                <i
                  className="ph-duotone ph-trash text-danger f-18 cursor-pointer"
                  onClick={() => handleDeletePrompt(item)}
                ></i>
              </OverlayTrigger>
            </td>
          );
        }
        if (column.id === 'resource') {
          return (
            <td
              key={`${item.id}-${column.id}`}
              style={style}
            >
              {item.resource?.name || 'Не указано'}
            </td>
          );
        }
        if (column.id === 'equipment') {
          return (
            <td
              key={`${item.id}-${column.id}`}
              style={style}
            >
              {item.equipment?.name || 'Не указано'}
            </td>
          );
        }
        if (column.id === 'org') {
          return (
            <td
              key={`${item.id}-${column.id}`}
              style={style}
            >
              {item.org?.shortName || item.org?.fullName || 'Не указано'}
            </td>
          );
        }
        if (column.id === 'coordinates') {
          return (
            <td
              key={`${item.id}-${column.id}`}
              style={style}
            >
              {item.coordinates ? item.coordinates.length : 0} точек
            </td>
          );
        }
        if (column.id === 'created_at') {
          return (
            <td
              key={`${item.id}-${column.id}`}
              style={style}
            >
              {new Date(item.created_at).toLocaleDateString()}
            </td>
          );
        }
        const fieldKey = column.field as keyof FreeCapacityItem;
        const value = item[fieldKey];
        return (
          <td
            key={`${item.id}-${column.id}`}
            style={style}
          >
            {typeof value === 'object' ? JSON.stringify(value) : (value || '')}
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
                <h5 className="m-b-10">Свободные мощности</h5>
              </div>
              <ul className="breadcrumb">
                <li className="breadcrumb-item">
                  <Link to="/dashboard">Главная</Link>
                </li>
                <li className="breadcrumb-item">Карты</li>
                <li className="breadcrumb-item">Свободные мощности</li>
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
                  <Alert.Heading>У вас нет прав доступа к странице свободных мощностей</Alert.Heading>
                  <p>Обратитесь к администратору системы для получения необходимых прав.</p>
                  <div className="d-flex gap-2">
                    <Button 
                      variant="outline-primary" 
                      onClick={handleReturnToDashboard}
                    >
                      <i className="ti ti-home me-1"></i> Вернуться на главную
                    </Button>
                    <Button 
                      variant="outline-secondary" 
                      onClick={handleRelogin}
                    >
                      <i className="ti ti-logout me-1"></i> Выйти и войти снова
                    </Button>
                  </div>
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
              
              {!authError && (
                <>
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
                            Фильтр {(activeFilters.resource_type_id || activeFilters.equipment_type_id || activeFilters.org_id) && <span className="filter-indicator"></span>}
                          </Dropdown.Toggle>
                          <Dropdown.Menu className="mini-filter-menu">
                            <div className="filter-content p-2">
                              <Form.Group className="mb-3">
                                <Form.Label className="mini-filter-label">Тип ресурса</Form.Label>
                                <Form.Select
                                  size="sm"
                                  value={activeFilters.resource_type_id || ''}
                                  onChange={(e) => handleFilterChange('resource_type_id', e.target.value)}
                                  disabled={state.loading || authError}
                                >
                                  <option value="">Все типы</option>
                                  {filterOptions.resourceTypes.map(type => (
                                    <option key={type.id} value={type.id}>
                                      {type.name}
                                    </option>
                                  ))}
                                </Form.Select>
                              </Form.Group>
                              <Form.Group className="mb-3">
                                <Form.Label className="mini-filter-label">Тип оборудования</Form.Label>
                                <Form.Select
                                  size="sm"
                                  value={activeFilters.equipment_type_id || ''}
                                  onChange={(e) => handleFilterChange('equipment_type_id', e.target.value)}
                                  disabled={state.loading || authError}
                                >
                                  <option value="">Все типы</option>
                                  {filterOptions.equipmentTypes.map(type => (
                                    <option key={type.id} value={type.id}>
                                      {type.name}
                                    </option>
                                  ))}
                                </Form.Select>
                              </Form.Group>
                              <Form.Group className="mb-3">
                                <Form.Label className="mini-filter-label">Организация</Form.Label>
                                <Form.Select
                                  size="sm"
                                  value={activeFilters.org_id || ''}
                                  onChange={(e) => handleFilterChange('org_id', e.target.value)}
                                  disabled={state.loading || authError}
                                >
                                  <option value="">Все организации</option>
                                  {filterOptions.organizations.map(org => (
                                    <option key={org.id} value={org.id}>
                                      {org.shortName || org.fullName}
                                    </option>
                                  ))}
                                </Form.Select>
                              </Form.Group>
                              <div className="d-flex justify-content-between">
                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                  onClick={resetFilters}
                                  disabled={state.loading || authError || (!activeFilters.resource_type_id && !activeFilters.equipment_type_id && !activeFilters.org_id)}
                                >
                                  Сбросить
                                </Button>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => {
                                    applyFilters();
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
                          onClick={handleAddNew}
                          disabled={state.loading || authError}
                          title="Добавить новую запись"
                        >
                          <i className="ph-duotone ph-plus me-1"></i>
                          ДОБАВИТЬ
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
                                {getSortedData().map((item: FreeCapacityItem) => (
                                  <tr key={item.id}>
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
                </>
              )}
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
                  disabled={column.id === 'actions'}
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
      
      <Offcanvas
        show={showDetailsModal}
        onHide={() => setShowDetailsModal(false)}
        placement="end"
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title className="f-w-600 text-truncate">
            Детали записи #{currentItem?.id}
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {formLoading ? (
            <div className="text-center py-5">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Загрузка...</span>
              </Spinner>
              <p className="mt-2">Загрузка данных...</p>
            </div>
          ) : (
            <>
              <div className="d-flex">
                <div className="flex-shrink-0">
                  <div className="avtar avtar-xs bg-light-primary">
                    <i className="ti ti-id f-20"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-1"><b>ID</b></h5>
                  <p className="text-muted">{currentItem?.id}</p>
                </div>
              </div>
              <div className="d-flex">
                <div className="flex-shrink-0">
                  <div className="avtar avtar-xs bg-light-warning">
                    <i className="ti ti-building f-20"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-1"><b>Организация</b></h5>
                  <p className="text-muted">{currentItem?.org?.shortName || currentItem?.org?.fullName || 'Не указано'}</p>
                </div>
              </div>
              <div className="d-flex">
                <div className="flex-shrink-0">
                  <div className="avtar avtar-xs bg-light-danger">
                    <i className="ti ti-database f-20"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-1"><b>Тип ресурса</b></h5>
                  <p className="text-muted">{currentItem?.resource?.name || 'Не указано'}</p>
                </div>
              </div>
              <div className="d-flex">
                <div className="flex-shrink-0">
                  <div className="avtar avtar-xs bg-light-success">
                    <i className="ti ti-tool f-20"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-1"><b>Тип оборудования</b></h5>
                  <p className="text-muted">{currentItem?.equipment?.name || 'Не указано'}</p>
                </div>
              </div>
              <div className="d-flex">
                <div className="flex-shrink-0">
                  <div className="avtar avtar-xs bg-light-info">
                    <i className="ti ti-map-pin f-20"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-1"><b>Координаты</b></h5>
                  <p className="text-muted">
                    {currentItem?.coordinates?.length || 0} точек
                  </p>
                  <div className="coordinates-list">
                    {currentItem?.coordinates?.map((coord, index) => (
                      <div key={index} className="mb-1 small">
                        Точка {index + 1}: {coord[0]}, {coord[1]}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="d-flex">
                <div className="flex-shrink-0">
                  <div className="avtar avtar-xs bg-light-secondary">
                    <i className="ti ti-calendar f-20"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-1"><b>Дата создания</b></h5>
                  <p className="text-muted">{currentItem?.created_at ? new Date(currentItem.created_at).toLocaleString() : 'Не указано'}</p>
                </div>
              </div>
              <div className="d-flex">
                <div className="flex-shrink-0">
                  <div className="avtar avtar-xs bg-light-secondary">
                    <i className="ti ti-calendar-stats f-20"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-1"><b>Дата обновления</b></h5>
                  <p className="text-muted">{currentItem?.updated_at ? new Date(currentItem.updated_at).toLocaleString() : 'Не указано'}</p>
                </div>
              </div>
            </>
          )}
        </Offcanvas.Body>
      </Offcanvas>
      
      <Offcanvas
        show={showEditOffcanvas}
        onHide={() => {
          setShowEditOffcanvas(false);
          setFormError(null);
          setCurrentItem(null);
        }}
        placement="end"
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title className="f-w-600 text-truncate">
            {currentItem ? 'Редактирование записи' : 'Добавление записи'}
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Form id="free-capacity-form" onSubmit={handleSaveForm}>
          <Offcanvas.Body>
            {formLoading ? (
              <div className="text-center py-5">
                <Spinner animation="border" role="status">
                  <span className="visually-hidden">Загрузка...</span>
                </Spinner>
                <p className="mt-2">Загрузка данных...</p>
              </div>
            ) : (
              <Row className="event-form">
                {formError && (
                  <Col xs={12}>
                    <Alert variant="danger" className="mb-3">
                      {formError}
                    </Alert>
                  </Col>
                )}
                <Col xs={12}>
                  <div className="mb-3">
                    <Form.Label>Тип ресурса*</Form.Label>
                    <Form.Select
                      name="resource_type_id"
                      id="resource-type"
                      value={formData.resource_type_id || ''}
                      onChange={handleFormChange}
                      required
                    >
                      {resourceTypes.map(type => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </Form.Select>
                  </div>
                </Col>
                <Col xs={12}>
                  <div className="mb-3">
                    <Form.Label>Тип оборудования*</Form.Label>
                    <Form.Select
                      name="equipment_type_id"
                      id="equipment-type"
                      value={formData.equipment_type_id || ''}
                      onChange={handleFormChange}
                      required
                    >
                      {equipmentTypes.map(type => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </Form.Select>
                  </div>
                </Col>
                <Col xs={12}>
                  <div className="mb-3">
                    <Form.Label>Организация*</Form.Label>
                    <Form.Select
                      name="org_id"
                      id="organization"
                      value={formData.org_id || ''}
                      onChange={handleFormChange}
                      required
                    >
                      {organizations.map(org => (
                        <option key={org.id} value={org.id}>
                          {org.shortName || org.fullName || `Организация ${org.id}`}
                        </option>
                      ))}
                    </Form.Select>
                  </div>
                </Col>
                <Col xs={12}>
                  <div className="mb-3">
                    <Form.Label>Координаты (минимум 4 пары)*</Form.Label>
                    <Form.Control
                      as="textarea"
                      name="coordinates"
                      id="coordinates"
                      value={coordinatesInput}
                      onChange={handleFormChange}
                      rows={6}
                      required
                      placeholder="[51.695280, 39.182930],
[51.695884, 39.196807],
[51.686900, 39.183902],
[51.688609, 39.200649]"
                    />
                    <Form.Text className="text-muted">
                      Введите минимум 4 пары координат в формате [широта, долгота] по одной паре на строку или через запятую
                    </Form.Text>
                  </div>
                </Col>
                <Col xs={12}>
                  <div className="small text-muted mb-3">* - обязательные поля</div>
                </Col>
              </Row>
            )}
            <Row className="justify-content-between">
              <div className="col-auto">
                <Button
                  type="button"
                  variant="link-danger"
                  className="btn-pc-default"
                  onClick={() => {
                    setShowEditOffcanvas(false);
                    setFormError(null);
                    setCurrentItem(null);
                  }}
                  disabled={formLoading}
                >
                  <i className="align-text-bottom me-1 ti ti-circle-x"></i> Отмена
                </Button>
              </div>
              <div className="col-auto">
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Сохранение...
                    </>
                  ) : (
                    <>
                      <i className="align-text-bottom me-1 ti ti-device-floppy"></i>
                      {currentItem ? 'Обновить' : 'Добавить'}
                    </>
                  )}
                </Button>
              </div>
            </Row>
          </Offcanvas.Body>
        </Form>
      </Offcanvas>
      
      <DeleteModal
        show={showDeleteModal}
        handleClose={() => setShowDeleteModal(false)}
        handleDeleteId={handleDeleteConfirm}
        modalTitle="Подтверждение удаления"
        modalText={`Вы действительно хотите удалить запись о свободной мощности #${currentItem?.id}?`}
        btnText="Удалить"
        loading={formLoading}
      />
      
      <style>{`
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
        .f-18 {
          font-size: 18px;
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
        .coordinates-list {
          max-height: 150px;
          overflow-y: auto;
          border: 1px solid #dee2e6;
          border-radius: 0.25rem;
          padding: 0.5rem;
          background-color: #f8f9fa;
        }
      `}</style>
    </React.Fragment>
  );
};

export default FreeCapacityList;