import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Alert, ButtonGroup, Spinner, Badge, Modal, Form, InputGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
  getEddsAccidents,
  getIncidentTypes,
  getIncidentResourceTypes,
  updateEddsIncident,
  createIncident,
  EddsResponse,
  EddsIncident,
  getCities,
  searchAddresses
} from '../../../services/api';
import EddsMap from '../common/EddsMap';
import EddsTable from '../common/EddsTable';
import EddsDetailModal from '../common/EddsDetailModal';

const MAX_API_RETRY_ATTEMPTS = 3;

// Add this interface for the focused incident with specific address
interface FocusedIncidentWithAddress {
  incident: EddsIncident;
  address: any; // Use your actual Address type here
}

interface NewIncidentFormData {
  title: string;
  description: string;
  incident_type_id: number | undefined;
  incident_resource_type_id: number | undefined;
  is_complaint: boolean;
  addresses: {id: number}[];
}

// Add interfaces for API response structures
interface PaginatedResponse<T> {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  links: any[];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

interface City {
  id: number;
  name: string;
  region_id: number | null;
  created_at: string;
  updated_at: string;
}

interface Address {
  id: number;
  street_id: number;
  house_number: string;
  building: string | null;
  structure: string | null;
  literature: string | null;
  latitude: string;
  longitude: string;
  street?: {
    id: number;
    name: string;
    city?: {
      id: number;
      name: string;
    }
  };
}

const EddsAccidentsPage: React.FC = () => {
  const [view, setView] = useState<'table' | 'map'>('table');
  const [data, setData] = useState<EddsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [apiRetryCount, setApiRetryCount] = useState<number>(0);
  const [showColumnsSettings, setShowColumnsSettings] = useState<boolean>(false);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [currentIncident, setCurrentIncident] = useState<EddsIncident | null>(null);
  // Keep track of the specific address that was clicked
  const [currentAddress, setCurrentAddress] = useState<any>(null);
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
  
  // Replace the old focusedIncident state with the new one that includes address
  const [focusedIncidentWithAddress, setFocusedIncidentWithAddress] = useState<FocusedIncidentWithAddress | null>(null);

  // New state for the create incident modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [creatingIncident, setCreatingIncident] = useState<boolean>(false);
  const [incidentFormError, setIncidentFormError] = useState<string | null>(null);
  const [newIncidentForm, setNewIncidentForm] = useState<NewIncidentFormData>({
    title: '',
    description: '',
    incident_type_id: undefined,
    incident_resource_type_id: undefined,
    is_complaint: false,
    addresses: []
  });
  const [selectedAddresses, setSelectedAddresses] = useState<number[]>([]);
  const [addressSearchTerm, setAddressSearchTerm] = useState<string>('');
  const [availableAddresses, setAvailableAddresses] = useState<Address[]>([]);
  const [cities, setCities] = useState<City[]>([]); // Initialize as empty array
  const [selectedCity, setSelectedCity] = useState<number | null>(null);
  const [addressLoading, setAddressLoading] = useState<boolean>(false);

  useEffect(() => {
    loadData();
    loadReferences();
    loadCities();
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
      const response = await getEddsAccidents(params);
      setData(response);
      setCurrentPage(page);
      setLoading(false);
    } catch (err) {
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
      setFilterOptions({ 
        incidentTypes: Array.isArray(incidentTypes) ? incidentTypes : [],
        resourceTypes: Array.isArray(resourceTypes) ? resourceTypes : []
      });
    } catch (err) {
      console.error('Ошибка загрузки справочных данных:', err);
      setFilterOptions({ incidentTypes: [], resourceTypes: [] });
    }
  };

  const loadCities = async () => {
    try {
      const citiesResponse = await getCities();
      
      // Handle paginated response
      if (citiesResponse && typeof citiesResponse === 'object' && 'data' in citiesResponse && Array.isArray(citiesResponse.data)) {
        setCities(citiesResponse.data);
        // Default to first city if available
        if (citiesResponse.data.length > 0) {
          setSelectedCity(citiesResponse.data[0].id);
        }
      } 
      // Handle direct array response
      else if (Array.isArray(citiesResponse)) {
        setCities(citiesResponse);
        if (citiesResponse.length > 0) {
          setSelectedCity(citiesResponse[0].id);
        }
      } else {
        console.error('Некорректный формат данных городов:', citiesResponse);
        setCities([]);
      }
    } catch (err) {
      console.error('Ошибка загрузки городов:', err);
      setCities([]);
    }
  };

  const loadAddresses = async (cityId: number, searchTerm: string = '') => {
    if (!cityId) return;
    
    try {
      setAddressLoading(true);
      const addressesResponse = await searchAddresses(cityId, searchTerm);
      
      // Handle paginated response
      if (addressesResponse && typeof addressesResponse === 'object' && 'data' in addressesResponse && Array.isArray(addressesResponse.data)) {
        setAvailableAddresses(addressesResponse.data);
      } 
      // Handle direct array response
      else if (Array.isArray(addressesResponse)) {
        setAvailableAddresses(addressesResponse);
      } else {
        console.warn('Некорректный формат данных адресов:', addressesResponse);
        setAvailableAddresses([]);
      }
    } catch (err) {
      console.error('Ошибка загрузки адресов:', err);
      setAvailableAddresses([]);
    } finally {
      setAddressLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCity && showCreateModal) {
      loadAddresses(selectedCity, addressSearchTerm);
    }
  }, [selectedCity, addressSearchTerm, showCreateModal]);

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
    setCurrentAddress(null); // Reset the current address
    setShowDetailModal(true);
    setTimeout(() => {
      setDetailLoading(false);
    }, 300);
  };

  // New handler function that also accepts a specific address
  const handleViewDetailsWithAddress = (incident: EddsIncident, address: any) => {
    setDetailLoading(true);
    setCurrentIncident(incident);
    setCurrentAddress(address); // Store the specific address
    setShowDetailModal(true);
    setTimeout(() => {
      setDetailLoading(false);
    }, 300);
  };

  const handleSaveIncidentChanges = async (updatedIncident: EddsIncident): Promise<void> => {
    try {
      // Show a loading state
      setDetailLoading(true);
      
      // Call the API to update the incident
      const result = await updateEddsIncident(updatedIncident.id, updatedIncident);
      
      // Update the current incident with the result
      setCurrentIncident(result);
      
      // If this incident is in our data, update it there as well
      if (data && data.incidents && data.incidents.data) {
        const updatedData = { ...data };
        const incidentIndex = updatedData.incidents.data.findIndex(inc => inc.id === result.id);
        
        if (incidentIndex !== -1) {
          updatedData.incidents.data[incidentIndex] = result;
          setData(updatedData);
        }
      }
      
      // If this is the focused incident, update that as well
      if (focusedIncidentWithAddress && focusedIncidentWithAddress.incident.id === result.id) {
        setFocusedIncidentWithAddress({
          incident: result,
          address: focusedIncidentWithAddress.address
        });
      }
      
    } catch (err) {
      console.error('Error updating incident:', err);
      // Show error notification
      setError('Ошибка при обновлении данных инцидента.');
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleView = (newView: 'table' | 'map') => {
    setView(newView);
    
    // If we're switching to map view and we have a focused incident, we want to keep focusing on it
    if (newView === 'map' && focusedIncidentWithAddress) {
      // Focusing will happen automatically because the focusedIncidentWithAddress state is already set
    } else {
      // Otherwise, clear the focused incident
      setFocusedIncidentWithAddress(null);
    }
  };

  const handleShowOnMap = (incident: EddsIncident) => {
    // Find a valid address to focus on (first one with coordinates)
    const address = incident.addresses && incident.addresses.length > 0 
      ? incident.addresses.find(addr => addr.latitude && addr.longitude) || incident.addresses[0]
      : null;
    
    setFocusedIncidentWithAddress({
      incident: incident,
      address: address
    });
    
    setView('map');
  };

  // New handlers for the create incident modal
  const handleOpenCreateModal = () => {
    setIncidentFormError(null);
    setNewIncidentForm({
      title: '',
      description: '',
      incident_type_id: filterOptions?.incidentTypes?.[0]?.id || undefined,
      incident_resource_type_id: filterOptions?.resourceTypes?.[0]?.id || undefined,
      is_complaint: false,
      addresses: []
    });
    setSelectedAddresses([]);
    setAddressSearchTerm('');
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setCreatingIncident(false);
    setIncidentFormError(null);
  };

  const handleIncidentInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewIncidentForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleIncidentSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewIncidentForm(prev => ({
      ...prev,
      [name]: value ? parseInt(value, 10) : undefined
    }));
  };

  const handleToggleComplaint = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewIncidentForm(prev => ({
      ...prev,
      is_complaint: e.target.checked
    }));
  };

  const handleAddressSelection = (e: React.ChangeEvent<HTMLInputElement>, addressId: number) => {
    const isSelected = e.target.checked;
    if (isSelected) {
      setSelectedAddresses(prev => [...prev, addressId]);
    } else {
      setSelectedAddresses(prev => prev.filter(id => id !== addressId));
    }
  };

  const handleCreateIncident = async () => {
    // Validate form
    if (!newIncidentForm.title.trim()) {
      setIncidentFormError('Введите заголовок инцидента');
      return;
    }
    
    if (!newIncidentForm.incident_type_id) {
      setIncidentFormError('Выберите тип инцидента');
      return;
    }
    
    if (!newIncidentForm.incident_resource_type_id) {
      setIncidentFormError('Выберите тип ресурса');
      return;
    }
    
    if (selectedAddresses.length === 0) {
      setIncidentFormError('Выберите хотя бы один адрес');
      return;
    }
    
    try {
      setCreatingIncident(true);
      setIncidentFormError(null);
      
      // Update addresses with selected IDs
      const formData = {
        title: newIncidentForm.title,
        description: newIncidentForm.description,
        incident_type_id: newIncidentForm.incident_type_id,
        incident_resource_type_id: newIncidentForm.incident_resource_type_id,
        is_complaint: newIncidentForm.is_complaint,
        address_ids: selectedAddresses
      };
      
      await createIncident(formData);
      handleCloseCreateModal();
      
      // Reload data to show the new incident
      loadData(currentPage);
      
      // Alert user of success (could be improved with a toast notification)
      setError(null);
      
    } catch (err) {
      console.error('Error creating incident:', err);
      setIncidentFormError(err instanceof Error ? err.message : 'Не удалось создать инцидент');
    } finally {
      setCreatingIncident(false);
    }
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cityId = parseInt(e.target.value, 10);
    setSelectedCity(cityId);
    setSelectedAddresses([]);
    setAddressSearchTerm('');
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

  return (
    <React.Fragment>
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
                <li className="breadcrumb-item">
                  <Link to="#">ЕДДС</Link>
                </li>
                <li className="breadcrumb-item">Аварии</li>
              </ul>
            </div>
            <div className="col-md-6 text-end">
              <div className="d-flex justify-content-end align-items-center">
                <ButtonGroup className="me-2">
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
                  className="me-2"
                  onClick={() => loadData(currentPage)}
                  disabled={loading}
                  title="Обновить данные"
                >
                  <i className="ti ti-refresh"></i>
                </Button>
                
                <Button
                  variant="success"
                  onClick={handleOpenCreateModal}
                >
                  <i className="ti ti-plus me-1"></i> Создать инцидент
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Row>
        <Col sm={12}>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center py-2">
              <Card.Title as="h5" className="mb-0">
                <i className="ti ti-alert-triangle text-danger me-2"></i>
                Аварии
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
                  storageKey="eddsAccidentsColumns"
                  onSearch={handleSearch}
                  filterOptions={filterOptions}
                  onFilterChange={handleFilterChange}
                  activeFilters={activeFilters}
                  onApplyFilters={handleApplyFilters}
                  onResetFilters={handleResetFilters}
                  onShowOnMap={handleShowOnMap}
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
                  onViewDetailsWithAddress={handleViewDetailsWithAddress}
                  focusedIncidentWithAddress={focusedIncidentWithAddress}
                />
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Detail Modal */}
      <EddsDetailModal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        incident={currentIncident}
        loading={detailLoading}
        onSave={handleSaveIncidentChanges}
      />

      {/* Create Incident Modal */}
      <Modal
        show={showCreateModal}
        onHide={handleCloseCreateModal}
        backdrop="static"
        keyboard={false}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Создание нового инцидента</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {incidentFormError && (
            <div className="alert alert-danger" role="alert">
              <i className="ti ti-alert-circle me-2"></i>
              {incidentFormError}
            </div>
          )}
          
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Заголовок <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="text"
                name="title"
                placeholder="Введите заголовок инцидента"
                value={newIncidentForm.title}
                onChange={handleIncidentInputChange}
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Описание</Form.Label>
              <Form.Control
                as="textarea"
                name="description"
                placeholder="Введите описание инцидента"
                value={newIncidentForm.description}
                onChange={handleIncidentInputChange}
                rows={3}
              />
            </Form.Group>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Тип инцидента <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    name="incident_type_id"
                    value={newIncidentForm.incident_type_id || ''}
                    onChange={handleIncidentSelectChange}
                    required
                  >
                    <option value="">Выберите тип инцидента</option>
                    {Array.isArray(filterOptions?.incidentTypes) && filterOptions.incidentTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Тип ресурса <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    name="incident_resource_type_id"
                    value={newIncidentForm.incident_resource_type_id || ''}
                    onChange={handleIncidentSelectChange}
                    required
                  >
                    <option value="">Выберите тип ресурса</option>
                    {Array.isArray(filterOptions?.resourceTypes) && filterOptions.resourceTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                id="is-complaint-checkbox"
                label="Это жалоба от населения"
                checked={newIncidentForm.is_complaint}
                onChange={handleToggleComplaint}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Город</Form.Label>
              <Form.Select
                value={selectedCity || ''}
                onChange={handleCityChange}
                disabled={addressLoading}
              >
                <option value="">Выберите город</option>
                {Array.isArray(cities) && cities.map(city => (
                  <option key={`city-${city.id}`} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Адреса <span className="text-danger">*</span></Form.Label>
              <InputGroup className="mb-2">
                <Form.Control
                  placeholder="Поиск адреса..."
                  value={addressSearchTerm}
                  onChange={(e) => setAddressSearchTerm(e.target.value)}
                  disabled={!selectedCity || addressLoading}
                />
                {addressSearchTerm && (
                  <Button 
                    variant="outline-secondary" 
                    onClick={() => setAddressSearchTerm('')}
                    disabled={addressLoading}
                  >
                    <i className="ti ti-x"></i>
                  </Button>
                )}
              </InputGroup>
              
              <div className="address-list border rounded p-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {addressLoading ? (
                  <div className="text-center py-3">
                    <Spinner animation="border" size="sm" variant="primary" />
                    <p className="mb-0 mt-2">Загрузка адресов...</p>
                  </div>
                ) : availableAddresses.length > 0 ? (
                  availableAddresses.map((address, index) => (
                    <div key={`addr-${address.id}-${index}`} className="d-flex align-items-center mb-2">
                      <Form.Check
                        type="checkbox"
                        id={`address-${address.id}-${index}`}
                        checked={selectedAddresses.includes(address.id)}
                        onChange={(e) => handleAddressSelection(e, address.id)}
                        label={getAddressTooltip(address)}
                      />
                    </div>
                  ))
                ) : selectedCity ? (
                  <div className="text-center text-muted py-3">
                    {addressSearchTerm ? 'Нет адресов, соответствующих поисковому запросу' : 'Нет доступных адресов'}
                  </div>
                ) : (
                  <div className="text-center text-muted py-3">
                    Выберите город для загрузки адресов
                  </div>
                )}
              </div>
              
              <div className="mt-2 small text-muted">
                Выбрано адресов: {selectedAddresses.length}
              </div>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseCreateModal} disabled={creatingIncident}>
            Отмена
          </Button>
          <Button 
            variant="primary" 
            onClick={handleCreateIncident}
            disabled={creatingIncident}
          >
            {creatingIncident ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                Создание...
              </>
            ) : (
              'Создать инцидент'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
      
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

export default EddsAccidentsPage;