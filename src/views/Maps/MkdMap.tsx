import React, { useEffect, useState, useRef } from 'react'
import { Card, Row, Col, Modal, Button, Spinner, Form, InputGroup, Toast, ToastContainer } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { initializeApi, getMkdBuildings, getOrganizations, getCities, api } from '../../services/api'
import { MkdBuilding, MkdQueryParams } from '../../types/mkdSchedule'

interface UserProfile {
  id: number
  created_at: string
  updated_at: string
  org_id: number
  first_name: string
  last_name: string
  middle_name: string
  phone: string
  login: string
  email: string | null
  telegram: string | null
  vk: string | null
  inn: string | null
  center_lat: string
  center_lng: string
  south_west_lat: string
  south_west_lng: string
  north_east_lat: string
  north_east_lng: string
  roles: any[]
  org: {
    id: number
    fullName: string
    inn: string
    ogrn: string
    orgAddress: string
    phone: string
    shortName: string
    url: string | null
    created_at: string
    updated_at: string
  }
}

declare global {
  interface Window {
    ymaps: any
  }
}

interface FilterState {
  city_id: number | null
  street_id: number | null
  management_org_id: number | null
  municipality_org_id: number | null
  house_type_id: number | null
  house_condition_id: number | null
  buildingYear: string | null
}

interface ClusteredBuilding extends MkdBuilding {
  isSelected?: boolean
}

interface MapBoundaries {
  center_lat: number
  center_lng: number
  south_west_lat: number
  south_west_lng: number
  north_east_lat: number
  north_east_lng: number
}

interface HouseType {
  id: number;
  houseTypeName: string;
  createDate?: string;
  guid?: string;
  created_at?: string;
  updated_at?: string;
}

