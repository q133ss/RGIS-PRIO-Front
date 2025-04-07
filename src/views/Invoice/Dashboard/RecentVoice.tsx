import React, { useEffect,} from 'react'
import { Col, Card, CardBody } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { RecentInvoice } from './InvoiceData'

const RecentVoice = ({display,handleDropDown,handleClickOutside,dropdownRef}:any) => {

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
                    <CardBody>
                        <div className="d-flex align-items-center justify-content-between">
                            <h5 className="mb-0">Recent Invoice</h5>
                            <div className="dropdown">
                                <Link
                                    ref={dropdownRef}
                                    className={`avtar avtar-s btn-link-secondary dropdown-toggle arrow-none ${display === 1 ? 'show' : ""}`}
                                    to="#"
                                    data-bs-toggle="dropdown"
                                    aria-haspopup="true"
                                    aria-expanded="false"
                                    onClick={()=>handleDropDown(1)}
                                >
                                    <i className="ti ti-dots-vertical f-18"></i>
                                </Link>
                                <div className={`dropdown-menu dropdown-menu-end ${display === 1 ? "show show2" : ""}`}>
                                    <Link className="dropdown-item" to="#" onClick={handleDropDown}>Today</Link>
                                    <Link className="dropdown-item" to="#" onClick={handleDropDown}>Weekly</Link>
                                    <Link className="dropdown-item" to="#" onClick={handleDropDown}>Monthly</Link>
                                </div>
                            </div>
                        </div>
                    </CardBody>
                    <ul className="list-group list-group-flush border-top-0">
                        {
                            RecentInvoice.map((item: any, index: number) => {
                                return (
                                    <li key={index} className="list-group-item border-0">
                                        <div className="d-flex align-items-center">
                                            <div className="flex-shrink-0">
                                                <img src={item.img} alt="user-image" className="user-avtar rounded-circle wid-40 hie-40" />
                                            </div>
                                            <div className="flex-grow-1 mx-2">
                                                <h6 className="mb-1">{item.name} <span className="text-muted"> {item.code}</span></h6>
                                                <p className="mb-0 text-primary">{item.price}</p>
                                            </div>
                                            <div className="flex-shrink-0">
                                                <p className="text-muted mb-0">{item.time}</p>
                                            </div>
                                        </div>
                                    </li>
                                )
                            })
                        }

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

export default RecentVoice
