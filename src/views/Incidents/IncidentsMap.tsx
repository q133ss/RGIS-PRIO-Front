import React, { useEffect, useState, useRef } from 'react';
import { Card, Row, Col, Modal, Button, Spinner, Form, Toast, ToastContainer } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
  initializeApi,
  getIncidents,
  getIncidentTypes,
  getIncidentResourceTypes,
  createIncident,
  getCities,
  searchAddresses,
  getHeatSourceDetails,
  fetchUserCoords
} from '../../services/api';
import { Incident, Address, IncidentStatus, ResourceType, IncidentType, City, HeatSource } from '../../types/incident'; // Removed 'Street'

// Define the MapBoundaries interface
interface MapBoundaries {
  // Standard boundary coordinates
  north: number;
  south: number;
  east: number;
  west: number;
  // Center coordinates
  center_lat: number;
  center_lng: number;
  // Southwest corner coordinates
  south_west_lat: number;
  south_west_lng: number;
  // Northeast corner coordinates
  north_east_lat: number;
  north_east_lng: number;
}

declare global {
  interface Window {
    ymaps: any;
  }
}

interface FilterState {
  startDate: string;
  endDate: string;
  resourceTypeIds: number[];
  incidentTypeIds: number[];
  statusIds: number[];
  city: string;
  street: string;
  building: string;
  showComplaints: boolean;
  showParameters: boolean;
}

interface ClusteredIncident extends Incident {
  isSelected?: boolean;
}

