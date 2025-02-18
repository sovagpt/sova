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
            
            row.innerHTML = `
                <td>${tradeDate.toISOString().split('T')[0]}</td>
                <td>PELOSI</td>
                <td>${trade.ticker}</td>
                <td>${trade.type}</td>
                <td>${formatAmount(trade.amount)}</td>
                <td>${trade.price || 'N/A'}</td>
                <td class="${currentPrice?.change >= 0 ? 'positive' : 'negative'}">
                    ${currentPrice ? (currentPrice.change >= 0 ? '+' : '') + currentPrice.change.toFixed(2) + '%' : 'N/A'}
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

    // Existing helper functions remain the same
    function formatAmount(amount) { /* ... */ }
    function parseAmountString(amountStr) { /* ... */ }
    function updateVolumeChart(trades) { /* ... */ }

    // Enhanced command line handling
    const cmdInput = document.getElementById('cmd-input');
    cmdInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const cmdParts = this.value.toUpperCase().split(' ');
            const cmd = cmdParts[0];
            const arg = cmdParts[1];
            
            switch(cmd) {
                case 'HELP':
                    alert(`Available Commands:
REFRESH - Refresh trade data
PRICE [TICKER] - Get detailed price info
TRADES [TICKER] - Show all trades for ticker
ALERT [TICKER] [PRICE] - Set price alert
CLEAR - Clear all alerts`);
                    break;
                case 'PRICE':
                    if (arg) {
                        fetchStockPrice(arg).then(price => {
                            if (price) {
                                alert(`${arg} Price:\n` +
                                    `Current: $${price.price}\n` +
                                    `Change: ${price.change}%\n` +
                                    `High: $${price.high}\n` +
                                    `Low: $${price.low}\n` +
                                    `Prev Close: $${price.prevClose}`);
                            }
                        });
                    }
                    break;
                case 'REFRESH':
                    fetchTrades();
                    break;
            }
            
            this.value = '';
        }
    });

    // Initial data fetch
    fetchTrades();
    
    // Refresh data periodically
    setInterval(fetchTrades, 5 * 60 * 1000); // Every 5 minutes
});
