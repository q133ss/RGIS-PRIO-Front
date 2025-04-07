import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Button, Form, Spinner, Alert, Pagination, Offcanvas } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { 
    getHeatingPeriods, 
    filterHeatingPeriods,
    exportHeatingPeriodsToExcel,
    initializeApi,
    getCities,
    getStreets
} from '../../../services/api';
import { HeatingPeriod, HeatingPeriodState } from '../../../types/heatingPeriod';
import { City, Street } from '../../../types/incident';

const MAX_API_RETRY_ATTEMPTS = 3;

interface TableColumn {
    id: string;
    title: string;
    width: number;
    visible: boolean;
    field: string;
}

const HeatingPeriods: React.FC = () => {
    const [state, setState] = useState<HeatingPeriodState>({
        heatingPeriods: [],
        loading: true,
        error: null,
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        success: '',
        filterCity: '',
        filterStreet: '',
        filterHouseNumber: ''
    });
    
    const [activeFilters, setActiveFilters] = useState({
        city: '',
        street: '',
        houseNumber: ''
    });
    
    const [filterOptions, setFilterOptions] = useState({
        cities: [] as string[],
        streets: [] as string[],
        houseNumbers: [] as string[]
    });

    const [cities, setCities] = useState<City[]>([]);
    const [streets, setStreets] = useState<Street[]>([]);
    
    const [columns, setColumns] = useState<TableColumn[]>([
        { id: 'id', title: '№', width: 70, visible: true, field: 'id' },
        { id: 'city', title: 'ГОРОД', width: 150, visible: true, field: 'address.city' },
        { id: 'street', title: 'УЛИЦА', width: 200, visible: true, field: 'address.street' },
        { id: 'houseNumber', title: 'НОМЕР ДОМА', width: 120, visible: true, field: 'address.house_number' },
        { id: 'plannedDisconnection', title: 'ПЛАН. ДАТА ОТКЛ.', width: 150, visible: true, field: 'planned_disconnection_date' },
        { id: 'actualDisconnection', title: 'ФАКТ. ДАТА ОТКЛ.', width: 150, visible: true, field: 'actual_disconnection_date' },
        { id: 'plannedConnection', title: 'ПЛАН. ДАТА ВКЛ.', width: 150, visible: true, field: 'planned_connection_date' },
        { id: 'actualConnection', title: 'ФАКТ. ДАТА ВКЛ.', width: 150, visible: true, field: 'actual_connection_date' },
        { id: 'disconnectionOrder', title: 'ПРИКАЗ ОБ ОТКЛ.', width: 200, visible: true, field: 'disconnection_order' },
        { id: 'connectionOrder', title: 'ПРИКАЗ О ВКЛ.', width: 200, visible: true, field: 'connection_order' }
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
        const savedColumns = localStorage.getItem('heatingPeriodsColumns');
        if (savedColumns) {
            try {
                const parsedColumns = JSON.parse(savedColumns);
                setColumns(parsedColumns);
                setIsTableCustomized(true);
            } catch (e) {
                // Обработка ошибки
            }
        }
    }, []);

    useEffect(() => {
        if (isTableCustomized) {
            localStorage.setItem('heatingPeriodsColumns', JSON.stringify(columns));
        }
    }, [columns, isTableCustomized]);

    useEffect(() => {
        const fetchCities = async () => {
            try {
                const cityData = await getCities();
                setCities(cityData);
            } catch (error) {
                // Обработка ошибки
            }
        };
        
        fetchCities();
    }, []);

    useEffect(() => {
        if (!activeFilters.city) return;
        
        const fetchStreets = async () => {
            try {
                const cityObj = cities.find(c => c.name === activeFilters.city);
                if (cityObj) {
                    const streetData = await getStreets(cityObj.id);
                    setStreets(streetData);
                }
            } catch (error) {
                // Обработка ошибки
            }
        };
        
        fetchStreets();
    }, [activeFilters.city, cities]);

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
            { id: 'city', title: 'ГОРОД', width: 150, visible: true, field: 'address.city' },
            { id: 'street', title: 'УЛИЦА', width: 200, visible: true, field: 'address.street' },
            { id: 'houseNumber', title: 'НОМЕР ДОМА', width: 120, visible: true, field: 'address.house_number' },
            { id: 'plannedDisconnection', title: 'ПЛАН. ДАТА ОТКЛ.', width: 150, visible: true, field: 'planned_disconnection_date' },
            { id: 'actualDisconnection', title: 'ФАКТ. ДАТА ОТКЛ.', width: 150, visible: true, field: 'actual_disconnection_date' },
            { id: 'plannedConnection', title: 'ПЛАН. ДАТА ВКЛ.', width: 150, visible: true, field: 'planned_connection_date' },
            { id: 'actualConnection', title: 'ФАКТ. ДАТА ВКЛ.', width: 150, visible: true, field: 'actual_connection_date' },
            { id: 'disconnectionOrder', title: 'ПРИКАЗ ОБ ОТКЛ.', width: 200, visible: true, field: 'disconnection_order' },
            { id: 'connectionOrder', title: 'ПРИКАЗ О ВКЛ.', width: 200, visible: true, field: 'connection_order' }
        ];
        setColumns(defaultColumns);
        localStorage.removeItem('heatingPeriodsColumns');
        setIsTableCustomized(false);
        setShowColumnsSettings(false);
    };

    const sortData = (data: HeatingPeriod[]): HeatingPeriod[] => {
        return [...data].sort((a, b) => {
            const getNestedValue = (obj: any, path: string) => {
                const parts = path.split('.');
                let value = obj;
                for (const part of parts) {
                    if (value === null || value === undefined) return '';
                    value = value[part];
                }
                return value;
            };
            
            let aValue = sortField.includes('.') ? getNestedValue(a, sortField) : a[sortField as keyof HeatingPeriod];
            let bValue = sortField.includes('.') ? getNestedValue(b, sortField) : b[sortField as keyof HeatingPeriod];
            
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

    const loadHeatingPeriods = async (page = 1) => {
        setState(prev => ({ ...prev, loading: true, error: null, success: '' }));
        
        setActiveFilters({
            city: '',
            street: '',
            houseNumber: ''
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
            const data = await getHeatingPeriods(page);
            setApiSuccessful(true);
            
            extractFilterOptions(data.items);
            
            setState(prev => ({ 
                ...prev, 
                heatingPeriods: data.items, 
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
            await loadHeatingPeriods();
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
                city: '',
                street: '',
                houseNumber: ''
            });
            
            await loadHeatingPeriods();
        } catch (error) {
            setState(prev => ({ 
                ...prev, 
                error: 'Ошибка при обновлении данных. Пожалуйста, попробуйте позже.', 
                loading: false,
                success: ''
            }));
        }
    };

    const extractFilterOptions = (data: HeatingPeriod[]) => {
        const cities = new Set<string>();
        const streets = new Set<string>();
        const houseNumbers = new Set<string>();
        
        data.forEach(item => {
            if (item.address.city) cities.add(item.address.city);
            if (item.address.street) streets.add(item.address.street);
            if (item.address.house_number) houseNumbers.add(item.address.house_number);
        });
        
        setFilterOptions({
            cities: Array.from(cities).sort(),
            streets: Array.from(streets).sort(),
            houseNumbers: Array.from(houseNumbers).sort()
        });
    };
    
    const applyFilters = async () => {
        setState(prev => ({ ...prev, loading: true, error: null, success: '' }));
        
        try {
            let city_id: number | undefined;
            let street_id: number | undefined;
            let house_number: string | undefined;
            
            if (activeFilters.city) {
                const cityObj = cities.find(c => c.name === activeFilters.city);
                if (cityObj) city_id = cityObj.id;
            }
            
            if (activeFilters.street) {
                const streetObj = streets.find(s => s.name === activeFilters.street);
                if (streetObj) street_id = streetObj.id;
            }
            
            if (activeFilters.houseNumber) {
                house_number = activeFilters.houseNumber;
            }
            
            const filteredData = await filterHeatingPeriods(
                city_id, 
                street_id, 
                house_number
            );
            
            setState(prev => ({ 
                ...prev, 
                heatingPeriods: filteredData, 
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
    
    const handleFilterChange = (filterType: 'city' | 'street' | 'houseNumber', value: string) => {
        setActiveFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };
    
    const resetFilters = () => {
        setActiveFilters({
            city: '',
            street: '',
            houseNumber: ''
        });
        
        loadHeatingPeriods();
    };

    const handleExportToExcel = async () => {
        try {
            setState(prev => ({ ...prev, loading: true, error: null, success: '' }));
            
            const now = new Date();
            const dateStr = `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;
            const timeStr = `${now.getHours()}-${now.getMinutes()}`;
            
            const blob = await exportHeatingPeriodsToExcel();
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Отопительные_периоды_${dateStr}_${timeStr}.csv`;
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
        loadHeatingPeriods(page);
    };

    useEffect(() => {
        const initialize = async () => {
            try {
                setState(prev => ({ ...prev, loading: true, error: null, success: '' }));
                await initializeApi();
                const response = await getHeatingPeriods();
                
                extractFilterOptions(response.items);
                
                setState(prev => ({ 
                    ...prev, 
                    heatingPeriods: response.items, 
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
        return sortData(state.heatingPeriods);
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
                        onClick={() => !isResizing && handleSort(column.field)}
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

    const renderTableRow = (period: HeatingPeriod) => {
        return columns
            .filter(column => column.visible)
            .map(column => {
                const style = {
                    width: `${column.width}px`,
                    minWidth: `${column.width}px`
                };
                
                const value = getNestedValue(period, column.field);
                
                if (column.field.includes('date') && value) {
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) {
                        const formattedDate = date.toLocaleDateString('ru-RU');
                        return (
                            <td 
                                key={`${period.id}-${column.id}`}
                                style={style}
                            >
                                {formattedDate}
                            </td>
                        );
                    }
                }
                
                return (
                    <td 
                        key={`${period.id}-${column.id}`}
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
                                <h5 className="m-b-10">Отопительные периоды МКД</h5>
                            </div>
                            <ul className="breadcrumb">
                                <li className="breadcrumb-item">
                                    <Link to="/dashboard">Главная</Link>
                                </li>
                                <li className="breadcrumb-item">Реестры/Инвентаризация</li>
                                <li className="breadcrumb-item">ОКИ</li>
                                <li className="breadcrumb-item">Теплоснабжение</li>
                                <li className="breadcrumb-item">Отопительные периоды</li>
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
                                                    value={activeFilters.city}
                                                    onChange={(e) => handleFilterChange('city', e.target.value)}
                                                    disabled={state.loading || authError}
                                                >
                                                    <option value="">Все города</option>
                                                    {filterOptions.cities.map(city => (
                                                        <option key={city} value={city}>
                                                            {city}
                                                        </option>
                                                    ))}
                                                </Form.Select>
                                            </Form.Group>
                                        </Col>
                                        <Col md={4}>
                                            <Form.Group>
                                                <Form.Label>Улица</Form.Label>
                                                <Form.Select 
                                                    value={activeFilters.street}
                                                    onChange={(e) => handleFilterChange('street', e.target.value)}
                                                    disabled={state.loading || authError}
                                                >
                                                    <option value="">Все улицы</option>
                                                    {filterOptions.streets.map(street => (
                                                        <option key={street} value={street}>
                                                            {street}
                                                        </option>
                                                    ))}
                                                </Form.Select>
                                            </Form.Group>
                                        </Col>
                                        <Col md={3}>
                                            <Form.Group>
                                                <Form.Label>Номер дома</Form.Label>
                                                <Form.Select 
                                                    value={activeFilters.houseNumber}
                                                    onChange={(e) => handleFilterChange('houseNumber', e.target.value)}
                                                    disabled={state.loading || authError}
                                                >
                                                    <option value="">Все дома</option>
                                                    {filterOptions.houseNumbers.map(houseNumber => (
                                                        <option key={houseNumber} value={houseNumber}>
                                                            {houseNumber}
                                                        </option>
                                                    ))}
                                                </Form.Select>
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
                                                        (!activeFilters.city && !activeFilters.street && !activeFilters.houseNumber)}
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
                                        {state.heatingPeriods.length === 0 ? (
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
                                                        {getSortedData().map((period: HeatingPeriod) => (
                                                            <tr key={period.id}>
                                                                {renderTableRow(period)}
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
            `}</style>
        </React.Fragment>
    );
};

export default HeatingPeriods;