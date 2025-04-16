import React, { useEffect, useState, useRef } from 'react';
import { Card, Row, Col, Modal, Button, Spinner, Form, Toast, ToastContainer } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import {
  initializeApi,
  getFreeCapacityMapData,
  fetchUserCoords,
  getFreeCapacityResources,
  getFreeCapacityEquipment,
  getOrganizations,
  TOKEN_KEY
} from '../../services/api';
import { MapBoundaries } from '../../services/api';

declare global {
  interface Window {
    ymaps: any;
  }
}

interface FreeCapacityArea {
  id: number;
  coordinates: number[][];
  resource?: {
    id: number;
    name: string;
    slug: string;
    created_at: string;
    updated_at: string;
  };
  equipment?: {
    id: number;
    name: string;
    slug: string;
    created_at: string;
    updated_at: string;
  };
  org?: {
    id: number;
    fullName: string;
    shortName: string;
    inn: string;
    ogrn: string;
    orgAddress: string;
    phone: string;
    url: string | null;
    created_at: string;
    updated_at: string;
  };
  created_at: string;
  updated_at: string;
  resource_type_id?: number;
  equipment_type_id?: number;
  org_id?: number;
}

interface FilterState {
  resource_type_id: number | null;
  equipment_type_id: number | null;
  org_id: number | null;
}

