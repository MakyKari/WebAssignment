const searchTickerForm = document.getElementById('searchTickerForm')
const addToProfile = document.getElementById('addToProfile')

addToProfile.addEventListener('submit', async function(event){
    event.preventDefault();
    const ticker = document.getElementById('ticker').innerText
    
    console.log(ticker)

    try {
        const response = await fetch('/addToProfile', {
            method: "POST",
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            },
            body: JSON.stringify({ ticker: ticker })
        });

        window.location.href = '/profile';
    } catch (error) {
        console.error('Error adding ticker to profile:', error);
    }
})


var historyData = []

searchTickerForm.addEventListener('submit', async function(event){
    event.preventDefault()
    let tickerName = document.getElementById('tickerName').value
    
    getStockData(tickerName)
})

document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.recommendationButton');
    buttons.forEach(button => {
        button.addEventListener('click', event => {
            event.preventDefault();
            const ticker = button.dataset.ticker;
            
            getStockData(ticker);
        });
    });
});

async function getStockData(tickerName){
    const HistoryDataPromise = fetch('/', {
        method: "POST",
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        },
        body: JSON.stringify({ ticker : tickerName})
    })
    
    historyData = await HistoryDataPromise.then(response => response.json())

    if(historyData.historyOfStock.length === undefined){
        alert("Unknown ticker name")
    }

    closedata = {}
    historyData.historyOfStock.map(element => { closedata[(new Date(element.t)).toLocaleDateString()] = element.c})

    document.getElementById('logo_div').style.display = 'block'
    document.getElementById('logo').src = historyData.logo.image

    document.getElementById('description').style.display = 'block'
    document.getElementById('ticker').innerText = historyData.detailedData[0].symbol
    document.getElementById('name').innerText = historyData.detailedData[0].companyName
    document.getElementById('sector').innerText = historyData.detailedData[0].sector
    document.getElementById('industry').innerText = historyData.detailedData[0].industry
    document.getElementById('currency').innerText = historyData.detailedData[0].currency
    document.getElementById('location').innerText = historyData.detailedData[0].country + ", " + historyData.detailedData[0].city
    document.getElementById('exchange').innerText = historyData.detailedData[0].exchange
    
    document.getElementById('addToProfile').style.display = 'block'
    drawGraph(closedata)
}