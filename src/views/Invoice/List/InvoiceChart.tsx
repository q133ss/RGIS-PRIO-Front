import { useEffect, useRef } from 'react';
import ApexCharts from 'apexcharts';

const InvoiceChart1 = () => {
  const chartRef = useRef(null);

  useEffect(() => {
    const total_invoice_1_chart_options = {
      chart: {
        type: 'area',
        height: 55,
        sparkline: {
          enabled: true
        }
      },
      colors: ["#1de9b6"],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          type: 'vertical',
          inverseColors: false,
          opacityFrom: 0.5,
          opacityTo: 0
        }
      },
      stroke: {
        curve: 'smooth',
        width: 2,
      },
      series: [{
        data: [0, 20, 10, 45, 30, 55, 20, 30]
      }],
      tooltip: {
        fixed: {
          enabled: false
        },
        x: {
          show: false
        },
        marker: {
          show: false
        }
      }
    };

    const chart = new ApexCharts(chartRef.current, total_invoice_1_chart_options);
    chart.render();

    return () => chart.destroy();
  }, []);

  return <div ref={chartRef} id="total-invoice-1-chart"></div>;
}
// ====================================================================================


const InvoiceChart2 = () => {
  const chartRef = useRef(null);

  useEffect(() => {
    const total_invoice_2_chart_options = {
      chart: {
        type: 'area',
        height: 55,
        sparkline: {
          enabled: true
        }
      },
      colors: ["#f4c22b"],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          type: 'vertical',
          inverseColors: false,
          opacityFrom: 0.5,
          opacityTo: 0
        }
      },
      stroke: {
        curve: 'smooth',
        width: 2,
      },
      series: [{
        data: [30, 20, 55, 30, 45, 10, 20, 0]
      }],
      tooltip: {
        fixed: {
          enabled: false
        },
        x: {
          show: false
        },
        marker: {
          show: false
        }
      }
    };

    const chart = new ApexCharts(chartRef.current, total_invoice_2_chart_options);
    chart.render();

    return () => chart.destroy();
  }, []);

  return <div ref={chartRef} id="total-invoice-2-chart"></div>;
};

// =======================================================================================================

const InvoiceChart3 = () => {
  const chartRef = useRef(null);

  useEffect(() => {
    const total_invoice_3_chart_options = {
      chart: {
        type: 'area',
        height: 55,
        sparkline: {
          enabled: true
        }
      },
      colors: ["#f44236"],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          type: 'vertical',
          inverseColors: false,
          opacityFrom: 0.5,
          opacityTo: 0
        }
      },
      stroke: {
        curve: 'smooth',
        width: 2,
      },
      series: [{
        data: [0, 20, 10, 45, 30, 55, 20, 30]
      }],
      tooltip: {
        fixed: {
          enabled: false
        },
        x: {
          show: false
        },
        marker: {
          show: false
        }
      }
    };

    const chart = new ApexCharts(chartRef.current, total_invoice_3_chart_options);
    chart.render();

    return () => chart.destroy();
  }, []);

  return <div ref={chartRef} id="total-invoice-3-chart"></div>;
};

export default InvoiceChart3;




export  {InvoiceChart1,InvoiceChart2,InvoiceChart3}
