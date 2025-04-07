import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Spinner, InputGroup, Alert } from 'react-bootstrap';
import { Role, Permission, createRole, updateRole } from '../../../services/api';

interface RoleFormProps {
  role?: Role;
  permissions: Record<string, Permission[]>;
  loading: boolean;
  onSubmit: (formData: any) => void;
  onCancel: () => void;
}

const RoleForm: React.FC<RoleFormProps> = ({ role, permissions, loading, onSubmit, onCancel }) => {
  // Состояние формы
  const [formData, setFormData] = useState({
    name: '',
    permissions: [] as string[]
  });

  // Состояние фильтра для поиска доступов
  const [permissionFilter, setPermissionFilter] = useState('');
  
  // Состояние ошибок валидации
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Инициализация формы при изменении роли
  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name || '',
        permissions: role.permissions?.map(permission => permission.slug) || []
      });
    } else {
      // Сброс формы для новой роли
      setFormData({
        name: '',
        permissions: []
      });
    }
  }, [role]);

  // Обработчик изменения полей формы
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Очищаем ошибку валидации при изменении поля
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Обработчик изменения чекбоксов доступов
  const handlePermissionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked, value } = e.target;
    
    setFormData(prev => {
      if (checked) {
        // Добавляем доступ
        return {
          ...prev,
          permissions: [...prev.permissions, value]
        };
      } else {
        // Удаляем доступ
        return {
          ...prev,
          permissions: prev.permissions.filter(slug => slug !== value)
        };
      }
    });
  };

  // Фильтрация всех разрешений (для поиска)
  const getAllPermissions = () => {
    const allPermissions: Permission[] = [];
    
    // Собираем все разрешения из всех групп
    Object.values(permissions).forEach(groupPermissions => {
      if (Array.isArray(groupPermissions)) {
        allPermissions.push(...groupPermissions);
      }
    });
    
    return allPermissions;
  };

  // Фильтрация доступов по имени или слагу
  const filteredPermissionSlugs = permissionFilter 
    ? getAllPermissions()
        .filter(permission => 
          permission.name.toLowerCase().includes(permissionFilter.toLowerCase()) ||
          permission.slug.toLowerCase().includes(permissionFilter.toLowerCase())
        )
        .map(permission => permission.slug)
    : [];

  // Валидация формы перед отправкой
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Проверяем название роли
    if (!formData.name.trim()) {
      errors.name = 'Название роли обязательно';
    }
    
    // Проверяем, выбрано ли хотя бы одно разрешение
    if (formData.permissions.length === 0) {
      errors.permissions = 'Выберите хотя бы одно разрешение';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Отправка формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Проверяем форму перед отправкой
    if (!validateForm()) {
      return;
    }
    
    const submitData = {
      onSubmit: async () => {
        if (role) {
          // Обновление существующей роли
          await updateRole(role.id, {
            name: formData.name,
            permissions: formData.permissions
          });
        } else {
          // Создание новой роли
          await createRole({
            name: formData.name,
            permissions: formData.permissions
          });
        }
      }
    };
    
    // Вызываем родительскую функцию с данными для отправки
    onSubmit(submitData);
  };

  return (
    <Form onSubmit={handleSubmit}>
      <div className="mb-4">
        <Form.Group controlId="roleName" className="mb-3">
          <Form.Label>Название роли <span className="text-danger">*</span></Form.Label>
          <Form.Control
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            isInvalid={!!validationErrors.name}
            disabled={loading}
            placeholder="Введите название роли"
          />
          <Form.Control.Feedback type="invalid">
            {validationErrors.name}
          </Form.Control.Feedback>
          <Form.Text className="text-muted">
            Системное имя (slug) будет сгенерировано автоматически на основе названия
          </Form.Text>
        </Form.Group>
      </div>

      <div className="mb-4">
        <h5 className="mb-3">Разрешения <span className="text-danger">*</span></h5>
        
        {validationErrors.permissions && (
          <Alert variant="danger" className="mb-3">
            {validationErrors.permissions}
          </Alert>
        )}
        
        <InputGroup className="mb-3">
          <InputGroup.Text>
            <i className="ph-duotone ph-magnifying-glass"></i>
          </InputGroup.Text>
          <Form.Control
            placeholder="Поиск разрешений..."
            value={permissionFilter}
            onChange={(e) => setPermissionFilter(e.target.value)}
          />
        </InputGroup>
        
        <div className="border rounded p-3" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {/* Вывод разрешений по группам, как они приходят с бэкенда */}
          {Object.entries(permissions).map(([groupName, groupPermissions]) => {
            // Проверяем, что groupPermissions - это массив
            if (!Array.isArray(groupPermissions)) {
              return null;
            }
            
            // Если есть фильтр, проверяем наличие соответствующих разрешений в группе
            const filteredGroupPermissions = permissionFilter
              ? groupPermissions.filter(permission => 
                  filteredPermissionSlugs.includes(permission.slug)
                )
              : groupPermissions;
            
            // Если нет разрешений, соответствующих фильтру, пропускаем эту группу
            if (filteredGroupPermissions.length === 0) {
              return null;
            }
            
            return (
              <div key={groupName} className="mb-4">
                <h6 className="mb-3 border-bottom pb-2">
                  {groupName}
                </h6>
                
                <Row>
                  {filteredGroupPermissions.map(permission => (
                    <Col md={6} lg={4} key={permission.id} className="mb-2">
                      <Form.Check
                        type="checkbox"
                        id={`permission-${permission.id}`}
                        label={permission.name}
                        value={permission.slug}
                        checked={formData.permissions.includes(permission.slug)}
                        onChange={handlePermissionChange}
                        disabled={loading}
                      />
                    </Col>
                  ))}
                </Row>
              </div>
            );
          })}
          
          {/* Если нет прав, соответствующих фильтру */}
          {permissionFilter && filteredPermissionSlugs.length === 0 && (
            <div className="text-center py-3">
              <p className="text-muted mb-0">Разрешения не найдены</p>
            </div>
          )}
          
          {/* Если нет разрешений вообще */}
          {Object.keys(permissions).length === 0 && (
            <div className="text-center py-3">
              <p className="text-muted mb-0">Список разрешений пуст или еще загружается</p>
            </div>
          )}
        </div>
        
        <div className="mt-2">
          <Button
            variant="link"
            className="p-0 text-decoration-none"
            onClick={() => setFormData(prev => ({
              ...prev,
              permissions: getAllPermissions().map(p => p.slug)
            }))}
            disabled={loading}
          >
            Выбрать все
          </Button>
          {' | '}
          <Button
            variant="link"
            className="p-0 text-decoration-none"
            onClick={() => setFormData(prev => ({ ...prev, permissions: [] }))}
            disabled={loading}
          >
            Снять все
          </Button>
        </div>
      </div>
      
      <div className="d-flex gap-2 justify-content-end mt-4">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Отмена
        </Button>
        <Button variant="primary" type="submit" disabled={loading}>
          {loading && <Spinner as="span" animation="border" size="sm" className="me-2" />}
          {role ? 'Сохранить изменения' : 'Создать роль'}
        </Button>
      </div>
    </Form>
  );
};

export default RoleForm;