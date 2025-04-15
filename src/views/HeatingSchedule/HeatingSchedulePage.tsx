import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Button, Form, Spinner, Alert, Pagination, Offcanvas, OverlayTrigger, Tooltip, Modal, Table, InputGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
  initializeApi,
  getCities,
  getStreets,
  getMkdBuildings,
  getHeatingSchedule,
  getHeatingScheduleById,
  createHeatingSchedule,
  updateHeatingSchedule,
  deleteHeatingSchedule
} from '../../services/api';

interface City { id: number; name: string; }
interface Street { id: number; name: string; city_id?: number; city?: City; }
interface Address { id: number; street_id: number; house_number: string; building: string | null; structure: string | null; literature: string | null; latitude?: string; longitude?: string; street?: Street; name?: string; }
interface MkdBuilding { id: number; address: Address; buildingYear?: string | number | null; cadastreNumber?: string | null; house_type?: { houseTypeName?: string }; house_condition?: { houseCondition?: string }; management_org?: { shortName?: string }; planned_disconnection_date?: string | null; actual_disconnection_date?: string | null; planned_connection_date?: string | null; actual_connection_date?: string | null; disconnection_order?: string | null; connection_order?: string | null; }
interface HeatingScheduleItem { id: number; status: boolean; planned_disconnection_date: string | null; planned_connection_date: string | null; actual_disconnection_date: string | null; actual_connection_date: string | null; disconnection_omsu_order_number: string | null; disconnection_omsu_order_date: string | null; disconnection_omsu_order_title: string | null; disconnection_omsu_order_additional_info: string | null; connection_omsu_order_number: string | null; connection_omsu_order_date: string | null; connection_omsu_order_title: string | null; connection_omsu_order_additional_info: string | null; created_at?: string; updated_at?: string; mkd?: MkdBuilding | null | undefined; address?: Address | null | undefined; }
interface HeatingScheduleFormData { mkd_id: number | ''; address_id: number | ''; status: boolean; planned_disconnection_date: string | null; planned_connection_date: string | null; actual_disconnection_date: string | null; actual_connection_date: string | null; disconnection_omsu_order_number: string | null; disconnection_omsu_order_date: string | null; disconnection_omsu_order_title: string | null; disconnection_omsu_order_additional_info: string | null; connection_omsu_order_number: string | null; connection_omsu_order_date: string | null; connection_omsu_order_title: string | null; connection_omsu_order_additional_info: string | null; }
interface TableColumn { id: string; title: string; width: number; visible: boolean; field: keyof HeatingScheduleItem | 'actions'; }

const MAX_API_RETRY_ATTEMPTS = 3;

