import React, { useState } from 'react'
import { Button, Col, Collapse, Modal } from "react-bootstrap";
import { Link } from 'react-router-dom'

const EditDetailInvoice = () => {

  const [formData, setFormData] = useState({
    invoiceId: '8795646525451',
    status: 'Please Select',
    startDate: '2022-01-05T11:42:13.510',
    dueDate: '2022-02-06T11:42:13.510'
  })

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const [data, setData] = useState({
    discount: "0.5",
    taxes: "0.2",
    note: ""
  })
  const [items1, setItems1] = useState(
    { id1: 1, name1: 'Apple Series 4 GPS A38 MM Space', description1: 'Apple Watch SE Smartwatch', qty1: 3, price1: 275.00 },
  );
  const [items2, setItems2] = useState(
    { id2: 2, name2: 'Boat On-Ear Wireless', description2: 'Mic Bluetooth 4.2, Rockerz 450R', qty2: 45, price2: 81.99 },
  );

  const [items3, setItems3] = useState(
    { id3: 3, name3: 'Fitbit MX30 Smart Watch', description3: '(MX30- waterproof) watch', qty3: 70, price3: 85.00 }
  );

  const handleItems = (e: any) => {
    setItems1({ ...items1, [e.target.name]: e.target.value })
    setItems2({ ...items2, [e.target.name]: e.target.value })
    setItems3({ ...items3, [e.target.name]: e.target.value })
  }

  const handleData = (e: any) => {
    setData({ ...data, [e.target.name]: e.target.value })
  }

  const [show, setShow] = useState(false);
  const toggle = () => setShow(!show);

  // Select address
  const [selectColl, setSelectColl] = useState(false);
  const toggleSelect = () => setSelectColl(!selectColl);

  // address
  const [addressColl, setAddressColl] = useState(false);
  const toggleAddress = () => setAddressColl(!addressColl);

  // show icone
  const [collapses, setCollapses] = useState(true);
  const toggleCollapses = () => setCollapses(!collapses);

  return (


    <React.Fragment>
      <Col sm={6} xl={3}>
        <div className="mb-0">
          <label className="form-label">Invoice id</label>
          <input type="text" className="form-control" placeholder="#xxxx" value="8795646525451" readOnly />
        </div>
      </Col>
      <Col sm={6} xl={3} >
        <div className="mb-0">
          <label className="form-label">Status</label>
          <select className="form-select" id="exampleFormControlSelect1" onChange={handleInputChange}>
            <option defaultValue="Please Select">Please Select</option>
            <option>Paid</option>
            <option>Unpaid</option>
            <option>Partial Paid</option>
          </select>
        </div>
      </Col>
      <Col sm={6} xl={3} >
        <div className="mb-0">
          <label className="form-label">Start Date</label>
          <input type="datetime-local" className="form-control" value={formData.startDate} onChange={handleInputChange} />
        </div>
      </Col>
      <Col sm={6} xl={3}>
        <div className="mb-0">
          <label className="form-label">Due Date</label>
          <input type="datetime-local" className="form-control" value={formData.dueDate} onChange={handleInputChange} />
        </div>
      </Col>
      <Col xl={6}>
        <div className="border rounded p-3 h-100">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h6 className="mb-0">From:</h6>
            <Button size="sm"
              variant="light-secondary" onClick={() => {
                toggle();
                setSelectColl(true);
                setAddressColl(false);
              }}>
              <i className="ph-duotone ph-pencil-simple-line"></i>&nbsp; Change
            </Button>
          </div>
          <h5>Garcia-Cameron and Sons</h5>
          <p className="mb-0">8534 Saunders Hill Apt. 583</p>
          <p className="mb-0">(970) 982-3353</p>
          <p className="mb-0">brandon07@pierce.com</p>
        </div>
      </Col>
      <div className="col-xl-6">
        <div className="border rounded p-3 h-100">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h6 className="mb-0">To:</h6>
            <Button size="sm"
              variant="light-secondary" onClick={() => {
                toggle();
                setSelectColl(true);
                setAddressColl(false);
              }}>
              <i className="ph-duotone ph-pencil-simple-line"></i>&nbsp; Change
            </Button>
          </div>
          <h5>Belle J. Richter</h5>
          <p className="mb-0">1300 Mine RoadQuemado, NM 87829</p>
          <p className="mb-0">305-829-7809</p>
          <p className="mb-0">Belle@pierce.com</p>
        </div>
      </div>
      <Col>
        <h5>Detail</h5>
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th><span className="text-danger">*</span>Name</th>
                <th><span className="text-danger">*</span>Description</th>
                <th><span className="text-danger">*</span>Qty</th>
                <th>Price</th>
                <th>Total Amount</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td><input type="text" className="form-control" placeholder="Name" name="name" value={items1.name1} onChange={handleItems} /></td>
                <td><input type="text" className="form-control" placeholder="Description" name="description" value={items1.description1} onChange={handleItems} /></td>
                <td><input type="number" className="form-control" placeholder="Qty" value={items1.qty1} name="qty" onChange={handleItems} /></td>
                <td><input type="number" className="form-control" placeholder="Price" value={items1.price1} name="price" onChange={handleItems} /></td>
                <td>₹825.00</td>
                <td className="text-center">
                  <Link to="#" className="avtar avtar-s btn-link-danger btn-pc-default"><i className="ti ti-trash f-20"></i></Link>
                </td>
              </tr>
              <tr>
                <td>2</td>
                <td><input type="text" className="form-control" placeholder="Name" name="name" value={items2.name2} onChange={handleItems} /></td>
                <td><input type="text" className="form-control" placeholder="Description" name="description" value={items2.description2} onChange={handleItems} /></td>
                <td><input type="number" className="form-control" placeholder="Qty" value={items2.qty2} name="qty" onChange={handleItems} /></td>
                <td><input type="number" className="form-control" placeholder="Price" value={items2.price2} name='price' onChange={handleItems} /></td>
                <td>₹3689.55</td>
                <td className="text-center">
                  <Link to="#" className="avtar avtar-s btn-link-danger btn-pc-default"><i className="ti ti-trash f-20"></i></Link>
                </td>
              </tr>
              <tr>
                <td>3</td>
                <td><input type="text" className="form-control" placeholder="Name" name="name" value={items3.name3} onChange={handleItems} /></td>
                <td><input type="text" className="form-control" placeholder="Description" name="description" value={items3.description3} onChange={handleItems} /></td>
                <td><input type="number" className="form-control" placeholder="Qty" name="qty" value={items3.qty3} onChange={handleItems} /></td>
                <td><input type="number" className="form-control" placeholder="Price" name="price" value={items3.price3} onChange={handleItems} /></td>
                <td>₹5950.00</td>
                <td className="text-center">
                  <Link to="#" className="avtar avtar-s btn-link-danger btn-pc-default"><i className="ti ti-trash f-20"></i></Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="text-start">
          <hr className="mb-4 mt-0 border-secondary border-opacity-50" />
          <button className="btn btn-light-primary d-flex align-items-center gap-2"><i className="ti ti-plus"></i> Add new item</button>
        </div>
      </Col>
      <div className="col-12">
        <div className="invoice-total ms-auto">
          <div className="row">
            <div className="col-6">
              <div className="mb-3">
                <label className="form-label">Discount(%)</label>
                <input type="text" className="form-control" name="discount" value={data.discount} onChange={handleData} />
              </div>
            </div>
            <div className="col-6">
              <div className="mb-3">
                <label className="form-label">Taxes(%)</label>
                <input type="text" className="form-control" name="text" value={data.taxes} onChange={handleData} />
              </div>
            </div>
            <div className="col-6"> <p className="text-muted mb-1 text-start">Sub Total :</p></div>
            <div className="col-6"> <p className="f-w-600 mb-1 text-end">$20.00</p></div>
            <div className="col-6"> <p className="text-muted mb-1 text-start">Discount :</p></div>
            <div className="col-6"> <p className="f-w-600 mb-1 text-end text-success">$10.00</p></div>
            <div className="col-6"> <p className="text-muted mb-1 text-start">Taxes :</p></div>
            <div className="col-6"> <p className="f-w-600 mb-1 text-end">$5.000</p></div>
            <div className="col-6"> <p className="f-w-600 mb-1 text-start">Grand Total :</p></div>
            <div className="col-6"> <p className="f-w-600 mb-1 text-end">$25.00</p></div>
          </div>
        </div>
      </div>
      <div className="col-12">
        <div className="mb-0">
          <label className="form-label">Note</label>
          <textarea className="form-control" name="note" rows={3} placeholder="Note" value={data.note} onChange={handleData}></textarea>
        </div>
      </div>
      <div className="col-12">
        <div className="row align-items-end justify-content-between g-3">
          <div className="col-sm-auto">
            <label className="form-label">Set Currency*</label>
            <select className="form-select w-auto">
              <option>USD (US Dollar)</option>
              <option>INR (Rupes)</option>
            </select>
          </div>
          <div className="col-sm-auto btn-page">
            <Link to="/admins/invoice-view" className="btn btn-outline-secondary">Preview</Link>
            <button className="btn btn-primary">Update & Send</button>
          </div>
        </div>
      </div>

      <Modal show={show} onHide={toggle} size="lg" centered scrollable>
        <Modal.Header style={{ display: "flex", justifyContent: "space-between" }}>
          <Collapse in={selectColl} className="multi-collapse">
            <h5 className="mb-0">Select address</h5>
          </Collapse>
          <Collapse className="multi-collapse" in={addressColl}>
            <h5 className="mb-0">Add New address</h5>
          </Collapse>
          <div className="d-flex align-items-center justify-content-end">
            <Collapse className="multi-collapse" in={collapses}>
              <Link to="#" className="avtar avtar-s btn-link-secondary" onClick={() => { toggleAddress(); toggleSelect(); toggleCollapses(); }}>
                <i className="ti ti-plus f-20"></i>
              </Link>
            </Collapse>
            <Link to="#" className="avtar avtar-s btn-link-danger" onClick={() => { toggle(); toggleAddress(); toggleSelect(); toggleCollapses(); }}>
              <i className="ti ti-x f-20"></i>
            </Link>
          </div>
        </Modal.Header>
        <Modal.Body>
          <Collapse in={selectColl} className="multi-collapse">
            <div className="address-check-block">
              <div className="address-check border rounded p-3">
                <div className="form-check">
                  <input type="radio" name="radio1" className="form-check-input input-primary" id="address-check-1" defaultChecked />
                  <label className="form-check-label d-block" htmlFor="address-check-1">
                    <span className="h6 mb-0 d-block">Ian Carpenter <small className="text-muted">(Home)</small></span>
                    <span className="text-muted address-details">1754 Ureate Path, 695 Newga View, Seporcus, Rhode Island, Belgium - SA5 5BO</span>
                    <span className="row align-items-center justify-content-between">
                      <span className="col-6">
                        <span className="text-muted mb-0">+91 1234567890</span>
                      </span>
                      <span className="col-6 text-end">
                        <span className="address-btns d-flex align-items-center justify-content-end">
                          <Link to="#" className="avtar avtar-s btn-link-danger btn-pc-default mx-1">
                            <i className="ti ti-trash f-20"></i>
                          </Link>
                          <span className="btn btn-sm btn-outline-primary">Deliver to this address</span>
                        </span>
                      </span>
                    </span>
                  </label>
                </div>
              </div>
              <div className="address-check border rounded p-3">
                <div className="form-check">
                  <input type="radio" name="radio1" className="form-check-input input-primary" id="address-check-2" />
                  <label className="form-check-label d-block" htmlFor="address-check-2">
                    <span className="h6 mb-0 d-block">Ian Carpenter <small className="text-muted">(Home)</small></span>
                    <span className="text-muted address-details">1754 Ureate Path, 695 Newga View, Seporcus, Rhode Island, Belgium - SA5 5BO</span>
                    <span className="row align-items-center justify-content-between">
                      <span className="col-6">
                        <span className="text-muted mb-0">+91 1234567890</span>
                      </span>
                      <span className="col-6 text-end">
                        <span className="address-btns d-flex align-items-center justify-content-end">
                          <Link to="#" className="avtar avtar-s btn-link-danger btn-pc-default mx-1">
                            <i className="ti ti-trash f-20"></i>
                          </Link>
                          <span className="btn btn-sm btn-outline-primary">Deliver to this address</span>
                        </span>
                      </span>
                    </span>
                  </label>
                </div>
              </div>
              <div className="address-check border rounded p-3">
                <div className="form-check">
                  <input type="radio" name="radio1" className="form-check-input input-primary" id="address-check-3" />
                  <label className="form-check-label d-block" htmlFor="address-check-3">
                    <span className="h6 mb-0 d-block">Ian Carpenter <small className="text-muted">(Home)</small></span>
                    <span className="text-muted address-details">1754 Ureate Path, 695 Newga View, Seporcus, Rhode Island, Belgium - SA5 5BO</span>
                    <span className="row align-items-center justify-content-between">
                      <span className="col-6">
                        <span className="text-muted mb-0">+91 1234567890</span>
                      </span>
                      <span className="col-6 text-end">
                        <span className="address-btns d-flex align-items-center justify-content-end">
                          <Link to="#" className="avtar avtar-s btn-link-danger btn-pc-default mx-1">
                            <i className="ti ti-trash f-20"></i>
                          </Link>
                          <span className="btn btn-sm btn-outline-primary">Deliver to this address</span>
                        </span>
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </Collapse>
          <Collapse in={addressColl} className="multi-collapse">
            <div className="row">
              <div className="col-12">
                <div className="form-group row align-items-center">
                  <label className="col-lg-4 col-form-label">Address Type :<small className="text-muted d-block">Enter Add Type</small></label>
                  <div className="col-lg-8">
                    <div className="form-check form-check-inline">
                      <input className="form-check-input" type="radio" name="flexRadioDefault" id="addtypecheck1" defaultChecked />
                      <label className="form-check-label" htmlFor="addtypecheck1"> Home (All day Delivery) </label>
                    </div>
                    <div className="form-check form-check-inline">
                      <input className="form-check-input" type="radio" name="flexRadioDefault" id="addtypecheck2" />
                      <label className="form-check-label" htmlFor="addtypecheck2"> Work (Between 10 AM to 5 PM) </label>
                    </div>
                  </div>
                </div>
                <div className="form-group row">
                  <label className="col-lg-4 col-form-label">First Name :<small className="text-muted d-block">Enter your first name</small></label>
                  <div className="col-lg-8">
                    <input type="text" className="form-control" />
                  </div>
                </div>
                <div className="form-group row">
                  <label className="col-lg-4 col-form-label">Last Name :<small className="text-muted d-block">Enter your last name</small></label>
                  <div className="col-lg-8">
                    <input type="text" className="form-control" />
                  </div>
                </div>
                <div className="form-group row">
                  <label className="col-lg-4 col-form-label">Email Id :<small className="text-muted d-block">Enter Email id</small></label>
                  <div className="col-lg-8">
                    <input type="email" className="form-control" />
                  </div>
                </div>
                <div className="form-group row">
                  <label className="col-lg-4 col-form-label">Date of Birth :<small className="text-muted d-block">Enter the date of birth</small></label>
                  <div className="col-lg-8">
                    <input type="date" className="form-control" />
                  </div>
                </div>
                <div className="form-group row">
                  <label className="col-lg-4 col-form-label">Phone number :<small className="text-muted d-block">Enter Phone number</small></label>
                  <div className="col-lg-8">
                    <input type="text" className="form-control" />
                  </div>
                </div>
                <div className="form-group row">
                  <label className="col-lg-4 col-form-label">City :<small className="text-muted d-block">Enter City name</small></label>
                  <div className="col-lg-8">
                    <input type="text" className="form-control" />
                  </div>
                </div>
                <div className="form-group">
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" value="" id="checkaddres" defaultChecked />
                    <label className="form-check-label" htmlFor="checkaddres"> Save this new address for future shipping </label>
                  </div>
                </div>
                <div className="text-end btn-page mb-0 mt-4">
                  <button className="btn btn-outline-secondary" type="button" onClick={() => { toggleSelect(); toggleAddress(); toggleCollapses(); }}>Cancel</button>
                  <button className="btn btn-primary" onClick={toggle}>Save &amp; Deliver to this Address</button>
                </div>
              </div>
            </div>
          </Collapse>
        </Modal.Body>
        <Collapse in={selectColl} className="modal-footer justify-content-between multi-collapse">
          <div id="multi-collapse">
            <ul className="list-inline me-auto mb-0">
              <li className="list-inline-item align-bottom">
                <Link to="#" className="avtar avtar-s btn-link-danger w-sm-auto" data-bs-toggle="tooltip" aria-label="Delete" data-bs-original-title="Delete">
                  <i className="ti ti-trash f-18"></i>
                </Link>
              </li>
            </ul>
            <div className="flex-grow-1 text-end">
              <button type="button" className="btn btn-link-danger" onClick={toggle}>Cancel</button>&nbsp;
              <button type="button" className="btn btn-primary" onClick={() => { toggle(); }}>Save</button>
            </div>
          </div>
        </Collapse>
      </Modal>
    </React.Fragment>
  )
}

export default EditDetailInvoice
