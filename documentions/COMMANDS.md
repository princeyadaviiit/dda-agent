# Bot Commands Reference

Complete guide to all commands you can run manually to interact with the trading bot.

---

## Core Trading Commands

### Run the Bot (Manual Execution)

```bash
node bot.js
```

**What it does:**
- Waits for Claude Code to provide TradingView chart data
- Processes HTF and LTF candle data with caching optimization
- Runs ICT strategy analysis (9 conditions)
- Executes trade if **majority of conditions pass** (>50%)
- Logs decision to `safety-check-log.json`
- Records trade to `trades.csv`
- Tracks position in `open-positions.json`

**Expected Output:**
```
═══════════════════════════════════════════════════════════
  Claude Trading Bot — ICT Strategy
  2026-05-30T12:00:00.000Z
  Mode: 📋 PAPER TRADING
═══════════════════════════════════════════════════════════

✅ Using symbol from TradingView: BTCUSD
Strategy: ICT Inner Circle Trading with Fibonacci Retracement
Symbol: BTCUSD | HTF: 4H | LTF: 15m

── Trade Limits ─────────────────────────────────────────
✅ Trades today: 0/3 — within limit
✅ Trade size: $100.00 — within max $100.00

── Fetching market data (Multi-Timeframe ICT Analysis) ──
  📊 Higher Timeframe (4H) - Trend Direction
  💾 Cached 100 HTF candles to temp-htf.json
     Loaded 100 candles

  📊 Lower Timeframe (15m) - Entry Timing
  📊 Found 5 new candle(s) - updating cache
  🔄 Removed 5 oldest candle(s) to maintain 100-candle window
  💾 Cached 100 LTF candles to temp-ltf.json
     Loaded 100 candles

── Running ICT Analysis ──────────────────────────────────
  HTF Trend: BULLISH
  Current Price: $67,234.50
  In OTE Zone: YES
  Order Blocks: 2
  Fair Value Gaps: 1
  Kill Zone: New York
  Confirmation: Bullish Engulfing
  Break of Structure: YES

── ICT Strategy Safety Check (Full Rules) ──────────────
Strategy: ICT Inner Circle Trading with Fibonacci Retracement

  ✅ HTF Trend Direction
     Required: Clear bullish or bearish trend | Actual: BULLISH
  ✅ Break of Structure (BOS)
     Required: BOS in trend direction | Actual: Confirmed
  ✅ Fibonacci OTE Zone
     Required: Price in 0.618-0.786 retracement | Actual: In OTE (67100.00 - 67300.00)
  ✅ Order Block
     Required: Order block present in setup area | Actual: 2 found
  ✅ Fair Value Gap (FVG)
     Required: FVG present for confluence | Actual: 1 found
  🚫 Kill Zone
     Required: London (07:00-10:00 GMT) or NY (13:00-16:00 GMT) | Actual: None
  ✅ Confirmation Pattern
     Required: Bullish engulfing/hammer/rejection | Actual: Bullish Engulfing
  ✅ Timeframe Alignment
     Required: LTF bias matches HTF BULLISH | Actual: Aligned
  ✅ Confluence
     Required: OTE + Order Block + FVG | Actual: All 3 present

── Trade Decision ────────────────────────────────────────
   Conditions Passed: 8/9 (88.9%)
   Threshold: Majority (>50%) required

✅ MAJORITY CONDITIONS MET — TRADE APPROVED

Setup Type: LONG
Entry Zone: 67100.00 - 67300.00
Stop Loss: Below order block with 2-5 pip buffer
Take Profit: Minimum 1:2 RR, target 1:3 RR

⚠️  Note: 1 condition(s) failed but trade approved by majority:
   • Kill Zone

📊 Trade Setup:
   Direction: LONG
   Entry: $67,234.50
   Stop Loss: $67,050.00 (Risk: $184.50)
   Take Profit: $67,603.50 (Reward: $369.00)
   Risk:Reward = 1:2.00
   Leverage: 5x

📋 PAPER TRADE: Would execute BUY at $67,234.50

✅ Position added: pos_1748612345678_abc123def
   LONG BTCUSD @ $67,234.50
   Leverage: 5x | Quantity: 0.0074
   TP: $67,603.50 | SL: $67,050.00
   Risk:Reward = 1:2

Tax record saved → trades.csv
```