const HeatingSchedulePage: React.FC = () => {
  const [state, setState] = useState({
    items: [] as HeatingScheduleItem[],
    loading: true,
    error: null as string | null,
    success: '',
    totalItems: 0,
    currentPage: 1,
    totalPages: 1,
    filterCityId: undefined as number | undefined,
    filterStreetId: undefined as number | undefined,
    filterHouseNumber: '',
  });

  const [filterState, setFilterState] = useState({
    cityId: undefined as number | undefined,
    streetId: undefined as number | undefined,
    houseNumber: '',
  });

  const [filterOptions, setFilterOptions] = useState({
    cities: [] as City[],
    streets: [] as Street[],
    houseNumbers: [] as string[],
  });

  const [_filterCities, _setFilterCities] = useState<City[]>([]);
  const [_filterStreets, _setFilterStreets] = useState<Street[]>([]);

  useEffect(() => {
    const loadCities = async () => {
      try {
        const citiesData = await getCities(); // API returns the cities array directly

        setFilterOptions(prev => ({
          ...prev,
          cities: Array.isArray(citiesData) ? citiesData : [],
        }));
      } catch (error) {
        console.error('Ошибка загрузки городов:', error);
      }
    };

    loadCities();
  }, []);

  useEffect(() => {
    const loadStreets = async () => {
      if (!filterState.cityId) {
        setFilterOptions(prev => ({ ...prev, streets: [] }));
        return;
      }
      try {
        const streetsData = await getStreets(filterState.cityId);
        setFilterOptions(prev => ({
          ...prev,
          streets: Array.isArray(streetsData) ? streetsData : [],
        }));
      } catch (error) {
        console.error('Ошибка загрузки улиц:', error);
      }
    };
    loadStreets();
  }, [filterState.cityId]);

  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showColumnsSettings, setShowColumnsSettings] = useState(false);
  const [currentItem, setCurrentItem] = useState<HeatingScheduleItem | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState<HeatingScheduleFormData>({
    mkd_id: '',
    address_id: '',
    status: true,
    planned_disconnection_date: null,
    planned_connection_date: null,
    actual_disconnection_date: null,
    actual_connection_date: null,
    disconnection_omsu_order_number: null,
    disconnection_omsu_order_date: null,
    disconnection_omsu_order_title: null,
    disconnection_omsu_order_additional_info: null,
    connection_omsu_order_number: null,
    connection_omsu_order_date: null,
    connection_omsu_order_title: null,
    connection_omsu_order_additional_info: null
  });
  const [modalCities, _setModalCities] = useState<City[]>([]);
  const [modalStreets, setModalStreets] = useState<Street[]>([]);
  const [modalBuildings, setModalBuildings] = useState<MkdBuilding[]>([]);
  const [modalCityId, setModalCityId] = useState<number | ''>('');
  const [modalStreetId, setModalStreetId] = useState<number | ''>('');
  const [modalLoading, setModalLoading] = useState({
    cities: false,
    streets: false,
    buildings: false
  });
  const [columns, setColumns] = useState<TableColumn[]>([
    { id: 'id', title: '№', width: 70, visible: true, field: 'id' },
    { id: 'address', title: 'АДРЕС МКД', width: 250, visible: true, field: 'address' },
    { id: 'planned_disconnection_date', title: 'ПЛАН. ОТКЛ.', width: 120, visible: true, field: 'planned_disconnection_date' },
    { id: 'actual_disconnection_date', title: 'ФАКТ. ОТКЛ.', width: 120, visible: true, field: 'actual_disconnection_date' },
    { id: 'disconnection_omsu_order_number', title: 'ПРИКАЗ ОТКЛ.', width: 150, visible: true, field: 'disconnection_omsu_order_number' },
    { id: 'planned_connection_date', title: 'ПЛАН. ВКЛ.', width: 120, visible: true, field: 'planned_connection_date' },
    { id: 'actual_connection_date', title: 'ФАКТ. ВКЛ.', width: 120, visible: true, field: 'actual_connection_date' },
    { id: 'connection_omsu_order_number', title: 'ПРИКАЗ ВКЛ.', width: 150, visible: true, field: 'connection_omsu_order_number' },
    { id: 'actions', title: 'ДЕЙСТВИЯ', width: 130, visible: true, field: 'actions' }
  ]);
  const [isTableCustomized, setIsTableCustomized] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);
  const [searchInput, setSearchInput] = useState('');
  const [sortField, setSortField] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [authError, setAuthError] = useState<boolean>(false);
  const [apiRetryCount, setApiRetryCount] = useState<number>(0);
  const [_apiSuccessful, setApiSuccessful] = useState<boolean>(false);

  useEffect(() => {
    const savedColumns = localStorage.getItem('heatingScheduleColumns');
    if (savedColumns) {
      try {
        const parsedColumns = JSON.parse(savedColumns);
        setColumns(parsedColumns);
        setIsTableCustomized(true);
      } catch (e) {
        console.error('Error loading table settings:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (isTableCustomized) {
      localStorage.setItem('heatingScheduleColumns', JSON.stringify(columns));
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
        col.id === columnId ? { ...col, visible } : col
      )
    );
    setIsTableCustomized(true);
  };

  const resetTableSettings = () => {
    const defaultColumns: TableColumn[] = [
      { id: 'id', title: '№', width: 70, visible: true, field: 'id' },
      { id: 'address', title: 'АДРЕС МКД', width: 250, visible: true, field: 'address' },
      { id: 'planned_disconnection_date', title: 'ПЛАН. ОТКЛ.', width: 120, visible: true, field: 'planned_disconnection_date' },
      { id: 'actual_disconnection_date', title: 'ФАКТ. ОТКЛ.', width: 120, visible: true, field: 'actual_disconnection_date' },
      { id: 'disconnection_omsu_order_number', title: 'ПРИКАЗ ОТКЛ.', width: 150, visible: true, field: 'disconnection_omsu_order_number' },
      { id: 'planned_connection_date', title: 'ПЛАН. ВКЛ.', width: 120, visible: true, field: 'planned_connection_date' },
      { id: 'actual_connection_date', title: 'ФАКТ. ВКЛ.', width: 120, visible: true, field: 'actual_connection_date' },
      { id: 'connection_omsu_order_number', title: 'ПРИКАЗ ВКЛ.', width: 150, visible: true, field: 'connection_omsu_order_number' },
      { id: 'actions', title: 'ДЕЙСТВИЯ', width: 130, visible: true, field: 'actions' }
    ];
    setColumns(defaultColumns);
    localStorage.removeItem('heatingScheduleColumns');
    setIsTableCustomized(false);
    setShowColumnsSettings(false);
  };

  useEffect(() => {
    const loadFilterCities = async () => {
      try {
        const citiesData = await getCities();
        _setFilterCities(Array.isArray(citiesData) ? citiesData : []);
      } catch (error: any) {
        // обработка ошибки
      }
    };
    loadFilterCities();
  }, []);

  useEffect(() => {
    const loadFilterStreets = async () => {
      if (!state.filterCityId) {
        _setFilterStreets([]);
        return;
      }
      try {
        const streetsData = await getStreets(state.filterCityId);
        _setFilterStreets(streetsData);
      } catch (error: any) {
        _setFilterStreets([]);
      }
    };
    if (typeof state.filterCityId === 'number') {
      loadFilterStreets();
    } else {
      _setFilterStreets([]);
    }
  }, [state.filterCityId]);

  useEffect(() => {
    const loadModalStreets = async () => {
      if (!modalCityId) {
        setModalStreets([]);
        setModalStreetId('');
        setModalBuildings([]);
        return;
      }
      setModalLoading(prev => ({ ...prev, streets: true, buildings: false }));
      setModalStreets([]);
      setModalStreetId('');
      setModalBuildings([]);
      setFormData(prev => ({ ...prev, mkd_id: '', address_id: '' }));
      try {
        const streetsData = await getStreets(modalCityId);
        setModalStreets(streetsData);
      } catch (error: any) {
        setFormError(`Failed to load streets: ${error.message || ''}`);
      } finally {
        setModalLoading(prev => ({ ...prev, streets: false }));
      }
    };
    loadModalStreets();
  }, [modalCityId]);

  useEffect(() => {
    const loadModalBuildings = async () => {
      if (!modalCityId || !modalStreetId) {
        setModalBuildings([]);
        return;
      }
      setModalLoading(prev => ({ ...prev, buildings: true }));
      setModalBuildings([]);
      setFormData(prev => ({ ...prev, mkd_id: '', address_id: '' }));
      try {
        const response = await getMkdBuildings(1, {
          city_id: modalCityId,
          street_id: modalStreetId
        });
        setModalBuildings(response.items);
        if (response.items.length === 0) {
          setFormError("No buildings found for the selected street.");
        } else {
          setFormError(null);
        }
      } catch (error: any) {
        setFormError(`Failed to load buildings: ${error.message || ''}`);
      } finally {
        setModalLoading(prev => ({ ...prev, buildings: false }));
      }
    };
    if (modalCityId && modalStreetId) {
      loadModalBuildings();
    } else {
      setModalBuildings([]);
    }
  }, [modalCityId, modalStreetId]);

  const loadHeatingSchedule = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await getHeatingSchedule(
          state.filterCityId,
          state.filterStreetId,
          state.filterHouseNumber
      );

      // Извлекаем доступные номера домов из полученных данных
      const houseNumbers = Array.from(
          new Set(
              response.data
                  ?.map(item => item.address?.house_number)
                  .filter(Boolean) as string[]
          )
      ).sort();

      setFilterOptions(prev => ({
        ...prev,
        houseNumbers,
      }));

      setState(prev => ({
        ...prev,
        items: response.data ?? [],
        totalItems: response.total ?? (response.data?.length ?? 0),
        currentPage: response.current_page || 1,
        totalPages: response.last_page || 1,
        loading: false,
        success: 'success',
        error: null,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: 'Ошибка загрузки данных',
        loading: false,
      }));
    }
  };

  useEffect(() => {
    loadHeatingSchedule();
  }, [state.filterCityId, state.filterStreetId, state.filterHouseNumber]);

  useEffect(() => {
    return () => {
      document.body.style.cursor = '';
      document.body.classList.remove('resizing');
    };
  }, []);

  const handleShowForm = async (item?: HeatingScheduleItem) => {
    setFormError(null);
    setFormLoading(true);
    setShowFormModal(true);
    setModalCityId('');
    setModalStreetId('');
    setModalStreets([]);
    setModalBuildings([]);
    setModalLoading({ cities: false, streets: false, buildings: false });
    setFormData({
      mkd_id: '',
      address_id: '',
      status: true,
      planned_disconnection_date: null,
      planned_connection_date: null,
      actual_disconnection_date: null,
      actual_connection_date: null,
      disconnection_omsu_order_number: null,
      disconnection_omsu_order_date: null,
      disconnection_omsu_order_title: null,
      disconnection_omsu_order_additional_info: null,
      connection_omsu_order_number: null,
      connection_omsu_order_date: null,
      connection_omsu_order_title: null,
      connection_omsu_order_additional_info: null
    });
    setCurrentItem(null);
    if (item) {
      try {
        const scheduleDetails = await getHeatingScheduleById(item.id);
        setCurrentItem(scheduleDetails);
        const cityId = scheduleDetails.address?.street?.city?.id;
        const streetId = scheduleDetails.address?.street?.id;
        if (cityId) setModalCityId(cityId);
        if (streetId) setTimeout(() => setModalStreetId(streetId), 300);
        setFormData({
          mkd_id: scheduleDetails.mkd?.id ?? '',
          address_id: scheduleDetails.address?.id ?? '',
          status: scheduleDetails.status,
          planned_disconnection_date: scheduleDetails.planned_disconnection_date?.split('T')[0] ?? null,
          planned_connection_date: scheduleDetails.planned_connection_date?.split('T')[0] ?? null,
          actual_disconnection_date: scheduleDetails.actual_disconnection_date?.split('T')[0] ?? null,
          actual_connection_date: scheduleDetails.actual_connection_date?.split('T')[0] ?? null,
          disconnection_omsu_order_number: scheduleDetails.disconnection_omsu_order_number,
          disconnection_omsu_order_date: scheduleDetails.disconnection_omsu_order_date?.split('T')[0] ?? null,
          disconnection_omsu_order_title: scheduleDetails.disconnection_omsu_order_title,
          disconnection_omsu_order_additional_info: scheduleDetails.disconnection_omsu_order_additional_info,
          connection_omsu_order_number: scheduleDetails.connection_omsu_order_number,
          connection_omsu_order_date: scheduleDetails.connection_omsu_order_date?.split('T')[0] ?? null,
          connection_omsu_order_title: scheduleDetails.connection_omsu_order_title,
          connection_omsu_order_additional_info: scheduleDetails.connection_omsu_order_additional_info
        });
      } catch (error: any) {
        setFormError(`Ошибка загрузки: ${error.message || ''}`);
        setShowFormModal(false);
      } finally {
        setFormLoading(false);
      }
    } else {
      setFormLoading(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const checkedValue = isCheckbox ? (e.target as HTMLInputElement).checked : undefined;
    if (name === 'modalCityId') {
      setModalCityId(value ? parseInt(value, 10) : '');
      return;
    }
    if (name === 'modalStreetId') {
      setModalStreetId(value ? parseInt(value, 10) : '');
      return;
    }
    setFormData(prev => {
      const newState = {
        ...prev,
        [name]: isCheckbox ? checkedValue : value
      };
      if (name === 'mkd_id' && value) {
        const selectedBuilding = modalBuildings.find(b => b.id === parseInt(value, 10));
        newState.address_id = selectedBuilding?.address?.id ?? '';
      } else if (name === 'mkd_id' && !value) {
        newState.address_id = '';
      }
      return newState;
    });
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      if (formData.mkd_id === '') {
        setFormError('Выберите МКД');
        setFormLoading(false);
        return;
      }
      if (formData.address_id === '') {
        const selectedBuilding = modalBuildings.find(b => b.id === Number(formData.mkd_id));
        if (!selectedBuilding?.address?.id) {
          setFormError('Не удалось определить адрес');
          setFormLoading(false);
          return;
        }
        formData.address_id = selectedBuilding.address.id;
      }
      const dataToSave = {
        mkd_id: Number(formData.mkd_id),
        address_id: Number(formData.address_id),
        status: formData.status,
        planned_disconnection_date: formData.planned_disconnection_date || null,
        planned_connection_date: formData.planned_connection_date || null,
        actual_disconnection_date: formData.actual_disconnection_date || null,
        actual_connection_date: formData.actual_connection_date || null,
        disconnection_omsu_order_number: formData.disconnection_omsu_order_number || null,
        disconnection_omsu_order_date: formData.disconnection_omsu_order_date || null,
        disconnection_omsu_order_title: formData.disconnection_omsu_order_title || null,
        disconnection_omsu_order_additional_info: formData.disconnection_omsu_order_additional_info || null,
        connection_omsu_order_number: formData.connection_omsu_order_number || null,
        connection_omsu_order_date: formData.connection_omsu_order_date || null,
        connection_omsu_order_title: formData.connection_omsu_order_title || null,
        connection_omsu_order_additional_info: formData.connection_omsu_order_additional_info || null,
      };
      if (currentItem) {
        await updateHeatingSchedule(currentItem.id, dataToSave);
        setState(prev => ({ ...prev, success: 'График обновлен' }));
      } else {
        await createHeatingSchedule(dataToSave);
        setState(prev => ({ ...prev, success: 'График создан' }));
      }
      setShowFormModal(false);
      loadHeatingSchedule();
    } catch (error: any) {
      let errorMessage = `Ошибка сохранения: ${error.message || ''}`;
      if (error.response?.data?.errors) {
        errorMessage = `Ошибка валидации: ${Object.values(error.response.data.errors).flat().join(', ')}`;
      }
      setFormError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!currentItem) return;
    setFormLoading(true);
    try {
      await deleteHeatingSchedule(currentItem.id);
      setShowDeleteModal(false);
      setState(prev => ({ ...prev, success: 'График удален' }));
      loadHeatingSchedule();
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: `Ошибка удаления: ${error.message || ''}`,
        success: ''
      }));
      setShowDeleteModal(false);
    } finally {
      setFormLoading(false);
      setCurrentItem(null);
    }
  };

  const handleViewDetails = async (item: HeatingScheduleItem) => {
    setFormLoading(true);
    setCurrentItem(null);
    setShowDetailsModal(true);
    try {
      const details = await getHeatingScheduleById(item.id);
      setCurrentItem(details);
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: `Ошибка загрузки деталей: ${error.message || ''}`
      }));
      setShowDetailsModal(false);
    } finally {
      setFormLoading(false);
    }
  };

  const applyFilters = () => {
    setState(prev => ({
      ...prev,
      currentPage: 1,
      filterCityId: filterState.cityId,
      filterStreetId: filterState.streetId,
      filterHouseNumber: filterState.houseNumber,
    }));
    loadHeatingSchedule();
  };

  // Reset filters function removed as it's not being used

  const handleReauth = async () => {
    try {
      setAuthError(false);
      setState(prev => ({ ...prev, loading: true, error: null, success: '' }));
      localStorage.removeItem('token');
      await initializeApi();
      setApiRetryCount(0);
      setApiSuccessful(false);
      await loadHeatingSchedule();
    } catch (error) {
      setAuthError(true);
      setState(prev => ({
        ...prev,
        error: 'Failed to authenticate. Please refresh the page or contact an administrator.',
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
      await loadHeatingSchedule();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Error refreshing data. Please try again later.',
        loading: false,
        success: ''
      }));
    }
  };

  const handleSearch = async () => {
    if (!searchInput.trim()) {
      return loadHeatingSchedule();
    }
    setState(prev => ({ ...prev, loading: true, error: null, success: '' }));
    try {
      const response = await getHeatingSchedule(
        state.filterCityId,
        state.filterStreetId,
        state.filterHouseNumber
      );
      setApiSuccessful(true);
      const filteredItems = response.data.filter(item => {
        const address = formatAddress(item);
        return address.toLowerCase().includes(searchInput.toLowerCase()) ||
          (item.disconnection_omsu_order_number &&
            item.disconnection_omsu_order_number.toLowerCase().includes(searchInput.toLowerCase())) ||
          (item.connection_omsu_order_number &&
            item.connection_omsu_order_number.toLowerCase().includes(searchInput.toLowerCase()));
      });
      setState(prev => ({
        ...prev,
        items: filteredItems,
        totalItems: filteredItems.length,
        loading: false,
        error: null,
        success: 'success'
      }));
    } catch (error) {
      setApiRetryCount(prev => prev + 1);
      setState(prev => ({
        ...prev,
        error: `Error searching data. Attempt ${apiRetryCount + 1}/${MAX_API_RETRY_ATTEMPTS}`,
        loading: false,
        success: ''
      }));
    }
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

  const getSortedData = () => {
    return sortData(state.items);
  };

  const sortData = (data: HeatingScheduleItem[]): HeatingScheduleItem[] => {
    return [...data].sort((a, b) => {
      if (sortField === 'address') {
        const aAddr = formatAddress(a);
        const bAddr = formatAddress(b);
        return sortDirection === 'asc'
          ? aAddr.localeCompare(bAddr, 'ru')
          : bAddr.localeCompare(aAddr, 'ru');
      }
      let aValue = a[sortField as keyof HeatingScheduleItem];
      let bValue = b[sortField as keyof HeatingScheduleItem];
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      const aStr = String(aValue || '').toLowerCase();
      const bStr = String(bValue || '').toLowerCase();
      return sortDirection === 'asc'
        ? aStr.localeCompare(bStr, 'ru')
        : bStr.localeCompare(aStr, 'ru');
    });
  };

  const handlePageChange = (page: number) => {
    setState(prev => ({ ...prev, currentPage: page }));
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    try {
      const d = new Date(dateString.split('T')[0]);
      return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('ru-RU');
    } catch(e){
      return '-';
    }
  };

  const formatAddress = (item: HeatingScheduleItem | MkdBuilding | null | undefined) => {
    const addr = item?.address;
    if (!addr) return '-';
    const city = addr.street?.city?.name || '';
    const street = addr.street?.name || '';
    const house = addr.house_number || '';
    const building = addr.building ? `, корп. ${addr.building}` : '';
    const structure = addr.structure ? `, стр. ${addr.structure}` : '';
    const literature = addr.literature ? `, лит. ${addr.literature}` : '';
    const parts = [
      city ? `г. ${city}` : '',
      street,
      house ? `д. ${house}` : '',
      building,
      structure,
      literature
    ];
    return parts.filter(Boolean).join(', ').replace(' ,', ',');
  };

  const renderSortIcon = (field: string) => {
    if (field !== sortField) {
      return <i className="ti ti-sort ms-1"></i>;
    }
    return sortDirection === 'asc'
      ? <i className="ti ti-sort-ascending ms-1"></i>
      : <i className="ti ti-sort-descending ms-1"></i>;
  };

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

  const renderTableRow = (item: HeatingScheduleItem) => {
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
              <div className="d-flex gap-1">
                <OverlayTrigger overlay={<Tooltip id="tooltip-view">Просмотр</Tooltip>}>
                  <Button
                    variant="light-primary"
                    size="sm"
                    onClick={() => handleViewDetails(item)}
                  >
                    <i className="ti ti-eye"></i>
                  </Button>
                </OverlayTrigger>
                <OverlayTrigger overlay={<Tooltip id="tooltip-edit">Редактировать</Tooltip>}>
                  <Button
                    variant="light-success"
                    size="sm"
                    onClick={() => handleShowForm(item)}
                  >
                    <i className="ti ti-pencil"></i>
                  </Button>
                </OverlayTrigger>
                <OverlayTrigger overlay={<Tooltip id="tooltip-delete">Удалить</Tooltip>}>
                  <Button
                    variant="light-danger"
                    size="sm"
                    onClick={() => {
                      setCurrentItem(item);
                      setShowDeleteModal(true);
                    }}
                  >
                    <i className="ti ti-trash"></i>
                  </Button>
                </OverlayTrigger>
              </div>
            </td>
          );
        }
        const fieldKey = column.field as keyof HeatingScheduleItem;
        let cellContent: React.ReactNode = '';
        if (fieldKey === 'address') {
          cellContent = formatAddress(item);
        } else if (fieldKey === 'planned_disconnection_date' ||
                  fieldKey === 'actual_disconnection_date' ||
                  fieldKey === 'planned_connection_date' ||
                  fieldKey === 'actual_connection_date' ||
                  fieldKey === 'disconnection_omsu_order_date' ||
                  fieldKey === 'connection_omsu_order_date') {
          cellContent = formatDate(item[fieldKey] as string);
        } else if (fieldKey === 'disconnection_omsu_order_number') {
          cellContent = item.disconnection_omsu_order_number ? (
            <OverlayTrigger overlay={
              <Tooltip id={`tooltip-disc-${item.id}`}>
                {item.disconnection_omsu_order_title || 'Order'}
                {item.disconnection_omsu_order_date && ` от ${formatDate(item.disconnection_omsu_order_date)}`}
              </Tooltip>
            }>
              <span className="text-primary cursor-pointer">{item.disconnection_omsu_order_number}</span>
            </OverlayTrigger>
          ) : ('-');
        } else if (fieldKey === 'connection_omsu_order_number') {
          cellContent = item.connection_omsu_order_number ? (
            <OverlayTrigger overlay={
              <Tooltip id={`tooltip-conn-${item.id}`}>
                {item.connection_omsu_order_title || 'Order'}
                {item.connection_omsu_order_date && ` от ${formatDate(item.connection_omsu_order_date)}`}
              </Tooltip>
            }>
              <span className="text-primary cursor-pointer">{item.connection_omsu_order_number}</span>
            </OverlayTrigger>
          ) : ('-');
        } else {
          cellContent = item[fieldKey] !== undefined && item[fieldKey] !== null ? String(item[fieldKey]) : '-';
        }
        return (
          <td
            key={`${item.id}-${column.id}`}
            style={style}
          >
            {cellContent}
          </td>
        );
      });
  };

  return (
    <React.Fragment>
      <div className="page-header">
        <div className="page-block">
          <div className="row align-items-center">
            <div className="col-md-8">
              <div className="page-header-title">
                <h5 className="m-b-10">Графики начала/окончания отопительного периода</h5>
              </div>
              <ul className="breadcrumb">
                <li className="breadcrumb-item">
                  <Link to="/dashboard">Главная</Link>
                </li>
                <li className="breadcrumb-item">Реестры/Инвентаризация</li>
                <li className="breadcrumb-item">Графики</li>
                <li className="breadcrumb-item">Графики начала/окончания отопительного периода</li>
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
                <Alert
                  variant="danger"
                  onClose={() => setState(prev => ({ ...prev, error: null }))}
                  dismissible
                >
                  {state.error}
                  <div className="mt-2">
                    <Button variant="outline-danger" size="sm" onClick={handleRefreshData}>
                      Попробовать снова
                    </Button>
                  </div>
                </Alert>
              )}
              {state.success && state.success !== 'success' && (
                <Alert
                  variant="success"
                  onClose={() => setState(prev => ({ ...prev, success: 'success' }))}
                  dismissible
                >
                  {state.success}
                </Alert>
              )}
              <Row className="mb-3 align-items-end">
                <Col md={12}>
                  <h5 className="mb-2">Фильтры</h5>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Город</Form.Label>
                    {filterOptions.cities.length === 0 ? (
                        <div className="d-flex align-items-center">
                          <Spinner animation="border" size="sm" className="me-2" />
                          <span>Загрузка городов...</span>
                        </div>
                    ) : (
                        <Form.Select
                            value={filterState.cityId ?? ''}
                            onChange={(e) => {
                              const cityId = e.target.value ? parseInt(e.target.value) : undefined;
                              setFilterState(prev => ({
                                ...prev,
                                cityId,
                                streetId: undefined,
                                houseNumber: '',
                              }));
                            }}
                        >
                          <option value="">Все города</option>
                          {filterOptions.cities.map(city => (
                              <option key={city.id} value={city.id}>
                                {city.name}
                              </option>
                          ))}
                        </Form.Select>
                    )}
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Улица</Form.Label>
                    <Form.Select
                        value={filterState.streetId ?? ''}
                        onChange={(e) => {
                          const streetId = e.target.value ? parseInt(e.target.value) : undefined;
                          setFilterState(prev => ({
                            ...prev,
                            streetId,
                            houseNumber: '',
                          }));
                        }}
                        disabled={!filterState.cityId}
                    >
                      <option value="">Все улицы</option>
                      {filterOptions.streets.map(street => (
                          <option key={street.id} value={street.id}>{street.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Номер дома</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Номер дома"
                        value={filterState.houseNumber}
                        onChange={(e) => setFilterState(prev => ({
                          ...prev,
                          houseNumber: e.target.value,
                        }))}
                        disabled={!filterState.streetId}
                    />
                  </Form.Group>
                </Col>
                <Col md={3} className="d-flex justify-content-end gap-2">
                  <Button
                      variant="outline-secondary"
                      onClick={() => {
                        setFilterState({
                          cityId: undefined,
                          streetId: undefined,
                          houseNumber: '',
                        });
                      }}
                      disabled={!filterState.cityId && !filterState.streetId && !filterState.houseNumber}
                  >
                    <i className="ti ti-trash me-1"></i>Сбросить
                  </Button>
                  <Button
                      variant="primary"
                      onClick={applyFilters}
                      disabled={state.loading}
                  >
                    <i className="ti ti-filter me-1"></i>Применить
                  </Button>
                </Col>
              </Row>
              <Row className="mb-3 mt-4">
                <Col md={6} className="d-flex align-items-center">
                  <h5 className="mb-0">Графики ({state.totalItems})</h5>
                </Col>
                <Col md={6} className="d-flex justify-content-end gap-2 align-items-center">
                  <div className="form-search me-2">
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
                    onClick={() => handleShowForm()}
                  >
                    <i className="ti ti-plus me-1"></i>Добавить график
                  </Button>
                </Col>
              </Row>
              <div className="table-responsive">
                {state.loading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" />
                    <p className="mt-2">Загрузка...</p>
                  </div>
                ) : (
                  <>
                    {state.items.length === 0 ? (
                      <div className="text-center py-5">
                        <p className="mb-0">Нет данных</p>
                        <p className="text-muted small">Измените фильтры или добавьте новый график.</p>
                      </div>
                    ) : (
                      <Table hover responsive ref={tableRef} className="resizable-table">
                        <thead>
                          <tr>
                            {renderTableHeaders()}
                          </tr>
                        </thead>
                        <tbody>
                          {getSortedData().map((item) => (
                            <tr key={item.id}>
                              {renderTableRow(item)}
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                    {renderPagination()}
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
                  disabled={column.id === 'actions'}
                />
              </Form.Group>
            ))}
          </Form>
          <div className="mt-4">
            <p className="text-muted mb-2">
              Для изменения ширины столбца перетащите правую границу заголовка таблицы.
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
        show={showFormModal}
        onHide={() => !formLoading && setShowFormModal(false)}
        backdrop="static"
        keyboard={false}
        size="lg"
      >
        <Modal.Header closeButton={!formLoading}>
          <Modal.Title>{currentItem ? 'Редактирование графика' : 'Добавление графика'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveForm}>
          <Modal.Body>
            {formError && (
              <Alert variant="danger" onClose={() => setFormError(null)} dismissible>
                {formError}
              </Alert>
            )}
            {formLoading && !modalLoading.streets && !modalLoading.buildings && (
              <div className="text-center py-4">
                <Spinner animation="border" />
                <p className="mt-2">Обработка...</p>
              </div>
            )}
            <Row>
              <Col md={6}>
                <h6 className="mb-3">Выбор адреса МКД</h6>
                <Form.Group className="mb-3">
                  <Form.Label>Город*</Form.Label>
                  <div className="d-flex align-items-center">
                    <Form.Select
                      name="modalCityId"
                      value={modalCityId}
                      onChange={handleFormChange}
                      disabled={modalLoading.cities || formLoading}
                      required
                    >
                      <option value="">Выберите город...</option>
                      {modalCities.map(city => (
                        <option key={city.id} value={city.id}>{city.name}</option>
                      ))}
                    </Form.Select>
                    {modalLoading.cities && <Spinner animation="border" size="sm" className="ms-2" />}
                  </div>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Улица*</Form.Label>
                  <div className="d-flex align-items-center">
                    <Form.Select
                      name="modalStreetId"
                      value={modalStreetId}
                      onChange={handleFormChange}
                      disabled={!modalCityId || modalLoading.streets || formLoading}
                      required
                    >
                      <option value="">
                        {modalCityId
                          ? (modalLoading.streets
                              ? 'Загрузка улиц...'
                              : 'Выберите улицу...')
                          : 'Сначала выберите город'}
                      </option>
                      {modalStreets.map(street => (
                        <option key={street.id} value={street.id}>{street.name}</option>
                      ))}
                    </Form.Select>
                    {modalLoading.streets && <Spinner animation="border" size="sm" className="ms-2" />}
                  </div>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>МКД*</Form.Label>
                  <div className="d-flex align-items-center">
                    <Form.Select
                      name="mkd_id"
                      value={formData.mkd_id}
                      onChange={handleFormChange}
                      required
                      disabled={!modalStreetId || modalLoading.buildings || formLoading}
                    >
                      <option value="">
                        {!modalStreetId
                          ? 'Сначала выберите улицу'
                          : modalLoading.buildings
                            ? 'Загрузка домов...'
                            : (modalBuildings.length === 0
                                ? 'Дома не найдены'
                                : 'Выберите дом...')}
                      </option>
                      {modalBuildings.map(building => (
                        <option key={building.id} value={building.id}>
                          {`д. ${building.address.house_number}${building.address.building ? ` корп. ${building.address.building}` : ''}${building.address.structure ? ` стр. ${building.address.structure}` : ''}${building.address.literature ? ` лит. ${building.address.literature}` : ''}`}
                        </option>
                      ))}
                    </Form.Select>
                    {modalLoading.buildings && <Spinner animation="border" size="sm" className="ms-2" />}
                  </div>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Адрес (авто)</Form.Label>
                  <Form.Control
                    type="text"
                    readOnly
                    disabled
                    value={formData.address_id
                      ? formatAddress(modalBuildings.find(b => b.address?.id === Number(formData.address_id)))
                      : 'Выберите МКД'}
                  />
                  <input type="hidden" name="address_id" value={formData.address_id} />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="switch"
                    id="status"
                    name="status"
                    label="Активный"
                    checked={formData.status}
                    onChange={handleFormChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <h6 className="mb-3">Даты отключения/включения</h6>
                <Form.Group className="mb-3">
                  <Form.Label>План. откл.</Form.Label>
                  <Form.Control
                    type="date"
                    name="planned_disconnection_date"
                    value={formData.planned_disconnection_date || ''}
                    onChange={handleFormChange}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Факт. откл.</Form.Label>
                  <Form.Control
                    type="date"
                    name="actual_disconnection_date"
                    value={formData.actual_disconnection_date || ''}
                    onChange={handleFormChange}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>План. вкл.</Form.Label>
                  <Form.Control
                    type="date"
                    name="planned_connection_date"
                    value={formData.planned_connection_date || ''}
                    onChange={handleFormChange}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Факт. вкл.</Form.Label>
                  <Form.Control
                    type="date"
                    name="actual_connection_date"
                    value={formData.actual_connection_date || ''}
                    onChange={handleFormChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            <hr className="my-4" />
            <Row>
              <Col md={6}>
                <h6 className="mb-3">Приказ об отключении</h6>
                <Form.Group className="mb-3">
                  <Form.Label>Номер</Form.Label>
                  <Form.Control
                    type="text"
                    name="disconnection_omsu_order_number"
                    value={formData.disconnection_omsu_order_number || ''}
                    onChange={handleFormChange}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Дата</Form.Label>
                  <Form.Control
                    type="date"
                    name="disconnection_omsu_order_date"
                    value={formData.disconnection_omsu_order_date || ''}
                    onChange={handleFormChange}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Название</Form.Label>
                  <Form.Control
                    type="text"
                    name="disconnection_omsu_order_title"
                    value={formData.disconnection_omsu_order_title || ''}
                    onChange={handleFormChange}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Доп. инфо</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="disconnection_omsu_order_additional_info"
                    value={formData.disconnection_omsu_order_additional_info || ''}
                    onChange={handleFormChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <h6 className="mb-3">Приказ о включении</h6>
                <Form.Group className="mb-3">
                  <Form.Label>Номер</Form.Label>
                  <Form.Control
                    type="text"
                    name="connection_omsu_order_number"
                    value={formData.connection_omsu_order_number || ''}
                    onChange={handleFormChange}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Дата</Form.Label>
                  <Form.Control
                    type="date"
                    name="connection_omsu_order_date"
                    value={formData.connection_omsu_order_date || ''}
                    onChange={handleFormChange}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Название</Form.Label>
                  <Form.Control
                    type="text"
                    name="connection_omsu_order_title"
                    value={formData.connection_omsu_order_title || ''}
                    onChange={handleFormChange}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Доп. инфо</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="connection_omsu_order_additional_info"
                    value={formData.connection_omsu_order_additional_info || ''}
                    onChange={handleFormChange}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowFormModal(false)}
              disabled={formLoading}
            >
              Отмена
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={formLoading || modalLoading.streets || modalLoading.buildings}
            >
              {formLoading
                ? (<><Spinner size="sm" className="me-2" />Сохранение...</>)
                : 'Сохранить'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
      <Modal
        show={showDetailsModal}
        onHide={() => setShowDetailsModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Детали графика отопления</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {formLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
              <p className="mt-2">Загрузка...</p>
            </div>
          ) : !currentItem ? (
            <div className="text-center py-3">
              <p>Нет данных</p>
            </div>
          ) : (
            <>
              <Row className="mb-4">
                <Col md={6}>
                  <h6 className="fw-bold mb-3">Общие сведения</h6>
                  <p className="mb-2">
                    <span className="fw-bold">Адрес МКД:</span> {formatAddress(currentItem)}
                  </p>
                  <p className="mb-2">
                    <span className="fw-bold">Статус:</span> {currentItem.status ? 'Активный' : 'Неактивный'}
                  </p>
                  <p className="mb-2 text-muted small">
                    <span className="fw-bold">ID Записи:</span> {currentItem.id}
                  </p>
                  <p className="mb-2 text-muted small">
                    <span className="fw-bold">ID МКД:</span> {currentItem.mkd?.id ?? '-'}
                  </p>
                  <p className="mb-2 text-muted small">
                    <span className="fw-bold">ID Адреса:</span> {currentItem.address?.id ?? '-'}
                  </p>
                </Col>
                <Col md={6}>
                  <h6 className="fw-bold mb-3">Даты отопительного периода</h6>
                  <p className="mb-2">
                    <span className="fw-bold">План. откл.:</span> {formatDate(currentItem.planned_disconnection_date)}
                  </p>
                  <p className="mb-2">
                    <span className="fw-bold">Факт. откл.:</span> {formatDate(currentItem.actual_disconnection_date)}
                  </p>
                  <p className="mb-2">
                    <span className="fw-bold">План. вкл.:</span> {formatDate(currentItem.planned_connection_date)}
                  </p>
                  <p className="mb-2">
                    <span className="fw-bold">Факт. вкл.:</span> {formatDate(currentItem.actual_connection_date)}
                  </p>
                </Col>
              </Row>
              <hr className="my-4" />
              <Row>
                <Col md={6}>
                  <h6 className="fw-bold mb-3">Приказ об отключении</h6>
                  <p className="mb-2">
                    <span className="fw-bold">Номер:</span> {currentItem.disconnection_omsu_order_number || '-'}
                  </p>
                  <p className="mb-2">
                    <span className="fw-bold">Дата:</span> {formatDate(currentItem.disconnection_omsu_order_date)}
                  </p>
                  <p className="mb-2">
                    <span className="fw-bold">Название:</span> {currentItem.disconnection_omsu_order_title || '-'}
                  </p>
                  <p className="mb-2">
                    <span className="fw-bold">Доп. инфо:</span> {currentItem.disconnection_omsu_order_additional_info || '-'}
                  </p>
                </Col>
                <Col md={6}>
                  <h6 className="fw-bold mb-3">Приказ о включении</h6>
                  <p className="mb-2">
                    <span className="fw-bold">Номер:</span> {currentItem.connection_omsu_order_number || '-'}
                  </p>
                  <p className="mb-2">
                    <span className="fw-bold">Дата:</span> {formatDate(currentItem.connection_omsu_order_date)}
                  </p>
                  <p className="mb-2">
                    <span className="fw-bold">Название:</span> {currentItem.connection_omsu_order_title || '-'}
                  </p>
                  <p className="mb-2">
                    <span className="fw-bold">Доп. инфо:</span> {currentItem.connection_omsu_order_additional_info || '-'}
                  </p>
                </Col>
              </Row>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowDetailsModal(false)}
          >
            Закрыть
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (currentItem) {
                setShowDetailsModal(false);
                handleShowForm(currentItem);
              }
            }}
            disabled={!currentItem || formLoading}
          >
            Редактировать
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal
        show={showDeleteModal}
        onHide={() => !formLoading && setShowDeleteModal(false)}
        backdrop="static"
        keyboard={false}
      >
        <Modal.Header closeButton={!formLoading}>
          <Modal.Title>Подтверждение удаления</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Вы действительно хотите удалить график для МКД
          {currentItem ? ` по адресу: ${formatAddress(currentItem)}` : ''}?
          <p className="text-danger mt-2 mb-0">Это действие нельзя будет отменить.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowDeleteModal(false)}
            disabled={formLoading}
          >
            Отмена
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteConfirm}
            disabled={formLoading}
          >
            {formLoading
              ? (<><Spinner size="sm" className="me-2" />Удаление...</>)
              : 'Удалить'}
          </Button>
        </Modal.Footer>
      </Modal>
      <style>{`
        .cursor-pointer {
          cursor: pointer;
        }
        .fw-bold {
          font-weight: 600;
        }
        .table th {
          font-weight: 600;
          white-space: nowrap;
        }
        .form-label {
          margin-bottom: .3rem;
        }
        .form-group {
          margin-bottom: .8rem;
        }
        .modal-body .row>.col-md-6 {
          margin-bottom: .5rem;
        }
        .table td, .table th {
          padding: .5rem;
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
        .sort-header {
          cursor: pointer;
          user-select: none;
        }
        .sort-header:hover {
          background-color: rgba(0, 0, 0, 0.03);
        }
      `}</style>
    </React.Fragment>
  );
};

export default HeatingSchedulePage;