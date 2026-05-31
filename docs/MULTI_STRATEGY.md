# Multi-Strategy Trading Bot Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Risk Management - CRITICAL](#risk-management---critical)
4. [Strategies Explained](#strategies-explained)
5. [Configuration Guide](#configuration-guide)
6. [Usage](#usage)
7. [Migration from Single Strategy](#migration-from-single-strategy)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Multi-Strategy Trading Bot is an advanced version of the original ICT trading bot that supports **6 different trading strategies** with **OR logic execution**.

### Key Features

- **6 Trading Strategies**: ICT+Fibonacci, CISD, FVG+CISD, Fibonacci, SMT Divergence, and a placeholder for future strategies
- **OR Logic**: Executes trade if **ANY** enabled strategy passes all conditions
- **Advanced Risk Management**: Proper position sizing with leverage, risk % on margin (not position size)
- **Strategy-Specific Risk Multipliers**: Adjust risk per strategy based on performance
- **Comprehensive Logging**: Track which strategy triggered each trade
- **Paper Trading Mode**: Test all strategies safely before going live
- **Single or Multi Mode**: Run original strategy only, or enable all strategies

### Execution Logic

```
IF Strategy 1 passes ALL conditions → Execute Trade
OR Strategy 2 passes ALL conditions → Execute Trade
OR Strategy 3 passes ALL conditions → Execute Trade
OR Strategy 4 passes ALL conditions → Execute Trade
OR Strategy 5 passes ALL conditions → Execute Trade
OR Strategy 6 passes ALL conditions → Execute Trade
ELSE → No Trade
```

**Important**: With more strategies enabled, you'll have MORE trade opportunities. Strictly enforce `MAX_TRADES_PER_DAY` and `MAX_DAILY_LOSS_PERCENT` limits.

---

## Architecture

### File Structure

```
DDA-agent/
├── bot.js                          # Original single-strategy bot (unchanged)
├── bot-multi.js                    # NEW: Multi-strategy bot
├── strategy-manager.js             # NEW: Strategy orchestration
├── risk-calculator.js              # NEW: Position sizing & risk management
├── strategies/
│   ├── strategy-1-ict-fibonacci.js # Strategy 1: ICT + Fibonacci OTE
│   ├── strategy-2-cisd.js          # Strategy 2: CISD
│   ├── strategy-3-fvg-cisd.js      # Strategy 3: FVG + CISD Combined
│   ├── strategy-4-fibonacci.js     # Strategy 4: Fibonacci Retracement
│   ├── strategy-5-smt-divergence.js# Strategy 5: SMT Divergence
│   └── strategy-6-placeholder.js   # Strategy 6: Future implementation
├── binance-client.js               # Market data from Binance Futures API
├── position-manager.js             # Position tracking
├── visual-analysis.js              # TradingView drawing (optional)
├── rules.json                      # Original ICT strategy rules
├── rules-multi-strategy.json       # NEW: Multi-strategy rules reference
├── .env                            # Configuration (YOU MANAGE THIS)
└── docs/
    └── MULTI_STRATEGY.md           # This file
```

### Component Relationships

```
bot-multi.js (Main Entry Point)
    ├─> strategy-manager.js (Orchestrates all strategies)
    │   ├─> strategy-1-ict-fibonacci.js
    │   ├─> strategy-2-cisd.js
    │   ├─> strategy-3-fvg-cisd.js
    │   ├─> strategy-4-fibonacci.js
    │   ├─> strategy-5-smt-divergence.js
    │   └─> strategy-6-placeholder.js
    ├─> risk-calculator.js (Position sizing & TP/SL)
    ├─> binance-client.js (Market data)
    ├─> position-manager.js (Track positions)
    └─> Delta Exchange API (Execute trades)
```

---

## Risk Management - CRITICAL

### How Risk % is Calculated

**CRITICAL UNDERSTANDING**: Risk % is calculated on **MARGIN (actual capital)**, NOT the leveraged position size.

#### Example Calculation

```
Portfolio: $1,000
Risk per trade: 1% = $10 (this is your max loss if SL hits)
Entry Price: $50,000
Stop Loss: $49,000 (2% distance from entry)
Leverage: 5x

Step-by-step calculation:
1. Risk amount in USD: $1,000 × 1% = $10
2. SL distance: ($50,000 - $49,000) / $50,000 = 2%
3. Required margin: $10 ÷ 0.02 = $500
4. Position size with 5x leverage: $500 × 5 = $2,500

If Stop Loss hits:
✅ You lose $10 (1% of portfolio) - CORRECT
❌ NOT $50 (2% of $2,500) - WRONG

This is the CORRECT and SAFE way to calculate risk in leveraged trading.
```

### Position Sizing Methods

The bot supports 3 position sizing methods (configured via `POSITION_SIZING_METHOD` in `.env`):

#### 1. Risk-Based (Recommended)

```
POSITION_SIZING_METHOD=risk_based
```

Calculates position size based on:
- `RISK_PER_TRADE_PERCENT` (e.g., 1%)
- Stop loss distance
- Leverage

**Formula**: `Margin = (Portfolio × Risk%) / SL Distance%`

**Example**:
- Portfolio: $1,000
- Risk: 1% = $10
- SL Distance: 2%
- Margin: $10 / 0.02 = $500
- Position with 5x leverage: $2,500

#### 2. Fixed Percentage

```
POSITION_SIZING_METHOD=fixed_percent
```

Uses fixed percentage of portfolio:
- `MAX_PORTFOLIO_PER_TRADE_PERCENT` (e.g., 10%)

**Example**:
- Portfolio: $1,000
- Max portfolio: 10% = $100 margin
- Position with 5x leverage: $500

#### 3. Fixed USD

```
POSITION_SIZING_METHOD=fixed_usd
```

Uses fixed USD amount:
- `MAX_TRADE_SIZE_USD` (e.g., $100)

**Example**:
- Max trade size: $100 margin
- Position with 5x leverage: $500

### Risk Management Limits

All limits are enforced BEFORE trade execution:

| Limit | Config Variable | Default | Description |
|-------|----------------|---------|-------------|
| Risk per trade | `RISK_PER_TRADE_PERCENT` | 1.0% | Max % of portfolio to risk per trade |
| Max portfolio per trade | `MAX_PORTFOLIO_PER_TRADE_PERCENT` | 10.0% | Max margin as % of portfolio |
| Max trade size | `MAX_TRADE_SIZE_USD` | $100 | Absolute max margin per trade |
| Max trades per day | `MAX_TRADES_PER_DAY` | 3 | Max trades across all strategies |
| Max daily loss | `MAX_DAILY_LOSS_PERCENT` | 4.0% | Stop trading if daily loss reaches this |
| Max open positions | `MAX_OPEN_POSITIONS` | 2 | Max concurrent positions |
| Min risk:reward | `RISK_REWARD_RATIO` | 2.0 | Minimum 1:2 RR required |

### Strategy Risk Multipliers

Adjust risk per strategy based on historical performance:

```env
STRATEGY_1_RISK_MULTIPLIER=1.0   # Standard risk
STRATEGY_2_RISK_MULTIPLIER=0.5   # Half risk (conservative)
STRATEGY_3_RISK_MULTIPLIER=1.5   # 1.5x risk (aggressive)
```

**Example**:
- Base risk: 1% of portfolio
- Strategy 2 multiplier: 0.5
- Actual risk for Strategy 2: 0.5% of portfolio

---

## Strategies Explained

### Strategy 1: ICT + Fibonacci OTE (Original)

**Description**: Your original ICT strategy with Order Blocks, Fair Value Gaps, and Fibonacci OTE zone.

**Timeframes**: 4H (trend) + 15m (entry)

**Entry Conditions** (Majority must pass):
1. HTF trend is BULLISH or BEARISH (not NEUTRAL)
2. Break of Structure (BOS) in trend direction
3. Price in Fibonacci OTE zone (0.618-0.786)
4. Order Block present in setup area
5. Fair Value Gap (FVG) for confluence
6. Kill Zone timing (London 07:00-10:00 GMT or NY 13:00-16:00 GMT)
7. Confirmation candle pattern (engulfing, hammer, rejection)
8. LTF bias aligns with HTF trend
9. Confluence: OTE + Order Block + FVG all present

**Stop Loss**: Below/above order block with 5-pip buffer

**Take Profit**: Based on risk:reward ratio (default 1:2)

**Best For**: High-probability setups during kill zones

---

### Strategy 2: CISD (Candle in Supply/Demand)

**Description**: Identifies fresh supply/demand zones and enters when candle BODY closes inside the zone.

**Timeframes**: 4H (zone identification) + 15m (entry)

**Entry Conditions** (ALL must pass):
1. Fresh supply/demand zone identified on HTF
2. Candle CLOSES inside the zone (not just wick)
3. Volume spike on approach to zone (>120% of average)
4. HTF trend aligns with zone type (or neutral)

**Key Difference**: Requires candle BODY to close inside zone, not just touch it.

**Stop Loss**: Below/above zone with 5-pip buffer

**Take Profit**: Next opposite zone or 1:3 RR

**Best For**: Reversal trades at strong S/D zones

---

### Strategy 3: FVG + CISD Combined

**Description**: Two-timeframe strategy combining HTF Fair Value Gaps with LTF CISD entries.

**Timeframes**: 4H (FVG identification) + 15m (CISD entry)

**Entry Conditions** (ALL must pass):
1. Fair Value Gap identified on HTF (4H/Daily)
2. Price taps into the FVG zone (50% fill minimum)
3. Fresh supply/demand zone on 15m WITHIN the HTF FVG
4. Candle closes inside the 15m zone
5. HTF trend aligns with FVG direction

**Process**:
1. Find FVG on 4H chart
2. Wait for price to enter FVG
3. Switch to 15m chart
4. Find CISD entry within the FVG zone
5. Enter when candle closes inside 15m zone

**Stop Loss**: Below/above 15m zone with 5-pip buffer

**Take Profit**: HTF FVG fill completion or 1:3 RR

**Best For**: High-confluence setups with multi-timeframe confirmation

---

### Strategy 4: Fibonacci Retracement

**Description**: Simple Fibonacci strategy using 0.5, 0.618, and 0.786 levels for reversal entries.

**Timeframes**: 4H (trend) + 1H or 15m (entry)

**Entry Conditions** (ALL must pass):
1. HTF trend is BULLISH or BEARISH (clear trend)
2. Impulse move identified (swing low to swing high)
3. Price pulls back to 0.5, 0.618, or 0.786 Fibonacci level
4. Reversal candle pattern at Fibonacci level (engulfing, hammer, pin bar)

**Simpler than Strategy 1**: No ICT concepts, just pure Fibonacci retracements.

**Stop Loss**: Below/above recent swing low/high with 5-pip buffer

**Take Profit**: Previous swing high/low or 1:3 RR

**Best For**: Clean trend retracements without complex confluence

---

### Strategy 5: SMT Divergence

**Description**: Compares two correlated assets (BTC vs ETH) for divergence signals indicating trend reversal.

**Timeframes**: 4H (divergence) + 1H or 15m (entry confirmation)

**Entry Conditions** (ALL must pass):
1. Assets are correlated (correlation >0.5)
2. Primary asset (BTC) makes new high/low
3. Secondary asset (ETH) FAILS to make new high/low (divergence)
4. Divergence confirmed on HTF (4H/Daily)
5. LTF reversal pattern confirms (engulfing, BOS, etc.)

**Example Bullish Divergence**:
- BTC makes new lower low at $45,000
- ETH fails to make new lower low (holds at $2,500)
- Signals potential bullish reversal

**Stop Loss**: Below/above recent swing on primary asset

**Take Profit**: Previous swing high/low or 1:3 RR

**Best For**: Early reversal signals using inter-market analysis

**Configuration**: Set `SMT_SECONDARY_SYMBOL=ETHUSD` in `.env`

---

### Strategy 6: Placeholder

**Status**: Not implemented yet. Reserved for future strategy.

**To Enable**: Set `STRATEGY_6_ENABLED=true` in `.env` after implementing the strategy logic.

---

## Configuration Guide

### Step 1: Copy .env.example to .env

```bash
cp .env.example .env
```

### Step 2: Configure Exchange Credentials

```env
DELTA_API_KEY=your_api_key_here
DELTA_API_SECRET=your_api_secret_here
```

**Security**: Enable Read + Trade only. NEVER enable Withdraw permission.

### Step 3: Choose Strategy Mode

```env
# Single mode: Only run Strategy 1 (original ICT strategy)
STRATEGY_MODE=single

# Multi mode: Run all enabled strategies (OR logic)
STRATEGY_MODE=multi
```

**Recommendation**: Start with `single` mode to test original strategy, then switch to `multi`.

### Step 4: Enable/Disable Strategies

```env
STRATEGY_1_ENABLED=true   # ICT + Fibonacci OTE
STRATEGY_2_ENABLED=true   # CISD
STRATEGY_3_ENABLED=true   # FVG + CISD Combined
STRATEGY_4_ENABLED=true   # Fibonacci Retracement
STRATEGY_5_ENABLED=true   # SMT Divergence
STRATEGY_6_ENABLED=false  # Placeholder (not implemented)
```

### Step 5: Configure Risk Management

```env
# Portfolio and risk
PORTFOLIO_VALUE_USD=1000
RISK_PER_TRADE_PERCENT=1.0          # 1% risk per trade
MAX_PORTFOLIO_PER_TRADE_PERCENT=10.0 # Max 10% margin per trade
MAX_TRADE_SIZE_USD=100               # Absolute max margin

# Position sizing method
POSITION_SIZING_METHOD=risk_based    # risk_based, fixed_percent, or fixed_usd

# Leverage and limits
LEVERAGE=5
MAX_TRADES_PER_DAY=3
MAX_DAILY_LOSS_PERCENT=4.0
MAX_OPEN_POSITIONS=2

# TP/SL
RISK_REWARD_RATIO=2.0
SL_BUFFER_PIPS=5
TP_STRATEGY=fixed_rr                 # fixed_rr, dynamic, or trailing
```

### Step 6: Configure Strategy Risk Multipliers (Optional)

```env
STRATEGY_1_RISK_MULTIPLIER=1.0
STRATEGY_2_RISK_MULTIPLIER=1.0
STRATEGY_3_RISK_MULTIPLIER=1.0
STRATEGY_4_RISK_MULTIPLIER=1.0
STRATEGY_5_RISK_MULTIPLIER=1.0
```

**Use Case**: After 30 days of trading, if Strategy 2 has 70% win rate and Strategy 4 has 40% win rate, you might set:
```env
STRATEGY_2_RISK_MULTIPLIER=1.5  # Increase risk for high-performing strategy
STRATEGY_4_RISK_MULTIPLIER=0.5  # Decrease risk for low-performing strategy
```

### Step 7: Paper Trading (ALWAYS START HERE)

```env
PAPER_TRADING=true
```

**CRITICAL**: Always start with paper trading. Switch to live only after verifying:
1. All strategies work as expected
2. Risk management is correct
3. Position sizing is appropriate
4. You understand each strategy's behavior

---

## Usage

### Running the Multi-Strategy Bot

```bash
# Run once
node bot-multi.js

# Run original single-strategy bot
node bot.js
```

### Running on Schedule (Cron)

```bash
# Every 4 hours
0 */4 * * * cd /path/to/DDA-agent && node bot-multi.js

# Every 15 minutes
*/15 * * * * cd /path/to/DDA-agent && node bot-multi.js
```

### Monitoring Positions

```bash
npm run monitor
```

### Dashboard

```bash
npm run dashboard
# Open http://localhost:3737
```

### Generate Tax Report

```bash
node bot-multi.js --tax-summary
```

### Logs and Files

- `safety-check-log.json` - Every trade decision with all conditions
- `trades.csv` - Tax-ready trade log with strategy column
- `open-positions.json` - Active positions with TP/SL

---

## Migration from Single Strategy

### Option 1: Keep Both Bots (Recommended)

```bash
# Run original bot
node bot.js

# Run multi-strategy bot
node bot-multi.js
```

Both bots share the same data files (`trades.csv`, `open-positions.json`, `safety-check-log.json`).

### Option 2: Replace Original Bot

```bash
# Backup original
cp bot.js bot-original.js

# Use multi-strategy bot as main
cp bot-multi.js bot.js
```

### Testing Migration

1. **Start with single mode**:
   ```env
   STRATEGY_MODE=single
   PAPER_TRADING=true
   ```

2. **Verify original strategy works**:
   ```bash
   node bot-multi.js
   ```
   Check that Strategy 1 produces same results as original `bot.js`.

3. **Enable multi mode**:
   ```env
   STRATEGY_MODE=multi
   STRATEGY_1_ENABLED=true
   STRATEGY_2_ENABLED=true
   # ... enable others gradually
   ```

4. **Test each strategy individually**:
   Enable one strategy at a time, run in paper mode, verify behavior.

5. **Test all strategies together**:
   Enable all strategies, run in paper mode for 1-2 weeks.

6. **Switch to live trading**:
   ```env
   PAPER_TRADING=false
   ```

---

## Troubleshooting

### Issue: No trades executing

**Check**:
1. Is `PAPER_TRADING=true`? Check `trades.csv` for paper trades.
2. Are strategies enabled? Check `.env` for `STRATEGY_X_ENABLED=true`.
3. Is `STRATEGY_MODE=multi`? If `single`, only Strategy 1 runs.
4. Check `safety-check-log.json` to see which conditions failed.
5. Are you in kill zone hours? Strategy 1 requires London/NY sessions.

### Issue: Risk calculation seems wrong

**Verify**:
1. Check `POSITION_SIZING_METHOD` in `.env`.
2. Review risk summary in console output.
3. Remember: Risk % is on MARGIN, not leveraged position size.
4. Check `LEVERAGE` setting - higher leverage = larger position with same margin.

### Issue: Too many trades

**Solution**:
1. Reduce `MAX_TRADES_PER_DAY` (e.g., from 3 to 1).
2. Disable some strategies.
3. Increase `RISK_REWARD_RATIO` (e.g., from 2.0 to 3.0) - fewer setups will qualify.
4. Use strategy risk multipliers to reduce risk on aggressive strategies.

### Issue: Strategy X always fails

**Debug**:
1. Check `safety-check-log.json` for that strategy's conditions.
2. Review strategy documentation above.
3. Check if market conditions suit that strategy (e.g., SMT needs correlated assets).
4. Verify timeframes are appropriate for the strategy.

### Issue: Binance API errors

**Check**:
1. Internet connection.
2. Binance Futures API status: https://www.binance.com/en/support/announcement
3. Rate limits: Bot uses ~2-10 requests per run (well within 1200/min limit).
4. Symbol format: Bot auto-converts BTCUSD → BTCUSDT.

### Issue: Delta Exchange order failed

**Check**:
1. API credentials are correct.
2. API permissions: Read + Trade enabled (NOT Withdraw).
3. Sufficient balance in Delta Exchange account.
4. Symbol exists on Delta Exchange India.
5. Leverage is within Delta's limits for that symbol.

---

## Best Practices

### 1. Start Conservative

```env
RISK_PER_TRADE_PERCENT=0.5          # Start with 0.5%, not 1%
MAX_TRADES_PER_DAY=1                # Start with 1 trade/day
STRATEGY_MODE=single                # Test original strategy first
PAPER_TRADING=true                  # Always start with paper trading
```

### 2. Enable Strategies Gradually

Week 1: Strategy 1 only
Week 2: Add Strategy 2
Week 3: Add Strategy 3
Week 4: Add Strategies 4 & 5

### 3. Monitor Performance

After 30 days, review `trades.csv`:
- Which strategies have highest win rate?
- Which strategies have best average RR?
- Adjust risk multipliers accordingly.

### 4. Respect Daily Limits

```env
MAX_DAILY_LOSS_PERCENT=4.0          # Stop trading if hit
MAX_TRADES_PER_DAY=3                # Prevent overtrading
```

### 5. Review Logs Daily

- `safety-check-log.json` - Understand why trades were blocked
- `trades.csv` - Track performance by strategy
- `open-positions.json` - Monitor active positions

### 6. Backtest Before Live

Use paper trading mode for at least 2 weeks before switching to live trading.

---

## Support

For issues or questions:
1. Check this documentation first
2. Review `safety-check-log.json` for trade decisions
3. Check `.env` configuration
4. Review console output for errors
5. Open an issue on GitHub (if applicable)

---

## Disclaimer

Trading cryptocurrencies with leverage involves substantial risk. Only trade with capital you can afford to lose. Past performance does not guarantee future results. This bot is provided as-is with no warranty. Always test in paper trading mode first.

---

**Last Updated**: 2026-05-31
**Version**: 2.0
**Author**: Multi-Strategy Trading Bot System
