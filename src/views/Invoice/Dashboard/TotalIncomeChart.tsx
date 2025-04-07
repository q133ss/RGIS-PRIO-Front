import { useEffect, useRef } from 'react';
import ApexCharts from 'apexcharts';

function TotalIncomeChart() {
  const chartRef = useRef(null);

  useEffect(() => {
    const totalIncomeGraphOptions = {
      chart: {
        height: 280,
        type: 'donut'
      },
      series: [27, 23, 20, 17],
      colors: ['#f4c22b', '#1de9b6', '#f44236', '#04a9f5'],
      labels: ['Pending', 'Paid', 'Overdue', 'Draft'],
      fill: {
        opacity: [1, 1, 1, 0.3]
      },
      legend: {
        show: false
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              name: {
                show: true
              },
              value: {
                show: true
              }
            }
          }
        }
      },
      dataLabels: {
        enabled: false
      },
      responsive: [
        {
          breakpoint: 575,
          options: {
            chart: {
              height: 250
            },
            plotOptions: {
              pie: {
                donut: {
                  size: '65%',
                  labels: {
                    show: false
                  }
                }
              }
            }
          }
        }
      ]
    };

    const chart = new ApexCharts(chartRef.current, totalIncomeGraphOptions);
    chart.render();

    return () => {
      chart.destroy();
    };
  }, []);

  return <div id="total-income-graph" ref={chartRef} />;
}

export default TotalIncomeChart;
