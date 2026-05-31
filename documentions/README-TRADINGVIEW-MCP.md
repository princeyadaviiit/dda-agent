# Trading Bot — TradingView MCP Architecture

## Overview

The bot now reads **all market data directly from your TradingView chart** via the TradingView MCP (Model Context Protocol). This eliminates external API dependencies and ensures the bot analyzes exactly what you see on your chart.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Claude (delta-trading-monitor skill)                        │
├─────────────────────────────────────────────────────────────┤
│ 1. Get current chart state (symbol, timeframe)              │
│    → mcp__tradingview__chart_get_state()                    │
│                                                              │
│ 2. Fetch HTF bars (4H)                                      │
│    → mcp__tradingview__chart_set_timeframe("4H")            │
│    → mcp__tradingview__data_get_ohlcv(count: 100)           │
│                                                              │
│ 3. Fetch LTF bars (15m)                                     │
│    → mcp__tradingview__chart_set_timeframe("15m")           │
│    → mcp__tradingview__data_get_ohlcv(count: 100)           │
│                                                              │
│ 4. Pass chart data to bot.js                                │
│    → run(chartDataHTF, chartDataLTF)                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ bot.js (Node.js)                                            │
├─────────────────────────────────────────────────────────────┤
│ 1. Process OHLCV data from TradingView                      │
│ 2. Calculate indicators (EMA, VWAP, RSI)                    │
│ 3. Run ICT strategy safety checks                           │
│ 4. Execute trade on Delta Exchange (if conditions pass)     │
│ 5. Log to trades.csv                                        │
└─────────────────────────────────────────────────────────────┘
```

## How It Works

### Step 1: Claude Gets Chart State
Claude reads your current TradingView chart to determine:
- Current symbol (e.g., RIVERUSDT, BTCUSD)
- Current timeframe
- Chart type and indicators

### Step 2: Claude Fetches Multi-Timeframe Data
Claude switches to each timeframe and fetches OHLCV bars:
- **HTF (4H)**: 100 bars for trend analysis
- **LTF (15m)**: 100 bars for entry timing

### Step 3: Bot Analyzes Data
The bot receives the chart data and:
1. Calculates indicators on both timeframes
2. Determines HTF trend (BULLISH/BEARISH/NEUTRAL)
3. Checks LTF entry conditions
4. Runs ICT strategy safety checks

### Step 4: Bot Executes or Blocks
- ✅ **All conditions pass**: Execute trade on Delta Exchange
- 🚫 **Conditions fail**: Block trade, log reason

### Step 5: Log to CSV
All decisions (executed or blocked) are logged to `trades.csv` for tax/audit purposes.

## Data Flow

```
TradingView Chart
    ↓
Claude reads via MCP
    ↓
OHLCV bars (HTF + LTF)
    ↓
bot.js processes
    ↓
Indicators calculated
    ↓
Safety checks run
    ↓
Trade executed or blocked
    ↓
trades.csv logged
```

## No External API Calls

The bot **no longer calls Binance API** or any external market data source. All data comes from:
- ✅ TradingView chart (via MCP)
- ✅ Delta Exchange (for trade execution only)

This means:
- No API rate limits
- No symbol format issues (Binance spot vs futures)
- No data mismatches between chart and bot
- Works with ANY symbol on your chart

## Running the Bot

### Via Claude (Recommended)
```bash
/delta-trading-monitor
```

Claude will:
1. Read your chart state
2. Fetch OHLCV data from TradingView
3. Run the bot with that data
4. Notify you when trades execute

### Manual Testing
```bash
node bot.js
```

This will show you the bot structure but won't execute trades (needs chart data from Claude).

## Configuration

Edit `.env` to customize:

```env
# Delta Exchange credentials
DELTA_API_KEY=your_key
DELTA_API_SECRET=your_secret

# Trading limits
PORTFOLIO_VALUE_USD=1000
MAX_TRADE_SIZE_USD=100
MAX_TRADES_PER_DAY=3

# Timeframes (HTF for trend, LTF for entry)
TIMEFRAME_HTF=4H
TIMEFRAME_LTF=15m

# Paper trading (set to false for live)
PAPER_TRADING=true
```

## Safety Features

1. **Daily trade limit**: Max 3 trades per day
2. **Position size limit**: Max $100 per trade
3. **Multi-timeframe alignment**: HTF trend must match LTF bias
4. **ICT conditions**: All 4 conditions must pass
5. **Paper trading mode**: Test before going live

## Monitoring

The bot runs every 15 minutes via `/loop 15m /delta-trading-monitor`.

Each check:
- Reads current chart state
- Fetches fresh OHLCV data
- Analyzes market conditions
- Executes if conditions align
- Logs decision to trades.csv

## Troubleshooting

### "No chart data received"
- Make sure TradingView is open and connected
- Check that Claude can access TradingView MCP tools
- Verify the chart has the symbol you want to trade

### "Trade blocked: HTF Trend NEUTRAL"
- The 4H chart doesn't have a clear trend
- Wait for a clearer directional setup
- Check your EMA(8) and VWAP on the 4H chart

### "Trade blocked: Timeframe Alignment"
- The 15m bias doesn't match the 4H trend
- The LTF is moving against the HTF
- Wait for alignment before trading

### "Delta Exchange order failed"
- Check your API credentials in .env
- Verify your Delta Exchange account has funds
- Check that the symbol exists on Delta Exchange

## Files

- `bot.js` — Main trading logic (TradingView MCP integrated)
- `.env` — Configuration and credentials
- `trades.csv` — Trade log (open in Excel/Sheets)
- `rules.json` — ICT strategy rules
- `safety-check-log.json` — Detailed decision log

## Next Steps

1. ✅ Verify TradingView is connected
2. ✅ Set up Delta Exchange credentials in `.env`
3. ✅ Test in paper trading mode
4. ✅ Run `/loop 15m /delta-trading-monitor` to start monitoring
5. ✅ Check `trades.csv` for all decisions

---

**Questions?** Check the skill documentation or ask Claude to explain any part of the analysis.
