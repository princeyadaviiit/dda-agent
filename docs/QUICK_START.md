# Multi-Strategy Bot - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Configure Environment

```bash
# Copy example config
cp .env.example .env

# Edit .env with your credentials
# REQUIRED: Add your Delta Exchange API key and secret
```

**Minimum Required Config:**
```env
DELTA_API_KEY=your_key_here
DELTA_API_SECRET=your_secret_here
PAPER_TRADING=true              # ALWAYS start with paper trading
STRATEGY_MODE=single            # Start with original strategy
```

### Step 2: Run the Bot

```bash
# Run multi-strategy bot once
node bot-multi.js

# Or run original single-strategy bot
node bot.js
```

### Step 3: Review Results

Check these files:
- `trades.csv` - Trade log with strategy column
- `safety-check-log.json` - Detailed decision log
- `open-positions.json` - Active positions

### Step 4: Enable Multi-Strategy Mode

After testing single strategy, enable multi-strategy mode:

```env
STRATEGY_MODE=multi
STRATEGY_1_ENABLED=true
STRATEGY_2_ENABLED=true
STRATEGY_3_ENABLED=true
STRATEGY_4_ENABLED=true
STRATEGY_5_ENABLED=true
```

### Step 5: Monitor & Optimize

```bash
# Monitor positions
npm run monitor

# View dashboard
npm run dashboard
# Open http://localhost:3737

# Generate tax report
node bot-multi.js --tax-summary
```

---

## 📊 Understanding Risk Calculation

**CRITICAL**: Risk % is calculated on **MARGIN**, not leveraged position size.

### Example:

```
Portfolio: $1,000
Risk: 1% = $10 (max loss if SL hits)
Entry: $50,000
Stop Loss: $49,000 (2% away)
Leverage: 5x

Calculation:
1. Risk amount: $10
2. SL distance: 2%
3. Margin needed: $10 ÷ 0.02 = $500
4. Position with 5x leverage: $500 × 5 = $2,500

If SL hits: You lose $10 (1% of portfolio) ✅
NOT $50 (2% of $2,500) ❌
```

This is the **CORRECT** way to calculate risk in leveraged trading.

---

## 🎯 Strategy Overview

| # | Strategy | Best For | Timeframes |
|---|----------|----------|------------|
| 1 | ICT + Fibonacci OTE | High-probability kill zone setups | 4H + 15m |
| 2 | CISD | Reversal at S/D zones | 4H + 15m |
| 3 | FVG + CISD Combined | Multi-timeframe confluence | 4H + 15m |
| 4 | Fibonacci Retracement | Clean trend retracements | 4H + 1H |
| 5 | SMT Divergence | Early reversal signals | 4H + 1H |
| 6 | Placeholder | Future implementation | TBD |

---

## ⚙️ Key Configuration Variables

### Risk Management (Most Important)

```env
PORTFOLIO_VALUE_USD=1000                # Your total capital
RISK_PER_TRADE_PERCENT=1.0              # Risk per trade (0.5-2% recommended)
MAX_PORTFOLIO_PER_TRADE_PERCENT=10.0    # Max margin per trade
MAX_TRADE_SIZE_USD=100                  # Absolute max margin
LEVERAGE=5                              # Futures leverage
POSITION_SIZING_METHOD=risk_based       # risk_based, fixed_percent, or fixed_usd
```

### Trade Limits

```env
MAX_TRADES_PER_DAY=3                    # Max trades across all strategies
MAX_DAILY_LOSS_PERCENT=4.0              # Stop trading if daily loss reaches this
MAX_OPEN_POSITIONS=2                    # Max concurrent positions
```

### Strategy Control

```env
STRATEGY_MODE=multi                     # single or multi
STRATEGY_1_ENABLED=true                 # Enable/disable each strategy
STRATEGY_2_ENABLED=true
# ... etc
```

### Strategy Risk Multipliers (Advanced)

```env
STRATEGY_1_RISK_MULTIPLIER=1.0          # Adjust risk per strategy
STRATEGY_2_RISK_MULTIPLIER=0.5          # 0.5 = half risk, 1.5 = 1.5x risk
```

---

## 🔍 Troubleshooting

### No trades executing?

1. Check `PAPER_TRADING=true` - look for paper trades in `trades.csv`
2. Check `STRATEGY_MODE=multi` and strategies are enabled
3. Review `safety-check-log.json` to see which conditions failed
4. Strategy 1 requires kill zone hours (London/NY sessions)

### Risk calculation seems wrong?

1. Remember: Risk % is on MARGIN, not leveraged position
2. Check console output for risk summary
3. Verify `POSITION_SIZING_METHOD` setting
4. Review `LEVERAGE` - higher leverage = larger position with same margin

### Too many trades?

1. Reduce `MAX_TRADES_PER_DAY`
2. Disable some strategies
3. Increase `RISK_REWARD_RATIO` (fewer setups qualify)
4. Use strategy risk multipliers to reduce aggressive strategies

---

## 📈 Recommended Progression

### Week 1: Test Original Strategy
```env
STRATEGY_MODE=single
PAPER_TRADING=true
RISK_PER_TRADE_PERCENT=0.5
```

### Week 2: Enable Multi-Strategy
```env
STRATEGY_MODE=multi
STRATEGY_1_ENABLED=true
STRATEGY_2_ENABLED=true
PAPER_TRADING=true
```

### Week 3: Add More Strategies
```env
STRATEGY_3_ENABLED=true
STRATEGY_4_ENABLED=true
STRATEGY_5_ENABLED=true
PAPER_TRADING=true
```

### Week 4: Optimize Risk
Review `trades.csv`, adjust risk multipliers based on performance.

### Week 5+: Go Live (Optional)
```env
PAPER_TRADING=false
RISK_PER_TRADE_PERCENT=1.0
```

---

## 📚 Full Documentation

See `docs/MULTI_STRATEGY.md` for complete documentation including:
- Detailed strategy explanations
- Risk management deep dive
- Configuration guide
- Migration from single strategy
- Best practices

---

## ⚠️ Important Reminders

1. **ALWAYS start with paper trading**
2. **Risk % is on MARGIN, not position size**
3. **More strategies = more trades** - enforce daily limits
4. **Test each strategy individually first**
5. **Review logs daily** - understand bot decisions
6. **Never enable Withdraw permission** on Delta Exchange API

---

## 🆘 Support

1. Check `safety-check-log.json` for trade decisions
2. Review console output for errors
3. Read full documentation in `docs/MULTI_STRATEGY.md`
4. Verify `.env` configuration

---

**Ready to start?** Run `node bot-multi.js` and check the output!
