import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Button, Dropdown, Form, InputGroup, Spinner, Alert, Pagination, Offcanvas, OverlayTrigger, Tooltip, ListGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
  getIncidents,
  getIncidentById,
  deleteIncident,
  getIncidentTypes,
  getIncidentResourceTypes,
  initializeApi,
  searchAddresses,
  getCities,
  getStreets
} from '../../services/api';
import { Incident, IncidentType, ResourceType } from '../../types/incident';
import DeleteModal from '../../Common/DeleteModal';

const MAX_API_RETRY_ATTEMPTS = 3;

interface TableColumn {
  id: string;
  title: string;
  width: number;
  visible: boolean;
  field: keyof Incident | 'actions';
}

interface IncidentState {
  incidents: Incident[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  success: string;
}

interface Address {
  id: number;
  street_id: number;
  house_number: string;
  building?: string | null;
  structure?: string | null;
  literature?: string | null;
  street?: {
    id: number;
    name: string;
    city?: {
      id: number;
      name: string;
    };
  };
}

interface City {
  id: number;
  name: string;
}

interface Street {
  id: number;
  name: string;
  city_id: number;
}

const IncidentsList: React.FC = () => {
  const [state, setState] = useState<IncidentState>({
    incidents: [],
    loading: true,
    error: null,
    searchQuery: '',
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    success: ''
  });

  const [activeFilters, setActiveFilters] = useState({
    incidentType: '',
    resourceType: '',
    isComplaint: ''
  });

  const [filterOptions, setFilterOptions] = useState({
    incidentTypes: [] as IncidentType[],
    resourceTypes: [] as ResourceType[]
  });

  const [columns, setColumns] = useState<TableColumn[]>([
    { id: 'id', title: '№', width: 70, visible: true, field: 'id' },
    { id: 'title', title: 'ЗАГОЛОВОК', width: 150, visible: true, field: 'title' },
    { id: 'description', title: 'ОПИСАНИЕ', width: 200, visible: true, field: 'description' },
    { id: 'type', title: 'ТИП ИНЦИДЕНТА', width: 130, visible: true, field: 'type' },
    { id: 'resource_type', title: 'ТИП РЕСУРСА', width: 130, visible: true, field: 'resource_type' },
    { id: 'status', title: 'СТАТУС', width: 130, visible: true, field: 'status' },
    { id: 'is_complaint', title: 'ЖАЛОБА', width: 100, visible: true, field: 'is_complaint' },
    { id: 'created_at', title: 'ДАТА СОЗДАНИЯ', width: 150, visible: true, field: 'created_at' },
    { id: 'updated_at', title: 'ДАТА ОБНОВЛЕНИЯ', width: 150, visible: true, field: 'updated_at' },
    { id: 'actions', title: 'ДЕЙСТВИЯ', width: 130, visible: true, field: 'actions' }
  ]);

  const [isTableCustomized, setIsTableCustomized] = useState<boolean>(false);
  const [sortField, setSortField] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchInput, setSearchInput] = useState('');
  const [authError, setAuthError] = useState<boolean>(false);
  const [apiRetryCount, setApiRetryCount] = useState<number>(0);
  const [apiSuccessful, setApiSuccessful] = useState<boolean>(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditOffcanvas, setShowEditOffcanvas] = useState(false);
  const [showColumnsSettings, setShowColumnsSettings] = useState(false);
  const [currentItem, setCurrentItem] = useState<Incident | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>([]);
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [streets, setStreets] = useState<Street[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddresses, setSelectedAddresses] = useState<Address[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<number | ''>('');
  const [selectedStreetId, setSelectedStreetId] = useState<number | ''>('');
  const [addressSearchQuery, setAddressSearchQuery] = useState('');
  const [addressesLoading, setAddressesLoading] = useState<boolean>(false);

  const [formData, setFormData] = useState<Partial<Incident> & { address_ids?: number[] }>({
    title: '',
    description: '',
    incident_type_id: 1,
    incident_resource_type_id: 1,
    is_complaint: false,
    address_ids: []
  });

  const [isResizing, setIsResizing] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    const savedColumns = localStorage.getItem('incidentsColumns');
    if (savedColumns) {
      try {
        const parsedColumns = JSON.parse(savedColumns);
        setColumns(parsedColumns);
        setIsTableCustomized(true);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (isTableCustomized) {
      localStorage.setItem('incidentsColumns', JSON.stringify(columns));
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
            if (i % headerCells.length === columnIndex) {
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
        prevColumns.map(col => (col.id === columnId ? { ...col, width: newWidth } : col))
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
      prevColumns.map(col => (col.id === columnId ? { ...col, visible } : col))
    );
    setIsTableCustomized(true);
  };

  const resetTableSettings = () => {
    const defaultColumns: TableColumn[] = [
      { id: 'id', title: '№', width: 70, visible: true, field: 'id' },
      { id: 'title', title: 'ЗАГОЛОВОК', width: 150, visible: true, field: 'title' },
      { id: 'description', title: 'ОПИСАНИЕ', width: 200, visible: true, field: 'description' },
      { id: 'type', title: 'ТИП ИНЦИДЕНТА', width: 130, visible: true, field: 'type' },
      { id: 'resource_type', title: 'ТИП РЕСУРСА', width: 130, visible: true, field: 'resource_type' },
      { id: 'status', title: 'СТАТУС', width: 130, visible: true, field: 'status' },
      { id: 'is_complaint', title: 'ЖАЛОБА', width: 100, visible: true, field: 'is_complaint' },
      { id: 'created_at', title: 'ДАТА СОЗДАНИЯ', width: 150, visible: true, field: 'created_at' },
      { id: 'updated_at', title: 'ДАТА ОБНОВЛЕНИЯ', width: 150, visible: true, field: 'updated_at' },
      { id: 'actions', title: 'ДЕЙСТВИЯ', width: 130, visible: true, field: 'actions' }
    ];
    setColumns(defaultColumns);
    localStorage.removeItem('incidentsColumns');
    setIsTableCustomized(false);
    setShowColumnsSettings(false);
  };

  const loadReferences = async () => {
    try {
      setFormLoading(true);
      const typesPromise = getIncidentTypes().catch(() => []);
      const resourceTypesPromise = getIncidentResourceTypes().catch(() => []);
      const citiesPromise = getCities().catch(() => []);
      const [typesData, resourceTypesData, citiesData] = await Promise.all([
        typesPromise,
        resourceTypesPromise,
        citiesPromise
      ]);
      setIncidentTypes(typesData);
      setResourceTypes(resourceTypesData);
      setCities(citiesData);
      setFilterOptions({
        incidentTypes: typesData,
        resourceTypes: resourceTypesData
      });
      if (citiesData.length > 0) {
        setSelectedCityId(citiesData[0].id);
        await loadStreets(citiesData[0].id);
      }
      setFormLoading(false);
      return {
        success: typesData.length > 0 && resourceTypesData.length > 0 && citiesData.length > 0,
        typesData,
        resourceTypesData,
        citiesData
      };
    } catch (err) {
      setFormLoading(false);
      return {
        success: false,
        error: err,
        typesData: [],
        resourceTypesData: [],
        citiesData: []
      };
    }
  };

  const loadStreets = async (cityId: number) => {
    try {
      if (!cityId) return [];
      setStreets([]);
      const streetsData = await getStreets(cityId);
      setStreets(streetsData);
      if (streetsData.length > 0) {
        setSelectedStreetId(streetsData[0].id);
        await searchAddressesByStreet(streetsData[0].id);
      } else {
        setAddresses([]);
        setSelectedStreetId('');
      }
      return streetsData;
    } catch {
      setStreets([]);
      setAddresses([]);
      return [];
    }
  };

  const searchAddressesByQuery = async () => {
    try {
      setAddressesLoading(true);
      if (selectedCityId === '' || typeof selectedCityId !== 'number' || !addressSearchQuery.trim()) {
        setAddressesLoading(false);
        return [];
      }
      const addressesData = await searchAddresses(selectedCityId, addressSearchQuery);
      setAddressesLoading(false);
      if (Array.isArray(addressesData)) {
        setAddresses(addressesData);
        return addressesData;
      } else {
        setAddresses([]);
        return [];
      }
    } catch {
      setAddressesLoading(false);
      setAddresses([]);
      return [];
    }
  };

  const searchAddressesByStreet = async (streetId: number) => {
    try {
      setAddressesLoading(true);
      if (!streetId || selectedCityId === '' || typeof selectedCityId !== 'number') {
        setAddresses([]);
        setAddressesLoading(false);
        return [];
      }
      const addressesData = await searchAddresses(selectedCityId, '');
      if (!Array.isArray(addressesData)) {
        setAddresses([]);
        setAddressesLoading(false);
        return [];
      }
      const filteredAddresses = addressesData.filter(addr => addr.street_id === streetId);
      setAddresses(filteredAddresses);
      setAddressesLoading(false);
      return filteredAddresses;
    } catch {
      setAddressesLoading(false);
      setAddresses([]);
      return [];
    }
  };

  const handleAddressSelect = (address: Address) => {
    const isSelected = selectedAddresses.some(a => a.id === address.id);
    if (isSelected) {
      setSelectedAddresses(prev => prev.filter(a => a.id !== address.id));
      setFormData(prev => ({
        ...prev,
        address_ids: (prev.address_ids || []).filter((id: number) => id !== address.id)
      }));
    } else {
      setSelectedAddresses(prev => [...prev, address]);
      setFormData(prev => ({
        ...prev,
        address_ids: [...(prev.address_ids || []), address.id]
      }));
    }
  };

  const sortData = (data: Incident[]): Incident[] => {
    return [...data].sort((a, b) => {
      const aValue = a[sortField as keyof Incident];
      const bValue = b[sortField as keyof Incident];
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

  const handleSort = (field: string) => {
    if (isResizing) return;
    if (field === sortField) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const loadIncidents = async (page = 1) => {
    setState(prev => ({ ...prev, loading: true, error: null, success: '' }));
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
      const [data] = await Promise.all([
        getIncidents(page),
        loadReferences().catch(() => ({ success: false }))
      ]);
      setApiSuccessful(true);
      setState(prev => ({
        ...prev,
        incidents: data.items,
        currentPage: data.currentPage,
        totalPages: data.totalPages,
        totalItems: data.totalItems,
        loading: false,
        error: null,
        success: 'success'
      }));
    } catch (error) {
      const errorMsg = String(error);
      if (
        errorMsg.includes('авторизац') ||
        errorMsg.includes('Unauthorized') ||
        errorMsg.includes('Unauthenticated')
      ) {
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
      await loadIncidents();
    } catch {
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
        incidentType: '',
        resourceType: '',
        isComplaint: ''
      });
      await loadIncidents();
    } catch {
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
      const allData = await getIncidents(1);
      let filteredData = allData.items;
      if (activeFilters.incidentType) {
        const typeId = parseInt(activeFilters.incidentType, 10);
        filteredData = filteredData.filter(item => item.incident_type_id === typeId);
      }
      if (activeFilters.resourceType) {
        const resourceTypeId = parseInt(activeFilters.resourceType, 10);
        filteredData = filteredData.filter(item => item.incident_resource_type_id === resourceTypeId);
      }
      if (activeFilters.isComplaint) {
        const isComplaint = activeFilters.isComplaint === 'true';
        filteredData = filteredData.filter(item => item.is_complaint === isComplaint);
      }
      setState(prev => ({
        ...prev,
        incidents: filteredData,
        loading: false,
        error: null,
        success: 'success',
        currentPage: 1,
        totalPages: 1,
        totalItems: filteredData.length
      }));
      setApiSuccessful(true);
    } catch {
      setApiRetryCount(prev => prev + 1);
      setState(prev => ({
        ...prev,
        error: `Ошибка при фильтрации данных. Попытка ${apiRetryCount + 1}/${MAX_API_RETRY_ATTEMPTS}`,
        loading: false,
        success: ''
      }));
    }
  };

  const handleFilterChange = (filterType: 'incidentType' | 'resourceType' | 'isComplaint', value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const resetFilters = () => {
    setActiveFilters({
      incidentType: '',
      resourceType: '',
      isComplaint: ''
    });
    loadIncidents();
  };

  const handleSearch = async () => {
    if (!searchInput.trim()) {
      return loadIncidents();
    }
    setState(prev => ({ ...prev, loading: true, error: null, searchQuery: searchInput, success: '' }));
    try {
      const data = await getIncidents(1);
      setApiSuccessful(true);
      const filteredData = data.items.filter(
        incident =>
          incident.title.toLowerCase().includes(searchInput.toLowerCase()) ||
          incident.description.toLowerCase().includes(searchInput.toLowerCase())
      );
      setState(prev => ({
        ...prev,
        incidents: filteredData,
        loading: false,
        error: null,
        success: 'success'
      }));
    } catch {
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
      const details = await getIncidentById(id);
      setCurrentItem(details);
      setFormLoading(false);
      setShowDetailsModal(true);
    } catch {
      setFormLoading(false);
    }
  };

  const handleEditRecord = async (id: number) => {
    try {
      setFormError(null);
      setFormLoading(true);
      if (incidentTypes.length === 0 || resourceTypes.length === 0) {
        await loadReferences();
      }
      const details = await getIncidentById(id);
      setCurrentItem(details);
      if (details.addresses && details.addresses.length > 0) {
        setSelectedAddresses(details.addresses);
      } else {
        setSelectedAddresses([]);
      }
      setFormData({
        title: details.title,
        description: details.description,
        incident_type_id: details.incident_type_id,
        incident_resource_type_id: details.incident_resource_type_id,
        address_ids: details.addresses ? details.addresses.map(a => a.id) : [],
        is_complaint: details.is_complaint
      });
      setFormLoading(false);
      setShowEditOffcanvas(true);
    } catch {
      setFormLoading(false);
      setFormError('Не удалось загрузить данные для редактирования');
    }
  };

  const handleAddNew = async () => {
    setFormError(null);
    setCurrentItem(null);
    setFormLoading(true);
    setSelectedAddresses([]);
    let referencesLoaded = true;
    if (incidentTypes.length === 0 || resourceTypes.length === 0) {
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
      title: '',
      description: '',
      incident_type_id: incidentTypes.length > 0 ? incidentTypes[0].id : 1,
      incident_resource_type_id: resourceTypes.length > 0 ? resourceTypes[0].id : 1,
      address_ids: [],
      is_complaint: false
    });
    setFormLoading(false);
    setShowEditOffcanvas(true);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: checkbox.checked
      }));
    } else {
      const numericFields = ['incident_type_id', 'incident_resource_type_id'];
      setFormData(prev => ({
        ...prev,
        [name]: numericFields.includes(name) ? parseInt(value, 10) || 0 : value
      }));
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFormError(null);
      setFormLoading(true);
      if (!formData.title || !formData.title.trim()) {
        setFormError('Заголовок обязателен');
        setFormLoading(false);
        return;
      }
      if (!formData.description || !formData.description.trim()) {
        setFormError('Описание обязательно');
        setFormLoading(false);
        return;
      }
      const requiredNumericFields = [
        { name: 'incident_type_id', label: 'тип инцидента' },
        { name: 'incident_resource_type_id', label: 'тип ресурса' }
      ];
      for (const field of requiredNumericFields) {
        const value = formData[field.name as keyof typeof formData];
        if (!value || value === 0) {
          setFormError(`Не указан ${field.label}`);
          setFormLoading(false);
          return;
        }
      }
      if (!formData.address_ids || formData.address_ids.length === 0) {
        setFormError('Необходимо выбрать хотя бы один адрес');
        setFormLoading(false);
        return;
      }
      setFormLoading(false);
      setShowEditOffcanvas(false);
      await loadIncidents(state.currentPage);
      setState(prev => ({
        ...prev,
        success: currentItem ? 'Инцидент успешно обновлен' : 'Инцидент успешно создан'
      }));
    } catch (error) {
      setFormLoading(false);
      let errorMessage = 'Ошибка сохранения данных: ';
      if (error instanceof Error) {
        errorMessage += error.message;
        if ((error as any).response && (error as any).response.data) {
          try {
            const errorData =
              typeof (error as any).response.data === 'string'
                ? JSON.parse((error as any).response.data)
                : (error as any).response.data;
            if (errorData.errors) {
              const fieldErrors = Object.values(errorData.errors).flat().join(', ');
              errorMessage += `: ${fieldErrors}`;
            } else if (errorData.message) {
              errorMessage += `: ${errorData.message}`;
            }
          } catch {}
        }
      } else {
        errorMessage += String(error);
      }
      setFormError(errorMessage);
    }
  };

  const handleDeletePrompt = (item: Incident) => {
    setCurrentItem(item);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!currentItem) return;
    try {
      setFormLoading(true);
      await deleteIncident(currentItem.id);
      setFormLoading(false);
      setShowDeleteModal(false);
      await loadIncidents(state.currentPage);
      setState(prev => ({
        ...prev,
        success: 'Инцидент успешно удален'
      }));
    } catch (error) {
      setFormLoading(false);
      setFormError('Ошибка удаления записи: ' + String(error));
    }
  };

