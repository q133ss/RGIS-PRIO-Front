import Index from "../pages";

import Dashboard from "../pages/Dashboard";

import HeatSources from '../views/Registers/HeatSupply/HeatSources';
import BuildingsList from '../views/Registers/MKD/BuildingsList';
import PersonalInfo from "../views/application/Users/PersonalInfo";
import UserManagement from "../views/admin/Users/UserManagement";
import MkdSchedules from "../views/Registers/MKD/MkdSchedules";
import RolesManagement from '../views/admin/Roles/RolesManagement';
import HeatingPeriods from "../views/Registers/HeatSupply/HeatingPeriods";
import IncidentsMap from "../views/Incidents/IncidentsMap";
import HeatSupplyMap from "../views/Maps/HeatSupplyMap";
import FreeCapacityMap from "../views/Maps/FreeCapacityMap";
import CommunalServicesMap from "../views/Maps/CommunalServicesMap";
import IncidentsList from "../views/Incidents/IncidentsList";
import MonitoringPage from "../views/Monitoring/MonitoringPage";
import HeatingSchedulePage from "../views/HeatingSchedule/HeatingSchedulePage";
import EddsAccidentsPage from "../views/EDDS/Accidents/EddsAccidentsPage";
import EddsPlannedWorksPage from "../views/EDDS/PlannedWorks/EddsPlannedWorksPage";
import EddsSeasonalWorksPage from "../views/EDDS/SeasonalWorks/EddsSeasonalWorksPage";
import FreeCapacityList from "../views/Maps/FreeCapacity/FreeCapacityList";
import ActionLogPage from "../views/admin/Logs/ActionLog";
import MkdMap from "../views/Maps/MkdMap";
import OutagesList from "../views/Incidents/OutagesList";
import SystemSettingsPage from "../views/admin/Settings/SystemSettings";

const routes = [
    { path: "/dashboard", component: <Dashboard /> },
    { path: "/mkd", component: <MkdMap /> },
    { path: "/incidents", component: <IncidentsList /> },
    { path: "/incidents/map", component: <IncidentsMap /> },
    { path: "/outages", component: <OutagesList /> },
    { path: "/maps/communal-services", component: <CommunalServicesMap /> },
    { path: "/maps/heat-supply", component: <HeatSupplyMap /> },
    { path: "/maps/free-capacity", component: <FreeCapacityMap /> },
    { path: "/free-capacity-list", component: <FreeCapacityList /> },
    { path: "/edds/accidents", component: <EddsAccidentsPage /> },
    { path: "/edds/planned-works", component: <EddsPlannedWorksPage /> },
    { path: "/edds/seasonal-works", component: <EddsSeasonalWorksPage /> },
    { path: "/mkd-graph", component: <HeatingSchedulePage /> },
    { path: "/monitoring", component: <MonitoringPage /> },
    { path: "/admin/settings", component: <SystemSettingsPage /> },
    { path: "/admin/logs", component: <ActionLogPage /> },
    { path: '/buildings-list', component: <BuildingsList /> },
    { path: '/heat-sources', component: <HeatSources /> },
    { path: "/registers/heat-supply/heating-periods", component: <HeatingPeriods /> },
    { path: "/registers/mkd/schedules", component: <MkdSchedules /> },
    { path: "/admin/users", component: <UserManagement /> },
    { path: "/admin/roles", component: <RolesManagement /> },
    { path: "/personal-info", component: <PersonalInfo /> }
];

const nonAuthRoutes = [

    { path: "/", component: <Index /> },
    // //Authentication1
    // { path: "/pages/login-v1", component: <LoginV1 /> },
    // { path: "/pages/register-v1", component: <Registerv1 /> },
    // { path: "/pages/forgot-password-v1", component: <ForgotPassowordV1 /> },
    // { path: "/pages/reset-password-v1", component: <Resetpasswordv1 /> },
    // { path: "/pages/code-verification-v1", component: <CodeVerificationV1 /> },
    // { path: "/pages/login-v2", component: <LoginV2 /> },
    // { path: "/pages/register-v2", component: <RegisterV2 /> },
    // { path: "/pages/forgot-password-v2", component: <ForgotPassowordV2 /> },
    // { path: "/pages/reset-password-v2", component: <ResetPasswordV2 /> },
    // { path: "/pages/code-verification-v2", component: <CodeVerificationV2 /> },
    // { path: "/pages/error-404", component: <Error404 /> },
    // { path: "/pages/connection-lost", component: <ConnectionLost /> },
    // { path: "/pages/under-construction", component: <UnderConstruction /> },
    // { path: "/pages/coming-soon", component: <ComingSoon /> },

]

export {
    routes,
    nonAuthRoutes
}
