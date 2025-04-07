import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Spinner, Modal, Alert } from 'react-bootstrap';
import { getRolesList, getRoleDetails, deleteRole, getPermissionsList } from '../../../services/api';
import { Role, Permission } from '../../../services/api';
import RoleForm from './RoleForm';

const RolesManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [roleDetailLoading, setRoleDetailLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [rolesData, permissionsData] = await Promise.all([
          getRolesList(),
          getPermissionsList()
        ]);
        
        setRoles(rolesData);
        
        if (Array.isArray(permissionsData)) {
          setPermissions({ 'Все разрешения': permissionsData });
        } else {
          setPermissions(permissionsData);
        }
      } catch (err) {
        setError('Произошла ошибка при загрузке данных. Пожалуйста, попробуйте позже.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const refreshRoles = async () => {
    try {
      const rolesData = await getRolesList();
      setRoles(rolesData);
      return true;
    } catch (err) {
      setError('Произошла ошибка при обновлении списка ролей.');
      return false;
    }
  };

  const loadRoleDetails = async (roleId: number) => {
    setRoleDetailLoading(true);
    try {
      const roleDetails = await getRoleDetails(roleId);
      setSelectedRole(roleDetails);
      setShowEditModal(true);
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при загрузке деталей роли.');
    } finally {
      setRoleDetailLoading(false);
    }
  };

  const handleCreateRole = async (formData: any) => {
    setActionLoading(true);
    setError(null);
    
    try {
      await formData.onSubmit();
      const success = await refreshRoles();
      if (success) {
        setShowCreateModal(false);
        setActionSuccess('Роль успешно создана');
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при создании роли.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditRole = async (formData: any) => {
    setActionLoading(true);
    setError(null);
    
    try {
      await formData.onSubmit();
      const success = await refreshRoles();
      if (success) {
        setShowEditModal(false);
        setActionSuccess('Роль успешно обновлена');
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при обновлении роли.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;
    
    setActionLoading(true);
    setError(null);
    
    try {
      await deleteRole(selectedRole.id);
      const success = await refreshRoles();
      if (success) {
        setShowDeleteModal(false);
        setSelectedRole(null);
        setActionSuccess('Роль успешно удалена');
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при удалении роли.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h2>Управление ролями</h2>
          <p>Создавайте, редактируйте и удаляйте роли пользователей системы</p>
        </Col>
        <Col xs="auto">
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <i className="ph-duotone ph-plus me-2"></i>
            Создать роль
          </Button>
        </Col>
      </Row>

      {actionSuccess && (
        <Row className="mb-3">
          <Col>
            <Alert variant="success" onClose={() => setActionSuccess(null)} dismissible>
              {actionSuccess}
            </Alert>
          </Col>
        </Row>
      )}

      {error && (
        <Row className="mb-3">
          <Col>
            <Alert variant="danger" onClose={() => setError(null)} dismissible>
              {error}
            </Alert>
          </Col>
        </Row>
      )}

      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Список ролей</h5>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center p-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3">Загрузка ролей...</p>
                </div>
              ) : roles.length === 0 ? (
                <div className="text-center p-5">
                  <p className="text-muted">Роли не найдены. Создайте первую роль.</p>
                </div>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Название</th>
                      <th>Системное имя</th>
                      <th>Дата создания</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((role) => (
                      <tr key={role.id}>
                        <td>{role.id}</td>
                        <td>{role.name}</td>
                        <td>{role.slug}</td>
                        <td>{new Date(role.created_at).toLocaleDateString()}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => loadRoleDetails(role.id)}
                              disabled={roleDetailLoading}
                            >
                              {roleDetailLoading && selectedRole?.id === role.id ? 
                                <Spinner animation="border" size="sm" /> : 
                                <i className="ph-duotone ph-pencil"></i>}
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => {
                                setSelectedRole(role);
                                setShowDeleteModal(true);
                              }}
                            >
                              <i className="ph-duotone ph-trash"></i>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        backdrop="static"
        keyboard={false}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Создание новой роли</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <RoleForm
            permissions={permissions}
            loading={actionLoading}
            onSubmit={handleCreateRole}
            onCancel={() => setShowCreateModal(false)}
          />
        </Modal.Body>
      </Modal>

      <Modal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        backdrop="static"
        keyboard={false}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Редактирование роли</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRole && (
            <RoleForm
              role={selectedRole}
              permissions={permissions}
              loading={actionLoading}
              onSubmit={handleEditRole}
              onCancel={() => setShowEditModal(false)}
            />
          )}
        </Modal.Body>
      </Modal>

      <Modal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        backdrop="static"
        keyboard={false}
      >
        <Modal.Header closeButton>
          <Modal.Title>Подтверждение удаления</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRole && (
            <>
              <p>Вы действительно хотите удалить роль <strong>{selectedRole.name}</strong>?</p>
              <p className="text-danger">Это действие нельзя отменить. Все пользователи с этой ролью потеряют соответствующие права.</p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={actionLoading}>
            Отмена
          </Button>
          <Button variant="danger" onClick={handleDeleteRole} disabled={actionLoading}>
            {actionLoading ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Удаление...
              </>
            ) : (
              'Удалить'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default RolesManagement;