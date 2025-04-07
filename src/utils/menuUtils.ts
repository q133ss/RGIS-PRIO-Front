import { checkPermissionWithCache } from '../services/permissionsService';

// Обновленный интерфейс MenuItem с поддержкой числовых ID


/**
 * Фильтрует меню на основе прав доступа пользователя
 */
export const filterMenuByPermissions = async (items: any[]): Promise<any[]> => {
  const result: any[] = [];
  
  for (const item of items) {
    // Проверяем право доступа для текущего пункта меню
    const access = await checkPermissionWithCache(item.permission === undefined ? null : item.permission);
    
    if (!access) continue;
    
    // Если есть подменю, фильтруем его
    if (item.submenu && item.submenu.length > 0) {
      const filteredSubmenu = await filterMenuByPermissions(item.submenu);
      
      // Если после фильтрации подменю пусто, пропускаем родительский пункт (если он не имеет собственного линка)
      if (filteredSubmenu.length === 0 && !item.link) continue;
      
      const newItem = { ...item };
      if (filteredSubmenu.length > 0) {
        newItem.submenu = filteredSubmenu;
      } else {
        delete newItem.submenu;
      }
      
      result.push(newItem);
    } else {
      result.push({ ...item });
    }
  }
  
  return result;
};