import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Spinner, Badge, Alert } from 'react-bootstrap';
import { EddsIncident, getAddressesByStreet, getStreets, getCities } from '../../../services/api';

interface EddsFormModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (data: Partial<EddsIncident>) => Promise<void>;
  incident?: EddsIncident | null;
  incidentTypes: any[];
  resourceTypes: any[];
  loading: boolean;
}

const EddsFormModal: React.FC<EddsFormModalProps> = ({
  show,
  onHide,
  onSave,
  incident,
  incidentTypes,
  resourceTypes,
  loading
}) => {
  // Состояние формы
  const [formData, setFormData] = useState<any>({
    title: '',
    description: '',
    incident_type_id: '',
    incident_resource_type_id: '',
    incident_status_id: '1', // По умолчанию "В работе"
    is_complaint: false,
    addresses: []
  });
  
  // Состояния для выбора адресов
  const [cities, setCities] = useState<any[]>([]);
  const [streets, setStreets] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedStreet, setSelectedStreet] = useState<string>('');
  const [selectedAddresses, setSelectedAddresses] = useState<any[]>([]);
  const [addressOptions, setAddressOptions] = useState<any[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Обновляем форму при получении инцидента для редактирования
  useEffect(() => {
    if (incident) {
      setFormData({
        title: incident.title || '',
        description: incident.description || '',
        incident_type_id: incident.type?.id || '',
        incident_resource_type_id: incident.resource_type?.id || '',
        incident_status_id: incident.status?.id || '1',
        is_complaint: incident.is_complaint || false,
        addresses: incident.addresses || []
      });
      
      // Устанавливаем выбранные адреса
      if (incident.addresses && incident.addresses.length > 0) {
        setSelectedAddresses(incident.addresses);
      }
    } else {
      // Сбрасываем форму для нового инцидента
      setFormData({
        title: '',
        description: '',
        incident_type_id: '',
        incident_resource_type_id: '',
        incident_status_id: '1',
        is_complaint: false,
        addresses: []
      });
      setSelectedAddresses([]);
    }
  }, [incident, show]);
  
  // Загружаем список городов при открытии формы
  useEffect(() => {
    if (show) {
      loadCities();
    }
  }, [show]);
  
  // Загружаем улицы при выборе города
  useEffect(() => {
    if (selectedCity) {
      loadStreets(parseInt(selectedCity, 10));
    } else {
      setStreets([]);
    }
    setSelectedStreet('');
  }, [selectedCity]);
  
  // Загружаем адреса при выборе улицы
  useEffect(() => {
    if (selectedStreet && selectedCity) {
      loadAddresses(parseInt(selectedStreet, 10), parseInt(selectedCity, 10));
    } else {
      setAddresses([]);
      setAddressOptions([]);
    }
  }, [selectedStreet, selectedCity]);
  
  const loadCities = async () => {
    try {
      setLoadingAddresses(true);
      const citiesData = await getCities();
      
      // Проверяем формат полученных данных
      let citiesArray = [];
      
      if (Array.isArray(citiesData)) {
        // Если API вернул массив
        citiesArray = citiesData;
      } else if (citiesData && typeof citiesData === 'object') {
        // Если API вернул объект с data полем (paginatedData)
        if (Array.isArray(citiesData.data)) {
          citiesArray = citiesData.data;
        } else {
          // Если это объект с городами, преобразуем его в массив
          citiesArray = Object.values(citiesData).filter(item => 
            item && typeof item === 'object' && 'id' in item && 'name' in item
          );
        }
      }
      
      setCities(citiesArray);
      
      // По умолчанию выбираем Воронеж (ID: 2)
      if (citiesArray.length > 0) {
        const voronezh = citiesArray.find(city => city.name === 'Воронеж') || citiesArray[0];
        setSelectedCity(voronezh.id.toString());
      }
      
      setLoadingAddresses(false);
    } catch (error) {
      console.error('Ошибка при загрузке городов:', error);
      setError('Не удалось загрузить список городов');
      setLoadingAddresses(false);
    }
  };
  
  const loadStreets = async (cityId: number) => {
    try {
      setLoadingAddresses(true);
      const streetsData = await getStreets(cityId);
      
      // Проверяем формат полученных данных
      let streetsArray = [];
      
      if (Array.isArray(streetsData)) {
        // Если API вернул массив
        streetsArray = streetsData;
      } else if (streetsData && typeof streetsData === 'object') {
        // Если API вернул объект с data полем (paginatedData)
        if (Array.isArray(streetsData.data)) {
          streetsArray = streetsData.data;
        } else {
          // Если это объект с улицами, преобразуем его в массив
          streetsArray = Object.values(streetsData).filter(item => 
            item && typeof item === 'object' && 'id' in item && 'name' in item
          );
        }
      }
      
      setStreets(streetsArray);
      setLoadingAddresses(false);
    } catch (error) {
      console.error('Ошибка при загрузке улиц:', error);
      setError('Не удалось загрузить список улиц');
      setLoadingAddresses(false);
    }
  };
  
  const loadAddresses = async (streetId: number, cityId: number) => {
    try {
      setLoadingAddresses(true);
      // Используем функцию getAddressesByStreet, передавая ID улицы и ID города
      const addressesData = await getAddressesByStreet(streetId, cityId);
      
      // Проверяем формат полученных данных
      let addressesArray = [];
      
      if (Array.isArray(addressesData)) {
        // Если API вернул массив
        addressesArray = addressesData;
      } else if (addressesData && typeof addressesData === 'object') {
        // Если API вернул объект с data полем (paginatedData)
        if (Array.isArray(addressesData.data)) {
          addressesArray = addressesData.data;
        } else {
          // Если это объект с адресами, преобразуем его в массив
          addressesArray = Object.values(addressesData).filter(item => 
            item && typeof item === 'object' && 'id' in item
          );
        }
      }
      
      setAddresses(addressesArray);
      
      // Обновляем список опций адресов для выбора
      const options = addressesArray.map(addr => ({
        value: addr.id,
        label: `${addr.house_number || ''}${addr.building ? ` корп. ${addr.building}` : ''}${addr.structure ? ` стр. ${addr.structure}` : ''}${addr.literature ? ` лит. ${addr.literature}` : ''}${addr.latitude && addr.longitude ? ' (есть координаты)' : ''}`
      }));
      
      setAddressOptions(options);
      setLoadingAddresses(false);
    } catch (error) {
      console.error('Ошибка при загрузке адресов:', error);
      setError('Не удалось загрузить список адресов');
      setLoadingAddresses(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Для checkbox обрабатываем отдельно
    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setFormData({
        ...formData,
        [name]: target.checked
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };
  
  const handleAddressChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const addressId = parseInt(e.target.value, 10);
    
    if (addressId) {
      const selectedAddress = addresses.find(addr => addr.id === addressId);
      
      if (selectedAddress && !selectedAddresses.some(addr => addr.id === addressId)) {
        setSelectedAddresses([...selectedAddresses, selectedAddress]);
      }
    }
  };
  
  const handleRemoveAddress = (addressId: number) => {
    setSelectedAddresses(selectedAddresses.filter(addr => addr.id !== addressId));
  };
  
  const handleSubmit = async () => {
    try {
      // Валидация
      if (!formData.title) {
        setError('Заголовок обязателен для заполнения');
        return;
      }
      
      if (!formData.incident_type_id) {
        setError('Тип инцидента обязателен для заполнения');
        return;
      }
      
      if (!formData.incident_resource_type_id) {
        setError('Тип ресурса обязателен для заполнения');
        return;
      }
      
      if (selectedAddresses.length === 0) {
        setError('Необходимо добавить хотя бы один адрес');
        return;
      }
      
      // Подготавливаем данные для отправки
      const dataToSave = {
        ...formData,
        addresses: selectedAddresses,
        address_ids: selectedAddresses.map(addr => addr.id)
      };
      
      // Вызываем функцию сохранения из пропсов
      await onSave(dataToSave);
      
      // Сбрасываем форму
      setFormData({
        title: '',
        description: '',
        incident_type_id: '',
        incident_resource_type_id: '',
        incident_status_id: '1',
        is_complaint: false,
        addresses: []
      });
      setSelectedAddresses([]);
      setError(null);
      
      // Закрываем модальное окно
      onHide();
    } catch (error) {
      console.error('Ошибка при сохранении инцидента:', error);
      setError('Не удалось сохранить инцидент. Пожалуйста, проверьте данные и повторите попытку.');
    }
  };
  
  return (
    <Modal
      show={show}
      onHide={onHide}
      backdrop="static"
      keyboard={false}
      size="lg"
    >
      <Modal.Header closeButton>
        <Modal.Title>{incident ? 'Редактирование инцидента' : 'Создание нового инцидента'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" onClose={() => setError(null)} dismissible>
            <i className="ti ti-alert-triangle me-2"></i>
            {error}
          </Alert>
        )}
        
        <Form>
          <Row className="mb-3">
            <Col md={7}>
              <Form.Group className="mb-3">
                <Form.Label>Заголовок *</Form.Label>
                <Form.Control
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Введите заголовок инцидента"
                  required
                />
              </Form.Group>
            </Col>
            <Col md={5}>
              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  label="Это жалоба"
                  name="is_complaint"
                  checked={formData.is_complaint}
                  onChange={handleInputChange}
                />
              </Form.Group>
            </Col>
          </Row>
          
          <Form.Group className="mb-3">
            <Form.Label>Описание</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Подробное описание инцидента"
            />
          </Form.Group>
          
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Тип инцидента *</Form.Label>
                <Form.Select
                  name="incident_type_id"
                  value={formData.incident_type_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Выберите тип инцидента</option>
                  {Array.isArray(incidentTypes) && incidentTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Тип ресурса *</Form.Label>
                <Form.Select
                  name="incident_resource_type_id"
                  value={formData.incident_resource_type_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Выберите тип ресурса</option>
                  {Array.isArray(resourceTypes) && resourceTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          
          <hr className="my-4" />
          
          <h5 className="mb-3">Адреса</h5>
          <Row className="mb-3">
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Город</Form.Label>
                <Form.Select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  disabled={loadingAddresses}
                >
                  <option value="">Выберите город</option>
                  {Array.isArray(cities) && cities.length > 0 ? (
                    cities.map(city => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))
                  ) : (
                    <option value="">Нет доступных городов</option>
                  )}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Улица</Form.Label>
                <Form.Select
                  value={selectedStreet}
                  onChange={(e) => setSelectedStreet(e.target.value)}
                  disabled={!selectedCity || loadingAddresses}
                >
                  <option value="">Выберите улицу</option>
                  {Array.isArray(streets) && streets.length > 0 ? (
                    streets.map(street => (
                      <option key={street.id} value={street.id}>
                        {street.name}
                      </option>
                    ))
                  ) : (
                    <option value="">Нет доступных улиц</option>
                  )}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Дом</Form.Label>
                <div className="d-flex">
                  <Form.Select
                    onChange={handleAddressChange}
                    disabled={!selectedStreet || loadingAddresses}
                  >
                    <option value="">Выберите дом</option>
                    {Array.isArray(addressOptions) && addressOptions.length > 0 ? (
                      addressOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))
                    ) : (
                      <option value="">Нет доступных домов</option>
                    )}
                  </Form.Select>
                  {loadingAddresses && (
                    <div className="ms-2 d-flex align-items-center">
                      <Spinner animation="border" size="sm" />
                    </div>
                  )}
                </div>
              </Form.Group>
            </Col>
          </Row>
          
          {selectedAddresses.length > 0 && (
            <div className="selected-addresses mb-3">
              <h6 className="mb-2">Выбранные адреса:</h6>
              <div className="address-list">
                {selectedAddresses.map(addr => (
                  <Badge 
                    key={addr.id} 
                    bg="light" 
                    text="dark" 
                    className="p-2 me-2 mb-2 d-inline-flex align-items-center border"
                  >
                    <div>
                      {addr.street?.city?.name && `${addr.street.city.name}, `}
                      {addr.street?.name && `${addr.street.name}, `}
                      д. {addr.house_number}
                      {addr.building && ` корп. ${addr.building}`}
                      {addr.structure && ` стр. ${addr.structure}`}
                      {addr.literature && ` лит. ${addr.literature}`}
                    </div>
                    <Button 
                      variant="link" 
                      className="ms-2 p-0 text-danger" 
                      onClick={() => handleRemoveAddress(addr.id)}
                    >
                      <i className="ti ti-x"></i>
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Отмена
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSubmit} 
          disabled={loading}
        >
          {loading ? (
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
            'Сохранить'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EddsFormModal;