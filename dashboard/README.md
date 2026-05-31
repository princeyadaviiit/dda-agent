# CLAUDE EXECUTE :: DASHBOARD

Real-time monitoring dashboard for the Claude Trading Bot with ICT strategy analysis.

## 🚀 Quick Start

```bash
# Start the dashboard server
npm run dashboard

# Open in browser
http://localhost:3000
```

The dashboard auto-refreshes every 5 seconds to show live trading data.

## 📊 Dashboard Features

### **Stats Strip 1: Trading Activity**
- **Total Decisions** - All trading decisions made by the bot
- **Trades Taken** - Number of orders actually placed
- **Blocked** - Trades blocked by safety checks
- **Today** - Today's trades vs daily limit
- **Total Volume** - Cumulative USD volume executed
- **Est. Fees** - Estimated trading fees paid

### **Stats Strip 2: Position Performance** ⭐ NEW
- **Open Positions** - Number of currently active trades
- **Total P&L** - Realized profit/loss from closed positions
- **Win Rate** - Percentage of winning trades
- **Avg Leverage** - Average leverage used across positions
- **Avg R:R** - Average risk:reward ratio
- **Monitor Status** - Position monitoring status (ACTIVE/IDLE)

### **Panel: Open Positions** ⭐ NEW
Shows all currently active positions with:
- Side (LONG/SHORT)
- Symbol
- Entry price
- Leverage
- Unrealized P&L (USD)
- Unrealized P&L (%)
- Take Profit level
- Stop Loss level

Real-time P&L updates with color coding:
- 🟢 Green = Profitable
- 🔴 Red = Loss

### **Panel: Executed Trades**
Complete history of all executed trades:
- Timestamp
- Symbol
- Side (BUY/SELL)
- Price
- Size (USD)
- Mode (PAPER/LIVE)
- Order ID

Click any trade to see full details in the Decision Detail panel.

### **Panel: Decision Feed**
Real-time feed of all trading decisions with filters:
- **ALL** - Show all decisions
- **PASS** - Only show trades that passed safety checks
- **BLOCK** - Only show blocked trades

Each decision shows:
- Time
- Result (PASS/BLOCK)
- Price
- Summary of conditions

### **Panel: ICT Analysis** ⭐ NEW
Latest ICT (Inner Circle Trader) strategy analysis:
- **HTF Trend** - Higher timeframe trend direction (BULLISH/BEARISH/NEUTRAL)
- **In OTE Zone** - Whether price is in Optimal Trade Entry zone (0.618-0.786 Fib)
- **Order Blocks** - Number of identified order blocks
- **Fair Value Gaps** - Number of identified FVGs
- **Kill Zone** - Current trading session (London/New York/None)
- **Confirmation** - Candlestick confirmation pattern
- **Break of Structure** - Whether BOS is confirmed

Color coding:
- 🟢 Green = Bullish trend
- 🔴 Red = Bearish trend
- ⚪ Gray = Neutral

### **Panel: Decision Detail**
Detailed breakdown of selected decision:
- All safety check conditions with pass/fail status
- Indicator values (Price, EMA, VWAP, RSI)
- Decision result and order details
- Trade limits and usage
- Error messages (if any)

## 🎨 Visual Design

The dashboard features a **Matrix-inspired terminal aesthetic**:
- 🟢 Neon green monospace font (JetBrains Mono)
- Animated matrix rain background
- CRT scanline effect
- Real-time UTC clock
- Glowing status indicators

## 🔌 API Endpoints

The dashboard server provides these endpoints:

- `GET /` - Dashboard HTML
- `GET /api/log` - Trade decision log
- `GET /api/env` - Bot configuration (safe subset)
- `GET /api/csv` - CSV trade history
- `GET /api/rules` - ICT strategy rules
- `GET /api/positions` - Open positions data ⭐ NEW

## 📁 Data Sources

The dashboard reads from these files:
- `safety-check-log.json` - All trading decisions
- `open-positions.json` - Active positions ⭐ NEW
- `trades.csv` - Trade history for tax reporting
- `rules.json` - ICT strategy configuration
- `.env` - Bot configuration (secrets excluded)

## 🔄 Auto-Refresh

The dashboard automatically refreshes every 5 seconds to show:
- New trading decisions
- Updated position P&L
- Latest ICT analysis
- Real-time price data

## 🎯 Use Cases

### Monitor Live Trading
- Watch open positions in real-time
- Track P&L as it changes
- See when TP/SL levels are hit

### Analyze Strategy Performance
- Review win rate and R:R ratios
- Identify which ICT conditions are most effective
- Track blocked trades to tune safety checks

### Tax Reporting
- Export trades.csv for accounting
- View total volume and fees
- Track all executed orders

### Strategy Development
- See which ICT conditions trigger most often
- Analyze correlation between conditions and outcomes
- Identify optimal entry zones

## 🛠️ Configuration

Set these environment variables in `.env`:

```bash
# Dashboard server port (optional)
DASHBOARD_PORT=3000

# Bot configuration (affects dashboard display)
PAPER_TRADING=true
MAX_TRADES_PER_DAY=3
LEVERAGE=5
RISK_REWARD_RATIO=2
```

## 🚨 Troubleshooting

**Dashboard shows "DISCONNECTED"**
- Check that data files exist (safety-check-log.json, etc.)
- Ensure the bot has run at least once to create log files

**No open positions showing**
- Positions only appear after trades are executed
- Check that open-positions.json exists and contains data

**ICT Analysis shows "NO ANALYSIS DATA YET"**
- Run the bot at least once to generate ICT analysis
- Ensure ictAnalysis is being logged in safety-check-log.json

**Stats show $0 / 0 values**
- This is normal before any trades are executed
- Run the bot to generate trading activity

## 📝 Notes

- The dashboard is **read-only** - it displays data but doesn't execute trades
- All times are displayed in **UTC**
- P&L calculations include leverage multiplier
- Paper trading positions are tracked separately from live trades
- The dashboard works with both paper and live trading modes

## 🔐 Security

The dashboard server:
- ✅ Only exposes safe configuration (no API keys)
- ✅ Runs on localhost by default
- ✅ Provides read-only access to trading data
- ⚠️ Do not expose to public internet without authentication

## 📊 Performance Metrics Explained

### Win Rate
```
Win Rate = (Winning Trades / Total Closed Trades) × 100%
```

### Risk:Reward Ratio
```
R:R = (Take Profit Distance) / (Stop Loss Distance)
```
Example: 1:2 means you risk $1 to make $2

### Unrealized P&L
```
Long:  (Current Price - Entry Price) × Quantity × Leverage
Short: (Entry Price - Current Price) × Quantity × Leverage
```

### Realized P&L
Final profit/loss when position is closed at TP, SL, or manually.

---

**Built with:** Node.js, Vanilla JavaScript, Matrix-inspired CSS

**Compatible with:** Chrome, Firefox, Safari, Edge (modern browsers)

**License:** MIT
