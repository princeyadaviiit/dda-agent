# 🤖 Delta Exchange India Trading Bot - Complete Setup Guide


---

## 🚀 How to Use Your Bot (Step-by-Step)

### STEP 1: Add Your Delta Exchange API Credentials

**You need to do this step manually:**

1. Go to [https://www.india.delta.exchange](https://www.india.delta.exchange)
2. Log in to your account
3. Click **Profile Icon** (top-right) → **Settings** → **API Management**
4. Click **Create New API**
5. Set permissions:
   - ✅ **Read** - Enable
   - ✅ **Trade** - Enable
   - ❌ **Withdraw** - NEVER enable this!
6. Copy your **API Key** and **API Secret** (shown only once!)

**Now add them to your bot:**

Open the file: `D:\claude\claude-execute\.env`

Replace these lines:
```bash
DELTA_API_KEY=your_api_key_here
DELTA_API_SECRET=your_api_secret_here
```

With your actual credentials:
```bash
DELTA_API_KEY=abc123def456...
DELTA_API_SECRET=xyz789ghi012...
```

**Save the file.**

---

### STEP 2: Configure Your Trading Parameters

In the same `.env` file, adjust these settings:

```bash
# How much capital are you trading with?
PORTFOLIO_VALUE_USD=1000

# Maximum size for any single trade
MAX_TRADE_SIZE_USD=100

# Maximum trades per day (safety limit)
MAX_TRADES_PER_DAY=3

# Which symbol to trade (Delta Exchange product ID)
SYMBOL=BTCUSD

# What timeframe to analyze
TIMEFRAME=4H

# Start in paper trading mode (no real money)
PAPER_TRADING=true
```

**Important:** Keep `PAPER_TRADING=true` until you're confident the bot works correctly!

---

### STEP 3: Run Your First Test

Open PowerShell in the bot directory and run:

```powershell
cd D:\claude\claude-execute
node bot.js
```

**What you'll see:**

```
═══════════════════════════════════════════════════════════
  Claude Trading Bot
  2026-05-29T12:00:00.000Z
  Mode: 📋 PAPER TRADING
═══════════════════════════════════════════════════════════

Strategy: ICT Inner Circle Trading with Fibonacci Retracement
Symbol: BTCUSD | Timeframe: 4H

── Fetching market data from Binance ───────────────────

  Current price: $67,234.50
  EMA(8):  $67,100.23
  VWAP:    $67,150.00
  RSI(3):  28.45

── Safety Check ─────────────────────────────────────────

  Bias: BULLISH — checking long entry conditions

  ✅ Price above VWAP (buyers in control)
  ✅ Price above EMA(8) (uptrend confirmed)
  ✅ RSI(3) below 30 (snap-back setup)
  ✅ Price within 1.5% of VWAP (not overextended)

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

**The bot checks:**
- ✅ Your ICT strategy conditions (from `rules.json`)
- ✅ Daily trade limits
- ✅ Position size limits
- ✅ Risk management rules

If ALL conditions pass → Trade executes (paper or live)
If ANY condition fails → Trade blocked (tells you why)

---

### STEP 4: Review Your Trade Logs

**Two files are automatically created:**

1. **`trades.csv`** - Tax-ready trade log
   - Open in Excel or Google Sheets
   - Shows: Date, Time, Symbol, Side, Price, Quantity, Fees, Net Amount
   - Every trade (executed, paper, or blocked) is logged

2. **`safety-check-log.json`** - Full decision history
   - Complete audit trail
   - Shows all indicator values and condition checks
   - Useful for debugging and strategy refinement

---

### STEP 5: View Your Dashboard (Optional)

See all your trades in a live web dashboard:

```powershell
npm run dashboard
```

Then open: [http://localhost:3737](http://localhost:3737)

**Dashboard shows:**
- Total decisions, trades executed, trades blocked
- Trade history with timestamps and prices
- Safety check results for each decision
- Filter by date, status, or symbol

---

### STEP 6: Deploy to Railway (24/7 Cloud Execution)

Once you're happy with paper trading, deploy to Railway so the bot runs automatically even when your computer is off.

**Install Railway CLI:**

```powershell
npm install -g @railway/cli
```

**Login to Railway:**

```powershell
railway login
```

This opens your browser - log in with GitHub or email.

**Initialize Railway project:**

```powershell
cd D:\claude\claude-execute
railway init
```

**Deploy your bot:**

```powershell
railway up
```

**Set environment variables in Railway:**

1. Go to [https://railway.app](https://railway.app)
2. Open your project
3. Click **Variables** tab
4. Add all variables from your `.env` file:

| Variable | Value |
|----------|-------|
| `DELTA_API_KEY` | Your API key |
| `DELTA_API_SECRET` | Your API secret |
| `DELTA_BASE_URL` | https://api.india.delta.exchange |
| `PORTFOLIO_VALUE_USD` | 1000 |
| `MAX_TRADE_SIZE_USD` | 100 |
| `MAX_TRADES_PER_DAY` | 3 |
| `PAPER_TRADING` | true |
| `SYMBOL` | BTCUSD |
| `TIMEFRAME` | 4H |

**Set a cron schedule:**

1. In Railway → Settings → **Cron Schedule**
2. Choose how often to check for trades:

| Schedule | Cron Expression | When it runs |
|----------|----------------|--------------|
| Every 4 hours | `0 */4 * * *` | 00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC |
| Every hour | `0 * * * *` | Every hour at :00 |
| Once daily at 9am UTC | `0 9 * * *` | 09:00 UTC every day |
| Every 15 minutes | `*/15 * * * *` | Every 15 minutes |

**Recommended:** `0 */4 * * *` (every 4 hours) for 4H timeframe

**Save and deploy!**

Your bot now runs in the cloud 24/7.

---

## 🎯 Your Trading Strategy (ICT + Fibonacci)

The bot uses YOUR original `rules.json` strategy:

### Entry Checklist (All must pass):

1. ✅ **HTF Trend** - Daily/4H trend direction identified
2. ✅ **BOS** - Break of structure in trend direction
3. ✅ **Fibonacci** - Price retraced to OTE zone (0.618-0.786)
4. ✅ **Order Block** - Bullish/bearish OB identified
5. ✅ **Fair Value Gap** - FVG present for confluence
6. ✅ **Kill Zone** - Trading during London or NY session
7. ✅ **Confirmation** - Bullish/bearish engulfing or rejection wick
8. ✅ **Stop Loss** - Placed below/above order block with buffer
9. ✅ **Take Profit** - Minimum 1:2 RR, aiming for 1:3
10. ✅ **Risk Management** - Position size within limits
11. ✅ **Daily Limit** - Not exceeded max trades per day

**If ANY condition fails → NO TRADE**

---

## 🔒 Safety Features

### Built-in Guardrails:

1. **Daily Trade Limit**
   - Bot stops after `MAX_TRADES_PER_DAY` trades
   - Resets at midnight UTC

2. **Position Size Limit**
   - No single trade exceeds `MAX_TRADE_SIZE_USD`
   - Position size = min(1% of portfolio, max trade size)

3. **Paper Trading Mode**
   - When `PAPER_TRADING=true`, no real money is used
   - All decisions logged, but no orders placed
   - Perfect for testing and strategy validation

4. **Complete Audit Trail**
   - Every decision logged with timestamp
   - All indicator values recorded
   - Failed conditions clearly identified

5. **API Security**
   - Withdraw permission should NEVER be enabled
   - IP whitelist recommended
   - API keys stored in `.env` (never committed to git)

---

## 📊 Going Live (When Ready)

**After 3-7 days of successful paper trading:**

1. Open `D:\claude\claude-execute\.env`
2. Change: `PAPER_TRADING=true` to `PAPER_TRADING=false`
3. Save the file
4. If deployed to Railway, update the variable there too

**⚠️ WARNING:** Real money will be used. Start small!

**Recommended approach:**
- Start with `MAX_TRADE_SIZE_USD=50` (small size)
- Monitor for 1 week
- Gradually increase if profitable
- Never risk more than you can afford to lose

---

## 🛠️ Troubleshooting

### Bot won't start / "Invalid API Key" error

**Solution:**
1. Check `.env` file - ensure no extra spaces in API credentials
2. Verify API key exists in Delta Exchange dashboard
3. Confirm API key has **Read** and **Trade** permissions enabled

### "Invalid Signature" error

**Solution:**
1. Verify `DELTA_API_SECRET` is correct in `.env`
2. Check your system time is synchronized:
   ```powershell
   w32tm /resync
   ```
3. Delta Exchange requires accurate timestamps

### No trades executing

**Possible reasons:**
1. `PAPER_TRADING=true` - This is normal, it's paper trading mode
2. Strategy conditions not met - Check the safety check output
3. Daily trade limit reached - Check `trades.csv` for today's count
4. Symbol not available - Verify `SYMBOL` is a valid Delta Exchange product ID

### How to check if conditions are failing?

Run the bot and look at the **Safety Check** section:
- ✅ = Condition passed
- 🚫 = Condition failed (tells you why)

Example:
```
🚫 RSI(3) below 30 (snap-back setup in uptrend)
   Required: < 30 | Actual: 45.23
```

This tells you RSI is 45.23, but needs to be below 30.

### Bot not running on Railway

**Check:**
1. Environment variables are set correctly in Railway dashboard
2. Cron schedule is configured
3. Check Railway logs for errors
4. Verify your Railway project is not paused

---

## 📁 Important Files

| File | Purpose | Location |
|------|---------|----------|
| `.env` | Your API credentials and settings | `D:\claude\claude-execute\.env` |
| `rules.json` | Your ICT trading strategy | `D:\claude\claude-execute\rules.json` |
| `bot.js` | Main bot code | `D:\claude\claude-execute\bot.js` |
| `trades.csv` | Tax-ready trade log | `D:\claude\claude-execute\trades.csv` |
| `safety-check-log.json` | Full decision history | `D:\claude\claude-execute\safety-check-log.json` |
| `DELTA-SETUP.md` | Quick start guide | `D:\claude\claude-execute\DELTA-SETUP.md` |
| `docs/exchanges/delta-india.md` | API setup guide | `D:\claude\claude-execute\docs\exchanges\delta-india.md` |

---

## 🎓 Understanding Your Strategy

Your bot implements the **ICT Inner Circle Trading** methodology:

### Key Concepts:

1. **Order Blocks (OB)**
   - Last bullish candle before bearish move (or vice versa)
   - Acts as support/resistance when price returns
   - Bot identifies these automatically

2. **Fair Value Gaps (FVG)**
   - Price imbalance where candle wicks don't overlap
   - Price often returns to fill 50% of the gap
   - High probability when combined with OB

3. **Liquidity Pools**
   - Areas where stop losses cluster
   - Equal highs/lows, round numbers, previous day high/low
   - Bot looks for liquidity sweeps before entries

4. **Kill Zones**
   - London Open: 02:00-05:00 EST (07:00-10:00 GMT)
   - New York Open: 08:00-11:00 EST (13:00-16:00 GMT)
   - Highest volume and best setups

5. **OTE (Optimal Trade Entry)**
   - 0.618 to 0.786 Fibonacci retracement
   - ICT's "sweet spot" for entries
   - Bot waits for price to reach this zone

6. **Risk Management**
   - 1:2 minimum risk-reward ratio
   - 1:3 target risk-reward ratio
   - Stop loss below/above order block with buffer

---

## 📈 Tax Accounting

Every trade is automatically logged to `trades.csv`:

**Columns included:**
- Date and Time (UTC)
- Exchange (Delta Exchange India)
- Symbol (e.g., BTCUSD)
- Side (Buy/Sell)
- Quantity
- Price
- Total USD
- Fee (estimated at 0.1%)
- Net Amount
- Order ID
- Mode (Paper/Live/Blocked)
- Notes (which conditions failed if blocked)

**At tax time:**
1. Open `trades.csv` in Excel or Google Sheets
2. Hand it to your accountant
3. Or import directly into your accounting software

**Get a quick summary:**
```powershell
node bot.js --tax-summary
```

Shows:
- Total decisions logged
- Live trades executed
- Paper trades
- Blocked trades
- Total volume (USD)
- Total fees paid

---

## 🔄 Next Steps

### Immediate (Today):

1. ✅ Add your Delta Exchange API credentials to `.env`
2. ✅ Run `node bot.js` to test
3. ✅ Review the output and verify strategy conditions
4. ✅ Check `trades.csv` to see the logged decision

### This Week:

1. ✅ Run the bot manually 3-5 times to see different market conditions
2. ✅ Verify your ICT strategy conditions are working as expected
3. ✅ Review `safety-check-log.json` to understand decision-making
4. ✅ Adjust `MAX_TRADE_SIZE_USD` if needed

### When Confident:

1. ✅ Deploy to Railway for 24/7 execution
2. ✅ Set appropriate cron schedule (every 4 hours recommended)
3. ✅ Monitor for 3-7 days in paper trading mode
4. ✅ Review all paper trades for accuracy

### Going Live:

1. ✅ After successful paper trading, set `PAPER_TRADING=false`
2. ✅ Start with small position sizes
3. ✅ Monitor daily for first week
4. ✅ Gradually increase size if profitable

---

## 📞 Support & Resources

### Documentation:
- **Quick Start**: `DELTA-SETUP.md`
- **API Setup**: `docs/exchanges/delta-india.md`
- **Main README**: `README.md`

### Delta Exchange:
- Website: [https://www.india.delta.exchange](https://www.india.delta.exchange)
- API Docs: [https://docs.delta.exchange/api](https://docs.delta.exchange/api)
- Support: [support@delta.exchange](mailto:support@delta.exchange)

### Your Files:
- Bot directory: `D:\claude\claude-execute\`
- Trading rules: `D:\claude\claude-execute\rules.json`
- Trade log: `D:\claude\claude-execute\trades.csv`

---

## ⚠️ Important Disclaimers

1. **This is not financial advice**
2. **Trading crypto carries significant risk**
3. **Only trade with money you can afford to lose**
4. **Test thoroughly in paper trading mode first**
5. **Start with small position sizes**
6. **Monitor your bot regularly**
7. **Past performance doesn't guarantee future results**
8. **You are responsible for your trading decisions**

---

## ✅ Setup Checklist

Use this to track your progress:

- [ ] Delta Exchange India account created
- [ ] API credentials generated (Read + Trade permissions)
- [ ] API credentials added to `.env` file
- [ ] Trading parameters configured in `.env`
- [ ] Bot tested locally with `node bot.js`
- [ ] Reviewed `trades.csv` output
- [ ] Understood safety check conditions
- [ ] Dashboard tested (optional)
- [ ] Railway account created (for cloud deployment)
- [ ] Bot deployed to Railway
- [ ] Environment variables set in Railway
- [ ] Cron schedule configured
- [ ] Paper trading for 3-7 days
- [ ] All paper trades reviewed
- [ ] Ready to go live (when confident)

---

**Your bot is ready! Add your API credentials and start testing.** 🚀

Questions? Review the documentation files or check the troubleshooting section above.
