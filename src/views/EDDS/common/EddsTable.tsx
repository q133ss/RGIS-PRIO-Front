import React, { useState, useEffect, useRef } from 'react';
import { Spinner, Button, Form, Pagination, OverlayTrigger, Tooltip, Offcanvas, InputGroup, Badge, Row, Col } from 'react-bootstrap';
import { EddsIncident } from '../../../services/api';

interface TableColumn {
  id: string;
  title: string;
  width: number;
  visible: boolean;
  field: keyof EddsIncident | 'actions' | 'addresses';
}

interface EddsTableProps {
  data: EddsIncident[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onViewDetails: (incident: EddsIncident) => void;
  showColumnsSettings: boolean;
  onToggleColumnsSettings: () => void;
  storageKey: string;
  onSearch?: (query: string) => void;
  filterOptions?: {
    incidentTypes: any[];
    resourceTypes: any[];
  };
  onFilterChange?: (
    filterType: 'incidentType' | 'resourceType' | 'isComplaint',
    value: string
  ) => void;
  activeFilters?: {
    incidentType: string;
    resourceType: string;
    isComplaint: string;
  };
  onApplyFilters?: () => void;
  onResetFilters?: () => void;
  onShowOnMap?: (incident: EddsIncident) => void; // New prop for showing incident on map
}

const EddsTable: React.FC<EddsTableProps> = ({
  data,
  loading,
  error,
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  onViewDetails,
  showColumnsSettings,
  onToggleColumnsSettings,
  storageKey,
  onSearch,
  filterOptions,
  onFilterChange,
  activeFilters,
  onApplyFilters,
  onResetFilters,
  onShowOnMap
}) => {
  const defaultColumns: TableColumn[] = [
    { id: 'id', title: '№', width: 60, visible: true, field: 'id' },
    { id: 'title', title: 'ЗАГОЛОВОК', width: 200, visible: true, field: 'title' },
    { id: 'type', title: 'ТИП', width: 120, visible: true, field: 'type' },
    { id: 'resource_type', title: 'РЕСУРС', width: 120, visible: true, field: 'resource_type' },
    { id: 'status', title: 'СТАТУС', width: 100, visible: true, field: 'status' },
    { id: 'is_complaint', title: 'ЖАЛОБА', width: 80, visible: true, field: 'is_complaint' },
    { id: 'addresses', title: 'АДРЕСА', width: 250, visible: true, field: 'addresses' },
    { id: 'created_at', title: 'СОЗДАН', width: 140, visible: true, field: 'created_at' },
    { id: 'updated_at', title: 'ОБНОВЛЕН', width: 140, visible: true, field: 'updated_at' },
    { id: 'description', title: 'ОПИСАНИЕ', width: 250, visible: false, field: 'description' },
    { id: 'actions', title: 'ДЕЙСТВИЯ', width: 120, visible: true, field: 'actions' } // Increased width for actions
  ];

  const [columns, setColumns] = useState<TableColumn[]>(defaultColumns);
  const [isTableCustomized, setIsTableCustomized] = useState<boolean>(false);
  const [sortField, setSortField] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isResizing, setIsResizing] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(true);
  const [activeFilterCount, setActiveFilterCount] = useState<number>(0);
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    const savedColumns = localStorage.getItem(storageKey);
    if (savedColumns) {
      try {
        const parsedColumns: TableColumn[] = JSON.parse(savedColumns);
        const mergedColumns = defaultColumns.map(defaultCol => {
          const savedCol = parsedColumns.find(sc => sc.id === defaultCol.id);
          return savedCol ? { ...defaultCol, ...savedCol } : defaultCol;
        });
        setColumns(mergedColumns);
        setIsTableCustomized(true);
      } catch (e) {
        setColumns(defaultColumns);
      }
    } else {
      setColumns(defaultColumns);
    }
  }, [storageKey]);

  useEffect(() => {
    if (isTableCustomized) {
      const columnsToSave = columns.map(({ field, ...rest }) => rest);
      localStorage.setItem(storageKey, JSON.stringify(columnsToSave));
    }
  }, [columns, isTableCustomized, storageKey]);

  useEffect(() => {
    return () => {
      document.body.style.cursor = '';
      document.body.classList.remove('resizing');
    };
  }, []);

  useEffect(() => {
    if (activeFilters) {
      let count = 0;
      if (activeFilters.incidentType) count++;
      if (activeFilters.resourceType) count++;
      if (activeFilters.isComplaint) count++;
      setActiveFilterCount(count);
    }
  }, [activeFilters]);

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
        const visibleColumns = columns.filter(c => c.visible);
        const columnIndex = visibleColumns.findIndex(c => c.id === columnId);
        if (columnIndex >= 0 && headerCells[columnIndex]) {
          (headerCells[columnIndex] as HTMLElement).style.width = `${newWidth}px`;
          (headerCells[columnIndex] as HTMLElement).style.minWidth = `${newWidth}px`;
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
    setColumns(defaultColumns);
    localStorage.removeItem(storageKey);
    setIsTableCustomized(false);
    onToggleColumnsSettings();
  };

  const handleSort = (field: string) => {
    if (isResizing) return;
    const column = columns.find(c => c.id === field);
    if (!column || column.field === 'actions' || column.field === 'addresses') return;
    if (field === sortField) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortData = (items: EddsIncident[]): EddsIncident[] => {
    if (!items) return [];
    return [...items].sort((a, b) => {
      const column = columns.find(c => c.id === sortField);
      if (!column) return 0;
      const fieldKey = column.field as keyof EddsIncident;
      let aValue: any = a[fieldKey];
      let bValue: any = b[fieldKey];

      if (sortField === 'type' || sortField === 'resource_type' || sortField === 'status') {
        aValue = typeof aValue === 'object' && aValue !== null && 'name' in aValue ? aValue.name : '';
        bValue = typeof bValue === 'object' && bValue !== null && 'name' in bValue ? bValue.name : '';
      }
      if (sortField === 'is_complaint') {
        aValue = a.is_complaint ? 1 : 0;
        bValue = b.is_complaint ? 1 : 0;
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      if (sortField === 'created_at' || sortField === 'updated_at') {
        try {
          const dateA = new Date(aValue as string).getTime();
          const dateB = new Date(bValue as string).getTime();
          if (!isNaN(dateA) && !isNaN(dateB)) {
            return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
          }
        } catch (e) {}
      }
      const aStr = String(aValue || '').toLowerCase();
      const bStr = String(bValue || '').toLowerCase();
      return sortDirection === 'asc'
        ? aStr.localeCompare(bStr, 'ru')
        : bStr.localeCompare(aStr, 'ru');
    });
  };

  const renderSortIcon = (fieldId: string) => {
    const column = columns.find(c => c.id === fieldId);
    if (!column || column.field === 'actions' || column.field === 'addresses') return null;
    if (fieldId !== sortField) {
      return <i className="ti ti-selector ms-1 text-muted opacity-50"></i>;
    }
    return sortDirection === 'asc' ? (
      <i className="ti ti-sort-ascending ms-1"></i>
    ) : (
      <i className="ti ti-sort-descending ms-1"></i>
    );
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const items = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <Pagination.Item
          key={i}
          active={i === currentPage}
          onClick={() => onPageChange(i)}
          disabled={loading}
        >
          {i}
        </Pagination.Item>
      );
    }
    return (
      <div className="d-flex justify-content-between align-items-center mt-3 px-2">
        <div className="text-muted small">
          Показано {data.length} из {totalItems} записей
        </div>
        <Pagination className="mb-0">
          <Pagination.First onClick={() => onPageChange(1)} disabled={currentPage === 1 || loading} />
          <Pagination.Prev
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
          />
          {startPage > 1 && (
            <>
              <Pagination.Item onClick={() => onPageChange(1)} disabled={loading}>
                1
              </Pagination.Item>
              {startPage > 2 && <Pagination.Ellipsis disabled />}
            </>
          )}
          {items}
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <Pagination.Ellipsis disabled />}
              <Pagination.Item onClick={() => onPageChange(totalPages)} disabled={loading}>
                {totalPages}
              </Pagination.Item>
            </>
          )}
          <Pagination.Next
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
          />
          <Pagination.Last
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages || loading}
          />
        </Pagination>
      </div>
    );
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '-';
      }
      return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '-';
    }
  };

  const renderAddressList = (addresses: any[] | null | undefined) => {
    if (!addresses || addresses.length === 0) return '-';
    const maxAddresses = 2;
    const displayAddresses = addresses.slice(0, maxAddresses);
    return (
      <div>
        {displayAddresses.map((addr, idx) => (
          <div key={addr.id || idx} className="text-truncate" title={getAddressTooltip(addr)}>
            {addr.street?.name || 'Улица не указана'}, {addr.house_number || 'Дом?'}
            {addr.building ? `/${addr.building}` : ''}
          </div>
        ))}
        {addresses.length > maxAddresses && (
          <div className="small text-muted">...и еще {addresses.length - maxAddresses}</div>
        )}
      </div>
    );
  };

  const getAddressTooltip = (addr: any): string => {
    let tooltip = '';
    if (addr.street?.city?.name) tooltip += `${addr.street.city.name}, `;
    if (addr.street?.name) tooltip += `ул. ${addr.street.name}, `;
    if (addr.house_number) tooltip += `д. ${addr.house_number}`;
    if (addr.building) tooltip += ` корп. ${addr.building}`;
    if (addr.structure) tooltip += ` стр. ${addr.structure}`;
    if (addr.literature) tooltip += ` лит. ${addr.literature}`;
    return tooltip || 'Адрес не указан';
  };

  const renderTableHeaders = () => {
    return columns
      .filter(column => column.visible)
      .map((column, index, filteredColumns) => {
        const isLast = index === filteredColumns.length - 1;
        const isSortable = column.field !== 'actions' && column.field !== 'addresses';
        const style = {
          width: `${column.width}px`,
          minWidth: `${column.width}px`,
          position: 'relative' as 'relative',
          cursor: isSortable ? 'pointer' : 'default',
          verticalAlign: 'middle'
        };
        return (
          <th
            key={column.id}
            className={isSortable ? 'sort-header' : ''}
            onClick={() => isSortable && !isResizing && handleSort(column.id)}
            style={style}
            title={isSortable ? `Сортировать по "${column.title}"` : column.title}
          >
            <div className="th-content">
              {column.title}
              {renderSortIcon(column.id)}
            </div>
            {!isLast && (
              <div
                className="resize-handle"
                onMouseDown={(e) => handleResizeStart(e, column.id)}
                title="Изменить ширину"
              />
            )}
          </th>
        );
      });
  };

  const handleShowOnMap = (incident: EddsIncident, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShowOnMap) {
      onShowOnMap(incident);
    }
  };

  const renderTableRow = (incident: EddsIncident) => {
    return columns
      .filter(column => column.visible)
      .map(column => {
        const style = {
          width: `${column.width}px`,
          minWidth: `${column.width}px`,
          verticalAlign: 'middle'
        };
        let cellContent: React.ReactNode = '-';
        if (column.field === 'actions') {
          const hasLocation = incident.addresses && 
                             incident.addresses.length > 0 && 
                             incident.addresses.some(addr => addr.latitude && addr.longitude);
          
          cellContent = (
            <div className="d-flex align-items-center">
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip id={`tooltip-view-${incident.id}`}>Просмотр</Tooltip>}
              >
                <Button variant="link" className="p-0 text-info me-2" onClick={() => onViewDetails(incident)}>
                  <i className="ti ti-eye f-18"></i>
                </Button>
              </OverlayTrigger>
              
              {hasLocation && onShowOnMap && (
                <OverlayTrigger
                  placement="top"
                  overlay={<Tooltip id={`tooltip-map-${incident.id}`}>Показать на карте</Tooltip>}
                >
                  <Button 
                    variant="link" 
                    className="p-0 text-success me-2" 
                    onClick={(e) => handleShowOnMap(incident, e)}
                  >
                    <i className="ti ti-map-pin f-18"></i>
                  </Button>
                </OverlayTrigger>
              )}
            </div>
          );
        } else if (column.field === 'type' || column.field === 'resource_type' || column.field === 'status') {
          const value = incident[column.field as keyof EddsIncident];
          cellContent =
            typeof value === 'object' && value !== null && 'name' in value ? value.name : '-';
        } else if (column.field === 'is_complaint') {
          cellContent = incident.is_complaint ? (
            <span className="badge bg-warning text-dark">Да</span>
          ) : (
            <span className="badge bg-secondary">Нет</span>
          );
        } else if (column.field === 'created_at' || column.field === 'updated_at') {
          cellContent = formatDate(incident[column.field as keyof EddsIncident] as string);
        } else if (column.field === 'addresses') {
          cellContent = renderAddressList(incident.addresses);
        } else {
          const rawValue = incident[column.field as keyof EddsIncident];
          cellContent = rawValue !== null && rawValue !== undefined ? String(rawValue) : '-';
        }
        return (
          <td key={`${incident.id}-${column.id}`} style={style} title={typeof cellContent === 'string' ? cellContent : undefined}>
            <div className={column.id === 'description' || column.id === 'title' ? 'text-truncate' : ''}>
              {cellContent}
            </div>
          </td>
        );
      });
  };

  const handleSearchSubmit = () => {
    if (onSearch) {
      onSearch(searchInput);
    }
  };

  const renderFilters = () => {
    if (!onFilterChange || !filterOptions || !activeFilters || !onApplyFilters || !onResetFilters) {
      return null;
    }

    return (
      <>
        <div className="mb-3">
          <InputGroup>
            <Form.Control
              placeholder="Поиск по названию, описанию, адресу..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
              disabled={loading}
            />
            <Button variant="primary" onClick={handleSearchSubmit} disabled={loading}>
              <i className="ti ti-search me-1"></i> Поиск
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => {
                setSearchInput('');
                onSearch && onSearch('');
              }}
              disabled={loading || !searchInput}
            >
              Сбросить
            </Button>
          </InputGroup>
        </div>

        <div className="card mb-3">
          <div className="card-header d-flex justify-content-between align-items-center py-2">
            <h5 className="mb-0">
              Фильтр
              {activeFilterCount > 0 && (
                <Badge pill bg="primary" className="ms-2">
                  {activeFilterCount}
                </Badge>
              )}
            </h5>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            >
              {isFilterExpanded ? (
                <>
                  <i className="ti ti-chevron-up me-1"></i>Скрыть
                </>
              ) : (
                <>
                  <i className="ti ti-chevron-down me-1"></i>Показать
                </>
              )}
            </Button>
          </div>
          {isFilterExpanded && (
            <div className="card-body">
              <Form>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Тип инцидента</Form.Label>
                      <Form.Select
                        size="sm"
                        value={activeFilters.incidentType}
                        onChange={(e) =>
                          onFilterChange('incidentType', e.target.value)
                        }
                        disabled={loading}
                      >
                        <option value="">Все типы</option>
                        {filterOptions?.incidentTypes?.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Тип ресурса</Form.Label>
                      <Form.Select
                        size="sm"
                        value={activeFilters.resourceType}
                        onChange={(e) =>
                          onFilterChange('resourceType', e.target.value)
                        }
                        disabled={loading}
                      >
                        <option value="">Все ресурсы</option>
                        {filterOptions?.resourceTypes?.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Тип обращения</Form.Label>
                      <Form.Select
                        size="sm"
                        value={activeFilters.isComplaint}
                        onChange={(e) =>
                          onFilterChange('isComplaint', e.target.value)
                        }
                        disabled={loading}
                      >
                        <option value="">Все</option>
                        <option value="true">Жалоба</option>
                        <option value="false">Инцидент</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                <div className="d-flex">
                  <Button
                    variant="primary"
                    onClick={onApplyFilters}
                    className="me-2"
                    disabled={loading}
                  >
                    <i className="ti ti-filter me-1"></i> Применить фильтр
                  </Button>
                  <Button
                    variant="outline-secondary"
                    onClick={onResetFilters}
                    disabled={loading || activeFilterCount === 0}
                  >
                    Сбросить фильтры
                  </Button>
                </div>
              </Form>
            </div>
          )}
        </div>
      </>
    );
  };

  const sortedData = sortData(data);

  return (
    <>
      {renderFilters()}
      
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          {!loading && (
            <div className="text-muted">
              Найдено записей: <span className="text-primary fw-bold">{totalItems}</span>
            </div>
          )}
        </div>
        <div>
          <Button 
            variant="light" 
            size="sm" 
            onClick={onToggleColumnsSettings}
            className="border"
          >
            <i className="ti ti-adjustments me-1"></i> Настройки таблицы
          </Button>
        </div>
      </div>
      
      <div className="table-responsive">
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" role="status">
              <span className="visually-hidden">Загрузка таблицы...</span>
            </Spinner>
            <p className="mt-2 text-primary">Загрузка таблицы...</p>
          </div>
        ) : error ? (
          <div className="text-center py-5 text-danger">
            <i className="ti ti-alert-circle icon-lg mb-2"></i>
            <p>Не удалось загрузить данные таблицы.</p>
            <p className="text-muted small">{error}</p>
          </div>
        ) : sortedData.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="ti ti-table-off icon-lg mb-2"></i>
            <p className="mb-0">Нет данных для отображения по заданным фильтрам.</p>
          </div>
        ) : (
          <>
            <table className="table table-hover table-bordered resizable-table mb-0" ref={tableRef}>
              <thead className="table-light">
                <tr>{renderTableHeaders()}</tr>
              </thead>
              <tbody>
                {sortedData.map((incident: EddsIncident) => (
                  <tr key={incident.id} className="cursor-pointer" onClick={() => onViewDetails(incident)}>
                    {renderTableRow(incident)}
                  </tr>
                ))}
              </tbody>
            </table>
            {renderPagination()}
          </>
        )}
      </div>

      <Offcanvas
        show={showColumnsSettings}
        onHide={onToggleColumnsSettings}
        placement="end"
        aria-labelledby="tableSettingsLabel"
      >
        <Offcanvas.Header closeButton className="bg-light">
          <Offcanvas.Title id="tableSettingsLabel" className="f-w-600">
            Настройки таблицы
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <p>Выберите столбцы для отображения:</p>
          <Form>
            {columns.map(column => (
              <Form.Group key={column.id} className="mb-2">
                <Form.Check
                  type="switch"
                  id={`column-${column.id}`}
                  label={column.title}
                  checked={column.visible}
                  onChange={(e) => handleColumnVisibilityChange(column.id, e.target.checked)}
                  disabled={column.field === 'actions'}
                />
              </Form.Group>
            ))}
          </Form>
          <hr />
          <div className="mt-4">
            <p className="text-muted small mb-2">
              Для изменения ширины столбцов перетащите правую границу заголовка таблицы.
            </p>
            <Button variant="outline-secondary" onClick={resetTableSettings} className="w-100" size="sm">
              Сбросить настройки таблицы
            </Button>
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      <style>
        {`
        .cursor-pointer { cursor: pointer; }
        .f-18 { font-size: 18px; }
        .f-w-600 { font-weight: 600; }
        .icon-lg { font-size: 2.5rem; }
        .sort-header { cursor: pointer; user-select: none; white-space: nowrap; }
        .sort-header:hover { background-color: rgba(0, 0, 0, 0.03); }
        .sort-header i { font-size: 1em; vertical-align: middle; }
        .resizable-table {
          table-layout: fixed;
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        .resizable-table th,
        .resizable-table td {
          position: relative;
          overflow: hidden;
          text-overflow: ellipsis;
          vertical-align: middle;
          padding: 0.5rem;
        }
        .resizable-table td div {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .resizable-table td div.small {
          white-space: normal;
        }
        .resize-handle {
          position: absolute;
          top: 0;
          right: -4px;
          width: 8px;
          height: 100%;
          cursor: col-resize;
          background-color: transparent;
          z-index: 10;
          border-right: 2px solid transparent;
        }
        .resize-handle:hover { border-right: 2px solid #0d6efd; }
        .resize-handle:active { border-right: 2px solid #0a58ca; }
        body.resizing { user-select: none !important; }
        body.resizing * { cursor: col-resize !important; }
        .th-content {
          padding: 0.1rem 0.2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .table-light th {
          background-color: #f8f9fa;
        }
        .table-hover tbody tr:hover {
          background-color: #eef2f7;
        }
        .table-bordered th, .table-bordered td {
          border-color: #e9ecef;
        }
        .pagination {
          margin-bottom: 0;
        }
        .page-item .page-link {
          min-width: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #495057;
          border-color: #dee2e6;
        }
        .page-item.active .page-link {
          background-color: #0d6efd;
          border-color: #0d6efd;
          color: #fff;
        }
        `}
      </style>
    </>
  );
};

export default EddsTable;