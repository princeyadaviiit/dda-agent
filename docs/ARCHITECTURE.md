# Trading Bot Architecture (Refactored)

## Overview

This trading bot implements an ICT (Inner Circle Trading) strategy with complete independence from TradingView for market data. The bot fetches all market data from Binance Futures API and only uses TradingView for post-trade visualization.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     TRADING BOT (bot.js)                     │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              ICT Strategy Engine                        │ │
│  │  • Multi-timeframe analysis (HTF + LTF)                │ │
│  │  • Order Block detection                               │ │
│  │  • Fair Value Gap identification                       │ │
│  │  • Fibonacci OTE zones                                 │ │
│  │  • Kill Zone timing                                    │ │
│  │  • Break of Structure detection                        │ │
│  │  • Confirmation patterns                               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                          │
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Binance    │  │    Delta     │  │  TradingView │
│   Futures    │  │  Exchange    │  │     MCP      │
│     API      │  │    India     │  │   (Optional) │
└──────────────┘  └──────────────┘  └──────────────┘
│                 │                 │
│ Market Data     │ Trade Execution │ Post-Trade
│ • OHLCV         │ • Buy/Sell      │ Visualization
│ • Price feeds   │ • Leverage      │ • Draw Entry
│ • Volume        │ • TP/SL         │ • Draw TP/SL
│ • Historical    │ • Position Mgmt │ • Draw Zones
│   candles       │                 │
```

## Data Flow

### 1. Market Data Acquisition (Binance Futures)

```javascript
// Bot fetches candles directly from Binance
const candlesHTF = await fetchMarketData(symbol, "4H", 100);
const candlesLTF = await fetchMarketData(symbol, "15m", 100);
```

**Source:** Binance Futures API (https://fapi.binance.com)
**Authentication:** None required for market data
**Rate Limits:** 1200 requests/minute (weight-based)

### 2. Technical Analysis (Bot Internal)

```javascript
// Bot calculates all indicators internally
const ictAnalysis = performICTAnalysis(candlesHTF, candlesLTF);
```

**Indicators Calculated:**
- EMA (8-period)
- VWAP (session-based)
- RSI (14-period)
- Fibonacci retracements
- Order Blocks
- Fair Value Gaps
- Break of Structure

### 3. Safety Check & Decision (Bot Internal)

```javascript
// Bot validates all ICT conditions
const { allPass, results } = runICTSafetyCheck(ictAnalysis, rules);
```

**Validation:**
- HTF trend direction
- Break of Structure
- Fibonacci OTE zone (0.618-0.786)
- Order Block presence
- Fair Value Gap confluence
- Kill Zone timing
- Confirmation pattern
- Timeframe alignment
- Risk management limits

### 4. Trade Execution (Delta Exchange)

```javascript
// Bot places order on Delta Exchange
const order = await placeDeltaOrder(symbol, side, size, price, leverage, sl, tp);
```

**Exchange:** Delta Exchange India
**Authentication:** API Key + Secret (HMAC-SHA256)
**Order Types:** Market orders with leverage
**Position Management:** Tracked in open-positions.json

### 5. Post-Trade Visualization (TradingView - Optional)

```javascript
// Bot prepares drawing data for TradingView
const visualData = await drawVisualAnalysis(ictAnalysis, position, tpsl);
```

**TradingView Usage:**
- Draw entry price line
- Draw take profit line
- Draw stop loss line
- Draw order blocks (rectangles)
- Draw fair value gaps (rectangles)
- Draw Fibonacci OTE zones

**Note:** This step is optional and only for visualization. The bot functions completely without TradingView.

## Component Responsibilities

### bot.js (Main Strategy Engine)

**Responsibilities:**
- Fetch market data from Binance Futures
- Calculate technical indicators
- Perform ICT analysis
- Run safety checks
- Execute trades on Delta Exchange
- Log all decisions
- Manage positions
- Generate tax reports

**Does NOT:**
- Depend on Claude/AI for data
- Depend on TradingView for market data
- Require human intervention for normal operation

### binance-client.js (Market Data Provider)

**Responsibilities:**
- Fetch OHLCV candles from Binance Futures
- Get current price quotes
- Convert symbol formats (BTCUSD → BTCUSDT)
- Convert timeframe formats (4H → 4h)
- Test API connectivity

**API Endpoints Used:**
- `/fapi/v1/klines` - Historical candles
- `/fapi/v1/ticker/price` - Current price
- `/fapi/v1/ping` - Connection test

### visual-analysis.js (Drawing Preparation)

**Responsibilities:**
- Prepare drawing data structure
- Format entry/TP/SL for visualization
- Format order blocks for drawing
- Format FVGs for drawing
- Format Fibonacci levels for drawing

**Does NOT:**
- Fetch data from TradingView
- Execute MCP commands directly
- Affect trading decisions

### position-manager.js (Position Tracking)

**Responsibilities:**
- Track open positions
- Calculate unrealized P&L
- Detect TP/SL hits
- Close positions
- Persist position state

**Storage:** open-positions.json

### monitor.js (Position Monitoring)

**Responsibilities:**
- Continuously monitor open positions
- Check current price against TP/SL
- Send notifications on TP/SL hits
- Update position P&L

**Runs:** As a separate process (npm run monitor)

## Execution Modes

### 1. Manual Execution

```bash
node bot.js
```

**Behavior:**
- Fetches latest data from Binance
- Analyzes current market conditions
- Executes trade if conditions met
- Exits after one cycle

**Use Case:** Manual trading, testing, debugging

### 2. Scheduled Execution (Cron)

```bash
# Every 4 hours
0 */4 * * * cd /path/to/bot && node bot.js

