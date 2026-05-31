# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Automated crypto trading bot that implements ICT (Inner Circle Trading) strategy with Binance Futures API for market data and Delta Exchange India for trade execution. TradingView is used only for post-trade visualization (optional).

**Core Flow:** Bot fetches data from Binance → Analyzes ICT setup → Safety check → Execute trade on Delta Exchange → Draw visualization on TradingView (optional)

## Architecture

### Data Sources

**Primary: Binance Futures API (Market Data)**
- OHLCV candles (historical and real-time)
- Current price quotes
- Volume data
- No authentication required for market data
- Rate limit: 1200 requests/minute

**Secondary: Delta Exchange India (Trade Execution)**
- Futures trading with leverage
- Market orders with TP/SL
- Position management
- Requires API key + secret

**Optional: TradingView MCP (Visualization Only)**
- Post-trade drawing of entry/TP/SL
- Visual markers for order blocks and FVGs
- Not required for bot operation
- Only used via Claude Code for visualization

### Multi-Timeframe ICT Strategy

The bot uses a two-timeframe approach:
- **Higher Timeframe (HTF)**: 4H chart for trend direction (BULLISH/BEARISH/NEUTRAL)
- **Lower Timeframe (LTF)**: 15m chart for precise entry timing

**ICT Concepts Implemented:**
- Order Blocks (OB): Last opposing candle before strong move
- Fair Value Gaps (FVG): Price imbalances where wicks don't overlap
- Fibonacci OTE Zone: 0.618-0.786 retracement (optimal trade entry)
- Kill Zones: London (07:00-10:00 GMT) and NY (13:00-16:00 GMT) sessions
- Break of Structure (BOS): Continuation signal in trend direction
- Confirmation Patterns: Engulfing, hammer, shooting star, rejection wicks

### Component Relationships

```
bot.js (main strategy)
  ├─> binance-client.js - fetches OHLCV from Binance Futures API
  ├─> performICTAnalysis() - multi-timeframe analysis
  ├─> runICTSafetyCheck() - validates all entry conditions
  ├─> placeDeltaOrder() - executes on Delta Exchange
  ├─> addPosition() - tracks in position-manager.js
  └─> drawVisualAnalysis() - prepares drawing data (optional)

position-manager.js (state tracking)
  ├─> addPosition() - creates new position with TP/SL
  ├─> updatePositionPnL() - calculates unrealized P&L
  ├─> checkTPSL() - detects TP/SL hits
  └─> closePosition() - finalizes realized P&L

monitor.js (continuous monitoring)
  ├─> monitorPositions() - checks open positions against current price
  └─> sendNotification() - alerts on TP/SL hits

visual-analysis.js (chart drawing preparation)
  └─> drawVisualAnalysis() - prepares drawing data for TradingView MCP

binance-client.js (market data provider)
  ├─> fetchCandles() - get OHLCV data
  ├─> getCurrentPrice() - get current price
  ├─> testConnection() - verify API connectivity
  └─> Symbol/timeframe format converters
```

### How the Bot Works

**The bot is now fully autonomous and does NOT require Claude Code to run.**

1. **Standalone Execution:** Run `node bot.js` at any time
2. **Data Fetching:** Bot fetches candles from Binance Futures API
3. **Analysis:** Bot calculates indicators and runs ICT analysis
4. **Decision:** Bot validates all safety conditions
5. **Execution:** Bot places order on Delta Exchange if conditions pass
6. **Monitoring:** Separate monitor process tracks positions
7. **Visualization (Optional):** Claude Code can draw on TradingView after trade

**For manual testing:** Use paper trading mode (`PAPER_TRADING=true` in `.env`) to test without real orders.

## Key Commands

### Running the Bot
```bash
node bot.js                    # Run bot once (fetches data from Binance)
npm start                      # Same as above
node bot.js --tax-summary      # Generate tax report from trades.csv
```

### Dashboard & Monitoring
```bash
npm run dashboard              # Start terminal dashboard at http://localhost:3737
npm run monitor                # Start continuous position monitoring (30s interval)
```

