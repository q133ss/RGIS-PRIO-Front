import { useEffect, useRef } from 'react';
import ApexCharts from 'apexcharts';

const CatagoryChart = () => {
  const chartRef = useRef(null);

  useEffect(() => {
    const options = {
      chart: {
        height: 300,
        type: 'donut'
      },
      dataLabels: {
        enabled: false
      },
      legend:{
        show:true,
        position: 'bottom'
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%'
          }
        }
      },
      labels: ['Saving', 'Spend', 'Income'],
      series: [25, 50, 25],
      colors: ['#212529', '#04a9f5', '#caedfd']
    };

    const chart = new ApexCharts(chartRef.current, options);
    chart.render();

    // Cleanup function
    return () => {
      chart.destroy();
    };
  }, []);

  return <div id="category-donut-chart" ref={chartRef}></div>;
};

export default CatagoryChart;
