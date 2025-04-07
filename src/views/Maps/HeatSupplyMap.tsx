import React, { useEffect, useState, useRef } from 'react';
import { Card, Row, Col, Modal, Button, Spinner, Form, ButtonGroup, InputGroup, Toast, ToastContainer } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
  initializeApi,
  getHeatSupplyMapData,
  getHeatSourceTypes,
  getOrganizations,
  getHeatSourcePeriods,
  getHeatSourceDetails
} from '../../services/api';
import { HeatMapParams, HeatSupplyMapItem } from '../../services/api';

declare global {
  interface Window {
    ymaps: any;
  }
}

interface HeatSource {
  id: number;
  name?: string;
  type?: { id: number; name: string; slug?: string };
  period?: { id: number; name: string };
  owner?: { id: number; shortName?: string; fullName?: string; phone?: string; email?: string; address?: string };
  org?: { id: number; shortName?: string; fullName?: string; phone?: string; email?: string; address?: string };
  parameters?: {
    coordinates?: {
      center_lat?: string;
      center_lng?: string;
      south_west_lat?: string;
      south_west_lng?: string;
      north_east_lat?: string;
      north_east_lng?: string;
    };
    installed_capacity?: string;
    available_capacity?: string;
    primary_fuel?: string;
    secondary_fuel?: string;
    temperature_graph?: string;
    current_temperature?: string;
    current_pressure?: string;
    hydraulic_tests?: string;
    addresses?: any[];
    supply_address_ids?: number[];
  };
  created_at: string;
  updated_at: string;
}

