const menuItems = [
  // { label: "Widget", type: "HEADER" },
  { 
    id: "dashboard", 
    label: "Дашборды", 
    icon: "ph-duotone ph-gauge", 
    link: "/dashboard", 
    dataPage: "w_statistics",
    permission: "view_hs" // Базовое право, чтобы видеть дашборд
  },
  { 
    id: "maps", 
    label: "Карты", 
    icon: "ph-duotone ph-gauge", 
    link: "#", 
    dataPage: "w_statistics",
    submenu: [
        { 
          id: "heat-map", 
          label: "Карта теплоснабжения", 
          link: "#",
          permission: "view_hs",
          submenu: [
              { 
                id: "mkd", 
                label: "МКД", 
                link: "/mkd", 
                dataPage: "mkd",
                permission: "view_mkd"
              },
          ]
        },
        { 
          id: "disconect", 
          label: "Аварии и отключения", 
          link: "#", 
          permission: ["view_emergency"], // Исправлено: используем только view_emergency
          submenu: [
              { 
                id: "incidents-list", 
                label: "Список аварий", 
                link: "/incidents", 
                dataPage: "incidents-list",
                permission: "view_emergency"
              },
              { 
                id: "incidents-map", 
                label: "Карта инцидентов", 
                link: "/incidents/map", 
                dataPage: "incidents-map",
                permission: "view_emergency"
              },
              { 
                id: "disconects-list", 
                label: "Список отключений", 
                link: "/outages", 
                dataPage: "disconects-list",
                permission: "view_emergency"
              }
          ]
        },
        { 
          id: "utility-card", 
          label: "Карта коммунальных услуг", 
          link: "/maps/communal-services",
          permission: "view_mkd" // Исправлено: теперь совпадает с keyPagePermissions
        },
        { 
          id: "free-map", 
          label: "Карта свободных мощностей", 
          link: "/maps/free-capacity",
          permission: "view_capacity"
        },
        { 
          id: "free-capacity", 
          label: "Свободные мощности", 
          link: "/free-capacity-list",
          permission: "view_capacity"
        },
        { 
          id: "ogv-map", 
          label: "Карта теплоснабжения для ОГВ, ОМСУ и РСО (Закрытая)", 
          link: "/maps/heat-supply",
          permission: "view_hs_map"
        },
    ]
  },
  {
      type: "HASHMENU", 
      id: 1, 
      label: "Процессы/Эксплуатация", 
      icon: "ph-duotone ph-gauge", 
      dataPage: null, 
      link: "#",
      permission: ["view_emergency", "view_monitoring"], // Исправлено: добавили view_monitoring
      submenu: [
          { 
            id: "edds", 
            label: "ЕДДС", 
            link: "#", 
            dataPage: "edds",
            permission: "view_emergency", // Исправлено: теперь используем view_emergency
            submenu: [
              { 
                id: "accidents", 
                label: "Аварии", 
                link: "/edds/accidents", 
                dataPage: "edds-accidents",
                permission: "view_emergency"
              },
              { 
                id: "planned-works", 
                label: "Плановые работы", 
                link: "/edds/planned-works", 
                dataPage: "edds-planned-works",
                permission: "view_emergency"
              },
              { 
                id: "seasonal-works", 
                label: "Сезонные работы", 
                link: "/edds/seasonal-works", 
                dataPage: "edds-seasonal-works",
                permission: "view_emergency"
              }
            ]
          },
          { 
            id: "monitoring", 
            label: "Мониторинг", 
            link: "/monitoring", 
            dataPage: "monitoring",
            permission: "view_monitoring" // Совпадает с keyPagePermissions
          }
      ]
  },
  { 
    id: "resister", 
    label: "Реестры/Инвентаризация", 
    icon: "ph-duotone ph-database", 
    link: "#", 
    dataPage: "resister",
    permission: ["view_hs", "view_mkd", "view_oks"],
    submenu: [
        { 
          id: "oks", 
          label: "ОКС", 
          link: "#", 
          dataPage: "oks",
          permission: ["view_mkd", "view_oks"],
          submenu: [
              { 
                id: "mkd", 
                label: "МКД", 
                link: "/buildings-list", 
                dataPage: "mkd",
                permission: "view_mkd"
              },
          ]
        },
        { 
          id: "oki", 
          label: "ОКИ", 
          link: "#", 
          dataPage: "oki",
          permission: "view_hs",
          submenu: [
              { 
                id: "heating", 
                label: "Теплоснабжение",
                permission: "view_hs",
                submenu: [
                    { 
                      id: "heat-sources", 
                      label: "Теплоисточники", 
                      link: "/heat-sources", 
                      dataPage: "heat-sources",
                      permission: "view_hs"
                    },
                    { 
                      id: "heating-periods", 
                      label: "Отопительные периоды МКД", 
                      link: "/registers/heat-supply/heating-periods", 
                      dataPage: "heating-periods",
                      permission: "view_hs_period" // Совпадает с keyPagePermissions
                    },
                ]
              },
              { 
                id: "mkd-section", 
                label: "МКД",
                permission: "view_mkd",
                submenu: [
                    { 
                      id: "mkd-schedules", 
                      label: "Графики включения/отключения", 
                      link: "/registers/mkd/schedules", 
                      dataPage: "mkd-schedules",
                      permission: "view_mkd" // Совпадает с keyPagePermissions
                    },
                ]
              }
          ]
        },
        { 
          id: "graphics", 
          label: "Графики", 
          permission: "view_mkd_heating_periods",
          submenu:[
              { 
                id: "heating-period-graph", 
                label: "Графики начала/окончания отопительного периода", 
                link: "/mkd-graph", 
                dataPage: "heating-period-graph",
                permission: "view_mkd_heating_periods"
              },
          ]
        },
    ]
  },
  // Добавляем пункт "Настройки" в основное меню
  { 
    id: "settings", 
    label: "Настройки", 
    icon: "ph-duotone ph-gear", 
    link: "#", 
    dataPage: "settings",
    roles: ["admin", "super_admin"], // только для администраторов
    submenu: [
        { 
          id: "general-settings", 
          label: "Основные", 
          link: "/admin/settings", 
          dataPage: "general-settings",
          roles: ["admin", "super_admin"]
        },
        { 
          id: "users-settings", 
          label: "Сотрудники", 
          link: "/admin/users", 
          dataPage: "users-settings",
          roles: ["admin", "super_admin"]
        },
        { 
          id: "roles-settings", 
          label: "Роли и доступы", 
          link: "/admin/roles", 
          dataPage: "roles-settings",
          roles: ["admin", "super_admin"]
        },
        { 
          id: "logs-settings", 
          label: "Журнал", 
          link: "/admin/logs", 
          dataPage: "logs-settings",
          roles: ["admin", "super_admin"]
        }
    ]
  },
];

export { menuItems };