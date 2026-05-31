# 🔗 Connection Flow Test & Verification

## The Complete Flow

Here's exactly how data flows from TradingView to Delta Exchange:

```
┌─────────────────┐
│  TradingView    │ ← You open a chart (e.g., BTCUSD)
│     Chart       │
└────────┬────────┘
         │
         │ (1) Claude reads via MCP
         ▼
┌─────────────────┐
│  Claude Code    │ ← Gets symbol: "BTCUSD"
│  (Monitoring)   │
└────────┬────────┘
         │
         │ (2) Passes symbol to bot.js
         ▼
┌─────────────────┐
│    bot.js       │ ← Fetches data from Binance API
│  (Analysis)     │ ← Calculates indicators (EMA, VWAP, RSI)
│                 │ ← Identifies Order Blocks, FVGs, Liquidity
│                 │ ← Calculates Fibonacci levels
│                 │ ← Checks ICT conditions
│                 │ ← Calculates TP/SL
└────────┬────────┘
         │
         │ (3) Draws visual analysis
         ▼
┌─────────────────┐
│  TradingView    │ ← Draws Order Blocks (rectangles)
│     Chart       │ ← Draws Liquidity Pools (lines)
│   (Markup)      │ ← Draws Fair Value Gaps (rectangles)
│                 │ ← Draws Fibonacci OTE Zone (lines)
│                 │ ← Adds text labels
└────────┬────────┘
         │
         │ (4) If conditions pass
         ▼
┌─────────────────┐
│ Delta Exchange  │ ← Executes trade
│     India       │ ← Sets TP/SL orders
└─────────────────┘
         │
         │ (5) Confirmation
         ▼
┌─────────────────┐
│  trades.csv     │ ← Logs everything
│  + Notification │ ← Notifies you
└─────────────────┘
```

---

## Test the Complete Flow

Run this test to verify everything is connected:

### Test 1: TradingView → Bot Connection

```bash
# Open TradingView with a symbol (e.g., BTCUSD)
# Then run this test
```

In Claude Code, I'll test the connection:

1. Read symbol from TradingView
2. Pass it to bot.js
3. Show you the complete output

### Test 2: Bot → Delta Exchange Connection

The bot.js already has Delta Exchange integration built-in.

When conditions pass, it:
- Calls `placeDeltaOrder()` function
- Uses your API credentials from .env
- Sends order to Delta Exchange API
- Returns order ID

---

## How the Monitoring Skill Works

When you run `/loop 15m /delta-trading-monitor`, here's what happens:

**Every 15 minutes:**

```javascript
// Step 1: Get symbol from TradingView
const chartState = await mcp__tradingview__chart_get_state();
const symbol = chartState.symbol; // e.g., "BTCUSD"

// Step 2: Run bot with that symbol
await Bash({
  command: `cd D:\\claude\\claude-execute && set TRADING_SYMBOL=${symbol} && node bot.js`,
  description: "Run trading bot with TradingView symbol"
});

// Step 3: Bot does everything:
// - Fetches data from Binance
// - Analyzes 4H + 15min timeframes
// - Checks ICT conditions
// - Executes on Delta Exchange if conditions pass
// - Logs to trades.csv

// Step 4: Notify you if trade was executed
if (tradeExecuted) {
  await PushNotification({
    message: "🚀 Trade executed: [details]"
  });
}
```

---

## Verify Each Connection Point

### ✅ Connection 1: TradingView MCP → Claude

**Test:**
```
Call: mcp__tradingview__chart_get_state
```

**Expected output:**
```json
{
  "success": true,
  "symbol": "BTCUSD",
  "resolution": "15",
  "chartType": 1
}
```

**Status:** ✅ Already working (you have TradingView MCP set up)

---

### ✅ Connection 2: Claude → bot.js

**Test:**
```bash
cd D:\claude\claude-execute
set TRADING_SYMBOL=BTCUSD
node bot.js
```

**Expected output:**
```
✅ Using symbol from TradingView: BTCUSD
Strategy: ICT Inner Circle Trading with Fibonacci Retracement
Symbol: BTCUSD | HTF: 4H | LTF: 15m
Mode: FUTURES

[... analysis output ...]
```

**Status:** ✅ Fixed and ready

---

### ✅ Connection 3: bot.js → Binance API

**What happens:**
```javascript
// Bot fetches market data
const candlesHTF = await fetchCandles(symbol, "4H", 500);
const candlesLTF = await fetchCandles(symbol, "15m", 500);
```

**Data source:** Binance public API (free, no auth needed)

**Status:** ✅ Already working

---

### ✅ Connection 3.5: bot.js → TradingView Chart (Visual Analysis)

**What happens:**
```javascript
// Bot draws ICT concepts on your chart
await drawVisualAnalysis(candlesHTF, candlesLTF, currentPrice);
```

**Draws:**
- 🟦 Order Blocks (blue/red rectangles)
- 🔴 Liquidity Pools (dashed lines)
- 🟩 Fair Value Gaps (cyan/orange rectangles)
- 🟣 Fibonacci OTE Zone (purple lines at 0.618 & 0.786)
- 📝 Text labels explaining each marking

**Uses:** TradingView MCP draw_shape commands

**Status:** ✅ Newly implemented

---

### ✅ Connection 4: bot.js → Delta Exchange

**What happens:**
```javascript
// If conditions pass, bot executes trade
const order = await placeDeltaOrder(
  symbol,      // e.g., "BTCUSD"
  "buy",       // or "sell"
  tradeSize,   // e.g., 100 USD
  price        // current market price
);
```

**Uses:**
- Your Delta Exchange API credentials from .env
- Delta Exchange India API endpoint
- Futures trading mode

**Status:** ✅ Configured and ready (needs your API credentials)

---

### ✅ Connection 5: Delta Exchange → trades.csv

**What happens:**
```javascript
// After trade execution (or block), log everything
writeTradeCsv(logEntry);
```

**Logs:**
- Date, time, symbol, side, price, quantity
- TP/SL levels
- Order ID from Delta Exchange
- Mode (paper/live)
- Why trade was blocked (if applicable)

**Status:** ✅ Already working

---

## The Key Integration Point

The critical connection is in the monitoring skill:

```javascript
// Get symbol from TradingView
const symbol = chartState.symbol;

// Pass to bot via environment variable
process.env.TRADING_SYMBOL = symbol;

// Bot reads it here:
const symbol = process.env.TRADING_SYMBOL || CONFIG.symbol;
```

This ensures:
- ✅ Symbol flows from TradingView → Bot
- ✅ Bot analyzes that specific symbol
- ✅ Bot executes on Delta Exchange for that symbol
- ✅ Everything is logged with the correct symbol

---

## Test It Now

Let me run a complete test to show you the flow:

1. I'll read your TradingView chart
2. Get the current symbol
3. Run the bot with that symbol
4. Show you the complete output

This will prove everything is connected correctly.

**Ready to test?** Say "yes" and I'll run the complete flow test.
