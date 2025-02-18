document.addEventListener('DOMContentLoaded', function() {
    // Update time
    function updateTime() {
        const now = new Date();
        document.getElementById('current-time').textContent = now.toLocaleTimeString();
    }
    setInterval(updateTime, 1000);
    updateTime();

    // Sample trade data
    const trades = [
        { date: '2024-02-18', rep: 'PELOSI', ticker: 'NVDA', type: 'BUY', amount: 250000, price: 721.28, change: 2.45 },
        { date: '2024-02-17', rep: 'SCOTT', ticker: 'MSFT', type: 'SELL', amount: 180000, price: 398.67, change: -1.23 },
        { date: '2024-02-16', rep: 'PELOSI', ticker: 'AAPL', type: 'BUY', amount: 150000, price: 182.52, change: 0.87 },
        // Add more sample trades
    ];

    // Populate trade data
    const tradeBody = document.getElementById('trade-data');
    trades.forEach(trade => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${trade.date}</td>
            <td>${trade.rep}</td>
            <td>${trade.ticker}</td>
            <td>${trade.type}</td>
            <td>${trade.amount.toLocaleString()}</td>
            <td>${trade.price.toFixed(2)}</td>
            <td class="${trade.change >= 0 ? 'positive' : 'negative'}">${trade.change >= 0 ? '+' : ''}${trade.change.toFixed(2)}%</td>
        `;
        tradeBody.appendChild(row);
    });

    // Sample holdings data
    const holdings = [
        { ticker: 'NVDA', repCount: 12, value: 2500000, avgPrice: 685.40, last: 721.28, change: 15.2 },
        { ticker: 'MSFT', repCount: 8, value: 1800000, avgPrice: 375.20, last: 398.67, change: -2.3 },
        { ticker: 'AAPL', repCount: 15, value: 950000, avgPrice: 170.80, last: 182.52, change: 5.1 },
        // Add more holdings
    ];

    // Populate holdings data
    const holdingsBody = document.getElementById('holdings-data');
    holdings.forEach(holding => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${holding.ticker}</td>
            <td>${holding.repCount}</td>
            <td>${holding.value.toLocaleString()}</td>
            <td>${holding.avgPrice.toFixed(2)}</td>
            <td>${holding.last.toFixed(2)}</td>
            <td class="${holding.change >= 0 ? 'positive' : 'negative'}">${holding.change >= 0 ? '+' : ''}${holding.change.toFixed(2)}%</td>
        `;
        holdingsBody.appendChild(row);
    });

    // Initialize volume chart
    const volumeCtx = document.getElementById('volume-chart').getContext('2d');
    new Chart(volumeCtx, {
        type: 'bar',
        data: {
            labels: ['9:30', '10:00', '10:30', '11:00', '11:30', '12:00'],
            datasets: [{
                label: 'Trading Volume',
                data: [1200000, 850000, 950000, 1100000, 750000, 950000],
                backgroundColor: '#FFA500',
                borderColor: '#FFA500',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#333'
                    },
                    ticks: {
                        color: '#FFA500'
                    }
                },
                x: {
                    grid: {
                        color: '#333'
                    },
                    ticks: {
                        color: '#FFA500'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });

    // Command line handling
    const cmdInput = document.getElementById('cmd-input');
    cmdInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const cmd = this.value.toUpperCase();
            
            switch(cmd) {
                case 'HELP':
                    alert(`Available Commands:
HELP - Show this help
GOVT - Show government officials
PERF - Show performance metrics
HOLD - Show holdings
FIND [TICKER] - Search for ticker
SORT [COLUMN] - Sort by column`);
                    break;
                case 'GOVT':
                    // Implement government officials view
                    break;
                case 'PERF':
                    // Implement performance metrics view
                    break;
                // Add more commands
            }
            
            this.value = '';
        }
    });
});
