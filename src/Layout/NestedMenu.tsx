import { Link, useLocation } from "react-router-dom";
import React, { useCallback, useEffect, useState } from "react";
import FeatherIcon from "feather-icons-react";
import { useTranslation } from "react-i18next";
import { checkPermissionWithCache, getStoredPermissions } from "../services/permissionsService";


interface MenuItem {
  id: number | string;
  label: string;
  type?: string;
  icon?: string;
  link?: string;
  badge?: string;
  dataPage?: string;
  permission?: string | string[]; // Право доступа или массив прав
  roles?: string[]; // Роли, которым разрешен доступ
  submenu?: MenuItem[];
}

const NestedMenu: React.FC<{ menuItems: MenuItem[] }> = ({ menuItems }) => {
  const router = useLocation();
  const [openMenuIds, setOpenMenuIds] = useState<(number | string)[]>([]);
  const [filteredMenuItems, setFilteredMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userPermissions, setUserPermissions] = useState<Record<string, string>>({});
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const { t } = useTranslation();
  
  // Загрузка информации о пользователе и его правах
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Загружаем права пользователя
        const permissions = getStoredPermissions();
        console.log("Загруженные права пользователя:", permissions);
        setUserPermissions(permissions);
        
        // Загружаем роли пользователя
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          let roles: string[] = [];
          
          if (Array.isArray(user.roles)) {
            roles = user.roles.map((role: any) => 
              typeof role === 'string' ? role : (role.slug || role.name)
            );
          } else if (user.role) {
            const roleValue = typeof user.role === 'string' ? 
              user.role : (user.role.slug || user.role.name);
            roles = [roleValue];
          }
          
          console.log("Загруженные роли пользователя:", roles);
          setUserRoles(roles);
        }
      } catch (error) {
        console.error("Ошибка при загрузке данных пользователя:", error);
      } finally {
        // Даже если произошла ошибка, перестаем показывать загрузку
        setIsLoading(false);
      }
    };
    
    loadUserData();
  }, []);

  // Проверка, является ли пользователь администратором (улучшенная)
  const isAdmin = useCallback(() => {
    if (!userRoles || userRoles.length === 0) {
      // Проверка localStorage напрямую как запасной вариант
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.roles && Array.isArray(user.roles)) {
            return user.roles.some((role: any) => {
              const roleName = typeof role === 'string' ? role : (role.slug || role.name || '');
              return roleName === 'admin' || roleName === 'super_admin' || roleName.toLowerCase().includes('admin');
            });
          } else if (user.role) {
            const roleName = typeof user.role === 'string' ? 
              user.role : (user.role.slug || user.role.name || '');
            return roleName === 'admin' || roleName === 'super_admin' || roleName.toLowerCase().includes('admin');
          }
        }
      } catch (e) {
        console.error("Ошибка при проверке admin прав:", e);
      }
      return false;
    }
    
    return userRoles.some(role => {
      return role === 'admin' ||
        role === 'super_admin' ||
        role.toLowerCase().includes('admin');
    });
  }, [userRoles]);

  // Функция для проверки доступа к элементу меню
  const checkMenuItemAccess = async (item: MenuItem): Promise<boolean> => {
    // Если пользователь админ, разрешаем доступ ко всем пунктам
    if (isAdmin()) {
      console.log(`АДМИН ДОСТУП - Пункт меню "${item.label}" доступен администратору`);
      return true;
    }

    // Если нет ограничений доступа, показываем пункт всем
    if (!item.permission && !item.roles) {
      return true;
    }

    try {
      // Проверка прав
      if (item.permission) {
        // Если передан массив прав, нужно найти хотя бы одно
        if (Array.isArray(item.permission)) {
          if (item.permission.length === 0) return true;
          
          console.log(`Проверка массива прав для пункта "${item.label}": ${item.permission.join(', ')}`);
          
          // Запрашиваем каждое право параллельно
          const results = await Promise.all(
            item.permission.map(slug => checkPermissionWithCache(slug))
          );
          
          console.log(`Результаты проверки прав для "${item.label}": ${results.join(', ')}`);
          
          // Если хотя бы одно право есть, разрешаем доступ
          if (!results.some(result => result)) {
            console.log(`ДОСТУП ЗАПРЕЩЕН - Пункт меню "${item.label}" не доступен: нет ни одного из прав [${item.permission.join(', ')}]`);
            return false;
          }
        } else {
          // Проверка одного права
          console.log(`Проверка права для пункта "${item.label}": ${item.permission}`);
          const hasPermission = await checkPermissionWithCache(item.permission);
          console.log(`Результат проверки права "${item.permission}" для "${item.label}": ${hasPermission}`);
          
          if (!hasPermission) {
            console.log(`ДОСТУП ЗАПРЕЩЕН - Пункт меню "${item.label}" не доступен: нет права ${item.permission}`);
            return false;
          }
        }
      }

      // Проверка ролей (если указаны)
      if (item.roles && item.roles.length > 0) {
        console.log(`Проверка ролей для пункта "${item.label}": ${item.roles.join(', ')}`);
        console.log(`Роли пользователя: ${userRoles.join(', ')}`);
        
        // Проверяем пересечение ролей пользователя с требуемыми ролями
        const hasRole = item.roles.some(role => userRoles.includes(role));
        
        if (!hasRole) {
          console.log(`ДОСТУП ЗАПРЕЩЕН - Пункт меню "${item.label}" не доступен: нет ролей [${item.roles.join(', ')}]`);
          return false;
        }
      }

      // Если все проверки пройдены
      console.log(`ДОСТУП РАЗРЕШЕН - Пункт меню "${item.label}" доступен`);
      return true;
    } catch (error) {
      console.error(`Ошибка при проверке доступа к меню "${item.label}":`, error);
      return false;
    }
  };

  // Улучшенная функция фильтрации с исправленными проверками прав
  const filterMenuItems = async (items: MenuItem[]): Promise<MenuItem[]> => {
    // Обновляем соответствие URL и прав согласно фактическим правам из API
    const keyPagePermissions: Record<string, string | string[]> = {
      // Карты и свободные мощности
      '/maps/free-capacity': 'view_capacity',
      '/free-capacity-list': 'view_capacity',
      '/maps/heat-supply': 'view_hs_map',
      '/maps/communal-services': 'view_mkd',
      
      // Аварии и инциденты
      '/incidents': 'view_emergency',
      '/incidents/map': 'view_emergency',
      '/outages': 'view_emergency',
      
      // ЕДДС - ИСПРАВЛЕНО: больше не требуем view_edds для подстраниц
      '/edds/accidents': 'view_emergency',
      '/edds/planned-works': 'view_emergency',
      '/edds/seasonal-works': 'view_emergency',
      
      // МКД
      '/mkd': 'view_mkd',
      '/buildings-list': 'view_mkd',
      '/registers/mkd/schedules': 'view_mkd',
      
      // Теплоисточники
      '/heat-sources': 'view_hs',
      '/registers/heat-supply/heating-periods': 'view_hs_period',
      
      // Мониторинг - ИСПРАВЛЕНО: используем view_monitoring вместо view_edds
      '/monitoring': 'view_monitoring',
      
      // Графики
      '/mkd-graph': 'view_mkd_heating_periods',
      
      // Админ-панель
      '/admin/settings': 'view_settings',
      '/admin/users': 'view_users',
      '/admin/roles': 'view_roles',
      '/admin/logs': 'view_actions'
    };

    const result: MenuItem[] = [];
    console.log(`Начинаем фильтрацию ${items.length} пунктов меню`);
    
    // Проверяем, является ли пользователь администратором
    const adminAccess = isAdmin();
    if (adminAccess) {
      console.log("АДМИН: Пользователь является администратором - полный доступ ко всем пунктам меню");
      // Для админов возвращаем все пункты меню без проверок (только фильтруем подменю)
      return Promise.all(items.map(async (item) => {
        let filteredSubmenu: MenuItem[] | undefined;
        if (item.submenu && item.submenu.length > 0) {
          filteredSubmenu = await filterMenuItems(item.submenu);
        }
        return {
          ...item,
          submenu: filteredSubmenu
        };
      }));
    }

    for (const item of items) {
      // Стандартная проверка доступа
      const hasAccess = await checkMenuItemAccess(item);
      
      if (hasAccess) {
        // Если есть подменю, фильтруем его
        let filteredSubmenu: MenuItem[] | undefined;
        
        if (item.submenu && item.submenu.length > 0) {
          filteredSubmenu = await filterMenuItems(item.submenu);
          
          // Если в подменю ничего не осталось после фильтрации и это не заголовок,
          // то пропускаем этот пункт меню
          if (filteredSubmenu.length === 0 && item.type !== 'HEADER') {
            console.log(`СКРЫТ - Пункт меню "${item.label}" скрыт: пустое подменю`);
            continue;
          }
        }
        
        // Специальная проверка для страниц с особыми требованиями
        // Проводим её только если пользователь не админ (для админов уже проверили выше)
        if (item.link && keyPagePermissions[item.link] && !adminAccess) {
          const requiredPermission = keyPagePermissions[item.link];
          console.log(`Особая проверка для страницы ${item.link}, требуется право: ${requiredPermission}`);
          
          // Если требуется массив прав, проверяем любое из них
          let hasSpecialAccess = false;
          if (Array.isArray(requiredPermission)) {
            const results = await Promise.all(
              requiredPermission.map(slug => checkPermissionWithCache(slug))
            );
            hasSpecialAccess = results.some(result => result);
          } else {
            hasSpecialAccess = await checkPermissionWithCache(requiredPermission);
          }
          
          if (!hasSpecialAccess) {
            console.log(`СКРЫТ - Пункт меню "${item.label}" скрыт из-за отсутствия специального права`);
            continue; // Пропускаем этот пункт
          }
        }
        
        // Добавляем пункт с отфильтрованным подменю
        console.log(`ВИДИМЫЙ - Пункт меню "${item.label}" видим пользователю`);
        result.push({
          ...item,
          submenu: filteredSubmenu
        });
      }
    }

    console.log(`Отфильтровано ${result.length} пунктов из ${items.length}`);
    return result;
  };

  // Загрузка и фильтрация меню при монтировании компонента
  // или при изменении прав пользователя
  useEffect(() => {
    const loadFilteredMenu = async () => {
      setIsLoading(true);
      try {
        console.log("Начинаем фильтрацию меню...");
        const filtered = await filterMenuItems(menuItems);
        console.log("Отфильтрованное меню:", filtered);
        setFilteredMenuItems(filtered);
      } catch (error) {
        console.error('Ошибка при фильтрации меню:', error);
        setFilteredMenuItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Фильтруем меню сразу, даже если права еще не загружены (для админов это не критично)
    loadFilteredMenu();
  }, [menuItems, userPermissions, userRoles]);

  // Инициализация открытых меню, находя все родительские элементы текущего пути
  const initializeOpenMenus = useCallback((items: MenuItem[], path: string): (number | string)[] => {
    const openIds: (number | string)[] = [];
    
    const findPath = (menuItems: MenuItem[], currentPath: (number | string)[] = []): (number | string)[] | null => {
      for (const item of menuItems) {
        const newPath = [...currentPath, item.id];
        
        if (item.link === path) {
          return newPath;
        }
        
        if (item.submenu) {
          const foundPath = findPath(item.submenu, newPath);
          if (foundPath) {
            return foundPath;
          }
        }
      }
      
      return null;
    };
    
    const pathToCurrentItem = findPath(items);
    if (pathToCurrentItem) {
      return pathToCurrentItem;
    }
    
    return openIds;
  }, []);

  // Установка открытых пунктов меню при изменении отфильтрованного меню или пути
  useEffect(() => {
    if (filteredMenuItems.length === 0) return;
    
    const storedOpenMenuIds = localStorage.getItem("openMenuIds");
    if (storedOpenMenuIds) {
      try {
        const parsedIds = JSON.parse(storedOpenMenuIds);
        setOpenMenuIds(parsedIds);
      } catch (e) {
        console.error("Ошибка при разборе ID открытых меню:", e);
        setOpenMenuIds([]);
      }
    } else {
      const initialOpenMenuIds = initializeOpenMenus(filteredMenuItems, router.pathname);
      setOpenMenuIds(initialOpenMenuIds);
    }
  }, [filteredMenuItems, router.pathname, initializeOpenMenus]);

  // Обработчик клика по меню
  const handleMenuClick = (id: number | string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    setOpenMenuIds(prevOpenMenuIds => {
      // Проверяем, открыт ли уже этот пункт меню
      const isOpen = prevOpenMenuIds.includes(id);
      
      if (isOpen) {
        // Если меню открыто, закрываем его и все его дочерние элементы
        const updatedMenuIds = prevOpenMenuIds.filter(menuId => {
          // Не включаем текущий ID и его дочерние ID
          if (menuId === id) return false;
          
          // Проверяем, является ли menuId дочерним для id
          const menuPath = findMenuPath(filteredMenuItems, menuId);
          if (!menuPath) return true;
          
          const parentPath = findMenuPath(filteredMenuItems, id);
          if (!parentPath) return true;
          
          // Проверяем, включает ли путь к menuId путь к id
          return !isDescendant(parentPath, menuPath);
        });
        
        return updatedMenuIds;
      } else {
        // Если пункт закрыт, открываем его
        return [...prevOpenMenuIds, id];
      }
    });
  };
  
  // Проверка, является ли один путь потомком другого
  const isDescendant = (parentPath: (number | string)[], childPath: (number | string)[]): boolean => {
    if (childPath.length <= parentPath.length) return false;
    
    for (let i = 0; i < parentPath.length; i++) {
      if (parentPath[i] !== childPath[i]) return false;
    }
    
    return true;
  };
  
  // Находит путь к элементу меню по ID
  const findMenuPath = (
    items: MenuItem[], 
    targetId: number | string, 
    currentPath: (number | string)[] = []
  ): (number | string)[] | null => {
    for (const item of items) {
      const path = [...currentPath, item.id];
      
      if (item.id === targetId) {
        return path;
      }
      
      if (item.submenu) {
        const subPath = findMenuPath(item.submenu, targetId, path);
        if (subPath) return subPath;
      }
    }
    
    return null;
  };

  // Сохранение открытых пунктов меню в localStorage
  useEffect(() => {
    if (openMenuIds.length > 0) {
      localStorage.setItem("openMenuIds", JSON.stringify(openMenuIds));
    }
  }, [openMenuIds]);

  // Проверка активного пункта меню
  const hasActiveLink = useCallback(
    (list: MenuItem[]) => {
      if (!list) return false;
      for (const menuItem of list) {
        if (menuItem.link === router.pathname) {
          return true;
        } else if (menuItem.submenu && hasActiveLink(menuItem.submenu)) {
          return true;
        }
      }
      return false;
    },
    [router.pathname]
  );

  // Проверка, открыт ли пункт меню
  const isMenuOpen = useCallback(
    (menuId: number | string) => {
      return openMenuIds.includes(menuId);
    },
    [openMenuIds]
  );

  // Проверка, есть ли открытые подпункты
  const hasOpenedSubMenu = useCallback(
    (list: MenuItem[]) => {
      if (!list) return false;
      for (const menuItem of list) {
        if (openMenuIds.includes(menuItem.id)) {
          return true;
        } else if (menuItem.submenu && hasOpenedSubMenu(menuItem.submenu)) {
          return true;
        }
      }
      return false;
    },
    [openMenuIds]
  );

  // Если все еще загружаем меню, показываем индикатор загрузки
  if (isLoading) {
    return (
      <div className="menu-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Загрузка...</span>
        </div>
        <div className="mt-2">Загрузка меню...</div>
      </div>
    );
  }

  // Если после фильтрации не осталось пунктов меню
  if (filteredMenuItems.length === 0) {
    return (
      <div className="pc-navbar">
        <div className="pc-item pc-caption">
          <label>Меню недоступно</label>
        </div>
      </div>
    );
  }

  // Функция рендеринга пунктов меню
  const renderMenu = (items: MenuItem[]) => {
    return items.map((item, index) => (
      <li
        key={index}
        onClick={(e) => {
          item.type !== "HEADER" && handleMenuClick(item.id, e);
        }}
        className={`pc-item ${item.type === "HEADER"
          ? "pc-caption"
          : item.type === "HASHMENU"
            ? "pc-hashmenu"
            : ""
          } ${isMenuOpen(item.id) || hasOpenedSubMenu(item.submenu || [])
            ? "pc-trigger"
            : ""
          } ${item.link === router.pathname || hasActiveLink(item.submenu || [])
            ? "active"
            : ""}`}
      >
        {item.type === "HEADER" && <label suppressHydrationWarning>{t(item.label)}</label>}
        {item.type !== "HEADER" && (
          <Link to={item.link || "#"} className="pc-link">
            {item.icon && (
              <span className="pc-micon">
                <i className={item.icon}></i>
              </span>
            )}
            <span className="pc-mtext" suppressHydrationWarning>{t(item.label)}</span>
            {item.submenu && (
              <span className="pc-arrow">
                <FeatherIcon icon={isMenuOpen(item.id) ? "chevron-down" : "chevron-right"} />
              </span>
            )}
            {item.badge && <span className="pc-badge">{item.badge}</span>}
          </Link>
        )}
        {item.submenu && (
          <ul className={`pc-submenu ${isMenuOpen(item.id) ? "open" : ""}`} 
              style={{ display: isMenuOpen(item.id) ? "block" : "none" }}>
            {renderMenu(item.submenu || [])}
          </ul>
        )}
      </li>
    ));
  };

  return (
    <>
      <style>
        {`
          /* Стили для скроллинга меню */
          .pc-navbar {
            max-height: calc(100vh - 70px);
            overflow-y: auto;
            overflow-x: hidden;
            scrollbar-width: thin;
            scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
          }
          
          .pc-navbar::-webkit-scrollbar {
            width: 6px;
          }
          
          .pc-navbar::-webkit-scrollbar-track {
            background: transparent;
          }
          
          .pc-navbar::-webkit-scrollbar-thumb {
            background-color: rgba(0, 0, 0, 0.2);
            border-radius: 3px;
          }
          
          /* Анимация для плавного открытия/закрытия подменю */
          .pc-submenu {
            transition: max-height 0.3s ease-in-out;
            overflow: hidden;
          }
          
          /* Индикатор активного пути в меню */
          .pc-item.active > .pc-link {
            font-weight: bold;
            background-color: rgba(0, 0, 0, 0.05);
          }
          
          /* Выделение открытых категорий меню */
          .pc-item.pc-trigger > .pc-link {
            border-left: 3px solid #007bff;
          }
          
          /* Стиль для индикатора загрузки меню */
          .menu-loading {
            padding: 20px;
            text-align: center;
            color: #666;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 200px;
          }
          
          /* Добавляем стиль для вращающегося спиннера */
          .spinner-border {
            width: 2rem;
            height: 2rem;
          }
        `}
      </style>
      <div className="pc-navbar">
        {renderMenu(filteredMenuItems)}
      </div>
    </>
  );
};

export default NestedMenu;