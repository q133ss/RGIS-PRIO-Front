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

interface ClusteredHeatSource extends HeatSupplyMapItem {
  isSelected?: boolean;
}

interface FilterState {
  name: string;
  hs_type_id: number | null;
  owner_id: number | null;
  org_id: number | null;
  hs_period_id: number | null;
  oks_id: number | null;
}

const HeatSupplyMap: React.FC = () => {
  const [mapData, setMapData] = useState<HeatSupplyMapItem[]>([]);
  const [filteredMapData, setFilteredMapData] = useState<HeatSupplyMapItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<HeatSupplyMapItem | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  const [showNotification, setShowNotification] = useState<boolean>(false);
  const [notificationMessage, setNotificationMessage] = useState<string>('');
  
  const [hsTypes, setHsTypes] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  

  
  const [highlightedAddresses, setHighlightedAddresses] = useState<any[]>([]);
  const [highlightedPlacemarks, setHighlightedPlacemarks] = useState<any[]>([]);
  const [showClusterModal, setShowClusterModal] = useState<boolean>(false);
  const [clusterHeatSources, setClusterHeatSources] = useState<ClusteredHeatSource[]>([]);
  const [searchValue, setSearchValue] = useState<string>('');
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  
  const [viewLevel, setViewLevel] = useState<'region' | 'city' | 'district'>('city');
  
  const [filters, setFilters] = useState<FilterState>({
    name: '',
    hs_type_id: null,
    owner_id: null,
    org_id: null,
    hs_period_id: null,
    oks_id: null
  });
  const [activeFilters, setActiveFilters] = useState<number>(0);

  const fetchHeatSupplyData = async (filterParams?: HeatMapParams): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      await initializeApi();
      
      let heatSupplyData: HeatSupplyMapItem[] = [];
      
      if (filterParams) {
        const cleanParams: HeatMapParams = {};
        if (filterParams.name) cleanParams.name = filterParams.name;
        if (filterParams.hs_type_id) cleanParams.hs_type_id = filterParams.hs_type_id;
        if (filterParams.owner_id) cleanParams.owner_id = filterParams.owner_id;
        if (filterParams.org_id) cleanParams.org_id = filterParams.org_id;
        if (filterParams.hs_period_id) cleanParams.hs_period_id = filterParams.hs_period_id;
        if (filterParams.oks_id) cleanParams.oks_id = filterParams.oks_id;
        
        heatSupplyData = await getHeatSupplyMapData(cleanParams);
      } else {
        heatSupplyData = await getHeatSupplyMapData();
      }
      
      // Process data to remove address IDs
      heatSupplyData.forEach(item => {
        // Remove any properties with 'address' in the name (except 'addresses' array)
        if (item.parameters) {
          Object.keys(item.parameters).forEach(key => {
            if (key.includes('address') && key !== 'addresses') {
              (item.parameters as any)[key] = undefined;
            }
          });
        }
        
        // Remove address_ids if present
        if ('address_ids' in item) {
          (item as any)['address_ids'] = undefined;
        }
      });
      
      setMapData(heatSupplyData);
      setFilteredMapData(heatSupplyData);
      
      try {
        const hsTypesResult = await getHeatSourceTypes();
        setHsTypes(hsTypesResult || []);
      } catch (err) {
        console.error('Ошибка при загрузке типов теплоисточников:', err);
      }
      
      try {
        const organizationsResult = await getOrganizations();
        setOrganizations(organizationsResult || []);
      } catch (err) {
        console.error('Ошибка при загрузке организаций:', err);
      }
      
      try {
        const periodsResult = await getHeatSourcePeriods();
        setPeriods(periodsResult || []);
      } catch (err) {
        console.error('Ошибка при загрузке периодов:', err);
      }
    } catch (err) {
      console.error('Ошибка при загрузке данных карты теплоснабжения:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeatSupplyData();
  }, []);
  
  useEffect(() => {
    let count = 0;
    
    if (filters.name) count++;
    if (filters.hs_type_id) count++;
    if (filters.owner_id) count++;
    if (filters.org_id) count++;
    if (filters.hs_period_id) count++;
    if (filters.oks_id) count++;
    
    setActiveFilters(count);
  }, [filters]);
  
  const applyFilters = async (): Promise<void> => {
    try {
      setLoading(true);
      
      const cleanParams: HeatMapParams = {};
      if (filters.name) cleanParams.name = filters.name;
      if (filters.hs_type_id) cleanParams.hs_type_id = filters.hs_type_id;
      if (filters.owner_id) cleanParams.owner_id = filters.owner_id;
      if (filters.org_id) cleanParams.org_id = filters.org_id;
      if (filters.hs_period_id) cleanParams.hs_period_id = filters.hs_period_id;
      if (filters.oks_id) cleanParams.oks_id = filters.oks_id;
      
      const filteredData = await getHeatSupplyMapData(cleanParams);
      setFilteredMapData(filteredData);
      
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
      
      if (window.ymaps) {
        window.ymaps.ready(() => initMap(filteredData));
      }
      
      setNotificationMessage(`Найдено ${filteredData.length} теплоисточников`);
      setShowNotification(true);
    } catch (error) {
      console.error('Ошибка при применении фильтров:', error);
      setNotificationMessage('Ошибка при применении фильтров');
      setShowNotification(true);
    } finally {
      setLoading(false);
    }
  };
  
  const clearAllFilters = (): void => {
    setFilters({
      name: '',
      hs_type_id: null,
      owner_id: null,
      org_id: null,
      hs_period_id: null,
      oks_id: null
    });
    
    fetchHeatSupplyData().then(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
      
      if (window.ymaps) {
        window.ymaps.ready(() => initMap());
      }
      
      setNotificationMessage('Фильтры сброшены');
      setShowNotification(true);
    });
  };

  const highlightConnectedBuildings = async (heatSourceId: number): Promise<void> => {
    try {
      clearHighlightedBuildings();
      
      const heatSource = await getHeatSourceDetails(heatSourceId) as unknown as HeatSource;
      
      if (!heatSource || !mapInstanceRef.current) return;
      
      // Clean up any address ID fields from the heat source
      if (heatSource.parameters) {
        Object.keys(heatSource.parameters).forEach(key => {
          if (key.includes('address') && key !== 'addresses') {
            (heatSource.parameters as any)[key] = undefined;
          }
        });
      }
      
      if ('address_ids' in heatSource) {
        (heatSource as any)['address_ids'] = undefined;
      }
      
      let connectedAddresses: any[] = [];
      
      if (heatSource && heatSource.parameters && 
          heatSource.parameters.addresses && 
          Array.isArray(heatSource.parameters.addresses)) {
        connectedAddresses = heatSource.parameters.addresses.filter(
          (address: any) => address && address.latitude && address.longitude
        );
      }
      
      setHighlightedAddresses(connectedAddresses);
      
      const placemarks = connectedAddresses.map(address => {
        const placemark = new window.ymaps.Placemark(
          [address.latitude, address.longitude],
          {
            balloonContent: formatAddressString(address),
            hintContent: 'Дом, подключенный к теплоисточнику',
          },
          {
            preset: 'islands#greenDotIcon',
            zIndex: 1000
          }
        );
        
        mapInstanceRef.current.geoObjects.add(placemark);
        return placemark;
      });
      
      setHighlightedPlacemarks(placemarks);
      
      if (connectedAddresses.length > 0) {
        const firstAddress = connectedAddresses[0];
        mapInstanceRef.current.setCenter([firstAddress.latitude, firstAddress.longitude], 15);
      }
      
      setNotificationMessage(`Выделено ${connectedAddresses.length} домов, подключенных к теплоисточнику "${heatSource.name || ''}"`)
      setShowNotification(true);
      
    } catch (error) {
      console.error('Ошибка при выделении подключенных домов:', error);
      setNotificationMessage('Не удалось выделить подключенные дома');
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
  };

  const initMap = (dataToShow: HeatSupplyMapItem[] = filteredMapData): void => {
    if (!mapRef.current || !window.ymaps || dataToShow.length === 0) {
      return;
    }
    
    try {
      const myMap = new window.ymaps.Map(mapRef.current, {
        center: [51.660772, 39.200289],
        zoom: 12,
        controls: ['zoomControl', 'typeSelector', 'fullscreenControl']
      });
      
      myMap.behaviors.enable('scrollZoom');
      mapInstanceRef.current = myMap;
      
      myMap.events.add('click', () => {
        clearHighlightedBuildings();
      });

      const typeColors: { [key: string]: string } = {
        boiler: 'islands#redCircleIcon',
        chpp: 'islands#orangeCircleIcon',
        individual: 'islands#blueCircleIcon',
        central: 'islands#darkGreenCircleIcon',
        default: 'islands#darkBlueCircleIcon'
      };

      const clusterer = new window.ymaps.Clusterer({
        preset: 'islands#redClusterIcons',
        groupByCoordinates: false,
        clusterDisableClickZoom: true,
        clusterHideIconOnBalloonOpen: false,
        geoObjectHideIconOnBalloonOpen: false
      });

      const placemarks: any[] = [];
      const locationMap: {[key: string]: HeatSupplyMapItem[]} = {};
      
      dataToShow.forEach(item => {
        if (item.parameters && item.parameters.addresses) {
          item.parameters.addresses.forEach((address: any) => {
            if (!address.latitude || !address.longitude) {
              return;
            }

            const coords = [address.latitude, address.longitude];
            const coordKey = `${coords[0]},${coords[1]}`;
            
            if (!locationMap[coordKey]) {
              locationMap[coordKey] = [];
            }
            locationMap[coordKey].push(item);

            if (!placemarks.some(p => p.geometry.getCoordinates().toString() === coords.toString())) {
              const typeSlug = item.type?.slug || 'default';
              const iconColor = typeColors[typeSlug] || typeColors.default;
              
              const placemark = new window.ymaps.Placemark(
                coords,
                { 
                  balloonContent: locationMap[coordKey].length > 1 ? 
                    `${locationMap[coordKey].length} теплоисточников` : item.name,
                  hintContent: locationMap[coordKey].length > 1 ? 
                    `${locationMap[coordKey].length} теплоисточников` : item.name,
                  itemName: item.name,
                  itemType: item.type?.name || 'Неизвестный тип',
                  coordKey: coordKey,
                  itemCount: locationMap[coordKey].length,
                  itemId: item.id,
                  capacity: item.parameters?.installed_capacity || 'Нет данных',
                  organization: item.org?.shortName || item.org?.fullName || 'Нет данных'
                },
                { 
                  preset: iconColor,
                  balloonOffset: [3, -40]
                }
              );

              placemark.events.add('click', (e: any) => {
                clearHighlightedBuildings();
                
                if (locationMap[coordKey].length === 1) {
                  const heatSource = locationMap[coordKey][0];
                  setSelectedItem(heatSource);
                  setShowModal(true);
                } else {
                  setClusterHeatSources(locationMap[coordKey].map(hs => ({...hs, isSelected: false})));
                  setShowClusterModal(true);
                }
                e.stopPropagation();
              });

              placemarks.push(placemark);
            }
          });
        }
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
            
            if (geoObjects.length === 1 && geoObjects[0].properties.get('itemCount') > 1) {
              const coordKey = geoObjects[0].properties.get('coordKey');
              if (coordKey && locationMap[coordKey]) {
                setClusterHeatSources(locationMap[coordKey].map(hs => ({...hs, isSelected: false})));
                setShowClusterModal(true);
                if (cluster.balloon.isOpen()) {
                  cluster.balloon.close();
                }
                return;
              }
            }
            
            const allHeatSources: HeatSupplyMapItem[] = [];
            geoObjects.forEach((obj: any) => {
              const coordKey = obj.properties.get('coordKey');
              if (coordKey && locationMap[coordKey]) {
                locationMap[coordKey].forEach(heatSource => {
                  if (!allHeatSources.some(hs => hs.id === heatSource.id)) {
                    allHeatSources.push(heatSource);
                  }
                });
              }
            });
            
            if (allHeatSources.length > 0) {
              setClusterHeatSources(allHeatSources.map(hs => ({...hs, isSelected: false})));
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
      console.error('Ошибка при инициализации карты:', error);
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
        } else {
          console.error('window.ymaps не определен после загрузки скрипта');
        }
      };
      
      script.onerror = () => {
        console.error('Ошибка при загрузке API Яндекс.Карт');
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
  };
  
  const handleCloseClusterModal = (): void => {
    setShowClusterModal(false);
    setClusterHeatSources([]);
  };
  
  const handleSelectClusterItem = (heatSourceId: number): void => {
    const heatSource = mapData.find(hs => hs.id === heatSourceId);
    if (heatSource) {
      // Clean up any address ID fields from the selected heat source
      if (heatSource.parameters) {
        Object.keys(heatSource.parameters).forEach(key => {
          if (key.includes('address') && key !== 'addresses') {
            (heatSource.parameters as any)[key] = undefined;
          }
        });
      }
      
      if ('address_ids' in heatSource) {
        (heatSource as any)['address_ids'] = undefined;
      }
      
      setSelectedItem(heatSource);
      setShowClusterModal(false);
      setShowModal(true);
    }
  };
  
  const formatAddressString = (address: any): string => {
    if (!address) return 'Адрес не указан';
    
    let result = '';
    if (address.street?.city?.name) {
      result += `г. ${address.street.city.name}, `;
    }
    if (address.street?.name) {
      result += `${address.street.name}, `;
    }
    result += `д. ${address.house_number}`;
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

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU');
  };
  
  interface ReferenceItem {
    id: number;
    name: string;
    [key: string]: any;
  }
  
  const [referenceData, setReferenceData] = useState<{
    oksTypes: ReferenceItem[];
    oksStatuses: ReferenceItem[];
    oksCategories: ReferenceItem[];
    oksSubcategories: ReferenceItem[];
    oksBuildingTypes: ReferenceItem[];
  }>({
    oksTypes: [],
    oksStatuses: [],
    oksCategories: [],
    oksSubcategories: [],
    oksBuildingTypes: []
  });
  
  const fetchReferenceData = async (): Promise<void> => {
    try {
      const mockOksTypes = [
        { id: 1, name: 'Индивидуальный' },
        { id: 2, name: 'Многоквартирный' },
        { id: 3, name: 'Коммерческий' },
        { id: 4, name: 'Промышленный' },
        { id: 5, name: 'Отдельно стоящий' }
      ];
      
      const mockOksStatuses = [
        { id: 1, name: 'Действующий' },
        { id: 2, name: 'В строительстве' },
        { id: 3, name: 'Недействующий' }
      ];
      
      const mockOksCategories = [
        { id: 1, name: 'Жилой фонд' },
        { id: 2, name: 'Промышленный фонд' },
        { id: 3, name: 'Коммерческий фонд' }
      ];
      
      const mockOksSubcategories = [
        { id: 1, name: 'Квартирный' },
        { id: 2, name: 'Частный сектор' },
        { id: 3, name: 'Административный' },
        { id: 4, name: 'Производственный' }
      ];
      
      const mockOksBuildingTypes = [
        { id: 1, name: 'Кирпичный' },
        { id: 2, name: 'Панельный' },
        { id: 3, name: 'Монолитный' },
        { id: 4, name: 'Деревянный' }
      ];
      
      setReferenceData({
        oksTypes: mockOksTypes,
        oksStatuses: mockOksStatuses,
        oksCategories: mockOksCategories,
        oksSubcategories: mockOksSubcategories,
        oksBuildingTypes: mockOksBuildingTypes
      });
    } catch (error) {
      console.error('Error fetching reference data:', error);
    }
  };
  
  useEffect(() => {
    fetchReferenceData();
  }, []);
  
  const getReferenceItemName = (type: keyof typeof referenceData, id: number | null): string => {
    if (id === null) return 'Не указано';
    
    const items = referenceData[type];
    const item = items.find(item => item.id === id);
    return item ? item.name : `ID: ${id}`;
  };
  
  const changeViewLevel = (level: 'region' | 'city' | 'district'): void => {
    setViewLevel(level);
    
    if (!mapInstanceRef.current) return;
    
    switch (level) {
      case 'region':
        mapInstanceRef.current.setZoom(8);
        break;
      case 'city':
        mapInstanceRef.current.setZoom(12);
        break;
      case 'district':
        mapInstanceRef.current.setZoom(15);
        break;
    }
  };
  
  const toggleFilter = (): void => {
    setIsFilterExpanded(!isFilterExpanded);
  };
  
  const searchMapData = (): void => {
    if (!searchValue.trim()) {
      setFilteredMapData(mapData);
      return;
    }
    
    const lowerCaseSearch = searchValue.toLowerCase();
    const searchResults = mapData.filter(item => 
      (item.name && item.name.toLowerCase().includes(lowerCaseSearch)) ||
      (item.org?.fullName && item.org.fullName.toLowerCase().includes(lowerCaseSearch)) ||
      (item.org?.shortName && item.org.shortName.toLowerCase().includes(lowerCaseSearch)) ||
      (item.type?.name && item.type.name.toLowerCase().includes(lowerCaseSearch))
    );
    
    setFilteredMapData(searchResults);
    
    if (mapInstanceRef.current) {
      mapInstanceRef.current.destroy();
      mapInstanceRef.current = null;
    }
    
    if (window.ymaps) {
      window.ymaps.ready(() => initMap(searchResults));
    }
    
    setNotificationMessage(`Найдено ${searchResults.length} теплоисточников по запросу "${searchValue}"`);
    setShowNotification(true);
  };

  const hasValue = (value: any): boolean => {
    if (value === undefined || value === null || value === '') return false;
    if (typeof value === 'object' && Object.keys(value).length === 0) return false;
    return true;
  };
  
  const hasMeaningfulProperties = (obj: any): boolean => {
    if (!obj || typeof obj !== 'object') return false;
    
    const systemFields = ['id', 'name', 'shortName', 'fullName', 'slug', 'created_at', 'updated_at'];
    
    return Object.keys(obj).some(key => !systemFields.includes(key));
  };

  const fieldNameMap: Record<string, string> = {
    hs_type_id: 'Идентификатор типа',
    owner_id: 'Идентификатор собственника',
    org_id: 'Идентификатор организации',
    hs_period_id: 'Идентификатор периода',
    oks_id: 'Идентификатор ОКС',
    address_ids: 'Идентификаторы адресов',
    
    name: 'Название',
    type: 'Тип',
    period: 'Период',
    owner: 'Собственник',
    org: 'Организация',
    
    installed_capacity: 'Установленная мощность',
    installed_capacity_gcal_hour: 'Установленная мощность, Гкал/час',
    available_capacity: 'Доступная мощность',
    available_capacity_gcal_hour: 'Доступная мощность, Гкал/час',
    primary_fuel: 'Основное топливо',
    primary_fuel_type: 'Тип основного топлива',
    secondary_fuel: 'Резервное топливо',
    secondary_fuel_type: 'Тип резервного топлива',
    temperature_graph: 'Температурный график',
    temperature_schedule: 'Температурный график',
    current_temperature: 'Текущая температура',
    current_pressure: 'Текущее давление',
    hydraulic_tests: 'Гидравлические испытания',
    address: 'Адрес',
    supply_address_ids: 'Адреса снабжения',
    addresses: 'Адреса'
  };

  const getFieldDisplayName = (key: string): string => {
    if (fieldNameMap[key]) {
      return fieldNameMap[key];
    }
    
    return key
      .replace(/_id$/, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/Id$/, '')
      .replace(/Ids$/, 's');
  };

  const hiddenFields = [
    'id', 'hs_type_id', 'owner_id', 'org_id', 'hs_period_id', 'oks_id'
  ];

  const renderObjectProperties = (obj: any, title: string): JSX.Element | null => {
    if (!obj || typeof obj !== 'object') return null;
    
    const properties = Object.entries(obj)
      .filter(([key, value]) => 
        !hiddenFields.includes(key) && 
        key !== 'name' && 
        key !== 'shortName' && 
        key !== 'fullName' && 
        key !== 'slug' && 
        key !== 'addresses' &&
        key !== 'created_at' &&
        key !== 'updated_at' &&
        hasValue(value)
      );
    
    if (properties.length === 0) return null;
    
    return (
      <div className="mb-4">
        <h6 className="text-primary mb-2">{title}</h6>
        <div className="table-responsive">
          <table className="table table-striped table-sm">
            <tbody>
              {properties.map(([key, value], index) => (
                <tr key={index}>
                  <th style={{ width: '40%' }}>{getFieldDisplayName(key)}</th>
                  <td>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
              <span>Котельные</span>
            </div>
            <div className="d-flex align-items-center">
              <span className="legend-dot rounded-circle me-2" style={{ backgroundColor: '#FFA500' }}></span>
              <span>ТЭЦ</span>
            </div>
            <div className="d-flex align-items-center">
              <span className="legend-dot rounded-circle me-2" style={{ backgroundColor: '#0000FF' }}></span>
              <span>Индивидуальные</span>
            </div>
            <div className="d-flex align-items-center">
              <span className="legend-dot rounded-circle me-2" style={{ backgroundColor: '#006400' }}></span>
              <span>Центральные</span>
            </div>
            <div className="d-flex align-items-center">
              <span className="legend-dot rounded-circle me-2" style={{ backgroundColor: '#00FF00' }}></span>
              <span>Подключенные дома</span>
            </div>
          </div>
        </Card.Body>
      </Card>

      <Card className="mb-3">
        <Card.Body>
          <InputGroup>
            <Form.Control
              placeholder="Поиск по названию, организации или типу..."
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
                    <Form.Label>Название</Form.Label>
                    <Form.Control 
                      type="text" 
                      placeholder="Название теплоисточника" 
                      value={filters.name}
                      onChange={(e) => setFilters({...filters, name: e.target.value})}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Тип теплоисточника</Form.Label>
                    <Form.Select 
                      value={filters.hs_type_id || ''}
                      onChange={(e) => setFilters({
                        ...filters, 
                        hs_type_id: e.target.value ? Number(e.target.value) : null
                      })}
                    >
                      <option value="">Все типы</option>
                      {hsTypes.map(type => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Собственник</Form.Label>
                    <Form.Select 
                      value={filters.owner_id || ''}
                      onChange={(e) => setFilters({
                        ...filters, 
                        owner_id: e.target.value ? Number(e.target.value) : null
                      })}
                    >
                      <option value="">Все собственники</option>
                      {organizations.map(org => (
                        <option key={org.id} value={org.id}>
                          {org.shortName || org.fullName}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Эксплуатирующая организация</Form.Label>
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
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Период</Form.Label>
                    <Form.Select 
                      value={filters.hs_period_id || ''}
                      onChange={(e) => setFilters({
                        ...filters, 
                        hs_period_id: e.target.value ? Number(e.target.value) : null
                      })}
                    >
                      <option value="">Все периоды</option>
                      {periods.map(period => (
                        <option key={period.id} value={period.id}>
                          {period.name}
                        </option>
                      ))}
                    </Form.Select>
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

      <Row className="mb-3">
        <Col sm={12}>
          <ButtonGroup className="w-100">
            <Button 
              variant={viewLevel === 'region' ? 'primary' : 'outline-primary'} 
              onClick={() => changeViewLevel('region')}
            >
              Регион
            </Button>
            <Button 
              variant={viewLevel === 'city' ? 'primary' : 'outline-primary'} 
              onClick={() => changeViewLevel('city')}
            >
              Город
            </Button>
            <Button 
              variant={viewLevel === 'district' ? 'primary' : 'outline-primary'} 
              onClick={() => changeViewLevel('district')}
            >
              Район
            </Button>
          </ButtonGroup>
        </Col>
      </Row>

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

      <Modal show={showModal} onHide={handleCloseModal} size="xl">
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>
            <span className="fw-bold">{selectedItem?.name}</span>
            {selectedItem?.id && <span className="ms-2 text-muted small">ID: {selectedItem.id}</span>}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedItem && (
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
                        <span>{selectedItem.type?.name || 'Не указан'}</span>
                      </div>
                      
                      <div className="d-flex align-items-center mb-2">
                        <span className="badge bg-info me-2">Период</span>
                        <span>{selectedItem.period?.name || 'Не указан'}</span>
                      </div>
                      
                                                {Object.entries(selectedItem)
                        .filter(([key, value]) => 
                          !['id', 'name', 'type', 'period', 'owner', 'org', 'parameters', 'created_at', 'updated_at',
                            'hs_type_id', 'owner_id', 'org_id', 'hs_period_id', 'oks_id', 'address_ids'].includes(key) && 
                          !key.includes('address') &&
                          hasValue(value) && 
                          typeof value !== 'object'
                        )
                        .map(([key, value]) => (
                          <div key={key} className="d-flex align-items-center mb-2">
                            <span className="badge bg-secondary me-2">
                              {getFieldDisplayName(key)}
                            </span>
                            <span>{String(value)}</span>
                          </div>
                        ))
                      }
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
                          <div><strong>Название:</strong> {selectedItem.owner?.shortName || selectedItem.owner?.fullName || 'Не указан'}</div>
                          
                          {selectedItem.owner?.phone && (
                            <div className="mt-1">
                              <strong>Телефон:</strong> 
                              <a href={`tel:${selectedItem.owner.phone}`} className="ms-2">
                                {selectedItem.owner.phone}
                              </a>
                            </div>
                          )}
                          
                          {selectedItem.owner?.email && (
                            <div className="mt-1">
                              <strong>Email:</strong> 
                              <a href={`mailto:${selectedItem.owner.email}`} className="ms-2">
                                {selectedItem.owner.email}
                              </a>
                            </div>
                          )}
                          
                          {selectedItem.owner?.address && (
                            <div className="mt-1">
                              <strong>Адрес:</strong> <span className="ms-1">{selectedItem.owner.address}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <h6 className="text-success">Эксплуатирующая организация</h6>
                        <div className="ps-3 border-start border-success">
                          <div><strong>Название:</strong> {selectedItem.org?.shortName || selectedItem.org?.fullName || 'Не указана'}</div>
                          
                          {selectedItem.org?.phone && (
                            <div className="mt-1">
                              <strong>Телефон:</strong> 
                              <a href={`tel:${selectedItem.org.phone}`} className="ms-2">
                                {selectedItem.org.phone}
                              </a>
                            </div>
                          )}
                          
                          {selectedItem.org?.email && (
                            <div className="mt-1">
                              <strong>Email:</strong> 
                              <a href={`mailto:${selectedItem.org.email}`} className="ms-2">
                                {selectedItem.org.email}
                              </a>
                            </div>
                          )}
                          
                          {selectedItem.org?.address && (
                            <div className="mt-1">
                              <strong>Адрес:</strong> <span className="ms-1">{selectedItem.org.address}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>
              
              {selectedItem.parameters && (
                <div className="card mb-4">
                  <div className="card-header bg-info text-white">
                    <h6 className="mb-0">Технические характеристики</h6>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-striped table-hover">
                        <tbody>
                          {selectedItem.parameters.installed_capacity && (
                            <tr>
                              <th style={{ width: '30%' }}>Установленная мощность</th>
                              <td>{selectedItem.parameters.installed_capacity}</td>
                            </tr>
                          )}
                          {selectedItem.parameters.installed_capacity_gcal_hour && (
                            <tr>
                              <th>Установленная мощность, Гкал/час</th>
                              <td>{selectedItem.parameters.installed_capacity_gcal_hour}</td>
                            </tr>
                          )}
                          {selectedItem.parameters.available_capacity && (
                            <tr>
                              <th>Доступная мощность</th>
                              <td>{selectedItem.parameters.available_capacity}</td>
                            </tr>
                          )}
                          {selectedItem.parameters.available_capacity_gcal_hour && (
                            <tr>
                              <th>Доступная мощность, Гкал/час</th>
                              <td>{selectedItem.parameters.available_capacity_gcal_hour}</td>
                            </tr>
                          )}
                          {selectedItem.parameters.primary_fuel && (
                            <tr>
                              <th>Основное топливо</th>
                              <td>{selectedItem.parameters.primary_fuel}</td>
                            </tr>
                          )}
                          {selectedItem.parameters.primary_fuel_type && (
                            <tr>
                              <th>Тип основного топлива</th>
                              <td>{selectedItem.parameters.primary_fuel_type}</td>
                            </tr>
                          )}
                          {selectedItem.parameters.secondary_fuel && (
                            <tr>
                              <th>Резервное топливо</th>
                              <td>{selectedItem.parameters.secondary_fuel}</td>
                            </tr>
                          )}
                          {selectedItem.parameters.secondary_fuel_type && (
                            <tr>
                              <th>Тип резервного топлива</th>
                              <td>{selectedItem.parameters.secondary_fuel_type}</td>
                            </tr>
                          )}
                          {selectedItem.parameters.temperature_graph && (
                            <tr>
                              <th>Температурный график</th>
                              <td>{selectedItem.parameters.temperature_graph}</td>
                            </tr>
                          )}
                          {selectedItem.parameters.temperature_schedule && (
                            <tr>
                              <th>Температурный график</th>
                              <td>{selectedItem.parameters.temperature_schedule}</td>
                            </tr>
                          )}
                          {selectedItem.parameters.current_temperature && (
                            <tr>
                              <th>Текущая температура</th>
                              <td>{selectedItem.parameters.current_temperature}</td>
                            </tr>
                          )}
                          {selectedItem.parameters.current_pressure && (
                            <tr>
                              <th>Текущее давление</th>
                              <td>{selectedItem.parameters.current_pressure}</td>
                            </tr>
                          )}
                          {selectedItem.parameters.hydraulic_tests && (
                            <tr>
                              <th>Гидравлические испытания</th>
                              <td>{selectedItem.parameters.hydraulic_tests}</td>
                            </tr>
                          )}
                          
                          {Object.entries(selectedItem.parameters)
                            .filter(([key, value]) => 
                              !['installed_capacity', 'installed_capacity_gcal_hour', 
                                'available_capacity', 'available_capacity_gcal_hour', 
                                'primary_fuel', 'primary_fuel_type',
                                'secondary_fuel', 'secondary_fuel_type', 
                                'temperature_graph', 'temperature_schedule',
                                'current_temperature', 'current_pressure', 
                                'hydraulic_tests', 'addresses',
                                'address_ids', 'supply_address_ids'].includes(key) && 
                              !key.endsWith('_id') &&
                              !key.includes('address') &&
                              hasValue(value)
                            )
                            .map(([key, value]) => (
                              <tr key={key}>
                                <th>{getFieldDisplayName(key)}</th>
                                <td>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</td>
                              </tr>
                            ))
                          }
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
                  {selectedItem.parameters && selectedItem.parameters.addresses && selectedItem.parameters.addresses.length > 0 ? (
                    <div className="addresses-list-container">
                      <ul className="list-group addresses-list">
                        {selectedItem.parameters.addresses.map((address: any, index: number) => (
                          <li key={index} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                            <div>
                              <i className="fas fa-building me-2 text-primary"></i>
                              {address.street?.city?.name && `г. ${address.street.city.name}, `}
                              {address.street?.name && `${address.street.name}, `}
                              д. {address.house_number}
                              {address.building && ` корп. ${address.building}`}
                              {address.structure && ` стр. ${address.structure}`}
                              {address.literature && ` лит. ${address.literature}`}
                            </div>
                            {address.latitude && address.longitude && (
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                                onClick={() => {
                                  if (mapInstanceRef.current) {
                                    mapInstanceRef.current.setCenter([address.latitude, address.longitude], 17);
                                    handleCloseModal();
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
              
              {selectedItem.oks && (
                <div className="card mb-4">
                  <div className="card-header bg-warning text-dark">
                    <h6 className="mb-0">Информация об ОКС</h6>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-striped">
                        <tbody>
                          {selectedItem.oks.oks_type_id && (
                            <tr>
                              <th>Тип ОКС</th>
                              <td>{getReferenceItemName('oksTypes', selectedItem.oks.oks_type_id)}</td>
                            </tr>
                          )}
                          
                          {selectedItem.oks.oks_status && (
                            <tr>
                              <th>Статус ОКС</th>
                              <td>{getReferenceItemName('oksStatuses', selectedItem.oks.oks_status)}</td>
                            </tr>
                          )}
                          
                          {selectedItem.oks.oks_category && (
                            <tr>
                              <th>Категория ОКС</th>
                              <td>{getReferenceItemName('oksCategories', selectedItem.oks.oks_category)}</td>
                            </tr>
                          )}
                          
                          {selectedItem.oks.oks_subcategory && (
                            <tr>
                              <th>Подкатегория ОКС</th>
                              <td>{getReferenceItemName('oksSubcategories', selectedItem.oks.oks_subcategory)}</td>
                            </tr>
                          )}
                          
                          {selectedItem.oks.has_gis_zhkh !== undefined && (
                            <tr>
                              <th>Наличие в ГИС ЖКХ</th>
                              <td>{selectedItem.oks.has_gis_zhkh ? 'Да' : 'Нет'}</td>
                            </tr>
                          )}
                          
                          {selectedItem.oks.oks_building_type && (
                            <tr>
                              <th>Тип строения</th>
                              <td>{getReferenceItemName('oksBuildingTypes', selectedItem.oks.oks_building_type)}</td>
                            </tr>
                          )}
                          
                          {Object.entries(selectedItem.oks)
                            .filter(([key, value]) => 
                              !['id', 'address', 'oks_type_id', 'oks_status', 'oks_category', 
                               'oks_subcategory', 'has_gis_zhkh', 'oks_building_type',
                               'created_at', 'updated_at'].includes(key) && 
                              hasValue(value) &&
                              !key.endsWith('_id')
                            )
                            .map(([key, value]) => (
                              <tr key={key}>
                                <th>{getFieldDisplayName(key)}</th>
                                <td>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</td>
                              </tr>
                            ))
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
              
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
                                    mapInstanceRef.current.setCenter([address.latitude, address.longitude], 17);
                                    handleCloseModal();
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
              
              {selectedItem.type && hasMeaningfulProperties(selectedItem.type) && (
                <div className="card mb-4">
                  <div className="card-header bg-primary text-white">
                    <h6 className="mb-0">Дополнительная информация о типе</h6>
                  </div>
                  <div className="card-body">
                    {renderObjectProperties(selectedItem.type, 'Параметры типа')}
                  </div>
                </div>
              )}
              
              {selectedItem.period && hasMeaningfulProperties(selectedItem.period) && (
                <div className="card mb-4">
                  <div className="card-header bg-info text-white">
                    <h6 className="mb-0">Дополнительная информация о периоде</h6>
                  </div>
                  <div className="card-body">
                    {renderObjectProperties(selectedItem.period, 'Параметры периода')}
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
                        <span>Создан: {formatDate(selectedItem.created_at)}</span>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="d-flex align-items-center">
                        <i className="fas fa-calendar-check me-2 text-primary"></i>
                        <span>Обновлен: {formatDate(selectedItem.updated_at)}</span>
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
            onClick={() => selectedItem?.id && highlightConnectedBuildings(selectedItem.id)}
            className="me-auto"
          >
            <i className="fas fa-search"></i> Показать подключенные дома
          </Button>
          <Button variant="secondary" onClick={handleCloseModal}>
            Закрыть
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showClusterModal} onHide={handleCloseClusterModal} size="lg" backdrop="static">
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>Теплоисточники в данной точке ({clusterHeatSources.length})</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {clusterHeatSources.length > 0 ? (
            <div className="cluster-items-list">
              {clusterHeatSources.map(heatSource => (
                <div 
                  key={heatSource.id} 
                  className="cluster-item p-3 mb-3 border rounded cursor-pointer"
                  onClick={() => handleSelectClusterItem(heatSource.id)}
                >
                  <h5 className="text-primary">{heatSource.name}</h5>
                  <div className="d-flex flex-wrap gap-2 mb-2">
                    <div className="badge bg-primary me-1">
                      {heatSource.type?.name || 'Тип не указан'}
                    </div>
                    <div className="badge bg-info me-1">
                      {heatSource.period?.name || 'Период не указан'}
                    </div>
                  </div>
                  <div className="mb-2">
                    <strong>Организация:</strong> {heatSource.org?.shortName || heatSource.org?.fullName || 'Не указана'}
                  </div>
                  {heatSource.parameters?.installed_capacity && (
                    <div className="mb-2">
                      <strong>Мощность:</strong> {heatSource.parameters.installed_capacity}
                    </div>
                  )}
                  <div className="d-flex justify-content-between align-items-center mt-2">
                    <small className="text-muted">
                      Обновлен: {formatDate(heatSource.updated_at)}
                    </small>
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectClusterItem(heatSource.id);
                      }}
                    >
                      Подробнее
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>Нет теплоисточников для отображения</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseClusterModal}>
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
          overflow: hidden;
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