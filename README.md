# Automated Trading Bot — ICT Strategy

Fully autonomous crypto trading bot that implements ICT (Inner Circle Trading) strategy using Binance Futures API for market data and Delta Exchange India for trade execution.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Delta Exchange credentials

# Run bot (paper trading mode by default)
node bot.js
```

## 📊 What This Does

**Five things you get from this setup:**

1. **Fully autonomous trading bot** — fetches data from Binance, analyzes ICT setups, executes trades on Delta Exchange
2. **Complete independence** — runs without Claude/AI assistance, suitable for manual or scheduled execution
3. **Strict safety checks** — 9-point ICT validation, every condition must pass before trade execution
4. **24/7 cloud execution** — deploy to Railway and it runs on a schedule, even when your laptop is closed
5. **Automatic tax accounting** — every trade logged to `trades.csv` with date, price, fees, and net amount

## 🎯 Architecture

**Data Flow:**
```
Binance Futures API → Bot Analysis → Delta Exchange → TradingView (optional visualization)
```

**Key Features:**
- ✅ Fully autonomous operation (no AI/Claude required)
- ✅ Multi-timeframe ICT analysis (HTF + LTF)
- ✅ Real-time data from Binance Futures API
- ✅ Automated trade execution on Delta Exchange
- ✅ Paper trading mode for testing
- ✅ Position monitoring with TP/SL tracking
- ✅ Tax-ready trade logging
- ✅ Optional TradingView visualization

## 📦 Installation

### Prerequisites

- Node.js >= 18.0.0
- Delta Exchange India account
- Internet connection (for Binance API)

### Setup

```bash
# Clone repository
git clone https://github.com/vaughanf1/claude-execute
cd claude-execute

# Install dependencies
npm install

# Configure environment
cp .env.example .env
```

### Environment Configuration

Edit `.env` with your credentials:

```bash
# Delta Exchange (required for live trading)
DELTA_API_KEY=your_api_key_here
DELTA_API_SECRET=your_api_secret_here

# Trading Configuration
PAPER_TRADING=true              # Start with paper trading
SYMBOL=BTCUSD                   # Trading pair
TIMEFRAME_HTF=4H                # Higher timeframe
TIMEFRAME_LTF=15m               # Lower timeframe
PORTFOLIO_VALUE_USD=1000        # Account value
MAX_TRADE_SIZE_USD=100          # Max per trade
MAX_TRADES_PER_DAY=3            # Daily limit
LEVERAGE=5                      # Futures leverage
RISK_REWARD_RATIO=2             # Minimum RR
```

**Getting your Delta Exchange India API key:**

Follow the complete step-by-step guide: [docs/exchanges/delta-india.md](docs/exchanges/delta-india.md)

**Security rules:**
- ✅ Enable **Read** and **Trade** permissions
- ❌ **NEVER enable Withdraw** permission
- ✅ Use IP whitelist when possible

## 🎮 Usage

### Run Bot Once

```bash
node bot.js
```

**What happens:**
1. Connects to Binance Futures API
2. Fetches HTF (4H) and LTF (15m) candles
3. Performs ICT analysis
4. Validates all safety conditions
5. Executes trade if conditions pass
6. Logs decision to files

### Monitor Positions

```bash
npm run monitor
```

**What it does:**
- Checks open positions every 30 seconds
- Monitors for TP/SL hits
- Sends notifications
- Updates P&L

### View Dashboard

```bash
npm run dashboard
```

Open http://localhost:3737 to view:
- Recent trade decisions
- Position status
- ICT analysis results
- Safety check details

**Want to see the dashboard populated before running the bot?** Seed it with demo data:

```bash
node dashboard/seed-demo.cjs        # 12 sample decisions (3 PASS, 9 BLOCK)
node dashboard/seed-demo.cjs reset  # remove demo data
```

### Generate Tax Report

```bash
node bot.js --tax-summary
```

## 🎯 ICT Strategy

The bot implements a complete ICT (Inner Circle Trading) strategy:

**Multi-Timeframe Analysis:**
- **HTF (4H):** Trend direction (BULLISH/BEARISH/NEUTRAL)
- **LTF (15m):** Precise entry timing

**ICT Concepts:**
- Order Blocks (OB) — Last opposing candle before strong move
- Fair Value Gaps (FVG) — Price imbalances where wicks don't overlap
- Fibonacci OTE Zone — 0.618-0.786 retracement (optimal trade entry)
- Kill Zones — London (07:00-10:00 GMT) and NY (13:00-16:00 GMT) sessions
- Break of Structure (BOS) — Continuation signal in trend direction
- Confirmation Patterns — Engulfing, hammer, shooting star, rejection wicks

**Safety Checks:**
- 9-point ICT validation
- Daily trade limits
- Position sizing (max 1% risk)
- Risk:Reward ratio enforcement

## 📊 Data Sources

### Binance Futures API (Primary)

**Used for:**
- Historical OHLCV candles
- Real-time price quotes
- Volume data
- All technical analysis

**Endpoints:**
- `/fapi/v1/klines` - Candle data
- `/fapi/v1/ticker/price` - Current price
- `/fapi/v1/ping` - Connection test

**Rate Limits:**
- 1200 requests/minute
- Bot uses ~2 requests per run
- Safe for 1-minute intervals

**Authentication:**
- None required for market data

### Delta Exchange India (Trade Execution)

**Used for:**
- Order placement
- Position management
- Account balance

**Authentication:**
- API Key + Secret (HMAC-SHA256)

**Permissions Required:**
- ✅ Read
- ✅ Trade
- ❌ Withdraw (never enable)

### TradingView (Optional Visualization)

**Used for:**
- Post-trade drawing only
- Entry/TP/SL visualization
- Order block markers
- FVG markers

**NOT used for:**
- Market data ❌
- Price feeds ❌
- Technical analysis ❌
- Trade decisions ❌

**How to use:**
- Bot runs independently
- Claude Code can draw on chart after trade
- Completely optional feature

## 🚀 Deployment

### Local Execution

```bash
# Run once
node bot.js

