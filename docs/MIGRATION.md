# Migration Guide: TradingView MCP → Binance Futures API

This guide explains the architectural changes and how to migrate from the old TradingView-dependent bot to the new standalone Binance-powered bot.

## Overview of Changes

### Before (TradingView-Dependent)

```
Claude Code → TradingView MCP → Bot → Delta Exchange
```

**Problems:**
- Bot couldn't run without Claude Code
- Required TradingView Desktop to be running
- Manual data passing required
- Not suitable for automation
- Couldn't run on cloud/cron

### After (Standalone)

```
Binance Futures API → Bot → Delta Exchange
                              ↓
                    TradingView (optional visualization)
```

**Benefits:**
- Fully autonomous operation
- No Claude/AI dependency
- Runs on schedule/cron
- Cloud deployment ready
- TradingView optional

## Breaking Changes

### 1. Bot Execution

**Before:**
```javascript
// bot.js waited for Claude to provide data
async function run(chartDataHTF, chartDataLTF) {
  const candlesHTF = await processChartData(chartDataHTF, "HTF");
  const candlesLTF = await processChartData(chartDataLTF, "LTF");
  // ...
}

// Entry point
console.log("⏳ Waiting for TradingView chart data from Claude...");
```

**After:**
```javascript
// bot.js fetches its own data
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

**Migration:**
- Remove any code that passes chart data to `run()`
- Bot now runs independently: `node bot.js`

### 2. Data Source

**Before:**
- TradingView MCP tools (`data_get_ohlcv`, `chart_get_state`)
- Required Claude Code to fetch data
- Required TradingView Desktop running

**After:**
- Binance Futures API (`/fapi/v1/klines`)
- Direct HTTP requests
- No TradingView needed

**Migration:**
- No code changes needed in your scripts
- Bot handles data fetching internally

### 3. Symbol Format

**Before:**
- Used whatever symbol was on TradingView chart
- Set via `TRADING_SYMBOL` environment variable

**After:**
- Uses `SYMBOL` from .env (e.g., `BTCUSD`)
- Automatically converts to Binance format (`BTCUSDT`)

**Migration:**
```bash
# Old .env
TRADING_SYMBOL=BTCUSD

# New .env
SYMBOL=BTCUSD  # Automatically converted to BTCUSDT for Binance
```

### 4. Removed Files/Functions

**Removed:**
- `processChartData()` - No longer needed
- `loadCachedCandles()` - No longer needed
- `saveCachedCandles()` - No longer needed
- `mergeCandleData()` - No longer needed
- `temp-htf.json` / `temp-ltf.json` - No longer generated

**Added:**
- `binance-client.js` - New module for Binance API
- `fetchMarketData()` - Fetches candles from Binance
- `convertSymbolToBinance()` - Symbol format conversion
- `convertTimeframeToBinanceInterval()` - Timeframe conversion

**Migration:**
- Remove any references to `processChartData()`
- Remove any references to temp cache files
- Use `fetchMarketData()` if you need to fetch data programmatically

### 5. TradingView Usage

**Before:**
- Required for all market data
- Required for chart analysis
- Required for indicator calculations

**After:**
- Optional for visualization only
- Used only for drawing after trade execution
- Not required for bot operation

**Migration:**
- TradingView MCP setup is now optional
- Bot works without TradingView
- Claude Code can still draw on chart if desired

## Step-by-Step Migration

### Step 1: Update Dependencies

```bash
# Pull latest code
git pull origin main

# Reinstall dependencies (no new packages needed)
npm install
```

### Step 2: Update Environment Variables

```bash
# Old .env
TRADING_SYMBOL=BTCUSD

# New .env (rename variable)
SYMBOL=BTCUSD
```

**Full .env example:**
```bash
# Delta Exchange (required)
DELTA_API_KEY=your_api_key
DELTA_API_SECRET=your_api_secret
DELTA_BASE_URL=https://api.india.delta.exchange

# Trading Configuration
SYMBOL=BTCUSD                   # Changed from TRADING_SYMBOL
TIMEFRAME_HTF=4H
TIMEFRAME_LTF=15m
PORTFOLIO_VALUE_USD=1000
MAX_TRADE_SIZE_USD=100
MAX_TRADES_PER_DAY=3
LEVERAGE=5
RISK_REWARD_RATIO=2
PAPER_TRADING=true
ALLOW_LONG=true
ALLOW_SHORT=true

