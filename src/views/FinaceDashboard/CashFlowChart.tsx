import { useEffect, useRef } from 'react';
import ApexCharts from 'apexcharts';

const CashFlowBarChart = () => {
  const chartRef = useRef(null);

  useEffect(() => {
    const cashflowBarChartOptions = {
      chart: {
        type: 'bar',
        height: 210,
        toolbar: {
          show: false
        }
      },
      plotOptions: {
        bar: {
          columnWidth: '70%',
          borderRadius: 2
        }
      },
      fill:{
        opacity:[1,0.4],
      },
      stroke: {
        show: true,
        width: 3,
        colors: ['transparent']
      },
      dataLabels: {
        enabled: false
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        show: true,
        fontFamily: `'Public Sans', sans-serif`,
        offsetX: 10,
        offsetY: 10,
        labels: {
          useSeriesColors: false
        },
        markers: {
          width: 10,
          height: 10,
          radius: '50%',
          offsexX: 2,
          offsexY: 2
        },
        itemMargin: {
          horizontal: 15,
          vertical: 5
        }
      },
      colors: ['#04a9f5', '#04a9f5'],
      series: [{
        name: 'Income',
        data: [180, 90, 135, 114, 120, 145, 180, 90, 135, 114, 120, 145]
      }, {
        name: 'Expenses',
        data: [120, 45, 78, 150, 168, 99, 120, 45, 78, 150, 168, 99]
      }],
      grid:{
        borderColor: '#00000010',
      },
      yaxis: {
        show:false
      }
    };

    const chart = new ApexCharts(chartRef.current, cashflowBarChartOptions);
    chart.render();

    // Cleanup function
    return () => {
      chart.destroy();
    };
  }, []);

  return (
    <div id="cashflow-bar-chart" ref={chartRef}></div>
  );
};

export default CashFlowBarChart;