# Run on schedule (cron)
# Every 4 hours
0 */4 * * * cd /path/to/bot && node bot.js

# Every 15 minutes
*/15 * * * * cd /path/to/bot && node bot.js
```

### Cloud Deployment (Railway)

The bot runs in the cloud on a schedule using Binance API (no TradingView needed).

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and initialize
railway login
railway init

# Deploy
railway up
```

**Configure in Railway dashboard:**

1. Set all environment variables from `.env`
2. Add cron schedule:
   - 4H chart: `0 */4 * * *` (every 4 hours)
   - 1D chart: `0 9 * * *` (daily at 9am UTC)
   - 1H chart: `0 * * * *` (every hour)

3. Start with `PAPER_TRADING=true`

## 🔒 Safety Features

### Paper Trading Mode

**Always start with paper trading:**

```bash
PAPER_TRADING=true
```

**What it does:**
- Simulates all trades
- Logs to trades.csv with "PAPER" mode
- Tracks positions in memory
- No real money at risk

**Switch to live:**

```bash
PAPER_TRADING=false
```

### Risk Management

**Automatic enforcement:**
- Max 1% risk per trade
- Daily trade limit
- Position size limits
- Minimum risk:reward ratio

**Safety checks:**
- 9-point ICT validation
- Trend confirmation
- Kill zone timing
- Confluence requirements

### Trade Logging

**Every decision logged:**
- All ICT conditions (pass/fail)
- Exact failure reasons
- Trade parameters
- Timestamp and price

**Files:**
- `safety-check-log.json` - Detailed analysis
- `trades.csv` - Tax-ready format

## 📁 Data Files

### Auto-Generated

- `trades.csv` - Tax-ready trade log
- `safety-check-log.json` - All trade decisions with conditions
- `open-positions.json` - Active positions with TP/SL

### Configuration

- `.env` - Credentials and settings (gitignored)
- `rules.json` - ICT strategy rules

## 📈 Tax Accounting

Every trade is automatically written to `trades.csv` with the columns your accountant needs:

| Column | Description |
|--------|-------------|
| Date | ISO date of the trade |
| Time | UTC time |
| Exchange | Exchange name |
| Symbol | e.g. BTCUSD |
| Side | Buy / Sell |
| Quantity | Units traded |
| Price | Price per unit at execution |
| Total USD | Gross trade value |
| Fee (est.) | Estimated exchange fee |
| Net Amount | Total USD minus fee |
| Order ID | Exchange reference |
| Mode | Paper / Live |

At tax time: open the file, hand it to your accountant, or import it directly into your accounting software.

For a quick summary:

```bash
node bot.js --tax-summary
```

## 🛠️ Configuration

### Trading Pairs

The bot uses Delta format (`BTCUSD`) which is automatically converted to Binance format (`BTCUSDT`).

