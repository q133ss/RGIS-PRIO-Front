import React from 'react'
import { Row, Col, Card, CardBody } from 'react-bootstrap'
import { InvoiceChart1, InvoiceChart2, InvoiceChart3 } from './InvoiceChart'

const Overview = () => {
    return (
        <React.Fragment>

            
            <Col xxl={8}>
                <Row className='g-3 mb-3'>
                    <Col md={6} lg={4}>
                        <Card className="mb-0">
                            <CardBody>
                                <div className="mb-2 d-flex align-items-center justify-content-between gap-1">
                                    <h6 className="mb-0">Total</h6>
                                    <p className="mb-0 text-muted d-flex align-items-center gap-1">
                                        <span className="text-success">▲</span>
                                        70.5%
                                    </p>
                                </div>
                                <Row className='g-2 align-items-center'>
                                    <div className="col-6">
                                        <h5 className="mb-2 mt-3">$7,825</h5>
                                        <div className="d-flex align-items-center gap-1">
                                            <h5 className="mb-0">9</h5>
                                            <p className="mb-0 text-muted d-flex align-items-center gap-2">invoices</p>
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div id="total-invoice-1-chart"><InvoiceChart1 /></div>
                                    </div>
                                </Row>
                            </CardBody>
                        </Card>
                    </Col>

                    <Col md={6} lg={4}>
                        <Card className="mb-0">
                            <CardBody>
                                <div className="d-flex mb-2 align-items-center justify-content-between gap-1">
                                    <h6 className="mb-0">Paid</h6>
                                    <p className="mb-0 text-muted d-flex align-items-center gap-1">
                                        <span className="text-warning ">▼</span>
                                        -8.73%
                                    </p>
                                </div>
                                <Row className='g-2 align-items-center'>
                                    <div className="col-6">
                                        <h5 className="mb-2 mt-3">£5678.09</h5>
                                        <div className="d-flex align-items-center gap-1">
                                            <h5 className="mb-0">5</h5>
                                            <p className="mb-0 text-muted d-flex align-items-center gap-2">invoices</p>
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div id="total-invoice-2-chart"><InvoiceChart2 /></div>
                                    </div>
                                </Row>
                            </CardBody>
                        </Card>
                    </Col>

                    <Col md={6} lg={4}>
                        <Card className="mb-0">
                            <CardBody>
                                <div className="mb-2 d-flex align-items-center justify-content-between gap-1">
                                    <h6 className="mb-0">Overdue</h6>
                                    <p className="mb-0 text-muted d-flex align-items-center gap-1">
                                        <span className="text-danger">▼</span>
                                        -4.73%
                                    </p>
                                </div>
                                <Row className='g-2 align-items-center'>
                                    <div className="col-6">
                                        <h5 className="mb-2 mt-3">£5678.09</h5>
                                        <div className="d-flex align-items-center gap-1">
                                            <h5 className="mb-0">5</h5>
                                            <p className="mb-0 text-muted d-flex align-items-center gap-2">invoices</p>
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div id="total-invoice-3-chart"><InvoiceChart3 /></div>
                                    </div>
                                </Row>
                            </CardBody>
                        </Card>
                    </Col>
                </Row>
            </Col>
            <Col xxl={4}>
                <Card className='bg-primary'>
                    <CardBody>
                        <div className="d-flex align-items-center">
                            <div className="flex-shrink-0">
                                <div className="avtar bg-white bg-opacity-10 text-white">
                                    <i className="ph-duotone ph-user-plus f-22"></i>
                                </div>
                            </div>
                            <div className="flex-grow-1 ms-3">
                                <p className="text-white mb-1 d-flex align-items-center gap-2">
                                    Total Recievables 
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="feather feather-alert-circle"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                    </p>
                                <div className="d-flex align-items-center justify-content-between">
                                    <p className="text-white mb-0 d-flex align-items-center gap-2">Current <span
                                        className="fw-medium f-16">109.1k</span> </p>
                                    <p className="text-white mb-0 d-flex align-items-center gap-2">Overdue <span
                                        className="fw-medium f-16">62k</span> </p>
                                </div>
                            </div>
                        </div>
                        <h4 className="text-white mt-3 mb-1">$43,078</h4>
                        <div className="d-flex align-items-center">
                            <div className="flex-grow-1 me-3">
                                <div className="progress bg-light-warning" style={{ height: "7px" }}>
                                    <div className="progress-bar bg-warning" style={{ width: "90%" }}></div>
                                </div>
                            </div>
                            <div className="flex-shrink-0 text-end wid-30">
                                <p className="text-white mb-0">90%</p>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </Col>
        </React.Fragment>
    )
}

export default Overview