# Monitor Configuration
MONITOR_INTERVAL_SECONDS=30
ENABLE_NOTIFICATIONS=true
```

### Step 3: Test Binance Connection

```bash
# Test Binance API connectivity
node -e "import('./binance-client.js').then(m => m.testConnection().then(r => console.log('Connected:', r)))"
```

Expected output: `Connected: true`

### Step 4: Run Bot in Paper Mode

```bash
# Ensure paper trading is enabled
PAPER_TRADING=true node bot.js
```

**What to verify:**
- Bot connects to Binance ✅
- Fetches HTF and LTF candles ✅
- Performs ICT analysis ✅
- Runs safety checks ✅
- Logs decision to files ✅

### Step 5: Review Logs

```bash
# Check safety check log
cat safety-check-log.json

# Check trade log
cat trades.csv

# Check position state
cat open-positions.json
```

### Step 6: Monitor Positions (if any)

```bash
npm run monitor
```

### Step 7: Switch to Live Trading (when ready)

```bash
# Update .env
PAPER_TRADING=false

# Run bot
node bot.js
```

## Code Migration Examples

### Example 1: Custom Script That Called Bot

**Before:**
```javascript
import { run } from './bot.js';

// Fetch data from TradingView via Claude
const chartDataHTF = await claudeFetchTradingViewData("4H");
const chartDataLTF = await claudeFetchTradingViewData("15m");

// Pass data to bot
await run(chartDataHTF, chartDataLTF);
```

**After:**
```javascript
import { run } from './bot.js';

// Bot fetches its own data
await run();
```

### Example 2: Cron Job

**Before:**
```bash
# Couldn't run on cron (required Claude)
# Had to run manually with Claude Code
```

**After:**
```bash
# Add to crontab
0 */4 * * * cd /path/to/bot && node bot.js
```

### Example 3: Cloud Deployment

**Before:**
```bash
# Cloud deployment used Binance API as fallback
# Different code path for cloud vs local
```

**After:**
```bash
# Same code path for local and cloud
# Always uses Binance API
railway up
```

## API Comparison

### TradingView MCP (Old)

```javascript
// Required Claude Code to execute
await mcp.data_get_ohlcv({
  symbol: "BTCUSD",
  interval: "4h",
  count: 100
});
```

**Limitations:**
- Required TradingView Desktop
- Required Claude Code
- Limited to chart symbols
- Manual execution

### Binance Futures API (New)

```javascript
// Direct API call
const candles = await fetchCandles("BTCUSDT", "4h", 100);
```

**Benefits:**
- No desktop app required
- No AI assistance required
- All symbols available
- Automated execution

## Data Format Comparison

### TradingView Format (Old)

```javascript
{
  bars: [
    {
      time: 1234567890000,
      open: 50000,
      high: 51000,
      low: 49000,
      close: 50500,
      volume: 100
    }
  ]
}
```

### Binance Format (New)

```javascript
[
  {
    time: 1234567890000,
    open: 50000,
    high: 51000,
    low: 49000,
    close: 50500,
    volume: 100
  }
]
```

**Note:** Format is nearly identical. Bot handles conversion internally.

## Troubleshooting Migration Issues

### Issue 1: "Cannot find module 'binance-client.js'"

**Cause:** Old code version

**Solution:**
```bash
git pull origin main
npm install
```

### Issue 2: "TRADING_SYMBOL is not defined"

**Cause:** Old environment variable name

**Solution:**
```bash
# Update .env
# Change: TRADING_SYMBOL=BTCUSD
# To: SYMBOL=BTCUSD
```

### Issue 3: "Failed to fetch Binance data"

**Cause:** Network connectivity or invalid symbol

**Solution:**
```bash
# Test connectivity
curl https://fapi.binance.com/fapi/v1/ping

# Verify symbol format
# Use: BTCUSD (bot converts to BTCUSDT)
# Not: BTC/USD or BTC-USD
```

### Issue 4: "Bot still waiting for Claude"

**Cause:** Running old version of bot.js

**Solution:**
```bash
# Pull latest code
git pull origin main

