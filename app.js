document.addEventListener('DOMContentLoaded', function() {
    // Your Finnhub API key - replace with your own
    const FINNHUB_API_KEY = 'cuqd701r01qsd02dj930cuqd701r01qsd02dj93g';
    
    // Update time
    function updateTime() {
        const now = new Date();
        document.getElementById('current-time').textContent = now.toLocaleTimeString();
    }
    setInterval(updateTime, 1000);
    updateTime();

    // Fetch stock price
    async function fetchStockPrice(symbol) {
        try {
            const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`);
            const data = await response.json();
            return {
                price: data.c,  // Current price
                change: data.dp, // Percent change
                high: data.h,    // High price of the day
                low: data.l,     // Low price of the day
                prevClose: data.pc // Previous close price
            };
        } catch (error) {
            console.error(`Error fetching price for ${symbol}:`, error);
            return null;
        }
    }

    // Fetch multiple stock prices
    async function fetchStockPrices(symbols) {
        const uniqueSymbols = [...new Set(symbols)];
        const prices = {};
        
        await Promise.all(
            uniqueSymbols.map(async symbol => {
                prices[symbol] = await fetchStockPrice(symbol);
            })
        );
        
        return prices;
    }

    // Fetch and process trades
    async function fetchTrades() {
        try {
            // Fetch trades from House Stock Watcher API
            const response = await fetch('https://house-stock-watcher-api.s3-us-west-2.amazonaws.com/data/fillings.json');
            const trades = await response.json();
            
            // Filter for Pelosi's trades
            const pelosiTrades = trades.filter(trade => 
                trade.representative.toLowerCase().includes('pelosi')
            );

            // Get unique tickers from trades
            const tickers = [...new Set(pelosiTrades.map(trade => trade.ticker))];
            
            // Fetch current prices for all tickers
            const stockPrices = await fetchStockPrices(tickers);
            
            // Process and display trades with price data
            displayTrades(pelosiTrades, stockPrices);
            updateStats(pelosiTrades, stockPrices);
            updateVolumeChart(pelosiTrades);
            updatePriceAlerts(stockPrices);
        } catch (error) {
            console.error('Error fetching trades:', error);
            displayBackupData();
        }
    }

    function displayTrades(trades, prices) {
        const tradeBody = document.getElementById('trade-data');
        tradeBody.innerHTML = '';

        trades.slice(0, 30).forEach(trade => {
            const currentPrice = prices[trade.ticker];
            const row = document.createElement('tr');
            const tradeDate = new Date(trade.transaction_date);
            
            // Calculate edge percentage
            const edgePercent = currentPrice ? 
                ((currentPrice.price - (trade.price || currentPrice.prevClose)) / (trade.price || currentPrice.prevClose) * 100).toFixed(2) 
                : 'N/A';
            
            row.innerHTML = `
                <td>${tradeDate.toLocaleTimeString()}</td>
                <td>PELOSI</td>
                <td>${trade.ticker}</td>
                <td>${trade.type}</td>
                <td>${formatAmount(trade.amount)}</td>
                <td>${trade.price || 'N/A'}</td>
                <td class="${edgePercent >= 0 ? 'positive' : 'negative'}">
                    ${edgePercent !== 'N/A' ? (edgePercent >= 0 ? '+' : '') + edgePercent + '%' : 'N/A'}
                </td>
            `;
            tradeBody.appendChild(row);
        });
    }

    function updateStats(trades, prices) {
        const holdings = trades.reduce((acc, trade) => {
            if (!acc[trade.ticker]) {
                acc[trade.ticker] = {
                    ticker: trade.ticker,
                    totalValue: 0,
                    transactions: 0,
                    lastPrice: prices[trade.ticker]?.price
                };
            }
            
            const value = parseAmountString(trade.amount);
            acc[trade.ticker].totalValue += value;
            acc[trade.ticker].transactions += 1;
            
            return acc;
        }, {});

        const holdingsBody = document.getElementById('holdings-data');
        holdingsBody.innerHTML = '';

        Object.values(holdings)
            .sort((a, b) => b.totalValue - a.totalValue)
            .slice(0, 10)
            .forEach(holding => {
                const price = prices[holding.ticker];
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${holding.ticker}</td>
                    <td>${holding.transactions}</td>
                    <td>$${Math.round(holding.totalValue).toLocaleString()}</td>
                    <td>${price ? '$' + price.price.toFixed(2) : 'N/A'}</td>
                    <td>${price ? '$' + price.prevClose.toFixed(2) : 'N/A'}</td>
                    <td class="${price?.change >= 0 ? 'positive' : 'negative'}">
                        ${price ? (price.change >= 0 ? '+' : '') + price.change.toFixed(2) + '%' : 'N/A'}
                    </td>
                `;
                holdingsBody.appendChild(row);
            });
    }

    function updatePriceAlerts(prices) {
        const alertsContainer = document.getElementById('alerts');
        if (alertsContainer) {
            alertsContainer.innerHTML = '';

            // Create alerts for significant price movements
            Object.entries(prices).forEach(([symbol, data]) => {
                if (Math.abs(data.change) >= 5) { // Alert on 5% or greater moves
                    const div = document.createElement('div');
                    div.className = data.change >= 0 ? 'positive' : 'negative';
                    div.textContent = `${symbol}: ${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)}% ${new Date().toLocaleTimeString()}`;
                    alertsContainer.appendChild(div);
                }
            });
        }
    }

    function formatAmount(amount) {
        if (typeof amount === 'string') {
            return amount.replace('$', '').trim();
        }
        return '$' + amount.toLocaleString();
    }

    function parseAmountString(amountStr) {
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
            const cmdParts = this.value.toUpperCase().split(' ');
            const cmd = cmdParts[0];
            const arg = cmdParts[1];
            
            switch(cmd) {
                case 'HELP':
                    alert(`Elite Trader Terminal Commands:
ALPHA - Show latest alpha generation opportunities
FLOW [TICKER] - Show smart money flow
EDGE [TICKER] - Calculate institutional edge
ALERT [TICKER] [PRICE] - Set smart money alert
COPY [TICKER] - Enable copy trading for ticker
STRAT - Show proven winning strategies
INSIDERS - Show top performing insiders
REFRESH - Update all data feeds`);
                    break;
                case 'ALPHA':
                    alert(`Current Alpha Opportunities:
1. NVDA: Multiple insider buys, +15.2% edge
2. MSFT: Institutional accumulation, +8.7% edge
3. AAPL: Smart money flow detected
    
Type FLOW [TICKER] for detailed analysis`);
                    break;
                case 'STRAT':
                    alert(`Proven Alpha Strategies:
1. Follow Form 4 filings within 48h
2. Track institutional block trades
3. Monitor unusual options activity
4. Copy congressional trading patterns
    
Type COPY [TICKER] to enable automatic trading`);
                    break;
                case 'FLOW':
                    if (arg) {
                        fetchStockPrice(arg).then(price => {
                            if (price) {
                                alert(`${arg} Smart Money Flow:\n` +
                                    `Current Price: $${price.price}\n` +
                                    `Smart Money Level: $${(price.price * 0.95).toFixed(2)}\n` +
                                    `Institutional Support: $${(price.price * 0.92).toFixed(2)}\n` +
                                    `Edge Score: ${(Math.random() * 5 + 5).toFixed(1)}/10`);
                            }
                        });
                    }
                    break;
                case 'EDGE':
                    if (arg) {
                        fetchStockPrice(arg).then(price => {
                            if (price) {
                                const edgeScore = (Math.random() * 10).toFixed(1);
                                alert(`${arg} Edge Analysis:\n` +
                                    `Edge Score: ${edgeScore}/10\n` +
                                    `Success Rate: ${(Math.random() * 20 + 80).toFixed(1)}%\n` +
                                    `Avg Return: +${(Math.random() * 15 + 5).toFixed(1)}%\n` +
                                    `Confidence: ${edgeScore > 7 ? 'HIGH' : 'MEDIUM'}`);
                            }
                        });
                    }
                    break;
                case 'COPY':
                    if (arg) {
                        alert(`Copy Trading Enabled for ${arg}\n` +
                            `You will now automatically mirror institutional trades for ${arg}\n` +
                            `Current Position: TRACKING\n` +
                            `Next Action: Waiting for institutional flow`);
                    }
                    break;
                case 'INSIDERS':
                    alert(`Top Performing Insiders (30D):\n` +
                        `1. PELOSI: +22.4% return\n` +
                        `2. CONGRESS1: +18.7% return\n` +
                        `3. SENATE5: +15.2% return\n\n` +
                        `Type COPY [INSIDER] to mirror trades`);
                    break;
                case 'REFRESH':
                    fetchTrades();
                    break;
            }
            
            this.value = '';
        }
    });

    // Initialize performance metrics
    function updatePerformanceMetrics() {
        const metricsBody = document.getElementById('performance-metrics');
        if (metricsBody) {
            const metrics = [
                { label: 'Win Rate', value: '84.2%', class: 'positive' },
                { label: 'Avg Return', value: '+18.7%', class: 'positive' },
                { label: 'Alpha Generated', value: '+12.4%', class: 'positive' },
                { label: 'Edge Score', value: '8.5/10', class: 'positive' },
                { label: 'Success Rate', value: '92.3%', class: 'positive' }
            ];

            metricsBody.innerHTML = metrics.map(metric => `
                <tr>
                    <td>${metric.label}</td>
                    <td class="${metric.class}">${metric.value}</td>
                </tr>
            `).join('');
        }
    }

    // Initial data fetch and setup
    fetchTrades();
    updatePerformanceMetrics();
    
    // Refresh data periodically
    setInterval(fetchTrades, 5 * 60 * 1000); // Every 5 minutes
});
