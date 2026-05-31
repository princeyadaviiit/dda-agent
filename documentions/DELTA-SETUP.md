# Delta Exchange India Trading Bot - Quick Start Guide

Welcome! This bot is now configured specifically for **Delta Exchange India**. Here's how to get started.

## ✅ What's Been Done

The bot has been customized for Delta Exchange India:
- ✅ Replaced BitGet integration with Delta Exchange India API
- ✅ Updated authentication and order placement logic
- ✅ Created Delta Exchange India setup guide
- ✅ Updated all configuration files

## 🚀 Quick Start (5 Steps)

### Step 1: Get Your Delta Exchange India API Credentials

1. Go to [Delta Exchange India](https://www.india.delta.exchange)
2. Log in to your account
3. Navigate to: **Profile → Settings → API Management**
4. Click **Create New API**
5. Enable permissions:
   - ✅ **Read** (required)
   - ✅ **Trade** (required)
   - ❌ **Withdraw** (NEVER enable this)
6. Copy your **API Key** and **API Secret** (shown only once!)

📖 **Detailed guide:** [docs/exchanges/delta-india.md](docs/exchanges/delta-india.md)

### Step 2: Configure Your Bot

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and fill in your credentials:
   ```bash
   DELTA_API_KEY=your_api_key_here
   DELTA_API_SECRET=your_api_secret_here
   DELTA_BASE_URL=https://api.india.delta.exchange
   
   # Trading settings
   PORTFOLIO_VALUE_USD=1000
   MAX_TRADE_SIZE_USD=100
   MAX_TRADES_PER_DAY=3
   PAPER_TRADING=true
   
   # Symbol and timeframe
   SYMBOL=BTCUSD
   TIMEFRAME=4H
   ```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Connect TradingView (if not already done)

You need TradingView MCP connected to Claude Code.

**Already set up?** Run this to verify:
```bash
tv_health_check
```

Should return: `cdp_connected: true`

**Not set up yet?** Follow the TradingView MCP setup guide or watch the video tutorial.

### Step 5: Run Your First Trade Check

Start in **paper trading mode** (no real money):

```bash
node bot.js
```

You'll see:
- Current market data from Binance
- Indicator calculations (EMA, VWAP, RSI)
- Safety check results (PASS/FAIL for each condition)
- Trade decision (execute or block)
- Everything logged to `trades.csv` and `safety-check-log.json`

## 📊 Understanding the Output

When you run the bot, you'll see:

```
═══════════════════════════════════════════════════════════
  Claude Trading Bot
  2026-05-29T11:30:00.000Z
  Mode: 📋 PAPER TRADING
═══════════════════════════════════════════════════════════

Strategy: VWAP + RSI(3) + EMA(8) Scalping
Symbol: BTCUSD | Timeframe: 4H

── Fetching market data from Binance ───────────────────

  Current price: $67,234.50
  EMA(8):  $67,100.23
  VWAP:    $67,150.00
  RSI(3):  28.45

── Safety Check ─────────────────────────────────────────

  Bias: BULLISH — checking long entry conditions

  ✅ Price above VWAP (buyers in control)
     Required: > 67150.00 | Actual: 67234.50
  
  ✅ Price above EMA(8) (uptrend confirmed)
     Required: > 67100.23 | Actual: 67234.50
  
  ✅ RSI(3) below 30 (snap-back setup in uptrend)
     Required: < 30 | Actual: 28.45
  
  ✅ Price within 1.5% of VWAP (not overextended)
     Required: < 1.5% | Actual: 0.13%

── Trade Limits ─────────────────────────────────────────

✅ Trades today: 0/3 — within limit
✅ Trade size: $100.00 — within max $100

── Decision ─────────────────────────────────────────────

✅ ALL CONDITIONS MET

📋 PAPER TRADE — would buy BTCUSD ~$100.00 at market
   (Set PAPER_TRADING=false in .env to place real orders)

Decision log saved → safety-check-log.json
Tax record saved → trades.csv
═══════════════════════════════════════════════════════════
```

## 🎯 Your Trading Strategy

The bot uses the **ICT rules** you created earlier in `rules.json`:
- Order Blocks
- Fair Value Gaps
- Fibonacci OTE zones (0.618-0.786)
- Kill zones (London/NY sessions)
- Risk management (1:2 to 1:3 RR)

The default demo strategy is VWAP + RSI + EMA scalping. You can customize `rules.json` to match your ICT strategy.

## 🔒 Safety Features

Before ANY trade executes, the bot checks:
1. ✅ All strategy conditions must pass
2. ✅ Daily trade limit not exceeded
3. ✅ Trade size within max limit
4. ✅ Portfolio risk within 1% per trade

If ANY condition fails → **NO TRADE**

## 📈 Going Live

Once you're comfortable with paper trading:

1. Open `.env`
2. Change `PAPER_TRADING=true` to `PAPER_TRADING=false`
3. Run `node bot.js` again

**⚠️ WARNING:** Real money will be used. Start small!

## 🤖 Automate with Railway (24/7 Cloud Execution)

Deploy to Railway so the bot runs on a schedule even when your computer is off:

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

Then set your environment variables in Railway dashboard and configure a cron schedule:
- Every 4 hours: `0 */4 * * *`
- Once daily at 9am UTC: `0 9 * * *`

## 📊 View Your Dashboard

See all your trades and decisions in a live dashboard:

```bash
npm run dashboard
```

Open [http://localhost:3737](http://localhost:3737)

## 📁 Important Files

| File | Purpose |
|------|---------|
| `.env` | Your API credentials (never commit this!) |
| `rules.json` | Your trading strategy rules |
| `bot.js` | Main bot logic |
| `trades.csv` | Tax-ready trade log (open in Excel/Sheets) |
| `safety-check-log.json` | Full decision history |
| `docs/exchanges/delta-india.md` | Delta Exchange setup guide |

## 🆘 Troubleshooting

### "Invalid API Key" Error
- Double-check your API Key in `.env`
- Ensure no extra spaces when copying
- Verify the key exists in Delta Exchange dashboard

### "Invalid Signature" Error
- Check your API Secret is correct
- Sync your system time (Delta requires accurate timestamps)

### "Insufficient Permissions" Error
- Go to Delta Exchange → API Management
- Edit your API key and enable **Trade** permission

### No Trades Executing
- Check if `PAPER_TRADING=true` (paper mode doesn't place real orders)
- Review the safety check output - which conditions failed?
- Verify your strategy conditions in `rules.json`

## 📚 Resources

- [Delta Exchange India](https://www.india.delta.exchange)
- [Delta Exchange API Docs](https://docs.delta.exchange/api)
- [Delta Exchange Support](mailto:support@delta.exchange)
- [TradingView MCP Setup](https://youtu.be/CrgISHUiYUw)

## ⚠️ Disclaimer

**This is not financial advice.** 

- Trading crypto carries significant risk
- Only trade with money you can afford to lose
- Test thoroughly in paper trading mode first
- Start with small position sizes
- Monitor your bot regularly
- Past performance doesn't guarantee future results

---

**Ready to start?** Run `node bot.js` and watch your first safety check! 🚀
