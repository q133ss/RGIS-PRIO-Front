import React, { useEffect} from 'react'
import { Link } from 'react-router-dom'
import CatagoryChart from './CatagoryChart'
import { Card, CardBody, Col } from 'react-bootstrap';

const Catagory = ({display,handleDropDown,handleClickOutside,dropdownRef}:any) => {
    useEffect(() => {
        document.addEventListener('click', handleClickOutside);

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);
    return (
        <React.Fragment>
            <Col md={6} xxl={4}>
                <Card>
                    <CardBody>
                        <div className="d-flex align-items-center justify-content-between mb-3">
                            <h5 className="mb-0">Category</h5>
                            <div className="dropdown">
                                <Link
                                    ref={dropdownRef}
                                    className={`avtar avtar-s btn-link-secondary dropdown-toggle arrow-none ${display === 11 ? "show" : ""}`} to="#"
                                    data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false" onClick={()=>handleDropDown(11)}>
                                    <i className="ti ti-dots-vertical f-18"></i>
                                </Link>
                                <div className={`dropdown-menu dropdown-menu-end ${display === 11 ? "show show2" : ""}`}>
                                    <Link className="dropdown-item" to="#" onClick={handleDropDown}>Today</Link>
                                    <Link className="dropdown-item" to="#" onClick={handleDropDown}>Weekly</Link>
                                    <Link className="dropdown-item" to="#" onClick={handleDropDown}>Monthly</Link>
                                </div>
                            </div>
                        </div>
                        <div id="category-donut-chart"><CatagoryChart /></div>
                    </CardBody>
                </Card>
            </Col>
        </React.Fragment>
    )
}

export default Catagory
