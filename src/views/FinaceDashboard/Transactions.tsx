import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Row, Col, Card, CardBody } from 'react-bootstrap';
import { TransactionsChart1, TransactionsChart2, TransactionsChart3 } from './TransactionsChart';

const Transactions = ({display,handleDropDown,handleClickOutside,dropdownRef}:any) => {

  
  useEffect(() => {
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  return (
    <React.Fragment>
      <Row>
        <Col md={6} xxl={4}>
          <Card>
            <CardBody>
              <div className="d-flex align-items-start justify-content-between mb-3">
                <div>
                  <h6 className="mb-0">Transactions</h6>
                  <p className="mb-0 text-muted">2-31 July 2023</p>
                </div>
                <div className="dropdown">
                  <Link
                    ref={dropdownRef}
                    className={`avtar avtar-xs btn-link-secondary dropdown-toggle arrow-none ${display === 3 ? "show" : ""}`} to="#"
                    data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false" onClick={()=>handleDropDown(3)}>
                    <i className="ti ti-dots-vertical f-18"></i>
                  </Link>
                  <div className={`dropdown-menu dropdown-menu-end ${display === 3 ? "show show2" : ""}`}>
                    <Link className="dropdown-item" to="#" onClick={handleDropDown}>Today</Link>
                    <Link className="dropdown-item" to="#" onClick={handleDropDown}>Weekly</Link>
                    <Link className="dropdown-item" to="#" onClick={handleDropDown}>Monthly</Link>
                  </div>
                </div>
              </div>
              <div id="total-line-1-chart"><TransactionsChart1 /></div>
              <div className="d-flex align-items-center justify-content-between gap-2 mt-3">
                <h4 className="mb-0"><small className="text-muted">$</small>650k</h4>
                <p className="mb-0 text-muted text-sm">Compare to last week</p>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col md={6} xxl={4}>
          <Card>
            <CardBody>
              <div className="d-flex align-items-start justify-content-between mb-3">
                <div>
                  <h6 className="mb-0">Transactions</h6>
                  <p className="mb-0 text-muted">2-31 July 2023</p>
                </div>
                <div className="dropdown">
                  <Link
                    ref={dropdownRef}
                    className={`avtar avtar-xs btn-link-secondary dropdown-toggle arrow-none ${display === 4 ? "show" : ""}`} to="#"
                    data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false" onClick={()=>handleDropDown(4)}>
                    <i className="ti ti-dots-vertical f-18"></i>
                  </Link>
                  <div className={`dropdown-menu dropdown-menu-end ${display === 4 ? "show show2" : ""}`}>
                    <Link className="dropdown-item" to="#" onClick={handleDropDown}>Today</Link>
                    <Link className="dropdown-item" to="#" onClick={handleDropDown}>Weekly</Link>
                    <Link className="dropdown-item" to="#" onClick={handleDropDown}>Monthly</Link>
                  </div>
                </div>
              </div>
              <div id="total-line-2-chart"><TransactionsChart2 /></div>
              <div className="d-flex align-items-center justify-content-between gap-2 mt-3">
                <h4 className="mb-0"><small className="text-muted">$</small>650k</h4>
                <p className="mb-0 text-muted text-sm">Compare to last week</p>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col md={12} xxl={4}>
          <Card>
            <CardBody>
              <div className="d-flex align-items-start justify-content-between mb-3">
                <div>
                  <h6 className="mb-0">Transactions</h6>
                  <p className="mb-0 text-muted">2-31 July 2023</p>
                </div>
                <div className="dropdown">
                  <Link
                    ref={dropdownRef}
                    className={`avtar avtar-xs btn-link-secondary dropdown-toggle arrow-none ${display === 5 ? "show" : ""}`} to="#"
                    data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false" onClick={()=>handleDropDown(5)}>
                    <i className="ti ti-dots-vertical f-18"></i>
                  </Link>
                  <div className={`dropdown-menu dropdown-menu-end ${display === 5 ? "show show2" : ""}`}>
                    <Link className="dropdown-item" to="#" onClick={handleDropDown}>Today</Link>
                    <Link className="dropdown-item" to="#" onClick={handleDropDown}>Weekly</Link>
                    <Link className="dropdown-item" to="#" onClick={handleDropDown}>Monthly</Link>
                  </div>
                </div>
              </div>
              <div id="total-line-3-chart"><TransactionsChart3 /></div>
              <div className="d-flex align-items-center justify-content-between gap-2 mt-3">
                <h4 className="mb-0"><small className="text-muted">$</small>650k</h4>
                <p className="mb-0 text-muted text-sm">Compare to last week</p>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </React.Fragment>
  )
}

export default Transactions
