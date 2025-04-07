import React, { useState } from 'react'
import { InvoiceListData } from './InvoiceListData'
import { Card, CardBody, Col, Form } from 'react-bootstrap'
import avatar5 from '../../../assets/images/user/avatar-5.jpg'
import avatar9 from '../../../assets/images/user/avatar-9.jpg'
import avatar10 from '../../../assets/images/user/avatar-10.jpg'
import avatar1 from '../../../assets/images/user/avatar-1.jpg'
import avatar2 from '../../../assets/images/user/avatar-2.jpg'
import avatar3 from '../../../assets/images/user/avatar-3.jpg'
import avatar4 from '../../../assets/images/user/avatar-4.jpg'
import avatar7 from '../../../assets/images/user/avatar-7.jpg'
import avatar8 from '../../../assets/images/user/avatar-8.jpg'


const InvoiceMemberInfo = () => {
    const [status, setStatus] = useState(null)
    const handleStatus = (id: any) => {
        if (status === id) {
            setStatus(null)
        } else {
            setStatus(id)
        }
    }
    const [searchQuery, setSearchQuery] = useState('');
    const [entriesPerPage, setEntriesPerPage] = useState(5);
    const [currentPage, setCurrentPage] = useState(1);

    const handleSearchChange = (e: any) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1); // Reset page to 1 when search query changes
    };

    const handleEntriesPerPageChange = (e: any) => {
        setEntriesPerPage(parseInt(e.target.value));
        setCurrentPage(1); // Reset page to 1 when entries per page changes
    };

    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
    };

    const filteredData = InvoiceListData.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(filteredData.length / entriesPerPage);
    const indexOfLastEntry = currentPage * entriesPerPage;
    const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
    const currentEntries = filteredData.slice(indexOfFirstEntry, indexOfLastEntry);

    const goToPreviousPage = () => {
        setCurrentPage((prevPage) => prevPage - 1);
    };

    const goToNextPage = () => {
        setCurrentPage((prevPage) => prevPage + 1);
    };

    return (
        <React.Fragment>
            <Col>
                <Card>
                    <CardBody className="card-body">
                        <ul className="nav nav-tabs invoice-tab border-bottom mb-3" id="myTab" role="tablist">
                            <li className="nav-item" role="presentation">
                                <button className={`nav-link ${status === 1 ? 'active' : ""}`} id="analytics-tab-1" data-bs-toggle="tab"
                                    data-bs-target="#analytics-tab-1-pane" type="button" role="tab" aria-controls="analytics-tab-1-pane"
                                    aria-selected="true" onClick={() => handleStatus(1)}>
                                    <span className="d-flex align-items-center gap-2">All <span
                                        className="avtar rounded-circle bg-light-primary">5</span></span>
                                </button>
                            </li>
                            <li className="nav-item" role="presentation">
                                <button className={`nav-link  ${status === 2 ? "active" : ""}`} id="analytics-tab-2" data-bs-toggle="tab"
                                    data-bs-target="#analytics-tab-2-pane" type="button" role="tab" aria-controls="analytics-tab-2-pane"
                                    aria-selected="false" onClick={() => handleStatus(2)}>
                                    <span className="d-flex align-items-center gap-2">Paid <span
                                        className="avtar rounded-circle bg-light-success">2</span></span>
                                </button>
                            </li>
                            <li className={`nav-item ${status === 3 ? 'active' : ''}`} role="presentation">
                                <button className="nav-link" id="analytics-tab-3" data-bs-toggle="tab"
                                    data-bs-target="#analytics-tab-3-pane" type="button" role="tab" aria-controls="analytics-tab-3-pane"
                                    aria-selected="false" onClick={() => handleStatus(3)}>
                                    <span className="d-flex align-items-center gap-2">Unpaid <span
                                        className="avtar rounded-circle bg-light-warning">2</span></span>
                                </button>
                            </li>
                            <li className={`nav-item ${status === 4 ? 'active' : ''}`} role="presentation">
                                <button className="nav-link" id="analytics-tab-4" data-bs-toggle="tab"
                                    data-bs-target="#analytics-tab-4-pane" type="button" role="tab" aria-controls="analytics-tab-4-pane"
                                    aria-selected="false" onClick={() => handleStatus(4)}>
                                    <span className="d-flex align-items-center gap-2">Cancelled <span
                                        className="avtar rounded-circle bg-light-danger">1</span></span>
                                </button>
                            </li>
                        </ul>
                        <div className="d-sm-flex align-items-center mt-4 mb-3">
                            <ul className="list-inline me-auto my-1">
                                <li className="list-inline-item">
                                    <select className="form-select" onChange={handleEntriesPerPageChange}>
                                        <option value="5">5</option>
                                        <option value="10">10</option>
                                        <option value="20">20</option>
                                        <option value="30">30</option>
                                        <option value="40">40</option>
                                    </select>
                                </li>
                                <span> entries per page</span>
                            </ul>
                            <ul className="list-inline ms-auto my-1 me-4">
                                <li className="list-inline-item">
                                    <form className="form-search">
                                        <Form.Control
                                            type="search"
                                            placeholder="Search...."
                                            onChange={handleSearchChange}
                                        />
                                    </form>
                                </li>
                            </ul>
                        </div>
                        <div className="tab-content" id="myTabContent">
                            <div className={`tab-pane fade ${status === 1 ? 'show active' : ''}`} id="analytics-tab-1-pane" role="tabpanel"
                                aria-labelledby="analytics-tab-1" tabIndex={0}>
                                <div className="table-responsive">
                                    <table className="table table-hover" id="pc-dt-simple-1">
                                        <thead>
                                            <tr>
                                                <th>Invoice Id</th>
                                                <th>User Name</th>
                                                <th>Create Date</th>
                                                <th>Due Date</th>
                                                <th>Quantity</th>
                                                <th>Status</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentEntries.map((item: any, index: number) => {
                                                return (
                                                    <tr key={index}>
                                                        <td>{item.invoiceId}</td>
                                                        <td>
                                                            <div className="row align-items-center">
                                                                <div className="col-auto pe-0">
                                                                    <img src={item.img} alt="user-image"
                                                                        className="wid-40 hei-40 rounded-circle" />
                                                                </div>
                                                                <div className="col">
                                                                    <h6 className="mb-1"><span className="text-truncate w-100">{item.name}</span>
                                                                    </h6>
                                                                    <p className="f-12 mb-0"><a href="#!" className="text-muted"><span
                                                                        className="text-truncate w-100">{item.email}</span></a></p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>{item.createDate}</td>
                                                        <td>{item.dueDate}</td>
                                                        <td>{item.qty}</td>
                                                        <td><span className={`badge ${item.color}`}>{item.status}</span></td>
                                                        <td className="text-end">
                                                            <ul className="list-inline mb-0">
                                                                <li className="list-inline-item"><a href="#"
                                                                    className="avtar avtar-s btn-link-info btn-pc-default"><i className="ti ti-eye f-20"></i></a>
                                                                </li>
                                                                <li className="list-inline-item"><a href="#"
                                                                    className="avtar avtar-s btn-link-success btn-pc-default"><i
                                                                        className="ti ti-edit f-20"></i></a></li>
                                                                <li className="list-inline-item"><a href="#"
                                                                    className="avtar avtar-s btn-link-danger btn-pc-default"><i
                                                                        className="ti ti-trash f-20"></i></a></li>
                                                            </ul>
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className={`tab-pane fade ${status === 2 ? 'show active' : ''}`} id="analytics-tab-2-pane" role="tabpanel" aria-labelledby="analytics-tab-2"
                                tabIndex={0}>
                                <div className="table-responsive">
                                    <table className="table table-hover" id="pc-dt-simple-2">
                                        <thead>
                                            <tr>
                                                <th>Invoice Id</th>
                                                <th>User Name</th>
                                                <th>Create Date</th>
                                                <th>Due Date</th>
                                                <th>Quantity</th>
                                                <th>Status</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>5</td>
                                                <td>
                                                    <div className="row align-items-center">
                                                        <div className="col-auto pe-0">
                                                            <img src={avatar2} alt="user-image"
                                                                className="wid-40 hei-40 rounded-circle" />
                                                        </div>
                                                        <div className="col">
                                                            <h6 className="mb-1"><span className="text-truncate w-100">Shelba Thews</span>
                                                            </h6>
                                                            <p className="f-12 mb-0"><a href="#!" className="text-muted"><span
                                                                className="text-truncate w-100">Shelba Thews</span></a></p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>7/6/2022</td>
                                                <td>7/8/2022</td>
                                                <td>3000</td>
                                                <td><span className="badge bg-light-danger">Cancelled</span></td>
                                                <td className="text-end">
                                                    <ul className="list-inline mb-0">
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-info btn-pc-default"><i className="ti ti-eye f-20"></i></a>
                                                        </li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-success btn-pc-default"><i
                                                                className="ti ti-edit f-20"></i></a></li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-danger btn-pc-default"><i
                                                                className="ti ti-trash f-20"></i></a></li>
                                                    </ul>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>6</td>
                                                <td>
                                                    <div className="row align-items-center">
                                                        <div className="col-auto pe-0">
                                                            <img src={avatar3} alt="user-image"
                                                                className="wid-40 hei-40 rounded-circle" />
                                                        </div>
                                                        <div className="col">
                                                            <h6 className="mb-1"><span className="text-truncate w-100">tass23@gmail.com</span>
                                                            </h6>
                                                            <p className="f-12 mb-0"><a href="#!" className="text-muted"><span
                                                                className="text-truncate w-100">Shelba Thews</span></a></p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>05/01/2022</td>
                                                <td>06/02/2022</td>
                                                <td>1000</td>
                                                <td><span className="badge bg-light-info">Unpaid</span></td>
                                                <td className="text-end">
                                                    <ul className="list-inline mb-0">
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-info btn-pc-default"><i className="ti ti-eye f-20"></i></a>
                                                        </li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-success btn-pc-default"><i
                                                                className="ti ti-edit f-20"></i></a></li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-danger btn-pc-default"><i
                                                                className="ti ti-trash f-20"></i></a></li>
                                                    </ul>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>1</td>
                                                <td>
                                                    <div className="row align-items-center">
                                                        <div className="col-auto pe-0">
                                                            <img src={avatar5} alt="user-image"
                                                                className="wid-40 hei-40 rounded-circle" />
                                                        </div>
                                                        <div className="col">
                                                            <h6 className="mb-1"><span className="text-truncate w-100">Mickie Melmoth</span>
                                                            </h6>
                                                            <p className="f-12 mb-0"><a href="#!" className="text-muted"><span
                                                                className="text-truncate w-100">mmsht23@gmail.com</span></a></p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>5/5/2022</td>
                                                <td>7/11/2022</td>
                                                <td>3000</td>
                                                <td><span className="badge bg-light-success">Paid</span></td>
                                                <td className="text-end">
                                                    <ul className="list-inline mb-0">
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-info btn-pc-default"><i className="ti ti-eye f-20"></i></a>
                                                        </li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-success btn-pc-default"><i
                                                                className="ti ti-edit f-20"></i></a></li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-danger btn-pc-default"><i
                                                                className="ti ti-trash f-20"></i></a></li>
                                                    </ul>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>2</td>
                                                <td>
                                                    <div className="row align-items-center">
                                                        <div className="col-auto pe-0">
                                                            <img src={avatar9} alt="user-image"
                                                                className="wid-40 hei-40 rounded-circle" />
                                                        </div>
                                                        <div className="col">
                                                            <h6 className="mb-1"><span className="text-truncate w-100">Shelba Thews</span>
                                                            </h6>
                                                            <p className="f-12 mb-0"><a href="#!" className="text-muted"><span
                                                                className="text-truncate w-100">Shelba Thews</span></a></p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>7/6/2022</td>
                                                <td>7/8/2022</td>
                                                <td>3000</td>
                                                <td><span className="badge bg-light-danger">Cancelled</span></td>
                                                <td className="text-end">
                                                    <ul className="list-inline mb-0">
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-info btn-pc-default"><i className="ti ti-eye f-20"></i></a>
                                                        </li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-success btn-pc-default"><i
                                                                className="ti ti-edit f-20"></i></a></li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-danger btn-pc-default"><i
                                                                className="ti ti-trash f-20"></i></a></li>
                                                    </ul>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>3</td>
                                                <td>
                                                    <div className="row align-items-center">
                                                        <div className="col-auto pe-0">
                                                            <img src={avatar10} alt="user-image"
                                                                className="wid-40 hei-40 rounded-circle" />
                                                        </div>
                                                        <div className="col">
                                                            <h6 className="mb-1"><span className="text-truncate w-100">tass23@gmail.com</span>
                                                            </h6>
                                                            <p className="f-12 mb-0"><a href="#!" className="text-muted"><span
                                                                className="text-truncate w-100">Shelba Thews</span></a></p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>05/01/2022</td>
                                                <td>06/02/2022</td>
                                                <td>1000</td>
                                                <td><span className="badge bg-light-info">Unpaid</span></td>
                                                <td className="text-end">
                                                    <ul className="list-inline mb-0">
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-info btn-pc-default"><i className="ti ti-eye f-20"></i></a>
                                                        </li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-success btn-pc-default"><i
                                                                className="ti ti-edit f-20"></i></a></li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-danger btn-pc-default"><i
                                                                className="ti ti-trash f-20"></i></a></li>
                                                    </ul>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>4</td>
                                                <td>
                                                    <div className="row align-items-center">
                                                        <div className="col-auto pe-0">
                                                            <img src={avatar1} alt="user-image"
                                                                className="wid-40 hei-40 rounded-circle" />
                                                        </div>
                                                        <div className="col">
                                                            <h6 className="mb-1"><span className="text-truncate w-100">Mickie Melmoth</span>
                                                            </h6>
                                                            <p className="f-12 mb-0"><a href="#!" className="text-muted"><span
                                                                className="text-truncate w-100">mmsht23@gmail.com</span></a></p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>5/5/2022</td>
                                                <td>7/11/2022</td>
                                                <td>3000</td>
                                                <td><span className="badge bg-light-success">Paid</span></td>
                                                <td className="text-end">
                                                    <ul className="list-inline mb-0">
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-info btn-pc-default"><i className="ti ti-eye f-20"></i></a>
                                                        </li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-success btn-pc-default"><i
                                                                className="ti ti-edit f-20"></i></a></li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-danger btn-pc-default"><i
                                                                className="ti ti-trash f-20"></i></a></li>
                                                    </ul>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>7</td>
                                                <td>
                                                    <div className="row align-items-center">
                                                        <div className="col-auto pe-0">
                                                            <img src={avatar4} alt="user-image"
                                                                className="wid-40 hei-40 rounded-circle" />
                                                        </div>
                                                        <div className="col">
                                                            <h6 className="mb-1"><span className="text-truncate w-100">Mickie Melmoth</span>
                                                            </h6>
                                                            <p className="f-12 mb-0"><a href="#!" className="text-muted"><span
                                                                className="text-truncate w-100">mmsht23@gmail.com</span></a></p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>5/5/2022</td>
                                                <td>7/11/2022</td>
                                                <td>3000</td>
                                                <td><span className="badge bg-light-success">Paid</span></td>
                                                <td className="text-end">
                                                    <ul className="list-inline mb-0">
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-info btn-pc-default"><i className="ti ti-eye f-20"></i></a>
                                                        </li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-success btn-pc-default"><i
                                                                className="ti ti-edit f-20"></i></a></li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-danger btn-pc-default"><i
                                                                className="ti ti-trash f-20"></i></a></li>
                                                    </ul>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>8</td>
                                                <td>
                                                    <div className="row align-items-center">
                                                        <div className="col-auto pe-0">
                                                            <img src={avatar7} alt="user-image"
                                                                className="wid-40 hei-40 rounded-circle" />
                                                        </div>
                                                        <div className="col">
                                                            <h6 className="mb-1"><span className="text-truncate w-100">Shelba Thews</span>
                                                            </h6>
                                                            <p className="f-12 mb-0"><a href="#!" className="text-muted"><span
                                                                className="text-truncate w-100">Shelba Thews</span></a></p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>7/6/2022</td>
                                                <td>7/8/2022</td>
                                                <td>3000</td>
                                                <td><span className="badge bg-light-danger">Cancelled</span></td>
                                                <td className="text-end">
                                                    <ul className="list-inline mb-0">
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-info btn-pc-default"><i className="ti ti-eye f-20"></i></a>
                                                        </li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-success btn-pc-default"><i
                                                                className="ti ti-edit f-20"></i></a></li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-danger btn-pc-default"><i
                                                                className="ti ti-trash f-20"></i></a></li>
                                                    </ul>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>9</td>
                                                <td>
                                                    <div className="row align-items-center">
                                                        <div className="col-auto pe-0">
                                                            <img src={avatar8} alt="user-image"
                                                                className="wid-40 hei-40 rounded-circle" />
                                                        </div>
                                                        <div className="col">
                                                            <h6 className="mb-1"><span className="text-truncate w-100">tass23@gmail.com</span>
                                                            </h6>
                                                            <p className="f-12 mb-0"><a href="#!" className="text-muted"><span
                                                                className="text-truncate w-100">Shelba Thews</span></a></p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>05/01/2022</td>
                                                <td>06/02/2022</td>
                                                <td>1000</td>
                                                <td><span className="badge bg-light-info">Unpaid</span></td>
                                                <td className="text-end">
                                                    <ul className="list-inline mb-0">
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-info btn-pc-default"><i className="ti ti-eye f-20"></i></a>
                                                        </li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-success btn-pc-default"><i
                                                                className="ti ti-edit f-20"></i></a></li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-danger btn-pc-default"><i
                                                                className="ti ti-trash f-20"></i></a></li>
                                                    </ul>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className={`tab-pane fade ${status === 3 ? 'show active' : ''}`} id="analytics-tab-3-pane" role="tabpanel" aria-labelledby="analytics-tab-3"
                                tabIndex={0}>
                                <div className="table-responsive">
                                    <table className="table table-hover" id="pc-dt-simple-3">
                                        <thead>
                                            <tr>
                                                <th>Invoice Id</th>
                                                <th>User Name</th>
                                                <th>Create Date</th>
                                                <th>Due Date</th>
                                                <th>Quantity</th>
                                                <th>Status</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>1</td>
                                                <td>
                                                    <div className="row align-items-center">
                                                        <div className="col-auto pe-0">
                                                            <img src={avatar5} alt="user-image"
                                                                className="wid-40 hei-40 rounded-circle" />
                                                        </div>
                                                        <div className="col">
                                                            <h6 className="mb-1"><span className="text-truncate w-100">Mickie Melmoth</span>
                                                            </h6>
                                                            <p className="f-12 mb-0"><a href="#!" className="text-muted"><span
                                                                className="text-truncate w-100">mmsht23@gmail.com</span></a></p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>5/5/2022</td>
                                                <td>7/11/2022</td>
                                                <td>3000</td>
                                                <td><span className="badge bg-light-success">Paid</span></td>
                                                <td className="text-end">
                                                    <ul className="list-inline mb-0">
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-info btn-pc-default"><i className="ti ti-eye f-20"></i></a>
                                                        </li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-success btn-pc-default"><i
                                                                className="ti ti-edit f-20"></i></a></li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-danger btn-pc-default"><i
                                                                className="ti ti-trash f-20"></i></a></li>
                                                    </ul>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>2</td>
                                                <td>
                                                    <div className="row align-items-center">
                                                        <div className="col-auto pe-0">
                                                            <img src={avatar9} alt="user-image"
                                                                className="wid-40 hei-40 rounded-circle" />
                                                        </div>
                                                        <div className="col">
                                                            <h6 className="mb-1"><span className="text-truncate w-100">Shelba Thews</span>
                                                            </h6>
                                                            <p className="f-12 mb-0"><a href="#!" className="text-muted"><span
                                                                className="text-truncate w-100">Shelba Thews</span></a></p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>7/6/2022</td>
                                                <td>7/8/2022</td>
                                                <td>3000</td>
                                                <td><span className="badge bg-light-danger">Cancelled</span></td>
                                                <td className="text-end">
                                                    <ul className="list-inline mb-0">
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-info btn-pc-default"><i className="ti ti-eye f-20"></i></a>
                                                        </li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-success btn-pc-default"><i
                                                                className="ti ti-edit f-20"></i></a></li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-danger btn-pc-default"><i
                                                                className="ti ti-trash f-20"></i></a></li>
                                                    </ul>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>3</td>
                                                <td>
                                                    <div className="row align-items-center">
                                                        <div className="col-auto pe-0">
                                                            <img src={avatar10} alt="user-image"
                                                                className="wid-40 hei-40 rounded-circle" />
                                                        </div>
                                                        <div className="col">
                                                            <h6 className="mb-1"><span className="text-truncate w-100">tass23@gmail.com</span>
                                                            </h6>
                                                            <p className="f-12 mb-0"><a href="#!" className="text-muted"><span
                                                                className="text-truncate w-100">Shelba Thews</span></a></p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>05/01/2022</td>
                                                <td>06/02/2022</td>
                                                <td>1000</td>
                                                <td><span className="badge bg-light-info">Unpaid</span></td>
                                                <td className="text-end">
                                                    <ul className="list-inline mb-0">
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-info btn-pc-default"><i className="ti ti-eye f-20"></i></a>
                                                        </li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-success btn-pc-default"><i
                                                                className="ti ti-edit f-20"></i></a></li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-danger btn-pc-default"><i
                                                                className="ti ti-trash f-20"></i></a></li>
                                                    </ul>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>4</td>
                                                <td>
                                                    <div className="row align-items-center">
                                                        <div className="col-auto pe-0">
                                                            <img src={avatar1} alt="user-image"
                                                                className="wid-40 hei-40 rounded-circle" />
                                                        </div>
                                                        <div className="col">
                                                            <h6 className="mb-1"><span className="text-truncate w-100">Mickie Melmoth</span>
                                                            </h6>
                                                            <p className="f-12 mb-0"><a href="#!" className="text-muted"><span
                                                                className="text-truncate w-100">mmsht23@gmail.com</span></a></p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>5/5/2022</td>
                                                <td>7/11/2022</td>
                                                <td>3000</td>
                                                <td><span className="badge bg-light-success">Paid</span></td>
                                                <td className="text-end">
                                                    <ul className="list-inline mb-0">
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-info btn-pc-default"><i className="ti ti-eye f-20"></i></a>
                                                        </li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-success btn-pc-default"><i
                                                                className="ti ti-edit f-20"></i></a></li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-danger btn-pc-default"><i
                                                                className="ti ti-trash f-20"></i></a></li>
                                                    </ul>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>5</td>
                                                <td>
                                                    <div className="row align-items-center">
                                                        <div className="col-auto pe-0">
                                                            <img src={avatar2} alt="user-image"
                                                                className="wid-40 hei-40 rounded-circle" />
                                                        </div>
                                                        <div className="col">
                                                            <h6 className="mb-1"><span className="text-truncate w-100">Shelba Thews</span>
                                                            </h6>
                                                            <p className="f-12 mb-0"><a href="#!" className="text-muted"><span
                                                                className="text-truncate w-100">Shelba Thews</span></a></p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>7/6/2022</td>
                                                <td>7/8/2022</td>
                                                <td>3000</td>
                                                <td><span className="badge bg-light-danger">Cancelled</span></td>
                                                <td className="text-end">
                                                    <ul className="list-inline mb-0">
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-info btn-pc-default"><i className="ti ti-eye f-20"></i></a>
                                                        </li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-success btn-pc-default"><i
                                                                className="ti ti-edit f-20"></i></a></li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-danger btn-pc-default"><i
                                                                className="ti ti-trash f-20"></i></a></li>
                                                    </ul>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>6</td>
                                                <td>
                                                    <div className="row align-items-center">
                                                        <div className="col-auto pe-0">
                                                            <img src={avatar3} alt="user-image"
                                                                className="wid-40 hei-40 rounded-circle" />
                                                        </div>
                                                        <div className="col">
                                                            <h6 className="mb-1"><span className="text-truncate w-100">tass23@gmail.com</span>
                                                            </h6>
                                                            <p className="f-12 mb-0"><a href="#!" className="text-muted"><span
                                                                className="text-truncate w-100">Shelba Thews</span></a></p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>05/01/2022</td>
                                                <td>06/02/2022</td>
                                                <td>1000</td>
                                                <td><span className="badge bg-light-info">Unpaid</span></td>
                                                <td className="text-end">
                                                    <ul className="list-inline mb-0">
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-info btn-pc-default"><i className="ti ti-eye f-20"></i></a>
                                                        </li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-success btn-pc-default"><i
                                                                className="ti ti-edit f-20"></i></a></li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-danger btn-pc-default"><i
                                                                className="ti ti-trash f-20"></i></a></li>
                                                    </ul>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>7</td>
                                                <td>
                                                    <div className="row align-items-center">
                                                        <div className="col-auto pe-0">
                                                            <img src={avatar4} alt="user-image"
                                                                className="wid-40 hei-40 rounded-circle" />
                                                        </div>
                                                        <div className="col">
                                                            <h6 className="mb-1"><span className="text-truncate w-100">Mickie Melmoth</span>
                                                            </h6>
                                                            <p className="f-12 mb-0"><a href="#!" className="text-muted"><span
                                                                className="text-truncate w-100">mmsht23@gmail.com</span></a></p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>5/5/2022</td>
                                                <td>7/11/2022</td>
                                                <td>3000</td>
                                                <td><span className="badge bg-light-success">Paid</span></td>
                                                <td className="text-end">
                                                    <ul className="list-inline mb-0">
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-info btn-pc-default"><i className="ti ti-eye f-20"></i></a>
                                                        </li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-success btn-pc-default"><i
                                                                className="ti ti-edit f-20"></i></a></li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-danger btn-pc-default"><i
                                                                className="ti ti-trash f-20"></i></a></li>
                                                    </ul>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>8</td>
                                                <td>
                                                    <div className="row align-items-center">
                                                        <div className="col-auto pe-0">
                                                            <img src={avatar7} alt="user-image"
                                                                className="wid-40 hei-40 rounded-circle" />
                                                        </div>
                                                        <div className="col">
                                                            <h6 className="mb-1"><span className="text-truncate w-100">Shelba Thews</span>
                                                            </h6>
                                                            <p className="f-12 mb-0"><a href="#!" className="text-muted"><span
                                                                className="text-truncate w-100">Shelba Thews</span></a></p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>7/6/2022</td>
                                                <td>7/8/2022</td>
                                                <td>3000</td>
                                                <td><span className="badge bg-light-danger">Cancelled</span></td>
                                                <td className="text-end">
                                                    <ul className="list-inline mb-0">
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-info btn-pc-default"><i className="ti ti-eye f-20"></i></a>
                                                        </li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-success btn-pc-default"><i
                                                                className="ti ti-edit f-20"></i></a></li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-danger btn-pc-default"><i
                                                                className="ti ti-trash f-20"></i></a></li>
                                                    </ul>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>9</td>
                                                <td>
                                                    <div className="row align-items-center">
                                                        <div className="col-auto pe-0">
                                                            <img src={avatar8} alt="user-image"
                                                                className="wid-40 hei-40 rounded-circle" />
                                                        </div>
                                                        <div className="col">
                                                            <h6 className="mb-1"><span className="text-truncate w-100">tass23@gmail.com</span>
                                                            </h6>
                                                            <p className="f-12 mb-0"><a href="#!" className="text-muted"><span
                                                                className="text-truncate w-100">Shelba Thews</span></a></p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>05/01/2022</td>
                                                <td>06/02/2022</td>
                                                <td>1000</td>
                                                <td><span className="badge bg-light-info">Unpaid</span></td>
                                                <td className="text-end">
                                                    <ul className="list-inline mb-0">
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-info btn-pc-default"><i className="ti ti-eye f-20"></i></a>
                                                        </li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-success btn-pc-default"><i
                                                                className="ti ti-edit f-20"></i></a></li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-danger btn-pc-default"><i
                                                                className="ti ti-trash f-20"></i></a></li>
                                                    </ul>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className={`tab-pane fade ${status === 4 ? 'show active' : ''}`} id="analytics-tab-4-pane" role="tabpanel" aria-labelledby="analytics-tab-4"
                                tabIndex={0}>
                                <div className="table-responsive">
                                    <table className="table table-hover" id="pc-dt-simple-4">
                                        <thead>
                                            <tr>
                                                <th>Invoice Id</th>
                                                <th>User Name</th>
                                                <th>Create Date</th>
                                                <th>Due Date</th>
                                                <th>Quantity</th>
                                                <th>Status</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>5</td>
                                                <td>
                                                    <div className="row align-items-center">
                                                        <div className="col-auto pe-0">
                                                            <img src={avatar2} alt="user-image"
                                                                className="wid-40 hei-40 rounded-circle" />
                                                        </div>
                                                        <div className="col">
                                                            <h6 className="mb-1"><span className="text-truncate w-100">Shelba Thews</span>
                                                            </h6>
                                                            <p className="f-12 mb-0"><a href="#!" className="text-muted"><span
                                                                className="text-truncate w-100">Shelba Thews</span></a></p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>7/6/2022</td>
                                                <td>7/8/2022</td>
                                                <td>3000</td>
                                                <td><span className="badge bg-light-danger">Cancelled</span></td>
                                                <td className="text-end">
                                                    <ul className="list-inline mb-0">
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-info btn-pc-default"><i className="ti ti-eye f-20"></i></a>
                                                        </li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-success btn-pc-default"><i
                                                                className="ti ti-edit f-20"></i></a></li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-danger btn-pc-default"><i
                                                                className="ti ti-trash f-20"></i></a></li>
                                                    </ul>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>6</td>
                                                <td>
                                                    <div className="row align-items-center">
                                                        <div className="col-auto pe-0">
                                                            <img src={avatar3} alt="user-image"
                                                                className="wid-40 hei-40 rounded-circle" />
                                                        </div>
                                                        <div className="col">
                                                            <h6 className="mb-1"><span className="text-truncate w-100">tass23@gmail.com</span>
                                                            </h6>
                                                            <p className="f-12 mb-0"><a href="#!" className="text-muted"><span
                                                                className="text-truncate w-100">Shelba Thews</span></a></p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>05/01/2022</td>
                                                <td>06/02/2022</td>
                                                <td>1000</td>
                                                <td><span className="badge bg-light-info">Unpaid</span></td>
                                                <td className="text-end">
                                                    <ul className="list-inline mb-0">
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-info btn-pc-default"><i className="ti ti-eye f-20"></i></a>
                                                        </li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-success btn-pc-default"><i
                                                                className="ti ti-edit f-20"></i></a></li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-danger btn-pc-default"><i
                                                                className="ti ti-trash f-20"></i></a></li>
                                                    </ul>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>1</td>
                                                <td>
                                                    <div className="row align-items-center">
                                                        <div className="col-auto pe-0">
                                                            <img src={avatar5} alt="user-image"
                                                                className="wid-40 hei-40 rounded-circle" />
                                                        </div>
                                                        <div className="col">
                                                            <h6 className="mb-1"><span className="text-truncate w-100">Mickie Melmoth</span>
                                                            </h6>
                                                            <p className="f-12 mb-0"><a href="#!" className="text-muted"><span
                                                                className="text-truncate w-100">mmsht23@gmail.com</span></a></p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>5/5/2022</td>
                                                <td>7/11/2022</td>
                                                <td>3000</td>
                                                <td><span className="badge bg-light-success">Paid</span></td>
                                                <td className="text-end">
                                                    <ul className="list-inline mb-0">
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-info btn-pc-default"><i className="ti ti-eye f-20"></i></a>
                                                        </li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-success btn-pc-default"><i
                                                                className="ti ti-edit f-20"></i></a></li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-danger btn-pc-default"><i
                                                                className="ti ti-trash f-20"></i></a></li>
                                                    </ul>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>2</td>
                                                <td>
                                                    <div className="row align-items-center">
                                                        <div className="col-auto pe-0">
                                                            <img src={avatar9} alt="user-image"
                                                                className="wid-40 hei-40 rounded-circle" />
                                                        </div>
                                                        <div className="col">
                                                            <h6 className="mb-1"><span className="text-truncate w-100">Shelba Thews</span>
                                                            </h6>
                                                            <p className="f-12 mb-0"><a href="#!" className="text-muted"><span
                                                                className="text-truncate w-100">Shelba Thews</span></a></p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>7/6/2022</td>
                                                <td>7/8/2022</td>
                                                <td>3000</td>
                                                <td><span className="badge bg-light-danger">Cancelled</span></td>
                                                <td className="text-end">
                                                    <ul className="list-inline mb-0">
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-info btn-pc-default"><i className="ti ti-eye f-20"></i></a>
                                                        </li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-success btn-pc-default"><i
                                                                className="ti ti-edit f-20"></i></a></li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-danger btn-pc-default"><i
                                                                className="ti ti-trash f-20"></i></a></li>
                                                    </ul>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>3</td>
                                                <td>
                                                    <div className="row align-items-center">
                                                        <div className="col-auto pe-0">
                                                            <img src={avatar10} alt="user-image"
                                                                className="wid-40 hei-40 rounded-circle" />
                                                        </div>
                                                        <div className="col">
                                                            <h6 className="mb-1"><span className="text-truncate w-100">tass23@gmail.com</span>
                                                            </h6>
                                                            <p className="f-12 mb-0"><a href="#!" className="text-muted"><span
                                                                className="text-truncate w-100">Shelba Thews</span></a></p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>05/01/2022</td>
                                                <td>06/02/2022</td>
                                                <td>1000</td>
                                                <td><span className="badge bg-light-info">Unpaid</span></td>
                                                <td className="text-end">
                                                    <ul className="list-inline mb-0">
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-info btn-pc-default"><i className="ti ti-eye f-20"></i></a>
                                                        </li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-success btn-pc-default"><i
                                                                className="ti ti-edit f-20"></i></a></li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-danger btn-pc-default"><i
                                                                className="ti ti-trash f-20"></i></a></li>
                                                    </ul>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>4</td>
                                                <td>
                                                    <div className="row align-items-center">
                                                        <div className="col-auto pe-0">
                                                            <img src={avatar1} alt="user-image"
                                                                className="wid-40 hei-40 rounded-circle" />
                                                        </div>
                                                        <div className="col">
                                                            <h6 className="mb-1"><span className="text-truncate w-100">Mickie Melmoth</span>
                                                            </h6>
                                                            <p className="f-12 mb-0"><a href="#!" className="text-muted"><span
                                                                className="text-truncate w-100">mmsht23@gmail.com</span></a></p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>5/5/2022</td>
                                                <td>7/11/2022</td>
                                                <td>3000</td>
                                                <td><span className="badge bg-light-success">Paid</span></td>
                                                <td className="text-end">
                                                    <ul className="list-inline mb-0">
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-info btn-pc-default"><i className="ti ti-eye f-20"></i></a>
                                                        </li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-success btn-pc-default"><i
                                                                className="ti ti-edit f-20"></i></a></li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-danger btn-pc-default"><i
                                                                className="ti ti-trash f-20"></i></a></li>
                                                    </ul>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>7</td>
                                                <td>
                                                    <div className="row align-items-center">
                                                        <div className="col-auto pe-0">
                                                            <img src={avatar4} alt="user-image"
                                                                className="wid-40 hei-40 rounded-circle" />
                                                        </div>
                                                        <div className="col">
                                                            <h6 className="mb-1"><span className="text-truncate w-100">Mickie Melmoth</span>
                                                            </h6>
                                                            <p className="f-12 mb-0"><a href="#!" className="text-muted"><span
                                                                className="text-truncate w-100">mmsht23@gmail.com</span></a></p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>5/5/2022</td>
                                                <td>7/11/2022</td>
                                                <td>3000</td>
                                                <td><span className="badge bg-light-success">Paid</span></td>
                                                <td className="text-end">
                                                    <ul className="list-inline mb-0">
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-info btn-pc-default"><i className="ti ti-eye f-20"></i></a>
                                                        </li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-success btn-pc-default"><i
                                                                className="ti ti-edit f-20"></i></a></li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-danger btn-pc-default"><i
                                                                className="ti ti-trash f-20"></i></a></li>
                                                    </ul>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>8</td>
                                                <td>
                                                    <div className="row align-items-center">
                                                        <div className="col-auto pe-0">
                                                            <img src={avatar7} alt="user-image"
                                                                className="wid-40 hei-40 rounded-circle" />
                                                        </div>
                                                        <div className="col">
                                                            <h6 className="mb-1"><span className="text-truncate w-100">Shelba Thews</span>
                                                            </h6>
                                                            <p className="f-12 mb-0"><a href="#!" className="text-muted"><span
                                                                className="text-truncate w-100">Shelba Thews</span></a></p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>7/6/2022</td>
                                                <td>7/8/2022</td>
                                                <td>3000</td>
                                                <td><span className="badge bg-light-danger">Cancelled</span></td>
                                                <td className="text-end">
                                                    <ul className="list-inline mb-0">
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-info btn-pc-default"><i className="ti ti-eye f-20"></i></a>
                                                        </li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-success btn-pc-default"><i
                                                                className="ti ti-edit f-20"></i></a></li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-danger btn-pc-default"><i
                                                                className="ti ti-trash f-20"></i></a></li>
                                                    </ul>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>9</td>
                                                <td>
                                                    <div className="row align-items-center">
                                                        <div className="col-auto pe-0">
                                                            <img src={avatar8} alt="user-image"
                                                                className="wid-40 hei-40 rounded-circle" />
                                                        </div>
                                                        <div className="col">
                                                            <h6 className="mb-1"><span className="text-truncate w-100">tass23@gmail.com</span>
                                                            </h6>
                                                            <p className="f-12 mb-0"><a href="#!" className="text-muted"><span
                                                                className="text-truncate w-100">Shelba Thews</span></a></p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>05/01/2022</td>
                                                <td>06/02/2022</td>
                                                <td>1000</td>
                                                <td><span className="badge bg-light-info">Unpaid</span></td>
                                                <td className="text-end">
                                                    <ul className="list-inline mb-0">
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-info btn-pc-default"><i className="ti ti-eye f-20"></i></a>
                                                        </li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-success btn-pc-default"><i
                                                                className="ti ti-edit f-20"></i></a></li>
                                                        <li className="list-inline-item"><a href="#"
                                                            className="avtar avtar-s btn-link-danger btn-pc-default"><i
                                                                className="ti ti-trash f-20"></i></a></li>
                                                    </ul>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <ul className="pagination justify-content-end me-3 mt-2">
                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                <button className="page-link" onClick={goToPreviousPage}>
                                    Previous
                                </button>
                            </li>
                            {Array.from({ length: totalPages }, (_, index) => (
                                <li key={index} className={`page-item ${currentPage === index + 1 ? 'active' : ''}`}>
                                    <button className="page-link" onClick={() => handlePageChange(index + 1)}>
                                        {index + 1}
                                    </button>
                                </li>
                            ))}
                            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                <button className="page-link" onClick={goToNextPage}>
                                    Next
                                </button>
                            </li>
                        </ul>
                    </CardBody>
                </Card>
            </Col>
        </React.Fragment>
    )
}

export default InvoiceMemberInfo

