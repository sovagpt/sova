document.addEventListener('DOMContentLoaded', function() {
    // Update time
    function updateTime() {
        const now = new Date();
        document.getElementById('current-time').textContent = now.toLocaleTimeString();
    }
    setInterval(updateTime, 1000);
    updateTime();

    // Fetch and process trades
    async function fetchTrades() {
        try {
            // Primary source
            const response = await fetch('https://house-stock-watcher-api.s3-us-west-2.amazonaws.com/data/fillings.json');
            const trades = await response.json();
            
            // Filter for Pelosi's trades
            const pelosiTrades = trades.filter(trade => 
                trade.representative.toLowerCase().includes('pelosi')
            );

            // Process and display trades
            displayTrades(pelosiTrades);
            updateStats(pelosiTrades);
            updateVolumeChart(pelosiTrades);
        } catch (error) {
            console.error('Error fetching trades:', error);
            displayBackupData(); // Show sample data if API fails
        }
    }

    function displayTrades(trades) {
        const tradeBody = document.getElementById('trade-data');
        tradeBody.innerHTML = ''; // Clear existing trades

        trades.slice(0, 30).forEach(trade => {
            const row = document.createElement('tr');
            const tradeDate = new Date(trade.transaction_date);
            
            row.innerHTML = `
                <td>${tradeDate.toISOString().split('T')[0]}</td>
                <td>PELOSI</td>
                <td>${trade.ticker}</td>
                <td>${trade.type}</td>
                <td>${formatAmount(trade.amount)}</td>
                <td>${trade.price || 'N/A'}</td>
                <td class="${trade.type === 'Purchase' ? 'positive' : 'negative'}">
                    ${trade.type === 'Purchase' ? '+' : '-'}
                </td>
            `;
            tradeBody.appendChild(row);
        });
    }

    function formatAmount(amount) {
        // Convert amount ranges to readable format
        if (typeof amount === 'string') {
            return amount.replace('$', '').trim();
        }
        return '$' + amount.toLocaleString();
    }

    function updateStats(trades) {
        // Calculate holdings
        const holdings = trades.reduce((acc, trade) => {
            if (!acc[trade.ticker]) {
                acc[trade.ticker] = {
                    ticker: trade.ticker,
                    totalValue: 0,
                    transactions: 0
                };
            }
            
            const value = parseAmountString(trade.amount);
            acc[trade.ticker].totalValue += value;
            acc[trade.ticker].transactions += 1;
            
            return acc;
        }, {});

        // Display holdings
        const holdingsBody = document.getElementById('holdings-data');
        holdingsBody.innerHTML = '';

        Object.values(holdings)
            .sort((a, b) => b.totalValue - a.totalValue)
            .slice(0, 10)
            .forEach(holding => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${holding.ticker}</td>
                    <td>${holding.transactions}</td>
                    <td>$${Math.round(holding.totalValue).toLocaleString()}</td>
                    <td>Calculating...</td>
                    <td>Calculating...</td>
                    <td>N/A</td>
                `;
                holdingsBody.appendChild(row);
            });
    }

    function parseAmountString(amountStr) {
        // Convert amount ranges like "$1,000,001 - $5,000,000" to average value
        if (typeof amountStr !== 'string') return 0;
        
        const amounts = amountStr
            .replace(/[$,]/g, '')
            .split('-')
            .map(num => parseInt(num.trim()));
            
        if (amounts.length === 2) {
            return (amounts[0] + amounts[1]) / 2;
        }
        return amounts[0] || 0;
    }

    function updateVolumeChart(trades) {
        // Group trades by month
        const monthlyVolume = trades.reduce((acc, trade) => {
            const month = new Date(trade.transaction_date).toLocaleString('default', { month: 'short' });
            acc[month] = (acc[month] || 0) + parseAmountString(trade.amount);
            return acc;
        }, {});

        const volumeCtx = document.getElementById('volume-chart').getContext('2d');
        new Chart(volumeCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(monthlyVolume),
                datasets: [{
                    label: 'Trading Volume',
                    data: Object.values(monthlyVolume),
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
                            color: '#FFA500',
                            callback: value => '$' + (value / 1000000).toFixed(1) + 'M'
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
    }

    // Command line handling
    const cmdInput = document.getElementById('cmd-input');
    cmdInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const cmd = this.value.toUpperCase();
            
            switch(cmd) {
                case 'HELP':
                    alert(`Available Commands:
REFRESH - Refresh trade data
GOVT - Show government officials
PERF - Show performance metrics
HOLD - Show holdings
FIND [TICKER] - Search for ticker
SORT [COLUMN] - Sort by column`);
                    break;
                case 'REFRESH':
                    fetchTrades();
                    break;
                // Add more commands
            }
            
            this.value = '';
        }
    });

    // Initial data fetch
    fetchTrades();
    // Refresh every 15 minutes
    setInterval(fetchTrades, 15 * 60 * 1000);
});
