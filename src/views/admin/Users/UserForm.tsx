import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Spinner, InputGroup, Tab, Tabs, Alert } from 'react-bootstrap';
import { SettingsUser, Role, Permission, Organization } from '../../../services/api';
import PhoneInput from './PhoneInput';

interface UserFormProps {
  user?: SettingsUser;
  roles: Role[];
  permissions: Record<string, Permission[]>;
  organizations: Organization[]; 
  loading: boolean;
  onSubmit: (formData: any) => void;
  onCancel: () => void;
}

const UserForm: React.FC<UserFormProps> = ({
  user,
  roles,
  permissions,
  organizations,
  loading,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    login: '',
    phone: '',
    email: '',
    telegram: '',
    vk: '',
    org_id: '' as number | '',
    password: '',
    password_confirmation: '',
    role_ids: [] as number[],
    permission_ids: [] as number[]
  });

  const [roleFilter, setRoleFilter] = useState('');
  const [permissionFilter, setPermissionFilter] = useState('');
  const [activeTab, setActiveTab] = useState('basic');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        middle_name: user.middle_name || '',
        login: user.login || '',
        phone: user.phone || '',
        email: user.email || '',
        telegram: user.telegram || '',
        vk: user.vk || '',
        org_id: user.org_id || '',
        password: '',
        password_confirmation: '',
        role_ids: user.roles?.map(role => role.id) || [],
        permission_ids: user.permissions?.map(permission => permission.id) || []
      });
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        middle_name: '',
        login: '',
        phone: '',
        email: '',
        telegram: '',
        vk: '',
        org_id: '',
        password: '',
        password_confirmation: '',
        role_ids: [],
        permission_ids: []
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    setFormData(prev => ({
      ...prev,
      [name]: name === 'org_id' && value ? parseInt(value, 10) : value
    }));
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked, value } = e.target;
    const roleId = parseInt(value);

    setFormData(prev => ({
      ...prev,
      role_ids: checked
        ? [...prev.role_ids, roleId]
        : prev.role_ids.filter(id => id !== roleId)
    }));
    
    // Убираем ошибку при выборе роли
    if (checked && validationErrors.roles) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.roles;
        return newErrors;
      });
    }
  };

  const handlePermissionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked, value } = e.target;
    const permissionId = parseInt(value);

    setFormData(prev => ({
      ...prev,
      permission_ids: checked
        ? [...prev.permission_ids, permissionId]
        : prev.permission_ids.filter(id => id !== permissionId)
    }));
    
    // Убираем ошибку при выборе разрешения
    if (checked && validationErrors.roles) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.roles;
        return newErrors;
      });
    }
  };

  const filteredRoles = roles.filter(role =>
    !roleFilter || role.name.toLowerCase().includes(roleFilter.toLowerCase())
  );

  const getAllPermissions = () => Object.values(permissions).flat();

  const filteredPermissionIds = permissionFilter
    ? getAllPermissions()
        .filter(permission =>
          permission.name.toLowerCase().includes(permissionFilter.toLowerCase())
        )
        .map(permission => permission.id)
    : [];

  // Подсветка вкладок с ошибками
  const hasBasicTabErrors = () => {
    const basicFields = ['last_name', 'first_name', 'login', 'org_id', 'email', 'password', 'password_confirmation', 'phone'];
    return basicFields.some(field => !!validationErrors[field]);
  };

  const hasRolesTabErrors = () => {
    return !!validationErrors.roles;
  };

  // Функция валидации телефона (более гибкая)
  const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // Пустое значение допустимо, если не обязательно
    
    // Проверяем формат телефона
    // Должно быть 11 цифр (с кодом страны) и начинаться с 7
    const digitsOnly = phone.replace(/\D/g, '');
    
    if (digitsOnly.length === 11 && digitsOnly.charAt(0) === '7') {
      return true;
    }
    
    return false;
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Проверяем обязательные поля
    if (!formData.last_name.trim()) {
      errors.last_name = 'Фамилия обязательна';
    }
    
    if (!formData.first_name.trim()) {
      errors.first_name = 'Имя обязательно';
    }
    
    if (!formData.login.trim()) {
      errors.login = 'Логин обязателен';
    }
    
    if (!formData.org_id) {
      errors.org_id = 'Организация обязательна';
    }

    // Проверяем телефон
    if (formData.phone && !validatePhone(formData.phone)) {
      errors.phone = 'Телефон должен содержать 11 цифр и начинаться с 7';
    }

    // Проверяем email
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Некорректный формат Email';
    }

    // Проверяем пароль
    if (!user) {
      if (!formData.password) {
        errors.password = 'Пароль обязателен';
      }
      else if (formData.password.length < 6) {
        errors.password = 'Пароль должен быть не менее 6 символов';
      }
      else if (!/\d/.test(formData.password)) {
        errors.password = 'Пароль должен содержать хотя бы одну цифру';
      }
      
      if (formData.password !== formData.password_confirmation) {
        errors.password_confirmation = 'Пароли не совпадают';
      }
    } else if (formData.password) {
      if (formData.password.length < 6) {
        errors.password = 'Пароль должен быть не менее 6 символов';
      }
      else if (!/\d/.test(formData.password)) {
        errors.password = 'Пароль должен содержать хотя бы одну цифру';
      }
      
      if (formData.password !== formData.password_confirmation) {
        errors.password_confirmation = 'Пароли не совпадают';
      }
    }

    // Проверяем роли и разрешения
    if (formData.role_ids.length === 0 && formData.permission_ids.length === 0) {
      errors.roles = 'Выберите хотя бы одну роль';
      
      // Перейти на вкладку ролей, если нет ролей и пользователь находится на другой вкладке
      if (activeTab !== 'roles') {
        setActiveTab('roles');
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Если есть ошибки в основной вкладке, переключаемся на неё
      if (hasBasicTabErrors() && activeTab !== 'basic') {
        setActiveTab('basic');
      } else if (hasRolesTabErrors() && activeTab !== 'roles') {
        setActiveTab('roles');
      }
      return;
    }

    const dataToSend = { ...formData };
    // @ts-ignore

    if (user && !dataToSend.password) {
        // @ts-ignore
      delete dataToSend.password;
    }

    onSubmit(dataToSend);
  };

  return (
    <Card>
      <Card.Header>
        <h5 className="mb-0">{user ? 'Редактирование пользователя' : 'Добавление пользователя'}</h5>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Tabs
            id="user-form-tabs"
            activeKey={activeTab}
            onSelect={(k) => k && setActiveTab(k)}
            className="mb-4"
          >
            <Tab 
              eventKey="basic" 
              title={
                <span>
                  Основная информация
                  {hasBasicTabErrors() && <span className="text-danger ms-2">*</span>}
                </span>
              }
            >
              <div className="p-3">
                <Row>
                  <Col md={4} className="mb-3">
                    <Form.Group controlId="lastName">
                      <Form.Label>Фамилия <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        isInvalid={!!validationErrors.last_name}
                        disabled={loading}
                      />
                      <Form.Control.Feedback type="invalid">{validationErrors.last_name}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={4} className="mb-3">
                    <Form.Group controlId="firstName">
                      <Form.Label>Имя <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        isInvalid={!!validationErrors.first_name}
                        disabled={loading}
                      />
                      <Form.Control.Feedback type="invalid">{validationErrors.first_name}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={4} className="mb-3">
                    <Form.Group controlId="middleName">
                      <Form.Label>Отчество</Form.Label>
                      <Form.Control
                        type="text"
                        name="middle_name"
                        value={formData.middle_name}
                        onChange={handleChange}
                        disabled={loading}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6} className="mb-3">
                    <Form.Group controlId="organization">
                      <Form.Label>Организация <span className="text-danger">*</span></Form.Label>
                      <Form.Select
                        name="org_id"
                        value={formData.org_id}
                        onChange={handleChange}
                        isInvalid={!!validationErrors.org_id}
                        disabled={loading || organizations.length === 0}
                      >
                        <option value="">-- Выберите организацию --</option>
                        {organizations.map(org => (
                          <option key={org.id} value={org.id}>
                            {org.shortName || org.fullName}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">{validationErrors.org_id}</Form.Control.Feedback>
                      {organizations.length === 0 && !loading && (
                         <Form.Text className="text-danger">Список организаций не загружен.</Form.Text>
                      )}
                    </Form.Group>
                  </Col>
                  <Col md={6} className="mb-3">
                    <Form.Group controlId="phone">
                      <Form.Label>Телефон</Form.Label>
                      <PhoneInput
                        value={formData.phone}
                        onChange={handleChange}
                        disabled={loading}
                        isInvalid={!!validationErrors.phone}
                      />
                      <Form.Control.Feedback type="invalid">{validationErrors.phone}</Form.Control.Feedback>
                      <Form.Text className="text-muted">Формат: +7(XXX)XXX-XX-XX</Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                   <Col md={6} className="mb-3">
                    <Form.Group controlId="login">
                      <Form.Label>Логин <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="login"
                        value={formData.login}
                        onChange={handleChange}
                        isInvalid={!!validationErrors.login}
                        disabled={loading}
                      />
                      <Form.Control.Feedback type="invalid">{validationErrors.login}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6} className="mb-3">
                     <Form.Group controlId="email">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        isInvalid={!!validationErrors.email}
                        disabled={loading}
                      />
                       <Form.Control.Feedback type="invalid">{validationErrors.email}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                   <Col md={6} className="mb-3">
                     <Form.Group controlId="telegram">
                      <Form.Label>Telegram</Form.Label>
                       <InputGroup>
                         <InputGroup.Text>@</InputGroup.Text>
                          <Form.Control
                            type="text"
                            name="telegram"
                            placeholder="username"
                            value={formData.telegram}
                            onChange={handleChange}
                            disabled={loading}
                          />
                       </InputGroup>
                    </Form.Group>
                  </Col>
                   <Col md={6} className="mb-3">
                     <Form.Group controlId="vk">
                      <Form.Label>VK</Form.Label>
                       <InputGroup>
                         <InputGroup.Text>vk.com/</InputGroup.Text>
                          <Form.Control
                            type="text"
                            name="vk"
                            placeholder="id_или_короткое_имя"
                            value={formData.vk}
                            onChange={handleChange}
                            disabled={loading}
                          />
                       </InputGroup>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6} className="mb-3">
                    <Form.Group controlId="password">
                      <Form.Label>{user ? 'Новый пароль' : 'Пароль'} {!user && <span className="text-danger">*</span>}</Form.Label>
                      <Form.Control
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        isInvalid={!!validationErrors.password}
                        disabled={loading}
                        autoComplete="new-password"
                      />
                      <Form.Control.Feedback type="invalid">{validationErrors.password}</Form.Control.Feedback>
                      {user && <Form.Text className="text-muted">Оставьте пустым, если не хотите менять пароль</Form.Text>}
                    </Form.Group>
                  </Col>
                  <Col md={6} className="mb-3">
                    <Form.Group controlId="passwordConfirmation">
                      <Form.Label>Подтверждение пароля {!user && <span className="text-danger">*</span>}</Form.Label>
                      <Form.Control
                        type="password"
                        name="password_confirmation"
                        value={formData.password_confirmation}
                        onChange={handleChange}
                        isInvalid={!!validationErrors.password_confirmation}
                        disabled={loading}
                        autoComplete="new-password"
                      />
                      <Form.Control.Feedback type="invalid">{validationErrors.password_confirmation}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>
              </div>
            </Tab>

            <Tab 
              eventKey="roles" 
              title={
                <span>
                  Роли
                  {hasRolesTabErrors() && <span className="text-danger ms-2">*</span>}
                </span>
              }
            >
              <div className="p-3">
                {validationErrors.roles && (
                  <Alert variant="danger" className="mb-3">
                    {validationErrors.roles}
                  </Alert>
                )}
                <InputGroup className="mb-3">
                  <InputGroup.Text><i className="ph-duotone ph-magnifying-glass"></i></InputGroup.Text>
                  <Form.Control
                    placeholder="Поиск ролей..."
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  />
                </InputGroup>
                <div className="border rounded p-3">
                  <Row>
                    {filteredRoles.length === 0 ? (
                      <Col className="text-center py-3"><p className="text-muted mb-0">Роли не найдены</p></Col>
                    ) : (
                      filteredRoles.map(role => (
                        <Col md={4} key={role.id} className="mb-2">
                          <Form.Check
                            type="checkbox"
                            id={`role-${role.id}`}
                            label={role.name}
                            value={role.id}
                            checked={formData.role_ids.includes(role.id)}
                            onChange={handleRoleChange}
                            disabled={loading}
                          />
                        </Col>
                      ))
                    )}
                  </Row>
                </div>
              </div>
            </Tab>
            <Tab eventKey="permissions" title="Доступы">
              <div className="p-3">
                <Alert variant="info">
                  Здесь можно назначить прямые доступы, не зависящие от ролей.
                </Alert>
                <InputGroup className="mb-3">
                  <InputGroup.Text><i className="ph-duotone ph-magnifying-glass"></i></InputGroup.Text>
                  <Form.Control
                    placeholder="Поиск доступов..."
                    value={permissionFilter}
                    onChange={(e) => setPermissionFilter(e.target.value)}
                  />
                </InputGroup>
                <div className="border rounded p-3">
                  {Object.entries(permissions).map(([groupName, groupPermissions]) => {
                    const filteredGroupPermissions = permissionFilter
                      ? groupPermissions.filter(permission => filteredPermissionIds.includes(permission.id))
                      : groupPermissions;
                    if (filteredGroupPermissions.length === 0) return null;
                    return (
                      <div key={groupName} className="mb-4">
                        <h5 className="mb-3 border-bottom pb-2">{groupName}</h5>
                        <Row>
                          {filteredGroupPermissions.map(permission => (
                            <Col md={6} lg={4} key={permission.id} className="mb-2">
                              <Form.Check
                                type="checkbox"
                                id={`permission-${permission.id}`}
                                label={permission.name}
                                value={permission.id}
                                checked={formData.permission_ids.includes(permission.id)}
                                onChange={handlePermissionChange}
                                disabled={loading}
                              />
                            </Col>
                          ))}
                        </Row>
                      </div>
                    );
                  })}
                  {permissionFilter && filteredPermissionIds.length === 0 && (
                    <div className="text-center py-3"><p className="text-muted mb-0">Доступы не найдены</p></div>
                  )}
                </div>
              </div>
            </Tab>
          </Tabs>

          <div className="d-flex gap-2 justify-content-end mt-4">
            <Button variant="secondary" onClick={onCancel} disabled={loading}>
              Отмена
            </Button>
            <Button variant="primary" type="submit" disabled={loading} className="submit-user-btn">
              {loading && <Spinner as="span" animation="border" size="sm" className="me-2" />}
              {user ? 'Сохранить изменения' : 'Создать пользователя'}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default UserForm;