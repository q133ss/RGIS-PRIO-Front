import { useEffect, useRef } from 'react';
import ApexCharts from 'apexcharts';

const TransactionsChart1 = () => {
    const chartRef = useRef(null);

    useEffect(() => {
        const totalLine1ChartOptions = {
            chart: {
                type: 'line',
                height: 60,
                sparkline: {
                    enabled: true
                }
            },
            dataLabels: {
                enabled: false
            },
            colors: ['#1de9b6'],
            stroke: {
                curve: 'straight',
                lineCap: 'round',
                width: 3
            },
            series: [
                {
                    name: 'series1',
                    data: [20, 10, 18, 12, 25, 10, 20]
                }
            ],
            yaxis: {
                min: 0,
                max: 30
            },
            tooltip: {
                theme: 'dark',
                fixed: {
                    enabled: false
                },
                x: {
                    show: false
                },
                // y: {
                //   title: {
                //     formatter: function (seriesName) {
                //       return '';
                //     }
                //   }
                // },
                marker: {
                    show: false
                }
            }
        };

        const chart = new ApexCharts(chartRef.current, totalLine1ChartOptions);
        chart.render();

        // Cleanup function
        return () => {
            chart.destroy();
        };
    }, []);

    return (
        <div ref={chartRef}></div>
    );
};


const TransactionsChart2 = () => {
    const chartRef = useRef(null);

    useEffect(() => {
        const totalLine2ChartOptions = {
            chart: {
                type: 'line',
                height: 60,
                sparkline: {
                    enabled: true
                }
            },
            dataLabels: {
                enabled: false
            },
            colors: ['#1de9b6'],
            stroke: {
                curve: 'straight',
                lineCap: 'round',
                width: 3
            },
            series: [
                {
                    name: 'series1',
                    data: [20, 10, 18, 12, 25, 10, 20]
                }
            ],
            yaxis: {
                min: 0,
                max: 30
            },
            tooltip: {
                theme: 'dark',
                fixed: {
                    enabled: false
                },
                x: {
                    show: false
                },
                // y: {
                //   title: {
                //     formatter: function (seriesName) {
                //       return '';
                //     }
                //   }
                // },
                marker: {
                    show: false
                }
            }
        };

        const chart = new ApexCharts(chartRef.current, totalLine2ChartOptions);
        chart.render();

        // Cleanup function
        return () => {
            chart.destroy();
        };
    }, []);

    return (
        <div ref={chartRef}></div>
    );
};


const TransactionsChart3 = () => {
  const chartRef = useRef(null);

  useEffect(() => {
    const totalLine3ChartOptions = {
      chart: {
        type: 'line',
        height: 60,
        sparkline: {
          enabled: true
        }
      },
      dataLabels: {
        enabled: false
      },
      colors: ['#f44236'],
      stroke: {
        curve: 'straight',
        lineCap: 'round',
        width: 3
      },
      series: [
        {
          name: 'series1',
          data: [20, 10, 18, 12, 25, 10, 20]
        }
      ],
      yaxis: {
        min: 0,
        max: 30
      },
      tooltip: {
        theme: 'dark',
        fixed: {
          enabled: false
        },
        x: {
          show: false
        },
        // y: {
        //   title: {
        //     formatter: function (seriesName) {
        //       return '';
        //     }
        //   }
        // },
        marker: {
          show: false
        }
      }
    };

    const chart = new ApexCharts(chartRef.current, totalLine3ChartOptions);
    chart.render();

    // Cleanup function
    return () => {
      chart.destroy();
    };
  }, []);

  return (
    <div ref={chartRef}></div>
  );
};

export { TransactionsChart1, TransactionsChart2,TransactionsChart3 };