# Every 15 minutes
*/15 * * * * cd /path/to/bot && node bot.js
```

**Behavior:**
- Runs at scheduled intervals
- Independent execution each time
- No state carried between runs (except positions)

**Use Case:** Automated trading, cloud deployment

### 3. Continuous Monitoring

```bash
npm run monitor
```

**Behavior:**
- Monitors open positions every 30 seconds
- Checks for TP/SL hits
- Sends notifications
- Does NOT open new trades

**Use Case:** Position management, risk monitoring

### 4. Dashboard Viewing

```bash
npm run dashboard
```

**Behavior:**
- Starts web server on port 3737
- Displays trade decisions
- Shows position status
- Real-time updates

**Use Case:** Monitoring, analysis, debugging

## Independence from Claude/AI

### Before Refactor

```javascript
// Bot waited for Claude to provide data
async function run(chartDataHTF, chartDataLTF) {
  const candlesHTF = await processChartData(chartDataHTF, "HTF");
  const candlesLTF = await processChartData(chartDataLTF, "LTF");
  // ...
}

// Entry point
console.log("⏳ Waiting for TradingView chart data from Claude...");
```

**Problems:**
- Bot couldn't run without Claude
- Required manual data passing
- Not suitable for automation
- Dependent on TradingView MCP

### After Refactor

```javascript
// Bot fetches its own data
async function run() {
  const candlesHTF = await fetchMarketData(symbol, "4H", 100);
  const candlesLTF = await fetchMarketData(symbol, "15m", 100);
  // ...
}

// Entry point
run().catch((error) => {
  console.error("Bot Error:", error.message);
  process.exit(1);
});
```

**Benefits:**
- Fully autonomous operation
- Can run on schedule
- No external dependencies for data
- Suitable for cloud deployment

## TradingView Usage (Limited)

### What TradingView IS Used For

1. **Symbol Discovery (Optional)**
   - Get list of available symbols
   - Search for trading pairs
   - Not required if symbol is in .env

2. **Post-Trade Visualization (Optional)**
   - Draw entry/TP/SL lines after trade execution
   - Draw order blocks and FVGs
   - Visual confirmation of trade setup
   - Requires Claude Code + TradingView MCP

### What TradingView IS NOT Used For

- ❌ Market data fetching
- ❌ OHLCV candles
- ❌ Price feeds
- ❌ Indicator calculations
- ❌ Technical analysis
- ❌ Signal generation
- ❌ Trade decisions
- ❌ Position monitoring

## Configuration

### Required Environment Variables

```bash
# Delta Exchange (Trade Execution)
DELTA_API_KEY=your_api_key
DELTA_API_SECRET=your_api_secret
DELTA_BASE_URL=https://api.india.delta.exchange

# Trading Configuration
SYMBOL=BTCUSD                    # Symbol to trade
TIMEFRAME_HTF=4H                 # Higher timeframe for trend
TIMEFRAME_LTF=15m                # Lower timeframe for entry
PORTFOLIO_VALUE_USD=1000         # Total account value
MAX_TRADE_SIZE_USD=100           # Max USD per trade
MAX_TRADES_PER_DAY=3             # Daily trade limit
LEVERAGE=5                       # Futures leverage
RISK_REWARD_RATIO=2              # Minimum RR ratio
PAPER_TRADING=true               # true = paper, false = live

