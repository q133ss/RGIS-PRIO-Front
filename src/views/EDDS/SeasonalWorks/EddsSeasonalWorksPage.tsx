import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Alert, ButtonGroup, Spinner, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
  getEddsSeasonalWorks,
  getIncidentTypes,
  getIncidentResourceTypes,
  EddsResponse,
  EddsIncident
} from '../../../services/api';
import EddsMap from '../common/EddsMap';
import EddsTable from '../common/EddsTable';
import EddsDetailModal from '../common/EddsDetailModal';

const MAX_API_RETRY_ATTEMPTS = 3;

const EddsSeasonalWorksPage: React.FC = () => {
  const [view, setView] = useState<'table' | 'map'>('table');
  const [data, setData] = useState<EddsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [apiRetryCount, setApiRetryCount] = useState<number>(0);
  const [showColumnsSettings, setShowColumnsSettings] = useState<boolean>(false);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [currentIncident, setCurrentIncident] = useState<EddsIncident | null>(null);
  const [activeFilters, setActiveFilters] = useState({
    incidentType: '',
    resourceType: '',
    isComplaint: ''
  });
  const [filterOptions, setFilterOptions] = useState<{
    incidentTypes: any[];
    resourceTypes: any[];
  }>({
    incidentTypes: [],
    resourceTypes: []
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    loadData();
    loadReferences();
  }, []);

  const loadData = async (page = 1) => {
    if (apiRetryCount >= MAX_API_RETRY_ATTEMPTS) {
      setError(`Не удалось загрузить данные после ${MAX_API_RETRY_ATTEMPTS} попыток. Пожалуйста, попробуйте позже.`);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params: any = { page };
      if (searchQuery) {
        params.title = searchQuery;
        params.description = searchQuery;
      }
      if (activeFilters.incidentType) {
        params.incident_type_id = parseInt(activeFilters.incidentType, 10);
      }
      if (activeFilters.resourceType) {
        params.incident_resource_type_id = parseInt(activeFilters.resourceType, 10);
      }
      if (activeFilters.isComplaint) {
        params.is_complaint = activeFilters.isComplaint === 'true';
      }
      const response = await getEddsSeasonalWorks(params);
      setData(response);
      setCurrentPage(page);
      setLoading(false);
    } catch (error) {
      setApiRetryCount(prev => prev + 1);
      setError(`Ошибка загрузки данных. Попытка ${apiRetryCount + 1}/${MAX_API_RETRY_ATTEMPTS}`);
      setLoading(false);
    }
  };

  const loadReferences = async () => {
    try {
      const [incidentTypes, resourceTypes] = await Promise.all([
        getIncidentTypes(),
        getIncidentResourceTypes()
      ]);
      setFilterOptions({ incidentTypes, resourceTypes });
    } catch (error) {
      console.error('Ошибка загрузки справочных данных:', error);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    loadData(1);
  };

  const handleFilterChange = (filterType: 'incidentType' | 'resourceType' | 'isComplaint', value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleApplyFilters = () => {
    loadData(1);
  };

  const handleResetFilters = () => {
    setActiveFilters({
      incidentType: '',
      resourceType: '',
      isComplaint: ''
    });
    if (activeFilters.incidentType || activeFilters.resourceType || activeFilters.isComplaint) {
      loadData(1);
    }
  };

  const handlePageChange = (page: number) => {
    loadData(page);
  };

  const handleViewDetails = (incident: EddsIncident) => {
    setDetailLoading(true);
    setCurrentIncident(incident);
    setShowDetailModal(true);
    setTimeout(() => {
      setDetailLoading(false);
    }, 300);
  };

  const toggleView = (newView: 'table' | 'map') => {
    setView(newView);
  };

  return (
    <React.Fragment>
      <div className="page-header">
        <div className="page-block">
          <div className="row align-items-center">
            <div className="col-md-6">
              <div className="page-header-title">
                <h5 className="m-b-10">Сезонные работы</h5>
              </div>
              <ul className="breadcrumb">
                <li className="breadcrumb-item">
                  <Link to="/dashboard">Главная</Link>
                </li>
                <li className="breadcrumb-item">
                  <Link to="#">ЕДДС</Link>
                </li>
                <li className="breadcrumb-item">Сезонные работы</li>
              </ul>
            </div>
            <div className="col-md-6 text-end">
              <ButtonGroup>
                <Button
                  variant={view === 'table' ? 'primary' : 'outline-primary'}
                  onClick={() => toggleView('table')}
                >
                  <i className="ti ti-table me-1"></i> Таблица
                </Button>
                <Button
                  variant={view === 'map' ? 'primary' : 'outline-primary'}
                  onClick={() => toggleView('map')}
                >
                  <i className="ti ti-map me-1"></i> Карта
                </Button>
              </ButtonGroup>
              <Button
                variant="outline-success"
                className="ms-2"
                onClick={() => loadData(currentPage)}
                disabled={loading}
                title="Обновить данные"
              >
                <i className="ti ti-refresh"></i>
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Row>
        <Col sm={12}>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center py-2">
              <Card.Title as="h5" className="mb-0">
                <i className="ti ti-calendar-event me-2 text-success"></i>
                Сезонные работы
                {!loading && data && (
                  <Badge 
                    bg="primary" 
                    className="ms-2" 
                    pill
                  >
                    {data.incidents.total}
                  </Badge>
                )}
              </Card.Title>
              {loading && (
                <Spinner 
                  animation="border" 
                  variant="primary" 
                  size="sm" 
                  className="me-2"
                />
              )}
            </Card.Header>
            <Card.Body>
              {error && (
                <Alert variant="danger" onClose={() => setError(null)} dismissible>
                  <div className="d-flex align-items-center">
                    <i className="ti ti-alert-triangle fs-5 me-2"></i>
                    <div>
                      <Alert.Heading className="mb-1">Ошибка</Alert.Heading>
                      <p className="mb-0">{error}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Button variant="outline-danger" size="sm" onClick={() => loadData(currentPage)}>
                      <i className="ti ti-refresh me-1"></i> Попробовать еще раз
                    </Button>
                  </div>
                </Alert>
              )}
              {view === 'table' ? (
                <EddsTable
                  data={data?.incidents.data || []}
                  loading={loading}
                  error={error}
                  currentPage={currentPage}
                  totalPages={data?.incidents.last_page || 1}
                  totalItems={data?.incidents.total || 0}
                  onPageChange={handlePageChange}
                  onViewDetails={handleViewDetails}
                  showColumnsSettings={showColumnsSettings}
                  onToggleColumnsSettings={() => setShowColumnsSettings(!showColumnsSettings)}
                  storageKey="eddsSeasonalWorksColumns"
                  onSearch={handleSearch}
                  filterOptions={filterOptions}
                  onFilterChange={handleFilterChange}
                  activeFilters={activeFilters}
                  onApplyFilters={handleApplyFilters}
                  onResetFilters={handleResetFilters}
                />
              ) : (
                <EddsMap
                  data={data}
                  loading={loading}
                  error={error}
                  onSearch={handleSearch}
                  activeFilters={activeFilters}
                  filterOptions={filterOptions}
                  onFilterChange={handleFilterChange}
                  onApplyFilters={handleApplyFilters}
                  onResetFilters={handleResetFilters}
                  onRefresh={() => loadData(currentPage)}
                  onViewDetails={handleViewDetails}
                />
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <EddsDetailModal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        incident={currentIncident}
        loading={detailLoading}
      />
      
      <style>
        {`
        .page-header {
          padding: 1.5rem 0;
          margin-bottom: 1.5rem;
          background-color: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
        }
        
        .page-block {
          padding: 0 1rem;
        }
        
        .page-header-title h5 {
          margin: 0;
          font-weight: 600;
          color: #495057;
        }
        
        .breadcrumb {
          margin-bottom: 0;
          padding: 0;
          background: transparent;
        }
        
        .breadcrumb-item a {
          color: #6c757d;
          text-decoration: none;
        }
        
        .breadcrumb-item a:hover {
          color: #0d6efd;
          text-decoration: underline;
        }
        
        .breadcrumb-item.active {
          color: #495057;
        }
        
        .card {
          box-shadow: 0 2px 6px rgba(0,0,0,0.05);
          border: 1px solid #e9ecef;
          margin-bottom: 1.5rem;
        }
        
        .card-header {
          background-color: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
        }
        
        .badge {
          font-weight: 500;
        }
        
        .btn-group .btn {
          border-radius: 0.25rem;
        }
        
        .btn-group .btn:not(:first-child) {
          border-top-left-radius: 0;
          border-bottom-left-radius: 0;
        }
        
        .btn-group .btn:not(:last-child) {
          border-top-right-radius: 0;
          border-bottom-right-radius: 0;
        }
        `}
      </style>
    </React.Fragment>
  );
};

export default EddsSeasonalWorksPage;