import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Button, Dropdown, Form, InputGroup, Spinner, Alert, Pagination, Offcanvas, OverlayTrigger, Tooltip, ListGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
    getIncidents,
    getIncidentTypes,
    getIncidentResourceTypes,
    createIncident,
    updateIncident,
    deleteIncident,
    getIncidentById,
    getStreets,
    getCities,
    searchAddresses,
    formatAddressesForSubmission,
    initializeApi
} from '../../services/api';
import { Incident, IncidentType, ResourceType, Address } from '../../types/incident';
import DeleteModal from "../../Common/DeleteModal";

const MAX_API_RETRY_ATTEMPTS = 3;

interface TableColumn {
    id: string;
    title: string;
    width: number;
    visible: boolean;
    field: keyof Incident | 'actions' | 'addresses';
}

interface OutagesState {
    incidents: Incident[];
    loading: boolean;
    error: string | null;
    searchQuery: string;
    currentPage: number;
    totalPages: number;
    totalItems: number;
    success: string;
}

const OutagesList: React.FC = () => {
    const [state, setState] = useState<OutagesState>({
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
        type: '',
        resourceType: '',
        status: '',
        isComplaint: ''
    });

    const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>([]);
    const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([]);
    const [cities, setCities] = useState<any[]>([]);
    const [streets, setStreets] = useState<any[]>([]);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [selectedAddresses, setSelectedAddresses] = useState<Address[]>([]);
    const [selectedCity, setSelectedCity] = useState<number | undefined>(2); // Default to Воронеж (ID: 2)
    const [selectedStreet, setSelectedStreet] = useState<number | undefined>(undefined);
    const [addressSearchQuery, setAddressSearchQuery] = useState('');
    const [addressesLoading, setAddressesLoading] = useState(false);

    const [columns, setColumns] = useState<TableColumn[]>([
        { id: 'id', title: 'ID', width: 70, visible: true, field: 'id' },
        { id: 'title', title: 'НАЗВАНИЕ', width: 200, visible: true, field: 'title' },
        { id: 'description', title: 'ОПИСАНИЕ', width: 250, visible: true, field: 'description' },
        { id: 'addresses', title: 'АДРЕСА', width: 200, visible: true, field: 'addresses' },
        { id: 'type', title: 'ТИП', width: 130, visible: true, field: 'type' },
        { id: 'resource_type', title: 'ТИП РЕСУРСА', width: 150, visible: true, field: 'resource_type' },
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
    const [isResizing, setIsResizing] = useState(false);
    const tableRef = useRef<HTMLTableElement>(null);

    const [formData, setFormData] = useState<Partial<Incident>>({
        title: '',
        description: '',
        incident_type_id: undefined,
        incident_resource_type_id: undefined,
        addresses: [],
        is_complaint: false
    });

    useEffect(() => {
        const savedColumns = localStorage.getItem('outagesColumns');
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
            localStorage.setItem('outagesColumns', JSON.stringify(columns));
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
            { id: 'id', title: 'ID', width: 70, visible: true, field: 'id' },
            { id: 'title', title: 'НАЗВАНИЕ', width: 200, visible: true, field: 'title' },
            { id: 'description', title: 'ОПИСАНИЕ', width: 250, visible: true, field: 'description' },
            { id: 'addresses', title: 'АДРЕСА', width: 200, visible: true, field: 'addresses' },
            { id: 'type', title: 'ТИП', width: 130, visible: true, field: 'type' },
            { id: 'resource_type', title: 'ТИП РЕСУРСА', width: 150, visible: true, field: 'resource_type' },
            { id: 'status', title: 'СТАТУС', width: 130, visible: true, field: 'status' },
            { id: 'is_complaint', title: 'ЖАЛОБА', width: 100, visible: true, field: 'is_complaint' },
            { id: 'created_at', title: 'ДАТА СОЗДАНИЯ', width: 150, visible: true, field: 'created_at' },
            { id: 'updated_at', title: 'ДАТА ОБНОВЛЕНИЯ', width: 150, visible: true, field: 'updated_at' },
            { id: 'actions', title: 'ДЕЙСТВИЯ', width: 130, visible: true, field: 'actions' }
        ];
        setColumns(defaultColumns);
        localStorage.removeItem('outagesColumns');
        setIsTableCustomized(false);
        setShowColumnsSettings(false);
    };

    const loadReferences = async () => {
        try {
            setFormLoading(true);

            console.log("Начало загрузки справочников");

            const typesPromise = getIncidentTypes().catch(error => {
                console.error("Ошибка загрузки типов инцидентов:", error);
                return [];
            });

            const resourceTypesPromise = getIncidentResourceTypes().catch(error => {
                console.error("Ошибка загрузки типов ресурсов:", error);
                return [];
            });

            const citiesPromise = getCities().catch(error => {
                console.error("Ошибка загрузки городов:", error);
                return [];
            });

            const [typesData, resourceTypesData, citiesData] = await Promise.all([
                typesPromise,
                resourceTypesPromise,
                citiesPromise
            ]);

            console.log("Загруженные типы инцидентов:", typesData);
            console.log("Загруженные типы ресурсов:", resourceTypesData);
            console.log("Загруженные города:", citiesData);

            // Проверяем, что данные - массивы
            const validTypesData = Array.isArray(typesData) ? typesData : [];
            const validResourceTypesData = Array.isArray(resourceTypesData) ? resourceTypesData : [];
            const validCitiesData = Array.isArray(citiesData) ? citiesData : [];

            setIncidentTypes(validTypesData);
            setResourceTypes(validResourceTypesData);
            setCities(validCitiesData);

            // Загрузка улиц для выбранного города по умолчанию
            if (selectedCity) {
                try {
                    const streetsData = await getStreets(selectedCity);
                    const validStreetsData = Array.isArray(streetsData) ? streetsData : [];
                    setStreets(validStreetsData);
                } catch (error) {
                    console.error("Ошибка загрузки улиц:", error);
                    setStreets([]);
                }
            }

            setFormLoading(false);

            return {
                success: validTypesData.length > 0 && validResourceTypesData.length > 0,
                typesData: validTypesData,
                resourceTypesData: validResourceTypesData,
                citiesData: validCitiesData
            };
        } catch (error) {
            console.error("Общая ошибка загрузки справочников:", error);
            setFormLoading(false);
            
            // Инициализируем пустыми массивами в случае ошибки
            setIncidentTypes([]);
            setResourceTypes([]);
            setCities([]);
            setStreets([]);

            return {
                success: false,
                error: error,
                typesData: [],
                resourceTypesData: [],
                citiesData: []
            };
        }
    };

    // Добавляем функцию для поиска адресов по запросу
    const searchAddressesByQuery = async () => {
        try {
            setAddressesLoading(true);
            
            if (!selectedCity || !addressSearchQuery.trim()) {
                setAddressesLoading(false);
                return [];
            }
            
            const addressesData = await searchAddresses(selectedCity, addressSearchQuery);
            
            if (Array.isArray(addressesData)) {
                setAddresses(addressesData);
                setAddressesLoading(false);
                return addressesData;
            } else {
                setAddresses([]);
                setAddressesLoading(false);
                return [];
            }
        } catch (error) {
            console.error('Ошибка при поиске адресов:', error);
            setAddressesLoading(false);
            setAddresses([]);
            return [];
        }
    };

    const sortData = (data: Incident[]): Incident[] => {
        if (!data || !Array.isArray(data) || data.length === 0) return [];
        
        try {
            return [...data].sort((a, b) => {
                if (!a || !b) return 0;
                
                let aValue = a[sortField as keyof Incident];
                let bValue = b[sortField as keyof Incident];
                
                // Проверка на null/undefined значения
                if (aValue === undefined || aValue === null) aValue = '';
                if (bValue === undefined || bValue === null) bValue = '';

                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
                }

                const aStr = String(aValue || '').toLowerCase();
                const bStr = String(bValue || '').toLowerCase();

                return sortDirection === 'asc'
                    ? aStr.localeCompare(bStr, 'ru')
                    : bStr.localeCompare(aStr, 'ru');
            });
        } catch (error) {
            console.error('Ошибка при сортировке данных:', error);
            return [...data]; // Возвращаем несортированные данные в случае ошибки
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

    const loadIncidents = async (page = 1) => {
        setState(prev => ({ ...prev, loading: true, error: null, success: '' }));

        setActiveFilters({
            type: '',
            resourceType: '',
            status: '',
            isComplaint: ''
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
            const data = await getIncidents(page);
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
            console.error('Ошибка загрузки инцидентов:', error);

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
            localStorage.removeItem('token');
            await initializeApi();
            setApiRetryCount(0);
            setApiSuccessful(false);
            await loadIncidents();
        } catch (error) {
            console.error('Ошибка переавторизации:', error);
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
                type: '',
                resourceType: '',
                status: '',
                isComplaint: ''
            });

            await loadIncidents();
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
            // Собираем параметры фильтрации для запроса
            const queryParams: any = {};
            
            if (activeFilters.type) {
                queryParams.incident_type_id = activeFilters.type;
            }
            
            if (activeFilters.resourceType) {
                queryParams.incident_resource_type_id = activeFilters.resourceType;
            }
            
            if (activeFilters.status) {
                queryParams.incident_status_id = activeFilters.status;
            }
            
            if (activeFilters.isComplaint) {
                queryParams.is_complaint = activeFilters.isComplaint === 'true';
            }
            
            queryParams.page = state.currentPage;
            
            // Используем этот объект для запроса с фильтрацией
            const data = await getIncidents(queryParams.page);
            
            // Фильтруем данные локально (если API не поддерживает все параметры фильтрации)
            let filteredData = data.items;
            
            if (activeFilters.type) {
                filteredData = filteredData.filter(item => 
                    item.type && item.type.id && item.type.id.toString() === activeFilters.type
                );
            }
            
            if (activeFilters.resourceType) {
                filteredData = filteredData.filter(item => 
                    item.resource_type && item.resource_type.id && 
                    item.resource_type.id.toString() === activeFilters.resourceType
                );
            }
            
            if (activeFilters.status) {
                filteredData = filteredData.filter(item => 
                    item.status && item.status.id && 
                    item.status.id.toString() === activeFilters.status
                );
            }
            
            if (activeFilters.isComplaint) {
                filteredData = filteredData.filter(item => 
                    item.is_complaint === (activeFilters.isComplaint === 'true')
                );
            }

            setState(prev => ({
                ...prev,
                incidents: filteredData,
                loading: false,
                error: null,
                success: 'success',
                currentPage: 1,  // Сбрасываем на первую страницу при фильтрации
                totalPages: Math.ceil(filteredData.length / 10),  // Примерно 10 элементов на страницу
                totalItems: filteredData.length
            }));

            setApiSuccessful(true);
        } catch (error) {
            console.error('Ошибка фильтрации инцидентов:', error);

            setApiRetryCount(prev => prev + 1);

            setState(prev => ({
                ...prev,
                error: `Ошибка при фильтрации данных. Попытка ${apiRetryCount + 1}/${MAX_API_RETRY_ATTEMPTS}`,
                loading: false,
                success: ''
            }));
        }
    };

    const handleFilterChange = (filterType: keyof typeof activeFilters, value: string) => {
        setActiveFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

    const resetFilters = () => {
        setActiveFilters({
            type: '',
            resourceType: '',
            status: '',
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
            // Используем поиск по полю "title" и/или "description"
            const queryParams = {
                title: searchInput,
                description: searchInput,
                page: 1
            };
            
            const data = await getIncidents(queryParams.page);
            
            // Фильтруем результаты локально по запросу
            const filteredData = data.items.filter(incident => 
                incident.title.toLowerCase().includes(searchInput.toLowerCase()) || 
                incident.description.toLowerCase().includes(searchInput.toLowerCase())
            );
            
            setApiSuccessful(true);
            setState(prev => ({
                ...prev,
                incidents: filteredData,
                loading: false,
                error: null,
                success: 'success',
                currentPage: 1,
                totalPages: Math.ceil(filteredData.length / 10),
                totalItems: filteredData.length
            }));
        } catch (error) {
            console.error('Ошибка поиска инцидентов:', error);

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
        } catch (error) {
            console.error('Ошибка получения деталей:', error);
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
            
            // Инициализируем выбранные адреса
            setSelectedAddresses(details.addresses || []);

            setFormData({
                title: details.title,
                description: details.description,
                incident_type_id: details.type?.id,
                incident_resource_type_id: details.resource_type?.id,
                addresses: details.addresses || [],
                is_complaint: details.is_complaint
            });

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
        setSelectedAddresses([]);

        let referencesLoaded = true;
        if (incidentTypes.length === 0 || resourceTypes.length === 0 || cities.length === 0) {
            const result = await loadReferences();
            referencesLoaded = result.success;

            if (!referencesLoaded) {
                setFormError('Не удалось загрузить необходимые справочники. Попробуйте обновить страницу.');
                setFormLoading(false);
                setShowEditOffcanvas(true);
                return;
            }
        }

        // Установка значений по умолчанию
        const defaultTypeId = incidentTypes.length > 0 ? incidentTypes[0].id : undefined;
        const defaultResourceTypeId = resourceTypes.length > 0 ? resourceTypes[0].id : undefined;

        setFormData({
            title: '',
            description: '',
            incident_type_id: defaultTypeId,
            incident_resource_type_id: defaultResourceTypeId,
            addresses: [],
            is_complaint: false
        });

        setFormLoading(false);
        setShowEditOffcanvas(true);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
                [name]: numericFields.includes(name) ? (parseInt(value, 10) || undefined) : value
            }));
        }
    };

    const handleAddressChange = async () => {
        if (!selectedCity || !selectedStreet) return;

        try {
            setAddressesLoading(true);
            const addressesData = await searchAddresses(selectedCity, '');
            setAddresses(addressesData.filter(addr => addr.street_id === selectedStreet));
            setAddressesLoading(false);
        } catch (error) {
            console.error('Ошибка при получении адресов:', error);
            setAddressesLoading(false);
        }
    };

    const handleCityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const cityId = parseInt(e.target.value, 10);
        setSelectedCity(cityId);
        setSelectedStreet(undefined);
        setAddresses([]);

        if (cityId) {
            try {
                setAddressesLoading(true);
                const streetsData = await getStreets(cityId);
                setStreets(streetsData);
                setAddressesLoading(false);
            } catch (error) {
                console.error('Ошибка при получении улиц:', error);
                setAddressesLoading(false);
            }
        } else {
            setStreets([]);
        }
    };

    const handleStreetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const streetId = parseInt(e.target.value, 10);
        setSelectedStreet(streetId);
        setAddresses([]);

        if (streetId && selectedCity) {
            handleAddressChange();
        }
    };

    // Реализация функции обработки выбора адреса
    const handleAddressSelect = (address: Address) => {
        if (!address || !address.id) return;
        
        // Проверяем, есть ли уже такой адрес в выбранных
        const isSelected = selectedAddresses.some(addr => addr.id === address.id);
        
        if (isSelected) {
            // Если уже выбран - удаляем
            handleRemoveAddress(address.id);
        } else {
            // Если не выбран - добавляем
            const newSelectedAddresses = [...selectedAddresses, address];
            setSelectedAddresses(newSelectedAddresses);
            
            // Обновляем formData.addresses
            setFormData(prev => ({
                ...prev,
                addresses: newSelectedAddresses
            }));
        }
    };

    const handleRemoveAddress = (addressId: number) => {
        const newSelectedAddresses = selectedAddresses.filter(addr => addr.id !== addressId);
        setSelectedAddresses(newSelectedAddresses);
        
        // Обновляем formData.addresses
        setFormData(prev => ({
            ...prev,
            addresses: newSelectedAddresses
        }));
    };

    const handleSaveForm = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setFormError(null);
            setFormLoading(true);

            if (!formData.title || !formData.title.trim()) {
                setFormError('Название инцидента обязательно');
                setFormLoading(false);
                return;
            }

            if (!formData.description || !formData.description.trim()) {
                setFormError('Описание инцидента обязательно');
                setFormLoading(false);
                return;
            }

            if (!formData.incident_type_id) {
                setFormError('Не указан тип инцидента');
                setFormLoading(false);
                return;
            }

            if (!formData.incident_resource_type_id) {
                setFormError('Не указан тип ресурса');
                setFormLoading(false);
                return;
            }

            if (!formData.addresses || formData.addresses.length === 0) {
                setFormError('Не указаны адреса');
                setFormLoading(false);
                return;
            }

            const dataToSend = {
                ...formData,
                address_ids: formatAddressesForSubmission(formData.addresses.map(addr => addr.id) || [])
            };

            console.log('Отправляемые данные:', dataToSend);

            let response;
            if (currentItem) {
                response = await updateIncident(currentItem.id, dataToSend);
            } else {
                response = await createIncident(dataToSend);
            }

            console.log('Ответ API:', response);

            setFormLoading(false);
            setShowEditOffcanvas(false);

            await loadIncidents(state.currentPage);

            setState(prev => ({
                ...prev,
                success: currentItem ? 'Инцидент успешно обновлен' : 'Инцидент успешно создан'
            }));
        } catch (error) {
            console.error('Ошибка сохранения данных:', error);
            setFormLoading(false);

            let errorMessage = 'Ошибка сохранения данных: ';

            if (error instanceof Error) {
                errorMessage += error.message;
                // @ts-ignore
                if (error.response && error.response.data) {
                    try {
                        // @ts-ignore
                        const errorData = typeof error.response.data === 'string'
                            // @ts-ignore
                            ? JSON.parse(error.response.data)
                            // @ts-ignore
                            : error.response.data;

                        if (errorData.errors) {
                            const fieldErrors = Object.values(errorData.errors)
                                .flat()
                                .join(', ');
                            errorMessage += `: ${fieldErrors}`;
                        } else if (errorData.message) {
                            errorMessage += `: ${errorData.message}`;
                        }
                    } catch (e) {
                        // Ignore parsing errors
                    }
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
            console.error('Ошибка удаления:', error);
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
                
                // Проверяем инициализацию API
                try {
                    await initializeApi();
                } catch (error) {
                    console.error('Ошибка инициализации API:', error);
                    
                    if (String(error).includes('авторизац') || String(error).includes('Unauthorized') || String(error).includes('Unauthenticated')) {
                        setAuthError(true);
                        setState(prev => ({
                            ...prev,
                            error: 'Ошибка авторизации. Пожалуйста, обновите страницу или войдите в систему заново.',
                            loading: false,
                            success: ''
                        }));
                        return;
                    }
                }
                
                // Получаем инциденты с безопасной обработкой ошибок
                try {
                    const response = await getIncidents();
                    
                    setState(prev => ({
                        ...prev,
                        incidents: response.items || [],
                        currentPage: response.currentPage || 1,
                        totalPages: response.totalPages || 1,
                        totalItems: response.totalItems || 0,
                        loading: false,
                        error: null,
                        success: 'success'
                    }));
                } catch (incidentError) {
                    console.error('Ошибка получения инцидентов:', incidentError);
                    setState(prev => ({
                        ...prev,
                        error: 'Ошибка загрузки данных отключений',
                        loading: false
                    }));
                    return;
                }

                // Загружаем справочники с отдельной обработкой ошибок
                try {
                    await loadReferences();
                } catch (referencesError) {
                    console.error('Ошибка загрузки справочников:', referencesError);
                    // Не останавливаем полностью работу компонента, если справочники не загрузились
                }
                
            } catch (error) {
                console.error('Общая ошибка инициализации:', error);

                if (String(error).includes('авторизац') || String(error).includes('Unauthorized') || String(error).includes('Unauthenticated')) {
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

    const getSortedData = () => {
        return state.incidents && state.incidents.length > 0 ? sortData(state.incidents) : [];
    };

    const renderSortIcon = (field: string) => {
        if (field !== sortField) {
            return <i className="ti ti-sort ms-1"></i>;
        }

        return sortDirection === 'asc'
            ? <i className="ti ti-sort-ascending ms-1"></i>
            : <i className="ti ti-sort-descending ms-1"></i>;
    };

    const formatDate = (dateString: string | undefined) => {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            // Проверка на валидную дату
            if (isNaN(date.getTime())) return '';
            
            return date.toLocaleString('ru-RU', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Ошибка форматирования даты:', error);
            return '';
        }
    };

    const formatAddressesDisplay = (addresses: Address[] | undefined) => {
        if (!addresses || addresses.length === 0) return 'Не указано';
        
        return addresses.map(addr => {
            const street = addr?.street?.name || '';
            const houseNumber = addr?.house_number || '';
            const building = addr?.building ? `, корп. ${addr.building}` : '';
            const city = addr?.street?.city?.name ? `г. ${addr.street.city.name}` : '';
            
            return `${city} ${street} ${houseNumber}${building}`.trim();
        }).join('; ');
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

    const renderTableRow = (incident: Incident) => {
        // Защита от null/undefined
        if (!incident) return null;
        
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
                            key={`${incident.id}-${column.id}`}
                            className="text-center"
                            style={style}
                        >
                            <OverlayTrigger
                                placement="top"
                                overlay={<Tooltip id={`tooltip-view-${incident.id}`}>Просмотр</Tooltip>}
                            >
                                <i
                                    className="ph-duotone ph-info text-info f-18 cursor-pointer me-2"
                                    onClick={() => handleViewDetails(incident.id)}
                                ></i>
                            </OverlayTrigger>
                            <OverlayTrigger
                                placement="top"
                                overlay={<Tooltip id={`tooltip-edit-${incident.id}`}>Редактировать</Tooltip>}
                            >
                                <i
                                    className="ph-duotone ph-pencil-simple text-primary f-18 cursor-pointer me-2"
                                    onClick={() => handleEditRecord(incident.id)}
                                ></i>
                            </OverlayTrigger>
                            <OverlayTrigger
                                placement="top"
                                overlay={<Tooltip id={`tooltip-delete-${incident.id}`}>Удалить</Tooltip>}
                            >
                                <i
                                    className="ph-duotone ph-trash text-danger f-18 cursor-pointer"
                                    onClick={() => handleDeletePrompt(incident)}
                                ></i>
                            </OverlayTrigger>
                        </td>
                    );
                }

                // Специальная обработка для различных типов данных с проверками на undefined
                if (column.id === 'addresses') {
                    return (
                        <td key={`${incident.id}-${column.id}`} style={style}>
                            {formatAddressesDisplay(incident.addresses || [])}
                        </td>
                    );
                }

                if (column.id === 'type') {
                    return (
                        <td key={`${incident.id}-${column.id}`} style={style}>
                            {incident.type?.name || 'Не указано'}
                        </td>
                    );
                }

                if (column.id === 'resource_type') {
                    return (
                        <td key={`${incident.id}-${column.id}`} style={style}>
                            {incident.resource_type?.name || 'Не указано'}
                        </td>
                    );
                }

                if (column.id === 'status') {
                    return (
                        <td key={`${incident.id}-${column.id}`} style={style}>
                            {incident.status?.name || 'Не указано'}
                        </td>
                    );
                }

                if (column.id === 'is_complaint') {
                    return (
                        <td key={`${incident.id}-${column.id}`} style={style}>
                            {incident.is_complaint ? 'Да' : 'Нет'}
                        </td>
                    );
                }

                if (column.id === 'created_at' || column.id === 'updated_at') {
                    return (
                        <td key={`${incident.id}-${column.id}`} style={style}>
                            {formatDate(incident[column.id as keyof Incident] as string || '')}
                        </td>
                    );
                }

                const fieldKey = column.field as keyof Incident;
                return (
                    <td
                        key={`${incident.id}-${column.id}`}
                        style={style}
                    >
                        {String(incident[fieldKey] || '')}
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
                                <h5 className="m-b-10">Управление отключениями</h5>
                            </div>
                            <ul className="breadcrumb">
                                <li className="breadcrumb-item">
                                    <Link to="/dashboard">Главная</Link>
                                </li>
                                <li className="breadcrumb-item">ЖКХ</li>
                                <li className="breadcrumb-item">Отключения</li>
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
                                                Фильтр {
                                                    (activeFilters.type || activeFilters.resourceType || 
                                                    activeFilters.status || activeFilters.isComplaint) && 
                                                    <span className="filter-indicator"></span>
                                                }
                                            </Dropdown.Toggle>
                                            <Dropdown.Menu className="mini-filter-menu">
                                                <div className="filter-content p-2">
                                                    <Form.Group className="mb-3">
                                                        <Form.Label className="mini-filter-label">Тип инцидента</Form.Label>
                                                        <Form.Select
                                                            size="sm"
                                                            value={activeFilters.type}
                                                            onChange={(e) => handleFilterChange('type', e.target.value)}
                                                            disabled={state.loading || authError}
                                                        >
                                                            <option value="">Все типы</option>
                                                            {incidentTypes.map(type => (
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
                                                            onChange={(e) => handleFilterChange('resourceType', e.target.value)}
                                                            disabled={state.loading || authError}
                                                        >
                                                            <option value="">Все ресурсы</option>
                                                            {resourceTypes.map(type => (
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
                                                            onChange={(e) => handleFilterChange('isComplaint', e.target.value)}
                                                            disabled={state.loading || authError}
                                                        >
                                                            <option value="">Все записи</option>
                                                            <option value="true">Да</option>
                                                            <option value="false">Нет</option>
                                                        </Form.Select>
                                                    </Form.Group>

                                                    <div className="d-flex justify-content-between">
                                                        <Button
                                                            variant="outline-secondary"
                                                            size="sm"
                                                            onClick={resetFilters}
                                                            disabled={state.loading || authError || (
                                                                !activeFilters.type && 
                                                                !activeFilters.resourceType && 
                                                                !activeFilters.status &&
                                                                !activeFilters.isComplaint
                                                            )}
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
                                                        <tr>
                                                            {renderTableHeaders()}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {getSortedData().map((incident: Incident) => (
                                                            <tr key={incident.id}>
                                                                {renderTableRow(incident)}
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
                        Детали инцидента
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
                                        <i className="ti ti-notepad f-20"></i>
                                    </div>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                    <h5 className="mb-1"><b>Название</b></h5>
                                    <p className="text-muted">{currentItem?.title}</p>
                                </div>
                            </div>

                            <div className="d-flex">
                                <div className="flex-shrink-0">
                                    <div className="avtar avtar-xs bg-light-info">
                                        <i className="ti ti-file-description f-20"></i>
                                    </div>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                    <h5 className="mb-1"><b>Описание</b></h5>
                                    <p className="text-muted">{currentItem?.description}</p>
                                </div>
                            </div>

                            <div className="d-flex">
                                <div className="flex-shrink-0">
                                    <div className="avtar avtar-xs bg-light-warning">
                                        <i className="ti ti-map-pin f-20"></i>
                                    </div>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                    <h5 className="mb-1"><b>Адреса</b></h5>
                                    <p className="text-muted">
                                        {currentItem?.addresses && currentItem.addresses.length > 0 ? (
                                            <ul className="list-unstyled mb-0">
                                                {currentItem.addresses.map((addr, index) => (
                                                    <li key={index}>
                                                        {addr.street?.city?.name ? `г. ${addr.street.city.name}, ` : ''}
                                                        {addr.street?.name || ''} {addr.house_number || ''}
                                                        {addr.building ? `, корп. ${addr.building}` : ''}
                                                        {addr.structure ? `, стр. ${addr.structure}` : ''}
                                                        {addr.literature ? `, лит. ${addr.literature}` : ''}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            'Адреса не указаны'
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="d-flex">
                                <div className="flex-shrink-0">
                                    <div className="avtar avtar-xs bg-light-danger">
                                        <i className="ti ti-category f-20"></i>
                                    </div>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                    <h5 className="mb-1"><b>Тип</b></h5>
                                    <p className="text-muted">{currentItem?.type?.name || 'Не указано'}</p>
                                </div>
                            </div>

                            <div className="d-flex">
                                <div className="flex-shrink-0">
                                    <div className="avtar avtar-xs bg-light-success">
                                        <i className="ti ti-plug f-20"></i>
                                    </div>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                    <h5 className="mb-1"><b>Тип ресурса</b></h5>
                                    <p className="text-muted">{currentItem?.resource_type?.name || 'Не указано'}</p>
                                </div>
                            </div>

                            <div className="d-flex">
                                <div className="flex-shrink-0">
                                    <div className="avtar avtar-xs bg-light-secondary">
                                        <i className="ti ti-status-change f-20"></i>
                                    </div>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                    <h5 className="mb-1"><b>Статус</b></h5>
                                    <p className="text-muted">{currentItem?.status?.name || 'Не указано'}</p>
                                </div>
                            </div>

                            <div className="d-flex">
                                <div className="flex-shrink-0">
                                    <div className="avtar avtar-xs bg-light-warning">
                                        <i className="ti ti-alert-triangle f-20"></i>
                                    </div>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                    <h5 className="mb-1"><b>Жалоба</b></h5>
                                    <p className="text-muted">{currentItem?.is_complaint ? 'Да' : 'Нет'}</p>
                                </div>
                            </div>

                            <div className="d-flex">
                                <div className="flex-shrink-0">
                                    <div className="avtar avtar-xs bg-light-info">
                                        <i className="ti ti-calendar-plus f-20"></i>
                                    </div>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                    <h5 className="mb-1"><b>Дата создания</b></h5>
                                    <p className="text-muted">{formatDate(currentItem?.created_at || '')}</p>
                                </div>
                            </div>

                            <div className="d-flex">
                                <div className="flex-shrink-0">
                                    <div className="avtar avtar-xs bg-light-primary">
                                        <i className="ti ti-calendar-event f-20"></i>
                                    </div>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                    <h5 className="mb-1"><b>Дата обновления</b></h5>
                                    <p className="text-muted">{formatDate(currentItem?.updated_at || '')}</p>
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
                        {currentItem ? 'Редактирование отключения' : 'Добавление отключения'}
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
                                        <Form.Label>Название*</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="title"
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
                                            value={formData.description || ''}
                                            onChange={handleFormChange}
                                            required
                                        />
                                    </div>
                                </Col>

                                <Col md={6}>
                                    <div className="mb-3">
                                        <Form.Label>Тип инцидента*</Form.Label>
                                        <Form.Select
                                            name="incident_type_id"
                                            value={formData.incident_type_id || ''}
                                            onChange={handleFormChange}
                                            required
                                        >
                                            <option value="">Выберите тип</option>
                                            {Array.isArray(incidentTypes) && incidentTypes.map(type => (
                                                <option key={type.id} value={type.id}>
                                                    {type.name}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    </div>
                                </Col>

                                <Col md={6}>
                                    <div className="mb-3">
                                        <Form.Label>Тип ресурса*</Form.Label>
                                        <Form.Select
                                            name="incident_resource_type_id"
                                            value={formData.incident_resource_type_id || ''}
                                            onChange={handleFormChange}
                                            required
                                        >
                                            <option value="">Выберите тип ресурса</option>
                                            {Array.isArray(resourceTypes) && resourceTypes.map(type => (
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
                                            <Card.Body className="p-3">
                                                <Row className="mb-3">
                                                    <Col sm={5}>
                                                        <Form.Label className="mb-1">Город</Form.Label>
                                                        <Form.Select
                                                            size="sm"
                                                            value={selectedCity || ''}
                                                            onChange={handleCityChange}
                                                        >
                                                            <option value="">Выберите город</option>
                                                            {Array.isArray(cities) && cities.map(city => (
                                                                <option key={city.id} value={city.id}>
                                                                    {city.name}
                                                                </option>
                                                            ))}
                                                        </Form.Select>
                                                    </Col>
                                                    <Col sm={7}>
                                                        <Form.Label className="mb-1">Улица</Form.Label>
                                                        <Form.Select
                                                            size="sm"
                                                            value={selectedStreet || ''}
                                                            onChange={handleStreetChange}
                                                            disabled={!selectedCity}
                                                        >
                                                            <option value="">Выберите улицу</option>
                                                            {Array.isArray(streets) && streets.map(street => (
                                                                <option key={street.id} value={street.id}>
                                                                    {street.name}
                                                                </option>
                                                            ))}
                                                        </Form.Select>
                                                    </Col>
                                                </Row>
                                                
                                                <Row className="mb-3">
                                                    <Col>
                                                        <Form.Label className="mb-1">Поиск адреса</Form.Label>
                                                        <InputGroup size="sm">
                                                            <Form.Control
                                                                type="text"
                                                                placeholder="Введите номер дома"
                                                                value={addressSearchQuery}
                                                                onChange={(e) => setAddressSearchQuery(e.target.value)}
                                                                disabled={!selectedCity}
                                                            />
                                                            <Button
                                                                variant="outline-secondary"
                                                                onClick={searchAddressesByQuery}
                                                                disabled={!selectedCity || !addressSearchQuery.trim() || addressesLoading}
                                                            >
                                                                {addressesLoading ? (
                                                                    <Spinner
                                                                        as="span"
                                                                        animation="border"
                                                                        size="sm"
                                                                        role="status"
                                                                        aria-hidden="true"
                                                                    />
                                                                ) : (
                                                                    'Найти'
                                                                )}
                                                            </Button>
                                                        </InputGroup>
                                                    </Col>
                                                </Row>

                                                {addressesLoading && (
                                                    <div className="text-center my-3">
                                                        <Spinner animation="border" size="sm" />
                                                        <span className="ms-2">Загрузка адресов...</span>
                                                    </div>
                                                )}
                                                
                                                {/* Доступные адреса */}
                                                {!addressesLoading && Array.isArray(addresses) && addresses.length > 0 && (
                                                    <div className="mt-3">
                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                            <Form.Label className="m-0 fw-semibold">Доступные адреса:</Form.Label>
                                                            <span className="text-muted small">Найдено: {addresses.length}</span>
                                                        </div>
                                                        <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
                                                            <ListGroup variant="flush">
                                                                {addresses.map(address => (
                                                                    <ListGroup.Item
                                                                        key={address.id}
                                                                        action
                                                                        onClick={() => handleAddressSelect(address)}
                                                                        className="d-flex justify-content-between align-items-center py-2 px-3"
                                                                    >
                                                                        <span>
                                                                            {address.house_number}
                                                                            {address.building ? ` к${address.building}` : ''}
                                                                            {address.structure ? ` с${address.structure}` : ''}
                                                                            {address.literature ? ` л${address.literature}` : ''}
                                                                        </span>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline-primary"
                                                                            className="py-0 px-2"
                                                                        >
                                                                            <i className="ti ti-plus"></i>
                                                                        </Button>
                                                                    </ListGroup.Item>
                                                                ))}
                                                            </ListGroup>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Выбранные адреса */}
                                                {Array.isArray(selectedAddresses) && selectedAddresses.length > 0 && (
                                                    <div className="mt-3">
                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                            <Form.Label className="m-0 fw-semibold">Выбранные адреса:</Form.Label>
                                                            <span className="badge bg-primary">{selectedAddresses.length}</span>
                                                        </div>
                                                        <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
                                                            <ListGroup variant="flush">
                                                                {selectedAddresses.map(address => (
                                                                    <ListGroup.Item
                                                                        key={address.id}
                                                                        className="d-flex justify-content-between align-items-center py-2 px-3"
                                                                    >
                                                                        <span className="text-truncate me-2">
                                                                            {address.street?.city?.name ? `${address.street.city.name}, ` : ''}
                                                                            {address.street?.name || ''} {address.house_number || ''}
                                                                            {address.building ? `, корп. ${address.building}` : ''}
                                                                            {address.structure ? `, стр. ${address.structure}` : ''}
                                                                            {address.literature ? `, лит. ${address.literature}` : ''}
                                                                        </span>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline-danger"
                                                                            className="py-0 px-2"
                                                                            onClick={() => handleRemoveAddress(address.id)}
                                                                        >
                                                                            <i className="ti ti-trash"></i>
                                                                        </Button>
                                                                    </ListGroup.Item>
                                                                ))}
                                                            </ListGroup>
                                                        </div>
                                                    </div>
                                                )}
                                            </Card.Body>
                                        </Card>
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

                .selected-address {
                    display: flex;
                    align-items: center;
                    background-color: #f8f9fa;
                    border-radius: 4px;
                    padding: 5px 10px;
                    margin-bottom: 5px;
                }

                .address-list {
                    max-height: 200px;
                    overflow-y: auto;
                    border: 1px solid #dee2e6;
                    border-radius: 4px;
                    padding: 10px;
                }
            `}</style>
        </React.Fragment>
    );
};

export default OutagesList;