const IncidentsMap: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filteredIncidents, setFilteredIncidents] = useState<Incident[]>([]);
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([]);
  const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>([]);
  const [statuses, setStatuses] = useState<IncidentStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showIncidentForm, setShowIncidentForm] = useState<boolean>(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  const [showNotification, setShowNotification] = useState<boolean>(false);
  const [notificationMessage, setNotificationMessage] = useState<string>('');

  const [showClusterModal, setShowClusterModal] = useState<boolean>(false);
  const [clusterIncidents, setClusterIncidents] = useState<ClusteredIncident[]>([]);

  const [highlightedAddresses, setHighlightedAddresses] = useState<Address[]>([]);
  const [highlightedPlacemarks, setHighlightedPlacemarks] = useState<any[]>([]);
  const [selectedHeatSource, setSelectedHeatSource] = useState<HeatSource | null>(null);
  const [isSearchingAddress, setIsSearchingAddress] = useState<boolean>(false);
  const [addressSearchTimeout, setAddressSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [addressCache, setAddressCache] = useState<{[key: string]: Address[]}>({});

  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    incident_type_id: 0,
    incident_resource_type_id: 0,
    address_ids: [] as number[],
    is_complaint: false
  });

  const [addressSearchValue, setAddressSearchValue] = useState('');
  const [showAddressFilter, setShowAddressFilter] = useState(false);
  const [addressFilter, setAddressFilter] = useState({
    city: '',
    street: ''
  });

  const [cities, setCities] = useState<City[]>([]);
  const [cityAddresses, setCityAddresses] = useState<Address[]>([]);
  const [searchedAddresses, setSearchedAddresses] = useState<Address[]>([]);
  const [selectedAddresses, setSelectedAddresses] = useState<Address[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  // Removed unused viewLevel state

  const [filters, setFilters] = useState<FilterState>({
    startDate: '',
    endDate: '',
    resourceTypeIds: [],
    incidentTypeIds: [],
    statusIds: [],
    city: '',
    street: '',
    building: '',
    showComplaints: false,
    showParameters: false
  });
  const [activeFilters, setActiveFilters] = useState<number>(0);

  const [mapBoundaries, setMapBoundaries] = useState<MapBoundaries | null>(null);
  const fetchIncidents = async (filterParams?: FilterState): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await initializeApi();

      const result = await getIncidents();
      const allIncidents = result.items || [];

      setIncidents(allIncidents);

      if (filterParams) {
        const filtered = applyFiltersToIncidents(allIncidents, filterParams);
        setFilteredIncidents(filtered);
      } else {
        setFilteredIncidents(allIncidents);
      }

      try {
        const incidentTypesResult = await getIncidentTypes();
        setIncidentTypes(incidentTypesResult || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка при загрузке типов инцидентов');
      }

      try {
        const resourceTypesResult = await getIncidentResourceTypes();
        setResourceTypes(resourceTypesResult || []);
      } catch (err) {
         setError(err instanceof Error ? err.message : 'Ошибка при загрузке типов ресурсов');
      }

      // Координаты для карты
      try {
        const userProfile = await fetchUserCoords();
        if (userProfile) {
          setMapBoundaries({
            // Standard boundary coordinates
            north: userProfile.north_east_lat,
            south: userProfile.south_west_lat,
            east: userProfile.north_east_lng,
            west: userProfile.south_west_lng,
            // Center coordinates
            center_lat: userProfile.center_lat,
            center_lng: userProfile.center_lng,
            // Southwest corner coordinates
            south_west_lat: userProfile.south_west_lat,
            south_west_lng: userProfile.south_west_lng,
            // Northeast corner coordinates
            north_east_lat: userProfile.north_east_lat,
            north_east_lng: userProfile.north_east_lng
          });
        } else {
          setError('Не удалось загрузить координаты пользователя');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка при загрузке данных пользователя');
      }

      // TODO данные с бека!
      setStatuses([
        { id: 1, name: 'Новый', slug: 'new', created_at: '', updated_at: '' },
        { id: 2, name: 'В работе', slug: 'in_progress', created_at: '', updated_at: '' },
        { id: 3, name: 'Решен', slug: 'resolved', created_at: '', updated_at: '' },
        { id: 4, name: 'Закрыт', slug: 'closed', created_at: '', updated_at: '' },
        { id: 5, name: 'Отменен', slug: 'cancelled', created_at: '', updated_at: '' }
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка при загрузке инцидентов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchAddressData = async (): Promise<void> => {
      try {
        const citiesData = await getCities();
        if (citiesData && Array.isArray(citiesData)) {
          setCities(citiesData);
        } else if (citiesData && typeof citiesData === 'object' && 'data' in citiesData && Array.isArray((citiesData as any).data)) {
          setCities((citiesData as any).data);
        } else {
          setCities([]);
          setError('Получен неверный формат данных городов');
        }

        const defaultCityId = 2;
        setSelectedCityId(defaultCityId);

        try {
          await loadCityAddresses(defaultCityId);
        } catch (addressError) {
          setError(addressError instanceof Error ? addressError.message : 'Ошибка при загрузке адресов');
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Ошибка при загрузке данных для адресов');
      }
    };

    if (!loading) {
      fetchAddressData();
    }
  }, [loading]);

  const loadCityAddresses = async (cityId: number): Promise<void> => {
    try {
      setIsSearchingAddress(true);
      const addresses = await searchAddresses(cityId, '');

      let addressesArray: Address[] = [];

      if (Array.isArray(addresses)) {
        addressesArray = addresses;
      } else if (addresses && typeof addresses === 'object' && 'data' in addresses && Array.isArray((addresses as any).data)) {
        addressesArray = (addresses as any).data;
      } else {
        setCityAddresses([]);
        setSearchedAddresses([]);
        setNotificationMessage('Не удалось загрузить список адресов (неверный формат данных)');
        setShowNotification(true);
        return;
      }

      const uniqueAddresses = addressesArray.reduce((acc: Address[], curr) => {
        if (!acc.some(addr => addr.id === curr.id)) {
          acc.push(curr);
        }
        return acc;
      }, []);

      setCityAddresses(uniqueAddresses);
      setSearchedAddresses(uniqueAddresses.slice(0, 20));
    } catch (error) {
      setNotificationMessage('Ошибка при загрузке адресов для выбранного города');
      setShowNotification(true);
      setCityAddresses([]);
      setSearchedAddresses([]);
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const applyFiltersToIncidents = (incidents: Incident[], filterParams: FilterState): Incident[] => {
    return incidents.filter(incident => {
      if (filterParams.startDate) {
        const incidentDate = new Date(incident.created_at);
        const startDate = new Date(filterParams.startDate);
        if (incidentDate < startDate) return false;
      }

      if (filterParams.endDate) {
        const incidentDate = new Date(incident.created_at);
        const endDate = new Date(filterParams.endDate);
        endDate.setHours(23, 59, 59);
        if (incidentDate > endDate) return false;
      }

      if (filterParams.resourceTypeIds.length > 0) {
        if (!incident.resource_type || !filterParams.resourceTypeIds.includes(incident.resource_type.id)) {
          return false;
        }
      }

      if (filterParams.incidentTypeIds.length > 0) {
        if (!incident.type || !filterParams.incidentTypeIds.includes(incident.type.id)) {
          return false;
        }
      }

      if (filterParams.statusIds.length > 0) {
        if (!incident.status || !filterParams.statusIds.includes(incident.status.id)) {
          return false;
        }
      }

      if (filterParams.city || filterParams.street || filterParams.building) {
        if (!incident.addresses || incident.addresses.length === 0) return false;

        return incident.addresses.some(address => {
          const cityMatch = !filterParams.city ||
            (address.street?.city?.name &&
             address.street.city.name.toLowerCase().includes(filterParams.city.toLowerCase()));

          const streetMatch = !filterParams.street ||
            (address.street?.name &&
             address.street.name.toLowerCase().includes(filterParams.street.toLowerCase()));

          const buildingMatch = !filterParams.building ||
            address.house_number.toLowerCase().includes(filterParams.building.toLowerCase());

          return cityMatch && streetMatch && buildingMatch;
        });
      }

      if (filterParams.showComplaints && !incident.is_complaint) {
        return false;
      }

      return true;
    });
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  useEffect(() => {
    let count = 0;

    if (filters.startDate) count++;
    if (filters.endDate) count++;
    if (filters.resourceTypeIds.length > 0) count++;
    if (filters.incidentTypeIds.length > 0) count++;
    if (filters.statusIds.length > 0) count++;
    if (filters.city) count++;
    if (filters.street) count++;
    if (filters.building) count++;
    if (filters.showComplaints) count++;
    if (filters.showParameters) count++;

    setActiveFilters(count);
  }, [filters]);

  const handleCityChange = async (cityId: string): Promise<void> => {
    setAddressFilter({
      ...addressFilter,
      city: cityId,
      street: ''
    });

    setAddressSearchValue('');
    setSearchedAddresses([]);

    if (cityId) {
      try {
        const cityIdNum = parseInt(cityId);
        setSelectedCityId(cityIdNum);
        await loadCityAddresses(cityIdNum);
      } catch (error) {
        setNotificationMessage('Ошибка при загрузке адресов для выбранного города');
        setShowNotification(true);
      }
    } else {
      try {
        const defaultCityId = 2;
        setSelectedCityId(defaultCityId);
        await loadCityAddresses(defaultCityId);
      } catch (error) {
        setNotificationMessage('Ошибка при загрузке адресов для города по умолчанию');
        setShowNotification(true);
      }
    }
  };

  const applyFilters = (): void => {
    const filtered = applyFiltersToIncidents(incidents, filters);
    setFilteredIncidents(filtered);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.destroy();
      mapInstanceRef.current = null;
    }

    if (window.ymaps && mapBoundaries) {
      window.ymaps.ready(() => initMap(filtered));
    }
  };

  const clearAllFilters = (): void => {
    setFilters({
      startDate: '',
      endDate: '',
      resourceTypeIds: [],
      incidentTypeIds: [],
      statusIds: [],
      city: '',
      street: '',
      building: '',
      showComplaints: false,
      showParameters: false
    });

    setFilteredIncidents(incidents);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.destroy();
      mapInstanceRef.current = null;
    }

    if (window.ymaps && mapBoundaries) {
      window.ymaps.ready(() => initMap(incidents));
    }
  };

  const highlightHeatSourceBuildings = async (heatSourceId: number): Promise<void> => {
    try {
      clearHighlightedBuildings();

      const heatSource = await getHeatSourceDetails(heatSourceId);

      setSelectedHeatSource(heatSource as unknown as HeatSource);

      if (!heatSource || !mapInstanceRef.current) return;

      let relatedAddresses: Address[] = [];

      if ('address' in heatSource && typeof heatSource.address === 'object') {
        const addressObj = heatSource.address as unknown as Address;
        if (addressObj) {
          relatedAddresses = [addressObj];
        }
      }

      if (relatedAddresses.length === 0 && 'latitude' in heatSource && 'longitude' in heatSource) {
        const fakeAddress: Address = {
          id: 0,
          street_id: 0,
          house_number: "",
          building: null,
          structure: null,
          literature: null,
          street: {
            id: 0,
            name: "",
            shortName: null,
            city_id: 0,
            created_at: "",
            updated_at: "",
            city: {
              id: 0,
              name: "",
              region_id: null,
              created_at: "",
              updated_at: "",
              region: null
            }
          },
          latitude: Number(heatSource.latitude),
          longitude: Number(heatSource.longitude),
          created_at: "",
          updated_at: ""
        };
        relatedAddresses = [fakeAddress];
      }

      setHighlightedAddresses(relatedAddresses);

      const placemarks = relatedAddresses
        .filter(address => address && typeof address.latitude === 'number' && typeof address.longitude === 'number')
        .map(address => {
          const placemark = new window.ymaps.Placemark(
            [address.latitude, address.longitude],
            {
              balloonContent: formatAddressString(address),
              hintContent: 'Дом, относящийся к теплоисточнику',
            },
            {
              preset: 'islands#redDotIcon',
              zIndex: 1000
            }
          );

          mapInstanceRef.current.geoObjects.add(placemark);
          return placemark;
        });

      setHighlightedPlacemarks(placemarks);

      if (relatedAddresses.length > 0 &&
          relatedAddresses[0] &&
          typeof relatedAddresses[0].latitude === 'number' &&
          typeof relatedAddresses[0].longitude === 'number') {
        mapInstanceRef.current.setCenter([relatedAddresses[0].latitude, relatedAddresses[0].longitude], 15);
      }

      const heatSourceName = (() => {
        try {
          if (heatSource && typeof heatSource === 'object') {
            if ('sourceName' in heatSource && typeof heatSource.sourceName === 'string') {
              return heatSource.sourceName || 'Без названия';
            }
            if ('name' in heatSource) {
              const nameValue = heatSource.name as any;
              return typeof nameValue === 'string' ? nameValue : 'Без названия';
            }
          }
          return 'Без названия';
        } catch (e) {
          return 'Без названия';
        }
      })();

      setNotificationMessage(`Выделены ${relatedAddresses.length} дома, относящиеся к теплоисточнику "${heatSourceName}"`);
      setShowNotification(true);

    } catch (error) {
      setNotificationMessage('Не удалось выделить дома, относящиеся к теплоисточнику');
      setShowNotification(true);
    }
  };

  const clearHighlightedBuildings = (): void => {
    if (mapInstanceRef.current && highlightedPlacemarks.length > 0) {
      highlightedPlacemarks.forEach(placemark => {
        if (placemark) {
          mapInstanceRef.current.geoObjects.remove(placemark);
        }
      });
    }

    setHighlightedPlacemarks([]);
    setHighlightedAddresses([]);
    setSelectedHeatSource(null);
  };

  const initMap = (incidentsToShow: Incident[] = filteredIncidents): void => {

    console.log(window.ymaps, mapBoundaries)

    if (!mapRef.current || !window.ymaps) {
      return;
    }

    try {
      const myMap = new window.ymaps.Map(mapRef.current, {
        // center: [mapBoundaries.center_lat, mapBoundaries.center_lng],
        center: [51.660772, 39.200289],
        zoom: 12,
        controls: ['zoomControl', 'typeSelector', 'fullscreenControl']
      });

      //
      myMap.behaviors.enable('scrollZoom');
      mapInstanceRef.current = myMap;

      // Ограничение области карты
      if (mapBoundaries) {
        const bounds = [
          [mapBoundaries.south_west_lat, mapBoundaries.south_west_lng], // Юго-западная граница
          [mapBoundaries.north_east_lat, mapBoundaries.north_east_lng]   // Северо-восточная граница
        ];

        // Устанавливаем границы области просмотра
        myMap.setBounds(bounds, { checkZoomRange: true });

        // Запрещаем выход за пределы заданной области
        myMap.options.set('restrictMapArea', bounds);
      }
      //

      myMap.behaviors.enable('scrollZoom');
      mapInstanceRef.current = myMap;

      myMap.events.add('click', () => {
        clearHighlightedBuildings();
      });

      const resourceColors: { [key: string]: string } = {
        water: 'islands#blueCircleIcon',
        heat: 'islands#redCircleIcon',
        electricity: 'islands#yellowCircleIcon',
        gas: 'islands#greenCircleIcon',
        default: 'islands#grayCircleIcon'
      };

      if (incidentsToShow.length > 0) {
        const clusterer = new window.ymaps.Clusterer({
          preset: 'islands#greenClusterIcons',
          groupByCoordinates: false,
          clusterDisableClickZoom: true,
          clusterHideIconOnBalloonOpen: false,
          geoObjectHideIconOnBalloonOpen: false
        });

        const placemarks: any[] = [];
        const locationMap: {[key: string]: Incident[]} = {};

        incidentsToShow.forEach(incident => {
          if (!incident.addresses || !Array.isArray(incident.addresses) || incident.addresses.length === 0) {
            return;
          }

          incident.addresses.forEach((address: Address) => {
            if (!address.latitude || !address.longitude) {
              return;
            }

            const coords = [address.latitude, address.longitude];
            const coordKey = `${coords[0]},${coords[1]}`;

            if (!locationMap[coordKey]) {
              locationMap[coordKey] = [];
            }
            locationMap[coordKey].push(incident);

            if (!placemarks.some(p => p.geometry.getCoordinates().toString() === coords.toString())) {
              const title = incident.title;
              const resourceTypeSlug = incident.resource_type?.slug || 'default';
              const iconColor = resourceColors[resourceTypeSlug] || resourceColors.default;

              const placemark = new window.ymaps.Placemark(
                coords as [number, number],
                {
                  balloonContent: locationMap[coordKey].length > 1 ?
                    `${locationMap[coordKey].length} инцидентов` : title,
                  hintContent: locationMap[coordKey].length > 1 ?
                    `${locationMap[coordKey].length} инцидентов` : title,
                  hasComplaints: incident.is_complaint,
                  incidentType: incident.type?.name || 'Неизвестно',
                  resourceType: incident.resource_type?.name || 'Неизвестно',
                  coordKey: coordKey,
                  incidentCount: locationMap[coordKey].length,
                  heatSourceId: incident.heat_source?.id
                },
                {
                  preset: iconColor,
                  balloonOffset: [3, -40],
                  hideIconOnBalloonOpen: false
                }
              );

              placemark.events.add('balloonopen', (e: any) => {
                placemark.balloon.close();

                if (locationMap[coordKey].length === 1) {
                  const incident = locationMap[coordKey][0];
                  setSelectedIncident(incident);

                  if (incident.heat_source?.id) {
                    highlightHeatSourceBuildings(incident.heat_source.id);
                  }

                  setShowModal(true);
                } else {
                  setClusterIncidents(locationMap[coordKey].map(inc => ({...inc, isSelected: false})));
                  setShowClusterModal(true);
                }
                e.stopPropagation();
              });

              placemark.events.add('click', (e: any) => {
                if (locationMap[coordKey].length === 1) {
                  const incident = locationMap[coordKey][0];
                  setSelectedIncident(incident);

                  if (incident.heat_source?.id) {
                    highlightHeatSourceBuildings(incident.heat_source.id);
                  }

                  setShowModal(true);
                } else {
                  setClusterIncidents(locationMap[coordKey].map(inc => ({...inc, isSelected: false})));
                  setShowClusterModal(true);
                }
                e.stopPropagation();
              });

              placemarks.push(placemark);
            }
          });
        });

        if (placemarks.length > 0) {
          clusterer.options.set({
            clusterIconContentLayout: window.ymaps.templateLayoutFactory.createClass(
              '<div style="font-size: 13px; line-height: 26px; font-weight: bold; text-align: center; color: #fff;">{{ properties.geoObjects.length }}</div>'
            ),
            hasBalloon: false,
            hasHint: false
          });

          clusterer.events.add('click', function(e: any) {
            const cluster = e.get('target');

            const handleClusterInteraction = (): void => {
              const geoObjects = cluster.getGeoObjects();

              if (geoObjects.length === 1 && geoObjects[0].properties.get('incidentCount') > 1) {
                const coordKey = geoObjects[0].properties.get('coordKey');
                if (coordKey && locationMap[coordKey]) {
                  setClusterIncidents(locationMap[coordKey].map(inc => ({...inc, isSelected: false})));
                  setShowClusterModal(true);
                  if (cluster.balloon.isOpen()) {
                    cluster.balloon.close();
                  }
                  return;
                }
              }

              const allIncidents: Incident[] = [];
              geoObjects.forEach((obj: any) => {
                const coordKey = obj.properties.get('coordKey');
                if (coordKey && locationMap[coordKey]) {
                  locationMap[coordKey].forEach(incident => {
                    if (!allIncidents.some(inc => inc.id === incident.id)) {
                      allIncidents.push(incident);
                    }
                  });
                }
              });

              if (allIncidents.length > 0) {
                setClusterIncidents(allIncidents.map(inc => ({...inc, isSelected: false})));
                setShowClusterModal(true);
                if (cluster.balloon.isOpen()) {
                  cluster.balloon.close();
                }
              }
            };

            handleClusterInteraction();
            e.stopPropagation();

            cluster.events.add('balloonopen', function(e: any) {
              handleClusterInteraction();
              cluster.balloon.close();
              e.stopPropagation();
            });
          });

          clusterer.events.add('objectsaddtomap', function(e: any) {
            const clusters = e.get('child').filter((obj: any) => obj.options.getName() === 'cluster');

            clusters.forEach((cluster: any) => {
              const geoObjects = cluster.properties.get('geoObjects');

              const hasComplaints = geoObjects.some((obj: any) => obj.properties.get('hasComplaints'));

              const zoom = myMap.getZoom();

              if (hasComplaints) {
                if (zoom > 14) {
                  cluster.options.set('preset', 'islands#redClusterIcons');
                } else {
                  cluster.options.set('preset', 'islands#orangeClusterIcons');
                }
              } else {
                cluster.options.set('preset', 'islands#greenClusterIcons');
              }
            });
          });

          clusterer.add(placemarks);
          myMap.geoObjects.add(clusterer);

          if (incidentsToShow.length > 0 && incidentsToShow[0].addresses && incidentsToShow[0].addresses.length > 0) {
            const firstAddress = incidentsToShow[0].addresses[0];
            if (firstAddress.latitude && firstAddress.longitude) {
              myMap.setCenter([firstAddress.latitude, firstAddress.longitude], 12);
            }
          }

          myMap.events.add('boundschange', function() {
            const zoom = myMap.getZoom();

            const clusters = clusterer.getClusters();

            clusters.forEach((cluster: any) => {
              const geoObjects = cluster.properties.get('geoObjects');
              const hasComplaints = geoObjects.some((obj: any) => obj.properties.get('hasComplaints'));

              if (hasComplaints) {
                if (zoom > 14) {
                  cluster.options.set('preset', 'islands#redClusterIcons');
                } else {
                  cluster.options.set('preset', 'islands#orangeClusterIcons');
                }
              }
            });
          });
        }
      }
    } catch (error) {
      setError('Ошибка при инициализации карты. Пожалуйста, обновите страницу.');
    }
  };

  // TODO ВЫНЕСТИ В ОТДЕЛЬНЫЙ КОМПОНЕНТ! А ТАК ЖЕ УСТАНОВИТЬ БИБЛИОТЕКУ!
  useEffect(() => {
    const loadYandexMapsApi = (): void => {
      if (window.ymaps && mapBoundaries) {
        window.ymaps.ready(() => initMap());
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://api-maps.yandex.ru/2.1/?apikey=9b9469e9-98d9-4c6d-9b5d-4272b266a69e&lang=ru_RU';
      script.type = 'text/javascript';
      script.async = true;

      script.onload = () => {
        if (window.ymaps && mapBoundaries) {
          window.ymaps.ready(() => {
            initMap();
          });
        } else {
          setError('window.ymaps не определен после загрузки скрипта');
        }
      };

      script.onerror = () => {
        setError('Не удалось загрузить API Яндекс.Карт');
      };

      document.head.appendChild(script);
    };

    if (!loading) {
      loadYandexMapsApi();
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, [loading]);

  const handleSelectClusterIncident = (incidentId: number): void => {
    const incident = incidents.find(inc => inc.id === incidentId);
    if (incident) {
      setSelectedIncident(incident);

      if (incident.heat_source?.id) {
        highlightHeatSourceBuildings(incident.heat_source.id);
      }

      setShowClusterModal(false);
      setShowModal(true);
    }
  };

  const handleCloseModal = (): void => {
    setShowModal(false);
    setSelectedIncident(null);
  };

  const handleCloseClusterModal = (): void => {
    setShowClusterModal(false);
    setClusterIncidents([]);
  };

  const handleCloseIncidentForm = (): void => {
    setShowIncidentForm(false);
    setNewIncident({
      title: '',
      description: '',
      incident_type_id: 0,
      incident_resource_type_id: 0,
      address_ids: [],
      is_complaint: false
    });
    setSelectedAddresses([]);
    setAddressSearchValue('');
    setShowAddressFilter(false);
    setAddressFilter({
      city: '',
      street: ''
    });
    setSearchedAddresses([]);
    setCityAddresses([]);
    setSelectedCityId(2);
  };

  const formatAddressString = (address: Address): string => {
    if (!address) return 'Адрес не указан';

    let result = '';

    if (address.street?.city?.name) {
      result += `г. ${address.street.city.name}, `;
    }

    if (address.street?.name) {
      const streetName = address.street.name;
      const hasPrefix = /^(ул\.|пр-т|пр\.|б-р|наб\.|пер\.|пл\.|ш\.)/.test(streetName);

      if (hasPrefix) {
        result += `${streetName}, `;
      } else {
        result += `ул. ${streetName}, `;
      }
    }

    result += `д. ${address.house_number || ''}`;

    if (address.building) {
      result += ` корп. ${address.building}`;
    }

    if (address.structure) {
      result += ` стр. ${address.structure}`;
    }

    if (address.literature) {
      result += ` лит. ${address.literature}`;
    }

    return result;
  };

  const resetAddressFilters = async (): Promise<void> => {
    setAddressFilter({
      city: '',
      street: ''
    });

    try {
      setAddressSearchValue('');
      if (selectedCityId) {
        await loadCityAddresses(selectedCityId);
      } else {
        const defaultCityId = 2;
        setSelectedCityId(defaultCityId);
        await loadCityAddresses(defaultCityId);
      }
    } catch (error) {
      setNotificationMessage('Ошибка при сбросе фильтров адресов');
      setShowNotification(true);
    }
  };

  const handleSelectAddress = (address: Address): void => {
    if (!address || !address.id || address.id <= 0) {
      setNotificationMessage('Ошибка: адрес имеет некорректный ID');
      setShowNotification(true);
      return;
    }

    if (newIncident.address_ids.includes(address.id)) {
      setNotificationMessage('Этот адрес уже добавлен');
      setShowNotification(true);
      return;
    }

    setNewIncident(prev => ({
      ...prev,
      address_ids: [...prev.address_ids, address.id]
    }));

    setSelectedAddresses(prev => [...prev, address]);

    setNotificationMessage(`Адрес "${formatAddressString(address)}" добавлен`);
    setShowNotification(true);
  };

  const handleRemoveAddress = (addressId: number): void => {
    setNewIncident({
      ...newIncident,
      address_ids: newIncident.address_ids.filter(id => id !== addressId)
    });

    setSelectedAddresses(prev => prev.filter(addr => addr.id !== addressId));

    setNotificationMessage('Адрес удален из списка');
    setShowNotification(true);
  };

  const handleSaveNewIncident = async (): Promise<void> => {
    try {
      if (!newIncident.title.trim()) {
        setNotificationMessage('Пожалуйста, введите заголовок инцидента');
        setShowNotification(true);
        return;
      }

      if (!newIncident.description.trim()) {
        setNotificationMessage('Пожалуйста, введите описание инцидента');
        setShowNotification(true);
        return;
      }

      if (newIncident.incident_type_id === 0) {
        setNotificationMessage('Пожалуйста, выберите тип инцидента');
        setShowNotification(true);
        return;
      }

      if (newIncident.incident_resource_type_id === 0) {
        setNotificationMessage('Пожалуйста, выберите тип ресурса');
        setShowNotification(true);
        return;
      }

      if (newIncident.address_ids.length === 0) {
        setNotificationMessage('Пожалуйста, выберите хотя бы один адрес');
        setShowNotification(true);
        return;
      }

      const validAddressIds = newIncident.address_ids.filter(id => Number.isInteger(id) && id > 0);

      if (validAddressIds.length === 0) {
        setNotificationMessage('Выбраны некорректные адреса. Пожалуйста, выберите адреса из списка результатов поиска');
        setShowNotification(true);
        return;
      }

      const incidentData = {
        ...newIncident,
        address_ids: validAddressIds
      };

      try {
        const response = await createIncident(incidentData);

        if (response) {
          setNotificationMessage('Инцидент успешно создан');
          setShowNotification(true);

          handleCloseIncidentForm();

          await fetchIncidents(filters);
          if (window.ymaps && mapInstanceRef.current) {
            mapInstanceRef.current.destroy();
            mapInstanceRef.current = null;
            window.ymaps.ready(() => initMap(filteredIncidents));
          }
        }
      } catch (apiError) {
        setNotificationMessage(`Ошибка при создании инцидента: ${apiError instanceof Error ? apiError.message : 'Неизвестная ошибка'}`);
        setShowNotification(true);
      }
    } catch (err) {
      setNotificationMessage('Произошла ошибка при сохранении инцидента');
      setShowNotification(true);
    }
  };

  const getStatusColor = (status?: IncidentStatus): string => {
    if (!status) return 'text-secondary';

    switch (status.slug) {
      case 'new':
        return 'text-primary';
      case 'in_progress':
        return 'text-warning';
      case 'resolved':
        return 'text-success';
      case 'closed':
        return 'text-success';
      case 'cancelled':
        return 'text-secondary';
      default:
        return 'text-secondary';
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU');
  };

  // Removed unused changeViewLevel function

  const toggleFilter = (): void => {
    setIsFilterExpanded(!isFilterExpanded);
  };

  const handleAddressSearch = (value: string): void => {
    setAddressSearchValue(value);

    if (addressSearchTimeout) {
      clearTimeout(addressSearchTimeout);
    }

    if (value.trim() === '') {
      const uniqueAddresses = cityAddresses.reduce((acc: Address[], curr) => {
        if (!acc.some(addr => addr.id === curr.id)) {
          acc.push(curr);
        }
        return acc;
      }, []);
      setSearchedAddresses(uniqueAddresses.slice(0, 20));
      return;
    }

    const timeout = setTimeout(() => {
      if (selectedCityId) {
        const cacheKey = `${selectedCityId}-${value}`;
        if (addressCache[cacheKey]) {
          const uniqueAddresses = addressCache[cacheKey].reduce((acc: Address[], curr) => {
            if (!acc.some(addr => addr.id === curr.id)) {
              acc.push(curr);
            }
            return acc;
          }, []);
          setSearchedAddresses(uniqueAddresses);
          return;
        }

        setIsSearchingAddress(true);
        searchAddresses(selectedCityId, value)
          .then(response => {
            let addresses: Address[] = [];

            if (Array.isArray(response)) {
              addresses = response;
            } else if (response && typeof response === 'object' && 'data' in response && Array.isArray((response as any).data)) {
              addresses = (response as any).data;
            }

            const uniqueAddresses = addresses.reduce((acc: Address[], curr) => {
              if (!acc.some(addr => addr.id === curr.id)) {
                acc.push(curr);
              }
              return acc;
            }, []);

            setAddressCache(prev => ({...prev, [cacheKey]: uniqueAddresses}));
            setSearchedAddresses(uniqueAddresses);
          })
          .catch(err => {
            console.error("Ошибка поиска:", err);
            setNotificationMessage("Ошибка при поиске адресов");
            setShowNotification(true);
          })
          .finally(() => {
            setIsSearchingAddress(false);
          });
      }
    }, 500);

    setAddressSearchTimeout(timeout);
  };

  return (
    <React.Fragment>
      <div className="page-header">
        <div className="page-block">
          <div className="row align-items-center">
            <div className="col-md-6">
              <div className="page-header-title">
                <h5 className="m-b-10">Карта инцидентов и аварий</h5>
              </div>
              <ul className="breadcrumb">
                <li className="breadcrumb-item">
                  <Link to="/dashboard">Главная</Link>
                </li>
                <li className="breadcrumb-item">Карты</li>
                <li className="breadcrumb-item">Аварии и отключения</li>
                <li className="breadcrumb-item">Карта инцидентов</li>
              </ul>
            </div>
            <div className="col-md-6 text-end">
              <Button
                variant="primary"
                onClick={() => setShowIncidentForm(true)}
              >
                Новый ИНЦИДЕНТ
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Card className="mb-3">
        <Card.Header
          onClick={toggleFilter}
          className="cursor-pointer d-flex justify-content-between align-items-center"
        >
          <h5 className="mb-0">
            Фильтр
            {activeFilters > 0 && (
              <span className="ms-2 badge bg-primary">{activeFilters}</span>
            )}
          </h5>
          <span>{isFilterExpanded ? '▲' : '▼'}</span>
        </Card.Header>
        {isFilterExpanded && (
          <Card.Body>
            <Form>
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Город</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Введите город"
                      value={filters.city}
                      onChange={(e) => setFilters({...filters, city: e.target.value})}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Улица</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Введите улицу"
                      value={filters.street}
                      onChange={(e) => setFilters({...filters, street: e.target.value})}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Дом</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Введите номер дома"
                      value={filters.building}
                      onChange={(e) => setFilters({...filters, building: e.target.value})}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Период с</Form.Label>
                    <Form.Control
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>по</Form.Label>
                    <Form.Control
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Тип инцидента</Form.Label>
                    <Form.Select
                      multiple
                      className="form-select"
                      value={filters.incidentTypeIds.map(id => id.toString())}
                      onChange={(e) => {
                        const selectedValues = Array.from(
                          e.target.selectedOptions,
                          option => Number(option.value)
                        );
                        setFilters({...filters, incidentTypeIds: selectedValues});
                      }}
                      style={{ height: '120px' }}
                    >
                      {incidentTypes.map(type => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </Form.Select>
                    <small className="form-text text-muted">Используйте Ctrl для выбора нескольких</small>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Тип ресурса</Form.Label>
                    <Form.Select
                      multiple
                      className="form-select"
                      value={filters.resourceTypeIds.map(id => id.toString())}
                      onChange={(e) => {
                        const selectedValues = Array.from(
                          e.target.selectedOptions,
                          option => Number(option.value)
                        );
                        setFilters({...filters, resourceTypeIds: selectedValues});
                      }}
                      style={{ height: '120px' }}
                    >
                      {resourceTypes.map(type => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </Form.Select>
                    <small className="form-text text-muted">Используйте Ctrl для выбора нескольких</small>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Статус</Form.Label>
                    <Form.Select
                      multiple
                      className="form-select"
                      value={filters.statusIds.map(id => id.toString())}
                      onChange={(e) => {
                        const selectedValues = Array.from(
                          e.target.selectedOptions,
                          option => Number(option.value)
                        );
                        setFilters({...filters, statusIds: selectedValues});
                      }}
                      style={{ height: '120px' }}
                    >
                      {statuses.map(status => (
                        <option key={status.id} value={status.id}>
                          {status.name}
                        </option>
                      ))}
                    </Form.Select>
                    <small className="form-text text-muted">Используйте Ctrl для выбора нескольких</small>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <div className="d-flex">
                      <Form.Check
                        id="show-parameters"
                        type="checkbox"
                        label="Параметры"
                        className="me-4"
                        checked={filters.showParameters}
                        onChange={(e) => setFilters({...filters, showParameters: e.target.checked})}
                      />
                      <Form.Check
                        id="show-complaints"
                        type="checkbox"
                        label="Жалобы"
                        checked={filters.showComplaints}
                        onChange={(e) => setFilters({...filters, showComplaints: e.target.checked})}
                      />
                    </div>
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
              ) : (
                <div className="map-container">
                  <div id="map" ref={mapRef} className="map" style={{ width: '100%', height: '600px' }}></div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{selectedIncident?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedIncident && (
            <>
              <p><strong>Описание:</strong> {selectedIncident.description}</p>

              <div className="row mb-3">
                <div className="col-md-4">
                  <div className="d-flex align-items-center mb-2">
                    <span className="badge bg-primary me-2">Тип инцидента</span>
                    <span>{selectedIncident.type?.name || 'Не указан'}</span>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="d-flex align-items-center mb-2">
                    <span className="badge bg-info me-2">Тип ресурса</span>
                    <span>{selectedIncident.resource_type?.name || 'Не указан'}</span>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="d-flex align-items-center mb-2">
                    <span className="badge bg-secondary me-2">Статус</span>
                    <span className={getStatusColor(selectedIncident.status)}>
                      {selectedIncident.status?.name || 'Не указан'}
                    </span>
                  </div>
                </div>
              </div>

              {selectedIncident.heat_source && (
                <div className="mb-3">
                  <strong>Теплоисточник:</strong>{' '}
                  <span
                    className="text-primary cursor-pointer"
                    onClick={() => selectedIncident.heat_source?.id &&
                      highlightHeatSourceBuildings(selectedIncident.heat_source.id)}
                  >
                    {(() => {
                      const hs = selectedIncident.heat_source || {};
                      if (hs && 'sourceName' in hs && typeof hs.sourceName === 'string') return hs.sourceName || 'Без названия';
                      if (hs && 'name' in hs) {
                        const nameValue = hs.name as any;
                        return (typeof nameValue === 'string' ? nameValue : 'Без названия');
                      }
                      return 'Без названия';
                    })()}
                    <i className="fas fa-map-marker-alt ms-1"></i>
                  </span>
                  {selectedIncident.heat_source.power && (
                    <span className="ms-2 text-muted">
                      (Мощность: {selectedIncident.heat_source.power})
                    </span>
                  )}
                </div>
              )}

              <div className="mb-3">
                <strong>Адреса:</strong>
                <ul className="list-group mt-2">
                  {selectedIncident.addresses.map((address: Address, index) => (
                    <li key={`incident-addr-${address.id}-${index}`} className="list-group-item">
                      {formatAddressString(address)}
                    </li>
                  ))}
                </ul>
              </div>

              {selectedHeatSource && highlightedAddresses.length > 0 && (
                <div className="mb-3">
                  <strong>Дома, относящиеся к теплоисточнику "{(() => {
                    try {
                      if (selectedHeatSource && typeof selectedHeatSource === 'object') {
                        if ('sourceName' in selectedHeatSource && typeof selectedHeatSource.sourceName === 'string') {
                          return selectedHeatSource.sourceName || 'Без названия';
                        }
                        if ('name' in selectedHeatSource) {
                          const nameValue = selectedHeatSource.name as any;
                          return typeof nameValue === 'string' ? nameValue : 'Без названия';
                        }
                      }
                      return 'Без названия';
                    } catch (e) {
                      return 'Без названия';
                    }
                  })()}":</strong>
                  <ul className="list-group mt-2 addresses-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {highlightedAddresses.map((address: Address, index) => (
                      <li key={`highlighted-${address.id}-${index}`} className="list-group-item list-group-item-danger">
                        {formatAddressString(address)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="row mt-3">
                <div className="col-md-6">
                  <small className="text-muted">
                    Создан: {formatDate(selectedIncident.created_at)}
                  </small>
                </div>
                <div className="col-md-6">
                  <small className="text-muted">
                    Обновлен: {formatDate(selectedIncident.updated_at)}
                  </small>
                </div>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          {selectedIncident?.heat_source?.id && (
            <Button
              variant="info"
              onClick={() => highlightHeatSourceBuildings(selectedIncident.heat_source!.id)}
              className="me-auto"
            >
              Показать связанные дома
            </Button>
          )}
          <Button variant="secondary" onClick={handleCloseModal}>
            Закрыть
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showClusterModal} onHide={handleCloseClusterModal} size="lg" backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Инциденты в данной точке ({clusterIncidents.length})</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {clusterIncidents.length > 0 ? (
            <div className="cluster-incidents-list">
              {clusterIncidents.map(incident => (
                <div
                  key={incident.id}
                  className="cluster-incident-item p-3 mb-2 border rounded"
                  onClick={() => handleSelectClusterIncident(incident.id)}
                >
                  <h5>{incident.title}</h5>
                  <div className="d-flex flex-wrap gap-2 mb-2">
                    <div className="badge bg-primary me-1">
                      {incident.type?.name || 'Тип не указан'}
                    </div>
                    <div className="badge bg-info me-1">
                      {incident.resource_type?.name || 'Ресурс не указан'}
                    </div>
                    <div className={`badge ${incident.is_complaint ? 'bg-warning' : 'bg-secondary'}`}>
                      {incident.is_complaint ? 'Жалоба' : 'Не жалоба'}
                    </div>
                    <div className={`badge ${getStatusColor(incident.status).replace('text-', 'bg-')}`}>
                      {incident.status?.name || 'Статус не указан'}
                    </div>
                  </div>
                  {incident.heat_source && (
                    <div className="mb-2">
                      <small className="text-primary">
                        Теплоисточник: {incident.heat_source.name || incident.heat_source.sourceName || 'Без названия'}
                      </small>
                    </div>
                  )}
                  <p className="mb-1 text-truncate">
                    {incident.description.length > 100
                      ? `${incident.description.slice(0, 100)}...`
                      : incident.description}
                  </p>
                  <div className="d-flex justify-content-between">
                    <small className="text-muted">
                      Создан: {formatDate(incident.created_at)}
                    </small>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectClusterIncident(incident.id);
                      }}
                    >
                      Подробнее
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>Нет инцидентов для отображения</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseClusterModal}>
            Закрыть
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showIncidentForm} onHide={handleCloseIncidentForm} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Новый инцидент</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Заголовок*</Form.Label>
              <Form.Control
                type="text"
                placeholder="Введите заголовок инцидента"
                value={newIncident.title}
                onChange={(e) => setNewIncident({...newIncident, title: e.target.value})}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Описание*</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Введите описание инцидента"
                value={newIncident.description}
                onChange={(e) => setNewIncident({...newIncident, description: e.target.value})}
                required
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Тип инцидента*</Form.Label>
                  <Form.Select
                    value={newIncident.incident_type_id || ''}
                    onChange={(e) => setNewIncident({
                      ...newIncident,
                      incident_type_id: Number(e.target.value) || 0
                    })}
                    required
                  >
                    <option value="">Выберите тип инцидента</option>
                    {incidentTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Тип ресурса*</Form.Label>
                  <Form.Select
                    value={newIncident.incident_resource_type_id || ''}
                    onChange={(e) => setNewIncident({
                      ...newIncident,
                      incident_resource_type_id: Number(e.target.value) || 0
                    })}
                    required
                  >
                    <option value="">Выберите тип ресурса</option>
                    {resourceTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Адреса*</Form.Label>
              <div className="address-search-container">
                <div className="city-selection mb-3">
                  <Form.Label className="fw-bold">Выберите город*</Form.Label>
                  <Form.Select
                    value={selectedCityId?.toString() || ""}
                    onChange={(e) => handleCityChange(e.target.value)}
                    className="mb-2"
                    required
                  >
                    <option value="">Выберите город</option>
                    {Array.isArray(cities) && cities.length > 0 ? (
                      cities.map(city => (
                        <option key={city.id} value={city.id.toString()}>
                          {city.name}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>Загрузка городов...</option>
                    )}
                  </Form.Select>
                </div>

                {selectedCityId && (
                  <>
                    <div className="mb-2">
                      <div className="d-flex">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Поиск по адресам..."
                          value={addressSearchValue}
                          onChange={(e) => handleAddressSearch(e.target.value)}
                        />
                        <button
                          className="btn btn-outline-secondary"
                          type="button"
                          onClick={() => setShowAddressFilter(!showAddressFilter)}
                        >
                          <i className="fa fa-filter"></i>
                        </button>
                      </div>
                    </div>

                    {showAddressFilter && (
                      <div className="address-filters mb-2">
                        <Row>
                          <Col md={4}>
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              className="w-100"
                              onClick={resetAddressFilters}
                            >
                              Сбросить фильтры
                            </Button>
                          </Col>
                        </Row>
                      </div>
                    )}

                    {isSearchingAddress && (
                      <div className="text-center my-2">
                        <Spinner animation="border" size="sm" role="status">
                          <span className="visually-hidden">Поиск...</span>
                        </Spinner>
                        <span className="ms-2">Поиск адресов...</span>
                      </div>
                    )}

                    {searchedAddresses.length > 0 && (
                      <div className="searched-addresses-container mb-3">
                        <div className="searched-addresses-header">
                          <strong>Адреса:</strong>
                          {cityAddresses.length > searchedAddresses.length && addressSearchValue === '' && (
                            <small className="ms-2 text-muted">показаны первые {searchedAddresses.length} из {cityAddresses.length}</small>
                          )}
                        </div>
                        <div className="searched-addresses-list">
                          {searchedAddresses.map((address, index) => (
                            <div
                              key={`search-${address.id}-${index}`}
                              className="searched-address-item"
                            >
                              <div
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleSelectAddress(address);
                                  return false;
                                }}
                                style={{ cursor: 'pointer', width: '100%' }}
                              >
                                <i className="fa fa-map-marker-alt me-2"></i>
                                {formatAddressString(address)}
                              </div>
                            </div>
                          ))}
                          {addressSearchValue === '' && cityAddresses.length > 20 && searchedAddresses.length < cityAddresses.length && (
                            <div className="searched-addresses-more">
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() => setSearchedAddresses(cityAddresses.slice(0, searchedAddresses.length + 20))}
                              >
                                Показать больше адресов
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {searchedAddresses.length === 0 && !isSearchingAddress && (
                      <div className="no-addresses-found alert alert-info">
                        {addressSearchValue ?
                          'По вашему запросу не найдено ни одного адреса. Попробуйте изменить запрос.' :
                          'Не найдено адресов для выбранного города.'
                        }
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="selected-addresses mt-3">
                {selectedAddresses.length > 0 ? (
                  <div className="selected-addresses-list">
                    <div className="selected-addresses-header mb-2">
                      <strong>Выбранные адреса:</strong> <span className="text-muted">(Кол-во: {selectedAddresses.length})</span>
                    </div>
                    {selectedAddresses.map((address, index) => (
                      <div key={`selected-addr-${address.id}-${index}`} className="selected-address-item">
                        <span>
                          {formatAddressString(address)}
                          <small className="text-secondary ms-1">(ID: {address.id})</small>
                        </span>
                        <Button
                          variant="link"
                          size="sm"
                          className="text-danger"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveAddress(address.id);
                          }}
                        >
                          <i className="fa fa-times"></i> Удалить
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-addresses-selected">
                    <div className="alert alert-warning">
                      <i className="fa fa-exclamation-triangle me-2"></i>
                      Не выбрано ни одного адреса. Пожалуйста, выберите хотя бы один адрес.
                    </div>
                  </div>
                )}
              </div>
              <Form.Text className="text-muted mt-2">
                Сначала выберите город, затем выберите адрес из списка. Минимум один адрес обязателен.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Жалоба"
                checked={newIncident.is_complaint}
                onChange={(e) => setNewIncident({...newIncident, is_complaint: e.target.checked})}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseIncidentForm}>
            Отмена
          </Button>
          <Button variant="primary" onClick={handleSaveNewIncident}>
            Сохранить
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
          bg={notificationMessage.includes('успешно') ? 'success' : notificationMessage.toLowerCase().includes('ошибка') ? 'danger' : 'info'}
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

        .cursor-pointer {
          cursor: pointer;
        }

        .cluster-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-weight: bold;
          color: white;
        }

        .address-search-container {
          position: relative;
        }

        .searched-addresses-container {
          max-height: 250px;
          overflow-y: auto;
          border: 1px solid #ddd;
          border-radius: 4px;
          margin-top: 8px;
        }

        .searched-addresses-list {
          max-height: 250px;
        }

        .searched-addresses-header {
          padding: 8px 12px;
          background-color: #f8f9fa;
          border-bottom: 1px solid #eee;
          font-weight: 500;
          display: flex;
          align-items: center;
        }

        .searched-address-item {
          padding: 8px 12px;
          cursor: pointer;
          border-bottom: 1px solid #eee;
        }

        .searched-address-item:hover {
          background-color: #f8f9fa;
        }

        .searched-addresses-more {
          padding: 8px 12px;
          text-align: center;
        }

        .no-addresses-found {
          padding: 12px;
          text-align: center;
          color: #6c757d;
        }

        .selected-addresses-list {
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 10px;
          background-color: #f8f9fa;
          max-height: 200px;
          overflow-y: auto;
        }

        .selected-address-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          border-bottom: 1px solid #eee;
        }

        .selected-address-item:last-child {
          border-bottom: none;
        }

        .address-filters {
          padding: 10px;
          background-color: #f8f9fa;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .cluster-incidents-list {
          max-height: 500px;
          overflow-y: auto;
        }

        .cluster-incident-item {
          cursor: pointer;
          transition: all 0.2s ease;
          background-color: #fff;
        }

        .cluster-incident-item:hover {
          background-color: #f8f9fa;
          transform: translateY(-2px);
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        .addresses-list {
          max-height: 200px;
          overflow-y: auto;
        }

        .city-selection {
          background-color: #f8f9fa;
          padding: 10px;
          border-radius: 4px;
          border: 1px solid #e9ecef;
        }
      `}</style>
    </React.Fragment>
  );
};

export default IncidentsMap;
