import { Link, useLocation } from "react-router-dom";
import React, { useCallback, useEffect, useState } from "react";
import FeatherIcon from "feather-icons-react";
import { useTranslation } from "react-i18next";

interface MenuItem {
  id: number | string;
  label: string;
  type?: string;
  icon?: string;
  link?: string;
  badge?: string;
  dataPage?: string;
  submenu?: MenuItem[];
}

const NestedMenu: React.FC<{ menuItems: any }> = ({ menuItems }) => {  //MenuItem[]
  const router = useLocation();
  const [openMenuIds, setOpenMenuIds] = useState<(number | string)[]>([]);
  const { t } = useTranslation();
  console.log("openMenuIds", openMenuIds);

  // Инициализация открытых меню, находя все родительские элементы текущего пути
  const initializeOpenMenus = (items: MenuItem[], path: string): (number | string)[] => {
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
  };

  useEffect(() => {
    const storedOpenMenuIds = localStorage.getItem("openMenuIds");
    if (storedOpenMenuIds) {
      setOpenMenuIds(JSON.parse(storedOpenMenuIds));
    } else {
      const initialOpenMenuIds = initializeOpenMenus(menuItems, router.pathname);
      setOpenMenuIds(initialOpenMenuIds);
    }
  }, [menuItems, router.pathname]);

  // Обработчик клика по меню - теперь корректно переключает состояние
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
          const menuPath = findMenuPath(menuItems, menuId);
          if (!menuPath) return true;
          
          const parentPath = findMenuPath(menuItems, id);
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

  useEffect(() => {
    localStorage.setItem("openMenuIds", JSON.stringify(openMenuIds));
  }, [openMenuIds]);

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

  const isMenuOpen = useCallback(
    (menuId: number | string) => {
      return openMenuIds.includes(menuId);
    },
    [openMenuIds]
  );

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
        `}
      </style>
      <div className="pc-navbar">
        {renderMenu(menuItems)}
      </div>
    </>
  );
};

export default NestedMenu;