Supported pairs:
- BTCUSD → BTCUSDT
- ETHUSD → ETHUSDT
- Any USD pair → USDT equivalent

### Timeframes

Supported timeframes:
- Minutes: `1m`, `3m`, `5m`, `15m`, `30m`
- Hours: `1H`, `2H`, `4H`, `6H`, `8H`, `12H`
- Days: `1D`, `3D`
- Weeks: `1W`
- Months: `1M`

### Strategy Rules

Edit `rules.json` to customize:
- Entry conditions
- Exit conditions
- Risk parameters
- ICT concept weights

## 🐛 Troubleshooting

### Bot won't start

```bash
# Check Node version
node --version  # Should be >= 18.0.0

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check .env file
cat .env  # Verify all variables are set
```

### Binance connection fails

```bash
# Test connectivity
curl https://fapi.binance.com/fapi/v1/ping

# Check symbol format
# Bot uses: BTCUSD
# Binance uses: BTCUSDT
# Conversion is automatic
```

### No trades executing

```bash
# Check safety log
cat safety-check-log.json

# Review failed conditions
# Most common: not in kill zone, no OTE, missing confluence

# Adjust rules if needed
nano rules.json
```

### Delta Exchange errors

```bash
# Verify API credentials
# Check permissions: Read + Trade only
# Never enable Withdraw

# Test in paper mode first
PAPER_TRADING=true node bot.js
```

## 📚 Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design and data flow
- [CLAUDE.md](CLAUDE.md) - Development guide for Claude Code
- [Delta Exchange Setup](docs/exchanges/delta-india.md) - Exchange configuration

## 🛠️ Development

### Project Structure

```
.
├── bot.js                  # Main strategy engine
├── binance-client.js       # Binance API client
├── position-manager.js     # Position tracking
├── monitor.js              # Position monitoring
├── visual-analysis.js      # Drawing preparation
├── rules.json              # Strategy rules
├── .env                    # Configuration (gitignored)
├── trades.csv              # Trade log
├── safety-check-log.json   # Decision log
├── open-positions.json     # Active positions
└── docs/
    ├── ARCHITECTURE.md     # System architecture
    └── exchanges/          # Exchange guides
```

### Adding Indicators

```javascript
// 1. Add calculation function
function calcNewIndicator(candles, period) {
  // Your calculation
  return value;
}

// 2. Call in performICTAnalysis()
const newIndicator = calcNewIndicator(candlesHTF, 20);

// 3. Add to return object
return {
  ...ictAnalysis,
  newIndicator,
};

// 4. Use in runICTSafetyCheck()
check("New Indicator", "expected", actual, pass);
```

### Testing

```javascript
import { calcEMA, performICTAnalysis } from './bot.js';

// Mock data
const candles = [
  { time: 1234567890, open: 50000, high: 51000, low: 49000, close: 50500, volume: 100 },
  // ...
];

// Test indicator
const ema = calcEMA(candles.map(c => c.close), 8);
console.log('EMA:', ema);

// Test analysis
const analysis = performICTAnalysis(candles, candles);
console.log('Trend:', analysis.htfTrend);
```

## ⚠️ Important Notes

- **Start with paper trading** - Test thoroughly before live trading
- **Never commit .env** - Contains API credentials
- **Monitor positions** - Run monitor when trades are open
- **Check logs** - Review safety-check-log.json for blocked trades
- **Delta API** - Never enable Withdraw permission
- **Binance API** - No auth required for market data
- **Bot is autonomous** - Runs without Claude/AI assistance
- **TradingView optional** - Only for visualization, not required

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Test thoroughly in paper mode
4. Submit a pull request

## ⚡ Quick Reference

```bash
# Run bot
node bot.js

# Monitor positions
npm run monitor

# View dashboard
npm run dashboard

# Tax report
node bot.js --tax-summary

# Test Binance connection
node -e "import('./binance-client.js').then(m => m.testConnection().then(r => console.log('Connected:', r)))"
```

## 🎯 Next Steps

1. Configure `.env` with your credentials
2. Run in paper mode: `node bot.js`
3. Review `safety-check-log.json` to understand decisions
4. Monitor positions: `npm run monitor`
5. When confident, switch to live: `PAPER_TRADING=false`

---

**Need help?** Check the [Architecture docs](docs/ARCHITECTURE.md) or review the [CLAUDE.md](CLAUDE.md) guide.

**This is not financial advice.** Build your strategy properly. Run backtests. Paper trade before going live. Never risk more than you can afford to lose.
