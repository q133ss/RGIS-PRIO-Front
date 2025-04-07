import React, { useEffect } from 'react'
import { ExpensTypeData } from './FinaceData'
import { Link } from 'react-router-dom'
import { Card, CardBody, Col, Row } from 'react-bootstrap';

const ExpensType = ({display,handleDropDown,handleClickOutside,dropdownRef}:any) => {

    useEffect(() => {
        document.addEventListener('click', handleClickOutside);

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);


    return (
        <React.Fragment>
            <Card>
                <CardBody>
                    <div className="d-flex align-items-center justify-content-between mb-3">
                        <h5 className="mb-0">Where your money go ?</h5>
                        <button className="btn btn-sm btn-primary">+ Add New</button>
                    </div>
                    <Row className="g-3">
                        {
                            ExpensTypeData.map((item: any, index: number) => {
                                return (
                                    <Col md={6} xxl={3} key={index} className="col-md-6 col-xxl-3">
                                        <Card className="shadow-none border mb-0">
                                            <CardBody className="p-3">
                                                <div className="d-flex align-items-center justify-content-between mb-3">
                                                    <img src={item.img} alt="img" className="img-fluid" />
                                                    <div className="dropdown">
                                                        <Link
                                                            ref={dropdownRef}
                                                            className={`avtar avtar-xs btn-link-secondary dropdown-toggle arrow-none ${display === item.id ? "show" : ""}`} to="#"
                                                            data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false" onClick={() => handleDropDown(item.id)}>
                                                            <i className="ti ti-dots-vertical f-18"></i>
                                                        </Link>
                                                        <div className={`dropdown-menu dropdown-menu-end ${display === item.id ? "show show2" : ""}`}>
                                                            <Link className="dropdown-item" to="#" onClick={handleDropDown}>Today</Link>
                                                            <Link className="dropdown-item" to="#" onClick={handleDropDown}>Weekly</Link>
                                                            <Link className="dropdown-item" to="#" onClick={handleDropDown}>Monthly</Link>
                                                        </div>
                                                    </div>
                                                </div>
                                                <h6 className="mb-3">Food & Drink</h6>
                                                <div className="bg-dark p-3 pt-4 rounded-4">
                                                    <div className="progress bg-white bg-opacity-25" style={{ height: "6px" }}>
                                                        <div className="progress-bar bg-white" style={{ width: `${item.percentage}` }}></div>
                                                    </div>
                                                    <div className="d-flex align-items-center justify-content-between mt-2">
                                                        <p className="mb-0 text-white text-opacity-75 text-sm">{item.percentage}</p>
                                                        <p className="mb-0 text-white text-opacity-75 text-sm">{item.total_amount}</p>
                                                    </div>
                                                </div>
                                            </CardBody>
                                        </Card>
                                    </Col>
                                )
                            })
                        }
                        {/* <div className="col-md-6 col-xxl-3">
                            <div className="card shadow-none border mb-0">
                                <div className="card-body p-3">
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <img src="../assets/images/widget/img-food.png" alt="img" className="img-fluid">
                                            <div className="dropdown">
                                                <a className="avtar avtar-xs btn-link-secondary dropdown-toggle arrow-none" href="#"
                                                    data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                                    <i className="ti ti-dots-vertical f-18"></i>
                                                </a>
                                                <div className="dropdown-menu dropdown-menu-end">
                                                    <a className="dropdown-item" href="#">Today</a>
                                                    <a className="dropdown-item" href="#">Weekly</a>
                                                    <a className="dropdown-item" href="#">Monthly</a>
                                                </div>
                                            </div>
                                    </div>
                                    <h6 className="mb-3">Food & Drink</h6>
                                    <div className="bg-dark p-3 pt-4 rounded-4">
                                        <div className="progress bg-white bg-opacity-25" style="height: 6px;">
                                            <div className="progress-bar bg-white" style="width: 65%"></div>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between mt-2">
                                            <p className="mb-0 text-white text-opacity-75 text-sm">65%</p>
                                            <p className="mb-0 text-white text-opacity-75 text-sm">$1000</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6 col-xxl-3">
                            <div className="card shadow-none border mb-0">
                                <div className="card-body p-3">
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <img src="../assets/images/widget/img-travel.png" alt="img" className="img-fluid">
                                            <div className="dropdown">
                                                <a className="avtar avtar-xs btn-link-secondary dropdown-toggle arrow-none" href="#"
                                                    data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                                    <i className="ti ti-dots-vertical f-18"></i>
                                                </a>
                                                <div className="dropdown-menu dropdown-menu-end">
                                                    <a className="dropdown-item" href="#">Today</a>
                                                    <a className="dropdown-item" href="#">Weekly</a>
                                                    <a className="dropdown-item" href="#">Monthly</a>
                                                </div>
                                            </div>
                                    </div>
                                    <h6 className="mb-3">Travel</h6>
                                    <div className="bg-dark p-3 pt-4 rounded-4">
                                        <div className="progress bg-white bg-opacity-25" style="height: 6px;">
                                            <div className="progress-bar bg-white" style="width: 30%"></div>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between mt-2">
                                            <p className="mb-0 text-white text-opacity-75 text-sm">30%</p>
                                            <p className="mb-0 text-white text-opacity-75 text-sm">$400</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6 col-xxl-3">
                            <div className="card shadow-none border mb-0">
                                <div className="card-body p-3">
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <img src="../assets/images/widget/img-shoping.png" alt="img" className="img-fluid">
                                            <div className="dropdown">
                                                <a className="avtar avtar-xs btn-link-secondary dropdown-toggle arrow-none" href="#"
                                                    data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                                    <i className="ti ti-dots-vertical f-18"></i>
                                                </a>
                                                <div className="dropdown-menu dropdown-menu-end">
                                                    <a className="dropdown-item" href="#">Today</a>
                                                    <a className="dropdown-item" href="#">Weekly</a>
                                                    <a className="dropdown-item" href="#">Monthly</a>
                                                </div>
                                            </div>
                                    </div>
                                    <h6 className="mb-3">Shopping</h6>
                                    <div className="bg-dark p-3 pt-4 rounded-4">
                                        <div className="progress bg-white bg-opacity-25" style="height: 6px;">
                                            <div className="progress-bar bg-white" style="width: 52%"></div>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between mt-2">
                                            <p className="mb-0 text-white text-opacity-75 text-sm">52%</p>
                                            <p className="mb-0 text-white text-opacity-75 text-sm">$900</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6 col-xxl-3">
                            <div className="card shadow-none border mb-0">
                                <div className="card-body p-3">
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <img src="../assets/images/widget/img-helth.png" alt="img" className="img-fluid">
                                            <div className="dropdown">
                                                <a className="avtar avtar-xs btn-link-secondary dropdown-toggle arrow-none" href="#"
                                                    data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                                    <i className="ti ti-dots-vertical f-18"></i>
                                                </a>
                                                <div className="dropdown-menu dropdown-menu-end">
                                                    <a className="dropdown-item" href="#">Today</a>
                                                    <a className="dropdown-item" href="#">Weekly</a>
                                                    <a className="dropdown-item" href="#">Monthly</a>
                                                </div>
                                            </div>
                                    </div>
                                    <h6 className="mb-3">Healthcare</h6>
                                    <div className="bg-dark p-3 pt-4 rounded-4">
                                        <div className="progress bg-white bg-opacity-25" style="height: 6px;">
                                            <div className="progress-bar bg-white" style="width: 52%"></div>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between mt-2">
                                            <p className="mb-0 text-white text-opacity-75 text-sm">26%</p>
                                            <p className="mb-0 text-white text-opacity-75 text-sm">$250</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div> */}
                    </Row>
                </CardBody>
            </Card>
        </React.Fragment>
    )
}

export default ExpensType