---

### Alternative: Using npm scripts

```bash
npm start
# Same as: node bot.js

npm run dev
# Same as: node bot.js
```

---

## Tax & Reporting Commands

### Generate Tax Summary

```bash
node bot.js --tax-summary
```

**What it does:**
- Reads `trades.csv`
- Calculates total volume, fees, win rate
- Shows live vs paper vs blocked trades

**Expected Output:**
```
── Tax Summary ──────────────────────────────────────────

  Total decisions logged : 47
  Live trades executed   : 12
  Paper trades           : 28
  Blocked by safety check: 7
  Total volume (USD)     : $1,245.67
  Total fees paid (est.) : $1.2457

  Full record: D:\claude\claude-execute\trades.csv
─────────────────────────────────────────────────────────
```

---

## Dashboard Commands

### Start Terminal Dashboard

```bash
npm run dashboard
```

**What it does:**
- Starts web server on `http://localhost:3737`
- Reads `safety-check-log.json` and `trades.csv`
- Shows all trade decisions with pass/fail conditions
- Auto-refreshes every 5 seconds

**Expected Output:**
```
Dashboard server running at http://localhost:3737
Press Ctrl+C to stop
```

**Open in browser:** http://localhost:3737

**Dashboard Features:**
- Stats strip (total decisions, trades taken, blocked, volume, fees)
- Executed trades table (timestamp, symbol, side, price, mode, order ID)
- Decision feed (all safety checks, color-coded PASS/BLOCK)
- Decision detail modal (click any row to see all 9 conditions)

---

### Seed Demo Data (For Testing Dashboard)

```bash
node dashboard/seed-demo.cjs
```

**What it does:**
- Generates 12 sample trade decisions (3 PASS, 9 BLOCK)
- Writes to `safety-check-log.json` and `trades.csv`
- Useful for previewing dashboard before real trades

**Expected Output:**
```
✅ Demo data seeded successfully!
   - 12 decisions added to safety-check-log.json
   - 3 paper trades added to trades.csv
   
   Run: npm run dashboard
   Then open: http://localhost:3737
```

---

### Remove Demo Data

```bash
node dashboard/seed-demo.cjs reset
```

**What it does:**
- Clears demo data from `safety-check-log.json` and `trades.csv`
- Keeps real trade data intact

**Expected Output:**
```
✅ Demo data removed successfully!
```

---

## Position Monitoring Commands

### Start Continuous Position Monitor

```bash
npm run monitor
```

**What it does:**
- Checks open positions every 30 seconds (configurable via `MONITOR_INTERVAL_SECONDS` in `.env`)
- Fetches current price from TradingView via Claude Code
- Calculates unrealized P&L
- Detects TP/SL hits
- Closes positions automatically when TP or SL is hit
- Sends console notifications

**Expected Output:**
```
═══════════════════════════════════════════════════════════
  Position Monitor Started
  Interval: 30s
  Notifications: ON
═══════════════════════════════════════════════════════════

📊 Monitoring 2 open position(s)...

   Current Price: $67,450.00

   💚 LONG BTCUSD
      Entry: $67,234.50 | Current: $67,450.00
      P&L: $107.75 (1.61%)
      TP: $67,603.50 | SL: $67,050.00
      ⏳ Position still open

   ❤️ SHORT ETHUSD
      Entry: $3,245.00 | Current: $3,260.00
      P&L: -$22.50 (-0.46%)
      TP: $3,200.00 | SL: $3,280.00
      ⏳ Position still open

[30 seconds later...]

📊 Monitoring 2 open position(s)...

   Current Price: $67,610.00

   💚 LONG BTCUSD
      Entry: $67,234.50 | Current: $67,610.00
      P&L: $187.75 (2.79%)
      TP: $67,603.50 | SL: $67,050.00
      🎯 TAKE PROFIT HIT!

═══════════════════════════════════════════════════════════
🔔 NOTIFICATION
═══════════════════════════════════════════════════════════
🎯 TAKE PROFIT HIT!

Position: LONG BTCUSD
Entry: $67,234.50
Exit: $67,610.00
Profit: $187.75 (2.79%)
Leverage: 5x
Risk:Reward: 1:2.0
═══════════════════════════════════════════════════════════

✅ Closed 1 position(s) this cycle.

═══════════════════════════════════════════════════════════
  Position Summary
═══════════════════════════════════════════════════════════
  Total Positions: 2
  Open: 1 | Closed: 1
  Win Rate: 100.0% (1W / 0L)
  Total P&L: $187.75
═══════════════════════════════════════════════════════════

Open Positions:
  • SHORT ETHUSD @ $3,245.00
    TP: $3,200.00 | SL: $3,280.00
    Unrealized P&L: -$22.50 (-0.46%)
```

