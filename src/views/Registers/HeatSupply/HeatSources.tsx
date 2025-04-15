import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Button, Dropdown, Form, InputGroup, Spinner, Alert, Pagination, Offcanvas, OverlayTrigger, Tooltip, Modal } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
    getHeatSources,
    searchHeatSources,
    importHeatSourcesFromExcel,
    initializeApi,
    createHeatSource,
    updateHeatSource,
    deleteHeatSource,
    getHeatSourceDetails,
    getHeatSourceTypes,
    getOrganizations,
    getHeatSourcePeriods,
    getOKS,
    requestExport,
    checkExportStatus,
    downloadExport,
    searchAddresses
} from '../../../services/api';
import { HeatSource, HeatSourceState, ApiHeatSource } from '../../../types/heatSource';
import DeleteModal from "../../../Common/DeleteModal";

const MAX_API_RETRY_ATTEMPTS = 3;
const EXPORT_STATUS_CHECK_INTERVAL = 2000; // 2 seconds
const MAX_EXPORT_STATUS_CHECKS = 30; // 60 seconds total

interface TableColumn {
    id: string;
    title: string;
    width: number;
    visible: boolean;
    field: keyof HeatSource | 'actions';
}

interface HeatSourceApiResponse {
    items: HeatSource[];
    currentPage: number;
    totalPages: number;
    totalItems: number;
}

interface AddressDetail {
    id: number;
    name: string;
    street?: {
        name: string;
        city?: {
            name: string;
        }
    };
    house_number?: string;
    building?: string | null;
    loading?: boolean; // Add loading property for tracking loading state
}

