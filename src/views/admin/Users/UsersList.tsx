import React from 'react';
import { Table, Button, Spinner, Badge, OverlayTrigger, Tooltip, Form, InputGroup } from 'react-bootstrap';
import { SettingsUser, Role, Permission, Organization } from '../../../services/api';

// Интерфейс для пагинированного ответа API
interface PaginatedResponse<T> {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  links: {
    url: string | null;
    label: string;
    active: boolean;
  }[];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

interface UsersListProps {
  users: SettingsUser[] | PaginatedResponse<SettingsUser>;
  roles: Role[];
  permissions: Record<string, Permission[]>;
  organizations: Organization[];
  loading: boolean;
  onEdit: (user: SettingsUser) => void;
  onDelete: (userId: number) => void;
  onSearch: (term: string) => void;
  onRoleFilter: (roleId: number | null) => void;
  searchTerm: string;
  roleFilter: number | null;
}

const UsersList: React.FC<UsersListProps> = ({ 
  users = [], 
  roles = [], 
  permissions = {}, 
  organizations = [], 
  loading, 
  onEdit, 
  onDelete,
  onSearch,
  onRoleFilter,
  searchTerm,
  roleFilter
}) => {
  
  const renderUserRoles = (user: SettingsUser) => {
    if (!user.roles || user.roles.length === 0) {
      return <Badge bg="light" text="dark">Нет ролей</Badge>;
    }
    return user.roles.map((role, index) => (
      <Badge key={index} bg="primary" className="me-1 mb-1">
        {role.name}
      </Badge>
    ));
  };

  const renderUserPermissions = (user: SettingsUser) => {
    if (!user.permissions || user.permissions.length === 0) {
      return <Badge bg="light" text="dark">Нет прямых доступов</Badge>;
    }

    const permissionsByGroup: Record<string, Permission[]> = {};
    const allPermissionsList = Object.values(permissions).flat();

    user.permissions?.forEach(permission => {
      let foundGroup = '';
      for (const [groupName, groupPermissions] of Object.entries(permissions)) {
        if (groupPermissions.some(p => p.id === permission.id)) {
          foundGroup = groupName;
          break;
        }
      }
      const fullPermission = allPermissionsList.find(p => p.id === permission.id) || permission;
      const group = foundGroup || 'Другое';

      if (!permissionsByGroup[group]) {
        permissionsByGroup[group] = [];
      }
      permissionsByGroup[group].push(fullPermission);
    });

    return Object.entries(permissionsByGroup).map(([group, groupPermissions], index) => (
      <OverlayTrigger
        key={index}
        placement="top"
        overlay={
          <Tooltip>
            <div className="text-start">
              {groupPermissions.map(p => p.name).join(', ')}
            </div>
          </Tooltip>
        }
      >
        <Badge bg="info" className="me-1 mb-1">
          {group}: {groupPermissions.length}
        </Badge>
      </OverlayTrigger>
    ));
  };

  const getUserFullName = (user: SettingsUser) => {
    const names = [user.last_name, user.first_name, user.middle_name].filter(Boolean);
    return names.join(' ') || 'Не указано';
  };

  const getOrganizationName = (orgId: number | null | undefined) => {
    if (!orgId) return 'Не указана';
    const organization = organizations.find(org => org.id === orgId);
    return organization ? (organization.shortName || organization.fullName) : `ID: ${orgId}`;
  };

  // Проверяем, является ли объект пагинированным ответом API
  const isPaginatedResponse = (obj: any): obj is PaginatedResponse<SettingsUser> => {
    return obj && typeof obj === 'object' && Array.isArray(obj.data);
  };

  // Извлекаем пользователей из структуры данных
  const safeUsers = Array.isArray(users) 
    ? users 
    : (isPaginatedResponse(users)) 
      ? users.data 
      : [];

  // Обработчики событий для поиска и фильтрации
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(e.target.value);
    // Вызов API-запроса будет отложен с помощью debounce на стороне родительского компонента
  };

  const handleRoleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value ? parseInt(e.target.value) : null;
    onRoleFilter(value);
  };

  if (loading) {
    return (
      <div className="text-center my-4">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Загрузка пользователей...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3">
        <div className="d-flex flex-wrap gap-2">
          <div className="flex-grow-1 mb-2">
            <InputGroup>
              <InputGroup.Text>
                <i className="ph-duotone ph-magnifying-glass"></i>
              </InputGroup.Text>
              <Form.Control
                placeholder="Поиск по имени, логину, организации или телефону"
                value={searchTerm}
                onChange={handleSearchChange}
              />
              {searchTerm && (
                <Button
                  variant="outline-secondary"
                  onClick={() => onSearch('')}
                >
                  <i className="ph-duotone ph-x"></i>
                </Button>
              )}
            </InputGroup>
          </div>

          <div style={{ minWidth: '200px' }}>
            <Form.Select
              value={roleFilter || ''}
              onChange={handleRoleFilterChange}
            >
              <option value="">Все роли</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </Form.Select>
          </div>
        </div>
      </div>

      {safeUsers.length === 0 ? (
        <div className="text-center my-4 py-5 border rounded bg-light">
          <i className="ph-duotone ph-user-circle display-1 text-muted"></i>
          <div>
            <p className="mt-2">По вашему запросу пользователи не найдены</p>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => {
                onSearch('');
                onRoleFilter(null);
              }}
            >
              Сбросить фильтры
            </Button>
          </div>
        </div>
      ) : (
        <Table responsive hover>
          <thead>
            <tr>
              <th>#</th>
              <th>ФИО</th>
              <th>Логин</th>
              <th>Организация</th>
              <th>Телефон</th>
              <th>Email</th>
              <th>Telegram</th>
              <th>VK</th>
              <th>Роли</th>
              <th>Прямые доступы</th>
              <th className="text-end">Действия</th>
            </tr>
          </thead>
          <tbody>
            {safeUsers.map((user: SettingsUser) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{getUserFullName(user)}</td>
                <td>{user.login}</td>
                <td>{getOrganizationName(user.org_id)}</td>
                <td>{user.phone || 'Не указан'}</td>
                <td>{user.email || 'Не указан'}</td>
                <td>{user.telegram || 'Не указан'}</td>
                <td>{user.vk || 'Не указан'}</td>
                <td>
                  <div className="d-flex flex-wrap">
                    {renderUserRoles(user)}
                  </div>
                </td>
                <td>
                  <div className="d-flex flex-wrap">
                    {renderUserPermissions(user)}
                  </div>
                </td>
                <td className="text-end">
                  <OverlayTrigger
                    placement="top"
                    overlay={<Tooltip>Редактировать</Tooltip>}
                  >
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="me-2"
                      onClick={() => onEdit(user)}
                    >
                      <i className="ph-duotone ph-pencil-simple"></i>
                    </Button>
                  </OverlayTrigger>

                  <OverlayTrigger
                    placement="top"
                    overlay={<Tooltip>Удалить</Tooltip>}
                  >
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => {
                        if (window.confirm(`Вы уверены, что хотите удалить пользователя ${getUserFullName(user)}?`)) {
                          onDelete(user.id);
                        }
                      }}
                    >
                      <i className="ph-duotone ph-trash"></i>
                    </Button>
                  </OverlayTrigger>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <div className="d-flex justify-content-between align-items-center mt-3">
        <div>
          <small className="text-muted">
            Показано {safeUsers.length} пользователей
          </small>
        </div>
      </div>
    </div>
  );
};

export default UsersList;