const menuItems = [
    // { label: "Widget", type: "HEADER" },
    { id: "dashboard", label: "Дашборды", icon: "ph-duotone ph-gauge", link: "/widget/w_statistics", dataPage: "w_statistics" },
    { id: "maps", label: "Карты", icon: "ph-duotone ph-gauge", link: "#", dataPage: "w_statistics",
        submenu: [
            { id: "heat-map", label: "Карта теплоснабжения", link: "#",
                submenu: [
                    { id: "mkd", label: "МКД", link: "/mkd", dataPage: "mkd"},
                ]
            },
            { id: "disconect", label: "Аварии и отключения", link: "#", 
                submenu: [
                    { id: "incidents-list", label: "Список аварий", link: "/incidents", dataPage: "incidents-list" },
                    { id: "incidents-map", label: "Карта инцидентов", link: "/incidents/map", dataPage: "incidents-map" },
                    { id: "disconects-list", label: "Список отключений", link: "/outages", dataPage: "disconects-list" }
                ]
            },
            { id: "utility-card", label: "Карта коммунальных услуг", link: "/maps/communal-services"},
            { id: "free-map", label: "Карта свободных мощностей", link: "/maps/free-capacity"},
            { id: "free-capacity", label: "Свободные мощности", link: "/free-capacity-list"},
            { id: "ogv-map", label: "Карта теплоснабжения для ОГВ, ОМСУ и РСО (Закрытая)", link: "/maps/heat-supply"},
             
        ]
     },
    {
        type: "HASHMENU", id: 1, label: "Процессы/Эксплуатация", icon: "ph-duotone ph-gauge", dataPage: null, link: "#",
        submenu: [
            { id: "edds", label: "ЕДДС", link: "#", dataPage: "edds",
                submenu: [
                  { id: "accidents", label: "Аварии", link: "/edds/accidents", dataPage: "edds-accidents" },
                  { id: "planned-works", label: "Плановые работы", link: "/edds/planned-works", dataPage: "edds-planned-works" },
                  { id: "seasonal-works", label: "Сезонные работы", link: "/edds/seasonal-works", dataPage: "edds-seasonal-works" }
                ]
              },
            { id: "monitoring", label: "Мониторинг", link: "/monitoring", dataPage: "monitoring" }
        ]
    },
    { id: "resister", label: "Реестры/Инвентаризация", icon: "ph-duotone ph-database", link: "#", dataPage: "resister",
        submenu: [
            { id: "oks", label: "ОКС", link: "#", dataPage: "oks",
                submenu: [
                    { id: "mkd", label: "МКД", link: "/buildings-list", dataPage: "mkd"},
                ]
            },
            { id: "oki", label: "ОКИ", link: "#", dataPage: "oki",
                submenu: [
                    { id: "heating", label: "Теплоснабжение",
                        submenu: [
                            { id: "heat-sources", label: "Теплоисточники", link: "/heat-sources", dataPage: "heat-sources"},
                            { id: "heating-periods", label: "Отопительные периоды МКД", link: "/registers/heat-supply/heating-periods", dataPage: "heating-periods"},
                        ]
                    },
                    { id: "mkd-section", label: "МКД",
                        submenu: [
                            { id: "mkd-schedules", label: "Графики включения/отключения", link: "/registers/mkd/schedules", dataPage: "mkd-schedules"},
                        ]
                    }
                ]
            },
            { id: "graphics", label: "Графики", submenu:[
                { id: "heating-period-graph", label: "Графики начала/окончания отопительного периода", link: "/mkd-graph", dataPage: "heating-period-graph"},
            ]},
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
            { id: "general-settings", label: "Основные", link: "/admin/settings", dataPage: "general-settings" },
            { id: "users-settings", label: "Сотрудники", link: "/admin/users", dataPage: "users-settings" },
            { id: "roles-settings", label: "Роли и доступы", link: "/admin/roles", dataPage: "roles-settings" },
            { id: "logs-settings", label: "Журнал", link: "/admin/logs", dataPage: "logs-settings" }
        ]
     },
];

export { menuItems };