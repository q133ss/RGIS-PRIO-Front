import React from 'react'
import { AccountData } from './FinaceData'
import { Card, CardBody, Col } from 'react-bootstrap'

const Accounts = () => {
    return (
        <React.Fragment>
            <Col md={12} xxl={4}>
                <Card>
                    <CardBody>
                        <h5 className="mb-3">Accounts</h5>
                        <div className="row g-3">
                            {
                                AccountData.map((items: any, index: any) => {
                                    return (
                                        <div key={index} className="col-12">
                                            <Card className="shadow-none border mb-0">
                                                <CardBody className="p-3">
                                                    <div className="d-flex align-items-center">
                                                        <div className="flex-shrink-0">
                                                            <img src={items.img} alt="img" className="img-fluid" />
                                                        </div>
                                                        <div className="flex-grow-1 ms-3">
                                                            <div className="d-flex align-items-center justify-content-center gap-2 text-success">
                                                                <i className="ti ti-circle f-10"></i>
                                                                <p className="mb-0">{items.type}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex-shrink-0">
                                                            <h6 className="mb-0">{items.amount}</h6>
                                                            <p className="mb-0">{items.currency}</p>
                                                        </div>
                                                    </div>
                                                </CardBody>
                                            </Card>
                                        </div>
                                    )
                                })
                            }
                            <div className="col-12">
                                <input className="form-control d-none" type="file" id="formFile" />
                                <label htmlFor="formFile" className="form-label d-block mb-0">
                                    <span className="card shadow-none border mb-0">
                                        <span className="card-body p-3 text-center">
                                            <span className="d-flex align-items-center justify-content-center gap-2 flex-column">
                                                <span className="avtar avtar-s bg-dark text-white rounded-circle">
                                                    <i className="ti ti-plus f-18"></i>
                                                </span>
                                                <span className="text-muted">Add to Account</span>
                                            </span>
                                        </span>
                                    </span>
                                </label>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </Col>
        </React.Fragment>
    )
}

export default Accounts