**Stop monitoring:** Press `Ctrl+C`

---

## TradingView MCP Commands

These commands are used by Claude Code to interact with TradingView Desktop. You can also run them manually via Claude Code.

### Launch TradingView with MCP

```bash
tv_launch
```

**What it does:**
- Launches TradingView Desktop with Chrome DevTools Protocol enabled
- Enables remote debugging on port 9222
- Required before bot can read chart data

---

### Check TradingView Connection

```bash
tv_health_check
```

**What it does:**
- Verifies CDP connection to TradingView
- Returns current chart state (symbol, timeframe, indicators)

**Expected Output:**
```json
{
  "cdp_connected": true,
  "symbol": "BTCUSD",
  "timeframe": "4H",
  "chart_type": "Candles",
  "indicators": ["EMA(8)", "RSI(14)", "VWAP"]
}
```

---

### Get Chart Data (via Claude Code)

Claude Code uses these MCP tools internally:

```javascript
// Get current chart state
chart_get_state

// Get OHLCV bars (with summary for token optimization)
data_get_ohlcv({ count: 100, summary: true })

// Get current indicator values
data_get_study_values

// Get real-time price
quote_get
```

---

## File Inspection Commands

### View Safety Check Log

```bash
cat safety-check-log.json
# Windows PowerShell:
Get-Content safety-check-log.json
```

**What it shows:**
- Every trade decision with timestamp
- All 9 ICT condition results (pass/fail)
- Actual values for each condition
- Whether trade was executed or blocked
- Majority pass percentage

---

### View Trade History

```bash
cat trades.csv
# Windows PowerShell:
Get-Content trades.csv
```

**What it shows:**
- Date, Time, Exchange, Symbol, Side
- Quantity, Price, Total USD
- Fee (estimated), Net Amount
- Order ID, Mode (PAPER/LIVE/BLOCKED)
- Notes (which conditions failed)

---

### View Open Positions

```bash
cat open-positions.json
# Windows PowerShell:
Get-Content open-positions.json
```

**What it shows:**
- All open positions with entry price, TP, SL
- Unrealized P&L
- Leverage, quantity, risk:reward ratio
- ICT analysis snapshot (HTF trend, OTE, order blocks, etc.)

---

### View Cached Candle Data

```bash
cat temp-htf.json
cat temp-ltf.json

# Windows PowerShell:
Get-Content temp-htf.json
Get-Content temp-ltf.json
```

**What it shows:**
- Cached candle data (100-candle sliding window)
- Last update timestamp
- Symbol and timeframe
- All OHLCV data

---

## Configuration Commands

### Edit Environment Variables

```bash
# Mac/Linux:
nano .env

# Windows:
notepad .env
```

**Key variables to configure:**
- `PAPER_TRADING` - Set to `false` for live trading
- `MAX_TRADES_PER_DAY` - Daily trade limit
- `MAX_TRADE_SIZE_USD` - Maximum USD per trade
- `LEVERAGE` - Futures leverage (default: 5)
- `RISK_REWARD_RATIO` - Minimum RR (default: 2)
- `ALLOW_LONG` / `ALLOW_SHORT` - Enable/disable trade directions

---

### Edit Strategy Rules

```bash
# Mac/Linux:
nano rules.json

# Windows:
notepad rules.json
```

