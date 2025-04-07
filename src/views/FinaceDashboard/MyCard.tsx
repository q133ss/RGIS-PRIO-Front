import React, { useEffect } from 'react'
import { Card, CardBody, Row } from 'react-bootstrap'
import cardImage from '../../assets/images/widget/img-card-bg.svg'
import cardMaster from '../../assets/images/widget/img-card-master.svg'
import { Link } from 'react-router-dom'


const MyCard = ({ display, handleDropDown, handleClickOutside, dropdownRef }: any) => {


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
            <h5 className="mb-0">My Card</h5>
            <div className="dropdown">
              <Link
                ref={dropdownRef}
                className={`avtar avtar-s btn-link-secondary dropdown-toggle arrow-none ${display === 1 ? "show" : ""}`} to="#"
                data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false" onClick={() => handleDropDown(1)}>
                <i className="ti ti-dots-vertical f-18"></i>
              </Link>
              <div className={`dropdown-menu dropdown-menu-end ${display === 1 ? "show show2" : ""}`}>
                <Link className="dropdown-item" to="#" onClick={handleDropDown}>Today</Link>
                <Link className="dropdown-item" to="#" onClick={handleDropDown}>Weekly</Link>
                <Link className="dropdown-item" to="#" onClick={handleDropDown}>Monthly</Link>
              </div>
            </div>
          </div>
          <Card className="rounded-4 overflow-hidden" style={{ backgroundImage: `url(${cardImage})`, backgroundSize: "cover" }}>
            <CardBody>
              <div className="d-flex">
                <div className="flex-grow-1 me-3">
                  <p className="text-white text-sm text-opacity-50 mb-0">CARD NAME</p>
                  <h5 className="text-white">Jonh Smith</h5>
                </div>
                <div className="flex-shrink-0">
                  <img src={cardMaster} alt="img" className="img-fluid" />
                </div>
              </div>
              <h4 className="text-white my-3">**** **** **** **** 8361</h4>
              <Row>
                <div className="col-auto">
                  <p className="text-white text-sm text-opacity-50 mb-0">EXP</p>
                  <h6 className="text-white mb-0">7/30</h6>
                </div>
                <div className="col-auto">
                  <p className="text-white text-sm text-opacity-50 mb-0">CVV</p>
                  <h6 className="text-white mb-0">455</h6>
                </div>
              </Row>
            </CardBody>
          </Card>
          <div className="text-center mt-3">
            <h3 className="mb-1">$1.480.000</h3>
            <p className="text-muted mb-0">Total Balance</p>
          </div>
        </CardBody>
      </Card>
    </React.Fragment>
  )
}

export default MyCard