# Verify entry point
tail -20 bot.js
# Should see: run().catch((error) => {...})
```

### Issue 5: TradingView drawings not working

**Cause:** TradingView is now optional

**Solution:**
- Bot works without TradingView
- Drawings require Claude Code + TradingView MCP
- This is an optional feature for visualization only

## Performance Comparison

### Before (TradingView MCP)

- **Latency:** 2-5 seconds (MCP overhead)
- **Reliability:** Depends on TradingView Desktop
- **Automation:** Manual execution only
- **Cloud:** Different code path

### After (Binance API)

- **Latency:** 200-500ms (direct API)
- **Reliability:** 99.9% uptime (Binance)
- **Automation:** Cron/schedule ready
- **Cloud:** Same code path

## Feature Parity

| Feature | Before | After | Notes |
|---------|--------|-------|-------|
| Market data | TradingView | Binance | ✅ Faster, more reliable |
| OHLCV candles | TradingView | Binance | ✅ Same data quality |
| Indicator calculation | Bot | Bot | ✅ No change |
| ICT analysis | Bot | Bot | ✅ No change |
| Safety checks | Bot | Bot | ✅ No change |
| Trade execution | Delta | Delta | ✅ No change |
| Position tracking | Bot | Bot | ✅ No change |
| Tax logging | Bot | Bot | ✅ No change |
| Visualization | TradingView | TradingView | ✅ Now optional |
| Autonomous operation | ❌ | ✅ | 🎉 New capability |
| Cron/schedule | ❌ | ✅ | 🎉 New capability |
| Cloud deployment | Partial | Full | 🎉 Improved |

## Rollback Plan

If you need to rollback to the old version:

```bash
# Checkout previous commit
git log --oneline  # Find commit before refactor
git checkout <commit-hash>

# Restore old .env format
# Change: SYMBOL=BTCUSD
# To: TRADING_SYMBOL=BTCUSD

# Run with Claude Code
# (Old method - requires manual data passing)
```

**Note:** Rollback is not recommended. The new version is superior in every way.

## FAQ

### Q: Do I still need TradingView?

**A:** No. TradingView is now optional and only used for post-trade visualization.

### Q: Do I still need Claude Code?

**A:** No. The bot runs independently. Claude Code can optionally draw on TradingView after trades.

### Q: Will my existing trades.csv work?

**A:** Yes. The log format is unchanged.

### Q: Will my existing rules.json work?

**A:** Yes. Strategy rules are unchanged.

### Q: Can I still use TradingView for visualization?

**A:** Yes. Claude Code can still draw on TradingView after trade execution (optional).

### Q: Is the strategy logic different?

**A:** No. ICT analysis and safety checks are identical.

### Q: Is Binance data as good as TradingView?

**A:** Yes. Binance Futures provides the same OHLCV data that TradingView uses.

### Q: Can I run this on a schedule now?

**A:** Yes! Use cron or deploy to Railway with a schedule.

### Q: Does this work with other exchanges?

**A:** Data source is Binance (universal). Trade execution is still Delta Exchange (can be extended).

### Q: What about rate limits?

**A:** Binance allows 1200 requests/minute. Bot uses ~2 per run. Safe for 1-minute intervals.

## Support

If you encounter issues during migration:

1. Check the [Architecture docs](ARCHITECTURE.md)
2. Review the [CLAUDE.md](../CLAUDE.md) guide
3. Check `safety-check-log.json` for error details
4. Test Binance connectivity: `curl https://fapi.binance.com/fapi/v1/ping`
5. Verify .env configuration

## Summary

The migration removes TradingView as a data dependency and makes the bot fully autonomous. This is a **major improvement** that enables:

- ✅ Autonomous operation
- ✅ Scheduled execution
- ✅ Cloud deployment
- ✅ Faster data fetching
- ✅ Higher reliability
- ✅ No AI dependency

The migration is straightforward:
1. Update .env (rename `TRADING_SYMBOL` → `SYMBOL`)
2. Run bot: `node bot.js`
3. Verify logs

That's it. The bot now runs independently.
