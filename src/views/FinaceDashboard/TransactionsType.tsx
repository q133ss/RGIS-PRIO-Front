import React, { useEffect} from 'react'
import { Card, CardBody, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'

const TransactionsType = ({display,handleDropDown,handleClickOutside,dropdownRef}:any) => {



  useEffect(() => {
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  return (
    <React.Fragment>
      <Card>
        <CardBody>
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h5 className="mb-0">Transactions</h5>
            <div className="dropdown">
              <Link
                ref={dropdownRef}
                className={`avtar avtar-s btn-link-secondary dropdown-toggle arrow-none ${display === 2 ? "show" : ""}`} to="#"
                data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false" onClick={()=>handleDropDown(2)}>
                <i className="ti ti-dots-vertical f-18"></i>
              </Link>
              <div className={`dropdown-menu dropdown-menu-end ${display === 2 ? "show show2" : ""}`}>
                <Link className="dropdown-item" to="#" onClick={handleDropDown}>Today</Link>
                <Link className="dropdown-item" to="#" onClick={handleDropDown}>Weekly</Link>
                <Link className="dropdown-item" to="#" onClick={handleDropDown}>Monthly</Link>
              </div>
            </div>
          </div>
          <ul className="list-group list-group-flush">
            <li className="list-group-item px-0">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="avtar avtar-s border"> AI </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <Row className="g-1">
                    <div className="col-6">
                      <h6 className="mb-0">Apple Inc.</h6>
                      <p className="text-muted mb-0"><small>#ABLE-PRO-T00232</small></p>
                    </div>
                    <div className="col-6 text-end">
                      <h6 className="mb-1">$210,000</h6>
                      <p className="text-danger mb-0"><i className="ti ti-arrow-down-left"></i> 10.6%</p>
                    </div>
                  </Row>
                </div>
              </div>
            </li>
            <li className="list-group-item px-0">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="avtar avtar-s border" data-bs-toggle="tooltip" data-bs-title="10,000 Tracks">
                    <span>SM</span>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <Row className="g-1">
                    <div className="col-6">
                      <h6 className="mb-0">Spotify Music</h6>
                      <p className="text-muted mb-0"><small>#ABLE-PRO-T10232</small></p>
                    </div>
                    <div className="col-6 text-end">
                      <h6 className="mb-1">- 10,000</h6>
                      <p className="text-success mb-0"><i className="ti ti-arrow-up-right"></i> 30.6%</p>
                    </div>
                  </Row>
                </div>
              </div>
            </li>
            <li className="list-group-item px-0">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="avtar avtar-s border bg-light-primary" data-bs-toggle="tooltip"
                    data-bs-title="143 Posts"><span>MD</span>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <Row className="g-1">
                    <div className="col-6">
                      <h6 className="mb-0">Medium</h6>
                      <p className="text-muted mb-0"><small>06:30 pm</small></p>
                    </div>
                    <div className="col-6 text-end">
                      <h6 className="mb-1">-26</h6>
                      <p className="text-warning mb-0"><i className="ti ti-arrows-left-right"></i> 5%</p>
                    </div>
                  </Row>
                </div>
              </div>
            </li>
            <li className="list-group-item px-0">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="avtar avtar-s border" data-bs-toggle="tooltip" data-bs-title="143 Posts">
                    <span>U</span>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <Row className="g-1">
                    <div className="col-6">
                      <h6 className="mb-0">Uber</h6>
                      <p className="text-muted mb-0"><small>08:40 pm</small></p>
                    </div>
                    <div className="col-6 text-end">
                      <h6 className="mb-1">+210,000</h6>
                      <p className="text-success mb-0"><i className="ti ti-arrow-up-right"></i> 10.6%</p>
                    </div>
                  </Row>
                </div>
              </div>
            </li>
            <li className="list-group-item px-0">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="avtar avtar-s border bg-light-warning" data-bs-toggle="tooltip"
                    data-bs-title="143 Posts"><span>OC</span>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <Row className="g-1">
                    <div className="col-6">
                      <h6 className="mb-0">Ola Cabs</h6>
                      <p className="text-muted mb-0"><small>07:40 pm</small></p>
                    </div>
                    <div className="col-6 text-end">
                      <h6 className="mb-1">+210,000</h6>
                      <p className="text-success mb-0"><i className="ti ti-arrow-up-right"></i> 10.6%</p>
                    </div>
                  </Row>
                </div>
              </div>
            </li>
          </ul>
        </CardBody>
      </Card>
    </React.Fragment>
  )
}

export default TransactionsType
