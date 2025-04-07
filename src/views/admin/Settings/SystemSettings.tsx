import React, { useState, useEffect, useRef } from 'react';
import { Container, Card, Row, Col, Form, Button, Alert, Spinner, Image } from 'react-bootstrap';
import usePermission from "../../../hooks/usePermission";
import { 
  getSettingsList, 
  updateSetting, 
  uploadLoginBackground, 
  SystemSetting
} from '../../../services/api';

const SystemSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploadingSetting, setUploadingSetting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Проверяем доступ через хук usePermission
  const { hasAccess, loading: permissionLoading } = usePermission('view_settings');

  // Загрузка настроек при монтировании компонента
  useEffect(() => {
    fetchSettings();
  }, []);

  // Загрузка настроек с сервера
  const fetchSettings = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getSettingsList();
      setSettings(data);
    } catch (err) {
      setError('Ошибка загрузки настроек системы');
    } finally {
      setLoading(false);
    }
  };

  // Обработка изменения значения настройки
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, id: number): void => {
    const { value } = e.target;
    
    setSettings(prevSettings => 
      prevSettings.map(setting => 
        setting.id === id ? { ...setting, value } : setting
      )
    );
  };

  // Сохранение настройки
  const handleSaveSetting = async (id: number): Promise<void> => {
    setError(null);
    setSuccess(null);
    
    const setting = settings.find(s => s.id === id);
    if (!setting) return;
    
    setSaving(true);
    
    try {
      await updateSetting(id, setting.value);
      setSuccess(`Настройка "${getSettingName(setting.key)}" успешно сохранена`);
      
      // Через 3 секунды убираем сообщение об успехе
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(`Ошибка сохранения настройки: ${err instanceof Error ? err.message : 'неизвестная ошибка'}`);
    } finally {
      setSaving(false);
    }
  };

  // Обработка загрузки изображения для фона страницы входа
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setError(null);
    setSuccess(null);
    setUploadingSetting('login_img');
    
    try {
      await uploadLoginBackground(file);
      
      // Обновляем список настроек, чтобы получить новый URL
      await fetchSettings();
      
      setSuccess('Изображение фона страницы входа успешно загружено');
      
      // Через 3 секунды убираем сообщение об успехе
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(`Ошибка загрузки изображения: ${err instanceof Error ? err.message : 'неизвестная ошибка'}`);
    } finally {
      setUploadingSetting(null);
      // Сбрасываем значение input file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Получение человекочитаемого названия настройки по ключу
  const getSettingName = (key: string): string => {
    const names: Record<string, string> = {
      'center_lat': 'Широта центра карты',
      'center_lng': 'Долгота центра карты',
      'south_west_lat': 'Широта юго-западной точки',
      'south_west_lng': 'Долгота юго-западной точки',
      'north_east_lat': 'Широта северо-восточной точки',
      'north_east_lng': 'Долгота северо-восточной точки',
      'login_img': 'Изображение фона страницы входа'
    };
    
    return names[key] || key;
  };
  
  // Получение настройки по ключу
  const getSetting = (key: string): SystemSetting | undefined => {
    return settings.find(setting => setting.key === key);
  };
  
  // Группировка настроек по категориям
  const mapSettings = (): { map: SystemSetting[], interface: SystemSetting[] } => {
    return {
      map: settings.filter(setting => 
        ['center_lat', 'center_lng', 'south_west_lat', 'south_west_lng', 
         'north_east_lat', 'north_east_lng'].includes(setting.key)
      ),
      interface: settings.filter(setting => 
        ['login_img'].includes(setting.key)
      )
    };
  };

  if (permissionLoading) {
    return (
      <Container className="py-4 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Проверка прав доступа...</p>
      </Container>
    );
  }

  if (!hasAccess) {
    return (
      <Container className="py-4">
        <Alert variant="danger">
          <Alert.Heading>Доступ запрещен</Alert.Heading>
          <p>У вас нет необходимых прав для доступа к этой странице.</p>
        </Alert>
      </Container>
    );
  }

  const groupedSettings = mapSettings();
  const loginImgSetting = getSetting('login_img');

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>Настройки системы</h2>
          <p className="text-muted">
            Управление основными параметрами системы
          </p>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Настройки карты */}
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">Настройки карты</h5>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">Загрузка настроек...</p>
            </div>
          ) : (
            <Form>
              <Row>
                {groupedSettings.map.map(setting => (
                  <Col md={6} key={setting.id} className="mb-3">
                    <Form.Group controlId={`setting-${setting.id}`}>
                      <Form.Label>{getSettingName(setting.key)}</Form.Label>
                      <div className="d-flex">
                        <Form.Control
                          type="text"
                          value={setting.value}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(e, setting.id)}
                        />
                        <Button 
                          variant="primary" 
                          className="ms-2"
                          onClick={() => handleSaveSetting(setting.id)}
                          disabled={saving}
                        >
                          {saving ? <Spinner as="span" animation="border" size="sm" /> : 'Сохранить'}
                        </Button>
                      </div>
                    </Form.Group>
                  </Col>
                ))}
              </Row>
            </Form>
          )}
        </Card.Body>
      </Card>

      {/* Настройки интерфейса */}
      <Card>
        <Card.Header>
          <h5 className="mb-0">Настройки интерфейса</h5>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">Загрузка настроек...</p>
            </div>
          ) : (
            <Form>
              <Row>
                <Col md={6} className="mb-3">
                  <Form.Group controlId="loginBackground">
                    <Form.Label>Изображение фона страницы входа</Form.Label>
                    {loginImgSetting && loginImgSetting.value && (
                      <div className="mb-3">
                        <Image 
                          src={loginImgSetting.value} 
                          alt="Фон страницы входа" 
                          thumbnail 
                          style={{ maxHeight: '200px' }}
                        />
                      </div>
                    )}
                    <div className="d-flex">
                      <Form.Control
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        ref={fileInputRef}
                      />
                      {uploadingSetting === 'login_img' && (
                        <Spinner animation="border" size="sm" className="ms-2 mt-2" />
                      )}
                    </div>
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default SystemSettingsPage;