# Position Monitoring
MONITOR_INTERVAL_SECONDS=30      # Position check interval
ENABLE_NOTIFICATIONS=true        # Console notifications
```

### Optional Environment Variables

```bash
# TradingView (Optional - only for visualization)
# No credentials needed - uses Claude Code MCP connection
```

## Error Handling

### Binance API Errors

```javascript
try {
  const candles = await fetchCandles(symbol, interval, limit);
} catch (error) {
  console.error("Failed to fetch Binance data:", error.message);
  // Bot exits gracefully
  process.exit(1);
}
```

**Common Errors:**
- Invalid symbol format
- Invalid interval
- Rate limit exceeded
- Network connectivity issues

### Delta Exchange Errors

```javascript
try {
  const order = await placeDeltaOrder(...);
} catch (error) {
  console.error("Trade execution failed:", error.message);
  // Logged to safety-check-log.json
  // Trade marked as failed in trades.csv
}
```

**Common Errors:**
- Insufficient balance
- Invalid leverage
- Market closed
- API authentication failure

## Deployment Options

### Local Execution

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run bot
node bot.js
```

### Cloud Deployment (Railway)

```bash
# Initialize Railway project
railway init

# Deploy
railway up

# Set environment variables in Railway dashboard
# Configure cron schedule (e.g., 0 */4 * * *)
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
CMD ["node", "bot.js"]
```

## Monitoring & Logging

### Trade Log (trades.csv)

```csv
Date,Time (UTC),Exchange,Symbol,Side,Quantity,Price,Total USD,Fee,Net Amount,Order ID,Mode,Notes
2026-05-30,14:30:00,Delta Exchange India,BTCUSD,BUY,0.002,50000,100,0.1,99.9,12345,LIVE,"All conditions met"
```

### Safety Check Log (safety-check-log.json)

```json
{
  "trades": [
    {
      "timestamp": "2026-05-30T14:30:00.000Z",
      "symbol": "BTCUSD",
      "price": 50000,
      "conditions": [...],
      "allPass": true,
      "orderPlaced": true
    }
  ]
}
```

### Position State (open-positions.json)

```json
{
  "positions": [
    {
      "id": "pos_abc123",
      "symbol": "BTCUSD",
      "side": "long",
      "entryPrice": 50000,
      "quantity": 0.002,
      "stopLoss": 49500,
      "takeProfit": 51000,
      "unrealizedPnL": 20.5,
      "status": "open"
    }
  ]
}
```

## Performance Considerations

### API Rate Limits

**Binance Futures:**
- 1200 requests/minute (weight-based)
- Each klines request = 1-5 weight
- Bot uses ~2 requests per run (HTF + LTF)
- Safe for execution every 1 minute

**Delta Exchange:**
- 100 requests/minute
- Bot uses 1 request per trade
- Safe for normal trading frequency

### Data Freshness

**Binance candles:**
- Real-time data (updated every second)
- No caching required for live trading
- Historical data available up to 1500 candles

**Position monitoring:**
- Default: 30-second intervals
- Configurable via MONITOR_INTERVAL_SECONDS
- Balance between responsiveness and API usage

## Security Best Practices

1. **Never commit .env file**
   - Contains API credentials
   - Use .env.example as template

2. **Delta Exchange API permissions**
   - Enable: Read + Trade only
   - Disable: Withdraw (never enable)

3. **Paper trading first**
   - Always test with PAPER_TRADING=true
   - Verify strategy before live trading

4. **API key rotation**
   - Rotate keys periodically
   - Use separate keys for testing/production

5. **Network security**
   - Use HTTPS for all API calls
   - Verify SSL certificates
   - Monitor for suspicious activity

## Troubleshooting

### Bot won't start

```bash
# Check Node.js version
node --version  # Should be >= 18.0.0

# Check dependencies
npm install

# Check .env file
cat .env  # Verify all required variables are set
```

### Binance connection fails

```bash
# Test connectivity
curl https://fapi.binance.com/fapi/v1/ping

# Check symbol format
# Use BTCUSDT not BTCUSD for Binance
```

### No trades executing

```bash
# Check safety-check-log.json
cat safety-check-log.json

# Review failed conditions
# Adjust strategy rules in rules.json if needed
```

### TradingView drawings not appearing

```bash
# TradingView drawings are optional
# Requires Claude Code + TradingView MCP
# Bot functions normally without drawings
```

## Future Enhancements

1. **Multiple exchange support**
   - Add Binance Futures execution
   - Add Bybit support
   - Unified exchange interface

2. **Advanced risk management**
   - Trailing stop loss
   - Partial profit taking
   - Dynamic position sizing

3. **Backtesting framework**
   - Historical data replay
   - Strategy optimization
   - Performance metrics

4. **Web dashboard**
   - Real-time position monitoring
   - Trade history visualization
   - Performance analytics

5. **Notification system**
   - Telegram alerts
   - Email notifications
   - SMS alerts for critical events
