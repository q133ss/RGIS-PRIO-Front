import React from 'react';
import { Table, Button, Badge, Form, InputGroup } from 'react-bootstrap';
import { ActionLog, ActionLogType, SettingsUser } from '../../../services/api';

interface ActionLogListProps {
  logs: ActionLog[];
  users: SettingsUser[];
  actionTypes: ActionLogType[];
  loading: boolean;
  onFilterChange: (filters: {
    type_id?: number,
    user_id?: number | null,
    ip_address?: string,
    action?: string
  }) => void;
  filters: {
    type_id?: number,
    user_id?: number | null,
    ip_address?: string,
    action?: string
  };
}

const ActionLogList: React.FC<ActionLogListProps> = ({
  logs = [],
  users = [],
  actionTypes = [],
  onFilterChange,
  filters
}) => {
  
  // Format the date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  // Get user name for display
  const getUserName = (userId: number | undefined) => {
    if (!userId) return 'Не указан';
    const user = users.find(u => u.id === userId);
    if (!user) return `ID: ${userId}`;
    
    const names = [];
    if (user.last_name) names.push(user.last_name);
    if (user.first_name) names.push(user.first_name);
    
    return names.length > 0 ? `${names.join(' ')} (${user.login})` : user.login;
  };
  
  // Get badge color based on action type
  const getActionTypeBadge = (typeId: number) => {
    const type = actionTypes.find(t => t.id === typeId);
    if (!type) return 'primary';
    
    const typeMap: Record<string, string> = {
      'view': 'info',
      'create': 'success',
      'update': 'warning',
      'delete': 'danger',
      'login': 'primary',
      'logout': 'secondary'
    };
    
    return typeMap[type.name] || 'primary';
  };
  
  return (
    <div>
      <div className="mb-3">
        <div className="d-flex flex-wrap gap-2">
          <div className="flex-grow-1 mb-2">
            <InputGroup>
              <InputGroup.Text>
                <i className="ph-duotone ph-search"></i>
              </InputGroup.Text>
              <Form.Control
                placeholder="Поиск по действию"
                value={filters.action || ''}
                onChange={(e) => onFilterChange({...filters, action: e.target.value})}
              />
              {filters.action && (
                <Button
                  variant="outline-secondary"
                  onClick={() => onFilterChange({...filters, action: ''})}
                >
                  <i className="ph-duotone ph-x"></i>
                </Button>
              )}
            </InputGroup>
          </div>
          
          <div className="mb-2">
            <InputGroup>
              <InputGroup.Text>
                <i className="ph-duotone ph-globe"></i>
              </InputGroup.Text>
              <Form.Control
                placeholder="IP-адрес"
                value={filters.ip_address || ''}
                onChange={(e) => onFilterChange({...filters, ip_address: e.target.value})}
              />
              {filters.ip_address && (
                <Button
                  variant="outline-secondary"
                  onClick={() => onFilterChange({...filters, ip_address: ''})}
                >
                  <i className="ph-duotone ph-x"></i>
                </Button>
              )}
            </InputGroup>
          </div>
          
          <div style={{ minWidth: '200px' }}>
            <Form.Select
              value={filters.type_id?.toString() || ''}
              onChange={(e) => onFilterChange({...filters, type_id: e.target.value ? parseInt(e.target.value) : undefined})}
            >
              <option value="">Все типы действий</option>
              {actionTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.description}
                </option>
              ))}
            </Form.Select>
          </div>
          
          <div style={{ minWidth: '250px' }}>
            <Form.Select
              value={filters.user_id?.toString() || ''}
              onChange={(e) => onFilterChange({...filters, user_id: e.target.value ? parseInt(e.target.value) : null})}
            >
              <option value="">Все пользователи</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.last_name} {user.first_name} ({user.login})
                </option>
              ))}
            </Form.Select>
          </div>
          
          {(filters.action || filters.ip_address || filters.user_id || filters.type_id) && (
            <Button
              variant="outline-secondary"
              onClick={() => onFilterChange({
                type_id: undefined,
                user_id: null,
                ip_address: '',
                action: ''
              })}
            >
              Сбросить фильтры
            </Button>
          )}
        </div>
      </div>
      
      {logs.length === 0 ? (
        <div className="text-center my-4 py-5 border rounded bg-light">
          <i className="ph-duotone ph-clipboard-text display-1 text-muted"></i>
          <p className="mt-2">По вашему запросу записи в журнале не найдены</p>
        </div>
      ) : (
        <Table responsive hover>
          <thead>
            <tr>
              <th>#</th>
              <th>Дата и время</th>
              <th>Пользователь</th>
              <th>Тип действия</th>
              <th>Действие</th>
              <th>IP-адрес</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{log.id}</td>
                <td>{formatDate(log.created_at)}</td>
                <td>{getUserName(log.user_id)}</td>
                <td>
                  <Badge bg={getActionTypeBadge(log.type_id)}>
                    {log.type?.description || `Тип ${log.type_id}`}
                  </Badge>
                </td>
                <td>{log.action}</td>
                <td>{log.ip_address}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      
      <div className="mt-3">
        <small className="text-muted">
          Показано {logs.length} записей
        </small>
      </div>
    </div>
  );
};

export default ActionLogList;