import { createSelector } from '@reduxjs/toolkit';
import Routing from './Routes'
import { useSelector } from 'react-redux';
import { useEffect, useState } from 'react';
import { withTranslation } from 'react-i18next';
import { initPermissions } from './services/permissionsService';

function App() {
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  
  const SelecthemeLayout = createSelector(
    (state: any) => state.Theme,
    (state) => state.layoutTheme
  );
  const themeLayout = useSelector(SelecthemeLayout);
  const className = 'layout-3'
  const className2 = 'layout-extended'
  const className3 = 'layout-moduler'

  useEffect(() => {
    // Инициализация прав доступа при загрузке приложения
    const loadPermissions = async () => {
      await initPermissions();
      setPermissionsLoaded(true);
    };
    
    loadPermissions();
  }, []);

  useEffect(() => {
    if (themeLayout === 'vertical-tab') {
      document.body.classList.add(className);
    }

    if (themeLayout === 'extended') {
      document.body.classList.add(className2);
    }
    if (themeLayout === 'moduler') {
      document.body.classList.add(className3);
    }

    // Очистка при размонтировании
    return () => {
      document.body.classList.remove(className);
      document.body.classList.remove(className2);
      document.body.classList.remove(className3);
    };
  }, [themeLayout])

  // Показываем индикатор загрузки, пока права не загружены
  if (!permissionsLoaded) {
    return <div className="loading">Загрузка прав доступа...</div>;
  }

  return (
    <>
      <Routing />
    </>
  )
}

export default withTranslation()(App);