const FreeCapacityMap: React.FC = () => {
  const [areas, setAreas] = useState<FreeCapacityArea[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<FreeCapacityArea | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [mapBoundaries, setMapBoundaries] = useState<MapBoundaries | null>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    resource_type_id: null,
    equipment_type_id: null,
    org_id: null
  });
  const [activeFilters, setActiveFilters] = useState<number>(0);
  const [isAuthError, setIsAuthError] = useState<boolean>(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const navigate = useNavigate();

  const fetchInitialData = async () => {
    try {
      const [resourcesData, equipmentData, orgsData] = await Promise.all([
        getFreeCapacityResources(),
        getFreeCapacityEquipment(),
        getOrganizations()
      ]);

      setResources(resourcesData || []);
      setEquipment(equipmentData || []);
      setOrganizations(orgsData || []);
    } catch (err) {
      console.error('Error fetching filter data:', err);
    }
  };

  const handleReturnToDashboard = () => {
    navigate('/dashboard');
  };

  const handleRelogin = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const fetchMapData = async (filterParams?: FilterState): Promise<void> => {
    try {
      console.log('Текущие фильтры:', filterParams);

      setLoading(true);
      setError(null);
      setIsAuthError(false);

      await initializeApi();

      // Получаем границы карты для пользователя
      const coords = await fetchUserCoords();
      setMapBoundaries(coords);

      // Формируем параметры запроса
      const params: any = {}; // Заменил HeatMapParams на any для совместимости
      if (filterParams?.resource_type_id) {
        params.resource_type_id = filterParams.resource_type_id;
      }
      if (filterParams?.equipment_type_id) {
        params.equipment_type_id = filterParams.equipment_type_id;
      }
      if (filterParams?.org_id) {
        params.org_id = filterParams.org_id;
      }

      console.log('Отправляемые параметры:', params);

      // Получаем данные о свободных мощностях
      const response = await getFreeCapacityMapData(params);

      console.log('Полученные данные:', response);

      if (response && response.length > 0) {
        setAreas(response);
      } else {
        setAreas([]);
      }
    } catch (err) {
      console.error('Ошибка при загрузке данных:', err);
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      
      // Проверяем, связана ли ошибка с авторизацией
      if (
        errorMessage.includes('авторизац') || 
        errorMessage.includes('Unauthorized') || 
        errorMessage.includes('Unauthenticated') ||
        errorMessage.includes('токен') ||
        errorMessage.includes('Token')
      ) {
        setIsAuthError(true);
        setError('У вас нет прав доступа к странице свободных мощностей. Обратитесь к администратору системы.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const initMap = (): void => {
    if (!mapRef.current || !window.ymaps || !mapBoundaries || areas.length === 0) return;

    try {
      // Очищаем предыдущую карту, если она существует
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
      }

      const myMap = new window.ymaps.Map(mapRef.current, {
        center: [mapBoundaries.center_lat, mapBoundaries.center_lng],
        zoom: 12,
        controls: ['zoomControl', 'typeSelector', 'fullscreenControl']
      });

      // Устанавливаем границы карты
      const bounds = [
        [mapBoundaries.south_west_lat, mapBoundaries.south_west_lng],
        [mapBoundaries.north_east_lat, mapBoundaries.north_east_lng]
      ];

      myMap.behaviors.enable('scrollZoom');
      myMap.setBounds(bounds, { checkZoomRange: true });
      myMap.options.set('restrictMapArea', bounds);

      mapInstanceRef.current = myMap;

      // Добавляем области на карту
      areas.forEach(area => {
        if (area.coordinates && area.coordinates.length > 0) {
          const polygon = new window.ymaps.Polygon(
              [area.coordinates],
              {
                hintContent: area.org?.shortName || 'Неизвестная организация',
                balloonContent: `
                <div>
                  <strong>${area.resource?.name || 'Неизвестный ресурс'}</strong><br>
                  Оборудование: ${area.equipment?.name || 'Неизвестное оборудование'}<br>
                  Организация: ${area.org?.shortName || 'Неизвестная организация'}
                </div>
              `
              },
              {
                fillColor: getAreaColor(area.resource?.slug || ''),
                strokeColor: '#000000',
                opacity: 0.5,
                strokeWidth: 2,
                strokeStyle: 'solid'
              }
          );

          polygon.events.add('click', () => {
            setSelectedArea(area);
            setShowModal(true);
          });

          myMap.geoObjects.add(polygon);
        }
      });

    } catch (error) {
      setError('Ошибка при инициализации карты. Пожалуйста, обновите страницу.');
    }
  };

  const getAreaColor = (resourceSlug: string): string => {
    switch (resourceSlug) {
      case 'water':
        return '#1E90FF'; // DodgerBlue
      case 'electricity':
        return '#FFD700'; // Gold
      case 'gas':
        return '#FF4500'; // OrangeRed
      case 'heat':
        return '#DC143C'; // Crimson
      default:
        return '#32CD32'; // LimeGreen
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Не указана';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU');
  };

  const applyFilters = (): void => {
    fetchMapData(filters);
  };

  const clearFilters = (): void => {
    setFilters({
      resource_type_id: null,
      equipment_type_id: null,
      org_id: null
    });
    fetchMapData();
  };

  useEffect(() => {
    fetchInitialData();
    fetchMapData();
  }, []);

  useEffect(() => {
    // Пересчитываем количество активных фильтров
    let count = 0;
    if (filters.resource_type_id !== null) count++;
    if (filters.equipment_type_id !== null) count++;
    if (filters.org_id !== null) count++;
    setActiveFilters(count);
  }, [filters]);

  useEffect(() => {
    const loadYandexMapsApi = (): void => {
      if (window.ymaps) {
        window.ymaps.ready(initMap);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://api-maps.yandex.ru/2.1/?apikey=9b9469e9-98d9-4c6d-9b5d-4272b266a69e&lang=ru_RU';
      script.type = 'text/javascript';
      script.async = true;

      script.onload = () => {
        if (window.ymaps) {
          window.ymaps.ready(initMap);
        }
      };

      script.onerror = () => {
        setError('Не удалось загрузить API Яндекс.Карт');
      };

      document.head.appendChild(script);
    };

    if (!loading && areas.length > 0 && mapBoundaries) {
      loadYandexMapsApi();
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, [loading, areas, mapBoundaries]);

  return (
    <React.Fragment>
      <div className="page-header">
        <div className="page-block">
          <div className="row align-items-center">
            <div className="col-md-12">
              <div className="page-header-title">
                <h5 className="m-b-10">Карта свободных мощностей</h5>
              </div>
              <ul className="breadcrumb">
                <li className="breadcrumb-item">
                  <Link to="/dashboard">Главная</Link>
                </li>
                <li className="breadcrumb-item">Карты</li>
                <li className="breadcrumb-item">Свободные мощности</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <Card className="mb-3">
        <Card.Body>
          <div className="d-flex flex-wrap gap-3 justify-content-center">
            <div className="d-flex align-items-center">
              <span className="legend-dot rounded-circle me-2" style={{ backgroundColor: '#1E90FF' }}></span>
              <span>Водоснабжение</span>
            </div>
            <div className="d-flex align-items-center">
              <span className="legend-dot rounded-circle me-2" style={{ backgroundColor: '#FFD700' }}></span>
              <span>Электричество</span>
            </div>
            <div className="d-flex align-items-center">
              <span className="legend-dot rounded-circle me-2" style={{ backgroundColor: '#FF4500' }}></span>
              <span>Газ</span>
            </div>
            <div className="d-flex align-items-center">
              <span className="legend-dot rounded-circle me-2" style={{ backgroundColor: '#DC143C' }}></span>
              <span>Теплоснабжение</span>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Блок с фильтрами доступен только если нет ошибки авторизации */}
      {!isAuthError && (
        <Card className="mb-3">
          <Card.Header>
            <h5 className="mb-0">
              Фильтры
              {activeFilters > 0 && (
                <span className="ms-2 badge bg-primary">{activeFilters}</span>
              )}
            </h5>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Тип ресурса</Form.Label>
                  <Form.Select
                    value={filters.resource_type_id || ''}
                    onChange={(e) => setFilters({
                      ...filters,
                      resource_type_id: e.target.value ? Number(e.target.value) : null
                    })}
                  >
                    <option value="">Все ресурсы</option>
                    {resources.map(resource => (
                      <option key={resource.id} value={resource.id}>
                        {resource.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Тип оборудования</Form.Label>
                  <Form.Select
                    value={filters.equipment_type_id || ''}
                    onChange={(e) => setFilters({
                      ...filters,
                      equipment_type_id: e.target.value ? Number(e.target.value) : null
                    })}
                  >
                    <option value="">Все оборудование</option>
                    {equipment.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Организация</Form.Label>
                  <Form.Select
                    value={filters.org_id || ''}
                    onChange={(e) => setFilters({
                      ...filters,
                      org_id: e.target.value ? Number(e.target.value) : null
                    })}
                  >
                    <option value="">Все организации</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>
                        {org.shortName || org.fullName}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <div className="d-flex">
              <Button variant="primary" onClick={applyFilters} className="me-2">
                Применить фильтры
              </Button>
              <Button variant="outline-secondary" onClick={clearFilters}>
                Сбросить фильтры
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      <Row>
        <Col sm={12}>
          <Card>
            <Card.Body>
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                  {isAuthError && (
                    <div className="mt-3">
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        onClick={handleReturnToDashboard}
                        className="me-2"
                      >
                        <i className="ti ti-home me-1"></i> Вернуться на главную
                      </Button>
                      <Button 
                        variant="outline-secondary" 
                        size="sm" 
                        onClick={handleRelogin}
                      >
                        <i className="ti ti-logout me-1"></i> Выйти и войти снова
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Загрузка...</span>
                  </Spinner>
                  <p className="mt-2">Загрузка данных...</p>
                </div>
              ) : isAuthError ? (
                <div className="text-center py-5">
                  <i className="fas fa-lock text-danger" style={{ fontSize: '4rem' }}></i>
                  <h4 className="mt-3 mb-0">Доступ запрещен</h4>
                  <p className="text-muted mt-2">У вас нет прав для просмотра карты свободных мощностей</p>
                </div>
              ) : areas.length === 0 ? (
                <div className="alert alert-info" role="alert">
                  Нет данных о свободных мощностях для отображения
                </div>
              ) : (
                <div className="map-container">
                  <div id="map" ref={mapRef} className="map" style={{ width: '100%', height: '600px' }}></div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>
            {selectedArea?.resource?.name || 'Информация о свободной мощности'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedArea && (
            <>
              <div className="row mb-3">
                <div className="col-md-6">
                  <div className="d-flex align-items-center mb-2">
                    <span className="badge bg-primary me-2">Ресурс</span>
                    <span>{selectedArea.resource?.name || 'Неизвестный ресурс'}</span>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="d-flex align-items-center mb-2">
                    <span className="badge bg-primary me-2">Оборудование</span>
                    <span>{selectedArea.equipment?.name || 'Неизвестное оборудование'}</span>
                  </div>
                </div>
              </div>

              <div className="mb-4 p-3 border-start border-4 border-info bg-light">
                <div className="d-flex align-items-center mb-3">
                  <i className="fas fa-building me-2 text-info fs-4"></i>
                  <div className="w-100">
                    <strong>Организация:</strong><br />
                    <div className="d-flex justify-content-between align-items-center flex-wrap">
                      <span>{selectedArea.org?.shortName || selectedArea.org?.fullName || 'Неизвестная организация'}</span>
                      {selectedArea.org?.url && (
                        <a
                          href={selectedArea.org?.url?.startsWith('http') ? selectedArea.org?.url : `https://${selectedArea.org?.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-primary mt-1"
                        >
                          <i className="fas fa-external-link-alt me-1"></i> Сайт
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="row mt-2">
                  <div className="col-md-6">
                    <small className="text-muted d-block mb-1">ИНН:</small>
                    <div className="fw-bold">{selectedArea.org?.inn || 'Н/Д'}</div>
                  </div>
                  <div className="col-md-6">
                    <small className="text-muted d-block mb-1">ОГРН:</small>
                    <div className="fw-bold">{selectedArea.org?.ogrn || 'Н/Д'}</div>
                  </div>
                </div>
                <div className="row mt-2">
                  <div className="col-md-6">
                    <small className="text-muted d-block mb-1">Телефон:</small>
                    <div className="fw-bold">{selectedArea.org?.phone || 'Н/Д'}</div>
                  </div>
                  <div className="col-md-6">
                    <small className="text-muted d-block mb-1">Адрес:</small>
                    <div className="fw-bold">{selectedArea.org?.orgAddress || 'Н/Д'}</div>
                  </div>
                </div>
              </div>

              <div className="row mt-3">
                <div className="col-md-6">
                  <small className="text-muted">
                    <i className="far fa-calendar-plus me-1"></i>
                    Создан: {formatDate(selectedArea.created_at)}
                  </small>
                </div>
                <div className="col-md-6">
                  <small className="text-muted">
                    <i className="far fa-calendar-alt me-1"></i>
                    Обновлен: {formatDate(selectedArea.updated_at)}
                  </small>
                </div>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Закрыть
          </Button>
        </Modal.Footer>
      </Modal>

      <ToastContainer
        position="top-end"
        className="p-3"
        style={{ zIndex: 9999 }}
      >
        <Toast
          show={false}
          onClose={() => {}}
          delay={5000}
          autohide
          bg="info"
        >
          <Toast.Header>
            <strong className="me-auto">Уведомление</strong>
          </Toast.Header>
          <Toast.Body className="text-white">
            {/* Сообщение уведомления будет здесь */}
          </Toast.Body>
        </Toast>
      </ToastContainer>

      <style>{`
        .map-container {
          width: 100%;
          height: 100%;
          min-height: 600px;
          position: relative;
          overflow: hidden;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .map {
          width: 100% !important;
          height: 600px !important;
          border-radius: 8px;
          display: block;
        }
        
        [class*="ymaps-2"][class*="-map"] {
          border-radius: 8px;
          width: 100% !important;
          height: 100% !important;
        }

        .card-body {
          padding: 1rem;
          overflow: visible !important;
        }
        
        .cursor-pointer {
          cursor: pointer;
        }
        
        .legend-dot {
          width: 16px;
          height: 16px;
          display: inline-block;
        }
        
        .info-card {
          border-radius: 4px;
          transition: all 0.2s ease;
        }
        
        .info-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
      `}</style>
    </React.Fragment>
  );
};

export default FreeCapacityMap;