### Testing & Development
```bash
# Seed demo data for dashboard preview
node dashboard/seed-demo.cjs        # Add 12 sample decisions
node dashboard/seed-demo.cjs reset  # Remove demo data

# Test Binance API connection
node -e "import('./binance-client.js').then(m => m.testConnection().then(r => console.log('Connected:', r)))"
```

## Configuration

### Environment Variables (.env)

**Exchange Credentials:**
- `DELTA_API_KEY` - Delta Exchange India API key
- `DELTA_API_SECRET` - Delta Exchange India API secret
- `DELTA_BASE_URL` - Default: https://api.india.delta.exchange

**Trading Config:**
- `PAPER_TRADING` - Set to `false` for live trading (default: `true`)
- `SYMBOL` - Trading pair (default: BTCUSD) - will be converted to BTCUSDT for Binance
- `TIMEFRAME_HTF` - Higher timeframe for trend (default: 4H)
- `TIMEFRAME_LTF` - Lower timeframe for entry (default: 15m)
- `PORTFOLIO_VALUE_USD` - Total account value for position sizing
- `MAX_TRADE_SIZE_USD` - Maximum USD per trade
- `MAX_TRADES_PER_DAY` - Daily trade limit (default: 3)
- `LEVERAGE` - Futures leverage (default: 5)
- `RISK_REWARD_RATIO` - Minimum RR (default: 2)
- `ALLOW_LONG` - Enable long trades (default: true)
- `ALLOW_SHORT` - Enable short trades (default: true)

**Monitor Config:**
- `MONITOR_INTERVAL_SECONDS` - Position check interval (default: 30)
- `ENABLE_NOTIFICATIONS` - Console notifications for TP/SL hits (default: true)

### Strategy Rules (rules.json)

The `rules.json` file defines the complete ICT strategy. All conditions in `entry_checklist` must pass before a trade executes. The safety check validates:

1. HTF trend direction (must be BULLISH or BEARISH, not NEUTRAL)
2. Break of Structure (BOS) in trend direction
3. Fibonacci OTE zone (price in 0.618-0.786 retracement)
4. Order Block presence in setup area
5. Fair Value Gap (FVG) for confluence
6. Kill Zone timing (London or NY session)
7. Confirmation candle pattern (engulfing, hammer, rejection)
8. Timeframe alignment (LTF bias matches HTF trend)
9. Confluence check (OTE + Order Block + FVG all present)

**To modify strategy:** Edit `rules.json` or use the Apify YouTube Transcript Scraper with `prompts/01-extract-strategy.md` to generate rules from trader videos.

## Safety & Risk Management

### Pre-Trade Safety Checks

Every trade must pass ALL conditions:
- All 9 ICT conditions from `runICTSafetyCheck()`
- Daily trade limit not exceeded (`MAX_TRADES_PER_DAY`)
- Trade size within limit (`MAX_TRADE_SIZE_USD`)
- Position sizing: max 1% risk per trade
- Direction allowed (`ALLOW_LONG` / `ALLOW_SHORT`)

**If any condition fails, the trade is blocked and logged to `safety-check-log.json` with exact failure reasons.**

### TP/SL Calculation

Stop Loss and Take Profit are calculated based on ICT order blocks:
- **Long:** SL below order block low with 5-pip buffer
- **Short:** SL above order block high with 5-pip buffer
- **TP:** Calculated from SL distance × `RISK_REWARD_RATIO`

Fallback if no order block: 2% from entry price.

### Paper Trading Mode

**Always start in paper trading mode.** Set `PAPER_TRADING=true` in `.env` to:
- Log all decisions to `safety-check-log.json`
- Record paper trades to `trades.csv` with "PAPER" mode
- Track positions in `open-positions.json`
- Test the full flow without real orders

**Switch to live trading:** Set `PAPER_TRADING=false` only after verifying paper trades match expectations.

## Data Files

### Auto-Generated Files
- `safety-check-log.json` - Every trade decision with all condition results
- `trades.csv` - Tax-ready trade log (Date, Time, Symbol, Side, Price, Fees, Net Amount)
- `open-positions.json` - Active positions with entry, TP, SL, unrealized P&L

### Configuration Files
- `.env` - Exchange credentials and trading config (gitignored)
- `rules.json` - ICT strategy rules and entry checklist

## Binance Futures API Integration

This bot uses Binance Futures API for all market data. No authentication required for market data endpoints.

