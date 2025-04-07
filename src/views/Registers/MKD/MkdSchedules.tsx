import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Button, Form, Spinner, Alert, Pagination, Offcanvas, Modal, InputGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
    getMkdBuildings,
    filterMkdBuildings,
    exportMkdToExcel,
    initializeApi,
    getCities,
    getStreets,
    updateMkdSchedule
} from '../../../services/api';
import { MkdBuilding, MkdScheduleState, MkdQueryParams, City } from '../../../types/mkdSchedule';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const MAX_API_RETRY_ATTEMPTS = 3;

interface TableColumn {
    id: string;
    title: string;
    width: number;
    visible: boolean;
    field: string;
}

interface AddressOption {
    id: number;
    name: string;
}

interface EditableSchedule {
    id: number;
    planned_disconnection_date: Date | null;
    actual_disconnection_date: Date | null;
    planned_connection_date: Date | null;
    actual_connection_date: Date | null;
    disconnection_order: string;
    connection_order: string;
}

const MkdSchedules: React.FC = () => {
    const [state, setState] = useState<MkdScheduleState>({
        mkdBuildings: [],
        loading: true,
        error: null,
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        success: '',
        filterCity: '',
        filterStreet: '',
        filterHouseNumber: '',
        filterYear: ''
    });

    const [activeFilters, setActiveFilters] = useState({
        regionId: null as number | null,
        cityId: null as number | null,
        streetId: null as number | null,
        city: '',
        address: '',
        addressId: null as number | null,
        buildingYear: ''
    });

    const [filterOptions, setFilterOptions] = useState<{
        cities: { id: number, name: string }[];
        streets: { id: number, name: string }[];
        addresses: AddressOption[];
        years: string[];
    }>({
        cities: [],
        streets: [],
        addresses: [],
        years: []
    });

    // Schedule editing state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<EditableSchedule | null>(null);
    const [editingBuildingInfo, setEditingBuildingInfo] = useState<{
        address: string;
        settlement: string;
    } | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editSuccessMessage, setEditSuccessMessage] = useState('');
    const [editingErrors, setEditingErrors] = useState<{[key: string]: string}>({});

    const [columns, setColumns] = useState<TableColumn[]>([
        { id: 'id', title: '№', width: 70, visible: true, field: 'id' },
        { id: 'city', title: 'ГОРОД', width: 150, visible: true, field: 'address.street.city.name' },
        { id: 'street', title: 'УЛИЦА', width: 200, visible: true, field: 'address.street.name' },
        { id: 'houseNumber', title: 'НОМЕР ДОМА', width: 120, visible: true, field: 'address.house_number' },
        { id: 'buildingYear', title: 'ГОД ПОСТРОЙКИ', width: 130, visible: true, field: 'buildingYear' },
        { id: 'cadastreNumber', title: 'КАДАСТР. НОМЕР', width: 180, visible: true, field: 'cadastreNumber' },
        { id: 'houseType', title: 'ТИП ДОМА', width: 150, visible: true, field: 'house_type.houseTypeName' },
        { id: 'houseCondition', title: 'СОСТОЯНИЕ', width: 150, visible: true, field: 'house_condition.houseCondition' },
        { id: 'managementOrg', title: 'УК', width: 200, visible: true, field: 'management_org.shortName' },
        { id: 'plannedDisconnection', title: 'ПЛАН. ДАТА ОТКЛ.', width: 150, visible: true, field: 'planned_disconnection_date' },
        { id: 'actualDisconnection', title: 'ФАКТ. ДАТА ОТКЛ.', width: 150, visible: true, field: 'actual_disconnection_date' },
        { id: 'plannedConnection', title: 'ПЛАН. ДАТА ВКЛ.', width: 150, visible: true, field: 'planned_connection_date' },
        { id: 'actualConnection', title: 'ФАКТ. ДАТА ВКЛ.', width: 150, visible: true, field: 'actual_connection_date' },
        { id: 'disconnectionOrder', title: 'ПРИКАЗ ОБ ОТКЛ.', width: 200, visible: true, field: 'disconnection_order' },
        { id: 'connectionOrder', title: 'ПРИКАЗ О ВКЛ.', width: 200, visible: true, field: 'connection_order' },
        { id: 'actions', title: 'ДЕЙСТВИЯ', width: 100, visible: true, field: 'actions' }
    ]);

    const [isTableCustomized, setIsTableCustomized] = useState<boolean>(false);

    const [sortField, setSortField] = useState<string>('id');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const [authError, setAuthError] = useState<boolean>(false);
    const [apiRetryCount, setApiRetryCount] = useState<number>(0);

    const [apiSuccessful, setApiSuccessful] = useState<boolean>(false);

    const [showColumnsSettings, setShowColumnsSettings] = useState(false);

    const [isResizing, setIsResizing] = useState(false);
    const tableRef = useRef<HTMLTableElement>(null);

    useEffect(() => {
        const savedColumns = localStorage.getItem('mkdSchedulesColumns');
        if (savedColumns) {
            try {
                const parsedColumns = JSON.parse(savedColumns);
                if (!parsedColumns.find((col: TableColumn) => col.id === 'actions')) {
                    parsedColumns.push({ 
                        id: 'actions', 
                        title: 'ДЕЙСТВИЯ', 
                        width: 100, 
                        visible: true, 
                        field: 'actions' 
                    });
                }
                setColumns(parsedColumns);
                setIsTableCustomized(true);
            } catch (e) {
                console.error("Error parsing saved columns:", e);
            }
        }
    }, []);

    useEffect(() => {
        if (isTableCustomized) {
            localStorage.setItem('mkdSchedulesColumns', JSON.stringify(columns));
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
        if (columnId === 'actions' && !visible) {
            return;
        }
        
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
            { id: 'city', title: 'ГОРОД', width: 150, visible: true, field: 'address.street.city.name' },
            { id: 'street', title: 'УЛИЦА', width: 200, visible: true, field: 'address.street.name' },
            { id: 'houseNumber', title: 'НОМЕР ДОМА', width: 120, visible: true, field: 'address.house_number' },
            { id: 'buildingYear', title: 'ГОД ПОСТРОЙКИ', width: 130, visible: true, field: 'buildingYear' },
            { id: 'cadastreNumber', title: 'КАДАСТР. НОМЕР', width: 180, visible: true, field: 'cadastreNumber' },
            { id: 'houseType', title: 'ТИП ДОМА', width: 150, visible: true, field: 'house_type.houseTypeName' },
            { id: 'houseCondition', title: 'СОСТОЯНИЕ', width: 150, visible: true, field: 'house_condition.houseCondition' },
            { id: 'managementOrg', title: 'УК', width: 200, visible: true, field: 'management_org.shortName' },
            { id: 'plannedDisconnection', title: 'ПЛАН. ДАТА ОТКЛ.', width: 150, visible: true, field: 'planned_disconnection_date' },
            { id: 'actualDisconnection', title: 'ФАКТ. ДАТА ОТКЛ.', width: 150, visible: true, field: 'actual_disconnection_date' },
            { id: 'plannedConnection', title: 'ПЛАН. ДАТА ВКЛ.', width: 150, visible: true, field: 'planned_connection_date' },
            { id: 'actualConnection', title: 'ФАКТ. ДАТА ВКЛ.', width: 150, visible: true, field: 'actual_connection_date' },
            { id: 'disconnectionOrder', title: 'ПРИКАЗ ОБ ОТКЛ.', width: 200, visible: true, field: 'disconnection_order' },
            { id: 'connectionOrder', title: 'ПРИКАЗ О ВКЛ.', width: 200, visible: true, field: 'connection_order' },
            { id: 'actions', title: 'ДЕЙСТВИЯ', width: 100, visible: true, field: 'actions' }
        ];
        setColumns(defaultColumns);
        localStorage.removeItem('mkdSchedulesColumns');
        setIsTableCustomized(false);
        setShowColumnsSettings(false);
    };

    const sortData = (data: MkdBuilding[]): MkdBuilding[] => {
        return [...data].sort((a, b) => {
            if (sortField === 'actions') return 0;
            
            const getNestedValue = (obj: any, path: string) => {
                const parts = path.split('.');
                let value = obj;
                for (const part of parts) {
                    if (value === null || value === undefined) return '';
                    value = value[part];
                }
                return value;
            };

            let aValue = sortField.includes('.') ? getNestedValue(a, sortField) : a[sortField as keyof MkdBuilding];
            let bValue = sortField.includes('.') ? getNestedValue(b, sortField) : b[sortField as keyof MkdBuilding];

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
        if (isResizing || field === 'actions') return;

        if (field === sortField) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const loadMkdBuildings = async (page = 1) => {
        setState(prev => ({ ...prev, loading: true, error: null, success: '' }));

        setActiveFilters({
            regionId: null,
            cityId: null,
            streetId: null,
            city: '',
            address: '',
            addressId: null,
            buildingYear: ''
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
            const data = await getMkdBuildings(page);
            setApiSuccessful(true);

            extractFilterOptions(data.items);

            setState(prev => ({
                ...prev,
                mkdBuildings: data.items,
                currentPage: data.currentPage,
                totalPages: data.totalPages,
                totalItems: data.totalItems,
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
            await loadMkdBuildings();
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
                regionId: null,
                cityId: null,
                streetId: null,
                city: '',
                address: '',
                addressId: null,
                buildingYear: ''
            });

            await loadMkdBuildings();
        } catch (error) {
            setState(prev => ({
                ...prev,
                error: 'Ошибка при обновлении данных. Пожалуйста, попробуйте позже.',
                loading: false,
                success: ''
            }));
        }
    };

    const extractFilterOptions = (data: MkdBuilding[]) => {
        const yearsSet = new Set<string>();

        data.forEach(item => {
            if (item.buildingYear) yearsSet.add(item.buildingYear);
        });

        setFilterOptions(prev => ({
            ...prev,
            years: Array.from(yearsSet).sort()
        }));
    };

    const loadCities = async () => {
        try {
            const citiesResponse = await getCities();
            let citiesArray: City[] = [];

            if (Array.isArray(citiesResponse)) {
                citiesArray = citiesResponse;
            } else if (typeof citiesResponse === 'object' && citiesResponse !== null) {
                const responseAny = citiesResponse as any;
                if (responseAny.data && Array.isArray(responseAny.data)) {
                    citiesArray = responseAny.data;
                }
            }

            setFilterOptions(prev => ({
                ...prev,
                cities: citiesArray.map(city => ({
                    id: city.id,
                    name: city.name
                }))
            }));
        } catch (error) {
            setState(prev => ({
                ...prev,
                error: 'Ошибка при загрузке списка городов',
                loading: false
            }));
        }
    };

    const loadStreetsByCity = async (cityId: number) => {
        try {
            const streetsResponse = await getStreets(cityId);
            let streetsArray: { id: number, name: string }[] = [];

            if (Array.isArray(streetsResponse)) {
                streetsArray = streetsResponse;
            } else if (typeof streetsResponse === 'object' && streetsResponse !== null) {
                const responseAny = streetsResponse as any;
                if (responseAny.data && Array.isArray(responseAny.data)) {
                    streetsArray = responseAny.data;
                }
            }

            setFilterOptions(prev => ({
                ...prev,
                streets: streetsArray.map(street => ({
                    id: street.id,
                    name: street.name
                }))
            }));
        } catch (error) {
            setState(prev => ({
                ...prev,
                error: 'Ошибка при загрузке списка улиц',
                loading: false
            }));
        }
    };

    const handleCityChange = (cityId: string) => {
        const selectedCity = filterOptions.cities.find(c => c.id.toString() === cityId);
        const cityName = selectedCity ? selectedCity.name : '';

        setActiveFilters(prev => ({
            ...prev,
            city: cityName,
            cityId: cityId ? parseInt(cityId) : null,
            streetId: null,
            address: '',
            addressId: null
        }));

        setFilterOptions(prev => ({
            ...prev,
            streets: [],
            addresses: []
        }));

        if (cityId) {
            loadStreetsByCity(parseInt(cityId));
        }
    };

    const handleStreetChange = (streetId: string) => {
        setActiveFilters(prev => ({
          ...prev,
          streetId: streetId ? parseInt(streetId) : null,
          address: '',
          addressId: null
        }));
    };

    const handleAddressChange = (addressId: string) => {
        setActiveFilters(prev => ({
            ...prev,
            addressId: addressId ? parseInt(addressId) : null
        }));
    };

    const applyFilters = async () => {
        setState(prev => ({ ...prev, loading: true, error: null, success: '' }));
      
        try {
          const queryParams: MkdQueryParams = {};
      
          if (activeFilters.regionId) {
            queryParams.region_id = activeFilters.regionId;
          }
      
          if (activeFilters.cityId) {
            queryParams.city_id = activeFilters.cityId;
          }
      
          if (activeFilters.streetId) {
            queryParams.street_id = activeFilters.streetId;
          }
      
          if (activeFilters.addressId) {
            queryParams.address_id = activeFilters.addressId;
          }
      
          if (activeFilters.buildingYear) {
            queryParams.buildingYear = activeFilters.buildingYear;
          }
      
          const filteredData = await filterMkdBuildings(queryParams);
      
          setState(prev => ({
            ...prev,
            mkdBuildings: filteredData,
            loading: false,
            error: null,
            success: 'success',
            currentPage: 1,
            totalPages: 1,
            totalItems: filteredData.length
          }));
      
          setApiSuccessful(true);
        } catch (error) {
          setApiRetryCount(prev => prev + 1);
      
          setState(prev => ({
            ...prev,
            error: `Ошибка при фильтрации данных. Попытка ${apiRetryCount + 1}/${MAX_API_RETRY_ATTEMPTS}`,
            loading: false,
            success: ''
          }));
        }
    };

    const resetFilters = () => {
        setActiveFilters({
            regionId: null,
            cityId: null,
            streetId: null,
            city: '',
            address: '',
            addressId: null,
            buildingYear: ''
        });

        setFilterOptions(prev => ({
            ...prev,
            streets: [],
            addresses: []
        }));

        loadMkdBuildings();
    };

    const handleExportToExcel = async () => {
        try {
            setState(prev => ({ ...prev, loading: true, error: null, success: '' }));

            const now = new Date();
            const dateStr = `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;
            const timeStr = `${now.getHours()}-${now.getMinutes()}`;

            const blob = await exportMkdToExcel(state.mkdBuildings);

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Графики_включения_отключения_МКД_${dateStr}_${timeStr}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setState(prev => ({
                ...prev,
                loading: false,
                success: 'success',
                error: null
            }));
        } catch (error) {
            setApiRetryCount(prev => prev + 1);

            setState(prev => ({
                ...prev,
                error: `Не удалось экспортировать данные. Пожалуйста, попробуйте позже.`,
                loading: false,
                success: ''
            }));
        }
    };

    const handlePageChange = (page: number) => {
        loadMkdBuildings(page);
    };

    const handleEditSchedule = (building: MkdBuilding) => {
        const parsePlannedDisconnection = building.planned_disconnection_date
            ? new Date(building.planned_disconnection_date)
            : null;
        
        const parseActualDisconnection = building.actual_disconnection_date
            ? new Date(building.actual_disconnection_date)
            : null;
        
        const parsePlannedConnection = building.planned_connection_date
            ? new Date(building.planned_connection_date)
            : null;
        
        const parseActualConnection = building.actual_connection_date
            ? new Date(building.actual_connection_date)
            : null;

        setEditingSchedule({
            id: building.id,
            planned_disconnection_date: parsePlannedDisconnection,
            actual_disconnection_date: parseActualDisconnection,
            planned_connection_date: parsePlannedConnection,
            actual_connection_date: parseActualConnection,
            disconnection_order: building.disconnection_order || '',
            connection_order: building.connection_order || ''
        });

        const address = building.address?.street?.name 
            ? `${building.address.street.name}, ${building.address.house_number}${building.address.building ? ` корп. ${building.address.building}` : ''}`
            : 'Адрес не указан';
            
        const settlement = building.address?.street?.city?.name || 'Город не указан';
        
        setEditingBuildingInfo({
            address,
            settlement
        });

        setShowEditModal(true);
        setEditingErrors({});
    };

    const handleSaveSchedule = async () => {
        if (!editingSchedule) return;
        
        try {
            setIsEditing(true);
            setEditingErrors({});
            
            const errors: {[key: string]: string} = {};
            
            if (!editingSchedule.planned_disconnection_date && 
                !editingSchedule.actual_disconnection_date && 
                !editingSchedule.planned_connection_date && 
                !editingSchedule.actual_connection_date && 
                !editingSchedule.disconnection_order && 
                !editingSchedule.connection_order) {
                errors.general = 'Необходимо заполнить хотя бы одно поле графика';
            }
            
            if (editingSchedule.planned_disconnection_date && 
                editingSchedule.planned_connection_date && 
                editingSchedule.planned_disconnection_date > editingSchedule.planned_connection_date) {
                errors.planned_connection_date = 'Дата включения должна быть позже даты отключения';
            }
            
            if (editingSchedule.actual_disconnection_date && 
                editingSchedule.actual_connection_date && 
                editingSchedule.actual_disconnection_date > editingSchedule.actual_connection_date) {
                errors.actual_connection_date = 'Дата фактического включения должна быть позже даты отключения';
            }
            
            if (Object.keys(errors).length > 0) {
                setEditingErrors(errors);
                setIsEditing(false);
                return;
            }
            
            const formatDate = (date: Date | null): string | null => {
                return date ? date.toISOString().split('T')[0] : null;
            };
            
            const updateData = {
                planned_disconnection_date: formatDate(editingSchedule.planned_disconnection_date),
                actual_disconnection_date: formatDate(editingSchedule.actual_disconnection_date),
                planned_connection_date: formatDate(editingSchedule.planned_connection_date),
                actual_connection_date: formatDate(editingSchedule.actual_connection_date),
                disconnection_order: editingSchedule.disconnection_order || null,
                connection_order: editingSchedule.connection_order || null
            };
            
            await updateMkdSchedule(editingSchedule.id, updateData);
            
            setState(prev => {
                const updatedBuildings = prev.mkdBuildings.map(building => {
                    if (building.id === editingSchedule.id) {
                        return {
                            ...building,
                            planned_disconnection_date: updateData.planned_disconnection_date || undefined,
                            actual_disconnection_date: updateData.actual_disconnection_date || undefined,
                            planned_connection_date: updateData.planned_connection_date || undefined,
                            actual_connection_date: updateData.actual_connection_date || undefined,
                            disconnection_order: updateData.disconnection_order || undefined,
                            connection_order: updateData.connection_order || undefined
                        };
                    }
                    return building;
                });
                
                return {
                    ...prev,
                    mkdBuildings: updatedBuildings
                };
            });
            
            setEditSuccessMessage('График успешно обновлен');
            setTimeout(() => {
                setShowEditModal(false);
                setEditSuccessMessage('');
                setEditingSchedule(null);
                setEditingBuildingInfo(null);
            }, 1500);
            
        } catch (error) {
            setEditingErrors({
                general: 'Ошибка при обновлении графика. Пожалуйста, попробуйте снова.'
            });
        } finally {
            setIsEditing(false);
        }
    };

    const handleCancelEdit = () => {
        setShowEditModal(false);
        setEditingSchedule(null);
        setEditingBuildingInfo(null);
        setEditingErrors({});
        setEditSuccessMessage('');
    };

    useEffect(() => {
        const initialize = async () => {
            try {
                setState(prev => ({ ...prev, loading: true, error: null, success: '' }));
                await initializeApi();
                await loadCities();
                await loadMkdBuildings();
            } catch (error) {
                const errorMessage = String(error);

                if (errorMessage.includes('авторизац') || errorMessage.includes('Unauthorized') || errorMessage.includes('Unauthenticated')) {
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
        return sortData(state.mkdBuildings);
    };

    const renderSortIcon = (field: string) => {
        if (field === 'actions') return null;
        
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
                        className={column.id === 'actions' ? '' : 'sort-header'}
                        onClick={() => column.id !== 'actions' && !isResizing && handleSort(column.field)}
                        style={style}
                    >
                        <div className="th-content">
                            {column.title}
                            {renderSortIcon(column.field)}
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

    const getNestedValue = (obj: any, path: string) => {
        if (!path.includes('.')) return obj[path];

        const parts = path.split('.');
        let value = obj;
        for (const part of parts) {
            if (value === null || value === undefined) return '';
            value = value[part];
        }
        return value;
    };

    const renderTableRow = (building: MkdBuilding) => {
        return columns
            .filter(column => column.visible)
            .map(column => {
                if (column.id === 'actions') {
                    return (
                        <td key={`${building.id}-${column.id}`} style={{width: `${column.width}px`, minWidth: `${column.width}px`}}>
                            <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handleEditSchedule(building)}
                                title="Редактировать график"
                            >
                                <i className="ti ti-edit"></i>
                            </Button>
                        </td>
                    );
                }
                
                const style = {
                    width: `${column.width}px`,
                    minWidth: `${column.width}px`
                };

                const value = getNestedValue(building, column.field);

                if (column.field.includes('date') && value) {
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) {
                        const formattedDate = date.toLocaleDateString('ru-RU');
                        return (
                            <td
                                key={`${building.id}-${column.id}`}
                                style={style}
                            >
                                {formattedDate}
                            </td>
                        );
                    }
                }

                return (
                    <td
                        key={`${building.id}-${column.id}`}
                        style={style}
                    >
                        {value || '-'}
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
                                <h5 className="m-b-10">Графики включения/отключения МКД</h5>
                            </div>
                            <ul className="breadcrumb">
                                <li className="breadcrumb-item">
                                    <Link to="/dashboard">Главная</Link>
                                </li>
                                <li className="breadcrumb-item">Реестры/Инвентаризация</li>
                                <li className="breadcrumb-item">ОКИ</li>
                                <li className="breadcrumb-item">Теплоснабжение</li>
                                <li className="breadcrumb-item">Графики включения/отключения МКД</li>
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

                            <Row className="justify-content-between mb-3 g-3">
                                <Col md={9}>
                                    <Row className="g-2">
                                        <Col md={3}>
                                            <Form.Group>
                                                <Form.Label>Город</Form.Label>
                                                <Form.Select
                                                    value={activeFilters.cityId?.toString() || ''}
                                                    onChange={(e) => handleCityChange(e.target.value)}
                                                    disabled={state.loading || authError}
                                                >
                                                    <option value="">Все города</option>
                                                    {filterOptions.cities.map(city => (
                                                        <option key={city.id} value={city.id}>
                                                            {city.name}
                                                        </option>
                                                    ))}
                                                </Form.Select>
                                            </Form.Group>
                                        </Col>
                                        <Col md={3}>
                                            <Form.Group>
                                                <Form.Label>Улица</Form.Label>
                                                <Form.Select
                                                    value={activeFilters.streetId?.toString() || ''}
                                                    onChange={(e) => handleStreetChange(e.target.value)}
                                                    disabled={!activeFilters.cityId || state.loading || authError}
                                                >
                                                    <option value="">Все улицы</option>
                                                    {filterOptions.streets.map(street => (
                                                        <option key={street.id} value={street.id}>
                                                            {street.name}
                                                        </option>
                                                    ))}
                                                </Form.Select>
                                            </Form.Group>
                                        </Col>
                                        <Col md={3}>
                                            <Form.Group>
                                                <Form.Label>Адрес</Form.Label>
                                                <Form.Select
                                                    value={activeFilters.addressId?.toString() || ''}
                                                    onChange={(e) => handleAddressChange(e.target.value)}
                                                    disabled={!activeFilters.streetId || state.loading || authError}
                                                >
                                                    <option value="">Все адреса</option>
                                                    {filterOptions.addresses.map(address => (
                                                        <option key={address.id} value={address.id}>
                                                            {address.name}
                                                        </option>
                                                    ))}
                                                </Form.Select>
                                            </Form.Group>
                                        </Col>
                                        <Col md={2}>
                                            <Form.Group>
                                                <Form.Label>Год постройки</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    placeholder="Введите год"
                                                    value={activeFilters.buildingYear}
                                                    onChange={(e) => setActiveFilters(prev => ({ ...prev, buildingYear: e.target.value }))}
                                                    disabled={state.loading || authError}
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md="auto" className="d-flex align-items-end">
                                            <div className="d-flex gap-2 mb-2">
                                                <Button
                                                    variant="primary"
                                                    onClick={applyFilters}
                                                    disabled={state.loading || authError}
                                                >
                                                    <i className="ti ti-filter me-1"></i>
                                                    Применить
                                                </Button>
                                                <Button
                                                    variant="outline-secondary"
                                                    onClick={resetFilters}
                                                    disabled={state.loading || authError ||
                                                        (!activeFilters.cityId && !activeFilters.streetId &&
                                                        !activeFilters.addressId && !activeFilters.buildingYear && !activeFilters.regionId)}
                                                >
                                                    <i className="ti ti-filter-off me-1"></i>
                                                    Сбросить
                                                </Button>
                                            </div>
                                        </Col>
                                    </Row>
                                </Col>
                                <Col md="auto">
                                    <div className="d-flex gap-2 align-items-end mb-2">
                                        <Button
                                            variant="light-secondary"
                                            onClick={() => setShowColumnsSettings(true)}
                                            title="Настройки таблицы"
                                        >
                                            <i className="ti ti-table-options me-1"></i>
                                            Настройки
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={handleExportToExcel}
                                            disabled={state.loading || authError}
                                        >
                                            <i className="ph-duotone ph-file-excel me-1"></i>
                                            ЭКСПОРТ
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
                                        {state.mkdBuildings.length === 0 ? (
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
                                                        {getSortedData().map((building: MkdBuilding) => (
                                                            <tr key={building.id}>
                                                                {renderTableRow(building)}
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

            {/* Edit Schedule Modal */}
            <Modal 
                show={showEditModal} 
                onHide={handleCancelEdit}
                backdrop="static"
                size="lg"
            >
                <Modal.Header closeButton>
                    <Modal.Title>Редактирование графика</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {editSuccessMessage ? (
                        <Alert variant="success">
                            {editSuccessMessage}
                        </Alert>
                    ) : (
                        <>
                            {editingErrors.general && (
                                <Alert variant="danger">
                                    {editingErrors.general}
                                </Alert>
                            )}
                            
                            {editingBuildingInfo && (
                                <div className="mb-4">
                                    <div className="d-flex">
                                        <div className="flex-grow-1">
                                            <h5 className="text-primary mb-1">
                                                {editingBuildingInfo.address}
                                            </h5>
                                            <div className="text-muted small">
                                                {editingBuildingInfo.settlement}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <Row className="mb-4">
                                <Col md={6}>
                                    <Card className="border-0 shadow-sm h-100">
                                        <Card.Header className="bg-light">
                                            <h6 className="mb-0">Отключение отопления</h6>
                                        </Card.Header>
                                        <Card.Body>
                                            <Form.Group className="mb-3">
                                                <Form.Label>Плановая дата отключения</Form.Label>
                                                <InputGroup>
                                                    <DatePicker
                                                        selected={editingSchedule?.planned_disconnection_date}
                                                        onChange={(date: Date | null) => {
                                                            if (editingSchedule) {
                                                                setEditingSchedule({
                                                                    ...editingSchedule,
                                                                    planned_disconnection_date: date
                                                                });
                                                            }
                                                        }}
                                                        dateFormat="dd.MM.yyyy"
                                                        className="form-control"
                                                        placeholderText="Выберите дату"
                                                        isClearable
                                                    />
                                                    <Button 
                                                        variant="outline-secondary"
                                                        onClick={() => {
                                                            if (editingSchedule) {
                                                                setEditingSchedule({
                                                                    ...editingSchedule,
                                                                    planned_disconnection_date: null
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        <i className="ti ti-x"></i>
                                                    </Button>
                                                </InputGroup>
                                            </Form.Group>
                                            
                                            <Form.Group className="mb-3">
                                                <Form.Label>Фактическая дата отключения</Form.Label>
                                                <InputGroup>
                                                    <DatePicker
                                                        selected={editingSchedule?.actual_disconnection_date}
                                                        onChange={(date: Date | null) => {
                                                            if (editingSchedule) {
                                                                setEditingSchedule({
                                                                    ...editingSchedule,
                                                                    actual_disconnection_date: date
                                                                });
                                                            }
                                                        }}
                                                        dateFormat="dd.MM.yyyy"
                                                        className="form-control"
                                                        placeholderText="Выберите дату"
                                                        isClearable
                                                    />
                                                    <Button 
                                                        variant="outline-secondary"
                                                        onClick={() => {
                                                            if (editingSchedule) {
                                                                setEditingSchedule({
                                                                    ...editingSchedule,
                                                                    actual_disconnection_date: null
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        <i className="ti ti-x"></i>
                                                    </Button>
                                                </InputGroup>
                                            </Form.Group>
                                            
                                            <Form.Group className="mb-0">
                                                <Form.Label>Номер приказа об отключении</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    placeholder="Введите номер приказа"
                                                    value={editingSchedule?.disconnection_order || ''}
                                                    onChange={(e) => {
                                                        if (editingSchedule) {
                                                            setEditingSchedule({
                                                                ...editingSchedule,
                                                                disconnection_order: e.target.value
                                                            });
                                                        }
                                                    }}
                                                />
                                            </Form.Group>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                
                                <Col md={6}>
                                    <Card className="border-0 shadow-sm h-100">
                                        <Card.Header className="bg-light">
                                            <h6 className="mb-0">Включение отопления</h6>
                                        </Card.Header>
                                        <Card.Body>
                                            <Form.Group className="mb-3">
                                                <Form.Label>Плановая дата включения</Form.Label>
                                                <InputGroup>
                                                    <DatePicker
                                                        selected={editingSchedule?.planned_connection_date}
                                                        onChange={(date: Date | null) => {
                                                            if (editingSchedule) {
                                                                setEditingSchedule({
                                                                    ...editingSchedule,
                                                                    planned_connection_date: date
                                                                });
                                                            }
                                                        }}
                                                        dateFormat="dd.MM.yyyy"
                                                        className={`form-control ${editingErrors.planned_connection_date ? 'is-invalid' : ''}`}
                                                        placeholderText="Выберите дату"
                                                        isClearable
                                                    />
                                                    <Button 
                                                        variant="outline-secondary"
                                                        onClick={() => {
                                                            if (editingSchedule) {
                                                                setEditingSchedule({
                                                                    ...editingSchedule,
                                                                    planned_connection_date: null
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        <i className="ti ti-x"></i>
                                                    </Button>
                                                </InputGroup>
                                                {editingErrors.planned_connection_date && (
                                                    <div className="invalid-feedback d-block">
                                                        {editingErrors.planned_connection_date}
                                                    </div>
                                                )}
                                            </Form.Group>
                                            
                                            <Form.Group className="mb-3">
                                                <Form.Label>Фактическая дата включения</Form.Label>
                                                <InputGroup>
                                                    <DatePicker
                                                        selected={editingSchedule?.actual_connection_date}
                                                        onChange={(date: Date | null) => {
                                                            if (editingSchedule) {
                                                                setEditingSchedule({
                                                                    ...editingSchedule,
                                                                    actual_connection_date: date
                                                                });
                                                            }
                                                        }}
                                                        dateFormat="dd.MM.yyyy"
                                                        className={`form-control ${editingErrors.actual_connection_date ? 'is-invalid' : ''}`}
                                                        placeholderText="Выберите дату"
                                                        isClearable
                                                    />
                                                    <Button 
                                                        variant="outline-secondary"
                                                        onClick={() => {
                                                            if (editingSchedule) {
                                                                setEditingSchedule({
                                                                    ...editingSchedule,
                                                                    actual_connection_date: null
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        <i className="ti ti-x"></i>
                                                    </Button>
                                                </InputGroup>
                                                {editingErrors.actual_connection_date && (
                                                    <div className="invalid-feedback d-block">
                                                        {editingErrors.actual_connection_date}
                                                    </div>
                                                )}
                                            </Form.Group>
                                            
                                            <Form.Group className="mb-0">
                                                <Form.Label>Номер приказа о включении</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    placeholder="Введите номер приказа"
                                                    value={editingSchedule?.connection_order || ''}
                                                    onChange={(e) => {
                                                        if (editingSchedule) {
                                                            setEditingSchedule({
                                                                ...editingSchedule,
                                                                connection_order: e.target.value
                                                            });
                                                        }
                                                    }}
                                                />
                                            </Form.Group>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button 
                        variant="secondary" 
                        onClick={handleCancelEdit}
                        disabled={isEditing}
                    >
                        Отмена
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={handleSaveSchedule}
                        disabled={isEditing || !!editSuccessMessage}
                    >
                        {isEditing ? (
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
                        ) : 'Сохранить'}
                    </Button>
                </Modal.Footer>
            </Modal>

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

            <style>{`
                .cursor-pointer {
                    cursor: pointer;
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

                .f-w-600 {
                    font-weight: 600;
                }
                
                .react-datepicker-wrapper {
                    display: block;
                    width: 100%;
                }
            `}</style>
        </React.Fragment>
    );
};

export default MkdSchedules;