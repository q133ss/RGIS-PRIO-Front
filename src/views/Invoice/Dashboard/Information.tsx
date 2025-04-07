import React from 'react'
import { Row, Col, Card, CardBody } from 'react-bootstrap'
import { IoDocumentTextSharp } from "react-icons/io5";
import { PiArchiveFill } from "react-icons/pi";
import { HiCurrencyDollar } from "react-icons/hi2";
import { RiCloseCircleFill } from "react-icons/ri";
import { FaFilterCircleXmark } from "react-icons/fa6";
import { HiShoppingBag } from "react-icons/hi2";

const Information = () => {
    return (
        <React.Fragment>
            <Col lg={3}>
                <Card>
                    <CardBody>
                        <Row className='g-3 text-center'>
                            <div className="col-6">
                                <Card className='mb-0'>
                                    <CardBody className='py-4 px-2'>
                                        <div className="avtar bg-primary rounded-circle">
                                            <svg className="pc-icon text-white" style={{ fontSize: "larger" }}>
                                                <IoDocumentTextSharp />
                                            </svg>
                                        </div>
                                        <h6 className="mb-0 mt-3 text-muted">All Invoices</h6>
                                    </CardBody>
                                </Card>
                            </div>
                            <div className="col-6">
                                <Card className='mb-0'>
                                    <CardBody className='py-4 px-2'>
                                        <div className="avtar bg-info rounded-circle">
                                            <svg className="pc-icon text-white" style={{ fontSize: "larger" }}>
                                                <PiArchiveFill />
                                            </svg>
                                        </div>
                                        <h6 className="mb-0 mt-3 text-muted">Reports</h6>
                                    </CardBody>
                                </Card>
                            </div>
                            <div className="col-6">
                                <Card className='mb-0'>
                                    <CardBody className='py-4 px-2'>
                                        <div className="avtar bg-success rounded-circle">
                                            <svg className="pc-icon text-white" style={{ fontSize: "larger" }}>
                                                <HiCurrencyDollar />
                                            </svg>
                                        </div>
                                        <h6 className="mb-0 mt-3 text-muted">Paid</h6>
                                    </CardBody>
                                </Card>
                            </div>
                            <div className="col-6">
                                <Card className='mb-0'>
                                    <CardBody className='py-4 px-2'>
                                        <div className="avtar bg-warning rounded-circle">
                                            <svg className="pc-icon text-white" style={{ fontSize: "larger" }}>
                                                <FaFilterCircleXmark />
                                            </svg>
                                        </div>
                                        <h6 className="mb-0 mt-3 text-muted">Pending</h6>
                                    </CardBody>
                                </Card>
                            </div>

                            <div className="col-6">
                                <Card className='mb-0'>
                                    <CardBody className='py-4 px-2'>
                                        <div className="avtar bg-danger rounded-circle">
                                            <svg className="pc-icon text-white" >
                                                <RiCloseCircleFill />
                                            </svg>
                                        </div>
                                        <h6 className="mb-0 mt-3 text-muted">Cancelled</h6>
                                    </CardBody>
                                </Card>
                            </div>
                            <div className="col-6">
                                <Card className='mb-0'>
                                    <CardBody className='py-4 px-2'>
                                        <div className="avtar bg-primary rounded-circle">
                                            <svg className="pc-icon text-white" style={{ fontSize: "larger" }}>
                                                <HiShoppingBag />
                                            </svg>
                                        </div>
                                        <h6 className="mb-0 mt-3 text-muted">Draft</h6>
                                    </CardBody>
                                </Card>
                            </div>
                        </Row>
                    </CardBody>
                </Card>
            </Col>
        </React.Fragment>
    )
}

export default Information
