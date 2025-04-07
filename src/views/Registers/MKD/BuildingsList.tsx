import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Button, Dropdown, Form, InputGroup, Spinner, Alert, Pagination, Offcanvas, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
    getMultiApartmentBuildings,
    searchMultiApartmentBuildings,
    exportMultiApartmentBuildingsToExcel,
    initializeApi,
    createMultiApartmentBuilding,
    updateMultiApartmentBuilding,
    deleteMultiApartmentBuilding,
    getMultiApartmentBuildingDetails,
    getMultiApartmentBuildingRawDetails,
    getManagementCompanies,
    getTechnicalConditions,
    getAddresses,
    searchAddresses
} from '../../../services/mkdApi'; // Added searchAddresses import
import {
    MultiApartmentBuilding,
    MultiApartmentBuildingState,
    ApiMultiApartmentBuildingRequest,
    TableColumn,
    BuildingFormData
} from '../../../types/multiApartmentBuilding'; // Ensure this path is correct
import DeleteModal from "../../../Common/DeleteModal"; // Ensure this path is correct

interface ManagementCompany {
    id: number;
    name: string;
    shortName?: string;
    fullName?: string;
}

interface TechnicalCondition {
    id: number;
    name?: string;
    houseCondition?: string;
}

interface City {
    id: number;
    name: string;
    region_id: number | null;
}

const MAX_API_RETRY_ATTEMPTS = 3;

