import React, { useEffect, useRef, useState } from 'react';
import { Card, Spinner, Button, Form, InputGroup, Modal, Row, Col, Toast, ToastContainer, Badge } from 'react-bootstrap';
import { EddsResponse, EddsIncident } from '../../../services/api';

declare global {
  interface Window {
    ymaps: any;
  }
}

interface ClusteredIncident extends EddsIncident {
  isSelected?: boolean;
}

interface EddsMapProps {
  data: EddsResponse | null;
  loading: boolean;
  error: string | null;
  onSearch: (query: string) => void;
  activeFilters: {
    incidentType: string;
    resourceType: string;
    isComplaint: string;
  };
  filterOptions: {
    incidentTypes: any[];
    resourceTypes: any[];
  };
  onFilterChange: (
    filterType: 'incidentType' | 'resourceType' | 'isComplaint',
    value: string
  ) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  onRefresh: () => void;
  onViewDetails: (incident: EddsIncident) => void;
  focusedIncident?: EddsIncident | null; // New prop for focused incident
}

const EddsMap: React.FC<EddsMapProps> = ({
  data,
  loading,
  error,
  onSearch,
  activeFilters,
  filterOptions,
  onFilterChange,
  onApplyFilters,
  onResetFilters,
  onRefresh,
  onViewDetails,
  focusedIncident
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{[key: string]: any}>({});
  const isFirstLoad = useRef<boolean>(true);

  const [searchInput, setSearchInput] = useState('');
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(true);
  const [showNotification, setShowNotification] = useState<boolean>(false);
  const [notificationMessage, setNotificationMessage] = useState<string>('');
  const [activeFilterCount, setActiveFilterCount] = useState<number>(0);

  const [showClusterModal, setShowClusterModal] = useState<boolean>(false);
  const [clusterIncidents, setClusterIncidents] = useState<ClusteredIncident[]>([]);

  const locationMapRef = useRef<{ [key: string]: EddsIncident[] }>({});
  
  // Map boundaries
  const [mapBoundaries, setMapBoundaries] = useState({
    center_lat: 51.660772,
    center_lng: 39.200289,
    south_west_lat: 51.55,
    south_west_lng: 39.05,
    north_east_lat: 51.75,
    north_east_lng: 39.45
  });

  const handleSearch = () => {
    onSearch(searchInput);
    setNotificationMessage(`Поиск по запросу "${searchInput}"...`);
    setShowNotification(true);
  };

  const handleResetSearch = () => {
    setSearchInput('');
    onSearch('');
    setNotificationMessage('Поиск сброшен');
    setShowNotification(true);
  };

  const handleApplyFiltersInternal = () => {
    onApplyFilters();
    setNotificationMessage(`Фильтры применены. Найдено ${data?.incidents.data?.length || 0} инцидентов.`);
    setShowNotification(true);
  };

  const handleResetFiltersInternal = () => {
    onResetFilters();
    setNotificationMessage('Фильтры сброшены');
    setShowNotification(true);
  };

  const handleCloseClusterModal = () => {
    setShowClusterModal(false);
    setClusterIncidents([]);
  };

  const handleSelectClusterItem = (incidentId: number) => {
    const incident = clusterIncidents.find(inc => inc.id === incidentId);
    if (incident) {
      handleCloseClusterModal();
      setTimeout(() => {
        onViewDetails(incident);
      }, 150);
    }
  };

  const getPlacemarkPreset = (incident: EddsIncident): string => {
    if (incident.type?.slug === 'incident') return 'islands#redCircleDotIcon';
    if (incident.type?.slug === 'planned') return 'islands#orangeCircleDotIcon';
    if (incident.type?.slug === 'seasonal') return 'islands#greenCircleDotIcon';
    return 'islands#blueCircleDotIcon';
  };

  const getClusterPreset = (geoObjects: any[]): string => {
    const hasIncidents = geoObjects.some(
      (obj: any) => obj.options.get('preset') === 'islands#redCircleDotIcon'
    );
    if (hasIncidents) return 'islands#redClusterIcons';

    const hasPlanned = geoObjects.some(
      (obj: any) => obj.options.get('preset') === 'islands#orangeCircleDotIcon'
    );
    if (hasPlanned) return 'islands#orangeClusterIcons';

    const hasSeasonal = geoObjects.some(
      (obj: any) => obj.options.get('preset') === 'islands#greenCircleDotIcon'
    );
    if (hasSeasonal) return 'islands#greenClusterIcons';

    return 'islands#blueClusterIcons';
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

  const formatDate = (dateString: string | null | undefined): string => {
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

  const getStatusClass = (statusSlug: string | undefined): string => {
    switch (statusSlug) {
      case 'new':
        return 'bg-danger';
      case 'in_progress':
        return 'bg-warning text-dark';
      case 'resolved':
        return 'bg-success';
      case 'closed':
        return 'bg-secondary';
      default:
        return 'bg-info';
    }
  };

  const focusOnIncident = (incident: EddsIncident) => {
    if (!mapInstanceRef.current || !incident.addresses || incident.addresses.length === 0) return;
    
    const addressWithCoords = incident.addresses.find(addr => addr.latitude && addr.longitude);
    if (!addressWithCoords) return;
    
    try {
      const lat = parseFloat(String(addressWithCoords.latitude));
      const lng = parseFloat(String(addressWithCoords.longitude));
      if (isNaN(lat) || isNaN(lng)) return;
      
      const coords = [lat, lng];
      const coordKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
      
      // Find marker associated with this incident
      const marker = markersRef.current[coordKey];
      
      if (marker) {
        // Zoom in to this marker
        mapInstanceRef.current.setCenter(coords, 16, { duration: 500 });
        
        // Create a highlight effect
        const highlightPlacemark = new window.ymaps.Placemark(
          coords,
          {
            hintContent: incident.title
          },
          {
            preset: 'islands#nightCircleDotIcon', // Use a different color to highlight
            iconColor: '#FF5722',  // Bright orange
            zIndex: 1000  // Put it above other markers
          }
        );
        
        mapInstanceRef.current.geoObjects.add(highlightPlacemark);
        
        // Make the highlight pulse
        const startRadius = 10;
        const endRadius = 50;
        const animationTime = 1500;
        
        const circle = new window.ymaps.Circle([coords, startRadius], {}, {
          fillColor: '#FF572233',  // Semi-transparent orange
          strokeColor: '#FF5722',
          strokeOpacity: 0.8,
          strokeWidth: 2
        });
        
        mapInstanceRef.current.geoObjects.add(circle);
        
        let animationStartTime = Date.now();
        const pulseAnimation = () => {
          const currentTime = Date.now();
          const timePassedPercent = (currentTime - animationStartTime) / animationTime;
          
          if (timePassedPercent < 1) {
            const currentRadius = startRadius + (endRadius - startRadius) * timePassedPercent;
            circle.geometry.setRadius(currentRadius);
            const opacity = 0.8 - timePassedPercent * 0.8;
            circle.options.set('strokeOpacity', opacity);
            circle.options.set('fillOpacity', opacity * 0.5);
            requestAnimationFrame(pulseAnimation);
          } else {
            // Animation complete, remove the circle
            mapInstanceRef.current.geoObjects.remove(circle);
            
            // And after some delay, remove the highlight marker
            setTimeout(() => {
              mapInstanceRef.current.geoObjects.remove(highlightPlacemark);
            }, 1000);
          }
        };
        
        requestAnimationFrame(pulseAnimation);
        
        // Open a balloon with info
        setTimeout(() => {
          marker.balloon.open();
        }, 500);
        
        // Show notification
        setNotificationMessage(`Показан инцидент #${incident.id}: ${incident.title}`);
        setShowNotification(true);
      }
    } catch (e) {
      console.error('Error focusing on incident:', e);
    }
  };

  const initMap = (incidents: EddsIncident[] = []): void => {
    if (!mapRef.current || !window.ymaps) {
      return;
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.destroy();
      mapInstanceRef.current = null;
    }
    
    // Reset markers reference
    markersRef.current = {};

    try {
      // Set the boundaries from data if available
      let boundaries = { ...mapBoundaries };
      
      if (data?.coordinates) {
        boundaries = {
          center_lat: parseFloat(String(data.coordinates.center_lat)) || boundaries.center_lat,
          center_lng: parseFloat(String(data.coordinates.center_lng)) || boundaries.center_lng,
          south_west_lat: parseFloat(String(data.coordinates.south_west_lat)) || boundaries.south_west_lat,
          south_west_lng: parseFloat(String(data.coordinates.south_west_lng)) || boundaries.south_west_lng,
          north_east_lat: parseFloat(String(data.coordinates.north_east_lat)) || boundaries.north_east_lat,
          north_east_lng: parseFloat(String(data.coordinates.north_east_lng)) || boundaries.north_east_lng
        };
        setMapBoundaries(boundaries);
      }

      const myMap = new window.ymaps.Map(
        mapRef.current,
        {
          center: [boundaries.center_lat, boundaries.center_lng],
          zoom: 12,
          controls: ['zoomControl', 'typeSelector', 'fullscreenControl']
        },
        {
          suppressMapOpenBlock: true
        }
      );

      const bounds: [number, number][] = [
        [boundaries.south_west_lat, boundaries.south_west_lng],
        [boundaries.north_east_lat, boundaries.north_east_lng]
      ];

      myMap.behaviors.enable('scrollZoom');
      mapInstanceRef.current = myMap;

      // Set restricted viewing area
      myMap.options.set('restrictMapArea', bounds);

      myMap.setBounds(bounds, {
        checkZoomRange: true,
        duration: 300
      });

      const clusterer = new window.ymaps.Clusterer({
        preset: 'islands#blueClusterIcons',
        groupByCoordinates: false,
        clusterDisableClickZoom: true,
        clusterOpenBalloonOnClick: false,
        clusterBalloonContentLayout: null,
        clusterHideIconOnBalloonOpen: false,
        geoObjectHideIconOnBalloonOpen: false,
        clusterIconContentLayout: window.ymaps.templateLayoutFactory.createClass(
          '<div style="font-size: 13px; line-height: 26px; font-weight: bold; text-align: center; color: #fff;">{{ properties.geoObjects.length }}</div>'
        )
      });

      clusterer.events.add('click', (e: any) => {
        e.preventDefault();
        e.stopPropagation();
      });

      const placemarks: any[] = [];
      const newLocationMap: { [key: string]: EddsIncident[] } = {};

      incidents.forEach((incident) => {
        if (!incident.addresses || incident.addresses.length === 0) return;
        incident.addresses.forEach((address) => {
          if (!address.latitude || !address.longitude) return;

          try {
            const lat = parseFloat(String(address.latitude));
            const lng = parseFloat(String(address.longitude));
            if (isNaN(lat) || isNaN(lng)) return;

            const coords = [lat, lng];
            const coordKey = `${coords[0].toFixed(6)},${coords[1].toFixed(6)}`;

            if (!newLocationMap[coordKey]) {
              newLocationMap[coordKey] = [];
            }
            if (!newLocationMap[coordKey].some((inc) => inc.id === incident.id)) {
              newLocationMap[coordKey].push(incident);
            }

            if (!placemarks.some((p) => p.properties.get('coordKey') === coordKey)) {
              const incidentsAtLocation = newLocationMap[coordKey];
              const placemarkPreset = getPlacemarkPreset(incidentsAtLocation[0]);

              const content = incidentsAtLocation.length > 1
                ? `${incidentsAtLocation.length} инцидентов`
                : incident.title;

              const balloonContent = incidentsAtLocation.length > 1
                ? `
                  <div style="max-width: 300px;">
                    <h6 style="margin-bottom: 8px;">${incidentsAtLocation.length} инцидентов по адресу</h6>
                    <div style="font-weight: bold; margin-bottom: 8px;">
                      ${getFormattedAddress(address)}
                    </div>
                    <button onclick="document.dispatchEvent(new CustomEvent('openClusterModal', {detail: '${coordKey}'}))" 
                            style="background-color: #0d6efd; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; width: 100%;">
                      Показать список
                    </button>
                  </div>
                `
                : `
                  <div style="max-width: 300px;">
                    <h6 style="margin-bottom: 8px;">${incident.title}</h6>
                    <div style="margin-bottom: 5px;"><b>Тип:</b> ${incident.type?.name || 'Не указан'}</div>
                    <div style="margin-bottom: 5px;"><b>Ресурс:</b> ${incident.resource_type?.name || 'Не указан'}</div>
                    <div style="margin-bottom: 5px;"><b>Адрес:</b> ${getFormattedAddress(address)}</div>
                    <div style="margin-bottom: 8px;"><b>Создан:</b> ${formatDate(incident.created_at)}</div>
                    <button onclick="document.dispatchEvent(new CustomEvent('viewIncidentDetails', {detail: ${incident.id}}))" 
                            style="background-color: #0d6efd; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; width: 100%;">
                      Подробнее
                    </button>
                  </div>
                `;

              const placemark = new window.ymaps.Placemark(
                coords,
                {
                  hintContent: content,
                  //balloonContent: balloonContent,
                  incidentId: incident.id,
                  coordKey: coordKey,
                  itemCount: incidentsAtLocation.length
                },
                {
                  preset: placemarkPreset,
                  balloonCloseButton: false,
                  hideIconOnBalloonOpen: false
                }
              );

              // placemark.events.add('click', (e: any) => {
              //   const target = e.get('target');
              //   const key = target.properties.get('coordKey');
              //   const items = newLocationMap[key];
              //
              //   if (items && items.length === 1) {
              //     onViewDetails(items[0]);
              //   } else if (items && items.length > 1) {
              //     setClusterIncidents(
              //       items.map((inc) => ({ ...inc, isSelected: false }))
              //     );
              //     setShowClusterModal(true);
              //   }
              //   e.stopPropagation();
              // });

              // Store reference to this placemark
              markersRef.current[coordKey] = placemark;
              
              placemarks.push(placemark);
            }
          } catch (e) {
            console.error('Error processing address/marker:', e, incident, address);
          }
        });
      });

      locationMapRef.current = newLocationMap;

      // Set up event listeners for custom events
      document.addEventListener('openClusterModal', (e: any) => {
        const coordKey = e.detail;
        const items = newLocationMap[coordKey];
        if (items && items.length > 1) {
          setClusterIncidents(
            items.map((inc) => ({ ...inc, isSelected: false }))
          );
          setShowClusterModal(true);
        }
      });

      document.addEventListener('viewIncidentDetails', (e: any) => {
        const incidentId = parseInt(e.detail, 10);
        const incident = incidents.find(inc => inc.id === incidentId);
        if (incident) {
          onViewDetails(incident);
        }
      });

      if (placemarks.length > 0) {
        clusterer.events.add('objectsaddtomap', () => {
          clusterer.getClusters().forEach((cluster: any) => {
            const geoObjects = cluster.getGeoObjects();
            cluster.options.set('preset', getClusterPreset(geoObjects));
          });
        });

        clusterer.events.add('click', (e: any) => {
          const cluster = e.get('target');
          if (cluster && cluster.getGeoObjects) {
            const geoObjects = cluster.getGeoObjects();
            const allIncidentsInCluster: EddsIncident[] = [];

            geoObjects.forEach((obj: any) => {
              const key = obj.properties.get('coordKey');
              if (key && locationMapRef.current[key]) {
                locationMapRef.current[key].forEach((inc) => {
                  if (!allIncidentsInCluster.some((i) => i.id === inc.id)) {
                    allIncidentsInCluster.push(inc);
                  }
                });
              }
            });

            if (allIncidentsInCluster.length > 0) {
              setClusterIncidents(
                allIncidentsInCluster.map((inc) => ({ ...inc, isSelected: false }))
              );
              setShowClusterModal(true);
              if (cluster.balloon?.isOpen()) {
                cluster.balloon.close();
              }
            }
          }
          e.stopPropagation();
        });

        clusterer.add(placemarks);
        myMap.geoObjects.add(clusterer);

        if (incidents.length > 0 && clusterer.getBounds()) {
          setTimeout(() => {
            myMap.setBounds(clusterer.getBounds(), {
              checkZoomRange: true,
              duration: 500,
              zoomMargin: 30
            });
          }, 100);
        } else if (placemarks.length === 1) {
          myMap.setCenter(placemarks[0].geometry.getCoordinates(), 15, { duration: 500 });
        }
        
        // If we have a focused incident and this is the first load, focus on it
        if (focusedIncident && (isFirstLoad.current || !data)) {
          // Short delay to ensure the map is ready
          setTimeout(() => {
            focusOnIncident(focusedIncident);
          }, 500);
          isFirstLoad.current = false;
        }
      }
    } catch (mapError) {
      console.error('Error initializing map:', mapError);
    }
  };

  useEffect(() => {
    let count = 0;
    if (activeFilters.incidentType) count++;
    if (activeFilters.resourceType) count++;
    if (activeFilters.isComplaint) count++;
    setActiveFilterCount(count);
  }, [activeFilters]);

  // Effect for focusing on an incident when it changes
  useEffect(() => {
    if (focusedIncident && mapInstanceRef.current) {
      focusOnIncident(focusedIncident);
    }
  }, [focusedIncident]);

  useEffect(() => {
    const loadYandexMapsApi = (): void => {
      if (window.ymaps) {
        window.ymaps.ready(() => {
          if (data?.incidents.data) {
            initMap(data.incidents.data);
          } else {
            initMap([]);
          }
        });
        return;
      }
      const script = document.createElement('script');
      script.src =
        'https://api-maps.yandex.ru/2.1/?apikey=9b9469e9-98d9-4c6d-9b5d-4272b266a69e&lang=ru_RU';
      script.type = 'text/javascript';
      script.async = true;
      script.onload = () => {
        if (window.ymaps) {
          window.ymaps.ready(() => {
            if (data?.incidents.data) {
              initMap(data.incidents.data);
            } else {
              initMap([]);
            }
          });
        } else {
          console.error("Yandex Maps API script loaded but window.ymaps is not defined.");
        }
      };
      script.onerror = () => {
        console.error('Failed to load Yandex Maps API script.');
      };
      document.head.appendChild(script);
    };

    if (!loading) {
      loadYandexMapsApi();
    } else {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
      // Remove event listeners
      document.removeEventListener('openClusterModal', () => {});
      document.removeEventListener('viewIncidentDetails', () => {});
    };
  }, [loading, data]);

  return (
    <>
      <Card className="mb-3">
        <Card.Body className="py-2">
          <div className="d-flex flex-wrap gap-3 justify-content-center">
            <div className="d-flex align-items-center">
              <span
                className="legend-dot rounded-circle me-2"
                style={{ backgroundColor: '#ff0000' }}
              ></span>
              <span>Аварии</span>
            </div>
            <div className="d-flex align-items-center">
              <span
                className="legend-dot rounded-circle me-2"
                style={{ backgroundColor: '#ffaa00' }}
              ></span>
              <span>Плановые работы</span>
            </div>
            <div className="d-flex align-items-center">
              <span
                className="legend-dot rounded-circle me-2"
                style={{ backgroundColor: '#00aa00' }}
              ></span>
              <span>Сезонные работы</span>
            </div>
            <div className="d-flex align-items-center">
              <span
                className="legend-dot rounded-circle me-2"
                style={{ backgroundColor: '#007bff' }}
              ></span>
              <span>Прочее</span>
            </div>
          </div>
        </Card.Body>
      </Card>

      <Card className="mb-3">
        <Card.Body className="py-2">
          <InputGroup>
            <Form.Control
              placeholder="Поиск по названию, описанию, адресу..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              disabled={loading}
            />
            <Button variant="primary" onClick={handleSearch} disabled={loading}>
              <i className="ti ti-search me-1"></i> Поиск
            </Button>
            <Button
              variant="outline-secondary"
              onClick={handleResetSearch}
              disabled={loading}
            >
              Сбросить
            </Button>
            <Button
              variant="outline-info"
              onClick={onRefresh}
              disabled={loading}
              title="Обновить данные"
            >
              <i className="ti ti-refresh"></i>
            </Button>
          </InputGroup>
        </Card.Body>
      </Card>

      <Card className="mb-3">
        <Card.Header className="d-flex justify-content-between align-items-center py-2">
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
        </Card.Header>
        {isFilterExpanded && (
          <Card.Body>
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
                  onClick={handleApplyFiltersInternal}
                  className="me-2"
                  disabled={loading}
                >
                  <i className="ti ti-filter me-1"></i> Применить фильтр
                </Button>
                <Button
                  variant="outline-secondary"
                  onClick={handleResetFiltersInternal}
                  disabled={loading || activeFilterCount === 0}
                >
                  Сбросить фильтры
                </Button>
              </div>
            </Form>
          </Card.Body>
        )}
      </Card>

      <Row>
        <Col sm={12}>
          <Card>
            <Card.Header className="py-2">
              <h5 className="mb-0">Карта инцидентов</h5>
            </Card.Header>
            <Card.Body>
              {error && (
                <div className="alert alert-danger" role="alert">
                  <i className="ti ti-alert-triangle me-2"></i>
                  {error}
                </div>
              )}
              <div className="map-container">
                <div
                  id="map"
                  ref={mapRef}
                  className="map"
                  style={{ width: '100%', height: '600px' }}
                />
                {loading && (
                  <div className="map-loading-overlay">
                    <Spinner animation="border" role="status" variant="primary">
                      <span className="visually-hidden">Загрузка...</span>
                    </Spinner>
                    <p className="mt-2 mb-0 text-primary">
                      Загрузка данных карты...
                    </p>
                  </div>
                )}
                {!loading && !error && data?.incidents.data?.length === 0 && (
                  <div className="map-no-data-overlay">
                    <i className="ti ti-map-pin-off fa-2x text-muted mb-2"></i>
                    <p className="text-muted">
                      Нет инцидентов для отображения по текущим фильтрам.
                    </p>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal
        show={showClusterModal}
        onHide={handleCloseClusterModal}
        size="lg"
        backdrop="static"
        centered
      >
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>
            Инциденты в данной точке ({clusterIncidents.length})
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {clusterIncidents.length > 0 ? (
            <div className="cluster-items-list">
              {clusterIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="cluster-item p-3 mb-2 border rounded cursor-pointer"
                  onClick={() => handleSelectClusterItem(incident.id)}
                >
                  <h6 className="text-primary mb-1 d-flex justify-content-between">
                    <span>
                      <i
                        className={`me-2 ${
                          incident.is_complaint
                            ? 'ti ti-message-circle text-warning'
                            : 'ti ti-alert-triangle text-danger'
                        }`}
                      ></i>
                      {incident.title}
                    </span>
                    <Badge
                      className="ms-2"
                      bg={getStatusClass(incident.status?.slug).split(' ')[0]}
                      text={
                        incident.status?.slug === 'in_progress'
                          ? 'dark'
                          : 'white'
                      }
                    >
                      {incident.status?.name || 'N/A'}
                    </Badge>
                  </h6>
                  <div className="d-flex flex-wrap gap-2 mb-2 small">
                    <Badge pill bg="info" text="dark">
                      {incident.type?.name || 'Тип?'}
                    </Badge>
                    <Badge pill bg="secondary">
                      {incident.resource_type?.name || 'Ресурс?'}
                    </Badge>
                    {incident.is_complaint && (
                      <Badge pill bg="warning" text="dark">
                        Жалоба
                      </Badge>
                    )}
                  </div>
                  {incident.addresses && incident.addresses.length > 0 && (
                    <div className="text-muted small mb-1">
                      <i className="ti ti-map-pin me-1"></i>
                      {getFormattedAddress(incident.addresses[0])}
                      {incident.addresses.length > 1
                        ? ` (+${incident.addresses.length - 1})`
                        : ''}
                    </div>
                  )}
                  <div className="d-flex justify-content-between align-items-center mt-1">
                    <small className="text-muted">
                      Создан: {formatDate(incident.created_at)}
                    </small>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectClusterItem(incident.id);
                      }}
                    >
                      Подробнее <i className="ti ti-arrow-right ms-1"></i>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>Нет инцидентов для отображения в этом кластере.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseClusterModal}>
            Закрыть
          </Button>
        </Modal.Footer>
      </Modal>

      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1056 }}>
        <Toast
          show={showNotification}
          onClose={() => setShowNotification(false)}
          delay={4000}
          autohide
          bg="dark"
        >
          <Toast.Header closeButton={false}>
            <i className="ti ti-info-circle me-2"></i>
            <strong className="me-auto">Уведомление</strong>
          </Toast.Header>
          <Toast.Body className="text-white">
            {notificationMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>

      <style>
        {`
        .map-container {
          width: 100%;
          height: 600px;
          min-height: 600px;
          position: relative;
          overflow: hidden;
          border-radius: .375rem;
          border: 1px solid #e9ecef;
          box-shadow: 0 2px 6px rgba(0,0,0,0.05);
        }
        .map {
          width: 100% !important;
          height: 100% !important;
          border-radius: .375rem;
          display: block;
        }
        [class*="ymaps-2"][class*="-map"] {
          border-radius: .375rem;
          width: 100% !important;
          height: 100% !important;
        }
        .map-loading-overlay,
        .map-no-data-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(255, 255, 255, 0.8);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          z-index: 10;
          border-radius: .375rem;
          text-align: center;
          padding: 20px;
        }
        .legend-dot {
          width: 16px;
          height: 16px;
          display: inline-block;
          vertical-align: middle;
          border: 1px solid rgba(0,0,0,0.2);
        }
        .cursor-pointer {
          cursor: pointer;
        }
        .cluster-items-list {
          max-height: 60vh;
          overflow-y: auto;
          padding-right: 5px;
        }
        .cluster-item {
          transition: all 0.2s ease;
          background-color: #fff;
        }
        .cluster-item:hover {
          background-color: #f8f9fa;
          transform: translateY(-2px);
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .card-header {
          background-color: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
        }
        .card {
          box-shadow: 0 2px 6px rgba(0,0,0,0.05);
          border: 1px solid #e9ecef;
        }
        `}
      </style>
    </>
  );
};

export default EddsMap;