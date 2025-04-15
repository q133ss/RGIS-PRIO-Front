import React, { useEffect, useState, useRef } from 'react';
import { Card, Row, Col, Modal, Button, Spinner, Form, InputGroup, Toast, ToastContainer, Tabs, Tab, Nav } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
  initializeApi,
  getCommunalServicesMapData,
  getIncidentResourceTypes,
  getOrganizations,
  getCities,
  api,
  getIncidentTypes,
  createIncident
} from '../../services/api';
import { CommunalServicesMapItem } from '../../services/api';

interface UserRole {
  id: number;
  name: string;
  slug: string;
  center_lat: string;
  center_lng: string;
  south_west_lat: string;
  south_west_lng: string;
  north_east_lat: string;
  north_east_lng: string;
  created_at: string;
  updated_at: string;
  pivot: {
    user_id: number;
    role_id: number;
  };
}

interface UserProfile {
  id: number;
  created_at: string;
  updated_at: string;
  org_id: number;
  first_name: string;
  last_name: string;
  middle_name: string;
  phone: string;
  login: string;
  email: string | null;
  telegram: string | null;
  vk: string | null;
  inn: string | null;
  center_lat: string;
  center_lng: string;
  south_west_lat: string;
  south_west_lng: string;
  north_east_lat: string;
  north_east_lng: string;
  roles: UserRole[];
  org: {
    id: number;
    fullName: string;
    inn: string;
    ogrn: string;
    orgAddress: string;
    phone: string;
    shortName: string;
    url: string | null;
    created_at: string;
    updated_at: string;
  };
}

declare global {
  interface Window {
    ymaps: any;
  }
}

declare module '../../services/api' {
  interface CommunalServicesMapItem {
    coordinates?: {
      center_lat?: string;
      center_lng?: string;
      south_west_lat?: string;
      south_west_lng?: string;
      north_east_lat?: string;
      north_east_lng?: string;
    };
    parameters?: {
      coordinates?: {
        center_lat?: string;
        center_lng?: string;
        south_west_lat?: string;
        south_west_lng?: string;
        north_east_lat?: string;
        north_east_lng?: string;
      };
    };
  }
}

interface FilterState {
  city_id: number | null;
  management_org_id: number | null;
  house_type_id: number | null;
  resource_type_id: number | null;
  has_incidents: boolean;
  has_complaints: boolean;
}

interface ClusteredHouse extends CommunalServicesMapItem {
  isSelected?: boolean;
}

interface MapBoundaries {
  center_lat: number;
  center_lng: number;
  south_west_lat: number;
  south_west_lng: number;
  north_east_lat: number;
  north_east_lng: number;
}

interface AreaData {
  id: number;
  title: string;
  description: string;
  coords: number[][];
  color?: string;
}

interface ComplaintFormData {
  title: string;
  description: string;
  incident_type_id: number | null;
  incident_resource_type_id: number | null;
  address_ids: number[];
  is_complaint: boolean;
}

