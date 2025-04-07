import React, {useEffect} from 'react'
import { Link } from 'react-router-dom'
import TotalIncomeChart from './TotalIncomeChart'
import { Card, CardBody, Col } from 'react-bootstrap';

const TotalExpenses = ({display,handleDropDown,handleClickOutside,dropdownRef}:any) => {
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
          <CardBody className="pb-0">
            <div className="d-flex align-items-center justify-content-between">
              <h5 className="mb-0">Total Expenses</h5>
              <div className="dropdown">
                <Link
                ref={dropdownRef}
                  className={`avtar avtar-s btn-link-secondary dropdown-toggle arrow-none ${display===2 ? "show" :""}`}
                  to="#"
                  data-bs-toggle="dropdown"
                  aria-haspopup="true"
                  aria-expanded="false"
                  onClick={()=>handleDropDown(2)}>
                  <i className="ti ti-dots-vertical f-18"></i>
                </Link>
                <div className={`dropdown-menu dropdown-menu-end ${display===2 ? "show show2" : ""}`}>
                  <Link className="dropdown-item" to="#" onClick={handleDropDown}>Today</Link>
                  <Link className="dropdown-item" to="#" onClick={handleDropDown}>Weekly</Link>
                  <Link className="dropdown-item" to="#" onClick={handleDropDown}>Monthly</Link>
                </div>
              </div>
            </div>
          </CardBody>
          <CardBody>
            <div id="total-income-graph"><TotalIncomeChart /></div>
            <div className="mb-2 mt-3 d-flex align-items-center justify-content-between">
              <h6 className="mb-0 d-flex align-items-center gap-2"><i className="fas fa-circle text-warning f-12"></i>
                Pending</h6>
              <p className="mb-0 text-muted">$3,202</p>
            </div>
            <div className="mb-2 d-flex align-items-center justify-content-between">
              <h6 className="mb-0 d-flex align-items-center gap-2"><i className="fas fa-circle text-success f-12"></i>
                Paid</h6>
              <p className="mb-0 text-muted">$45,050</p>
            </div>
            <div className="mb-2 d-flex align-items-center justify-content-between">
              <h6 className="mb-0 d-flex align-items-center gap-2"><i className="fas fa-circle text-danger f-12"></i>
                Overdue</h6>
              <p className="mb-0 text-muted">$25,000</p>
            </div>
            <div className="d-flex align-items-center justify-content-between">
              <h6 className="mb-0 d-flex align-items-center gap-2"><i className="fas fa-circle text-primary text-opacity-25 f-12"></i>
                Draft</h6>
              <p className="mb-0 text-muted">$7,694</p>
            </div>
          </CardBody>
        </Card>
      </Col>
    </React.Fragment>
  )
}

export default TotalExpenses
