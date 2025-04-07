import React from 'react'
import { Row, Card, Col, CardBody } from 'react-bootstrap'
import { TradingData } from './InvoiceData'
import InvoiceTradingChart from './InvoiceTradingChart'

function Trading() {
  return (
    <React.Fragment>
      <Col lg={9}>
        <Card>
          <CardBody>
            <Row className="g-3 mb-3">
              {
                TradingData.map((items: any, index: number) => {
                  return (
                    <Col md={6} xxl={3} key={index}>
                      <Card className="border mb-0">
                        <CardBody className='p-3'>
                          <div className="d-flex align-items-center justify-content-between gap-1">
                            <h6 className="mb-0">{items.label}</h6>
                            <p className="mb-0 text-muted d-flex align-items-center gap-1">
                              <span className={items.iconColor}>{items.icon} </span>
                              {items.percentage}</p>
                          </div>
                          <h5 className="mb-2 mt-3">{items.euro}</h5>
                          <div className="d-flex align-items-center gap-1">
                            <h5 className="mb-0">{items.totle_invoice}</h5>
                            <p className="mb-0 text-muted d-flex align-items-center gap-2">{items.lable1}</p>
                          </div>
                        </CardBody>
                      </Card>
                    </Col>
                  )
                })
              }
            </Row>
            <div id="invoice-chart"><InvoiceTradingChart /></div>
          </CardBody>
        </Card>
      </Col>
    </React.Fragment>
  )
}

export default Trading
