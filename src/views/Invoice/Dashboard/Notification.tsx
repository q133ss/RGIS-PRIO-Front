import React, {useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Col, Card, CardBody } from 'react-bootstrap'

const Notification = ({display,handleDropDown,handleClickOutside,dropdownRef}:any) => {
   
    useEffect(() => {
      document.addEventListener('click', handleClickOutside);
  
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }, []);

    return (
        <React.Fragment>
            <Col xl={4} md={6}>
                <Card>
                    <CardBody className='pb-0'>
                        <div className="d-flex align-items-center justify-content-between">
                            <h5 className="mb-0">Notification</h5>
                            <div className="dropdown">
                                <Link
                                    ref={dropdownRef}
                                    className={`avtar avtar-s btn-link-secondary dropdown-toggle arrow-none ${display === 3 ? "show" : ""}`}
                                    to="#"
                                    data-bs-toggle="dropdown"
                                    aria-haspopup="true"
                                    aria-expanded="false"
                                    onClick={()=>handleDropDown(3)}
                                >
                                    <i className="ti ti-dots-vertical f-18"></i>
                                </Link>
                                <div className={`dropdown-menu dropdown-menu-end ${display === 3 ? "show show2" : ""}`}>
                                    <Link className="dropdown-item" to="#" onClick={handleDropDown}>Today</Link>
                                    <Link className="dropdown-item" to="#" onClick={handleDropDown}>Weekly</Link>
                                    <Link className="dropdown-item" to="#" onClick={handleDropDown}>Monthly</Link>
                                </div>
                            </div>
                        </div>
                    </CardBody>
                    <ul className="list-group list-group-flush border-top-0">
                        <li className="list-group-item border-0">
                            <div className="d-flex align-items-center">
                                <div className="flex-shrink-0">
                                    <div className="avtar bg-light-success rounded-circle">
                                        <i className="ti ti-file-download f-26"></i>
                                    </div>
                                </div>
                                <div className="flex-grow-1 mx-2">
                                    <h6 className="mb-1">Johnny sent you an invoice billed <a href="#!" className="link-primary">$1,000</a>.</h6>
                                    <p className="mb-0 text-muted text-sm">2 August</p>
                                </div>
                                <div className="flex-shrink-0">
                                    <Link to="#!" className="avtar avtar-s btn-link-secondary"><i className="ti ti-link"></i></Link>
                                </div>
                            </div>
                        </li>
                        <li className="list-group-item border-0">
                            <div className="d-flex align-items-center">
                                <div className="flex-shrink-0">
                                    <div className="avtar bg-light-primary rounded-circle">
                                        <i className="ti ti-file-text f-26"></i>
                                    </div>
                                </div>
                                <div className="flex-grow-1 mx-2">
                                    <h6 className="mb-1">Sent an invoice to Aida Bugg amount of <a href="#!" className="link-primary">$200</a>.</h6>
                                    <p className="mb-0 text-muted text-sm">7 hours ago</p>
                                </div>
                                <div className="flex-shrink-0">
                                    <Link to="#!" className="avtar avtar-s btn-link-secondary"><i className="ti ti-link"></i></Link>
                                </div>
                            </div>
                        </li>
                        <li className="list-group-item border-0">
                            <div className="d-flex align-items-center">
                                <div className="flex-shrink-0">
                                    <div className="avtar bg-light-danger rounded-circle">
                                        <i className="ti ti-adjustments f-26"></i>
                                    </div>
                                </div>
                                <div className="flex-grow-1 mx-2">
                                    <h6 className="mb-1">There was a failure to your setup</h6>
                                    <p className="mb-0 text-muted text-sm">7 hours ago</p>
                                </div>
                                <div className="flex-shrink-0">
                                    <Link to="#!" className="avtar avtar-s btn-link-secondary"><i className="ti ti-link"></i></Link>
                                </div>
                            </div>
                        </li>
                        <li className="list-group-item border-0">
                            <div className="d-flex align-items-center">
                                <div className="flex-shrink-0">
                                    <div className="avtar bg-light-primary rounded-circle">
                                        <span className="f-24 fw-normal">c</span>
                                    </div>
                                </div>
                                <div className="flex-grow-1 mx-2">
                                    <h6 className="mb-1">Cristina danny invited to you join Meeting</h6>
                                    <p className="mb-0 text-muted text-sm">7 hours ago</p>
                                </div>
                                <div className="flex-shrink-0">
                                    <Link to="#!" className="avtar avtar-s btn-link-secondary"><i className="ti ti-link"></i></Link>
                                </div>
                            </div>
                        </li>
                        <li className="list-group-item border-0">
                            <div className="d-flex align-items-center">
                                <div className="flex-shrink-0">
                                    <div className="avtar bg-light-primary rounded-circle">
                                        <span className="f-24 fw-normal">c</span>
                                    </div>
                                </div>
                                <div className="flex-grow-1 mx-2">
                                    <h6 className="mb-1">Cristina danny invited to you join Meeting</h6>
                                    <p className="mb-0 text-muted text-sm">7 hours ago</p>
                                </div>
                                <div className="flex-shrink-0">
                                    <Link to="#!" className="avtar avtar-s btn-link-secondary"><i className="ti ti-link"></i></Link>
                                </div>
                            </div>
                        </li>
                        <li className="list-group-item border-0">
                            <div className="d-grid">
                                <button className="btn btn-outline-secondary">View All</button>
                            </div>
                        </li>
                    </ul>
                </Card>
            </Col>
        </React.Fragment>
    )
}

export default Notification
