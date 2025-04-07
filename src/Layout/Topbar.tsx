import { Link, useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { Dropdown, Button } from "react-bootstrap";
import SimpleBar from "simplebar-react";
import { TOKEN_KEY } from "../services/api";

import avatar2 from "../assets/images/user/avatar-2.jpg";
import { getCurrentUser } from "../services/auth";

interface HeaderProps {
    toogleSidebarHide?: () => void;
    toogleMobileSidebarHide?: () => void;
}

const TopBar = ({ toogleSidebarHide, toogleMobileSidebarHide }: HeaderProps) => {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);

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
                    }
                }
            } else {
                setUser(currentUser);
            }
        } catch (err) {
        }
    }, []);

    const getUserName = () => {
        if (!user) return 'Пользователь';
        
        if (user.first_name && user.last_name) {
            return `${user.last_name} ${user.first_name}`;
        }
        
        if (user.first_name) return user.first_name;
        if (user.last_name) return user.last_name;
        if (user.name) return user.name;
        if (user.login) return user.login;
        
        return 'Пользователь';
    };

    const getUserRole = () => {
        if (!user) return '';
        
        if (user.role && user.role.name) {
            return user.role.name;
        }
        
        if (user.roles && user.roles.length > 0) {
            return user.roles[0].name;
        }
        
        return '';
    };

    const getUserEmail = () => {
        if (!user) return 'user@example.com';
        
        if (user.email) return user.email;
        if (user.login) return `${user.login}@example.com`;
        
        return 'user@example.com';
    };

    const navigateToProfile = () => {
        navigate('/personal-info');
    };

    const handleLogout = (e: React.MouseEvent) => {
        e.preventDefault();
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    return (
        <React.Fragment>
            <header className="pc-header">
                <div className="header-wrapper">
                    <div className="me-auto pc-mob-drp">
                        <ul className="list-unstyled">
                            <li className="pc-h-item pc-sidebar-collapse">
                                <Link to="#" className="pc-head-link ms-0" id="sidebar-hide" onClick={toogleSidebarHide}>
                                    <i className="ti ti-menu-2"></i>
                                </Link>
                            </li>
                            <li className="pc-h-item pc-sidebar-popup">
                                <Link to="#" className="pc-head-link ms-0" id="mobile-collapse" onClick={toogleMobileSidebarHide}>
                                    <i className="ti ti-menu-2"></i>
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div className="ms-auto">
                        <ul className="list-unstyled">
                            <li className="pc-h-item d-none d-md-inline-flex me-3">
                                <div className="d-flex align-items-center">
                                    <span className="text-body fw-semibold">{getUserName()}</span>
                                    {getUserRole() && (
                                        <span className="badge bg-light-primary text-primary ms-2">{getUserRole()}</span>
                                    )}
                                </div>
                            </li>
                            
                            <Dropdown
                                as="li"
                                className="pc-h-item">
                                <Dropdown.Toggle
                                    as="a"
                                    className="pc-head-link arrow-none me-0" data-bs-toggle="dropdown" href="#"
                                    aria-haspopup="false">
                                    <i className="ph-duotone ph-bell"></i>
                                    <span className="badge bg-success pc-h-badge">3</span>
                                </Dropdown.Toggle>
                                <Dropdown.Menu className="dropdown-notification dropdown-menu-end pc-h-dropdown">
                                    <div className="dropdown-header d-flex align-items-center justify-content-between">
                                        <h4 className="m-0">Уведомления</h4>
                                        <ul className="list-inline ms-auto mb-0">
                                            <li className="list-inline-item">
                                                <Link to="/application/mail" className="avtar avtar-s btn-link-hover-primary">
                                                    <i className="ti ti-link f-18"></i>
                                                </Link>
                                            </li>
                                        </ul>
                                    </div>
                                    <SimpleBar className="dropdown-body text-wrap header-notification-scroll position-relative h-100"
                                        style={{ maxHeight: "calc(100vh - 235px)" }}
                                    >
                                        <ul className="list-group list-group-flush">
                                            <li className="list-group-item">
                                                <p className="text-span">Сегодня</p>
                                                <div className="d-flex">
                                                    <div className="flex-shrink-0">
                                                        <img src={avatar2} alt="user-image" className="user-avtar avtar avtar-s" />
                                                    </div>
                                                    <div className="flex-grow-1 ms-3">
                                                        <div className="d-flex">
                                                            <div className="flex-grow-1 me-3 position-relative">
                                                                <h6 className="mb-0 text-truncate">Новое обновление системы</h6>
                                                            </div>
                                                            <div className="flex-shrink-0">
                                                                <span className="text-sm">2 мин назад</span>
                                                            </div>
                                                        </div>
                                                        <p className="position-relative text-muted mt-1 mb-2"><br /><span className="text-truncate">Доступно новое обновление системы.</span></p>
                                                        <span className="badge bg-light-primary border border-primary me-1 mt-1">обновление</span>
                                                        <span className="badge bg-light-warning border border-warning me-1 mt-1">система</span>
                                                    </div>
                                                </div>
                                            </li>
                                            <li className="list-group-item">
                                                <div className="d-flex">
                                                    <div className="flex-shrink-0">
                                                        <div className="avtar avtar-s bg-light-primary">
                                                            <i className="ph-duotone ph-chats-teardrop f-18"></i>
                                                        </div>
                                                    </div>
                                                    <div className="flex-grow-1 ms-3">
                                                        <div className="d-flex">
                                                            <div className="flex-grow-1 me-3 position-relative">
                                                                <h6 className="mb-0 text-truncate">Сообщение</h6>
                                                            </div>
                                                            <div className="flex-shrink-0">
                                                                <span className="text-sm text-muted">1 час назад</span>
                                                            </div>
                                                        </div>
                                                        <p className="position-relative text-muted mt-1 mb-2"><br /><span className="text-truncate">У вас новое сообщение от администратора.</span></p>
                                                    </div>
                                                </div>
                                            </li>
                                        </ul>
                                    </SimpleBar>
                                    <div className="dropdown-footer">
                                        <div className="row g-3">
                                            <div className="col-6">
                                                <div className="d-grid"><button className="btn btn-primary">Архивировать все</button></div>
                                            </div>
                                            <div className="col-6">
                                                <div className="d-grid"><button className="btn btn-outline-secondary">Пометить как прочитанные</button></div>
                                            </div>
                                        </div>
                                    </div>
                                </Dropdown.Menu>
                            </Dropdown>
                            <Dropdown as="li" className="pc-h-item header-user-profile">
                                <Dropdown.Toggle className="pc-head-link arrow-none me-0" data-bs-toggle="dropdown" href="#"
                                    aria-haspopup="false" data-bs-auto-close="outside" aria-expanded="false" style={{ border: "none" }}>
                                    <img src={avatar2} alt="user-image" width={40} className="user-avtar" />
                                </Dropdown.Toggle>
                                <Dropdown.Menu className="dropdown-user-profile dropdown-menu-end pc-h-dropdown">
                                    <div className="dropdown-header d-flex align-items-center justify-content-between">
                                        <h4 className="m-0">Профиль</h4>
                                    </div>
                                    <div className="dropdown-body">
                                        <SimpleBar className="profile-notification-scroll position-relative" style={{ maxHeight: "calc(100vh - 225px)" }}>
                                            <ul className="list-group list-group-flush w-100">
                                                <li className="list-group-item">
                                                    <div className="d-flex align-items-center">
                                                        <div className="flex-shrink-0">
                                                            <img src={avatar2} alt="user-image" width={50} className="wid-50 rounded-circle" />
                                                        </div>
                                                        <div className="flex-grow-1 mx-3">
                                                            <h5 className="mb-0">{getUserName()}</h5>
                                                            {getUserRole() && <small className="text-muted">{getUserRole()}</small>}
                                                            <a className="link-primary" href={`mailto:${getUserEmail()}`}>{getUserEmail()}</a>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li className="list-group-item text-center mt-2">
                                                    <Button 
                                                        variant="primary" 
                                                        className="w-100" 
                                                        onClick={navigateToProfile}
                                                    >
                                                        <i className="ph-duotone ph-user-circle me-2"></i>
                                                        Редактировать профиль
                                                    </Button>
                                                </li>
                                                <li className="list-group-item">
                                                    <Dropdown.Item onClick={navigateToProfile}>
                                                        <span className="d-flex align-items-center">
                                                            <i className="ph-duotone ph-key"></i>
                                                            <span>Сменить пароль</span>
                                                        </span>
                                                    </Dropdown.Item>
                                                    <Dropdown.Item>
                                                        <span className="d-flex align-items-center">
                                                            <i className="ph-duotone ph-calendar-blank"></i>
                                                            <span>График работы</span>
                                                        </span>
                                                    </Dropdown.Item>
                                                </li>
                                                <li className="list-group-item">
                                                    <div className="dropdown-item">
                                                        <span className="d-flex align-items-center">
                                                            <i className="ph-duotone ph-moon"></i>
                                                            <span>Тёмная тема</span>
                                                        </span>
                                                        <div className="form-check form-switch form-check-reverse m-0">
                                                            <input className="form-check-input f-18" id="dark-mode" type="checkbox"
                                                                role="switch" />
                                                        </div>
                                                    </div>
                                                </li>
                                                <li className="list-group-item">
                                                    <Dropdown.Item onClick={navigateToProfile}>
                                                        <span className="d-flex align-items-center">
                                                            <i className="ph-duotone ph-gear-six"></i>
                                                            <span>Настройки</span>
                                                        </span>
                                                    </Dropdown.Item>
                                                </li>
                                                <li className="list-group-item">
                                                    <Dropdown.Item onClick={(e) => handleLogout(e)}>
                                                        <span className="d-flex align-items-center">
                                                            <i className="ph-duotone ph-power"></i>
                                                            <span>Выход</span>
                                                        </span>
                                                    </Dropdown.Item>
                                                </li>
                                            </ul>
                                        </SimpleBar>
                                    </div>
                                </Dropdown.Menu>
                            </Dropdown>
                        </ul>
                    </div>
                </div>
            </header>
        </React.Fragment>
    );
};

export default TopBar;