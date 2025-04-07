import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
// Корректные пути импорта
import { menuItems } from "../MenuData"; // Изменено с './MenuData'
import NestedMenu from "../NestedMenu"; // Изменено с './NestedMenu'
import { Card, CardBody, Dropdown } from "react-bootstrap";
import { getCurrentUser } from "../../services/auth"; // Изменено с '../services/auth'
import { TOKEN_KEY } from "../../services/api"; // Изменено с '../services/api'
import { useAdminAccess } from "../../hooks/usePermission"; // Изменено с '../hooks/usePermission'

// Импорт изображений
import navCardBg from '../../assets/images/layout/nav-card-bg.svg'
import logoDark from "../../assets/images/logo-dark.jpeg";
import logoLight from "../../assets/images/logo-white.jpeg";
import avatar1 from "../../assets/images/user/avatar-1.jpg"
import SimpleBar from "simplebar-react";

const Header = ({ themeMode }: any) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  // Используем хук для проверки прав администратора
  const { isAdmin, loading: checkingAdmin } = useAdminAccess();

  // Получаем данные пользователя при загрузке компонента
  useEffect(() => {
    try {
      // Пробуем получить данные через функцию
      const currentUser = getCurrentUser();
      
      // Логируем для отладки
      console.log('Данные пользователя (сайдбар):', currentUser);
      
      // Если функция не вернула данные, пробуем напрямую из localStorage
      if (!currentUser) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const userData = JSON.parse(userStr);
            console.log('Данные из localStorage (сайдбар):', userData);
            setUser(userData);
          } catch (err) {
            console.error('Ошибка парсинга данных пользователя:', err);
          }
        }
      } else {
        setUser(currentUser);
      }
    } catch (err) {
      console.error('Ошибка при получении данных пользователя:', err);
    }
  }, []);

  // Получаем имя пользователя
  const getUserName = () => {
    if (!user) return 'Пользователь';
    
    // Пробуем разные варианты структуры данных
    if (user.first_name && user.last_name) {
      return `${user.last_name} ${user.first_name}`;
    }
    
    if (user.first_name) return user.first_name;
    if (user.last_name) return user.last_name;
    if (user.name) return user.name;
    if (user.login) return user.login;
    
    return 'Пользователь';
  };

  // Получаем роль пользователя
  const getUserRole = () => {
    if (!user) return 'Пользователь';
    
    if (user.role && user.role.name) {
      return user.role.name;
    }
    
    if (user.roles && user.roles.length > 0) {
      return user.roles[0].name;
    }
    
    return 'Пользователь';
  };
  
  // Функция для перехода на страницу профиля
  const navigateToProfile = () => {
    console.log('Переход на страницу профиля из сайдбара');
    navigate('/personal-info');
  };
  
  // Функция для перехода в админ-панель
  const navigateToAdmin = () => {
    console.log('Переход в админ-панель из сайдбара');
    navigate('/admin/users');
  };

  // Функция для выхода из системы
  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();

    console.log("Выход из системы...");

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('user');

    window.location.href = '/login';
  };

  return (
    <React.Fragment>
      <nav className="pc-sidebar" id="pc-sidebar-hide">
        <div className="navbar-wrapper">
          <div className="m-header">
            <Link to="/" className="b-brand text-primary">
              {themeMode === "dark" ?
                <img src={logoLight} alt="logo" width={'150px'} className="logo-lg landing-logo" />
                :
                <img src={logoDark} alt="logo" width={'150px'} className="logo-lg landing-logo" />
              }
            </Link>
          </div>

          <SimpleBar className="navbar-content" style={{ maxHeight: "100vh" }}>
            <ul className="pc-navbar" id="pc-navbar">
              <NestedMenu menuItems={menuItems} />
            </ul>
            <Card className="nav-action-card bg-brand-color-4">
              <CardBody
                style={{ backgroundImage: `url(${navCardBg})` }}
              >
                <h5 className="text-dark">Центр помощи</h5>
                <p className="text-dark text-opacity-75">
                  Пожалуйста, свяжитесь с нами по вопросам поддержки.
                </p>
                <Link
                  to="https://phoenixcoded.support-hub.io/"
                  className="btn btn-primary"
                  target="_blank"
                >
                  Перейти в центр помощи
                </Link>
              </CardBody>
            </Card>
            
            {/* Кнопка для доступа к панели администратора */}
            {isAdmin && !checkingAdmin && (
              <Card className="nav-action-card mt-3 bg-light-primary">
                <CardBody>
                  <h5 className="text-primary">Панель администратора</h5>
                  <p className="text-primary text-opacity-75">
                    Управление пользователями и системными настройками.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={navigateToAdmin}
                  >
                    <i className="ph-duotone ph-shield-star me-1"></i>
                    Перейти в панель администратора
                  </button>
                </CardBody>
              </Card>
            )}
          </SimpleBar>
          <Card className="pc-user-card">
            <CardBody>
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <img
                    src={avatar1}
                    alt="user-image"
                    className="user-avtar wid-45 rounded-circle"
                    width={45}
                  />
                </div>
                <div className="flex-grow-1 ms-3">
                  <Link to="#" className="arrow-none dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false" data-bs-offset="0,20"></Link>
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <h6 className="mb-0">{getUserName()}</h6>
                      <small>{getUserRole()}</small>
                    </div>

                    <Dropdown>
                      <Dropdown.Toggle
                        variant="a"
                        className="btn btn-icon btn-link-secondary avtar arrow-none"
                        data-bs-offset="0,20"
                      >
                        <i className="ph-duotone ph-windows-logo"></i>
                      </Dropdown.Toggle>
                      <Dropdown.Menu>
                        <ul>
                          <li>
                            <Dropdown.Item className="pc-user-links" onClick={navigateToProfile}>
                              <i className="ph-duotone ph-user"></i>
                              <span>Мой профиль</span>
                            </Dropdown.Item>
                          </li>
                          <li>
                            <Dropdown.Item className="pc-user-links" onClick={navigateToProfile}>
                              <i className="ph-duotone ph-gear"></i>
                              <span>Настройки</span>
                            </Dropdown.Item>
                          </li>
                          <li>
                            <Dropdown.Item className="pc-user-links">
                              <i className="ph-duotone ph-lock-key"></i>
                              <span>Блокировка экрана</span>
                            </Dropdown.Item>
                          </li>
                          <li>
                            <Dropdown.Item className="pc-user-links" onClick={handleLogout}>
                              <i className="ph-duotone ph-power"></i>
                              <span>Выход</span>
                            </Dropdown.Item>
                          </li>
                        </ul>
                      </Dropdown.Menu>
                    </Dropdown>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </nav>
    </React.Fragment >
  );
};

export default Header;