**What you can modify:**
- ICT entry conditions
- Risk management rules
- Kill zone timing
- Fibonacci levels
- Order block detection logic

---

## Testing Commands

### Test Indicator Calculations (Manual)

Create a test file `test-indicators.js`:

```javascript
import { calcEMA, calcRSI, calcVWAP } from './bot.js';

const mockCandles = [
  { time: 1748600000000, open: 67000, high: 67500, low: 66800, close: 67200, volume: 1000 },
  { time: 1748614400000, open: 67200, high: 67800, low: 67100, close: 67600, volume: 1200 },
  // ... add more candles
];

const closes = mockCandles.map(c => c.close);
const ema8 = calcEMA(closes, 8);
const rsi14 = calcRSI(closes, 14);
const vwap = calcVWAP(mockCandles);

console.log('EMA(8):', ema8);
console.log('RSI(14):', rsi14);
console.log('VWAP:', vwap);
```

Run:
```bash
node test-indicators.js
```

---

## Deployment Commands (Railway)

### Deploy to Railway

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Set Environment Variables in Railway

Go to Railway dashboard → Your Project → Variables

Add all variables from `.env`:
- `DELTA_API_KEY`
- `DELTA_API_SECRET`
- `DELTA_BASE_URL`
- `PORTFOLIO_VALUE_USD`
- `MAX_TRADE_SIZE_USD`
- `MAX_TRADES_PER_DAY`
- `PAPER_TRADING`
- `SYMBOL`
- `TIMEFRAME_HTF`
- `TIMEFRAME_LTF`
- `LEVERAGE`
- `RISK_REWARD_RATIO`

### Set Cron Schedule in Railway

Settings → Cron Schedule:
- 4H chart: `0 */4 * * *` (every 4 hours)
- 1D chart: `0 9 * * *` (daily at 9am UTC)
- 1H chart: `0 * * * *` (every hour)

---

## Troubleshooting Commands

### Check Node.js Version

```bash
node --version
```

Should be `v18.0.0` or higher.

---

### Check if TradingView is Running

```bash
# Mac/Linux:
ps aux | grep TradingView

# Windows PowerShell:
Get-Process | Where-Object {$_.ProcessName -like "*TradingView*"}
```

---

### Clear Cache Files

```bash
rm temp-htf.json temp-ltf.json

# Windows PowerShell:
Remove-Item temp-htf.json, temp-ltf.json
```

**When to use:** If you want to force a full re-fetch of candle data.

---

### Reset All Data (Fresh Start)

```bash
rm safety-check-log.json trades.csv open-positions.json temp-htf.json temp-ltf.json

# Windows PowerShell:
Remove-Item safety-check-log.json, trades.csv, open-positions.json, temp-htf.json, temp-ltf.json
```

**Warning:** This deletes all trade history and position data. Use only for testing.

---

## Summary of Key Commands

| Command | Purpose | Output Location |
|---------|---------|-----------------|
| `node bot.js` | Execute trading bot | `safety-check-log.json`, `trades.csv`, `open-positions.json` |
| `node bot.js --tax-summary` | Generate tax report | Console output |
| `npm run dashboard` | Start web dashboard | http://localhost:3737 |
| `npm run monitor` | Monitor open positions | Console output + position updates |
| `node dashboard/seed-demo.cjs` | Add demo data | `safety-check-log.json`, `trades.csv` |
| `node dashboard/seed-demo.cjs reset` | Remove demo data | Clears demo entries |
| `tv_launch` | Start TradingView with MCP | TradingView Desktop |
| `tv_health_check` | Check MCP connection | Console JSON output |

---

## Important Notes

- **Always start in paper trading mode** (`PAPER_TRADING=true`)
- **Monitor positions** when trades are open (`npm run monitor`)
- **Check logs** regularly (`safety-check-log.json`)
- **Majority pass logic**: Trade executes if >50% of conditions pass
- **Candle caching**: Only new candles are fetched, old data is reused
- **100-candle window**: Sliding window maintains exactly 100 candles
- **Tax records**: `trades.csv` is auto-generated for accounting