const CommunalServicesMap: React.FC = () => {
  const [mapData, setMapData] = useState<CommunalServicesMapItem[]>([]);
  const [filteredMapData, setFilteredMapData] = useState<CommunalServicesMapItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<CommunalServicesMapItem | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(true);
  const [showNotification, setShowNotification] = useState<boolean>(false);
  const [notificationMessage, setNotificationMessage] = useState<string>('');
  const [activeModalTab, setActiveModalTab] = useState<string>('details');

  const [showClusterModal, setShowClusterModal] = useState<boolean>(false);
  const [clusterHouses, setClusterHouses] = useState<ClusteredHouse[]>([]);
  const [searchValue, setSearchValue] = useState<string>('');

  const [cities, setCities] = useState<Array<any>>([]);
  const [organizations, setOrganizations] = useState<Array<any>>([]);
  const [resourceTypes, setResourceTypes] = useState<Array<any>>([]);
  const [incidentTypes, setIncidentTypes] = useState<Array<any>>([]);
  const [houseTypes, setHouseTypes] = useState<Array<any>>([]);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const [showAreaModal, setShowAreaModal] = useState<boolean>(false);
  const [selectedArea, setSelectedArea] = useState<{title: string, description: string} | null>(null);

  const [showComplaintModal, setShowComplaintModal] = useState<boolean>(false);
  const [submittingComplaint, setSubmittingComplaint] = useState<boolean>(false);
  const [complaintForm, setComplaintForm] = useState<ComplaintFormData>({
    title: '',
    description: '',
    incident_type_id: null,
    incident_resource_type_id: null,
    address_ids: [],
    is_complaint: true
  });

  const [mapBoundaries, setMapBoundaries] = useState<MapBoundaries | undefined>();

  const [filters, setFilters] = useState<FilterState>({
    city_id: null,
    management_org_id: null,
    house_type_id: null,
    resource_type_id: null,
    has_incidents: false,
    has_complaints: false
  });
  const [activeFilters, setActiveFilters] = useState<number>(0);

  const fetchCommunalServicesData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await initializeApi();

      const communalData = await getCommunalServicesMapData();
      if (communalData && communalData.length > 0) {
        if (communalData[0].coordinates) {
          const coords = communalData[0].coordinates;
          if (coords.center_lat && coords.center_lng &&
              coords.south_west_lat && coords.south_west_lng &&
              coords.north_east_lat && coords.north_east_lng) {

            setMapBoundaries({
              center_lat: parseFloat(coords.center_lat),
              center_lng: parseFloat(coords.center_lng),
              south_west_lat: parseFloat(coords.south_west_lat),
              south_west_lng: parseFloat(coords.south_west_lng),
              north_east_lat: parseFloat(coords.north_east_lat),
              north_east_lng: parseFloat(coords.north_east_lng)
            });
          }
        } else if (communalData[0].parameters && communalData[0].parameters.coordinates) {
          const coords = communalData[0].parameters.coordinates;
          if (coords.center_lat && coords.center_lng &&
              coords.south_west_lat && coords.south_west_lng &&
              coords.north_east_lat && coords.north_east_lng) {

            setMapBoundaries({
              center_lat: parseFloat(coords.center_lat),
              center_lng: parseFloat(coords.center_lng),
              south_west_lat: parseFloat(coords.south_west_lat),
              south_west_lng: parseFloat(coords.south_west_lng),
              north_east_lat: parseFloat(coords.north_east_lat),
              north_east_lng: parseFloat(coords.north_east_lng)
            });
          }
        }
      }

      setMapData(communalData || []);
      setFilteredMapData(communalData || []);

      try {
        const citiesResult = await getCities();
        if (Array.isArray(citiesResult)) {
          setCities(citiesResult);
        } else {
          setCities([]);
        }
      } catch (err) {
        setCities([]);
      }

      try {
        const organizationsResult = await getOrganizations();
        if (Array.isArray(organizationsResult)) {
          setOrganizations(organizationsResult);
        } else {
          setOrganizations([]);
        }
      } catch (err) {
        setOrganizations([]);
      }

      try {
        const resourceTypesResult = await getIncidentResourceTypes();
        if (Array.isArray(resourceTypesResult)) {
          setResourceTypes(resourceTypesResult);
        } else {
          setResourceTypes([]);
        }
      } catch (err) {
        setResourceTypes([]);
      }

      try {
        const incidentTypesResult = await getIncidentTypes();
        if (Array.isArray(incidentTypesResult)) {
          setIncidentTypes(incidentTypesResult);
        } else {
          setIncidentTypes([]);
        }
      } catch (err) {
        setIncidentTypes([]);
      }

      setHouseTypes([
        { id: 1, name: 'Многоквартирный' },
        { id: 2, name: 'Частный' },
        { id: 3, name: 'Блокированный' }
      ]);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunalServicesData();
  }, []);

  useEffect(() => {
    let count = 0;

    if (filters.city_id) count++;
    if (filters.management_org_id) count++;
    if (filters.house_type_id) count++;
    if (filters.resource_type_id) count++;
    if (filters.has_incidents) count++;
    if (filters.has_complaints) count++;

    setActiveFilters(count);
  }, [filters]);

  const applyFilters = (): void => {
    const filtered = mapData.filter(item => {
      if (filters.city_id && item.address?.street?.city_id !== filters.city_id) {
        return false;
      }

      if (filters.management_org_id && item.management_org_id !== filters.management_org_id) {
        return false;
      }

      if (filters.house_type_id && item.house_type_id !== filters.house_type_id) {
        return false;
      }

      if (filters.resource_type_id &&
          (!item.incidents || !item.incidents.some(incident =>
              incident.incident_resource_type_id === filters.resource_type_id
          ))) {
        return false;
      }

      if (filters.has_incidents && (!item.incidents || item.incidents.length === 0)) {
        return false;
      }

      if (filters.has_complaints &&
          (!item.incidents || !item.incidents.some(incident => incident.is_complaint === true))) {
        return false;
      }

      return true;
    });

    setFilteredMapData(filtered);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.destroy();
      mapInstanceRef.current = null;
    }

    if (window.ymaps) {
      window.ymaps.ready(() => initMap(filtered));
    }

    setNotificationMessage(`Найдено ${filtered.length} домов`);
    setShowNotification(true);
  };

  const clearAllFilters = (): void => {
    setFilters({
      city_id: null,
      management_org_id: null,
      house_type_id: null,
      resource_type_id: null,
      has_incidents: false,
      has_complaints: false
    });

    setFilteredMapData(mapData);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.destroy();
      mapInstanceRef.current = null;
    }

    if (window.ymaps) {
      window.ymaps.ready(() => initMap(mapData));
    }

    setNotificationMessage('Фильтры сброшены');
    setShowNotification(true);
  };

  const searchMapData = (): void => {
    if (!searchValue.trim()) {
      setFilteredMapData(mapData);
      return;
    }

    const lowerCaseSearch = searchValue.toLowerCase();
    const searchResults = mapData.filter(item =>
        (item.address?.street?.name && item.address.street.name.toLowerCase().includes(lowerCaseSearch)) ||
        (item.address?.house_number && item.address.house_number.toLowerCase().includes(lowerCaseSearch)) ||
        (item.management_org?.fullName && item.management_org.fullName.toLowerCase().includes(lowerCaseSearch)) ||
        (item.management_org?.shortName && item.management_org.shortName.toLowerCase().includes(lowerCaseSearch))
    );

    setFilteredMapData(searchResults);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.destroy();
      mapInstanceRef.current = null;
    }

    if (window.ymaps) {
      window.ymaps.ready(() => initMap(searchResults));
    }

    setNotificationMessage(`Найдено ${searchResults.length} домов по запросу "${searchValue}"`);
    setShowNotification(true);
  };

  const getPlacemarkColor = (item: CommunalServicesMapItem): string => {
    if (item.incidents && item.incidents.length > 0) {
      return 'islands#redCircleDotIcon';
    }

    if (item.house_condition && item.house_condition.houseCondition === 'Неисправный') {
      return 'islands#orangeCircleDotIcon';
    }

    return 'islands#greenCircleDotIcon';
  };

  const initMap = (dataToShow: CommunalServicesMapItem[] = filteredMapData): void => {
    if (!mapRef.current || !window.ymaps || dataToShow.length === 0 || !mapBoundaries) {
      return;
    }

    try {
      const myMap = new window.ymaps.Map(mapRef.current, {
        center: [mapBoundaries.center_lat, mapBoundaries.center_lng],
        zoom: 12,
        controls: ['zoomControl', 'typeSelector', 'fullscreenControl']
      });
      const bounds = [
        [mapBoundaries.south_west_lat, mapBoundaries.south_west_lng],
        [mapBoundaries.north_east_lat, mapBoundaries.north_east_lng]
      ];

      myMap.behaviors.enable('scrollZoom');
      mapInstanceRef.current = myMap;

      myMap.setBounds(bounds, {
        checkZoomRange: true
      });

      myMap.options.set('restrictMapArea', bounds);

      const clusterer = new window.ymaps.Clusterer({
        preset: 'islands#greenClusterIcons',
        groupByCoordinates: false,
        clusterDisableClickZoom: true,
        clusterHideIconOnBalloonOpen: false,
        geoObjectHideIconOnBalloonOpen: false
      });

      const placemarks: any[] = [];
      const locationMap: {[key: string]: CommunalServicesMapItem[]} = {};

      dataToShow.forEach(item => {
        if (item.address && item.address.latitude && item.address.longitude) {
          const coords = [item.address.latitude, item.address.longitude];
          const coordKey = `${coords[0]},${coords[1]}`;

          if (!locationMap[coordKey]) {
            locationMap[coordKey] = [];
          }
          locationMap[coordKey].push(item);

          if (!placemarks.some(p => p.geometry.getCoordinates().toString() === coords.toString())) {
            const address = item.address.street && item.address.street.name ?
                `${item.address.street.city?.name || ''}, ${item.address.street.name}, ${item.address.house_number}` :
                `Дом №${item.address.house_number}`;

            const incidentsCount = item.incidents ? item.incidents.length : 0;
            const complaintsCount = item.incidents ? item.incidents.filter(inc => inc.is_complaint).length : 0;

            const placemark = new window.ymaps.Placemark(
                coords,
                {
                  balloonContent: locationMap[coordKey].length > 1 ?
                      `${locationMap[coordKey].length} домов` :
                      `
                    <div>
                      <strong>${address}</strong><br>
                      УК: ${item.management_org?.shortName || 'Не указана'}<br>
                      Год постройки: ${item.buildingYear || 'Не указан'}<br>
                      ${incidentsCount > 0 ? `<span style="color: red">Активных инцидентов: ${incidentsCount}</span>` : ''}
                      ${complaintsCount > 0 ? `<br><span style="color: orange">Жалоб: ${complaintsCount}</span>` : ''}
                    </div>
                  `,
                  hintContent: locationMap[coordKey].length > 1 ?
                      `${locationMap[coordKey].length} домов` : address,
                  itemId: item.id,
                  coordKey: coordKey,
                  itemCount: locationMap[coordKey].length,
                  incidentsCount: incidentsCount,
                  complaintsCount: complaintsCount,
                  condition: item.house_condition?.houseCondition || 'Нет данных'
                },
                {
                  preset: getPlacemarkColor(item),
                  balloonOffset: [3, -40]
                }
            );

            placemark.events.add('click', (e: any) => {
              if (locationMap[coordKey].length === 1) {
                setSelectedItem(item);
                setActiveModalTab('details');
                setShowModal(true);
              } else {
                setClusterHouses(locationMap[coordKey].map(house => ({...house, isSelected: false})));
                setShowClusterModal(true);
              }
              e.stopPropagation();
            });

            placemarks.push(placemark);
          }
        }
      });

      if (placemarks.length > 0) {
        clusterer.options.set({
          clusterIconContentLayout: window.ymaps.templateLayoutFactory.createClass(
              '<div style="font-size: 13px; line-height: 26px; font-weight: bold; text-align: center; color: #fff;">{{ properties.geoObjects.length }}</div>'
          )
        });

        clusterer.events.add('click', function(e: any) {
          const cluster = e.get('target');

          const handleClusterInteraction = (): void => {
            const geoObjects = cluster.getGeoObjects();

            if (geoObjects.length === 1 && geoObjects[0].properties.get('itemCount') > 1) {
              const coordKey = geoObjects[0].properties.get('coordKey');
              if (coordKey && locationMap[coordKey]) {
                setClusterHouses(locationMap[coordKey].map(house => ({...house, isSelected: false})));
                setShowClusterModal(true);
                if (cluster.balloon.isOpen()) {
                  cluster.balloon.close();
                }
                return;
              }
            }

            const allHouses: CommunalServicesMapItem[] = [];
            geoObjects.forEach((obj: any) => {
              const coordKey = obj.properties.get('coordKey');
              if (coordKey && locationMap[coordKey]) {
                locationMap[coordKey].forEach(house => {
                  if (!allHouses.some(h => h.id === house.id)) {
                    allHouses.push(house);
                  }
                });
              }
            });

            if (allHouses.length > 0) {
              setClusterHouses(allHouses.map(house => ({...house, isSelected: false})));
              setShowClusterModal(true);
              if (cluster.balloon.isOpen()) {
                cluster.balloon.close();
              }
            }
          };

          handleClusterInteraction();
          e.stopPropagation();
        });

        clusterer.events.add('objectsaddtomap', function(e: any) {
          const clusters = e.get('child').filter((obj: any) => obj.options.getName() === 'cluster');

          clusters.forEach((cluster: any) => {
            const geoObjects = cluster.properties.get('geoObjects');

            const hasIncidents = geoObjects.some((obj: any) => obj.properties.get('incidentsCount') > 0);

            const hasBadCondition = geoObjects.some((obj: any) =>
                obj.properties.get('condition') === 'Неисправный'
            );

            if (hasIncidents) {
              cluster.options.set('preset', 'islands#redClusterIcons');
            } else if (hasBadCondition) {
              cluster.options.set('preset', 'islands#orangeClusterIcons');
            } else {
              cluster.options.set('preset', 'islands#greenClusterIcons');
            }
          });
        });

        clusterer.add(placemarks);
        myMap.geoObjects.add(clusterer);

        if (placemarks.length > 1) {
          myMap.setBounds(clusterer.getBounds(), {
            checkZoomRange: true
          });
        } else if (placemarks.length === 1) {
          const coords = placemarks[0].geometry.getCoordinates();
          myMap.setCenter(coords, 15);
        }
      }
    } catch (error) {
      setError('Ошибка при инициализации карты. Пожалуйста, обновите страницу.');
    }
  };

  useEffect(() => {
    const loadYandexMapsApi = (): void => {
      if (window.ymaps) {
        window.ymaps.ready(() => {
          if (filteredMapData.length > 0) {
            initMap();
          }
        });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://api-maps.yandex.ru/2.1/?apikey=9b9469e9-98d9-4c6d-9b5d-4272b266a69e&lang=ru_RU';
      script.type = 'text/javascript';
      script.async = true;

      script.onload = () => {
        if (window.ymaps) {
          window.ymaps.ready(() => {
            if (filteredMapData.length > 0) {
              initMap();
            }
          });
        }
      };

      script.onerror = () => {
        setError('Не удалось загрузить API Яндекс.Карт');
      };

      document.head.appendChild(script);
    };

    if (!loading && filteredMapData.length > 0) {
      loadYandexMapsApi();
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, [loading, filteredMapData]);

  const handleCloseModal = (): void => {
    setShowModal(false);
    setSelectedItem(null);
    setActiveModalTab('details');
  };

  const handleCloseClusterModal = (): void => {
    setShowClusterModal(false);
    setClusterHouses([]);
  };

  const handleSelectClusterItem = (houseId: number): void => {
    const house = mapData.find(h => h.id === houseId);
    if (house) {
      setSelectedItem(house);
      setActiveModalTab('details');
      setShowClusterModal(false);
      setShowModal(true);
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Не указана';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU');
  };

  const toggleFilter = (): void => {
    setIsFilterExpanded(!isFilterExpanded);
  };

  const getIncidentStatusClass = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'новый':
        return 'bg-danger';
      case 'в работе':
        return 'bg-warning';
      case 'решен':
        return 'bg-success';
      case 'закрыт':
        return 'bg-secondary';
      default:
        return 'bg-info';
    }
  };

  const getFormattedAddress = (item: CommunalServicesMapItem): string => {
    if (!item || !item.address) return 'Адрес не указан';

    let address = '';
    if (item.address.street?.city?.name) {
      address += `${item.address.street.city.name}, `;
    }
    if (item.address.street?.name) {
      address += `${item.address.street.name}, `;
    }
    address += `д. ${item.address.house_number}`;
    if (item.address.building) {
      address += ` корп. ${item.address.building}`;
    }
    return address;
  };

  const openComplaintModal = (house: CommunalServicesMapItem): void => {
    if (house && house.address && house.address.id) {
      setComplaintForm({
        title: '',
        description: '',
        incident_type_id: null,
        incident_resource_type_id: null,
        address_ids: [house.address.id],
        is_complaint: true
      });
      setShowComplaintModal(true);
      setShowModal(false);
    } else {
      setNotificationMessage('Ошибка: Невозможно определить адрес дома');
      setShowNotification(true);
    }
  };

  const handleComplaintInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
    const { name, value } = e.target;
    setComplaintForm({
      ...complaintForm,
      [name]: value
    });
  };

  const handleComplaintSelectChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const { name, value } = e.target;
    setComplaintForm({
      ...complaintForm,
      [name]: value ? parseInt(value, 10) : null
    });
  };

  const submitComplaint = async (): Promise<void> => {
    try {
      setSubmittingComplaint(true);
      
      if (!complaintForm.title || !complaintForm.description || !complaintForm.incident_type_id || !complaintForm.incident_resource_type_id) {
        setNotificationMessage('Пожалуйста, заполните все обязательные поля');
        setShowNotification(true);
        setSubmittingComplaint(false);
        return;
      }

      const response = await createIncident(complaintForm);
      
      setShowComplaintModal(false);
      setComplaintForm({
        title: '',
        description: '',
        incident_type_id: null,
        incident_resource_type_id: null,
        address_ids: [],
        is_complaint: true
      });
      
      setNotificationMessage('Жалоба успешно отправлена');
      setShowNotification(true);
      
      await fetchCommunalServicesData();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка при отправке жалобы';
      setNotificationMessage(`Ошибка: ${errorMessage}`);
      setShowNotification(true);
    } finally {
      setSubmittingComplaint(false);
    }
  };

  const renderOrganizationDetails = (org: any, title: string) => {
    if (!org) return <p>Информация не доступна</p>;
    
    return (
      <div className="mb-4 p-3 border-start border-4 border-info bg-light">
        <div className="d-flex align-items-center mb-3">
          <i className="fas fa-building me-2 text-info fs-4"></i>
          <div className="w-100">
            <strong>{title}:</strong><br />
            <div className="d-flex justify-content-between align-items-center flex-wrap">
              <span>{org.shortName || org.fullName || 'Не указана'}</span>
              {org.url && (
                <a href={org.url.startsWith('http') ? org.url : `https://${org.url}`}
                   target="_blank" rel="noopener noreferrer"
                   className="btn btn-sm btn-outline-primary mt-1">
                  <i className="fas fa-external-link-alt me-1"></i> Сайт
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="row mt-2">
          <div className="col-md-6">
            <small className="text-muted d-block mb-1">ИНН:</small>
            <div className="fw-bold">{org.inn || 'Не указан'}</div>
          </div>
          <div className="col-md-6">
            <small className="text-muted d-block mb-1">ОГРН:</small>
            <div className="fw-bold">{org.ogrn || 'Не указан'}</div>
          </div>
        </div>
        <div className="row mt-2">
          <div className="col-md-6">
            <small className="text-muted d-block mb-1">Телефон:</small>
            <div className="fw-bold">{org.phone || 'Не указан'}</div>
          </div>
          <div className="col-md-6">
            <small className="text-muted d-block mb-1">Адрес:</small>
            <div className="fw-bold">{org.orgAddress || 'Не указан'}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
      <React.Fragment>
        <div className="page-header">
          <div className="page-block">
            <div className="row align-items-center">
              <div className="col-md-12">
                <div className="page-header-title">
                  <h5 className="m-b-10">Карта коммунальных услуг</h5>
                </div>
                <ul className="breadcrumb">
                  <li className="breadcrumb-item">
                    <Link to="/dashboard">Главная</Link>
                  </li>
                  <li className="breadcrumb-item">Карты</li>
                  <li className="breadcrumb-item">Карта коммунальных услуг</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <Card className="mb-3">
          <Card.Body>
            <div className="d-flex flex-wrap gap-3 justify-content-center">
              <div className="d-flex align-items-center">
                <span className="legend-dot rounded-circle me-2" style={{ backgroundColor: '#ff0000' }}></span>
                <span>Есть активные инциденты</span>
              </div>
              <div className="d-flex align-items-center">
                <span className="legend-dot rounded-circle me-2" style={{ backgroundColor: '#ffaa00' }}></span>
                <span>Неисправный дом</span>
              </div>
              <div className="d-flex align-items-center">
                <span className="legend-dot rounded-circle me-2" style={{ backgroundColor: '#00aa00' }}></span>
                <span>Исправный дом</span>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card className="mb-3">
          <Card.Body>
            <InputGroup>
              <Form.Control
                  placeholder="Поиск по адресу или управляющей компании..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchMapData()}
              />
              <Button variant="primary" onClick={searchMapData}>
                <i className="fa fa-search"></i> Поиск
              </Button>
              <Button variant="outline-secondary" onClick={() => {
                setSearchValue('');
                setFilteredMapData(mapData);

                if (mapInstanceRef.current) {
                  mapInstanceRef.current.destroy();
                  mapInstanceRef.current = null;
                }

                if (window.ymaps) {
                  window.ymaps.ready(() => initMap(mapData));
                }
              }}>
                Сбросить
              </Button>
            </InputGroup>
          </Card.Body>
        </Card>

        <Card className="mb-3">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              Фильтр
              {activeFilters > 0 && (
                  <span className="ms-2 badge bg-primary">{activeFilters}</span>
              )}
            </h5>
            <Button
                variant="outline-primary"
                size="sm"
                onClick={toggleFilter}
            >
              {isFilterExpanded ? 'Скрыть' : 'Показать'}
            </Button>
          </Card.Header>
          {isFilterExpanded && (
              <Card.Body>
                <Form>
                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Город</Form.Label>
                        <Form.Select
                            value={filters.city_id || ''}
                            onChange={(e) => setFilters({
                              ...filters,
                              city_id: e.target.value ? Number(e.target.value) : null
                            })}
                        >
                          <option value="">Все города</option>
                          {Array.isArray(cities) && cities.map(city => (
                              <option key={city.id} value={city.id}>
                                {city.name}
                              </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Управляющая компания</Form.Label>
                        <Form.Select
                            value={filters.management_org_id || ''}
                            onChange={(e) => setFilters({
                              ...filters,
                              management_org_id: e.target.value ? Number(e.target.value) : null
                            })}
                        >
                          <option value="">Все УК</option>
                          {Array.isArray(organizations) && organizations.map(org => (
                              <option key={org.id} value={org.id}>
                                {org.shortName || org.fullName}
                              </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Тип дома</Form.Label>
                        <Form.Select
                            value={filters.house_type_id || ''}
                            onChange={(e) => setFilters({
                              ...filters,
                              house_type_id: e.target.value ? Number(e.target.value) : null
                            })}
                        >
                          <option value="">Все типы домов</option>
                          {Array.isArray(houseTypes) && houseTypes.map(type => (
                              <option key={type.id} value={type.id}>
                                {type.name}
                              </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>

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
                          <option value="">Все типы ресурсов</option>
                          {Array.isArray(resourceTypes) && resourceTypes.map(type => (
                              <option key={type.id} value={type.id}>
                                {type.name}
                              </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3 mt-4">
                        <Form.Check
                            type="checkbox"
                            label="Только с активными инцидентами"
                            checked={filters.has_incidents}
                            onChange={(e) => setFilters({...filters, has_incidents: e.target.checked})}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3 mt-4">
                        <Form.Check
                            type="checkbox"
                            label="Только с жалобами"
                            checked={filters.has_complaints}
                            onChange={(e) => setFilters({...filters, has_complaints: e.target.checked})}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <div className="d-flex">
                    <Button variant="primary" onClick={applyFilters} className="me-2">
                      Применить фильтр
                    </Button>
                    <Button variant="outline-secondary" onClick={clearAllFilters}>
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
                ) : filteredMapData.length === 0 ? (
                    <div className="alert alert-info" role="alert">
                      Нет данных для отображения. Попробуйте изменить фильтры.
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

        {/* House Details Modal with Tabs */}
        <Modal show={showModal} onHide={handleCloseModal} size="lg">
          <Modal.Header closeButton className="bg-light">
            <Modal.Title>
              {selectedItem?.address?.street?.city?.name ? `${selectedItem.address.street.city.name}, ` : ''}
              {selectedItem?.address?.street?.name ? `${selectedItem.address.street.name}, ` : ''}
              д. {selectedItem?.address?.house_number}
              {selectedItem?.address?.building ? ` корп. ${selectedItem.address.building}` : ''}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedItem && (
              <div>
                <Nav variant="tabs" className="mb-3" activeKey={activeModalTab} onSelect={(k) => k && setActiveModalTab(k)}>
                  <Nav.Item>
                    <Nav.Link eventKey="details">Детали дома</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="management">Управляющая компания</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="municipality">Муниципальная организация</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="incidents">Инциденты</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="rso">РСО</Nav.Link>
                  </Nav.Item>
                </Nav>

                {/* House Details Tab */}
                {activeModalTab === 'details' && (
                  <>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <div className="d-flex align-items-center mb-2">
                          <span className="badge bg-primary me-2">Тип дома</span>
                          <span>{selectedItem.house_type?.houseTypeName || 'Не указан'}</span>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="d-flex align-items-center mb-2">
                          <span className={`badge ${selectedItem.house_condition?.houseCondition === 'Неисправный' ? 'bg-warning' : 'bg-success'} me-2`}>
                            Состояние
                          </span>
                          <span className={selectedItem.house_condition?.houseCondition === 'Неисправный' ? 'text-warning' : 'text-success'}>
                            {selectedItem.house_condition?.houseCondition || 'Не указано'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="row mb-4">
                      <div className="col-md-6">
                        <div className="info-card p-3 border-start border-4 border-primary bg-light">
                          <strong>Год постройки:</strong> {selectedItem.buildingYear || 'Не указан'}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="info-card p-3 border-start border-4 border-success bg-light">
                          <strong>Кадастровый номер:</strong> {selectedItem.cadastreNumber || 'Не указан'}
                        </div>
                      </div>
                    </div>

                    {selectedItem.ozp_period && (
                      <div className="mb-4">
                        <h6 className="text-primary mb-3">Отопительный период</h6>
                        <div className="card">
                          <div className="card-body">
                            <div className="row">
                              <div className="col-md-6">
                                <div className="d-flex align-items-center">
                                  <i className="fas fa-calendar-alt me-2 text-success"></i>
                                  <div>
                                    <small className="text-muted">Начало отопления</small>
                                    <div>{formatDate(selectedItem.ozp_period.start_date)}</div>
                                  </div>
                                </div>
                              </div>
                              <div className="col-md-6">
                                <div className="d-flex align-items-center">
                                  <i className="fas fa-calendar-check me-2 text-danger"></i>
                                  <div>
                                    <small className="text-muted">Конец отопления</small>
                                    <div>{formatDate(selectedItem.ozp_period.end_date)}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {selectedItem.resource_outages && selectedItem.resource_outages.length > 0 && (
                      <div className="mb-4">
                        <h6 className="text-warning mb-3">Отключения ресурсов</h6>
                        <div className="card">
                          <ul className="list-group list-group-flush">
                            {selectedItem.resource_outages.map((outage, index) => (
                              <li key={index} className="list-group-item d-flex align-items-center">
                                <i className="fas fa-exclamation-triangle me-2 text-warning"></i>
                                {outage.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Management Company Tab */}
                {activeModalTab === 'management' && (
                  <>
                    {renderOrganizationDetails(selectedItem.management_org, "Управляющая компания")}
                  </>
                )}

                {/* Municipality Organization Tab */}
                {activeModalTab === 'municipality' && (
                  <>
                    {renderOrganizationDetails(selectedItem.municipality_org, "Муниципальная организация")}
                  </>
                )}

                {/* Incidents Tab */}
                {activeModalTab === 'incidents' && (
                  <>
                    <h5 className="text-danger mb-3">
                      <i className="fas fa-exclamation-circle me-2"></i>
                      Инциденты {selectedItem.incidents && selectedItem.incidents.length > 0 ? `(${selectedItem.incidents.length})` : '(0)'}
                    </h5>
                    
                    {selectedItem.incidents && selectedItem.incidents.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-bordered table-striped table-hover">
                          <thead className="table-dark">
                            <tr>
                              <th>Тип</th>
                              <th>Ресурс</th>
                              <th>Название</th>
                              <th>Статус</th>
                              <th>Тип</th>
                              <th>Дата</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedItem.incidents.map((incident, index) => (
                              <tr key={index}>
                                <td>{incident.type?.name || 'Не указан'}</td>
                                <td>
                                  <span className="badge bg-info">
                                    {incident.resource_type?.name || 'Не указан'}
                                  </span>
                                </td>
                                <td>{incident.title}</td>
                                <td>
                                  <span className={`badge ${getIncidentStatusClass(incident.status?.name || '')}`}>
                                    {incident.status?.name || 'Не указан'}
                                  </span>
                                </td>
                                <td>
                                  {incident.is_complaint ? (
                                    <span className="badge bg-warning">Жалоба</span>
                                  ) : (
                                    <span className="badge bg-secondary">Инцидент</span>
                                  )}
                                </td>
                                <td>{formatDate(incident.created_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="alert alert-info">
                        Нет активных инцидентов
                      </div>
                    )}

                    <h5 className="text-warning mt-4 mb-3">
                      <i className="fas fa-comment-dots me-2"></i>
                      Жалобы {selectedItem.incidents && selectedItem.incidents.filter(inc => inc.is_complaint).length > 0 ? 
                        `(${selectedItem.incidents.filter(inc => inc.is_complaint).length})` : '(0)'}
                    </h5>
                    
                    {selectedItem.incidents && selectedItem.incidents.filter(inc => inc.is_complaint).length > 0 ? (
                      <div className="accordion" id="complaintsAccordion">
                        {selectedItem.incidents.filter(inc => inc.is_complaint).map((complaint, index) => (
                          <div className="accordion-item" key={index}>
                            <h2 className="accordion-header" id={`complaintHeading${index}`}>
                              <button 
                                className="accordion-button collapsed" 
                                type="button" 
                                data-bs-toggle="collapse" 
                                data-bs-target={`#complaintCollapse${index}`} 
                                aria-expanded="false" 
                                aria-controls={`complaintCollapse${index}`}
                              >
                                <div className="d-flex justify-content-between align-items-center w-100 me-3">
                                  <span>{complaint.title}</span>
                                  <span className={`badge ${getIncidentStatusClass(complaint.status?.name || '')}`}>
                                    {complaint.status?.name || 'Не указан'}
                                  </span>
                                </div>
                              </button>
                            </h2>
                            <div 
                              id={`complaintCollapse${index}`} 
                              className="accordion-collapse collapse" 
                              aria-labelledby={`complaintHeading${index}`} 
                              data-bs-parent="#complaintsAccordion"
                            >
                              <div className="accordion-body">
                                <p className="mb-1">{complaint.description}</p>
                                <div className="d-flex justify-content-between align-items-center mt-3">
                                  <small className="text-muted">
                                    <i className="far fa-calendar me-1"></i> {formatDate(complaint.created_at)}
                                  </small>
                                  <span className="badge bg-info">
                                    {complaint.resource_type?.name || 'Ресурс не указан'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="alert alert-info">
                        Нет жалоб
                      </div>
                    )}
                  </>
                )}

                {/* RSO Tab */}
                {activeModalTab === 'rso' && (
                  <>
                    <h5 className="text-primary mb-3">Ресурсоснабжающие организации</h5>
                    
                    {selectedItem.rso && selectedItem.rso.length > 0 ? (
                      <div className="accordion" id="rsoAccordion">
                        {selectedItem.rso.map((rso, index) => (
                          <div className="accordion-item" key={index}>
                            <h2 className="accordion-header" id={`rsoHeading${index}`}>
                              <button 
                                className="accordion-button" 
                                type="button" 
                                data-bs-toggle="collapse" 
                                data-bs-target={`#rsoCollapse${index}`} 
                                aria-expanded={index === 0 ? "true" : "false"} 
                                aria-controls={`rsoCollapse${index}`}
                              >
                                <i className="fas fa-industry me-2 text-secondary"></i>
                                {rso.shortName || rso.fullName}
                              </button>
                            </h2>
                            <div 
                              id={`rsoCollapse${index}`} 
                              className={`accordion-collapse collapse ${index === 0 ? 'show' : ''}`} 
                              aria-labelledby={`rsoHeading${index}`} 
                              data-bs-parent="#rsoAccordion"
                            >
                              <div className="accordion-body">
                                <div className="row">
                                  <div className="col-md-6">
                                    <small className="text-muted d-block mb-1">ИНН:</small>
                                    <div className="fw-bold">{rso.inn || 'Не указан'}</div>
                                  </div>
                                  <div className="col-md-6">
                                    <small className="text-muted d-block mb-1">ОГРН:</small>
                                    <div className="fw-bold">{rso.ogrn || 'Не указан'}</div>
                                  </div>
                                </div>
                                <div className="row mt-2">
                                  <div className="col-md-6">
                                    <small className="text-muted d-block mb-1">Телефон:</small>
                                    <div className="fw-bold">{rso.phone || 'Не указан'}</div>
                                  </div>
                                  <div className="col-md-6">
                                    <small className="text-muted d-block mb-1">Адрес:</small>
                                    <div className="fw-bold">{rso.orgAddress || 'Не указан'}</div>
                                  </div>
                                </div>
                                {rso.url && (
                                  <div className="row mt-2">
                                    <div className="col-12">
                                      <small className="text-muted d-block mb-1">Сайт:</small>
                                      <a 
                                        href={rso.url.startsWith('http') ? rso.url : `https://${rso.url}`}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-decoration-none"
                                      >
                                        {rso.url} <i className="fas fa-external-link-alt ms-1 small"></i>
                                      </a>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="alert alert-info">
                        Нет данных о ресурсоснабжающих организациях
                      </div>
                    )}
                  </>
                )}

                <div className="row mt-3">
                  <div className="col-md-6">
                    <small className="text-muted">
                      <i className="far fa-calendar-plus me-1"></i>
                      Создан: {formatDate(selectedItem.created_at)}
                    </small>
                  </div>
                  <div className="col-md-6">
                    <small className="text-muted">
                      <i className="far fa-calendar-alt me-1"></i>
                      Обновлен: {formatDate(selectedItem.updated_at)}
                    </small>
                  </div>
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            {selectedItem && (
              <Button 
                variant="warning" 
                className="me-auto"
                onClick={() => openComplaintModal(selectedItem)}
              >
                <i className="fas fa-comment-alt me-1"></i> Отправить жалобу
              </Button>
            )}
            <Button variant="secondary" onClick={handleCloseModal}>
              Закрыть
            </Button>
          </Modal.Footer>
        </Modal>

        {/* House Cluster Modal */}
        <Modal show={showClusterModal} onHide={handleCloseClusterModal} size="lg" backdrop="static">
          <Modal.Header closeButton className="bg-light">
            <Modal.Title>Дома в данной точке ({clusterHouses.length})</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {clusterHouses.length > 0 ? (
                <div className="cluster-items-list">
                  {clusterHouses.map(house => (
                      <div
                          key={house.id}
                          className="cluster-item p-3 mb-3 border rounded cursor-pointer"
                          onClick={() => handleSelectClusterItem(house.id)}
                      >
                        <h5 className="text-primary">{getFormattedAddress(house)}</h5>
                        <div className="d-flex flex-wrap gap-2 mb-2">
                          <div className="badge bg-primary me-1">
                            {house.house_type?.houseTypeName || 'Тип не указан'}
                          </div>
                          <div className={`badge ${house.house_condition?.houseCondition === 'Неисправный' ? 'bg-warning' : 'bg-success'} me-1`}>
                            {house.house_condition?.houseCondition || 'Состояние не указано'}
                          </div>
                          {house.incidents && house.incidents.length > 0 && (
                              <div className="badge bg-danger me-1">
                                Инцидентов: {house.incidents.length}
                              </div>
                          )}
                          {house.incidents && house.incidents.filter(inc => inc.is_complaint).length > 0 && (
                              <div className="badge bg-warning me-1">
                                Жалобы: {house.incidents.filter(inc => inc.is_complaint).length}
                              </div>
                          )}
                        </div>
                        <div className="mb-2">
                          <strong>УК:</strong> {house.management_org?.shortName || house.management_org?.fullName || 'Не указана'}
                          {house.management_org?.inn && <span className="ms-2">ИНН: {house.management_org.inn}</span>}
                        </div>
                        {house.buildingYear && (
                            <div className="mb-2">
                              <strong>Год постройки:</strong> {house.buildingYear}
                            </div>
                        )}
                        <div className="d-flex justify-content-between align-items-center mt-2">
                          <small className="text-muted">
                            Обновлен: {formatDate(house.updated_at)}
                          </small>
                          <div>
                            <Button
                                variant="warning"
                                size="sm"
                                className="me-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openComplaintModal(house);
                                }}
                            >
                              <i className="fas fa-comment-alt me-1"></i> Жалоба
                            </Button>
                            <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectClusterItem(house.id);
                                }}
                            >
                              Подробнее
                            </Button>
                          </div>
                        </div>
                      </div>
                  ))}
                </div>
            ) : (
                <p>Нет домов для отображения</p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseClusterModal}>
              Закрыть
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Area Info Modal */}
        <Modal show={showAreaModal} onHide={() => setShowAreaModal(false)}>
          <Modal.Header closeButton className="bg-light">
            <Modal.Title>{selectedArea?.title || 'Информация об области'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedArea && (
                <p>{selectedArea.description}</p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAreaModal(false)}>
              Закрыть
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Complaint Modal */}
        <Modal show={showComplaintModal} onHide={() => setShowComplaintModal(false)} backdrop="static">
          <Modal.Header closeButton className="bg-light">
            <Modal.Title>
              <i className="fas fa-comment-dots me-2 text-warning"></i>
              Подать жалобу
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {complaintForm.address_ids.length > 0 ? (
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Тема жалобы <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    type="text" 
                    name="title"
                    value={complaintForm.title}
                    onChange={handleComplaintInputChange}
                    placeholder="Введите тему жалобы"
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Описание проблемы <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={4}
                    name="description"
                    value={complaintForm.description}
                    onChange={handleComplaintInputChange}
                    placeholder="Опишите проблему подробнее"
                    required
                  />
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Тип инцидента <span className="text-danger">*</span></Form.Label>
                      <Form.Select
                        name="incident_type_id"
                        value={complaintForm.incident_type_id || ''}
                        onChange={handleComplaintSelectChange}
                        required
                      >
                        <option value="">Выберите тип</option>
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
                      <Form.Label>Тип ресурса <span className="text-danger">*</span></Form.Label>
                      <Form.Select
                        name="incident_resource_type_id"
                        value={complaintForm.incident_resource_type_id || ''}
                        onChange={handleComplaintSelectChange}
                        required
                      >
                        <option value="">Выберите ресурс</option>
                        {Array.isArray(resourceTypes) && resourceTypes.map(type => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <div className="alert alert-info">
                  <i className="fas fa-info-circle me-2"></i>
                  Жалоба будет отправлена в соответствующие службы для рассмотрения. Вы сможете отслеживать статус вашей жалобы в системе.
                </div>
              </Form>
            ) : (
              <div className="alert alert-danger">
                <i className="fas fa-exclamation-triangle me-2"></i>
                Ошибка: Не удалось определить адрес для жалобы
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowComplaintModal(false)}>
              Отмена
            </Button>
            <Button 
              variant="primary" 
              onClick={submitComplaint}
              disabled={submittingComplaint || !complaintForm.title || !complaintForm.description || !complaintForm.incident_type_id || !complaintForm.incident_resource_type_id}
            >
              {submittingComplaint ? (
                <>
                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                  Отправка...
                </>
              ) : (
                <>Отправить жалобу</>
              )}
            </Button>
          </Modal.Footer>
        </Modal>

        <ToastContainer
            position="top-end"
            className="p-3"
            style={{ zIndex: 9999 }}
        >
          <Toast
              show={showNotification}
              onClose={() => setShowNotification(false)}
              delay={5000}
              autohide
              bg="info"
          >
            <Toast.Header>
              <strong className="me-auto">Уведомление</strong>
            </Toast.Header>
            <Toast.Body className="text-white">
              {notificationMessage}
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
        
        .cluster-items-list {
          max-height: 500px;
          overflow-y: auto;
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
        
        .info-card {
          border-radius: 4px;
          transition: all 0.2s ease;
        }
        
        .info-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .accordion-button:not(.collapsed) {
          background-color: rgba(13, 110, 253, 0.1);
          color: #0d6efd;
        }
        
        .nav-tabs .nav-link {
          color: #495057;
        }
        
        .nav-tabs .nav-link.active {
          font-weight: 500;
          color: #0d6efd;
        }
      `}</style>
      </React.Fragment>
  );
};

export default CommunalServicesMap;