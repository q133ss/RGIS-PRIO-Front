import React from 'react';
import { Offcanvas, Spinner, Badge } from 'react-bootstrap';
import { EddsIncident } from '../../../services/api';

interface EddsDetailModalProps {
  show: boolean;
  onHide: () => void;
  incident: EddsIncident | null;
  loading: boolean;
}

const EddsDetailModal: React.FC<EddsDetailModalProps> = ({
  show,
  onHide,
  incident,
  loading
}) => {
  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU');
  };

  const getStatusClass = (status: any): string => {
    if (!status || !status.slug) return 'bg-secondary';
    
    switch (status.slug) {
      case 'new':
        return 'bg-danger';
      case 'in_progress':
        return 'bg-warning text-dark';
      case 'resolved':
        return 'bg-success';
      case 'closed':
        return 'bg-secondary';
      default:
        return 'bg-info';
    }
  };
  
  return (
    <Offcanvas 
      show={show} 
      onHide={onHide}
      placement="end"
      backdrop={true}
      style={{ width: '450px' }}
    >
      <Offcanvas.Header closeButton className="sticky-top bg-light border-bottom">
        <Offcanvas.Title className="f-w-600 text-truncate d-flex align-items-center">
          <i className={`me-2 ${incident?.is_complaint ? 'ti ti-message-circle' : 'ti ti-alert-triangle'}`} 
             style={{color: incident?.is_complaint ? '#FFC107' : '#DC3545'}}></i>
          {incident?.is_complaint ? 'Детали жалобы' : 'Детали инцидента'}
        </Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body className="p-0" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 56px)' }}>
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" role="status" variant="primary">
              <span className="visually-hidden">Загрузка...</span>
            </Spinner>
            <p className="mt-2 text-primary">Загрузка данных...</p>
          </div>
        ) : incident ? (
          <div className="p-3">
            <h5 className="text-primary mb-4">{incident.title}</h5>
            
            <div className="card mb-4 bg-light border-0">
              <div className="card-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <div className="d-flex align-items-center mb-2">
                      <Badge bg="primary" className="me-2" style={{ minWidth: '80px' }}>
                        Тип
                      </Badge>
                      <span>{incident.type ? incident.type.name : 'Не указан'}</span>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="d-flex align-items-center mb-2">
                      <Badge bg="info" className="me-2" style={{ minWidth: '80px' }}>
                        Ресурс
                      </Badge>
                      <span>
                        {incident.resource_type ? incident.resource_type.name : 'Не указан'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6">
                    <div className="d-flex align-items-center mb-2">
                      <Badge
                        className="me-2"
                        bg={getStatusClass(incident.status).split(' ')[0]}
                        text={incident.status?.slug === 'in_progress' ? 'dark' : 'white'}
                        style={{ minWidth: '80px' }}
                      >
                        Статус
                      </Badge>
                      <span>{incident.status ? incident.status.name : 'Не указан'}</span>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="d-flex align-items-center mb-2">
                      <Badge
                        bg={incident.is_complaint ? 'warning' : 'secondary'}
                        className="me-2"
                        text={incident.is_complaint ? 'dark' : 'white'}
                        style={{ minWidth: '80px' }}
                      >
                        Обращение
                      </Badge>
                      <span>
                        {incident.is_complaint ? 'Жалоба' : 'Инцидент'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="detail-section mb-4">
              <div className="d-flex mb-2">
                <div className="detail-icon">
                  <i className="ti ti-file-text"></i>
                </div>
                <h6 className="mb-0">Описание</h6>
              </div>
              <div className="detail-content">
                <p className="text-muted">{incident.description || 'Описание отсутствует'}</p>
              </div>
            </div>
            
            {incident.addresses && incident.addresses.length > 0 && (
              <div className="detail-section mb-4">
                <div className="d-flex mb-2">
                  <div className="detail-icon">
                    <i className="ti ti-map-pin"></i>
                  </div>
                  <h6 className="mb-0">Адреса</h6>
                </div>
                <div className="detail-content">
                  <ul className="list-group list-unstyled">
                    {incident.addresses.map((addr, index) => (
                      <li key={index} className="mb-2 text-muted">
                        <div className="d-flex">
                          <i className="ti ti-point me-2 text-primary" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}></i>
                          <div>
                            {addr.street?.city?.name && <span>{addr.street.city.name}, </span>}
                            {addr.street?.name && <span>{addr.street.name}, </span>}
                            <span>д. {addr.house_number}</span>
                            {addr.building && <span> корп. {addr.building}</span>}
                            {addr.structure && <span> стр. {addr.structure}</span>}
                            {addr.literature && <span> лит. {addr.literature}</span>}
                            {addr.latitude && addr.longitude && (
                              <div className="small mt-1 text-muted">
                                Координаты: {addr.latitude}, {addr.longitude}
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            <div className="detail-section">
              <div className="d-flex mb-2">
                <div className="detail-icon">
                  <i className="ti ti-clock"></i>
                </div>
                <h6 className="mb-0">Даты и время</h6>
              </div>
              <div className="detail-content">
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <div className="small text-muted">Дата создания:</div>
                      <div>{formatDate(incident.created_at)}</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <div className="small text-muted">Дата обновления:</div>
                      <div>{formatDate(incident.updated_at)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <i className="ti ti-info-circle text-muted f-24 mb-2"></i>
            <p className="mb-0">Выберите инцидент для просмотра деталей</p>
          </div>
        )}
      </Offcanvas.Body>
      
      <style>{`
        .detail-section {
          padding-bottom: 1rem;
          border-bottom: 1px solid #eee;
          margin-bottom: 1rem;
        }
        
        .detail-section:last-child {
          border-bottom: none;
        }
        
        .detail-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: rgba(13, 110, 253, 0.1);
          color: #0d6efd;
          border-radius: 50%;
          margin-right: 12px;
        }
        
        .detail-content {
          padding-left: 44px;
        }
        
        .f-w-600 {
          font-weight: 600;
        }
        
        .f-24 {
          font-size: 24px;
        }
        
        .ti {
          line-height: 1;
        }
      `}</style>
    </Offcanvas>
  );
};

export default EddsDetailModal;