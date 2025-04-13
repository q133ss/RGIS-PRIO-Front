import React from "react";
import { Row } from "react-bootstrap";

//import Components
import BreadcrumbItem from "../Common/BreadcrumbItem";

const Dashboard = () => {
   return (
       <React.Fragment>
       <BreadcrumbItem mainTitle="Dashboard" subTitle="Home" />
         <Row>
           {/* Контент страницы dashboard */}
         </Row>
       </React.Fragment>
   )
}

export default Dashboard;