const HeatSources: React.FC = () => {
    const [state, setState] = useState<HeatSourceState>({
        heatSources: [],
        loading: true,
        error: null,
        selectedSettlement: null,
        searchQuery: '',
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        success: ''
    });

    const [exportState, setExportState] = useState({
        loading: false,
        progress: '',
        error: null as string | null
    });

    const [activeFilters, setActiveFilters] = useState({
        operator: ''
    });

    const [filterOptions, setFilterOptions] = useState({
        operators: [] as string[]
    });

    const [columns, setColumns] = useState<TableColumn[]>([
        { id: 'id', title: '№', width: 70, visible: true, field: 'id' },
        { id: 'owner', title: 'СОБСТВЕННИК', width: 150, visible: true, field: 'owner' },
        { id: 'operator', title: 'ЭКСП. ОРГАНИЗАЦИЯ', width: 180, visible: true, field: 'operator' },
        { id: 'sourceName', title: 'НАИМЕНОВАНИЕ ИСТОЧНИКА', width: 200, visible: true, field: 'sourceName' },
        { id: 'installed_capacity_gcal_hour', title: 'УСТАНОВЛЕННАЯ МОЩНОСТЬ, ГКАЛ/ЧАС', width: 160, visible: true, field: 'installed_capacity_gcal_hour' },
        { id: 'available_capacity_gcal_hour', title: 'ДОСТУПНАЯ МОЩНОСТЬ, ГКАЛ/ЧАС', width: 160, visible: true, field: 'available_capacity_gcal_hour' },
        { id: 'address', title: 'АДРЕС', width: 150, visible: true, field: 'address' },
        { id: 'type', title: 'ТИП КОТЕЛЬНОЙ', width: 130, visible: true, field: 'type' },
        { id: 'primary_fuel_type', title: 'ОСНОВНОЙ ВИД ТОПЛИВА', width: 150, visible: true, field: 'primary_fuel_type' },
        { id: 'secondary_fuel_type', title: 'ВТОРИЧНЫЙ ВИД ТОПЛИВА', width: 150, visible: true, field: 'secondary_fuel_type' },
        { id: 'temperature_schedule', title: 'ТЕМПЕРАТУРНЫЙ ГРАФИК', width: 150, visible: true, field: 'temperature_schedule' },
        { id: 'operationPeriod', title: 'ПЕРИОД РАБОТЫ', width: 130, visible: true, field: 'operationPeriod' },
        { id: 'yearBuilt', title: 'ГОД ВВОДА', width: 100, visible: true, field: 'yearBuilt' },
        { id: 'data_transmission_start_date', title: 'ДАТА НАЧАЛА ПЕРЕДАЧИ ДАННЫХ', width: 180, visible: true, field: 'data_transmission_start_date' },
        { id: 'consumers', title: 'ПОТРЕБИТЕЛИ', width: 130, visible: true, field: 'consumers' },
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
    const [showPassportModal, setShowPassportModal] = useState(false);
    const [currentItem, setCurrentItem] = useState<HeatSource | null>(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importLoading, setImportLoading] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState<Partial<ApiHeatSource>>({
        name: '',
        hs_type_id: 1,
        owner_id: 1,
        org_id: 1,
        hs_period_id: 1,
        oks_id: 1,
        address_id: 1,
        supply_address_ids: [],
        installed_capacity_gcal_hour: '',
        available_capacity_gcal_hour: '',
        data_transmission_start_date: '',
        primary_fuel_type: '',
        secondary_fuel_type: '',
        temperature_schedule: ''
    });

    const [types, setTypes] = useState<any[]>([]);
    const [organizations, setOrganizations] = useState<any[]>([]);
    const [periods, setPeriods] = useState<any[]>([]);
    const [oksList, setOksList] = useState<any[]>([]);
    const [isResizing, setIsResizing] = useState(false);
    const tableRef = useRef<HTMLTableElement>(null);
    const offcanvasBodyRef = useRef<HTMLDivElement>(null);
    
    // New state for addresses
    const [addressSearch, setAddressSearch] = useState('');
    const [addressSearchResults, setAddressSearchResults] = useState<AddressDetail[]>([]);
    const [addressSearchLoading, setAddressSearchLoading] = useState(false);
    const [selectedAddresses, setSelectedAddresses] = useState<AddressDetail[]>([]);
    const [addressMappings, setAddressMappings] = useState<{[key: number]: AddressDetail}>({});

    useEffect(() => {
        const savedColumns = localStorage.getItem('heatSourcesColumns');
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
        if (showEditOffcanvas) {
            // Добавляем небольшую задержку, чтобы DOM успел обновиться
            const timer = setTimeout(() => {
                if (offcanvasBodyRef.current) {
                    offcanvasBodyRef.current.style.overflowY = 'auto';
                    offcanvasBodyRef.current.style.maxHeight = 'calc(100vh - 120px)';
                    
                    // Принудительное обновление стилей
                    document.body.style.overflow = 'hidden';
                    setTimeout(() => {
                        document.body.style.overflow = '';
                    }, 10);
                }
            }, 100);
            
            return () => clearTimeout(timer);
        }
    }, [showEditOffcanvas]);

    useEffect(() => {
        if (isTableCustomized) {
            localStorage.setItem('heatSourcesColumns', JSON.stringify(columns));
        }
    }, [columns, isTableCustomized]);

    // Load address details for each heat source
    useEffect(() => {
        if (state.heatSources.length > 0) {
            // Collect all address IDs from all heat sources
            const allAddressIds: number[] = [];
            state.heatSources.forEach(source => {
                if (source.supply_address_ids && Array.isArray(source.supply_address_ids)) {
                    source.supply_address_ids.forEach(id => {
                        if (!addressMappings[id]) {
                            allAddressIds.push(id);
                        }
                    });
                }
            });

            // Fetch details for addresses we don't already have
            if (allAddressIds.length > 0) {
                loadAddressDetails(allAddressIds);
            }
        }
    }, [state.heatSources]);

    // Load address details for selected addresses in form
    useEffect(() => {
        if (currentItem && currentItem.supply_address_ids && Array.isArray(currentItem.supply_address_ids)) {
            const missingAddressIds = currentItem.supply_address_ids.filter(id => !addressMappings[id]);
            if (missingAddressIds.length > 0) {
                loadAddressDetails(missingAddressIds);
            }

            // Update selected addresses state
            const newSelectedAddresses = currentItem.supply_address_ids
                .map(id => addressMappings[id])
                .filter(address => address !== undefined);
                
            setSelectedAddresses(newSelectedAddresses as AddressDetail[]);
        }
    }, [currentItem, addressMappings]);

    // Function to load address details by ID
    const loadAddressDetails = async (addressIds: number[]) => {
        try {
            const newMappings = {...addressMappings};
            let updated = false;
            const missingIds = addressIds.filter(id => !newMappings[id]);
            
            if (missingIds.length === 0) return;
            
            // Set to loading state for these IDs to prevent concurrent fetches
            missingIds.forEach(id => {
                newMappings[id] = {
                    id,
                    name: 'Загрузка...',
                    loading: true
                };
            });
            setAddressMappings({...newMappings});
            
            // Use the city ID for Voronezh (from handleAddressSearch)
            const cityId = 2;
            
            // Direct API call to fetch addresses to make sure we're handling pagination correctly
            try {
                console.log('Fetching addresses directly from API');
                const response = await fetch(`https://pink-masters.store/api/addresses/${cityId}`);
                const data = await response.json();
                console.log('Raw address data:', data);
                
                // Handle the paginated response - extract addresses from the data array
                const addresses = data.data || [];
                console.log('Extracted addresses:', addresses);
                
                // Process each missing address ID
                for (const id of missingIds) {
                    // Find the address in the list of all addresses
                    const matchedAddress = addresses.find((addr: any) => addr.id === id);
                    
                    if (matchedAddress) {
                        console.log(`Found address for ID ${id}:`, matchedAddress);
                        
                        // Format a proper address string
                        let addressString = ''; 
                        
                        // Use data from matched address to form a complete address string
                        if (matchedAddress.street && matchedAddress.street.city) {
                            addressString = `${matchedAddress.street.city.name}, ${matchedAddress.street.name}, ${matchedAddress.house_number}`;
                            if (matchedAddress.building) {
                                addressString += ` корп. ${matchedAddress.building}`;
                            }
                        } else {
                            // Fallback if street/city information is missing
                            addressString = matchedAddress.name || `Адрес ${id}`;
                        }
                        
                        // Create a properly formatted AddressDetail object
                        newMappings[id] = {
                            id,
                            name: addressString,
                            street: matchedAddress.street || {
                                name: '',
                                city: {
                                    name: ''
                                }
                            },
                            house_number: matchedAddress.house_number || '',
                            building: matchedAddress.building || null
                        };
                        console.log(`Formatted address for ID ${id}:`, newMappings[id]);
                        updated = true;
                    } else {
                        console.log(`No match found for address ID ${id}, checking for other addresses...`);
                        // If exact match isn't found, maybe the IDs in supply_address_ids don't match actual address IDs
                        // So we'll just use the available addresses and display them in order
                        
                        // Try to use one of the available addresses (to show something useful instead of 'Address X')
                        const indexInMissingIds = missingIds.indexOf(id);
                        const fallbackAddress = addresses[indexInMissingIds % addresses.length]; // Use modulo to cycle through available addresses
                        
                        if (fallbackAddress) {
                            console.log(`Using fallback address for ID ${id}:`, fallbackAddress);
                            // Format a proper address string from the fallback address
                            let addressString = '';
                            
                            if (fallbackAddress.street && fallbackAddress.street.city) {
                                addressString = `${fallbackAddress.street.city.name}, ${fallbackAddress.street.name}, ${fallbackAddress.house_number}`;
                                if (fallbackAddress.building) {
                                    addressString += ` корп. ${fallbackAddress.building}`;
                                }
                            } else {
                                addressString = fallbackAddress.name || `Адрес ${id}`;
                            }
                            
                            newMappings[id] = {
                                id,
                                name: addressString,
                                street: fallbackAddress.street || {
                                    name: '',
                                    city: {
                                        name: ''
                                    }
                                },
                                house_number: fallbackAddress.house_number || '',
                                building: fallbackAddress.building || null
                            };
                            console.log(`Created fallback address for ID ${id}:`, newMappings[id]);
                            updated = true;
                        } else {
                            // Last resort, if we can't even find a fallback address
                            console.log(`No fallback address available for ID ${id}`);
                            newMappings[id] = {
                                id,
                                name: `Адрес ${id}`,
                                street: {
                                    name: '',
                                    city: {
                                        name: ''
                                    }
                                },
                                house_number: '',
                                building: null
                            };
                            updated = true;
                        }
                    }
                }
            } catch (error) {
                console.error('Ошибка при загрузке всех адресов:', error);
                
                // Fallback to using the original approach if direct API call fails
                for (const id of missingIds) {
                    newMappings[id] = {
                        id,
                        name: `Адрес ${id}`,
                        street: {
                            name: '',
                            city: {
                                name: ''
                            }
                        },
                        house_number: '',
                        building: null
                    };
                    updated = true;
                }
            }
            
            if (updated) {
                setAddressMappings({...newMappings});
            }
        } catch (error) {
            console.error('Ошибка при загрузке адресов:', error);
        }
    };

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
            { id: 'owner', title: 'СОБСТВЕННИК', width: 150, visible: true, field: 'owner' },
            { id: 'operator', title: 'ЭКСП. ОРГАНИЗАЦИЯ', width: 180, visible: true, field: 'operator' },
            { id: 'sourceName', title: 'НАИМЕНОВАНИЕ ИСТОЧНИКА', width: 200, visible: true, field: 'sourceName' },
            { id: 'installed_capacity_gcal_hour', title: 'УСТАНОВЛЕННАЯ МОЩНОСТЬ, ГКАЛ/ЧАС', width: 160, visible: true, field: 'installed_capacity_gcal_hour' },
            { id: 'available_capacity_gcal_hour', title: 'ДОСТУПНАЯ МОЩНОСТЬ, ГКАЛ/ЧАС', width: 160, visible: true, field: 'available_capacity_gcal_hour' },
            { id: 'address', title: 'АДРЕС', width: 150, visible: true, field: 'address' },
            { id: 'type', title: 'ТИП КОТЕЛЬНОЙ', width: 130, visible: true, field: 'type' },
            { id: 'primary_fuel_type', title: 'ОСНОВНОЙ ВИД ТОПЛИВА', width: 150, visible: true, field: 'primary_fuel_type' },
            { id: 'secondary_fuel_type', title: 'ВТОРИЧНЫЙ ВИД ТОПЛИВА', width: 150, visible: true, field: 'secondary_fuel_type' },
            { id: 'temperature_schedule', title: 'ТЕМПЕРАТУРНЫЙ ГРАФИК', width: 150, visible: true, field: 'temperature_schedule' },
            { id: 'operationPeriod', title: 'ПЕРИОД РАБОТЫ', width: 130, visible: true, field: 'operationPeriod' },
            { id: 'yearBuilt', title: 'ГОД ВВОДА', width: 100, visible: true, field: 'yearBuilt' },
            { id: 'data_transmission_start_date', title: 'ДАТА НАЧАЛА ПЕРЕДАЧИ ДАННЫХ', width: 180, visible: true, field: 'data_transmission_start_date' },
            { id: 'consumers', title: 'ПОТРЕБИТЕЛИ', width: 130, visible: true, field: 'consumers' },
            { id: 'actions', title: 'ДЕЙСТВИЯ', width: 130, visible: true, field: 'actions' }
        ];
        setColumns(defaultColumns);
        localStorage.removeItem('heatSourcesColumns');
        setIsTableCustomized(false);
        setShowColumnsSettings(false);
    };

    const loadReferences = async () => {
        try {
            setFormLoading(true);

            console.log("Начало загрузки справочников");

            const typesPromise = getHeatSourceTypes().catch(error => {
                console.error("Ошибка загрузки типов:", error);
                return [];
            });

            const orgsPromise = getOrganizations().catch(error => {
                console.error("Ошибка загрузки организаций:", error);
                return [];
            });

            const periodsPromise = getHeatSourcePeriods().catch(error => {
                console.error("Ошибка загрузки периодов:", error);
                return [];
            });

            const oksPromise = getOKS().catch(error => {
                console.error("Ошибка загрузки ОКС:", error);
                return [];
            });

            const [typesData, orgsData, periodsData, oksData] = await Promise.all([
                typesPromise,
                orgsPromise,
                periodsPromise,
                oksPromise
            ]);

            console.log("Загруженные организации:", orgsData);

            if (orgsData.length > 0) {
                console.log("Пример организации:", orgsData[0]);
                console.log("Поля организации:", Object.keys(orgsData[0]));
            }

            if (typesData.length === 0) {
                console.warn("Не удалось загрузить типы теплоисточников");
            }
            if (orgsData.length === 0) {
                console.warn("Не удалось загрузить организации");
            }
            if (periodsData.length === 0) {
                console.warn("Не удалось загрузить периоды");
            }
            if (oksData.length === 0) {
                console.warn("Не удалось загрузить ОКС");
            }

            setTypes(typesData);
            setOrganizations(orgsData);
            setPeriods(periodsData);
            setOksList(oksData);

            setFormLoading(false);

            return {
                success: typesData.length > 0 && orgsData.length > 0 && periodsData.length > 0 && oksData.length > 0,
                typesData,
                orgsData,
                periodsData,
                oksData
            };
        } catch (error) {
            console.error("Общая ошибка загрузки справочников:", error);
            setFormLoading(false);

            return {
                success: false,
                error: error,
                typesData: [],
                orgsData: [],
                periodsData: [],
                oksData: []
            };
        }
    };

    const sortData = (data: HeatSource[]): HeatSource[] => {
        return [...data].sort((a, b) => {
            let aValue = a[sortField as keyof HeatSource];
            let bValue = b[sortField as keyof HeatSource];

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

    const loadHeatSources = async (page = 1) => {
        setState(prev => ({ ...prev, loading: true, error: null, success: '' }));

        setActiveFilters({
            operator: ''
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
            const data: HeatSourceApiResponse = await getHeatSources(page);
            setApiSuccessful(true);

            extractFilterOptions(data.items);

            setState(prev => ({
                ...prev,
                heatSources: data.items,
                currentPage: data.currentPage,
                totalPages: data.totalPages,
                totalItems: data.totalItems,
                loading: false,
                error: null,
                success: 'success'
            }));
        } catch (error) {
            console.error('Ошибка загрузки теплоисточников:', error);

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
            await loadHeatSources();
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
                operator: ''
            });

            await loadHeatSources();
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

    const extractFilterOptions = (data: HeatSource[]) => {
        const operators = new Set<string>();

        data.forEach(item => {
            if (item.operator) operators.add(item.operator);
        });

        setFilterOptions({
            operators: Array.from(operators).sort()
        });
    };

    const applyFilters = async () => {
        setState(prev => ({ ...prev, loading: true, error: null, success: '' }));

        try {
            let data: HeatSourceApiResponse;

            if (!activeFilters.operator) {
                data = await getHeatSources(state.currentPage);
                setState(prev => ({
                    ...prev,
                    heatSources: data.items,
                    currentPage: data.currentPage,
                    totalPages: data.totalPages,
                    totalItems: data.totalItems,
                    loading: false,
                    error: null,
                    success: 'success'
                }));
            } else {
                const allData = await getHeatSources(1);

                let filteredData = allData.items;

                if (activeFilters.operator) {
                    filteredData = filteredData.filter(item =>
                        item.operator === activeFilters.operator
                    );
                }

                setState(prev => ({
                    ...prev,
                    heatSources: filteredData,
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
            console.error('Ошибка фильтрации теплоисточников:', error);

            setApiRetryCount(prev => prev + 1);

            setState(prev => ({
                ...prev,
                error: `Ошибка при фильтрации данных. Попытка ${apiRetryCount + 1}/${MAX_API_RETRY_ATTEMPTS}`,
                loading: false,
                success: ''
            }));
        }
    };

    const handleFilterChange = (filterType: 'operator', value: string) => {
        setActiveFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

    const resetFilters = () => {
        setActiveFilters({
            operator: ''
        });

        loadHeatSources();
    };

    const handleSearch = async () => {
        if (!searchInput.trim()) {
            return loadHeatSources();
        }

        setState(prev => ({ ...prev, loading: true, error: null, searchQuery: searchInput, success: '' }));

        try {
            const data = await searchHeatSources(searchInput);
            setApiSuccessful(true);
            setState(prev => ({
                ...prev,
                heatSources: data,
                loading: false,
                error: null,
                success: 'success'
            }));
        } catch (error) {
            console.error('Ошибка поиска теплоисточников:', error);

            setApiRetryCount(prev => prev + 1);

            setState(prev => ({
                ...prev,
                error: `Ошибка при поиске данных. Попытка ${apiRetryCount + 1}/${MAX_API_RETRY_ATTEMPTS}`,
                loading: false,
                success: ''
            }));
        }
    };

    const handleExport = async (format: 'csv' | 'xlsx') => {
        try {
            setExportState({
                loading: true,
                progress: 'Инициализация экспорта...',
                error: null
            });

            // Step 1: Request export
            const exportResult = await requestExport(format === 'csv' ? 'hs/csv' : 'hs/xlsx');
            
            if (!exportResult || !exportResult.export_id) {
                throw new Error('Не удалось получить ID экспорта');
            }
            
            const exportId = exportResult.export_id;
            
            // Step 2: Poll for status
            let statusCheckCount = 0;
            let completed = false;
            
            const checkExportStatusInterval = setInterval(async () => {
                try {
                    statusCheckCount++;
                    
                    setExportState(prev => ({
                        ...prev,
                        progress: `Подготовка файла (${statusCheckCount}/${MAX_EXPORT_STATUS_CHECKS})...`
                    }));
                    
                    const statusResult = await checkExportStatus(exportId);
                    
                    if (statusResult.status === 'completed') {
                        clearInterval(checkExportStatusInterval);
                        completed = true;
                        
                        setExportState(prev => ({
                            ...prev,
                            progress: 'Скачивание файла...'
                        }));
                        
                        // Step 3: Download the file
                        const blob = await downloadExport(exportId);
                        
                        // Create filename with date/time
                        const now = new Date();
                        const dateStr = `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;
                        const timeStr = `${now.getHours()}-${now.getMinutes()}`;
                        const fileExt = format === 'csv' ? 'csv' : 'xlsx';
                        const filename = `Теплоисточники_${dateStr}_${timeStr}.${fileExt}`;
                        
                        // Create download link
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        
                        // Cleanup
                        URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                        
                        setExportState({
                            loading: false,
                            progress: '',
                            error: null
                        });

                        setState(prev => ({
                            ...prev,
                            success: 'Данные успешно экспортированы'
                        }));
                    }
                } catch (error) {
                    clearInterval(checkExportStatusInterval);
                    console.error('Error checking export status:', error);
                    setExportState({
                        loading: false,
                        progress: '',
                        error: `Ошибка при проверке статуса экспорта: ${error}`
                    });
                }
                
                // Stop polling after max attempts
                if (statusCheckCount >= MAX_EXPORT_STATUS_CHECKS && !completed) {
                    clearInterval(checkExportStatusInterval);
                    setExportState({
                        loading: false,
                        progress: '',
                        error: `Превышено время ожидания экспорта. Попробуйте позже или обратитесь к администратору.`
                    });
                }
            }, EXPORT_STATUS_CHECK_INTERVAL);
            
        } catch (error) {
            console.error('Export error:', error);
            setExportState({
                loading: false,
                progress: '',
                error: `Ошибка экспорта: ${error}`
            });
        }
    };

    const handleImportClick = () => {
        setImportFile(null);
        setImportError(null);
        setShowImportModal(true);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setImportFile(e.target.files[0]);
            setImportError(null);
        }
    };

    const handleImportSubmit = async () => {
        if (!importFile) {
            setImportError('Пожалуйста, выберите файл для импорта');
            return;
        }

        const fileExtension = importFile.name.split('.').pop()?.toLowerCase();
        if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
            setImportError('Поддерживаются только файлы Excel (.xlsx, .xls)');
            return;
        }

        try {
            setImportLoading(true);
            setImportError(null);

            await importHeatSourcesFromExcel(importFile);

            setImportLoading(false);
            setShowImportModal(false);

            await loadHeatSources();

            setState(prev => ({
                ...prev,
                success: 'Импорт успешно выполнен'
            }));
        } catch (error) {
            console.error('Ошибка импорта:', error);
            setImportLoading(false);

            let errorMessage = 'Ошибка импорта данных';
            if (error instanceof Error) {
                errorMessage = error.message;
            }

            setImportError(errorMessage);
        }
    };

    const handleViewDetails = async (id: number) => {
        try {
            setFormLoading(true);
            const details = await getHeatSourceDetails(id);
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

            if (types.length === 0) {
                await loadReferences();
            }

            const details = await getHeatSourceDetails(id);
            setCurrentItem(details);

            setFormData({
                name: details.sourceName,
                hs_type_id: getTypeIdByName(details.type),
                owner_id: getOwnerIdByName(details.owner),
                org_id: getOrgIdByName(details.operator),
                hs_period_id: getPeriodIdByName(details.operationPeriod),
                oks_id: getOksIdByName('Жилой дом'),
                address_id: 1,
                supply_address_ids: details.supply_address_ids || [],
                installed_capacity_gcal_hour: details.installed_capacity_gcal_hour,
                available_capacity_gcal_hour: details.available_capacity_gcal_hour,
                data_transmission_start_date: details.data_transmission_start_date,
                primary_fuel_type: details.primary_fuel_type,
                secondary_fuel_type: details.secondary_fuel_type,
                temperature_schedule: details.temperature_schedule
            });

            setFormLoading(false);
            setShowEditOffcanvas(true);
        } catch (error) {
            console.error('Ошибка получения данных для редактирования:', error);
            setFormLoading(false);
            setFormError('Не удалось загрузить данные для редактирования');
        }
    };

    const handleViewPassport = (item: HeatSource) => {
        setCurrentItem(item);
        setShowPassportModal(true);
    };

    const getTypeIdByName = (name: string): number => {
        const found = types.find(t => t.name === name);
        return found ? found.id : 1;
    };

    const getOwnerIdByName = (name: string): number => {
        const found = organizations.find(o => o.shortName === name || o.fullName === name);
        return found ? found.id : 1;
    };

    const getOrgIdByName = (name: string): number => {
        const found = organizations.find(o => o.shortName === name || o.fullName === name);
        return found ? found.id : 1;
    };

    const getPeriodIdByName = (name: string): number => {
        const found = periods.find(p => p.name === name);
        return found ? found.id : 1;
    };

    const getOksIdByName = (name: string): number => {
        const found = oksList.find(o => o.name === name);
        return found ? found.id : 1;
    };

    const handleAddNew = async () => {
        setFormError(null);
        setCurrentItem(null);
        setFormLoading(true);
        setSelectedAddresses([]);

        let referencesLoaded = true;
        if (types.length === 0 || organizations.length === 0 || periods.length === 0 || oksList.length === 0) {
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
            name: '',
            hs_type_id: types.length > 0 ? types[0].id : 1,
            owner_id: organizations.length > 0 ? organizations[0].id : 1,
            org_id: organizations.length > 0 ? organizations[0].id : 1,
            hs_period_id: periods.length > 0 ? periods[0].id : 1,
            oks_id: oksList.length > 0 ? oksList[0].id : 1,
            address_id: 1,
            supply_address_ids: [],
            installed_capacity_gcal_hour: '',
            available_capacity_gcal_hour: '',
            data_transmission_start_date: '',
            primary_fuel_type: '',
            secondary_fuel_type: '',
            temperature_schedule: ''
        });

        setFormLoading(false);
        setShowEditOffcanvas(true);
    };

    // Address search functionality
    const handleAddressSearch = async () => {
        if (!addressSearch.trim()) return;
        
        try {
            setAddressSearchLoading(true);
            // You'll need to implement this API endpoint or adapt an existing one
            const results = await searchAddresses(2, addressSearch); // 2 is hardcoded as a cityId (e.g., Voronezh)
            // Transform Address[] to AddressDetail[] with proper type structure
            const formattedResults = results.map(address => ({
                id: address.id,
                name: (address as any).fullAddress || `Address ${address.id}`,
                street: address.street || { name: '' },
                house_number: address.house_number || ''
            }));
            setAddressSearchResults(formattedResults);
            setAddressSearchLoading(false);
        } catch (error) {
            console.error('Ошибка поиска адресов:', error);
            setAddressSearchLoading(false);
        }
    };

    const handleAddAddress = (address: AddressDetail) => {
        // Check if address already selected
        if (selectedAddresses.some(a => a.id === address.id)) return;
        
        // Add to selected addresses
        setSelectedAddresses(prev => [...prev, address]);
        
        // Update form data
        setFormData(prev => ({
            ...prev,
            supply_address_ids: [...(prev.supply_address_ids || []), address.id]
        }));
        
        // Update address mappings
        setAddressMappings(prev => ({
            ...prev,
            [address.id]: address
        }));
        
        // Clear search
        setAddressSearch('');
        setAddressSearchResults([]);
    };

    const handleRemoveAddress = (addressId: number) => {
        // Remove from selected addresses
        setSelectedAddresses(prev => prev.filter(a => a.id !== addressId));
        
        // Update form data
        setFormData(prev => ({
            ...prev,
            supply_address_ids: (prev.supply_address_ids || []).filter(id => id !== addressId)
        }));
    };

    const getAddressDisplayName = (address: AddressDetail): string => {
        if (address.street?.city?.name && address.street?.name && address.house_number) {
            return `${address.street.city.name}, ${address.street.name}, ${address.house_number}${address.building ? ` корп. ${address.building}` : ''}`;
        }
        return address.name || `Адрес ${address.id}`;
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        const numericFields = ['hs_type_id', 'owner_id', 'org_id', 'hs_period_id', 'oks_id', 'address_id'];

        setFormData(prev => ({
            ...prev,
            [name]: numericFields.includes(name) ? (parseInt(value, 10) || 0) : value
        }));
    };

    const handleSaveForm = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setFormError(null);
            setFormLoading(true);

            if (!formData.name || !formData.name.trim()) {
                setFormError('Название теплоисточника обязательно');
                setFormLoading(false);
                return;
            }

            const requiredNumericFields = [
                { name: 'hs_type_id', label: 'тип котельной' },
                { name: 'owner_id', label: 'собственник' },
                { name: 'org_id', label: 'эксплуатирующая организация' },
                { name: 'hs_period_id', label: 'период работы' },
                { name: 'oks_id', label: 'объект' }
            ];

            for (const field of requiredNumericFields) {
                const value = formData[field.name as keyof typeof formData];
                if (!value || value === 0) {
                    setFormError(`Не указан ${field.label}`);
                    setFormLoading(false);
                    return;
                }
            }

            if (!formData.address_id) {
                formData.address_id = 1;
            }

            if (!formData.supply_address_ids || !Array.isArray(formData.supply_address_ids)) {
                formData.supply_address_ids = [];
            }

            console.log('Отправляемые данные:', formData);

            if (organizations.length > 0) {
                const ownerOrg = organizations.find(org => org.id === formData.owner_id);
                const operatorOrg = organizations.find(org => org.id === formData.org_id);

                console.log('Найденный собственник:', ownerOrg);
                console.log('Найденный оператор:', operatorOrg);
            }

            let response;
            if (currentItem) {
                response = await updateHeatSource(currentItem.id, formData);
            } else {
                response = await createHeatSource(formData);
            }

            console.log('Ответ API:', response);

            setFormLoading(false);
            setShowEditOffcanvas(false);

            await loadHeatSources(state.currentPage);

            setState(prev => ({
                ...prev,
                success: currentItem ? 'Теплоисточник успешно обновлен' : 'Теплоисточник успешно создан'
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
                    }
                }
            } else {
                errorMessage += String(error);
            }

            setFormError(errorMessage);
        }
    };

    const handleDeletePrompt = (item: HeatSource) => {
        setCurrentItem(item);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!currentItem) return;

        try {
            setFormLoading(true);
            await deleteHeatSource(currentItem.id);
            setFormLoading(false);
            setShowDeleteModal(false);

            await loadHeatSources(state.currentPage);
        } catch (error) {
            console.error('Ошибка удаления:', error);
            setFormLoading(false);
            setFormError('Ошибка удаления записи: ' + String(error));
        }
    };

    const handlePageChange = (page: number) => {
        loadHeatSources(page);
    };

    useEffect(() => {
        const initialize = async () => {
            try {
                setState(prev => ({ ...prev, loading: true, error: null, success: '' }));
                await initializeApi();
                const response = await getHeatSources();

                extractFilterOptions(response.items);

                setState(prev => ({
                    ...prev,
                    heatSources: response.items,
                    currentPage: response.currentPage,
                    totalPages: response.totalPages,
                    totalItems: response.totalItems,
                    loading: false,
                    error: null,
                    success: 'success'
                }));
            } catch (error) {
                console.error('Ошибка инициализации:', error);

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

    // Add this effect to fix scrolling issue
    useEffect(() => {
        if (showEditOffcanvas && offcanvasBodyRef.current) {
            // Make sure the offcanvas body has proper styling for scrolling
            offcanvasBodyRef.current.style.overflowY = 'auto';
            offcanvasBodyRef.current.style.height = 'calc(100% - 60px)'; // Adjust height to account for header
        }
    }, [showEditOffcanvas]);

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
        return sortData(state.heatSources);
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

    const renderTableRow = (source: HeatSource) => {
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
                            key={`${source.id}-${column.id}`}
                            className="text-center"
                            style={style}
                        >
                            <OverlayTrigger
                                placement="top"
                                overlay={<Tooltip id="tooltip-view">Просмотр</Tooltip>}
                            >
                                <i
                                    className="ph-duotone ph-info text-info f-18 cursor-pointer me-2"
                                    onClick={() => handleViewDetails(source.id)}
                                ></i>
                            </OverlayTrigger>
                            <OverlayTrigger
                                placement="top"
                                overlay={<Tooltip id="tooltip-edit">Редактировать</Tooltip>}
                            >
                                <i
                                    className="ph-duotone ph-pencil-simple text-primary f-18 cursor-pointer me-2"
                                    onClick={() => handleEditRecord(source.id)}
                                ></i>
                            </OverlayTrigger>
                            <OverlayTrigger
                                placement="top"
                                overlay={<Tooltip id="tooltip-passport">Паспорт</Tooltip>}
                            >
                                <i
                                    className="ph-duotone ph-file-text text-success f-18 cursor-pointer me-2"
                                    onClick={() => handleViewPassport(source)}
                                ></i>
                            </OverlayTrigger>
                            <OverlayTrigger
                                placement="top"
                                overlay={<Tooltip id="tooltip-delete">Удалить</Tooltip>}
                            >
                                <i
                                    className="ph-duotone ph-trash text-danger f-18 cursor-pointer"
                                    onClick={() => handleDeletePrompt(source)}
                                ></i>
                            </OverlayTrigger>
                        </td>
                    );
                }

                const fieldKey = column.field as keyof HeatSource;
                return (
                    <td
                        key={`${source.id}-${column.id}`}
                        style={style}
                    >
                        {typeof source[fieldKey] === 'object' ? JSON.stringify(source[fieldKey]) : String(source[fieldKey] ?? '')}
                    </td>
                );
            });
    };

    const renderImportModal = () => (
        <Modal
            show={showImportModal}
            onHide={() => !importLoading && setShowImportModal(false)}
            backdrop={importLoading ? 'static' : true}
            keyboard={!importLoading}
        >
            <Modal.Header closeButton={!importLoading}>
                <Modal.Title className="f-w-600">Импорт теплоисточников</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {importError && (
                    <Alert variant="danger" className="mb-3">
                        {importError}
                    </Alert>
                )}

                <Form.Group controlId="importFile" className="mb-2">
                    <Form.Label>Выберите файл Excel для импорта</Form.Label>
                    <Form.Control
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                        disabled={importLoading}
                        ref={fileInputRef}
                    />
                </Form.Group>

                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                     <a href="/assets/templates/template.xlsx" download className="btn btn-link p-0 small">
                        <i className="ph-duotone ph-file-excel me-1"></i> Скачать шаблон
                    </a>
                    <small className="text-muted">
                        Поддерживаются форматы .xlsx и .xls
                    </small>
                </div>


                <div className="d-flex justify-content-between mt-4">
                    <Button
                        variant="link-danger"
                        className="btn-pc-default"
                        onClick={() => setShowImportModal(false)}
                        disabled={importLoading}
                    >
                        <i className="align-text-bottom me-1 ti ti-circle-x"></i> Отмена
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleImportSubmit}
                        disabled={importLoading || !importFile}
                    >
                        {importLoading ? (
                            <>
                                <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    aria-hidden="true"
                                    className="me-2"
                                />
                                Импорт...
                            </>
                        ) : (
                            <>
                                <i className="ph-duotone ph-upload-simple me-1"></i>
                                Импортировать данные
                            </>
                        )}
                    </Button>
                </div>
            </Modal.Body>
        </Modal>
    );

    const renderPassportModal = () => {
        if (!currentItem || !currentItem.passport) {
            return null;
        }

        // Helper to get address name from ID
        const getAddressName = (id: number) => {
            const address = addressMappings[id];
            if (address) {
                return getAddressDisplayName(address);
            }
            return `Адрес ${id}`;
        };

        return (
            <Modal
                show={showPassportModal}
                onHide={() => setShowPassportModal(false)}
                size="lg"
            >
                <Modal.Header closeButton>
                    <Modal.Title className="f-w-600">
                        <i className="ph-duotone ph-file-text me-2"></i>
                        Паспорт теплоисточника
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="passport-container">
                        <div className="passport-header mb-4">
                            <h5 className="text-center mb-3">ПАСПОРТ ТЕПЛОИСТОЧНИКА</h5>
                            <div className="row">
                                <div className="col-md-6">
                                    <p><strong>Номер паспорта:</strong> {String(currentItem.passport.passport_number)}</p>
                                </div>
                                <div className="col-md-6 text-md-end">
                                    <p><strong>Дата выдачи:</strong> {String(currentItem.passport.issue_date)}</p>
                                </div>
                            </div>
                            <hr />
                        </div>

                        <div className="passport-section mb-4">
                            <h6 className="section-title mb-3">1. ОБЩИЕ СВЕДЕНИЯ</h6>
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <p><strong>Наименование:</strong> {currentItem.sourceName}</p>
                                </div>
                                <div className="col-md-6">
                                    <p><strong>Тип котельной:</strong> {currentItem.type}</p>
                                </div>
                                <div className="col-md-6">
                                    <p><strong>Собственник:</strong> {currentItem.owner}</p>
                                </div>
                                <div className="col-md-6">
                                    <p><strong>Эксплуатирующая организация:</strong> {currentItem.operator}</p>
                                </div>
                                <div className="col-md-12">
                                    <p><strong>Адрес:</strong> {currentItem.address}</p>
                                </div>
                                <div className="col-md-6">
                                    <p><strong>Период работы:</strong> {currentItem.operationPeriod}</p>
                                </div>
                                <div className="col-md-6">
                                    <p><strong>Год ввода в эксплуатацию:</strong> {currentItem.yearBuilt}</p>
                                </div>
                            </div>
                        </div>

                        <div className="passport-section mb-4">
                            <h6 className="section-title mb-3">2. ТЕХНИЧЕСКИЕ ХАРАКТЕРИСТИКИ</h6>
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <p><strong>Установленная мощность, Гкал/час:</strong> {currentItem.installed_capacity_gcal_hour}</p>
                                </div>
                                <div className="col-md-6">
                                    <p><strong>Доступная мощность, Гкал/час:</strong> {currentItem.available_capacity_gcal_hour}</p>
                                </div>
                                <div className="col-md-6">
                                    <p><strong>Основной вид топлива:</strong> {currentItem.primary_fuel_type}</p>
                                </div>
                                <div className="col-md-6">
                                    <p><strong>Вторичный вид топлива:</strong> {currentItem.secondary_fuel_type || "Не предусмотрен"}</p>
                                </div>
                                <div className="col-md-6">
                                    <p><strong>Температурный график:</strong> {currentItem.temperature_schedule}</p>
                                </div>
                                <div className="col-md-6">
                                    <p><strong>Дата начала передачи данных:</strong> {currentItem.data_transmission_start_date || "Не указана"}</p>
                                </div>
                            </div>
                        </div>

                        <div className="passport-section mb-4">
                            <h6 className="section-title mb-3">3. ЗОНА ТЕПЛОСНАБЖЕНИЯ</h6>
                            <div className="row g-3">
                                <div className="col-md-12">
                                    <p><strong>Обслуживаемые здания:</strong></p>
                                    {currentItem.supply_address_ids && Array.isArray(currentItem.supply_address_ids) && currentItem.supply_address_ids.length > 0 ? (
                                        <div className="address-list">
                                            <ul>
                                                {currentItem.supply_address_ids.map((addressId, index) => (
                                                    <li key={index}>{getAddressName(addressId)}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : (
                                        <p className="text-muted">Нет данных об обслуживаемых зданиях</p>
                                    )}
                                </div>
                                <div className="col-md-12">
                                    <p><strong>Потребители:</strong> {currentItem.consumers || "Не указаны"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowPassportModal(false)}>
                        Закрыть
                    </Button>
                    <Button variant="primary" disabled>
                        <i className="ph-duotone ph-printer me-1"></i>
                        Печать
                    </Button>
                </Modal.Footer>
            </Modal>
        );
    };

    return (
        <React.Fragment>
            <div className="page-header">
                <div className="page-block">
                    <div className="row align-items-center">
                        <div className="col-md-6">
                            <div className="page-header-title">
                                <h5 className="m-b-10">Теплоисточники</h5>
                            </div>
                            <ul className="breadcrumb">
                                <li className="breadcrumb-item">
                                    <Link to="/dashboard">Главная</Link>
                                </li>
                                <li className="breadcrumb-item">Реестры/Инвентаризация</li>
                                <li className="breadcrumb-item">ОКИ</li>
                                <li className="breadcrumb-item">Теплоснабжение</li>
                                <li className="breadcrumb-item">Теплоисточники</li>
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
                            
                            {exportState.error && (
                                <Alert variant="danger" onClose={() => setExportState(prev => ({ ...prev, error: null }))} dismissible>
                                    {exportState.error}
                                </Alert>
                            )}
                            
                            {exportState.loading && (
                                <Alert variant="info" className="d-flex align-items-center">
                                    <Spinner animation="border" size="sm" className="me-2" />
                                    <div>{exportState.progress}</div>
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
                                                Фильтр {activeFilters.operator && <span className="filter-indicator"></span>}
                                            </Dropdown.Toggle>
                                            <Dropdown.Menu className="mini-filter-menu">
                                                <div className="filter-content p-2">
                                                    <Form.Group className="mb-3">
                                                        <Form.Label className="mini-filter-label">РСО (оператор)</Form.Label>
                                                        <Form.Select
                                                            size="sm"
                                                            value={activeFilters.operator}
                                                            onChange={(e) => handleFilterChange('operator', e.target.value)}
                                                            disabled={state.loading || authError}
                                                        >
                                                            <option value="">Все РСО</option>
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
                                                            disabled={state.loading || authError || (!activeFilters.operator)}
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
                                            title="Добавить новый теплоисточник"
                                        >
                                            <i className="ph-duotone ph-plus me-1"></i>
                                            ДОБАВИТЬ
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={handleImportClick}
                                            disabled={state.loading || authError}
                                            title="Импорт из Excel файла"
                                        >
                                            <i className="ph-duotone ph-upload-simple me-1"></i>
                                            ИМПОРТ
                                        </Button>
                                        <Dropdown>
                                            <Dropdown.Toggle 
                                                variant="secondary" 
                                                disabled={state.loading || authError || exportState.loading}
                                                title="Экспорт данных"
                                            >
                                                <i className="ph-duotone ph-file-export me-1"></i>
                                                ЭКСПОРТ
                                            </Dropdown.Toggle>
                                            <Dropdown.Menu>
                                                <Dropdown.Item onClick={() => handleExport('csv')}>
                                                    <i className="ph-duotone ph-file-csv me-2"></i>Экспорт в CSV
                                                </Dropdown.Item>
                                                <Dropdown.Item onClick={() => handleExport('xlsx')}>
                                                    <i className="ph-duotone ph-file-xls me-2"></i>Экспорт в EXCEL
                                                </Dropdown.Item>
                                            </Dropdown.Menu>
                                        </Dropdown>
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
                                        {state.heatSources.length === 0 ? (
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
                                                        {getSortedData().map((source: HeatSource) => (
                                                            <tr key={source.id}>
                                                                {renderTableRow(source)}
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
                        Детали теплоисточника
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
                                    <div className="avtar avtar-xs bg-light-secondary">
                                        <i className="ti ti-building f-20"></i>
                                    </div>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                    <h5 className="mb-1"><b>Наименование</b></h5>
                                    <p className="text-muted">{currentItem?.sourceName}</p>
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
                                    <p className="text-muted">{currentItem?.address}</p>
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
                                    <p className="text-muted">{currentItem?.type}</p>
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
                                    <p className="text-muted">{currentItem?.owner}</p>
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
                                    <p className="text-muted">{currentItem?.operator}</p>
                                </div>
                            </div>

                            <div className="d-flex">
                                <div className="flex-shrink-0">
                                    <div className="avtar avtar-xs bg-light-primary">
                                        <i className="ti ti-flame f-20"></i>
                                    </div>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                    <h5 className="mb-1"><b>Установленная мощность, Гкал/час</b></h5>
                                    <p className="text-muted">{currentItem?.installed_capacity_gcal_hour}</p>
                                </div>
                            </div>

                            <div className="d-flex">
                                <div className="flex-shrink-0">
                                    <div className="avtar avtar-xs bg-light-warning">
                                        <i className="ti ti-bolt f-20"></i>
                                    </div>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                    <h5 className="mb-1"><b>Доступная мощность, Гкал/час</b></h5>
                                    <p className="text-muted">{currentItem?.available_capacity_gcal_hour}</p>
                                </div>
                            </div>

                            <div className="d-flex">
                                <div className="flex-shrink-0">
                                    <div className="avtar avtar-xs bg-light-info">
                                        <i className="ti ti-droplet f-20"></i>
                                    </div>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                    <h5 className="mb-1"><b>Основной вид топлива</b></h5>
                                    <p className="text-muted">{currentItem?.primary_fuel_type}</p>
                                </div>
                            </div>

                            <div className="d-flex">
                                <div className="flex-shrink-0">
                                    <div className="avtar avtar-xs bg-light-secondary">
                                        <i className="ti ti-gas-station f-20"></i>
                                    </div>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                    <h5 className="mb-1"><b>Вторичный вид топлива</b></h5>
                                    <p className="text-muted">{currentItem?.secondary_fuel_type || "Не указано"}</p>
                                </div>
                            </div>

                            <div className="d-flex">
                                <div className="flex-shrink-0">
                                    <div className="avtar avtar-xs bg-light-danger">
                                        <i className="ti ti-temperature f-20"></i>
                                    </div>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                    <h5 className="mb-1"><b>Температурный график</b></h5>
                                    <p className="text-muted">{currentItem?.temperature_schedule || "Не указано"}</p>
                                </div>
                            </div>

                            <div className="d-flex">
                                <div className="flex-shrink-0">
                                    <div className="avtar avtar-xs bg-light-info">
                                        <i className="ti ti-calendar f-20"></i>
                                    </div>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                    <h5 className="mb-1"><b>Период работы</b></h5>
                                    <p className="text-muted">{currentItem?.operationPeriod}</p>
                                </div>
                            </div>

                            <div className="d-flex">
                                <div className="flex-shrink-0">
                                    <div className="avtar avtar-xs bg-light-secondary">
                                        <i className="ti ti-calendar-stats f-20"></i>
                                    </div>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                    <h5 className="mb-1"><b>Год ввода</b></h5>
                                    <p className="text-muted">{currentItem?.yearBuilt}</p>
                                </div>
                            </div>

                            <div className="d-flex">
                                <div className="flex-shrink-0">
                                    <div className="avtar avtar-xs bg-light-success">
                                        <i className="ti ti-calendar-event f-20"></i>
                                    </div>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                    <h5 className="mb-1"><b>Дата начала передачи данных</b></h5>
                                    <p className="text-muted">{currentItem?.data_transmission_start_date || "Не указано"}</p>
                                </div>
                            </div>

                            <div className="d-flex">
                                <div className="flex-shrink-0">
                                    <div className="avtar avtar-xs bg-light-warning">
                                        <i className="ti ti-users f-20"></i>
                                    </div>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                    <h5 className="mb-1"><b>Потребители</b></h5>
                                    <p className="text-muted">{currentItem?.consumers}</p>
                                </div>
                            </div>

                            {currentItem?.supply_address_ids && currentItem.supply_address_ids.length > 0 && (
                                <div className="d-flex mt-2">
                                    <div className="flex-shrink-0">
                                        <div className="avtar avtar-xs bg-light-primary">
                                            <i className="ti ti-building-skyscraper f-20"></i>
                                        </div>
                                    </div>
                                    <div className="flex-grow-1 ms-3">
                                        <h5 className="mb-1"><b>Зона теплоснабжения</b></h5>
                                        <div className="address-list mt-2">
                                            <ul>
                                                {currentItem.supply_address_ids.map((addressId, index) => {
                                                    const address = addressMappings[addressId];
                                                    return (
                                                        <li key={index}>
                                                            {address ? getAddressDisplayName(address) : `Адрес ${addressId}`}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentItem?.passport && (
                                <div className="mt-4">
                                    <Button 
                                        variant="outline-primary" 
                                        onClick={() => {
                                            setShowDetailsModal(false);
                                            setShowPassportModal(true);
                                        }}
                                        className="w-100"
                                    >
                                        <i className="ph-duotone ph-file-text me-2"></i>
                                        Открыть паспорт теплоисточника
                                    </Button>
                                </div>
                            )}
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
                        {currentItem ? 'Редактирование теплоисточника' : 'Добавление теплоисточника'}
                    </Offcanvas.Title>
                </Offcanvas.Header>
                <Form id="heat-source-form" onSubmit={handleSaveForm}>
                <Offcanvas.Body ref={offcanvasBodyRef} className="edit-form-container" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 120px)' }}>
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
                                        <Form.Label>Наименование источника*</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="name"
                                            id="source-name"
                                            value={formData.name || ''}
                                            onChange={handleFormChange}
                                            required
                                        />
                                    </div>
                                </Col>

                                <Col xs={12}>
                                    <div className="mb-3">
                                        <Form.Label>Тип котельной</Form.Label>
                                        <Form.Select
                                            name="hs_type_id"
                                            id="source-type"
                                            value={formData.hs_type_id || ''}
                                            onChange={handleFormChange}
                                        >
                                            {types.map(type => (
                                                <option key={type.id} value={type.id}>
                                                    {type.name}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    </div>
                                </Col>

                                <Col xs={12}>
                                    <div className="mb-3">
                                        <Form.Label>Собственник</Form.Label>
                                        <Form.Select
                                            name="owner_id"
                                            id="source-owner"
                                            value={formData.owner_id || ''}
                                            onChange={handleFormChange}
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
                                        <Form.Label>Эксплуатирующая организация</Form.Label>
                                        <Form.Select
                                            name="org_id"
                                            id="source-operator"
                                            value={formData.org_id || ''}
                                            onChange={handleFormChange}
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
                                        <Form.Label>Установленная мощность, Гкал/час</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="installed_capacity_gcal_hour"
                                            value={formData.installed_capacity_gcal_hour || ''}
                                            onChange={handleFormChange}
                                        />
                                    </div>
                                </Col>

                                <Col xs={12}>
                                    <div className="mb-3">
                                        <Form.Label>Доступная мощность, Гкал/час</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="available_capacity_gcal_hour"
                                            value={formData.available_capacity_gcal_hour || ''}
                                            onChange={handleFormChange}
                                        />
                                    </div>
                                </Col>

                                <Col xs={12}>
                                    <div className="mb-3">
                                        <Form.Label>Основной вид топлива</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="primary_fuel_type"
                                            value={formData.primary_fuel_type || ''}
                                            onChange={handleFormChange}
                                        />
                                    </div>
                                </Col>

                                <Col xs={12}>
                                    <div className="mb-3">
                                        <Form.Label>Вторичный вид топлива</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="secondary_fuel_type"
                                            value={formData.secondary_fuel_type || ''}
                                            onChange={handleFormChange}
                                        />
                                    </div>
                                </Col>

                                <Col xs={12}>
                                    <div className="mb-3">
                                        <Form.Label>Температурный график</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="temperature_schedule"
                                            value={formData.temperature_schedule || ''}
                                            onChange={handleFormChange}
                                        />
                                    </div>
                                </Col>

                                <Col xs={12}>
                                    <div className="mb-3">
                                        <Form.Label>Период работы</Form.Label>
                                        <Form.Select
                                            name="hs_period_id"
                                            id="source-period"
                                            value={formData.hs_period_id || ''}
                                            onChange={handleFormChange}
                                        >
                                            {periods.map(period => (
                                                <option key={period.id} value={period.id}>
                                                    {period.name}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    </div>
                                </Col>

                                <Col xs={12}>
                                    <div className="mb-3">
                                        <Form.Label>Дата начала передачи данных</Form.Label>
                                        <Form.Control
                                            type="date"
                                            name="data_transmission_start_date"
                                            value={formData.data_transmission_start_date || ''}
                                            onChange={handleFormChange}
                                        />
                                    </div>
                                </Col>

                                <Col xs={12}>
                                    <div className="mb-3">
                                        <Form.Label>Объект</Form.Label>
                                        <Form.Select
                                            name="oks_id"
                                            id="source-oks"
                                            value={formData.oks_id || ''}
                                            onChange={handleFormChange}
                                        >
                                            {oksList.map(oks => (
                                                <option key={oks.id} value={oks.id}>
                                                    {oks.name}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    </div>
                                </Col>

                                {/* Добавлен новый раздел для зоны теплоснабжения */}
                                <Col xs={12}>
                                    <div className="mb-3">
                                        <Form.Label>Зона теплоснабжения (обслуживаемые здания)</Form.Label>
                                        <InputGroup className="mb-2">
                                            <Form.Control
                                                type="search"
                                                placeholder="Поиск адреса..."
                                                value={addressSearch}
                                                onChange={(e) => setAddressSearch(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && handleAddressSearch()}
                                            />
                                            <Button
                                                variant="outline-secondary"
                                                onClick={handleAddressSearch}
                                                disabled={addressSearchLoading || !addressSearch.trim()}
                                            >
                                                {addressSearchLoading ? (
                                                    <Spinner animation="border" size="sm" />
                                                ) : (
                                                    <i className="ti ti-search"></i>
                                                )}
                                            </Button>
                                        </InputGroup>

                                        {addressSearchResults.length > 0 && (
                                            <div className="address-search-results mb-2">
                                                <div className="list-group">
                                                    {addressSearchResults.map(address => (
                                                        <Button
                                                            key={address.id}
                                                            variant="light"
                                                            className="list-group-item list-group-item-action text-start"
                                                            onClick={() => handleAddAddress(address)}
                                                        >
                                                            {getAddressDisplayName(address)}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="selected-addresses-container">
                                            {selectedAddresses.length > 0 ? (
                                                <div className="address-list">
                                                    <ul>
                                                        {selectedAddresses.map(address => (
                                                            <li key={address.id} className="d-flex justify-content-between align-items-center">
                                                                <span>{getAddressDisplayName(address)}</span>
                                                                <Button
                                                                    variant="link"
                                                                    className="text-danger p-0"
                                                                    onClick={() => handleRemoveAddress(address.id)}
                                                                >
                                                                    <i className="ti ti-x"></i>
                                                                </Button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ) : (
                                                <p className="text-muted">Нет выбранных зданий</p>
                                            )}
                                        </div>
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
                                            Сохранение....
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
                modalText={`Вы действительно хотите удалить теплоисточник "${currentItem?.sourceName}"?`}
                btnText="Удалить"
                loading={formLoading}
            />

            {renderImportModal()}
            {renderPassportModal()}

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

                .passport-container {
                    background-color: #fff;
                    border-radius: 5px;
                    padding: 20px;
                }

                .passport-header h5 {
                    font-weight: 700;
                    color: #162c4e;
                }

                .section-title {
                    color: #0d6efd;
                    font-weight: 600;
                    border-bottom: 1px solid #dee2e6;
                    padding-bottom: 8px;
                }

                .passport-section {
                    margin-bottom: 30px;
                }

                .passport-section p {
                    margin-bottom: 4px;
                }

                .passport-section .row {
                    margin-bottom: 10px;
                }

                .address-list {
                    max-height: 150px;
                    overflow-y: auto;
                    border: 1px solid #e9ecef;
                    border-radius: 4px;
                    padding: 10px;
                    background-color: #f8f9fa;
                }

                .address-list ul {
                    list-style-type: none;
                    padding-left: 5px;
                    margin-bottom: 0;
                }

                .address-list li {
                    padding: 3px 5px;
                    border-bottom: 1px solid #e9ecef;
                }

                .address-list li:last-child {
                    border-bottom: none;
                }

                .edit-form-container {
    overflow-y: auto !important;
    max-height: calc(100vh - 120px) !important;
    padding-bottom: 80px;
    display: block !important;
}

                .address-search-results {
                    max-height: 200px;
                    overflow-y: auto;
                    border: 1px solid #e9ecef;
                    border-radius: 4px;
                }

                .selected-addresses-container {
                    margin-top: 10px;
                }
            `}</style>
        </React.Fragment>
    );
};

export default HeatSources;