const BuildingsList: React.FC = () => {
    const [state, setState] = useState<MultiApartmentBuildingState>({
        buildings: [],
        loading: true,
        error: null,
        selectedSettlement: null,
        searchQuery: '',
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        success: ''
    });

    const [activeFilters, setActiveFilters] = useState({
        settlement: '',
        managementCompany: ''
    });

    const [filterOptions, setFilterOptions] = useState({
        settlements: [] as string[],
        managementCompanies: [] as string[]
    });

    const [columns, setColumns] = useState<TableColumn[]>([
        { id: 'id', title: '№', width: 70, visible: true, field: 'id' },
        { id: 'address', title: 'АДРЕС', width: 200, visible: true, field: 'address' },
        { id: 'settlement', title: 'НАСЕЛЁННЫЙ ПУНКТ', width: 150, visible: true, field: 'settlement' },
        { id: 'yearBuilt', title: 'ГОД ПОСТРОЙКИ', width: 120, visible: true, field: 'yearBuilt' },
        { id: 'floors', title: 'ЭТАЖНОСТЬ', width: 100, visible: true, field: 'floors' },
        { id: 'entrances', title: 'ПОДЪЕЗДЫ', width: 100, visible: true, field: 'entrances' },
        { id: 'apartments', title: 'КВАРТИРЫ', width: 100, visible: true, field: 'apartments' },
        { id: 'totalArea', title: 'ОБЩАЯ ПЛОЩАДЬ', width: 120, visible: true, field: 'totalArea' },
        { id: 'managementCompany', title: 'УПРАВЛЯЮЩАЯ КОМПАНИЯ', width: 200, visible: true, field: 'managementCompany' },
        { id: 'technicalCondition', title: 'ТЕХ. СОСТОЯНИЕ', width: 150, visible: true, field: 'technicalCondition' },
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
    const [currentItem, setCurrentItem] = useState<MultiApartmentBuilding | null>(null);
    const [currentRawItem, setCurrentRawItem] = useState<any>(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [managementCompanies, setManagementCompanies] = useState<ManagementCompany[]>([]);
    const [technicalConditions, setTechnicalConditions] = useState<TechnicalCondition[]>([]);
    const [addresses, setAddresses] = useState<{id: number, fullAddress: string}[]>([]);
    const [formData, setFormData] = useState<BuildingFormData>({
        address: '',
        address_id: 1,
        settlement: '',
        buildingYear: '',
        maxFloorCount: '',
        entrances: '',
        apartments: '',
        totalArea: '',
        managementOrganizationId: 1,
        houseConditionId: 1,
        cadastreNumber: ''
    });

    // Состояния, связанные с поиском адреса
    const [addressSearchQuery, setAddressSearchQuery] = useState('');
    const [isAddressSearching, setIsAddressSearching] = useState(false);
    const [selectedCity, setSelectedCity] = useState<City | null>(null);
    // const [cities, setCities] = useState<City[]>([]);  <-- УДАЛЕНО, чтобы не возникало ошибки "значение никогда не читается"
    const [addressSearchResults, setAddressSearchResults] = useState<{id: number, fullAddress: string}[]>([]);
    const [showAddressSearchResults, setShowAddressSearchResults] = useState(false);

    const [isResizing, setIsResizing] = useState(false);
    const tableRef = useRef<HTMLTableElement>(null);
    const addressSearchRef = useRef<HTMLDivElement>(null);

    // Закрываем выпадающий список адресов при клике вне его области
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (addressSearchRef.current && !addressSearchRef.current.contains(event.target as Node)) {
                setShowAddressSearchResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const findCompanyIdByName = (name: string): number => {
        const found = managementCompanies.find((company: ManagementCompany) => {
            return (company.name === name || company.shortName === name);
        });
        return found ? found.id : 1;
    };

    const findConditionIdByName = (name: string): number => {
        const found = technicalConditions.find((condition: TechnicalCondition) => {
            return (condition.houseCondition === name || condition.name === name);
        });
        return found ? found.id : 1;
    };

    // Загрузка (или установка) текущего города
    const loadCities = async () => {
        try {
            // Если нужно получить города с бэкенда – вызовите метод getCities или подобный
            // Например: const cityData = await getCities();
            // Для примера, жёстко зададим Воронеж:
            setSelectedCity({ id: 2, name: 'Воронеж', region_id: null });
        } catch (error) {
            console.error('Error loading cities:', error);
        }
    };

    const loadAddresses = async () => {
        try {
            setFormLoading(true);
            const addressData = await getAddresses();
            setAddresses(addressData);
            setFormLoading(false);
        } catch (error) {
            setFormLoading(false);
        }
    };

    // Функция для поиска адресов
    const handleAddressSearch = async () => {
        if (!addressSearchQuery.trim() || !selectedCity) return;
        
        try {
            setIsAddressSearching(true);
            // Вызываем searchAddresses, передавая ID города и поисковый запрос
            const results = await searchAddresses(selectedCity.id, addressSearchQuery);
            setAddressSearchResults(results);
            setShowAddressSearchResults(true);
        } catch (error) {
            console.error('Error searching addresses:', error);
        } finally {
            setIsAddressSearching(false);
        }
    };

    // Обработка выбора адреса из результатов поиска
    const handleSelectAddress = (address: {id: number, fullAddress: string}) => {
        setFormData(prev => ({
            ...prev,
            address_id: address.id,
            address: address.fullAddress
        }));
        setShowAddressSearchResults(false);
        setAddressSearchQuery(address.fullAddress);
    };

    const formToApiData = (formData: BuildingFormData, currentItemData?: any): ApiMultiApartmentBuildingRequest => {
        const apiData: ApiMultiApartmentBuildingRequest = {
            entrance_count: formData.entrances ? parseInt(formData.entrances, 10) : null,
            buildingYear: formData.buildingYear || String(new Date().getFullYear()),
            house_condition_id: formData.houseConditionId,
            house_type_id: 1,
            management_org_id: formData.managementOrganizationId,
            municipality_org_id: 1,
            planSeries: "Индивидуальный",
            status: "APPROVED",
            address_id: formData.address_id || 1,
            cadastreNumber: formData.cadastreNumber || "",
            floors: formData.maxFloorCount,
            apartments: formData.apartments,
            totalArea: formData.totalArea
        };

        if (currentItemData) {
            apiData.address_id = currentItemData.address_id || formData.address_id || 1;
            apiData.cadastreNumber = currentItemData.cadastreNumber || formData.cadastreNumber || "36:34:0602001:00000";
        }

        return apiData;
    };

    const apiToFormData = (apiData: MultiApartmentBuilding, rawData?: any): BuildingFormData => {
        const formData: BuildingFormData = {
            address: apiData.address,
            address_id: rawData?.address_id || 1,
            settlement: apiData.settlement,
            buildingYear: rawData?.buildingYear || apiData.yearBuilt,
            maxFloorCount: rawData?.entrance_count ? String(rawData.entrance_count) : apiData.floors,
            entrances: rawData?.entrance_count ? String(rawData.entrance_count) : apiData.entrances,
            apartments: apiData.apartments,
            totalArea: apiData.totalArea,
            managementOrganizationId: rawData?.management_org_id || findCompanyIdByName(apiData.managementCompany),
            houseConditionId: rawData?.house_condition_id || findConditionIdByName(apiData.technicalCondition),
            cadastreNumber: rawData?.cadastreNumber || ""
        };

        return formData;
    };

    useEffect(() => {
        // Загружаем «город» при первом рендере
        loadCities();

        const savedColumns = localStorage.getItem('buildingsListColumns');
        if (savedColumns) {
            try {
                const parsedColumns = JSON.parse(savedColumns);
                setColumns(parsedColumns);
                setIsTableCustomized(true);
            } catch (e) {
                // Ошибка чтения сохранённых настроек
            }
        }
    }, []);

    useEffect(() => {
        if (isTableCustomized) {
            localStorage.setItem('buildingsListColumns', JSON.stringify(columns));
        }
    }, [columns, isTableCustomized]);

    // Дебаунс-поиск адреса
    useEffect(() => {
        const delaySearch = setTimeout(() => {
            if (addressSearchQuery.trim()) {
                handleAddressSearch();
            }
        }, 500); // Задержка в 500 мс
        
        return () => clearTimeout(delaySearch);
    }, [addressSearchQuery]);

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
            { id: 'address', title: 'АДРЕС', width: 200, visible: true, field: 'address' },
            { id: 'settlement', title: 'НАСЕЛЁННЫЙ ПУНКТ', width: 150, visible: true, field: 'settlement' },
            { id: 'yearBuilt', title: 'ГОД ПОСТРОЙКИ', width: 120, visible: true, field: 'yearBuilt' },
            { id: 'floors', title: 'ЭТАЖНОСТЬ', width: 100, visible: true, field: 'floors' },
            { id: 'entrances', title: 'ПОДЪЕЗДЫ', width: 100, visible: true, field: 'entrances' },
            { id: 'apartments', title: 'КВАРТИРЫ', width: 100, visible: true, field: 'apartments' },
            { id: 'totalArea', title: 'ОБЩАЯ ПЛОЩАДЬ', width: 120, visible: true, field: 'totalArea' },
            { id: 'managementCompany', title: 'УПРАВЛЯЮЩАЯ КОМПАНИЯ', width: 200, visible: true, field: 'managementCompany' },
            { id: 'technicalCondition', title: 'ТЕХ. СОСТОЯНИЕ', width: 150, visible: true, field: 'technicalCondition' },
            { id: 'actions', title: 'ДЕЙСТВИЯ', width: 130, visible: true, field: 'actions' }
        ];
        setColumns(defaultColumns);
        localStorage.removeItem('buildingsListColumns');
        setIsTableCustomized(false);
        setShowColumnsSettings(false);
    };

    const loadReferences = async () => {
        try {
            setFormLoading(true);
            const [companiesData, conditionsData] = await Promise.all([
                getManagementCompanies(),
                getTechnicalConditions()
            ]);

            let companies = Array.isArray(companiesData) ? companiesData : [];
            if (companies.length > 0 && typeof companies[0] === 'object' && !('id' in companies[0])) {
                companies = [];
            }

            let conditions = Array.isArray(conditionsData) ? conditionsData : [];
            if (conditions.length > 0 && typeof conditions[0] === 'object' && !('id' in conditions[0])) {
                conditions = [];
            }

            setManagementCompanies(companies);
            setTechnicalConditions(conditions);
            setFormLoading(false);
        } catch (error) {
            setFormLoading(false);
        }
    };

    const sortData = (data: MultiApartmentBuilding[]): MultiApartmentBuilding[] => {
        return [...data].sort((a, b) => {
            let aValue = a[sortField as keyof MultiApartmentBuilding];
            let bValue = b[sortField as keyof MultiApartmentBuilding];

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
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const loadBuildings = async (page = 1) => {
        setState(prev => ({ ...prev, loading: true, error: null, success: '' }));

        setActiveFilters({
            settlement: '',
            managementCompany: ''
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
            const data = await getMultiApartmentBuildings(page);
            setApiSuccessful(true);
            extractFilterOptions(data.items);

            setState(prev => ({
                ...prev,
                buildings: data.items,
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
            await loadBuildings();
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
                settlement: '',
                managementCompany: ''
            });
            await loadBuildings();
        } catch (error) {
            setState(prev => ({
                ...prev,
                error: 'Ошибка при обновлении данных. Пожалуйста, попробуйте позже.',
                loading: false,
                success: ''
            }));
        }
    };

    const extractFilterOptions = (data: MultiApartmentBuilding[]) => {
        const settlements = new Set<string>();
        const companies = new Set<string>();

        data.forEach(item => {
            if (item.settlement) settlements.add(item.settlement);
            if (item.managementCompany) companies.add(item.managementCompany);
        });

        setFilterOptions({
            settlements: Array.from(settlements).sort((a, b) => a.localeCompare(b, 'ru')),
            managementCompanies: Array.from(companies).sort((a, b) => a.localeCompare(b, 'ru'))
        });
    };

    const applyFilters = async () => {
        setState(prev => ({ ...prev, loading: true, error: null, success: '' }));

        try {
            let data: {
                items: MultiApartmentBuilding[];
                currentPage: number;
                totalPages: number;
                totalItems: number;
            };

            if (!activeFilters.settlement && !activeFilters.managementCompany) {
                data = await getMultiApartmentBuildings(state.currentPage);
                setState(prev => ({
                    ...prev,
                    buildings: data.items,
                    currentPage: data.currentPage,
                    totalPages: data.totalPages,
                    totalItems: data.totalItems,
                    loading: false,
                    error: null,
                    success: 'success'
                }));
            } else {
                const allData = await getMultiApartmentBuildings(1);
                let filteredData = allData.items;

                if (activeFilters.settlement) {
                    filteredData = filteredData.filter(item =>
                        item.settlement === activeFilters.settlement
                    );
                }

                if (activeFilters.managementCompany) {
                    filteredData = filteredData.filter(item =>
                        item.managementCompany === activeFilters.managementCompany
                    );
                }

                setState(prev => ({
                    ...prev,
                    buildings: filteredData,
                    loading: false,
                    error: null,
                    success: 'success',
                    currentPage: 1,
                    totalPages: 1,
                    totalItems: filteredData.length
                }));
            }
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

    const handleFilterChange = (filterType: 'settlement' | 'managementCompany', value: string) => {
        setActiveFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

    const resetFilters = () => {
        setActiveFilters({
            settlement: '',
            managementCompany: ''
        });
        loadBuildings();
    };

    const handleSearch = async () => {
        if (!searchInput.trim()) {
            return loadBuildings();
        }

        setState(prev => ({ ...prev, loading: true, error: null, searchQuery: searchInput, success: '' }));

        try {
            const data = await searchMultiApartmentBuildings(searchInput);
            setApiSuccessful(true);
            setState(prev => ({
                ...prev,
                buildings: data,
                loading: false,
                error: null,
                success: 'success'
            }));
        } catch (error) {
            setApiRetryCount(prev => prev + 1);
            setState(prev => ({
                ...prev,
                error: `Ошибка при поиске данных. Попытка ${apiRetryCount + 1}/${MAX_API_RETRY_ATTEMPTS}`,
                loading: false,
                success: ''
            }));
        }
    };

    const handleExportToExcel = async () => {
        try {
            setState(prev => ({ ...prev, loading: true, error: null, success: '' }));

            const now = new Date();
            const dateStr = `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;
            const timeStr = `${now.getHours()}-${now.getMinutes()}`;
            const blob = await exportMultiApartmentBuildingsToExcel();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `МКД_${dateStr}_${timeStr}.csv`;
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

    const handleViewDetails = async (id: number) => {
        try {
            setFormLoading(true);
            const details = await getMultiApartmentBuildingDetails(id);
            setCurrentItem(details);
            setFormLoading(false);
            setShowDetailsModal(true);
        } catch (error) {
            setFormLoading(false);
        }
    };

    const handleEditRecord = async (id: number) => {
        try {
            setFormError(null);
            setFormLoading(true);

            if (managementCompanies.length === 0 || technicalConditions.length === 0) {
                await loadReferences();
            }
            
            // Для надёжности загружаем все адреса
            await loadAddresses();

            const details = await getMultiApartmentBuildingDetails(id);
            setCurrentItem(details);

            const rawDetails = await getMultiApartmentBuildingRawDetails(id);
            setCurrentRawItem(rawDetails);

            const formData = apiToFormData(details, rawDetails);
            if (!formData.address_id && rawDetails && rawDetails.address_id) {
                formData.address_id = rawDetails.address_id;
            }
            
            // Ставим в поле поиска адресов текущий адрес
            setAddressSearchQuery(formData.address);

            setFormData(formData);
            setFormLoading(false);
            setShowEditOffcanvas(true);
        } catch (error) {
            setFormLoading(false);
            setFormError('Не удалось загрузить данные для редактирования');
        }
    };

    const handleAddNew = async () => {
        setFormError(null);
        setCurrentItem(null);
        setCurrentRawItem(null);
        setFormLoading(true);

        try {
            if (managementCompanies.length === 0 || technicalConditions.length === 0) {
                await loadReferences();
            }
            await loadAddresses();
        } catch (error) {
            // Обработка ошибки при загрузке справочников / адресов
        }
        setFormLoading(false);

        setFormData({
            address: '',
            address_id: addresses.length > 0 ? addresses[0].id : 1,
            settlement: '',
            buildingYear: String(new Date().getFullYear()),
            maxFloorCount: '',
            entrances: '',
            apartments: '',
            totalArea: '',
            managementOrganizationId: managementCompanies.length > 0 ? managementCompanies[0].id : 1,
            houseConditionId: technicalConditions.length > 0 ? technicalConditions[0].id : 1,
            cadastreNumber: ""
        });
        
        // Сброс поиска адресов
        setAddressSearchQuery('');
        setAddressSearchResults([]);
        
        setShowEditOffcanvas(true);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: ['managementOrganizationId', 'houseConditionId', 'address_id'].includes(name)
                ? parseInt(value, 10)
                : value
        }));

        if (name === 'address_id') {
            const addressId = parseInt(value, 10);
            const selectedAddress = addresses.find(addr => addr.id === addressId);
            if (selectedAddress) {
                setFormData(prev => ({
                    ...prev,
                    address_id: addressId,
                    address: selectedAddress.fullAddress
                }));
                setAddressSearchQuery(selectedAddress.fullAddress);
            }
        }
    };

    const handleSaveForm = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setFormError(null);
            setFormLoading(true);

            if (!formData.address_id) {
                setFormError('Адрес обязателен для заполнения');
                setFormLoading(false);
                return;
            }

            if (currentItem) {
                const apiData = formToApiData(formData, currentRawItem);
                await updateMultiApartmentBuilding(currentItem.id, apiData);
            } else {
                const apiData = formToApiData(formData);
                await createMultiApartmentBuilding(apiData);
            }

            setFormLoading(false);
            setShowEditOffcanvas(false);
            await loadBuildings(state.currentPage);
        } catch (error) {
            setFormLoading(false);
            if (String(error).includes('недостаточно прав') ||
                String(error).includes('403') ||
                String(error).includes('Forbidden')) {
                setFormError('У вас недостаточно прав для выполнения этой операции. Обратитесь к администратору.');
            } else {
                setFormError('Ошибка сохранения данных: ' + String(error));
            }
        }
    };

    const handleDeletePrompt = (item: MultiApartmentBuilding) => {
        setCurrentItem(item);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!currentItem) return;

        try {
            setFormLoading(true);
            await deleteMultiApartmentBuilding(currentItem.id);
            setFormLoading(false);
            setShowDeleteModal(false);
            await loadBuildings(state.currentPage);
        } catch (error) {
            setFormLoading(false);
            if (String(error).includes('недостаточно прав') ||
                String(error).includes('403') ||
                String(error).includes('Forbidden')) {
                setFormError('У вас недостаточно прав для удаления. Обратитесь к администратору.');
            } else {
                setFormError('Ошибка удаления записи: ' + String(error));
            }
        }
    };

    const handlePageChange = (page: number) => {
        loadBuildings(page);
    };

    useEffect(() => {
        const initialize = async () => {
            try {
                setState(prev => ({ ...prev, loading: true, error: null, success: '' }));
                await initializeApi();

                if (managementCompanies.length === 0 || technicalConditions.length === 0) {
                    try {
                        await loadReferences();
                    } catch (refError) {
                       // Обработать ошибку, если справочники не загрузились
                    }
                }

                const response = await getMultiApartmentBuildings();
                extractFilterOptions(response.items);

                setState(prev => ({
                    ...prev,
                    buildings: response.items,
                    currentPage: response.currentPage,
                    totalPages: response.totalPages,
                    totalItems: response.totalItems,
                    loading: false,
                    error: null,
                    success: 'success'
                }));
            } catch (error) {
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        const maxPagesToShow = 5;
        let startPage = Math.max(1, state.currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(state.totalPages, startPage + maxPagesToShow - 1);

        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        if (startPage > 1) {
            items.push(<Pagination.Ellipsis key="start-ellipsis" disabled />);
        }

        for (let i = startPage; i <= endPage; i++) {
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

        if (endPage < state.totalPages) {
            items.push(<Pagination.Ellipsis key="end-ellipsis" disabled />);
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
        return sortData(state.buildings);
    };

    const renderSortIcon = (field: string) => {
        if (field !== sortField) {
            return <i className="ti ti-arrows-sort ms-1 opacity-50"></i>;
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
                        onClick={() => column.id !== 'actions' && !isResizing && handleSort(column.field)}
                        style={style}
                    >
                        <div className="th-content">
                            {column.title}
                            {column.id !== 'actions' && renderSortIcon(column.field)}
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

    const renderTableRow = (building: MultiApartmentBuilding) => {
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
                            key={`${building.id}-${column.id}`}
                            className="text-center"
                            style={style}
                        >
                            <OverlayTrigger placement="top" overlay={<Tooltip id={`tooltip-view-${building.id}`}>Просмотр</Tooltip>}>
                                <i className="ph-duotone ph-info text-info f-18 cursor-pointer me-2" onClick={() => handleViewDetails(building.id)}></i>
                            </OverlayTrigger>
                            <OverlayTrigger placement="top" overlay={<Tooltip id={`tooltip-edit-${building.id}`}>Редактировать</Tooltip>}>
                                <i className="ph-duotone ph-pencil-simple text-primary f-18 cursor-pointer me-2" onClick={() => handleEditRecord(building.id)}></i>
                            </OverlayTrigger>
                            <OverlayTrigger placement="top" overlay={<Tooltip id={`tooltip-delete-${building.id}`}>Удалить</Tooltip>}>
                                <i className="ph-duotone ph-trash text-danger f-18 cursor-pointer" onClick={() => handleDeletePrompt(building)}></i>
                            </OverlayTrigger>
                        </td>
                    );
                }

                const fieldKey = column.field as keyof MultiApartmentBuilding;
                let cellValue: any = building[fieldKey];

                if (cellValue === null || cellValue === undefined || cellValue === '' || String(cellValue).toLowerCase() === 'not specified') {
                    cellValue = <span className="text-muted fst-italic">Не указано</span>;
                } else {
                    cellValue = String(cellValue);
                }

                return (
                    <td key={`${building.id}-${column.id}`} style={style} title={typeof cellValue === 'string' ? cellValue : undefined}>
                        {cellValue}
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
                                <h5 className="m-b-10">Многоквартирные дома</h5>
                            </div>
                            <ul className="breadcrumb">
                                <li className="breadcrumb-item"><Link to="/dashboard">Главная</Link></li>
                                <li className="breadcrumb-item">Реестры</li>
                                <li className="breadcrumb-item">МКД</li>
                                <li className="breadcrumb-item">Список</li>
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
                                    <Button variant="danger" onClick={handleReauth}>Попробовать снова</Button>
                                </Alert>
                            )}

                            {state.error && !authError && (
                                <Alert variant="danger" onClose={() => setState(prev => ({ ...prev, error: null }))} dismissible>
                                    {state.error}
                                    <div className="mt-2">
                                        <Button variant="outline-danger" size="sm" onClick={handleRefreshData}>Попробовать еще раз</Button>
                                    </div>
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
                                            <Button variant="light-secondary" onClick={handleSearch} disabled={state.loading || authError}>Найти</Button>
                                        </InputGroup>
                                    </div>
                                </Col>
                                <Col sm="auto">
                                    <div className="d-flex gap-2 align-items-center">
                                        <Dropdown className="mini-filter">
                                            <Dropdown.Toggle variant="light" size="sm" className="mini-filter-button">
                                                <i className="ti ti-filter me-1"></i>
                                                Фильтр {(activeFilters.settlement || activeFilters.managementCompany) && <span className="filter-indicator"></span>}
                                            </Dropdown.Toggle>
                                            <Dropdown.Menu className="mini-filter-menu">
                                                <div className="filter-content p-2">
                                                    <Form.Group className="mb-2">
                                                        <Form.Label className="mini-filter-label">Населенный пункт</Form.Label>
                                                        <Form.Select size="sm" value={activeFilters.settlement} onChange={(e) => handleFilterChange('settlement', e.target.value)} disabled={state.loading || authError}>
                                                            <option value="">Все населенные пункты</option>
                                                            {filterOptions.settlements.map(settlement => (
                                                                <option key={settlement} value={settlement}>{settlement || 'Не указано'}</option>
                                                            ))}
                                                        </Form.Select>
                                                    </Form.Group>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label className="mini-filter-label">Управляющая компания</Form.Label>
                                                        <Form.Select size="sm" value={activeFilters.managementCompany} onChange={(e) => handleFilterChange('managementCompany', e.target.value)} disabled={state.loading || authError}>
                                                            <option value="">Все УК</option>
                                                            {filterOptions.managementCompanies.map(company => (
                                                                <option key={company} value={company}>{company || 'Не указано'}</option>
                                                            ))}
                                                        </Form.Select>
                                                    </Form.Group>
                                                    <div className="d-flex justify-content-between">
                                                        <Button variant="outline-secondary" size="sm" onClick={resetFilters} disabled={state.loading || authError || (!activeFilters.settlement && !activeFilters.managementCompany)}>Сбросить</Button>
                                                        <Button variant="primary" size="sm" onClick={() => { applyFilters(); document.body.click(); }} disabled={state.loading || authError}>Применить</Button>
                                                    </div>
                                                </div>
                                            </Dropdown.Menu>
                                        </Dropdown>
                                        <Button variant="light-secondary" onClick={() => setShowColumnsSettings(true)} title="Настройки таблицы">
                                            <i className="ti ti-table-options me-1"></i>Настройки
                                        </Button>
                                        <Button variant="primary" onClick={handleAddNew} disabled={state.loading || authError}>
                                            <i className="ph-duotone ph-plus me-1"></i>ДОБАВИТЬ
                                        </Button>
                                        <Button variant="secondary" onClick={handleExportToExcel} disabled={state.loading || authError}>
                                            <i className="ph-duotone ph-file-excel me-1"></i>СОХРАНИТЬ В CSV
                                        </Button>
                                    </div>
                                </Col>
                            </Row>

                            <div className="table-responsive">
                                {state.loading ? (
                                    <div className="text-center py-5">
                                        <Spinner animation="border" role="status"><span className="visually-hidden">Загрузка...</span></Spinner>
                                        <p className="mt-2">Загрузка данных...</p>
                                    </div>
                                ) : (
                                    <>
                                        {state.buildings.length === 0 ? (
                                            <div className="text-center py-5"><p className="mb-0">Нет данных для отображения</p></div>
                                        ) : (
                                            <>
                                                <table className="table table-hover resizable-table" ref={tableRef}>
                                                    <thead><tr>{renderTableHeaders()}</tr></thead>
                                                    <tbody>
                                                        {getSortedData().map((building: MultiApartmentBuilding) => (
                                                            <tr key={building.id}>{renderTableRow(building)}</tr>
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

            {/* Offcanvas для настроек столбцов */}
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
                                    onChange={(e) => handleColumnVisibilityChange(column.id, e.target.checked)}
                                    disabled={column.id === 'actions'}
                                />
                            </Form.Group>
                        ))}
                    </Form>
                    <div className="mt-4">
                        <p className="text-muted mb-2">Для изменения ширины столбцов перетащите правую границу заголовка таблицы.</p>
                        <Button variant="outline-secondary" onClick={resetTableSettings} className="w-100">Сбросить настройки таблицы</Button>
                    </div>
                </Offcanvas.Body>
            </Offcanvas>

            {/* Offcanvas для просмотра деталей */}
            <Offcanvas show={showDetailsModal} onHide={() => setShowDetailsModal(false)} placement="end">
                <Offcanvas.Header closeButton>
                    <Offcanvas.Title className="f-w-600 text-truncate">Детали МКД</Offcanvas.Title>
                </Offcanvas.Header>
                <Offcanvas.Body>
                    {formLoading ? (
                         <div className="text-center py-5">
                             <Spinner animation="border" role="status"><span className="visually-hidden">Загрузка...</span></Spinner>
                             <p className="mt-2">Загрузка данных...</p>
                         </div>
                    ) : (
                        currentItem && <>
                            <div className="d-flex mb-3">
                                <div className="flex-shrink-0"><div className="avtar avtar-xs bg-light-secondary"><i className="ti ti-building f-20"></i></div></div>
                                <div className="flex-grow-1 ms-3">
                                    <h6 className="mb-1"><b>Адрес</b></h6>
                                    <p className="text-muted mb-0">{currentItem.address || 'Не указано'}</p>
                                </div>
                            </div>
                            <div className="d-flex mb-3">
                                <div className="flex-shrink-0"><div className="avtar avtar-xs bg-light-warning"><i className="ti ti-map-pin f-20"></i></div></div>
                                <div className="flex-grow-1 ms-3">
                                    <h6 className="mb-1"><b>Населенный пункт</b></h6>
                                    <p className="text-muted mb-0">{currentItem.settlement || 'Не указано'}</p>
                                </div>
                            </div>
                            <div className="d-flex mb-3">
                                <div className="flex-shrink-0"><div className="avtar avtar-xs bg-light-danger"><i className="ti ti-calendar f-20"></i></div></div>
                                <div className="flex-grow-1 ms-3">
                                    <h6 className="mb-1"><b>Год постройки</b></h6>
                                    <p className="text-muted mb-0">{currentItem.yearBuilt || 'Не указано'}</p>
                                </div>
                            </div>
                            <div className="d-flex mb-3">
                                <div className="flex-shrink-0"><div className="avtar avtar-xs bg-light-primary"><i className="ti ti-stairs f-20"></i></div></div>
                                <div className="flex-grow-1 ms-3">
                                    <h6 className="mb-1"><b>Этажность</b></h6>
                                    <p className="text-muted mb-0">{currentItem.floors || 'Не указано'}</p>
                                </div>
                            </div>
                            <div className="d-flex mb-3">
                                <div className="flex-shrink-0"><div className="avtar avtar-xs bg-light-success"><i className="ti ti-door f-20"></i></div></div>
                                <div className="flex-grow-1 ms-3">
                                    <h6 className="mb-1"><b>Количество подъездов</b></h6>
                                    <p className="text-muted mb-0">{currentItem.entrances || 'Не указано'}</p>
                                </div>
                            </div>
                            <div className="d-flex mb-3">
                                <div className="flex-shrink-0"><div className="avtar avtar-xs bg-light-info"><i className="ti ti-home f-20"></i></div></div>
                                <div className="flex-grow-1 ms-3">
                                    <h6 className="mb-1"><b>Количество квартир</b></h6>
                                    <p className="text-muted mb-0">{currentItem.apartments || 'Не указано'}</p>
                                </div>
                            </div>
                            <div className="d-flex mb-3">
                                <div className="flex-shrink-0"><div className="avtar avtar-xs bg-light-secondary"><i className="ti ti-ruler-measure f-20"></i></div></div>
                                <div className="flex-grow-1 ms-3">
                                    <h6 className="mb-1"><b>Общая площадь</b></h6>
                                    <p className="text-muted mb-0">{currentItem.totalArea ? `${currentItem.totalArea} м²` : 'Не указано'}</p>
                                </div>
                            </div>
                            <div className="d-flex mb-3">
                                <div className="flex-shrink-0"><div className="avtar avtar-xs bg-light-warning"><i className="ti ti-building-community f-20"></i></div></div>
                                <div className="flex-grow-1 ms-3">
                                    <h6 className="mb-1"><b>Управляющая компания</b></h6>
                                    <p className="text-muted mb-0">{currentItem.managementCompany || 'Не указано'}</p>
                                </div>
                            </div>
                            <div className="d-flex mb-3">
                                <div className="flex-shrink-0"><div className="avtar avtar-xs bg-light-danger"><i className="ti ti-tools f-20"></i></div></div>
                                <div className="flex-grow-1 ms-3">
                                    <h6 className="mb-1"><b>Техническое состояние</b></h6>
                                    <p className="text-muted mb-0">{currentItem.technicalCondition || 'Не указано'}</p>
                                </div>
                            </div>
                        </>
                    )}
                </Offcanvas.Body>
            </Offcanvas>

            {/* Offcanvas для создания/редактирования */}
            <Offcanvas
                show={showEditOffcanvas}
                onHide={() => {
                    setShowEditOffcanvas(false);
                    setFormError(null);
                    setCurrentItem(null);
                    setCurrentRawItem(null);
                    setAddressSearchQuery('');
                    setAddressSearchResults([]);
                }}
                placement="end"
                style={{ width: '500px', display: 'flex', flexDirection: 'column' }}
                backdrop="static"
            >
                <Offcanvas.Header closeButton>
                    <Offcanvas.Title className="f-w-600 text-truncate">
                        {currentItem ? 'Редактирование МКД' : 'Добавление МКД'}
                    </Offcanvas.Title>
                </Offcanvas.Header>

                <Form id="building-form" onSubmit={handleSaveForm} className="d-flex flex-column flex-grow-1 overflow-hidden">
                    <Offcanvas.Body style={{ flexGrow: 1, overflowY: 'auto' }}>
                        {formLoading ? (
                            <div className="text-center py-5">
                                <Spinner animation="border" role="status"><span className="visually-hidden">Загрузка...</span></Spinner>
                                <p className="mt-2">Загрузка данных...</p>
                            </div>
                        ) : (
                            <Row className="event-form g-3">
                                {formError && (
                                    <Col xs={12}><Alert variant="danger">{formError}</Alert></Col>
                                )}
                                
                                {/* Поле ввода для поиска адреса */}
                                <Col xs={12}>
                                    <Form.Group controlId="building-address-search">
                                        <Form.Label>Поиск адреса*</Form.Label>
                                        <div ref={addressSearchRef} className="position-relative">
                                            <InputGroup>
                                                <Form.Control
                                                    type="text"
                                                    placeholder="Введите адрес для поиска..."
                                                    value={addressSearchQuery}
                                                    onChange={(e) => setAddressSearchQuery(e.target.value)}
                                                    autoComplete="off"
                                                />
                                                {isAddressSearching ? (
                                                    <InputGroup.Text><Spinner animation="border" size="sm" /></InputGroup.Text>
                                                ) : (
                                                    <Button 
                                                        variant="outline-secondary" 
                                                        onClick={() => {
                                                            setAddressSearchQuery('');
                                                            setAddressSearchResults([]);
                                                        }}
                                                        disabled={!addressSearchQuery.trim()}
                                                    >
                                                        <i className="ti ti-x"></i>
                                                    </Button>
                                                )}
                                            </InputGroup>
                                            
                                            {/* Результаты поиска */}
                                            {showAddressSearchResults && addressSearchResults.length > 0 && (
                                                <div className="address-search-results">
                                                    {addressSearchResults.map(address => (
                                                        <div 
                                                            key={address.id} 
                                                            className="address-search-item"
                                                            onClick={() => handleSelectAddress(address)}
                                                        >
                                                            {address.fullAddress}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            {/* Сообщение о том, что ничего не найдено */}
                                            {showAddressSearchResults && addressSearchQuery.trim() && addressSearchResults.length === 0 && !isAddressSearching && (
                                                <div className="address-search-results">
                                                    <div className="address-search-no-results">
                                                        Адреса не найдены. Измените запрос или выберите из списка ниже.
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <Form.Text className="text-muted">Поиск по адресу выполняется автоматически по мере ввода текста.</Form.Text>
                                    </Form.Group>
                                </Col>
                                
                                {/* Дропдаун как запасной вариант выбора адреса */}
                                <Col xs={12}>
                                    <Form.Group controlId="building-address">
                                        <Form.Label>Или выберите из списка</Form.Label>
                                        <Form.Select name="address_id" value={formData.address_id || ''} onChange={handleFormChange} required>
                                            {addresses.length === 0 && <option value="">Загрузка адресов...</option>}
                                            {addresses.map(address => (
                                                <option key={address.id} value={address.id}>{address.fullAddress}</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                
                                <Col xs={6}>
                                    <Form.Group controlId="building-year">
                                        <Form.Label>Год постройки</Form.Label>
                                        <Form.Control type="number" min="1800" max={new Date().getFullYear() + 1} name="buildingYear" value={formData.buildingYear || ''} onChange={handleFormChange} placeholder="Например, 1985" />
                                    </Form.Group>
                                </Col>
                                <Col xs={6}>
                                    <Form.Group controlId="building-floors">
                                        <Form.Label>Этажность</Form.Label>
                                        <Form.Control type="number" min="1" name="maxFloorCount" value={formData.maxFloorCount || ''} onChange={handleFormChange} placeholder="Например, 9" />
                                    </Form.Group>
                                </Col>
                                <Col xs={6}>
                                    <Form.Group controlId="building-entrances">
                                        <Form.Label>Подъезды</Form.Label>
                                        <Form.Control type="number" min="1" name="entrances" value={formData.entrances || ''} onChange={handleFormChange} placeholder="Например, 4" />
                                    </Form.Group>
                                </Col>
                                <Col xs={6}>
                                    <Form.Group controlId="building-apartments">
                                        <Form.Label>Квартиры</Form.Label>
                                        <Form.Control type="number" min="1" name="apartments" value={formData.apartments || ''} onChange={handleFormChange} placeholder="Например, 120" />
                                    </Form.Group>
                                </Col>
                                <Col xs={12}>
                                    <Form.Group controlId="building-area">
                                        <Form.Label>Общая площадь (м²)</Form.Label>
                                        <Form.Control type="number" step="0.01" min="0" name="totalArea" value={formData.totalArea || ''} onChange={handleFormChange} placeholder="Например, 5500.5" />
                                    </Form.Group>
                                </Col>
                                <Col xs={12}>
                                    <Form.Group controlId="building-cadastre">
                                        <Form.Label>Кадастровый номер</Form.Label>
                                        <Form.Control type="text" name="cadastreNumber" value={formData.cadastreNumber || ''} onChange={handleFormChange} />
                                    </Form.Group>
                                </Col>
                                <Col xs={12}>
                                    <Form.Group controlId="building-management">
                                        <Form.Label>Управляющая компания</Form.Label>
                                        <Form.Select name="managementOrganizationId" value={formData.managementOrganizationId || ''} onChange={handleFormChange}>
                                            {managementCompanies.length === 0 && <option value="">Загрузка УК...</option>}
                                            {managementCompanies.map(company => (
                                                <option key={company.id} value={company.id}>{company.name || company.shortName}</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col xs={12}>
                                    <Form.Group controlId="building-condition">
                                        <Form.Label>Техническое состояние</Form.Label>
                                        <Form.Select name="houseConditionId" value={formData.houseConditionId || ''} onChange={handleFormChange}>
                                            {technicalConditions.length === 0 && <option value="">Загрузка состояний...</option>}
                                            {technicalConditions.map(condition => (
                                                <option key={condition.id} value={condition.id}>{condition.houseCondition || condition.name}</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col xs={12}>
                                    <div className="small text-muted mt-3">* - обязательные поля</div>
                                </Col>
                            </Row>
                        )}
                    </Offcanvas.Body>

                    <div className="offcanvas-footer p-3 border-top bg-light">
                         <div className="d-flex justify-content-end">
                            <Button
                                type="button"
                                variant="link-secondary"
                                className="me-2"
                                onClick={() => {
                                    setShowEditOffcanvas(false);
                                    setFormError(null);
                                    setCurrentItem(null);
                                    setCurrentRawItem(null);
                                    setAddressSearchQuery('');
                                    setAddressSearchResults([]);
                                }}
                                disabled={formLoading}
                            >
                                Отмена
                            </Button>
                            <Button type="submit" variant="primary" disabled={formLoading}>
                                {formLoading ? (
                                    <>
                                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                                        Сохранение...
                                    </>
                                ) : (
                                    <>{currentItem ? 'Обновить' : 'Добавить'}</>
                                )}
                            </Button>
                        </div>
                    </div>
                </Form>
            </Offcanvas>

            <DeleteModal
                show={showDeleteModal}
                handleClose={() => setShowDeleteModal(false)}
                handleDeleteId={handleDeleteConfirm}
                modalTitle="Подтверждение удаления"
                modalText={`Вы действительно хотите удалить МКД по адресу "${currentItem?.address || 'Не указано'}"? Это действие необратимо.`}
                btnText="Удалить"
                loading={formLoading}
            />

            <style>{`
                .cursor-pointer { cursor: pointer; }
                .form-search { position: relative; display: flex; }
                .form-search .icon-search { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #6c757d; z-index: 10; }
                .form-search .form-control { padding-left: 35px; border-top-right-radius: 0; border-bottom-right-radius: 0; }
                .form-search .btn { border-top-left-radius: 0; border-bottom-left-radius: 0; }
                .avtar { display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; width: 32px; height: 32px; }
                .avtar-xs { width: 30px; height: 30px; font-size: 0.9rem; }
                .f-20 { font-size: 20px; }
                .f-18 { font-size: 18px; }
                .f-w-600 { font-weight: 600; }
                .sort-header { cursor: pointer; user-select: none; }
                .sort-header:hover { background-color: rgba(0, 0, 0, 0.03); }
                .sort-header i { font-size: 16px; vertical-align: middle; opacity: 0.6; }
                .sort-header:hover i { opacity: 1; }
                .mini-filter-button { font-size: 0.9rem; display: flex; align-items: center; position: relative; border-color: #dee2e6; }
                .mini-filter-menu { min-width: 250px; padding: 0; }
                .filter-content { padding: 10px; }
                .mini-filter-label { font-size: 0.85rem; font-weight: 500; color: #495057; margin-bottom: 3px; }
                .filter-indicator { position: absolute; top: 2px; right: 2px; width: 8px; height: 8px; border-radius: 50%; background-color: #0d6efd; }
                .resizable-table { table-layout: fixed; width: 100%; border-collapse: separate; border-spacing: 0; }
                .resizable-table th, .resizable-table td { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; position: relative; padding: 0.5rem 0.6rem; font-size: 0.875rem; line-height: 1.3; vertical-align: middle; }
                .resizable-table th { font-weight: 500; background-color: #f8f9fa; }
                .resize-handle { position: absolute; top: 0; right: -4px; width: 8px; height: 100%; cursor: col-resize; background-color: transparent; z-index: 10; }
                .resize-handle:hover, .resize-handle:active { background-color: rgba(13, 110, 253, 0.1); }
                body.resizing { user-select: none !important; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; }
                body.resizing * { cursor: col-resize !important; }
                .th-content { display: flex; align-items: center; font-size: 0.9rem; }
                .event-form label { font-weight: 500; color: #495057; margin-bottom: 0.3rem; }
                .event-form .form-control, .event-form .form-select { font-size: 0.9rem; }
                .offcanvas-footer { flex-shrink: 0; }
                .offcanvas.show { height: 100vh; }

                /* Стили для поиска адреса */
                .address-search-results {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    max-height: 300px;
                    overflow-y: auto;
                    background-color: white;
                    border: 1px solid #dee2e6;
                    border-radius: 0.25rem;
                    z-index: 1050;
                    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
                }
                .address-search-item {
                    padding: 0.75rem 1rem;
                    cursor: pointer;
                    transition: background-color 0.2s;
                    border-bottom: 1px solid #f0f0f0;
                }
                .address-search-item:hover {
                    background-color: #f8f9fa;
                }
                .address-search-item:last-child {
                    border-bottom: none;
                }
                .address-search-no-results {
                    padding: 0.75rem 1rem;
                    color: #6c757d;
                    font-style: italic;
                    text-align: center;
                }
            `}</style>
        </React.Fragment>
    );
};

export default BuildingsList;
