function DisplaySapline(id, title, subtitle, ytitle, categories, data) {
    Highcharts.chart(id, {
        chart: {
            type: 'areaspline',
            backgroundColor: {
                linearGradient: [0, 0, 500, 500],
                stops: [
                    [0, '#eef5c6'],
                    [1, '#dfe17f']
                ]
            }
        },
        title: {
            text: title,
        },
        subtitle: {
            text: subtitle,
        },
        xAxis: {
            // Highlight the last years where moose hunting quickly deminishes
            categories: categories
        },
        tooltip: {
            headerFormat: '<b>{point.category} {point.x}</b><br>'
        },
        credits: {
            enabled: false
        },
        plotOptions: {
            areaspline: {
                fillOpacity: 0.5,
                color: 'green'
            }
        },
        series: data
    });
}


function DisplayColumn(id, title, subtitle, ytitle, categories, data) {
    Highcharts.chart(id, {
        chart: {
            type: 'column',
            backgroundColor: {
                linearGradient: [0, 0, 500, 500],
                stops: [
                    [0, '#eef5c6'],
                    [1, '#dfe17f']
                ]
            }
        },
        title: {
            text: title,
        },
        subtitle: {
            text: subtitle,
        },
        xAxis: {
            categories: categories,
        },
        yAxis: {
            min: 0,
            title: {
                text: ytitle
            }
        },
        tooltip: {
            valueSuffix: ytitle
        },
        plotOptions: {
            column: {
                pointPadding: 0.2,
                borderWidth: 0,
                color: 'green'
            }
        },
        series: data
    });
}


function DisplayLine(id, title, subtitle, ytitle, categories, data) {
    Highcharts.chart(id, {
        chart: {
            type: 'line',
            backgroundColor: {
                linearGradient: [0, 0, 500, 500],
                stops: [
                    [0, '#eef5c6'],
                    [1, '#dfe17f']
                ]
            }
        },
        title: {
            text: title,
        },
        subtitle: {
            text: subtitle,
        },
        xAxis: {
            categories: categories,
        },
        yAxis: {
            min: 0,
            title: {
                text: ytitle
            }
        },
        tooltip: {
            valueSuffix: ytitle
        },
        plotOptions: {
            line: {
                pointPadding: 0.2,
                borderWidth: 0,
                color:'green'
            }
        },
        series: data
    });
}

function displayDualLineBar(id, title, subtitle, ytitle, yunit, categories, data) {
    Highcharts.chart(id, {
        chart: {
            zooming: {
                type: 'xy'
            },
            backgroundColor: {
                linearGradient: [0, 0, 500, 500],
                stops: [
                    [0, '#eef5c6'],
                    [1, '#dfe17f']
                ]
            }
        },
        title: {
            text: title
        },
        credits: {
            text: 'Source: ' +
                '<a href="https://www.yr.no/nb/historikk/graf/5-97251/Norge/Finnmark/Karasjok/Karasjok?q=2023"' +
                'target="_blank">YR</a>'
        },
        xAxis: [{
            categories: categories,
            crosshair: true
        }],
        yAxis: [{ 
            title: {
                text: ytitle[0],
                style: {
                    color: data[0].color,
                    fontWeight: 'bold'
                }
            },
        }, { // Secondary yAxis
            title: {
                text: ytitle[1],
                style: {
                    color: data[1].color,
                    fontWeight:'bold'
                }
            },
            opposite: true,
        }],
        tooltip: {
            shared: true
        },
        legend: {
            backgroundColor:
                Highcharts.defaultOptions.legend.backgroundColor || // theme
                'rgba(255,255,255,0.25)'
        },
        plotOptions: {
            line: {
                color: 'yellowgreen'
            },
            column: {
                color: 'green'
            }
        },
        series: data
    });
}



function displayBubbleChart(id, title, subtitle, ytitle, data) {
    Highcharts.chart(id, {
        chart: {
            type: 'packedbubble',
            backgroundColor: {
                linearGradient: [0, 0, 500, 500],
                stops: [
                    [0, '#eef5c6'],
                    [1, '#dfe17f']
                ]
            }
        },
        title: {
            text: title
        },
        subtitle: {
            text: subtitle
        },
        tooltip: {
            useHTML: true,
            pointFormat: '<b>{point.name}:</b> {point.value} ' + ytitle+'</sub> '
        },
        plotOptions: {
            packedbubble: {
                minSize: '20%',
                maxSize: '100%',
                zMin: 0,
                zMax: 1000,
                layoutAlgorithm: {
                    gravitationalConstant: 0.05,
                    splitSeries: true,
                    seriesInteraction: false,
                    dragBetweenSeries: true,
                    parentNodeLimit: true
                },
                dataLabels: {
                    enabled: true,
                    format: '{point.name}',
                    style: {
                        color: 'black',
                        textOutline: 'none',
                        fontWeight: 'normal'
                    }
                }
            }
        },
        series: data
    });

}