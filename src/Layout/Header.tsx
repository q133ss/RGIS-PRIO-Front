import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import logoDark from "../assets/images/logo-dark.jpeg";
import logoLight from "../assets/images/logo-white.jpeg";
import avatar1 from "../assets/images/user/avatar-1.jpg";
import SimpleBar from "simplebar-react";
import { menuItems } from "./MenuData";
import NestedMenu from "./NestedMenu";
import { Card, CardBody, Dropdown, Nav } from "react-bootstrap";
import { getCurrentUser } from "../services/auth";
import { TOKEN_KEY } from "../services/api";
import { filterMenuByPermissions } from '../utils/menuUtils';

const Header = ({ themeMode }: any) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [filteredMenuItems, setFilteredMenuItems] = useState<any[]>(menuItems);
  const [menuLoading, setMenuLoading] = useState(true);

  useEffect(() => {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const userData = JSON.parse(userStr);
            setUser(userData);
          } catch (err) {
            // Ошибка при разборе данных
          }
        }
      } else {
        setUser(currentUser);
      }
    } catch (err) {
      // Ошибка при получении пользователя
    }
  }, []);

  // Загрузка и фильтрация меню по правам доступа
  useEffect(() => {
    const filterMenu = async () => {
      try {
        setMenuLoading(true);
        const filtered = await filterMenuByPermissions(menuItems);
        setFilteredMenuItems(filtered);
      } catch (error) {
        // Ошибка фильтрации меню
      } finally {
        setMenuLoading(false);
      }
    };

    filterMenu();
  }, []);

  const getUserName = () => {
    if (!user) return 'Пользователь';
    if (user.first_name && user.last_name) return `${user.last_name} ${user.first_name}`;
    if (user.first_name) return user.first_name;
    if (user.last_name) return user.last_name;
    if (user.name) return user.name;
    if (user.login) return user.login;
    return 'Пользователь';
  };

  const getUserRole = () => {
    if (!user) return 'Пользователь';
    if (user.role && user.role.name) return user.role.name;
    if (user.roles && user.roles.length > 0) return user.roles[0].name;
    return 'Пользователь';
  };

  const navigateToProfile = () => {
    navigate('/personal-info');
  };

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('user');
    localStorage.removeItem('user_permissions');
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

          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)' }}>
            <SimpleBar className="navbar-content" style={{ flexGrow: 1, maxHeight: 'none' }}>
              <Nav as="ul" className="pc-navbar" id="pc-navbar">
                {menuLoading ? (
                  <div className="text-center p-3">Загрузка меню...</div>
                ) : (
                  <NestedMenu menuItems={filteredMenuItems} />
                )}
              </Nav>
            </SimpleBar>

            <Card className="pc-user-card">
              <CardBody>
                <div className="d-flex align-items-center">
                  <div className="flex-shrink-0">
                    <img
                      src={user?.avatar || avatar1}
                      alt="user-image"
                      className="user-avtar wid-45 rounded-circle"
                      width={45}
                      onError={(e) => (e.currentTarget.src = avatar1)}
                    />
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <div className="d-flex align-items-center">
                      <div className="flex-grow-1">
                        <h6 className="mb-0">
                          <Link to="/personal-info" style={{ color: 'inherit', textDecoration: 'none' }}>{getUserName()}</Link>
                        </h6>
                        <small>{getUserRole()}</small>
                      </div>

                      <Dropdown>
                        <Dropdown.Toggle
                          variant="link"
                          className="btn btn-icon btn-link-secondary avtar arrow-none p-0 ms-2"
                          id="dropdown-user-options"
                        >
                          <i className="ph-duotone ph-list"></i>
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item className="pc-user-links" onClick={navigateToProfile}>
                            <i className="ph-duotone ph-user"></i>
                            <span>Мой профиль</span>
                          </Dropdown.Item>
                          <Dropdown.Item className="pc-user-links" onClick={navigateToProfile}>
                            <i className="ph-duotone ph-gear"></i>
                            <span>Настройки</span>
                          </Dropdown.Item>
                          <Dropdown.Divider />
                          <Dropdown.Item className="pc-user-links" onClick={handleLogout}>
                            <i className="ph-duotone ph-power"></i>
                            <span>Выход</span>
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </nav>
    </React.Fragment>
  );
};

export default Header;