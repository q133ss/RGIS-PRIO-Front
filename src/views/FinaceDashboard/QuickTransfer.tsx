import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { QuickTransferData } from './FinaceData'

import avatar1 from '../../assets/images/user/avatar-1.jpg'
import avatar2 from '../../assets/images/user/avatar-2.jpg'
import avatar3 from '../../assets/images/user/avatar-3.jpg'
import avatar4 from '../../assets/images/user/avatar-4.jpg'
import { Card, CardBody, Col, Row } from 'react-bootstrap'

const QuickTransfer = ({ display, handleDropDown, handleClickOutside, dropdownRef }: any) => {

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
                            <h5 className="mb-0">Quick Transfer</h5>
                            <div className="dropdown">
                                <Link
                                    ref={dropdownRef}
                                    className={`avtar avtar-s btn-link-secondary dropdown-toggle arrow-none ${display === 10 ? "show" : ""}`} to="#"
                                    data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false" onClick={() => handleDropDown(10)}>
                                    <i className="ti ti-dots-vertical f-18"></i>
                                </Link>
                                <div className={`dropdown-menu dropdown-menu-end ${display === 10 ? "show show2" : ""}`}>
                                    <Link className="dropdown-item" to="#" onClick={handleDropDown}>Today</Link>
                                    <Link className="dropdown-item" to="#" onClick={handleDropDown}>Weekly</Link>
                                    <Link className="dropdown-item" to="#" onClick={handleDropDown}>Monthly</Link>
                                </div>
                            </div>
                        </div>
                        <div className="d-flex align-items-center justify-content-between gap-2 my-3">
                            <Link to="#" className="avtar border border-secondary rounded-circle btn-light-secondary">
                                <i className="ti ti-plus f-20"></i>
                            </Link>
                            <Link to="#" className="avtar"><img className="rounded-circle img-fluid" src={avatar1} alt="User image" /></Link>
                            <Link to="#" className="avtar"><img className="rounded-circle img-fluid" src={avatar2} alt="User image" /></Link>
                            <Link to="#" className="avtar"><img className="rounded-circle img-fluid" src={avatar3} alt="User image" /></Link>
                            <Link to="#" className="avtar"><img className="rounded-circle img-fluid" src={avatar4} alt="User image" /></Link>
                        </div>

                        <ul className="list-group list-group-flush">
                            {
                                QuickTransferData.map((items: any, index: number) => {
                                    return (
                                        <li key={index} className="list-group-item px-0">
                                            <div className="d-flex align-items-center">
                                                <div className="flex-shrink-0">
                                                    <img src={items.img} alt="img" className="wid-30 rounded-circle" />
                                                </div>
                                                <div className="flex-grow-1 ms-3">
                                                    <Row className="g-1">
                                                        <div className="col-6">
                                                            <h6 className="mb-0">{items.shope}</h6>
                                                            <p className="text-muted mb-0">{items.date}</p>
                                                        </div>
                                                        <div className="col-6 text-end">
                                                            <h5 className={`mb-1 ${items.textColor}`}>{items.price}</h5>
                                                        </div>
                                                    </Row>
                                                </div>
                                            </div>
                                        </li>
                                    )
                                })
                            }
                        </ul>
                    </CardBody>
                </Card>
            </Col>
        </React.Fragment>
    )
}

export default QuickTransfer
