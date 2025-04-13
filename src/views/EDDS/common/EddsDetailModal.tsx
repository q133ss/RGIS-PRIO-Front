import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner, Row, Col, Badge } from 'react-bootstrap';
import { EddsIncident, searchAddresses } from '../../../services/api';

interface EddsDetailModalProps {
  show: boolean;
  onHide: () => void;
  incident: EddsIncident | null;
  loading: boolean;
  onSave?: (updatedIncident: EddsIncident) => Promise<void>;
}

const EddsDetailModal: React.FC<EddsDetailModalProps> = ({
  show,
  onHide,
  incident,
  loading,
  onSave
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [updatedIncident, setUpdatedIncident] = useState<EddsIncident | null>(null);
  const [savingChanges, setSavingChanges] = useState(false);
  const [cityId, setCityId] = useState<number>(2); // Default to Voronezh (ID: 2)
  const [addressSearchQuery, setAddressSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Address[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  useEffect(() => {
    if (incident) {
      setUpdatedIncident({...incident});
      
      // If incident has addresses with a city, set the cityId
      if (incident.addresses && incident.addresses.length > 0 && 
          incident.addresses[0].street && incident.addresses[0].street.city) {
        setCityId(incident.addresses[0].street.city.id);
      }
    }
  }, [incident]);
  
  const handleSearchAddresses = async () => {
    if (!addressSearchQuery.trim()) return;
    
    try {
      setSearchLoading(true);
      const results = await searchAddresses(cityId, addressSearchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching addresses:', error);
    } finally {
      setSearchLoading(false);
    }
  };
  
  const handleAddAddress = (address: Address) => {
    if (!updatedIncident) return;
    
    // Check if this address is already added
    const isAddressAlreadyAdded = updatedIncident.addresses.some(addr => addr.id === address.id);
    
    if (!isAddressAlreadyAdded) {
      setUpdatedIncident({
        ...updatedIncident,
        addresses: [...updatedIncident.addresses, address]
      });
    }
    
    // Clear search results
    setSearchResults([]);
    setAddressSearchQuery('');
  };
  
  const handleRemoveAddress = (addressId: number) => {
    if (!updatedIncident) return;
    
    setUpdatedIncident({
      ...updatedIncident,
      addresses: updatedIncident.addresses.filter(addr => addr.id !== addressId)
    });
  };
  
  const handleSave = async () => {
    if (!updatedIncident || !onSave) return;
    
    try {
      setSavingChanges(true);
      await onSave(updatedIncident);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving incident:', error);
    } finally {
      setSavingChanges(false);
    }
  };
  
  const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return 'Не указана';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ru-RU', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Неверный формат даты';
    }
  };
  
  const getFormattedAddress = (address: any): string => {
    if (!address) return 'Адрес не указан';
    let addressText = '';
    if (address.street?.city?.name) addressText += `${address.street.city.name}, `;
    if (address.street?.name) addressText += `ул. ${address.street.name}, `;
    if (address.house_number) addressText += `д. ${address.house_number}`;
    if (address.building) addressText += ` корп. ${address.building}`;
    if (address.structure) addressText += ` стр. ${address.structure}`;
    if (address.literature) addressText += ` лит. ${address.literature}`;
    return addressText || 'Координаты указаны';
  };
  
  if (!incident) return null;
  
  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      backdrop="static"
      centered
    >
      <Modal.Header closeButton className="bg-light">
        <Modal.Title>
          {loading ? (
            <Spinner animation="border" size="sm" className="me-2" />
          ) : (
            <i className={`me-2 ${
              incident.is_complaint
                ? 'ti ti-message-circle text-warning'
                : 'ti ti-alert-triangle text-danger'
            }`}></i>
          )}
          {incident.title}
          {incident.is_complaint && (
            <Badge pill bg="warning" text="dark" className="ms-2">Жалоба</Badge>
          )}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
            <p className="mt-2 mb-0">Загрузка данных инцидента...</p>
          </div>
        ) : (
          <>
            <Row className="mb-3">
              <Col md={6}>
                <div className="mb-3">
                  <label className="text-muted small d-block">Тип:</label>
                  <div className="fw-medium">{incident.type?.name || 'Не указан'}</div>
                </div>
              </Col>
              <Col md={6}>
                <div className="mb-3">
                  <label className="text-muted small d-block">Ресурс:</label>
                  <div className="fw-medium">{incident.resource_type?.name || 'Не указан'}</div>
                </div>
              </Col>
            </Row>
            
            <div className="mb-3">
              <label className="text-muted small d-block">Описание:</label>
              <div className="border rounded p-2 bg-light">
                {incident.description || 'Описание отсутствует'}
              </div>
            </div>
            
            <Row className="mb-3">
              <Col md={6}>
                <div className="mb-3">
                  <label className="text-muted small d-block">Статус:</label>
                  <Badge 
                    bg={incident.status?.slug === 'new' ? 'danger' : 
                        incident.status?.slug === 'in_progress' ? 'warning' :
                        incident.status?.slug === 'resolved' ? 'success' : 'secondary'}
                    text={incident.status?.slug === 'in_progress' ? 'dark' : 'white'}
                  >
                    {incident.status?.name || 'Не указан'}
                  </Badge>
                </div>
              </Col>
              <Col md={6}>
                <div className="mb-3">
                  <label className="text-muted small d-block">Создан:</label>
                  <div className="fw-medium">{formatDate(incident.created_at)}</div>
                </div>
              </Col>
            </Row>
            
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="text-muted small mb-0">Адреса:</label>
                {isEditing && (
                  <Button 
                    variant="outline-primary" 
                    size="sm" 
                    onClick={() => setIsEditing(prev => !prev)}
                  >
                    <i className="ti ti-edit me-1"></i>
                    Редактировать адреса
                  </Button>
                )}
              </div>
              
              {isEditing ? (
                <div className="border rounded p-3">
                  <Row className="mb-3">
                    <Col>
                      <Form.Group className="mb-2">
                        <Form.Label>Поиск адреса:</Form.Label>
                        <div className="d-flex">
                          <Form.Control
                            type="text"
                            placeholder="Введите адрес..."
                            value={addressSearchQuery}
                            onChange={(e) => setAddressSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearchAddresses()}
                          />
                          <Button 
                            variant="primary" 
                            onClick={handleSearchAddresses} 
                            disabled={searchLoading}
                            className="ms-2"
                          >
                            {searchLoading ? (
                              <Spinner animation="border" size="sm" />
                            ) : (
                              <i className="ti ti-search"></i>
                            )}
                          </Button>
                        </div>
                        <Form.Text className="text-muted">
                          Введите часть адреса для поиска
                        </Form.Text>
                      </Form.Group>
                      
                      {searchResults.length > 0 && (
                        <div className="border rounded mt-2 p-2" style={{maxHeight: "200px", overflowY: "auto"}}>
                          <div className="small mb-1 text-muted">Результаты поиска:</div>
                          {searchResults.map(address => (
                            <div 
                              key={address.id} 
                              className="p-2 border-bottom d-flex justify-content-between align-items-center"
                            >
                              <div>{getFormattedAddress(address)}</div>
                              <Button 
                                variant="outline-success" 
                                size="sm"
                                onClick={() => handleAddAddress(address)}
                              >
                                <i className="ti ti-plus"></i>
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </Col>
                  </Row>
                  
                  <div className="mt-3">
                    <div className="text-muted small mb-2">Выбранные адреса:</div>
                    {updatedIncident?.addresses && updatedIncident.addresses.length > 0 ? (
                      updatedIncident.addresses.map(address => (
                        <div 
                          key={address.id} 
                          className="p-2 border rounded mb-2 d-flex justify-content-between align-items-center"
                        >
                          <div>{getFormattedAddress(address)}</div>
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => handleRemoveAddress(address.id)}
                          >
                            <i className="ti ti-trash"></i>
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-muted fst-italic">Адреса не выбраны</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border rounded p-3">
                  {incident.addresses && incident.addresses.length > 0 ? (
                    incident.addresses.map((address, index) => (
                      <div key={index} className="mb-1">
                        <i className="ti ti-map-pin me-2 text-primary"></i>
                        {getFormattedAddress(address)}
                      </div>
                    ))
                  ) : (
                    <div className="text-muted fst-italic">Адреса не указаны</div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        {isEditing ? (
          <>
            <Button 
              variant="outline-secondary" 
              onClick={() => {
                setIsEditing(false);
                setUpdatedIncident(incident ? {...incident} : null);
              }}
            >
              Отмена
            </Button>
            <Button 
              variant="success" 
              onClick={handleSave}
              disabled={savingChanges}
            >
              {savingChanges ? (
                <>
                  <Spinner animation="border" size="sm" className="me-1" />
                  Сохранение...
                </>
              ) : (
                <>
                  <i className="ti ti-check me-1"></i>
                  Сохранить изменения
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <Button 
              variant="outline-primary" 
              onClick={() => setIsEditing(true)}
            >
              <i className="ti ti-edit me-1"></i>
              Редактировать
            </Button>
            <Button variant="secondary" onClick={onHide}>
              Закрыть
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default EddsDetailModal;