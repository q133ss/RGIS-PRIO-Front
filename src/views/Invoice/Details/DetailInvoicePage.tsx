import { useState } from 'react';
import logoDark from '../../../assets/images/logo-dark.svg'
import { Link } from 'react-router-dom';
import Data from './Data';
import { Row, Col, Card, CardBody } from 'react-bootstrap';

const DetailInvoicePage = () => {
  const [printStylesApplied, setPrintStylesApplied] = useState(false);

  const handlePrint = () => {
    setPrintStylesApplied(true);
    window.print();
  };

  return (
    <div>
      {printStylesApplied && (
        <style>
          {`
            @media print {
              *,
              ::after,
              ::before {
                text-shadow: none !important;
                box-shadow: none !important;
              }
              a:not(.btn) {
                text-decoration: none;
              }
              abbr[title]::after {
                content: " (" attr(title) ")";
              }
              pre {
                white-space: pre-wrap !important;
              }
              blockquote,
              pre {
                border: 1px solid #adb5bd;
                page-break-inside: avoid;
              }
              thead {
                display: table-header-group;
              }
              img,
              tr {
                page-break-inside: avoid;
              }
              h2,
              h3,
              p {
                orphans: 3;
                widows: 3;
              }
              h2,
              h3 {
                page-break-after: avoid;
              }
              @page {
                size: a3;
              }
              body {
                min-width: 992px !important;
              }
              .container {
                min-width: 992px !important;
              }
              .page-header,
              .pc-sidebar,
              .pc-mob-header,
              .pc-header,
              .pct-customizer,
              .modal,
              .navbar {
                display: none;
              }
              .pc-container {
                top: 0;
              }
              .invoice-contact {
                padding-top: 0;
              }
              @page,
              .card-body,
              .card-header,
              body,
              .pcoded-content {
                padding: 0;
                margin: 0;
              }
              .badge {
                border: 1px solid #000;
              }
              .table {
                border-collapse: collapse !important;
              }
              .table td,
              .table th {
                background-color: #fff !important;
              }
              .table-bordered td,
              .table-bordered th {
                border: 1px solid #dee2e6 !important;
              }
              .table-dark {
                color: inherit;
              }
              .table-dark tbody + tbody,
              .table-dark td,
              .table-dark th,
              .table-dark thead th {
                border-color: #dee2e6;
              }
              .table .thead-dark th {
                color: inherit;
                border-color: #dee2e6;
              }
            }
          `}
        </style>
      )}

      <Row>
        <Col sm={12}>
          <Card className="d-print-none mb-3 mt-4">
            <CardBody className="p-3">
              <ul className="list-inline ms-auto mb-0 d-flex justify-content-end flex-wrap">
                <li className="list-inline-item align-bottom me-2">
                  <Link to="#" className="avtar avtar-s btn-link-secondary">
                    <i className="ph-duotone ph-pencil-simple-line f-22"></i>
                  </Link>
                </li>
                <li className="list-inline-item align-bottom me-2">
                  <Link to="#" className="avtar avtar-s btn-link-secondary">
                    <i className="ph-duotone ph-eye f-22"></i>
                  </Link>
                </li>
                <li className="list-inline-item align-bottom me-2">
                  <Link to="#" className="avtar avtar-s btn-link-secondary">
                    <i className="ph-duotone ph-download-simple f-22"></i>
                  </Link>
                </li>
                <li className="list-inline-item align-bottom me-2">
                  <Link to="#" className="avtar avtar-s btn-link-secondary">
                    <i className="ph-duotone ph-printer f-22"></i>
                  </Link>
                </li>
                <li className="list-inline-item align-bottom me-2">
                  <Link to="#" className="avtar avtar-s btn-link-secondary">
                    <i className="ph-duotone ph-paper-plane-tilt f-22"></i>
                  </Link>
                </li>
                <li className="list-inline-item align-bottom me-2">
                  <Link to="#" className="avtar avtar-s btn-link-secondary">
                    <i className="ph-duotone ph-share-network f-22"></i>
                  </Link>
                </li>
              </ul>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Row className="g-3">
                <div className="col-12">
                  <div className="row align-items-center g-3">
                    <div className="col-sm-6">
                      <div className="d-flex align-items-center mb-2">
                        <img src={logoDark} className="img-fluid" alt="images" />
                        <span className="badge bg-light-secondary rounded-pill ms-2">Paid</span>
                      </div>
                      <p className="mb-0">INV - 000457</p>
                    </div>
                    <div className="col-sm-6 text-sm-end">
                      <h6>Date <span className="text-muted f-w-400">03/8/2023</span></h6>
                      <h6>Due Date <span className="text-muted f-w-400">10/8/2023</span></h6>
                    </div>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="border rounded p-3">
                    <h6 className="mb-0">From:</h6>
                    <h5>Garcia-Cameron and Sons</h5>
                    <p className="mb-0">8534 Saunders Hill Apt. 583</p>
                    <p className="mb-0">(970) 982-3353</p>
                    <p className="mb-0">brandon07@pierce.com</p>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="border rounded p-3">
                    <h6 className="mb-0">To:</h6>
                    <h5>Dickinson-Cummerata</h5>
                    <p className="mb-0">55D Leatha Way Ernaburgh, NT 2146</p>
                    <p className="mb-0">75-9079921</p>
                    <p className="mb-0">kasandra.conn@borer.com</p>
                  </div>
                </div>
                <div className="col-12">
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Name</th>
                          <th>Description</th>
                          <th className="text-end">Qty</th>
                          <th className="text-end">Price</th>
                          <th className="text-end">Total Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {
                          Data.map((item: any, index: number) => {
                            return (
                              <tr key={index}>
                                <td>{item.id}</td>
                                <td>{item.name}</td>
                                <td>{item.description}</td>
                                <td className="text-end">{item.qty}</td>
                                <td className="text-end">{item.price}</td>
                                <td className="text-end">{item.total_amount}</td>
                              </tr>
                            )
                          })
                        }
                      </tbody>
                    </table>
                  </div>
                  <div className="text-start">
                    <hr className="mb-2 mt-1 border-secondary border-opacity-50" />
                  </div>
                </div>
                <div className="col-12">
                  <div className="invoice-total ms-auto">
                    <Row className="row">
                      <div className="col-6"> <p className="text-muted mb-1 text-start">Sub Total :</p></div>
                      <div className="col-6"> <p className="mb-1 text-end">$20.00</p></div>
                      <div className="col-6"> <p className="text-muted mb-1 text-start">Discount :</p></div>
                      <div className="col-6"> <p className="mb-1 text-end text-success">$10.00</p></div>
                      <div className="col-6"> <p className="text-muted mb-1 text-start">Taxes :</p></div>
                      <div className="col-6"> <p className="mb-1 text-end">$5.000</p></div>
                      <div className="col-6"> <p className="f-w-600 mb-1 text-start">Grand Total :</p></div>
                      <div className="col-6"> <p className="f-w-600 mb-1 text-end">$25.00</p></div>
                    </Row>
                  </div>
                </div>
                <div className="col-12">
                  <label className="form-label">Note</label>
                  <p className="mb-0"
                  >It was a pleasure working with you and your team. We hope you will keep us in mind for future freelance
                    projects. Thank You!</p>
                </div>
                <div className="col-12 text-end d-print-none">
                  <button className="btn btn-outline-secondary btn-print-invoice" onClick={handlePrint}>Download</button>
                </div>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>
      {/* Print Button */}
    </div>
  );
};

export default DetailInvoicePage;
