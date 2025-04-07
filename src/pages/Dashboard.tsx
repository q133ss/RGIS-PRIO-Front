import React from "react";
import { Row } from "react-bootstrap";

//import Components


import BreadcrumbItem from "../../../GISFILE/src/Common/BreadcrumbItem.tsx";
import Widgets from "../../../GISFILE/src/views/Dashboard/widgets.tsx";
import { widgetData,socialWidgetsData } from "../../../GISFILE/src/Common/jsonData";
import UnitedStatesMap from "../../../GISFILE/src/views/Dashboard/UnitedStatesMap.tsx";
import UsersCharts from "../../../GISFILE/src/views/Dashboard/UsersCharts.tsx";
import SocialWidgets from "../../../GISFILE/src/views/Dashboard/SocialWidgets.tsx";
import RecentUsers from "../../../GISFILE/src/views/Dashboard/RecentUsers.tsx";
import RecentTableData from "../../../GISFILE/src/views/Dashboard/RecentTableData.tsx";

const Dashboard = () => {
    return (
        <React.Fragment>
        <BreadcrumbItem mainTitle="Dashboard" subTitle="Home"  />
          <Row>
            <Widgets widgetData={widgetData} />
            <UnitedStatesMap />
            <UsersCharts />
            <SocialWidgets socialWidgetsData={socialWidgetsData} />
            <RecentUsers />
            <RecentTableData />
          </Row>
        </React.Fragment>
    )
}


export default Dashboard;