import React from 'react'
import { Card,CardBody } from 'react-bootstrap'
import CashFlowBarChart from './CashFlowChart'

const CashFlow = () => {
  return (
    <React.Fragment>
         <Card>
            <CardBody>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h5 className="mb-1">Cashflow</h5>
                  <p>5.44% <span className="badge text-bg-success">5.44%</span></p>
                </div>
                <select className="form-select rounded-3 form-select-sm w-auto">
                  <option>Today</option>
                  <option>Weekly</option>
                  <option defaultValue="monthly">Monthly</option>
                </select>
              </div>
              <div id="cashflow-bar-chart"><CashFlowBarChart/></div>
            </CardBody>
          </Card>
    </React.Fragment>
  )
}

export default CashFlow
