import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner } from 'react-bootstrap';
import {
  SettingsUser,
  Role,
  Permission,
  Organization, 
  getSettingsUsersList,
  getRolesList,
  getPermissionsList,
  getOrganizations, 
  createSettingsUser,
  updateSettingsUser,
  getSettingsUserDetails,
  deleteSettingsUser
} from '../../../services/api';
import usePermission from "../../../hooks/usePermission";
import UsersList from './UsersList';
import UserForm from './UserForm';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<SettingsUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Record<string, Permission[]>>({});
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedUser, setSelectedUser] = useState<SettingsUser | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<number | null>(null);

  const { hasAccess: hasAdminAccess, loading: permissionLoading } = usePermission('admin_users');

  useEffect(() => {
    if (hasAdminAccess) {
      loadAllData();
    }
  }, [hasAdminAccess]);
  
  // Отложенное значение поискового запроса с использованием useRef для хранения таймера
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Эффект для обработки изменения поискового запроса с debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      // Запускаем поиск после задержки
      loadAllData();
    }, 500);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [usersData, rolesData, permissionsData, organizationsData] = await Promise.all([
        getSettingsUsersList(searchTerm || undefined, roleFilter || undefined),
        getRolesList(),
        getPermissionsList(),
        getOrganizations()
      ]);

      // Обработка данных о пользователях - проверка на пагинацию
      let usersArray: SettingsUser[];
      
      // @ts-ignore - игнорируем ошибку доступа к .data, т.к. мы проверяем это динамически
      if (usersData && typeof usersData === 'object' && Array.isArray(usersData.data)) {
        // @ts-ignore
        usersArray = usersData.data;
      } else if (Array.isArray(usersData)) {
        usersArray = usersData;
      } else {
        usersArray = [];
        console.error('Неожиданный формат данных пользователей:', usersData);
      }
      
      // Форматируем телефоны и обрабатываем null значения
      const formattedUsers = usersArray.map(user => ({
        ...user,
        phone: user.phone || ''
      }));

      setUsers(formattedUsers);
      setRoles(rolesData);
      setOrganizations(organizationsData);

      // Обработка данных разрешений
      if (permissionsData && typeof permissionsData === 'object' && !Array.isArray(permissionsData)) {
        setPermissions(permissionsData);
      } else {
         const groupedPermissions: Record<string, Permission[]> = {};
         if (Array.isArray(permissionsData)) {
           permissionsData.forEach(p => {
             const group = 'Общие';
             if (!groupedPermissions[group]) {
               groupedPermissions[group] = [];
             }
             groupedPermissions[group].push(p);
           });
           setPermissions(groupedPermissions);
         } else {
            console.warn('Неожиданный формат данных разрешений:', permissionsData);
            setPermissions({});
         }
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  // Функция для обработки поиска - теперь устанавливает значение без вызова loadAllData
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    // Запрос будет выполнен через setTimeout в useEffect
  };

  // Функция для обработки фильтра по роли
  const handleRoleFilter = (roleId: number | null) => {
    setRoleFilter(roleId);
    loadAllData();
  };

  const handleAddUser = () => {
    setSelectedUser(null);
    setIsFormVisible(true);
    setError(null); // Сбрасываем ошибки при открытии формы
  };

  const handleEditUser = async (user: SettingsUser) => {
    setFormLoading(true);
    setError(null); // Сбрасываем ошибки при открытии формы
    
    try {
      // Загружаем детальную информацию о пользователе с сервера
      const detailedUser = await getSettingsUserDetails(user.id);
      setSelectedUser(detailedUser);
      setIsFormVisible(true);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки данных пользователя');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    setLoading(true);
    try {
      await deleteSettingsUser(userId);
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      setSuccess('Пользователь успешно удален');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Ошибка удаления пользователя');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitUserForm = async (formData: any) => {
    setFormLoading(true);
    setError(null);

    try {
      // Создаем объект с обязательными полями
      const userData: any = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        middle_name: formData.middle_name || '',
        login: formData.login,
        phone: formData.phone || '',
        email: formData.email || '',
        telegram: formData.telegram || '',
        vk: formData.vk || '',
        org_id: formData.org_id
      };

      // Бэкенд требует правильные имена для полей пароля
      if (formData.password) {
        userData.password = formData.password;
        userData.password_confirmation = formData.password_confirmation;
      }

      const roleIds = formData.role_ids || [];
      const rolesSlugs = roleIds.map((id: number) => roles.find(r => r.id === id)?.slug).filter(Boolean);

      const permissionIds = formData.permission_ids || [];
      const allPermissionsList = Object.values(permissions).flat();
      const permissionSlugs = permissionIds.map((id: number) => allPermissionsList.find(p => p.id === id)?.slug).filter(Boolean);

      userData.roles = rolesSlugs;
      userData.permissions = permissionSlugs.length > 0 ? permissionSlugs : [];

      if (selectedUser) {
        const updatedUser = await updateSettingsUser(selectedUser.id, userData);
        
        const formattedUser: SettingsUser = {
          ...updatedUser,
          phone: updatedUser.phone || ''
        };
        
        setUsers(prevUsers => prevUsers.map(user => user.id === formattedUser.id ? formattedUser : user));
        setSuccess('Пользователь успешно обновлен');
        
        setIsFormVisible(false);
        setSelectedUser(null);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const newUser = await createSettingsUser(userData);
        
        const formattedUser: SettingsUser = {
          ...newUser,
          phone: newUser.phone || ''
        };
        
        setUsers(prevUsers => [...prevUsers, formattedUser]);
        setSuccess('Пользователь успешно создан');
        
        setIsFormVisible(false);
        setSelectedUser(null);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      // Показываем сообщение об ошибке пользователю
      setError(err.message || 'Ошибка сохранения пользователя');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancelForm = () => {
    setIsFormVisible(false);
    setSelectedUser(null);
    setError(null);
  };

  if (permissionLoading) {
    return (
      <Container className="py-4 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Проверка прав доступа...</p>
      </Container>
    );
  }

  if (!hasAdminAccess) {
    return (
      <Container className="py-4">
        <Alert variant="danger">
          <Alert.Heading>Доступ запрещен</Alert.Heading>
          <p>У вас нет необходимых прав для доступа к этой странице.</p>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>Управление пользователями</h2>
          <p className="text-muted">
            Добавление, редактирование и удаление пользователей, управление ролями и доступами.
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

      {isFormVisible ? (
        <UserForm
          user={selectedUser || undefined}
          roles={roles}
          permissions={permissions}
          organizations={organizations}
          onSubmit={handleSubmitUserForm}
          onCancel={handleCancelForm}
          loading={formLoading}
        />
      ) : (
        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Список пользователей</h5>
            <Button variant="primary" onClick={handleAddUser}>
              <i className="ph-duotone ph-user-plus me-2"></i>
              Добавить пользователя
            </Button>
          </Card.Header>
          <Card.Body>
            <UsersList
              users={users}
              roles={roles}
              permissions={permissions}
              organizations={organizations}
              loading={loading}
              onEdit={handleEditUser}
              onDelete={handleDeleteUser}
              onSearch={handleSearch}
              onRoleFilter={handleRoleFilter}
              searchTerm={searchTerm}
              roleFilter={roleFilter}
            />
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default UserManagement;