  const handlePageChange = (page: number) => {
    loadIncidents(page);
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null, success: '' }));
        await initializeApi();
        await loadReferences();
        const data = await getIncidents();
        const enrichedIncidents = data.items.map(incident => {
          if (!incident.type && incident.incident_type_id) {
            const foundType = incidentTypes.find(t => t.id === incident.incident_type_id);
            if (foundType) {
              incident.type = foundType;
            }
          }
          if (!incident.resource_type && incident.incident_resource_type_id) {
            const foundResourceType = resourceTypes.find(t => t.id === incident.incident_resource_type_id);
            if (foundResourceType) {
              incident.resource_type = foundResourceType;
            }
          }
          return incident;
        });
        setState(prev => ({
          ...prev,
          incidents: enrichedIncidents,
          currentPage: data.currentPage,
          totalPages: data.totalPages,
          totalItems: data.totalItems,
          loading: false,
          error: null,
          success: 'success'
        }));
      } catch (error) {
        if (
          String(error).includes('авторизац') ||
          String(error).includes('Unauthorized') ||
          String(error).includes('Unauthenticated')
        ) {
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

  useEffect(() => {
    if (selectedCityId !== '') {
      const cityIdNumber = typeof selectedCityId === 'string' ? parseInt(selectedCityId, 10) : selectedCityId;
      loadStreets(cityIdNumber);
    }
  }, [selectedCityId]);

  useEffect(() => {
    if (selectedStreetId !== '') {
      const streetIdNumber =
        typeof selectedStreetId === 'string' ? parseInt(selectedStreetId, 10) : selectedStreetId;
      searchAddressesByStreet(streetIdNumber);
    }
  }, [selectedStreetId]);

  const renderPagination = () => {
    if (state.totalPages <= 1) return null;
    const items = [];
    for (let i = 1; i <= state.totalPages; i++) {
      items.push(
        <Pagination.Item key={i} active={i === state.currentPage} onClick={() => handlePageChange(i)}>
          {i}
        </Pagination.Item>
      );
    }
    return (
      <Pagination className="mt-3 justify-content-center">
        <Pagination.First onClick={() => handlePageChange(1)} disabled={state.currentPage === 1} />
        <Pagination.Prev
          onClick={() => handlePageChange(state.currentPage - 1)}
          disabled={state.currentPage === 1}
        />
        {items}
        <Pagination.Next
          onClick={() => handlePageChange(state.currentPage + 1)}
          disabled={state.currentPage === state.totalPages}
        />
        <Pagination.Last
          onClick={() => handlePageChange(state.totalPages)}
          disabled={state.currentPage === state.totalPages}
        />
      </Pagination>
    );
  };

  const getSortedData = () => {
    return sortData(state.incidents);
  };

  const renderSortIcon = (field: string) => {
    if (field !== sortField) {
      return <i className="ti ti-sort ms-1"></i>;
    }
    return sortDirection === 'asc' ? (
      <i className="ti ti-sort-ascending ms-1"></i>
    ) : (
      <i className="ti ti-sort-descending ms-1"></i>
    );
  };

  const renderTableHeaders = () => {
    return columns.filter(column => column.visible).map((column, index, filteredColumns) => {
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
          {!isLast && <div className="resize-handle" onMouseDown={e => handleResizeStart(e, column.id)} />}
        </th>
      );
    });
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU');
  };

  const renderTableRow = (incident: Incident) => {
    return columns.filter(column => column.visible).map(column => {
      const style = {
        width: `${column.width}px`,
        minWidth: `${column.width}px`
      };
      if (column.id === 'actions') {
        return (
          <td key={`${incident.id}-${column.id}`} className="text-center" style={style}>
            <OverlayTrigger placement="top" overlay={<Tooltip id="tooltip-view">Просмотр</Tooltip>}>
              <i
                className="ph-duotone ph-info text-info f-18 cursor-pointer me-2"
                onClick={() => handleViewDetails(incident.id)}
              ></i>
            </OverlayTrigger>
            <OverlayTrigger placement="top" overlay={<Tooltip id="tooltip-edit">Редактировать</Tooltip>}>
              <i
                className="ph-duotone ph-pencil-simple text-primary f-18 cursor-pointer me-2"
                onClick={() => handleEditRecord(incident.id)}
              ></i>
            </OverlayTrigger>
            <OverlayTrigger placement="top" overlay={<Tooltip id="tooltip-delete">Удалить</Tooltip>}>
              <i
                className="ph-duotone ph-trash text-danger f-18 cursor-pointer"
                onClick={() => handleDeletePrompt(incident)}
              ></i>
            </OverlayTrigger>
          </td>
        );
      }
      const fieldKey = column.field as keyof Incident;
      let cellContent: React.ReactNode = '';
      if (fieldKey === 'type') {
        if (incident.type && typeof incident.type === 'object' && 'name' in incident.type) {
          cellContent = incident.type.name;
        } else if (typeof incident.type === 'string') {
          cellContent = incident.type;
        } else if (incident.incident_type_id) {
          const foundType = incidentTypes.find(t => t.id === incident.incident_type_id);
          cellContent = foundType ? foundType.name : `Тип ${incident.incident_type_id}`;
        } else {
          cellContent = 'Не указан';
        }
      } else if (fieldKey === 'resource_type') {
        if (
          incident.resource_type &&
          typeof incident.resource_type === 'object' &&
          'name' in incident.resource_type
        ) {
          cellContent = incident.resource_type.name;
        } else if (typeof incident.resource_type === 'string') {
          cellContent = incident.resource_type;
        } else if (incident.incident_resource_type_id) {
          const foundType = resourceTypes.find(t => t.id === incident.incident_resource_type_id);
          cellContent = foundType ? foundType.name : `Ресурс ${incident.incident_resource_type_id}`;
        } else {
          cellContent = 'Не указан';
        }
      } else if (fieldKey === 'status') {
        if (incident.status && typeof incident.status === 'object' && 'name' in incident.status) {
          cellContent = incident.status.name;
        } else if (typeof incident.status === 'string') {
          cellContent = incident.status;
        } else if (incident.incident_status_id) {
          cellContent = `Статус ${incident.incident_status_id}`;
        } else {
          cellContent = 'Не указан';
        }
      } else if (fieldKey === 'is_complaint') {
        cellContent = incident.is_complaint ? 'Да' : 'Нет';
      } else if (fieldKey === 'created_at' || fieldKey === 'updated_at') {
        cellContent = formatDate(incident[fieldKey] as string);
      } else {
        cellContent = incident[fieldKey] !== undefined ? String(incident[fieldKey]) : '';
      }
      return (
        <td key={`${incident.id}-${column.id}`} style={style}>
          {cellContent}
        </td>
      );
    });
  };

  return (
    <>
      <div className="page-header">
        <div className="page-block">
          <div className="row align-items-center">
            <div className="col-md-6">
              <div className="page-header-title">
                <h5 className="m-b-10">Аварии</h5>
              </div>
              <ul className="breadcrumb">
                <li className="breadcrumb-item">
                  <Link to="/dashboard">Главная</Link>
                </li>
                <li className="breadcrumb-item">Аварии и отключения</li>
                <li className="breadcrumb-item">Список аварий</li>
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
                      Попробовать еще раз
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
              <Row className="justify-content-between mb-3 g-3">
                <Col sm="auto">
                  <div className="form-search">
                    <i className="ph-duotone ph-magnifying-glass icon-search"></i>
                    <InputGroup>
                      <Form.Control
                        type="search"
                        placeholder="Поиск..."
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleSearch()}
                      />
                      <Button variant="light-secondary" onClick={handleSearch} disabled={state.loading || authError}>
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
                        Фильтр
                        {(activeFilters.incidentType || activeFilters.resourceType || activeFilters.isComplaint) && (
                          <span className="filter-indicator"></span>
                        )}
                      </Dropdown.Toggle>
                      <Dropdown.Menu className="mini-filter-menu">
                        <div className="filter-content p-2">
                          <Form.Group className="mb-3">
                            <Form.Label className="mini-filter-label">Тип инцидента</Form.Label>
                            <Form.Select
                              size="sm"
                              value={activeFilters.incidentType}
                              onChange={e => handleFilterChange('incidentType', e.target.value)}
                              disabled={state.loading || authError}
                            >
                              <option value="">Все типы</option>
                              {filterOptions.incidentTypes.map(type => (
                                <option key={type.id} value={type.id}>
                                  {type.name}
                                </option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                          <Form.Group className="mb-3">
                            <Form.Label className="mini-filter-label">Тип ресурса</Form.Label>
                            <Form.Select
                              size="sm"
                              value={activeFilters.resourceType}
                              onChange={e => handleFilterChange('resourceType', e.target.value)}
                              disabled={state.loading || authError}
                            >
                              <option value="">Все ресурсы</option>
                              {filterOptions.resourceTypes.map(type => (
                                <option key={type.id} value={type.id}>
                                  {type.name}
                                </option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                          <Form.Group className="mb-3">
                            <Form.Label className="mini-filter-label">Жалоба</Form.Label>
                            <Form.Select
                              size="sm"
                              value={activeFilters.isComplaint}
                              onChange={e => handleFilterChange('isComplaint', e.target.value)}
                              disabled={state.loading || authError}
                            >
                              <option value="">Все</option>
                              <option value="true">Да</option>
                              <option value="false">Нет</option>
                            </Form.Select>
                          </Form.Group>
                          <div className="d-flex justify-content-between">
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={resetFilters}
                              disabled={
                                state.loading ||
                                authError ||
                                (!activeFilters.incidentType &&
                                  !activeFilters.resourceType &&
                                  !activeFilters.isComplaint)
                              }
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
                      title="Добавить новый инцидент"
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
                    {state.incidents.length === 0 ? (
                      <div className="text-center py-5">
                        <p className="mb-0">Нет данных для отображения</p>
                      </div>
                    ) : (
                      <>
                        <table className="table table-hover resizable-table" ref={tableRef}>
                          <thead>
                            <tr>{renderTableHeaders()}</tr>
                          </thead>
                          <tbody>
                            {getSortedData().map((incident: Incident) => (
                              <tr key={incident.id}>{renderTableRow(incident)}</tr>
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
      <Offcanvas show={showColumnsSettings} onHide={() => setShowColumnsSettings(false)} placement="end">
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
                  onChange={e => handleColumnVisibilityChange(column.id, e.target.checked)}
                  disabled={column.id === 'actions'}
                />
              </Form.Group>
            ))}
          </Form>
          <div className="mt-4">
            <p className="text-muted mb-2">Для изменения ширины столбцов перетащите правую границу заголовка таблицы.</p>
            <Button variant="outline-secondary" onClick={resetTableSettings} className="w-100">
              Сбросить настройки таблицы
            </Button>
          </div>
        </Offcanvas.Body>
      </Offcanvas>
      <Offcanvas
        show={showDetailsModal}
        onHide={() => setShowDetailsModal(false)}
        placement="end"
        style={{ width: '400px' }}
      >
        <Offcanvas.Header closeButton className="sticky-top bg-white">
          <Offcanvas.Title className="f-w-600 text-truncate">Детали инцидента</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="pt-0" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 56px)' }}>
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
                  <div className="avtar avtar-xs bg-light-secondary">
                    <i className="ti ti-heading f-20"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-1">
                    <b>Заголовок</b>
                  </h5>
                  <p className="text-muted">{currentItem?.title}</p>
                </div>
              </div>
              <div className="d-flex">
                <div className="flex-shrink-0">
                  <div className="avtar avtar-xs bg-light-warning">
                    <i className="ti ti-file-description f-20"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-1">
                    <b>Описание</b>
                  </h5>
                  <p className="text-muted">{currentItem?.description}</p>
                </div>
              </div>
              <div className="d-flex">
                <div className="flex-shrink-0">
                  <div className="avtar avtar-xs bg-light-danger">
                    <i className="ti ti-category f-20"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-1">
                    <b>Тип инцидента</b>
                  </h5>
                  <p className="text-muted">
                    {currentItem?.type?.name ||
                      (currentItem?.incident_type_id
                        ? incidentTypes.find(t => t.id === currentItem.incident_type_id)?.name
                        : 'Не указан')}
                  </p>
                </div>
              </div>
              <div className="d-flex">
                <div className="flex-shrink-0">
                  <div className="avtar avtar-xs bg-light-primary">
                    <i className="ti ti-box f-20"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-1">
                    <b>Тип ресурса</b>
                  </h5>
                  <p className="text-muted">
                    {currentItem?.resource_type?.name ||
                      (currentItem?.incident_resource_type_id
                        ? resourceTypes.find(t => t.id === currentItem.incident_resource_type_id)?.name
                        : 'Не указан')}
                  </p>
                </div>
              </div>
              <div className="d-flex">
                <div className="flex-shrink-0">
                  <div className="avtar avtar-xs bg-light-success">
                    <i className="ti ti-status-change f-20"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-1">
                    <b>Статус</b>
                  </h5>
                  <p className="text-muted">
                    {currentItem?.status?.name ||
                      (currentItem?.incident_status_id ? `Статус ${currentItem.incident_status_id}` : 'Не указан')}
                  </p>
                </div>
              </div>
              <div className="d-flex">
                <div className="flex-shrink-0">
                  <div className="avtar avtar-xs bg-light-info">
                    <i className="ti ti-alert-triangle f-20"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-1">
                    <b>Жалоба</b>
                  </h5>
                  <p className="text-muted">{currentItem?.is_complaint ? 'Да' : 'Нет'}</p>
                </div>
              </div>
              <div className="d-flex">
                <div className="flex-shrink-0">
                  <div className="avtar avtar-xs bg-light-secondary">
                    <i className="ti ti-map-pin f-20"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-1">
                    <b>Адреса</b>
                  </h5>
                  {currentItem?.addresses && currentItem.addresses.length > 0 ? (
                    <ul className="ps-3 mb-0">
                      {currentItem.addresses.map(addr => (
                        <li key={addr.id} className="text-muted">
                          {addr.street?.city?.name}, {addr.street?.name}, д. {addr.house_number}
                          {addr.building && ` корп. ${addr.building}`}
                          {addr.structure && ` стр. ${addr.structure}`}
                          {addr.literature && ` лит. ${addr.literature}`}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted">Адреса не указаны</p>
                  )}
                </div>
              </div>
              <div className="d-flex">
                <div className="flex-shrink-0">
                  <div className="avtar avtar-xs bg-light-info">
                    <i className="ti ti-calendar f-20"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-1">
                    <b>Дата создания</b>
                  </h5>
                  <p className="text-muted">{currentItem ? formatDate(currentItem.created_at) : ''}</p>
                </div>
              </div>
              <div className="d-flex">
                <div className="flex-shrink-0">
                  <div className="avtar avtar-xs bg-light-secondary">
                    <i className="ti ti-calendar-stats f-20"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-1">
                    <b>Дата обновления</b>
                  </h5>
                  <p className="text-muted">{currentItem ? formatDate(currentItem.updated_at) : ''}</p>
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
          setSelectedAddresses([]);
        }}
        placement="end"
        style={{ width: '450px' }}
      >
        <Offcanvas.Header closeButton className="sticky-top bg-white">
          <Offcanvas.Title className="f-w-600 text-truncate">
            {currentItem ? 'Редактирование инцидента' : 'Добавление инцидента'}
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Form id="incident-form" onSubmit={handleSaveForm}>
          <Offcanvas.Body className="pt-0" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 124px)' }}>
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
                    <Form.Label>Заголовок*</Form.Label>
                    <Form.Control
                      type="text"
                      name="title"
                      id="incident-title"
                      value={formData.title || ''}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                </Col>
                <Col xs={12}>
                  <div className="mb-3">
                    <Form.Label>Описание*</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="description"
                      id="incident-description"
                      value={formData.description || ''}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                </Col>
                <Col xs={12}>
                  <div className="mb-3">
                    <Form.Label>Тип инцидента*</Form.Label>
                    <Form.Select
                      name="incident_type_id"
                      id="incident-type"
                      value={formData.incident_type_id || ''}
                      onChange={handleFormChange}
                      required
                    >
                      {incidentTypes.map(type => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </Form.Select>
                  </div>
                </Col>
                <Col xs={12}>
                  <div className="mb-3">
                    <Form.Label>Тип ресурса*</Form.Label>
                    <Form.Select
                      name="incident_resource_type_id"
                      id="incident-resource-type"
                      value={formData.incident_resource_type_id || ''}
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
                    <Form.Check
                      type="checkbox"
                      id="is-complaint"
                      label="Жалоба"
                      name="is_complaint"
                      checked={formData.is_complaint || false}
                      onChange={handleFormChange}
                    />
                  </div>
                </Col>
                <Col xs={12}>
                  <div className="mb-3">
                    <Form.Label>Адреса*</Form.Label>
                    <Card className="mb-3">
                      <Card.Body>
                        <Row className="mb-3">
                          <Col sm={5}>
                            <Form.Label>Город</Form.Label>
                            <Form.Select
                              value={selectedCityId}
                              onChange={e =>
                                setSelectedCityId(e.target.value ? Number(e.target.value) : '')
                              }
                            >
                              <option value="">Выберите город</option>
                              {Array.isArray(cities) &&
                                cities.map(city => (
                                  <option key={city.id} value={city.id}>
                                    {city.name}
                                  </option>
                                ))}
                            </Form.Select>
                          </Col>
                          <Col sm={7}>
                            <Form.Label>Улица</Form.Label>
                            <Form.Select
                              value={selectedStreetId}
                              onChange={e =>
                                setSelectedStreetId(e.target.value ? Number(e.target.value) : '')
                              }
                              disabled={!selectedCityId || streets.length === 0}
                            >
                              <option value="">Выберите улицу</option>
                              {Array.isArray(streets) &&
                                streets.map(street => (
                                  <option key={street.id} value={street.id}>
                                    {street.name}
                                  </option>
                                ))}
                            </Form.Select>
                          </Col>
                        </Row>
                        <Row className="mb-3">
                          <Col>
                            <Form.Label>Поиск адреса</Form.Label>
                            <InputGroup>
                              <Form.Control
                                type="text"
                                placeholder="Введите номер дома"
                                value={addressSearchQuery}
                                onChange={e => setAddressSearchQuery(e.target.value)}
                                disabled={!selectedCityId}
                              />
                              <Button
                                variant="outline-secondary"
                                onClick={searchAddressesByQuery}
                                disabled={
                                  !selectedCityId || !addressSearchQuery.trim() || addressesLoading
                                }
                              >
                                {addressesLoading ? (
                                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                ) : (
                                  'Найти'
                                )}
                              </Button>
                            </InputGroup>
                          </Col>
                        </Row>
                        <div className="address-list">
                          <Form.Label>Доступные адреса</Form.Label>
                          {addressesLoading ? (
                            <div className="text-center p-3">
                              <Spinner animation="border" size="sm" />
                              <p className="mt-2 mb-0">Загрузка адресов...</p>
                            </div>
                          ) : addresses.length === 0 ? (
                            <p className="text-muted">Нет доступных адресов</p>
                          ) : (
                            <div
                              style={{
                                maxHeight: '200px',
                                overflowY: 'auto',
                                border: '1px solid #ddd',
                                borderRadius: '4px'
                              }}
                            >
                              <ListGroup variant="flush">
                                {addresses.map(address => {
                                  const isSelected = selectedAddresses.some(a => a.id === address.id);
                                  return (
                                    <ListGroup.Item
                                      key={address.id}
                                      action
                                      variant={isSelected ? 'primary' : undefined}
                                      onClick={() => handleAddressSelect(address)}
                                      className="d-flex justify-content-between align-items-center"
                                    >
                                      <span>
                                        {address.street?.city?.name}, {address.street?.name}, д. {address.house_number}
                                        {address.building && ` корп. ${address.building}`}
                                        {address.structure && ` стр. ${address.structure}`}
                                        {address.literature && ` лит. ${address.literature}`}
                                      </span>
                                      {isSelected && <i className="ph-duotone ph-check text-success"></i>}
                                    </ListGroup.Item>
                                  );
                                })}
                              </ListGroup>
                            </div>
                          )}
                        </div>
                        <div className="mt-3">
                          <Form.Label>Выбранные адреса</Form.Label>
                          {selectedAddresses.length === 0 ? (
                            <p className="text-muted">Адреса не выбраны</p>
                          ) : (
                            <ListGroup>
                              {selectedAddresses.map(address => (
                                <ListGroup.Item
                                  key={address.id}
                                  className="d-flex justify-content-between align-items-center"
                                >
                                  <span>
                                    {address.street?.city?.name}, {address.street?.name}, д. {address.house_number}
                                    {address.building && ` корп. ${address.building}`}
                                    {address.structure && ` стр. ${address.structure}`}
                                    {address.literature && ` лит. ${address.literature}`}
                                  </span>
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => handleAddressSelect(address)}
                                  >
                                    <i className="ph-duotone ph-x"></i>
                                  </Button>
                                </ListGroup.Item>
                              ))}
                            </ListGroup>
                          )}
                        </div>
                      </Card.Body>
                    </Card>
                  </div>
                </Col>
                <Col xs={12}>
                  <div className="small text-muted mb-3">* - обязательные поля</div>
                </Col>
              </Row>
            )}
          </Offcanvas.Body>
          <div className="p-3 border-top sticky-bottom bg-white">
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
                    setSelectedAddresses([]);
                  }}
                  disabled={formLoading}
                >
                  <i className="align-text-bottom me-1 ti ti-circle-x"></i> Отмена
                </Button>
              </div>
              <div className="col-auto">
                <Button type="submit" variant="secondary" disabled={formLoading}>
                  {formLoading ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
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
          </div>
        </Form>
      </Offcanvas>
      <DeleteModal
        show={showDeleteModal}
        handleClose={() => setShowDeleteModal(false)}
        handleDeleteId={handleDeleteConfirm}
        modalTitle="Подтверждение удаления"
        modalText={`Вы действительно хотите удалить инцидент "${currentItem?.title}"?`}
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
        .sticky-top {
          z-index: 1030;
        }
        .sticky-bottom {
          position: sticky;
          bottom: 0;
          z-index: 1020;
        }
      `}</style>
    </>
  );
};

export default IncidentsList;