const HeatSupplyMap: React.FC = () => {
  const [heatSources, setHeatSources] = useState<HeatSource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHeatSource, setSelectedHeatSource] = useState<HeatSource | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [hsTypes, setHsTypes] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [highlightedAddresses, setHighlightedAddresses] = useState<any[]>([]);
  const [highlightedPlacemarks, setHighlightedPlacemarks] = useState<any[]>([]);
  const [mapBoundaries, setMapBoundaries] = useState<any>(null);
  const [heatSourceZone, setHeatSourceZone] = useState<any>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const fetchHeatSupplyData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await initializeApi();

      const heatSupplyData = await getHeatSupplyMapData();
      setHeatSources(heatSupplyData || []);

      // Set initial map boundaries from first heat source if available
      if (heatSupplyData && heatSupplyData.length > 0 && heatSupplyData[0].parameters?.coordinates) {
        const coords = heatSupplyData[0].parameters.coordinates;
        setMapBoundaries({
          center_lat: parseFloat(coords.center_lat || '51.660772'),
          center_lng: parseFloat(coords.center_lng || '39.200289'),
          south_west_lat: parseFloat(coords.south_west_lat || '51.55'),
          south_west_lng: parseFloat(coords.south_west_lng || '39.05'),
          north_east_lat: parseFloat(coords.north_east_lat || '51.75'),
          north_east_lng: parseFloat(coords.north_east_lng || '39.45')
        });
      }

      // Load additional data
      const [types, orgs, periodsData] = await Promise.all([
        getHeatSourceTypes(),
        getOrganizations(),
        getHeatSourcePeriods()
      ]);

      setHsTypes(types || []);
      setOrganizations(orgs || []);
      setPeriods(periodsData || []);
    } catch (err) {
      console.error('Ошибка при загрузке данных карты теплоснабжения:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const initMap = (): void => {
    if (!mapRef.current || !window.ymaps || !heatSources.length) return;

    try {
      const myMap = new window.ymaps.Map(mapRef.current, {
        center: [51.660772, 39.200289],
        zoom: 12,
        controls: ['zoomControl', 'typeSelector', 'fullscreenControl']
      });

      // Создаем коллекции для разных типов объектов
      const heatSourceCollection = new window.ymaps.GeoObjectCollection();
      const addressCollection = new window.ymaps.GeoObjectCollection();

      // Сначала добавляем все теплоисточники
      heatSources.forEach(heatSource => {
        if (heatSource.address?.latitude && heatSource.address?.longitude) {
          const placemark = new window.ymaps.Placemark(
              [parseFloat(heatSource.address.latitude), parseFloat(heatSource.address.longitude)],
              {
                hintContent: heatSource.name || 'Теплоисточник',
                balloonContent: getBalloonContent(heatSource, heatSource.address)
              },
              {
                preset: 'islands#redIcon',
                zIndex: 100
              }
          );

          placemark.events.add('click', () => {
            setSelectedHeatSource(heatSource);
            setShowModal(true);
          });

          heatSourceCollection.add(placemark);
        }

        // Затем добавляем адреса для этого теплоисточника
        if (heatSource.parameters?.addresses?.length > 0) {
          heatSource.parameters.addresses.forEach(address => {
            if (address.latitude && address.longitude) {
              const addressPlacemark = new window.ymaps.Placemark(
                  [parseFloat(address.latitude), parseFloat(address.longitude)],
                  {
                    hintContent: 'Адрес теплоисточника',
                    balloonContent: getBalloonContent(heatSource, address)
                  },
                  {
                    preset: 'islands#blueIcon',
                    zIndex: 50
                  }
              );

              addressPlacemark.events.add('click', () => {
                setSelectedHeatSource(heatSource); // Важно: используем heatSource из внешней области видимости
                setShowModal(true);
              });

              addressCollection.add(addressPlacemark);
            }
          });
        }
      });

      // Добавляем коллекции на карту
      myMap.geoObjects.add(heatSourceCollection);
      myMap.geoObjects.add(addressCollection);

      // Автомасштабирование
      if (heatSources.length > 0) {
        const bounds = heatSourceCollection.getBounds() || addressCollection.getBounds();
        if (bounds) {
          myMap.setBounds(bounds, {
            checkZoomRange: true,
            zoomMargin: 50
          });
        }
      }

      mapInstanceRef.current = myMap;

    } catch (error) {
      console.error('Ошибка при инициализации карты:', error);
      setError('Ошибка при инициализации карты. Пожалуйста, обновите страницу.');
    }
  };

// Упрощенная версия функции для балуна
  const getBalloonContent = (heatSource: HeatSource, address: any): string => {
    return `
    <div>
      <strong>${heatSource.name || 'Теплоисточник'}</strong>
      <div class="text-muted small">${formatAddressString(address)}</div>
    </div>
  `;
  };

// Добавляем обработчик события в компоненте
  useEffect(() => {
    const handler = (e: any) => {
      const heatSource = heatSources.find(hs => hs.id === e.detail);
      if (heatSource) {
        setSelectedHeatSource(heatSource);
        setShowModal(true);
      }
    };

    document.addEventListener('showHeatSource', handler);
    return () => document.removeEventListener('showHeatSource', handler);
  }, [heatSources]);

  const highlightConnectedBuildings = async (heatSourceId: number): Promise<void> => {
    try {
      clearHighlightedBuildings();

      const heatSource = heatSources.find(hs => hs.id === heatSourceId);
      if (!heatSource || !mapInstanceRef.current) return;

      const connectedAddresses = heatSource.parameters?.addresses?.filter(
          (address: any) => address?.latitude && address?.longitude
      ) || [];

      setHighlightedAddresses(connectedAddresses);

      // Создаем временный менеджер объектов для подсвеченных адресов
      const highlightManager = new window.ymaps.ObjectManager({
        clusterize: false
      });

      // Добавляем подсвеченные адреса (зеленые точки)
      connectedAddresses.forEach((address: any) => {
        const placemark = {
          type: 'Feature',
          id: `highlight-address-${address.id}`,
          geometry: {
            type: 'Point',
            coordinates: [parseFloat(address.latitude), parseFloat(address.longitude)]
          },
          properties: {
            balloonContent: formatAddressString(address),
            hintContent: 'Адрес теплоисточника',
          },
          options: {
            preset: 'islands#greenCircleDotIcon',
            zIndex: 1000
          }
        };
        highlightManager.add(placemark);
      });

      mapInstanceRef.current.geoObjects.add(highlightManager);
      setHighlightedPlacemarks([highlightManager]);

      // Центрируем карту на теплоисточнике и его адресах
      if (heatSource.address?.latitude && heatSource.address?.longitude) {
        const points = [
          [parseFloat(heatSource.address.latitude), parseFloat(heatSource.address.longitude)],
          ...connectedAddresses.map((addr: any) => [parseFloat(addr.latitude), parseFloat(addr.longitude)])
        ];

        mapInstanceRef.current.setBounds(points, {
          checkZoomRange: true,
          zoomMargin: 50
        });
      }

    } catch (error) {
      console.error('Ошибка при выделении подключенных адресов:', error);
    }
  };

  const getHeatSourceIcon = (typeSlug?: string): string => {
    switch (typeSlug) {
      case 'boiler': return 'islands#redCircleIcon';
      case 'chpp': return 'islands#orangeCircleIcon';
      case 'individual': return 'islands#blueCircleIcon';
      case 'central': return 'islands#darkGreenCircleIcon';
      default: return 'islands#darkBlueCircleIcon';
    }
  };



  const clearHighlightedBuildings = (): void => {
    if (mapInstanceRef.current) {
      highlightedPlacemarks.forEach(placemark => {
        mapInstanceRef.current.geoObjects.remove(placemark);
      });

      if (heatSourceZone) {
        mapInstanceRef.current.geoObjects.remove(heatSourceZone);
        setHeatSourceZone(null);
      }
    }

    setHighlightedPlacemarks([]);
    setHighlightedAddresses([]);
  };

  const formatAddressString = (address: any): string => {
    if (!address) return 'Адрес не указан';

    // If address is from heat source (direct property)
    if (address.street?.name) {
      let result = '';
      if (address.street?.city?.name) result += `г. ${address.street.city.name}, `;
      if (address.street?.name) result += `${address.street.name}, `;
      result += `д. ${address.house_number}`;
      if (address.building) result += ` корп. ${address.building}`;
      if (address.structure) result += ` стр. ${address.structure}`;
      if (address.literature) result += ` лит. ${address.literature}`;
      return result;
    }

    // If address is from parameters.addresses
    return `${address.house_number}${address.building ? ` корп. ${address.building}` : ''}`;
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Не указана';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU');
  };

  useEffect(() => {
    fetchHeatSupplyData();
  }, []);

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

    if (!loading && heatSources.length > 0) {
      loadYandexMapsApi();
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, [loading, heatSources]);

  return (
      <React.Fragment>
        <div className="page-header">
          <div className="page-block">
            <div className="row align-items-center">
              <div className="col-md-12">
                <div className="page-header-title">
                  <h5 className="m-b-10">Карта теплоснабжения</h5>
                </div>
                <ul className="breadcrumb">
                  <li className="breadcrumb-item">
                    <Link to="/dashboard">Главная</Link>
                  </li>
                  <li className="breadcrumb-item">Карты</li>
                  <li className="breadcrumb-item">Карта теплоснабжения</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <Card className="mb-3">
          <Card.Body>
            <div className="d-flex flex-wrap gap-3 justify-content-center">
              <div className="d-flex align-items-center">
                <span className="legend-dot rounded-circle me-2" style={{ backgroundColor: '#FF0000' }}></span>
                <span>Теплоисточники</span>
              </div>
              <div className="d-flex align-items-center">
                <span className="legend-dot rounded-circle me-2" style={{ backgroundColor: '#0000FF' }}></span>
                <span>Адреса теплоисточников</span>
              </div>
              <div className="d-flex align-items-center">
                <span className="legend-dot rounded-circle me-2" style={{ backgroundColor: '#00FF00' }}></span>
                <span>Подключенные адреса</span>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Row>
          <Col sm={12}>
            <Card>
              <Card.Body>
                {error && (
                    <div className="alert alert-danger" role="alert">
                      {error}
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-5">
                      <Spinner animation="border" role="status">
                        <span className="visually-hidden">Загрузка...</span>
                      </Spinner>
                      <p className="mt-2">Загрузка данных...</p>
                    </div>
                ) : heatSources.length === 0 ? (
                    <div className="alert alert-info" role="alert">
                      Нет данных для отображения
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

        <Modal show={showModal} onHide={() => setShowModal(false)} size="xl">
          <Modal.Header closeButton className="bg-light">
            <Modal.Title>
              <span className="fw-bold">{selectedHeatSource?.name}</span>
              {selectedHeatSource?.id && <span className="ms-2 text-muted small">ID: {selectedHeatSource.id}</span>}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedHeatSource && (
                <div className="heat-source-details">
                  <Row className="mb-4">
                    <Col md={6}>
                      <div className="card h-100">
                        <div className="card-header bg-primary text-white">
                          <h6 className="mb-0">Основная информация</h6>
                        </div>
                        <div className="card-body">
                          <div className="d-flex align-items-center mb-2">
                            <span className="badge bg-primary me-2">Тип</span>
                            <span>{selectedHeatSource.type?.name || 'Не указан'}</span>
                          </div>

                          <div className="d-flex align-items-center mb-2">
                            <span className="badge bg-info me-2">Период</span>
                            <span>{selectedHeatSource.period?.name || 'Не указан'}</span>
                          </div>

                          {selectedHeatSource.parameters?.coordinates && (
                              <div className="mt-3">
                                <h6 className="text-primary mb-2">Зона обслуживания</h6>
                                <div className="ps-3">
                                  <div>
                                    <strong>Центр:</strong> {selectedHeatSource.parameters.coordinates.center_lat}, {selectedHeatSource.parameters.coordinates.center_lng}
                                  </div>
                                  <div className="mt-1">
                                    <strong>Границы:</strong>
                                    <div className="ms-2">
                                      <div>Юго-запад: {selectedHeatSource.parameters.coordinates.south_west_lat}, {selectedHeatSource.parameters.coordinates.south_west_lng}</div>
                                      <div>Северо-восток: {selectedHeatSource.parameters.coordinates.north_east_lat}, {selectedHeatSource.parameters.coordinates.north_east_lng}</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                          )}
                        </div>
                      </div>
                    </Col>

                    <Col md={6}>
                      <div className="card h-100">
                        <div className="card-header bg-success text-white">
                          <h6 className="mb-0">Организации</h6>
                        </div>
                        <div className="card-body">
                          <div className="mb-3">
                            <h6 className="text-primary">Собственник</h6>
                            <div className="ps-3 border-start border-primary">
                              <div><strong>Название:</strong> {selectedHeatSource.owner?.shortName || selectedHeatSource.owner?.fullName || 'Не указан'}</div>

                              {selectedHeatSource.owner?.phone && (
                                  <div className="mt-1">
                                    <strong>Телефон:</strong>
                                    <a href={`tel:${selectedHeatSource.owner.phone}`} className="ms-2">
                                      {selectedHeatSource.owner.phone}
                                    </a>
                                  </div>
                              )}

                              {selectedHeatSource.owner?.email && (
                                  <div className="mt-1">
                                    <strong>Email:</strong>
                                    <a href={`mailto:${selectedHeatSource.owner.email}`} className="ms-2">
                                      {selectedHeatSource.owner.email}
                                    </a>
                                  </div>
                              )}

                              {selectedHeatSource.owner?.address && (
                                  <div className="mt-1">
                                    <strong>Адрес:</strong> <span className="ms-1">{selectedHeatSource.owner.address}</span>
                                  </div>
                              )}
                            </div>
                          </div>

                          <div className="mb-3">
                            <h6 className="text-success">Эксплуатирующая организация</h6>
                            <div className="ps-3 border-start border-success">
                              <div><strong>Название:</strong> {selectedHeatSource.org?.shortName || selectedHeatSource.org?.fullName || 'Не указана'}</div>

                              {selectedHeatSource.org?.phone && (
                                  <div className="mt-1">
                                    <strong>Телефон:</strong>
                                    <a href={`tel:${selectedHeatSource.org.phone}`} className="ms-2">
                                      {selectedHeatSource.org.phone}
                                    </a>
                                  </div>
                              )}

                              {selectedHeatSource.org?.email && (
                                  <div className="mt-1">
                                    <strong>Email:</strong>
                                    <a href={`mailto:${selectedHeatSource.org.email}`} className="ms-2">
                                      {selectedHeatSource.org.email}
                                    </a>
                                  </div>
                              )}

                              {selectedHeatSource.org?.address && (
                                  <div className="mt-1">
                                    <strong>Адрес:</strong> <span className="ms-1">{selectedHeatSource.org.address}</span>
                                  </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Col>
                  </Row>

                  {selectedHeatSource.parameters && (
                      <div className="card mb-4">
                        <div className="card-header bg-info text-white">
                          <h6 className="mb-0">Технические характеристики</h6>
                        </div>
                        <div className="card-body">
                          <div className="table-responsive">
                            <table className="table table-striped table-hover">
                              <tbody>
                              {selectedHeatSource.parameters.installed_capacity && (
                                  <tr>
                                    <th style={{ width: '30%' }}>Установленная мощность</th>
                                    <td>{selectedHeatSource.parameters.installed_capacity}</td>
                                  </tr>
                              )}
                              {selectedHeatSource.parameters.available_capacity && (
                                  <tr>
                                    <th>Доступная мощность</th>
                                    <td>{selectedHeatSource.parameters.available_capacity}</td>
                                  </tr>
                              )}
                              {selectedHeatSource.parameters.primary_fuel && (
                                  <tr>
                                    <th>Основное топливо</th>
                                    <td>{selectedHeatSource.parameters.primary_fuel}</td>
                                  </tr>
                              )}
                              {selectedHeatSource.parameters.secondary_fuel && (
                                  <tr>
                                    <th>Резервное топливо</th>
                                    <td>{selectedHeatSource.parameters.secondary_fuel}</td>
                                  </tr>
                              )}
                              {selectedHeatSource.parameters.temperature_graph && (
                                  <tr>
                                    <th>Температурный график</th>
                                    <td>{selectedHeatSource.parameters.temperature_graph}</td>
                                  </tr>
                              )}
                              {selectedHeatSource.parameters.current_temperature && (
                                  <tr>
                                    <th>Текущая температура</th>
                                    <td>{selectedHeatSource.parameters.current_temperature}</td>
                                  </tr>
                              )}
                              {selectedHeatSource.parameters.current_pressure && (
                                  <tr>
                                    <th>Текущее давление</th>
                                    <td>{selectedHeatSource.parameters.current_pressure}</td>
                                  </tr>
                              )}
                              {selectedHeatSource.parameters.hydraulic_tests && (
                                  <tr>
                                    <th>Гидравлические испытания</th>
                                    <td>{selectedHeatSource.parameters.hydraulic_tests}</td>
                                  </tr>
                              )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                  )}

                  <div className="card mb-4">
                    <div className="card-header bg-secondary text-white">
                      <h6 className="mb-0">Адреса</h6>
                    </div>
                    <div className="card-body">
                      {selectedHeatSource.parameters?.addresses?.length > 0 ? (
                          <div className="addresses-list-container">
                            <ul className="list-group addresses-list">
                              {selectedHeatSource.parameters.addresses.map((address: any, index: number) => (
                                  <li key={index} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                                    <div>
                                      <i className="fas fa-building me-2 text-primary"></i>
                                      {formatAddressString(address)}
                                    </div>
                                    {address.latitude && address.longitude && (
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() => {
                                              if (mapInstanceRef.current) {
                                                mapInstanceRef.current.setCenter(
                                                    [parseFloat(address.latitude), parseFloat(address.longitude)],
                                                    17
                                                );
                                                setShowModal(false);
                                              }
                                            }}
                                        >
                                          <i className="fas fa-map-marker-alt"></i>
                                        </Button>
                                    )}
                                  </li>
                              ))}
                            </ul>
                          </div>
                      ) : (
                          <p className="text-muted">Адреса не указаны</p>
                      )}
                    </div>
                  </div>

                  {highlightedAddresses.length > 0 && (
                      <div className="card mb-4">
                        <div className="card-header bg-success text-white">
                          <h6 className="mb-0">Подключенные дома</h6>
                        </div>
                        <div className="card-body">
                          <div className="addresses-list-container">
                            <ul className="list-group addresses-list">
                              {highlightedAddresses.map((address: any, index: number) => (
                                  <li key={`connected-${index}`} className="list-group-item list-group-item-success d-flex justify-content-between align-items-center">
                                    <div>
                                      <i className="fas fa-house-user me-2"></i>
                                      {formatAddressString(address)}
                                    </div>
                                    {address.latitude && address.longitude && (
                                        <Button
                                            variant="outline-success"
                                            size="sm"
                                            onClick={() => {
                                              if (mapInstanceRef.current) {
                                                mapInstanceRef.current.setCenter(
                                                    [parseFloat(address.latitude), parseFloat(address.longitude)],
                                                    17
                                                );
                                                setShowModal(false);
                                              }
                                            }}
                                        >
                                          <i className="fas fa-map-marker-alt"></i>
                                        </Button>
                                    )}
                                  </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                  )}

                  <div className="card mb-4">
                    <div className="card-header bg-light">
                      <h6 className="mb-0">Системная информация</h6>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        <div className="col-md-6">
                          <div className="d-flex align-items-center">
                            <i className="fas fa-calendar-plus me-2 text-success"></i>
                            <span>Создан: {formatDate(selectedHeatSource.created_at)}</span>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="d-flex align-items-center">
                            <i className="fas fa-calendar-check me-2 text-primary"></i>
                            <span>Обновлен: {formatDate(selectedHeatSource.updated_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button
                variant="info"
                onClick={() => selectedHeatSource?.id && highlightConnectedBuildings(selectedHeatSource.id)}
                className="me-auto"
            >
              <i className="fas fa-search"></i> Показать подключенные дома
            </Button>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Закрыть
            </Button>
          </Modal.Footer>
        </Modal>

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
          overflow: hidden;
        }
        
        .legend-dot {
          width: 16px;
          height: 16px;
          display: inline-block;
        }
        
        .addresses-list-container {
          max-height: 250px;
          overflow-y: auto;
          border: 1px solid #dee2e6;
          border-radius: 4px;
        }
        
        .addresses-list .list-group-item {
          border-left: 3px solid #0d6efd;
          transition: all 0.2s ease;
        }
        
        .addresses-list .list-group-item:hover {
          background-color: #f8f9fa;
        }
        
        .addresses-list .list-group-item-success {
          border-left-color: #198754;
        }

        .heat-source-details .card {
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 16px;
          border-radius: 6px;
          overflow: hidden;
        }

        .heat-source-details .card-header {
          padding: 0.75rem 1rem;
        }

        .heat-source-details .card-body {
          padding: 1rem;
        }

        .heat-source-details table th {
          font-weight: 600;
          color: #495057;
        }
      `}</style>
      </React.Fragment>
  );
};

export default HeatSupplyMap;