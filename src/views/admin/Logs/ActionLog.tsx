import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Alert, Spinner } from 'react-bootstrap';
import {
  ActionLog,
  ActionLogType,
  SettingsUser,
  getActionLogs,
  getActionTypes,
  getSettingsUsersList
} from '../../../services/api';
import usePermission from "../../../hooks/usePermission";
import ActionLogList from './ActionLogList';

interface PaginatedResponse<T> {
  data: T[];
  current_page?: number;
  last_page?: number;
  total?: number;
  [key: string]: any;
}

const ActionLogPage: React.FC = () => {
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [users, setUsers] = useState<SettingsUser[]>([]);
  const [actionTypes, setActionTypes] = useState<ActionLogType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<{
    type_id?: number;
    user_id?: number | null;
    ip_address?: string;
    action?: string;
  }>({});

  const { hasAccess, loading: permissionLoading } = usePermission('view_settings');
  const filterTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (hasAccess) {
      loadData();
    }
  }, [hasAccess]);

  useEffect(() => {
    if (filterTimeoutRef.current) {
      clearTimeout(filterTimeoutRef.current);
    }
    filterTimeoutRef.current = setTimeout(() => {
      if (hasAccess) {
        loadLogs();
      }
    }, 500);
    return () => {
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }
    };
  }, [filters, hasAccess]);

  const loadData = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [logsData, typesData, usersData] = await Promise.all([
        getActionLogs(),
        getActionTypes(),
        getSettingsUsersList()
      ]);
      setLogs(logsData.items);
      setActionTypes(typesData);
      let usersList: SettingsUser[] = [];
      if (Array.isArray(usersData)) {
        usersList = usersData;
      } else if (usersData && typeof usersData === 'object') {
        const paginatedData = usersData as unknown as PaginatedResponse<SettingsUser>;
        if (paginatedData.data && Array.isArray(paginatedData.data)) {
          usersList = paginatedData.data;
        }
      }
      setUsers(usersList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(`Ошибка тест данных: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const logsData = await getActionLogs({
        type_id: filters.type_id,
        user_id: filters.user_id !== null ? filters.user_id : undefined,
        ip_address: filters.ip_address && filters.ip_address.trim() ? filters.ip_address : undefined,
        action: filters.action && filters.action.trim() ? filters.action : undefined
      });
      setLogs(logsData.items);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(`Ошибка загрузки журнала: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: {
    type_id?: number;
    user_id?: number | null;
    ip_address?: string;
    action?: string;
  }): void => {
    setFilters(newFilters);
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

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>Журнал действий</h2>
          <p className="text-muted">
            Просмотр и фильтрация истории действий пользователей в системе.
          </p>
        </Col>
      </Row>
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Card>
        <Card.Header>
          <h5 className="mb-0">Список действий</h5>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">Загрузка данных...</p>
            </div>
          ) : (
            <ActionLogList
              logs={logs}
              users={users}
              actionTypes={actionTypes}
              loading={false}
              onFilterChange={handleFilterChange}
              filters={filters}
            />
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ActionLogPage;