**API Endpoints Used:**
- `GET /fapi/v1/klines` - Historical OHLCV candles
- `GET /fapi/v1/ticker/price` - Current price quote
- `GET /fapi/v1/ping` - Connection test

**Symbol Format:**
- Bot config uses: `BTCUSD`, `ETHUSD`
- Binance requires: `BTCUSDT`, `ETHUSDT`
- Automatic conversion in `binance-client.js`

**Timeframe Format:**
- Bot config uses: `15m`, `4H`, `1D`
- Binance requires: `15m`, `4h`, `1d`
- Automatic conversion in `binance-client.js`

**Rate Limits:**
- 1200 requests/minute (weight-based)
- Each klines request = 1-5 weight
- Bot uses ~2 requests per run (safe for 1-minute intervals)

## TradingView Integration (Optional)

TradingView is **ONLY** used for post-trade visualization via Claude Code. The bot does NOT depend on TradingView for any trading functionality.

**What TradingView IS Used For:**
- Drawing entry/TP/SL lines after trade execution
- Drawing order blocks and FVGs on chart
- Visual confirmation of trade setup

**What TradingView IS NOT Used For:**
- Market data fetching ❌
- OHLCV candles ❌
- Price feeds ❌
- Indicator calculations ❌
- Technical analysis ❌
- Signal generation ❌
- Trade decisions ❌

**How to Use TradingView Visualization:**
1. Bot executes trade and prepares drawing data
2. Claude Code reads the drawing data
3. Claude Code uses TradingView MCP tools to draw on chart
4. This step is completely optional

## Common Development Tasks

### Adding a New Exchange

1. Create `docs/exchanges/your-exchange.md` with API setup guide
2. Add exchange-specific order execution function in `bot.js`
3. Update `placeDeltaOrder()` or create new function for the exchange
4. Add exchange credentials to `.env.example`
5. Test in paper trading mode first

### Modifying ICT Strategy

1. Edit `rules.json` to add/remove conditions
2. Update `runICTSafetyCheck()` in `bot.js` to validate new conditions
3. Update `performICTAnalysis()` if new indicators needed
4. Test with paper trading and verify `safety-check-log.json` output

### Adding New Indicators

1. Add calculation function in `bot.js` (follow pattern of `calcEMA()`, `calcRSI()`)
2. Call indicator in `performICTAnalysis()`
3. Add to `ictAnalysis` return object
4. Update `runICTSafetyCheck()` to validate indicator values
5. Update `visual-analysis.js` if drawing on chart

### Testing Without Live Trading

For unit testing indicator calculations or strategy logic:
```javascript
import { calcEMA, calcRSI, performICTAnalysis } from './bot.js';

// Create mock candle data
const mockCandles = [
  { time: 1234567890, open: 50000, high: 51000, low: 49000, close: 50500, volume: 100 },
  // ... more candles
];

// Test indicator
const ema = calcEMA(mockCandles.map(c => c.close), 8);
console.log('EMA(8):', ema);

// Test full analysis
const analysis = performICTAnalysis(mockCandles, mockCandles);
console.log('HTF Trend:', analysis.htfTrend);
```

## Deployment

### Local Execution

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run bot once
node bot.js

# Run on schedule (cron)
# Every 4 hours: 0 */4 * * *
# Every 15 minutes: */15 * * * *
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

**Note:** Cloud deployment uses Binance API (same as local). No TradingView connection needed.

## Important Notes

- **Never commit `.env`** - Contains exchange API credentials
- **Start with paper trading** - Verify strategy before live trading
- **Monitor positions** - Run `npm run monitor` when positions are open
- **Check daily limits** - Bot enforces `MAX_TRADES_PER_DAY` automatically
- **Review logs** - Check `safety-check-log.json` to understand why trades were blocked
- **Tax records** - `trades.csv` is auto-generated for accounting
- **Delta Exchange API** - Never enable Withdraw permission, only Read + Trade
- **Binance API** - No authentication required for market data
- **Kill zones matter** - ICT strategy requires London or NY session for best probability
- **Confluence is key** - Best setups have OTE + Order Block + FVG all aligned
- **Bot is autonomous** - Runs independently without Claude Code (TradingView visualization is optional)
