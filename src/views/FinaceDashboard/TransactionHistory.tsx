import React from 'react'
import { TransactionData } from './FinaceData'
import { Link } from 'react-router-dom'
import { Card, CardBody, CardHeader } from 'react-bootstrap'

const TransactionHistory = () => {
    return (
        <React.Fragment>
            <div className="col-12">
                <Card className="table-card">
                    <CardHeader className="d-flex align-items-center justify-content-between py-3">
                        <h5 className="mb-0">Transaction History</h5>
                        <button className="btn btn-sm btn-link-primary">View All</button>
                    </CardHeader>
                    <CardBody>
                        <div className="table-responsive">
                            <table className="table table-hover" id="pc-dt-simple">
                                <thead>
                                    <tr>
                                        <th>User Name</th>
                                        <th>Category</th>
                                        <th>Date/Time</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {TransactionData.map((items: any, index: number) => {
                                        return (
                                            <tr key={index}>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        <div className="flex-shrink-0">
                                                            <img src={items.img} alt="user image" className="img-radius wid-40" />
                                                        </div>
                                                        <div className="flex-grow-1 ms-3">
                                                            <h6 className="mb-0">{items.name}</h6>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>{items.categoty}</td>
                                                <td>{items.data} <span className="text-muted text-sm d-block">{items.time}</span></td>
                                                <td>{items.amount}</td>
                                                <td><span className={`badge ${items.textColor}`}>{items.status}</span></td>
                                                <td>
                                                    <Link to="#" className="avtar avtar-xs btn-link-secondary">
                                                        <i className="ti ti-eye f-20"></i>
                                                    </Link>
                                                    <Link to="#" className="avtar avtar-xs btn-link-secondary">
                                                        <i className="ti ti-edit f-20"></i>
                                                    </Link>
                                                    <Link to="#" className="avtar avtar-xs btn-link-secondary">
                                                        <i className="ti ti-trash f-20"></i>
                                                    </Link>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </React.Fragment>
    )
}

export default TransactionHistory