const MkdMap: React.FC = () => {
  const [mapData, setMapData] = useState<MkdBuilding[]>([])
  const [filteredMapData, setFilteredMapData] = useState<MkdBuilding[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<MkdBuilding | null>(null)
  const [showModal, setShowModal] = useState<boolean>(false)
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(true)
  const [showNotification, setShowNotification] = useState<boolean>(false)
  const [notificationMessage, setNotificationMessage] = useState<string>('')

  const [showClusterModal, setShowClusterModal] = useState<boolean>(false)
  const [clusterBuildings, setClusterBuildings] = useState<ClusteredBuilding[]>([])
  const [searchValue, setSearchValue] = useState<string>('')

  const [cities, setCities] = useState<Array<any>>([])
  const [organizations, setOrganizations] = useState<Array<any>>([])
  const [houseTypes, setHouseTypes] = useState<Array<any>>([])
  const [houseConditions, setHouseConditions] = useState<Array<any>>([])
  const [yearBuiltOptions, setYearBuiltOptions] = useState<Array<string>>([])

  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  const [mapBoundaries, setMapBoundaries] = useState<MapBoundaries>({
    center_lat: 51.660772,
    center_lng: 39.200289,
    south_west_lat: 51.55,
    south_west_lng: 39.05,
    north_east_lat: 51.75,
    north_east_lng: 39.45
  })

  const [filters, setFilters] = useState<FilterState>({
    city_id: null,
    street_id: null,
    management_org_id: null,
    municipality_org_id: null,
    house_type_id: null,
    house_condition_id: null,
    buildingYear: null
  })
  const [activeFilters, setActiveFilters] = useState<number>(0)

  const fetchHouseConditions = async () => {
    try {
      const response = await api.get('/house/conditions')
      if (Array.isArray(response)) {
        setHouseConditions(response)
      }
    } catch (error) {
      setHouseConditions([])
    }
  }

  const fetchMkdData = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      await initializeApi()
      try {
        const userProfile = await api.get<UserProfile>('/me')
        if (userProfile.center_lat && userProfile.center_lng) {
          setMapBoundaries({
            center_lat: parseFloat(userProfile.center_lat),
            center_lng: parseFloat(userProfile.center_lng),
            south_west_lat: parseFloat(userProfile.south_west_lat),
            south_west_lng: parseFloat(userProfile.south_west_lng),
            north_east_lat: parseFloat(userProfile.north_east_lat),
            north_east_lng: parseFloat(userProfile.north_east_lng)
          })
        }
      } catch {}
      const mkdResponse = await getMkdBuildings(1, {})
      if (mkdResponse && mkdResponse.items && mkdResponse.items.length > 0) {
        setMapData(mkdResponse.items)
        setFilteredMapData(mkdResponse.items)
        const years = Array.from(new Set(mkdResponse.items.filter(item => item.buildingYear).map(item => item.buildingYear))).sort((a, b) => parseInt(b) - parseInt(a))
        setYearBuiltOptions(years)
      }
      try {
        const citiesResult = await getCities()
        if (Array.isArray(citiesResult)) {
          setCities(citiesResult)
        } else {
          setCities([])
        }
      } catch {
        setCities([])
      }
      try {
        const organizationsResult = await getOrganizations()
        if (Array.isArray(organizationsResult)) {
          setOrganizations(organizationsResult)
        } else {
          setOrganizations([])
        }
      } catch {
        setOrganizations([])
      }
      await fetchHouseConditions()
      // Получение типов домов
      try {
        const houseTypes = await fetchHouseTypes();
        setHouseTypes(houseTypes); // Сохраняем типы домов в состояние
      } catch {
        setHouseTypes([]); // В случае ошибки устанавливаем пустой массив
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  const fetchHouseTypes = async (): Promise<HouseType[]> => {
    try {
      const response = await api.get<HouseType[]>('/house-type');
      return response.map(item => ({
        id: item.id,
        houseTypeName: item.houseTypeName
      }));
    } catch (err) {
      console.error('Ошибка при получении типов домов:', err);
      return [];
    }
  };

  // TODO почему 2 useEffect?
  useEffect(() => {
    fetchMkdData()
  }, [])

  useEffect(() => {
    let count = 0
    if (filters.city_id) count++
    if (filters.street_id) count++
    if (filters.management_org_id) count++
    if (filters.municipality_org_id) count++
    if (filters.house_type_id) count++
    if (filters.house_condition_id) count++
    if (filters.buildingYear) count++
    setActiveFilters(count)
  }, [filters])

  const applyFilters = async (): Promise<void> => {
    try {
      setLoading(true)
      const queryParams: MkdQueryParams = {}
      if (filters.city_id) queryParams.city_id = filters.city_id
      if (filters.street_id) queryParams.street_id = filters.street_id
      if (filters.management_org_id) queryParams.management_org_id = filters.management_org_id
      if (filters.municipality_org_id) queryParams.municipality_org_id = filters.municipality_org_id
      if (filters.buildingYear) queryParams.buildingYear = filters.buildingYear
      const mkdResponse = await getMkdBuildings(1, queryParams)
      let filtered = mkdResponse.items
      if (filters.house_type_id) {
        filtered = filtered.filter(item => item.house_type_id === filters.house_type_id)
      }
      if (filters.house_condition_id) {
        filtered = filtered.filter(item => item.house_condition_id === filters.house_condition_id)
      }
      setFilteredMapData(filtered)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy()
        mapInstanceRef.current = null
      }
      if (window.ymaps) {
        window.ymaps.ready(() => initMap(filtered))
      }
      setNotificationMessage(`Найдено ${filtered.length} домов`)
      setShowNotification(true)
    } catch (error) {
      setError('Ошибка при применении фильтров: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setLoading(false)
    }
  }

  const clearAllFilters = async (): Promise<void> => {
    try {
      setFilters({
        city_id: null,
        street_id: null,
        management_org_id: null,
        municipality_org_id: null,
        house_type_id: null,
        house_condition_id: null,
        buildingYear: null
      })
      setLoading(true)
      const mkdResponse = await getMkdBuildings(1, {})
      setFilteredMapData(mkdResponse.items)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy()
        mapInstanceRef.current = null
      }
      if (window.ymaps) {
        window.ymaps.ready(() => initMap(mkdResponse.items))
      }
      setNotificationMessage('Фильтры сброшены')
      setShowNotification(true)
    } catch (error) {
      setError('Ошибка при сбросе фильтров: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setLoading(false)
    }
  }

  const searchMapData = async (): Promise<void> => {
    if (!searchValue.trim()) {
      setFilteredMapData(mapData)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy()
        mapInstanceRef.current = null
      }
      if (window.ymaps) {
        window.ymaps.ready(() => initMap(mapData))
      }
      return
    }
    try {
      setLoading(true)
      const lowerCaseSearch = searchValue.toLowerCase()
      const searchResults = mapData.filter(item =>
        (item.address?.street?.name && item.address.street.name.toLowerCase().includes(lowerCaseSearch)) ||
        (item.address?.house_number && item.address.house_number.toLowerCase().includes(lowerCaseSearch)) ||
        (item.management_org?.fullName && item.management_org.fullName.toLowerCase().includes(lowerCaseSearch)) ||
        (item.management_org?.shortName && item.management_org.shortName.toLowerCase().includes(lowerCaseSearch)) ||
        (item.cadastreNumber && item.cadastreNumber.toLowerCase().includes(lowerCaseSearch))
      )
      setFilteredMapData(searchResults)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy()
        mapInstanceRef.current = null
      }
      if (window.ymaps) {
        window.ymaps.ready(() => initMap(searchResults))
      }
      setNotificationMessage(`Найдено ${searchResults.length} домов по запросу "${searchValue}"`)
      setShowNotification(true)
    } catch (error) {
      setError('Ошибка при поиске: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setLoading(false)
    }
  }

  const getPlacemarkColor = (item: MkdBuilding): string => {
    if (item.house_condition && item.house_condition.houseCondition === 'Неисправный') {
      return 'islands#redCircleDotIcon'
    }
    const currentYear = new Date().getFullYear()
    const buildYear = parseInt(item.buildingYear)
    if (!isNaN(buildYear)) {
      if (currentYear - buildYear < 5) {
        return 'islands#darkGreenCircleDotIcon'
      } else if (currentYear - buildYear < 30) {
        return 'islands#greenCircleDotIcon'
      } else if (currentYear - buildYear < 60) {
        return 'islands#yellowCircleDotIcon'
      } else {
        return 'islands#orangeCircleDotIcon'
      }
    }
    return 'islands#blueCircleDotIcon'
  }

  const initMap = (dataToShow: MkdBuilding[] = filteredMapData): void => {
    if (!mapRef.current || !window.ymaps || dataToShow.length === 0) {
      return;
    }

    try {
      // Создаем карту с центром в указанных координатах
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

      // Ограничиваем область просмотра
      myMap.setBounds(bounds, {
        checkZoomRange: true,
        zoomMargin: 0 // Отступы при установке границ
      });

      // Запрещаем выход за границы
      myMap.options.set('restrictMapArea', bounds);

      // Включаем только нужные поведения
      myMap.behaviors.enable('scrollZoom');
      myMap.behaviors.enable('multiTouch');

      mapInstanceRef.current = myMap;

      // Создаем кластеризатор
      const clusterer = new window.ymaps.Clusterer({
        preset: 'islands#greenClusterIcons',
        groupByCoordinates: false,
        clusterDisableClickZoom: true,
        clusterHideIconOnBalloonOpen: false,
        geoObjectHideIconOnBalloonOpen: false
      });

      const placemarks: any[] = [];
      const locationMap: { [key: string]: MkdBuilding[] } = {};

      // Фильтруем точки, которые попадают в границы карты
      const filteredPoints = dataToShow.filter(item => {
        if (!item.address || !item.address.latitude || !item.address.longitude) {
          return false;
        }

        const lat = parseFloat(item.address.latitude);
        const lng = parseFloat(item.address.longitude);

        return lat >= mapBoundaries.south_west_lat &&
            lat <= mapBoundaries.north_east_lat &&
            lng >= mapBoundaries.south_west_lng &&
            lng <= mapBoundaries.north_east_lng;
      });

      // Создаем метки только для точек в пределах границ
      filteredPoints.forEach(item => {
        if (item.address && item.address.latitude && item.address.longitude) {
          const coords = [parseFloat(item.address.latitude), parseFloat(item.address.longitude)];
          const coordKey = `${coords[0]},${coords[1]}`;

          if (!locationMap[coordKey]) {
            locationMap[coordKey] = [];
          }
          locationMap[coordKey].push(item);

          if (!placemarks.some(p => p.geometry.getCoordinates().toString() === coords.toString())) {
            const address = item.address.street && item.address.street.name
                ? `${item.address.street.city?.name || ''}, ${item.address.street.name}, ${item.address.house_number}`
                : `Дом №${item.address.house_number}`;

            const placemark = new window.ymaps.Placemark(
                coords,
                {
                  balloonContent: locationMap[coordKey].length > 1
                      ? `${locationMap[coordKey].length} домов`
                      : `
                <div>
                  <strong>${address}</strong><br>
                  УК: ${item.management_org?.shortName || 'Не указана'}<br>
                  Год постройки: ${item.buildingYear || 'Не указан'}<br>
                  Состояние: ${item.house_condition?.houseCondition || 'Не указано'}<br>
                  Кадастровый номер: ${item.cadastreNumber || 'Не указан'}
                </div>
              `,
                  hintContent: locationMap[coordKey].length > 1 ? `${locationMap[coordKey].length} домов` : address,
                  itemId: item.id,
                  coordKey: coordKey,
                  itemCount: locationMap[coordKey].length,
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
                setShowModal(true);
              } else {
                setClusterBuildings(locationMap[coordKey].map(building => ({ ...building, isSelected: false })));
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

        clusterer.events.add('click', function (e: any) {
          const cluster = e.get('target');
          const handleClusterInteraction = (): void => {
            const geoObjects = cluster.getGeoObjects();
            if (geoObjects.length === 1 && geoObjects[0].properties.get('itemCount') > 1) {
              const coordKey = geoObjects[0].properties.get('coordKey');
              if (coordKey && locationMap[coordKey]) {
                setClusterBuildings(locationMap[coordKey].map(building => ({ ...building, isSelected: false })));
                setShowClusterModal(true);
                if (cluster.balloon.isOpen()) {
                  cluster.balloon.close();
                }
                return;
              }
            }

            const allBuildings: MkdBuilding[] = [];
            geoObjects.forEach((obj: any) => {
              const coordKey = obj.properties.get('coordKey');
              if (coordKey && locationMap[coordKey]) {
                locationMap[coordKey].forEach(building => {
                  if (!allBuildings.some(b => b.id === building.id)) {
                    allBuildings.push(building);
                  }
                });
              }
            });

            if (allBuildings.length > 0) {
              setClusterBuildings(allBuildings.map(building => ({ ...building, isSelected: false })));
              setShowClusterModal(true);
              if (cluster.balloon.isOpen()) {
                cluster.balloon.close();
              }
            }
          };
          handleClusterInteraction();
          e.stopPropagation();
        });

        clusterer.events.add('objectsaddtomap', function (e: any) {
          const clusters = e.get('child').filter((obj: any) => obj.options.getName() === 'cluster');
          clusters.forEach((cluster: any) => {
            const geoObjects = cluster.properties.get('geoObjects');
            const hasBadCondition = geoObjects.some((obj: any) => obj.properties.get('condition') === 'Неисправный');
            if (hasBadCondition) {
              cluster.options.set('preset', 'islands#redClusterIcons');
            } else {
              cluster.options.set('preset', 'islands#greenClusterIcons');
            }
          });
        });

        clusterer.add(placemarks);
        myMap.geoObjects.add(clusterer);

        // Устанавливаем границы для кластеров, но не выходим за общие границы карты
        const clusterBounds = clusterer.getBounds();
        const restrictedBounds = [
          [
            Math.max(clusterBounds[0][0], mapBoundaries.south_west_lat),
            Math.max(clusterBounds[0][1], mapBoundaries.south_west_lng)
          ],
          [
            Math.min(clusterBounds[1][0], mapBoundaries.north_east_lat),
            Math.min(clusterBounds[1][1], mapBoundaries.north_east_lng)
          ]
        ];

        if (placemarks.length > 1) {
          myMap.setBounds(restrictedBounds, {
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
            initMap()
          }
        })
        return
      }
      // TODO УСТАНОВИТЬ БИБЛИОТЕКУ И ВЫНЕСТИ В ОТДЕЛЬНЫЙ КОМПОНЕНТ
      const script = document.createElement('script')
      script.src = 'https://api-maps.yandex.ru/2.1/?apikey=9b9469e9-98d9-4c6d-9b5d-4272b266a69e&lang=ru_RU'
      script.type = 'text/javascript'
      script.async = true
      script.onload = () => {
        if (window.ymaps) {
          window.ymaps.ready(() => {
            if (filteredMapData.length > 0) {
              initMap()
            }
          })
        }
      }
      script.onerror = () => {
        setError('Не удалось загрузить API Яндекс.Карт')
      }
      document.head.appendChild(script)
    }
    if (!loading && filteredMapData.length > 0) {
      loadYandexMapsApi()
    }
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy()
        mapInstanceRef.current = null
      }
    }
  }, [loading, filteredMapData])

  const handleCloseModal = (): void => {
    setShowModal(false)
    setSelectedItem(null)
  }

  const handleCloseClusterModal = (): void => {
    setShowClusterModal(false)
    setClusterBuildings([])
  }

  const handleSelectClusterItem = (buildingId: number): void => {
    const building = mapData.find(b => b.id === buildingId)
    if (building) {
      setSelectedItem(building)
      setShowClusterModal(false)
      setShowModal(true)
    }
  }

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Не указана'
    const date = new Date(dateString)
    return date.toLocaleString('ru-RU')
  }

  const toggleFilter = (): void => {
    setIsFilterExpanded(!isFilterExpanded)
  }

  const getFormattedAddress = (item: MkdBuilding): string => {
    if (!item || !item.address) return 'Адрес не указан'
    let address = ''
    if (item.address.street?.city?.name) {
      address += `${item.address.street.city.name}, `
    }
    if (item.address.street?.name) {
      address += `${item.address.street.name}, `
    }
    address += `д. ${item.address.house_number}`
    if (item.address.building) {
      address += ` корп. ${item.address.building}`
    }
    return address
  }

  return (
    <React.Fragment>
      <div className="page-header">
        <div className="page-block">
          <div className="row align-items-center">
            <div className="col-md-12">
              <div className="page-header-title">
                <h5 className="m-b-10">Карта МКД</h5>
              </div>
              <ul className="breadcrumb">
                <li className="breadcrumb-item">
                  <Link to="/dashboard">Главная</Link>
                </li>
                <li className="breadcrumb-item">Карты</li>
                <li className="breadcrumb-item">Карта МКД</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <Card className="mb-3">
        <Card.Body>
          <div className="d-flex flex-wrap gap-3 justify-content-center">
            <div className="d-flex align-items-center">
              <span className="legend-dot rounded-circle me-2" style={{ backgroundColor: '#ff0000' }} />
              <span>Неисправный дом</span>
            </div>
            <div className="d-flex align-items-center">
              <span className="legend-dot rounded-circle me-2" style={{ backgroundColor: '#006400' }} />
              <span>Новый дом (менее 5 лет)</span>
            </div>
            <div className="d-flex align-items-center">
              <span className="legend-dot rounded-circle me-2" style={{ backgroundColor: '#00aa00' }} />
              <span>Относительно новый дом (5-30 лет)</span>
            </div>
            <div className="d-flex align-items-center">
              <span className="legend-dot rounded-circle me-2" style={{ backgroundColor: '#ffcc00' }} />
              <span>Старый дом (30-60 лет)</span>
            </div>
            <div className="d-flex align-items-center">
              <span className="legend-dot rounded-circle me-2" style={{ backgroundColor: '#ff9900' }} />
              <span>Очень старый дом (более 60 лет)</span>
            </div>
          </div>
        </Card.Body>
      </Card>
      <Card className="mb-3">
        <Card.Body>
          <InputGroup>
            <Form.Control
              placeholder="Поиск по адресу, УК или кадастровому номеру..."
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && searchMapData()}
            />
            <Button variant="primary" onClick={searchMapData}>
              <i className="fa fa-search" /> Поиск
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => {
                setSearchValue('')
                setFilteredMapData(mapData)
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.destroy()
                  mapInstanceRef.current = null
                }
                if (window.ymaps) {
                  window.ymaps.ready(() => initMap(mapData))
                }
              }}
            >
              Сбросить
            </Button>
          </InputGroup>
        </Card.Body>
      </Card>
      <Card className="mb-3">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            Фильтр
            {activeFilters > 0 && <span className="ms-2 badge bg-primary">{activeFilters}</span>}
          </h5>
          <Button variant="outline-primary" size="sm" onClick={toggleFilter}>
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
                      onChange={e => {
                        const cityId = e.target.value ? Number(e.target.value) : null
                        setFilters({
                          ...filters,
                          city_id: cityId,
                          street_id: null
                        })
                      }}
                    >
                      <option value="">Все города</option>
                      {Array.isArray(cities) &&
                        cities.map(city => (
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
                      onChange={e =>
                        setFilters({
                          ...filters,
                          management_org_id: e.target.value ? Number(e.target.value) : null
                        })
                      }
                    >
                      <option value="">Все УК</option>
                      {Array.isArray(organizations) &&
                        organizations.map(org => (
                          <option key={org.id} value={org.id}>
                            {org.shortName || org.fullName}
                          </option>
                        ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Муниципальная организация</Form.Label>
                    <Form.Select
                      value={filters.municipality_org_id || ''}
                      onChange={e =>
                        setFilters({
                          ...filters,
                          municipality_org_id: e.target.value ? Number(e.target.value) : null
                        })
                      }
                    >
                      <option value="">Все муниципальные организации</option>
                      {Array.isArray(organizations) &&
                        organizations.map(org => (
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
                    <Form.Label>Тип дома</Form.Label>
                    <Form.Select
                      value={filters.house_type_id || ''}
                      onChange={e =>
                        setFilters({
                          ...filters,
                          house_type_id: e.target.value ? Number(e.target.value) : null
                        })
                      }
                    >
                      <option value="">Все типы домов</option>
                      {Array.isArray(houseTypes) &&
                        houseTypes.map(type => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Состояние дома</Form.Label>
                    <Form.Select
                      value={filters.house_condition_id || ''}
                      onChange={e =>
                        setFilters({
                          ...filters,
                          house_condition_id: e.target.value ? Number(e.target.value) : null
                        })
                      }
                    >
                      <option value="">Все состояния</option>
                      {Array.isArray(houseConditions) &&
                        houseConditions.map(condition => (
                          <option key={condition.id} value={condition.id}>
                            {condition.houseCondition}
                          </option>
                        ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Год постройки</Form.Label>
                    <Form.Select
                      value={filters.buildingYear || ''}
                      onChange={e =>
                        setFilters({
                          ...filters,
                          buildingYear: e.target.value || null
                        })
                      }
                    >
                      <option value="">Все года</option>
                      {yearBuiltOptions.map(year => (
                        <option key={year} value={year}>
                          {year}
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
      <Row>
        <Col sm={12}>
          <Card>
            <Card.Body>
              {error && <div className="alert alert-danger" role="alert">{error}</div>}
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
                  <div id="map" ref={mapRef} className="map" style={{ width: '100%', height: '600px' }} />
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>{selectedItem && getFormattedAddress(selectedItem)}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedItem && (
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
                    <span
                      className={`badge ${
                        selectedItem.house_condition?.houseCondition === 'Неисправный' ? 'bg-warning' : 'bg-success'
                      } me-2`}
                    >
                      Состояние
                    </span>
                    <span
                      className={
                        selectedItem.house_condition?.houseCondition === 'Неисправный' ? 'text-warning' : 'text-success'
                      }
                    >
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
              <div className="mb-4 p-3 border-start border-4 border-info bg-light">
                <div className="d-flex align-items-center mb-3">
                  <i className="fas fa-building me-2 text-info fs-4" />
                  <div className="w-100">
                    <strong>Управляющая компания:</strong>
                    <br />
                    <div className="d-flex justify-content-between align-items-center flex-wrap">
                      <span>{selectedItem.management_org?.shortName || selectedItem.management_org?.fullName || 'Не указана'}</span>
                      {selectedItem.management_org?.url && (
                        <a
                          href={
                            selectedItem.management_org.url.startsWith('http')
                              ? selectedItem.management_org.url
                              : `https://${selectedItem.management_org.url}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-primary mt-1"
                        >
                          <i className="fas fa-external-link-alt me-1" /> Сайт
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="row mt-2">
                  <div className="col-md-6">
                    <small className="text-muted d-block mb-1">ИНН:</small>
                    <div className="fw-bold">{selectedItem.management_org?.inn || 'Не указан'}</div>
                  </div>
                  <div className="col-md-6">
                    <small className="text-muted d-block mb-1">ОГРН:</small>
                    <div className="fw-bold">{selectedItem.management_org?.ogrn || 'Не указан'}</div>
                  </div>
                </div>
                <div className="row mt-2">
                  <div className="col-md-6">
                    <small className="text-muted d-block mb-1">Телефон:</small>
                    <div className="fw-bold">{selectedItem.management_org?.phone || 'Не указан'}</div>
                  </div>
                  <div className="col-md-6">
                    <small className="text-muted d-block mb-1">Адрес:</small>
                    <div className="fw-bold">{selectedItem.management_org?.orgAddress || 'Не указан'}</div>
                  </div>
                </div>
              </div>
              <div className="mb-4 p-3 border-start border-4 border-warning bg-light">
                <div className="d-flex align-items-center mb-3">
                  <i className="fas fa-city me-2 text-warning fs-4" />
                  <div className="w-100">
                    <strong>Муниципальная организация:</strong>
                    <br />
                    <div className="d-flex justify-content-between align-items-center flex-wrap">
                      <span>{selectedItem.municipality_org?.shortName || selectedItem.municipality_org?.fullName || 'Не указана'}</span>
                      {selectedItem.municipality_org?.url && (
                        <a
                          href={
                            selectedItem.municipality_org.url.startsWith('http')
                              ? selectedItem.municipality_org.url
                              : `https://${selectedItem.municipality_org.url}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-primary mt-1"
                        >
                          <i className="fas fa-external-link-alt me-1" /> Сайт
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="row mt-2">
                  <div className="col-md-6">
                    <small className="text-muted d-block mb-1">ИНН:</small>
                    <div className="fw-bold">{selectedItem.municipality_org?.inn || 'Не указан'}</div>
                  </div>
                  <div className="col-md-6">
                    <small className="text-muted d-block mb-1">ОГРН:</small>
                    <div className="fw-bold">{selectedItem.municipality_org?.ogrn || 'Не указан'}</div>
                  </div>
                </div>
                <div className="row mt-2">
                  <div className="col-md-6">
                    <small className="text-muted d-block mb-1">Телефон:</small>
                    <div className="fw-bold">{selectedItem.municipality_org?.phone || 'Не указан'}</div>
                  </div>
                  <div className="col-md-6">
                    <small className="text-muted d-block mb-1">Адрес:</small>
                    <div className="fw-bold">{selectedItem.municipality_org?.orgAddress || 'Не указан'}</div>
                  </div>
                </div>
              </div>
              {selectedItem.planSeries && (
                <div className="mb-4 p-3 border-start border-4 border-secondary bg-light">
                  <strong>Серия проекта:</strong> {selectedItem.planSeries}
                </div>
              )}
              {selectedItem.entrance_count && (
                <div className="mb-4 p-3 border-start border-4 border-secondary bg-light">
                  <strong>Количество подъездов:</strong> {selectedItem.entrance_count}
                </div>
              )}
              {(selectedItem.planned_connection_date || selectedItem.planned_disconnection_date) && (
                <div className="mb-4">
                  <h6 className="text-primary mb-3">Отопительный период</h6>
                  <div className="card">
                    <div className="card-body">
                      <div className="row">
                        <div className="col-md-6">
                          <div className="d-flex align-items-center">
                            <i className="fas fa-calendar-alt me-2 text-success" />
                            <div>
                              <small className="text-muted">Плановая дата включения</small>
                              <div>{selectedItem.planned_connection_date ? formatDate(selectedItem.planned_connection_date) : 'Не указана'}</div>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="d-flex align-items-center">
                            <i className="fas fa-calendar-check me-2 text-danger" />
                            <div>
                              <small className="text-muted">Плановая дата отключения</small>
                              <div>{selectedItem.planned_disconnection_date ? formatDate(selectedItem.planned_disconnection_date) : 'Не указана'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="row mt-3">
                        <div className="col-md-6">
                          <div className="d-flex align-items-center">
                            <i className="fas fa-calendar-alt me-2 text-success" />
                            <div>
                              <small className="text-muted">Фактическая дата включения</small>
                              <div>{selectedItem.actual_connection_date ? formatDate(selectedItem.actual_connection_date) : 'Не указана'}</div>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="d-flex align-items-center">
                            <i className="fas fa-calendar-check me-2 text-danger" />
                            <div>
                              <small className="text-muted">Фактическая дата отключения</small>
                              <div>{selectedItem.actual_disconnection_date ? formatDate(selectedItem.actual_disconnection_date) : 'Не указана'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="row mt-3">
                <div className="col-md-6">
                  <small className="text-muted">
                    <i className="far fa-calendar-plus me-1" />
                    Создан: {formatDate(selectedItem.created_at)}
                  </small>
                </div>
                <div className="col-md-6">
                  <small className="text-muted">
                    <i className="far fa-calendar-alt me-1" />
                    Обновлен: {formatDate(selectedItem.updated_at)}
                  </small>
                </div>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Закрыть
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showClusterModal} onHide={handleCloseClusterModal} size="lg" backdrop="static">
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>Дома в данной точке ({clusterBuildings.length})</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {clusterBuildings.length > 0 ? (
            <div className="cluster-items-list">
              {clusterBuildings.map(building => (
                <div
                  key={building.id}
                  className="cluster-item p-3 mb-3 border rounded cursor-pointer"
                  onClick={() => handleSelectClusterItem(building.id)}
                >
                  <h5 className="text-primary">{getFormattedAddress(building)}</h5>
                  <div className="d-flex flex-wrap gap-2 mb-2">
                    <div className="badge bg-primary me-1">{building.house_type?.houseTypeName || 'Тип не указан'}</div>
                    <div
                      className={`badge ${
                        building.house_condition?.houseCondition === 'Неисправный' ? 'bg-warning' : 'bg-success'
                      } me-1`}
                    >
                      {building.house_condition?.houseCondition || 'Состояние не указано'}
                    </div>
                  </div>
                  <div className="mb-2">
                    <strong>УК:</strong> {building.management_org?.shortName || building.management_org?.fullName || 'Не указана'}
                    {building.management_org?.inn && <span className="ms-2 small">ИНН: {building.management_org.inn}</span>}
                  </div>
                  <div className="mb-2">
                    <strong>Год постройки:</strong> {building.buildingYear || 'Не указан'}
                    {building.cadastreNumber && (
                      <span className="ms-3">
                        <strong>Кадастровый номер:</strong> {building.cadastreNumber}
                      </span>
                    )}
                  </div>
                  <div className="d-flex justify-content-between align-items-center mt-2">
                    <small className="text-muted">Обновлен: {formatDate(building.updated_at)}</small>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation()
                        handleSelectClusterItem(building.id)
                      }}
                    >
                      Подробнее
                    </Button>
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
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
        <Toast show={showNotification} onClose={() => setShowNotification(false)} delay={5000} autohide bg="info">
          <Toast.Header>
            <strong className="me-auto">Уведомление</strong>
          </Toast.Header>
          <Toast.Body className="text-white">{notificationMessage}</Toast.Body>
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
      `}</style>
    </React.Fragment>
  )
}

export default MkdMap
