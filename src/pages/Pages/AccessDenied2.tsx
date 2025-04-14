import React from 'react';
import { Link } from 'react-router-dom';

const AccessDenied: React.FC = () => {
  return (
    <div className="auth-wrapper">
      <div className="auth-content">
        <div className="card">
          <div className="row align-items-center text-center">
            <div className="col-md-12">
              <div className="card-body">
                <img src="/assets/images/lock-icon.svg" alt="Доступ запрещен" className="img-fluid mb-4" style={{ height: "80px" }} />
                <h4 className="mb-4 f-w-400">Доступ запрещен</h4>
                <p className="mb-4">
                  У вас нет прав для просмотра запрашиваемой страницы.
                  <br />
                  Пожалуйста, обратитесь к администратору системы.
                </p>
                <div className="d-grid mt-4">
                  <Link to="/dashboard" className="btn btn-block btn-primary mb-4">
                    Вернуться на главную
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;