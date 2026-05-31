# Railway Dashboard Setup Guide

## Overview

You'll set up TWO services in Railway:
1. **Dashboard Service** - Always-on web server (accessible via URL)
2. **Bot Service** - Runs on cron schedule (executes trades)

## Step 1: Configure Dashboard Service (Always On)

### 1.1 Go to Railway Dashboard

Open: https://railway.app/dashboard

Click on your project: **"Automation trading bot"**

### 1.2 Configure the Main Service as Dashboard

1. Click on the service (should show "Automation trading bot")
2. Go to **Settings** tab
3. Find **Start Command** section
4. Set start command to:
   ```
   node dashboard/server.js
   ```

### 1.3 Generate Public Domain

1. Still in **Settings** tab
2. Scroll to **Networking** section
3. Click **Generate Domain**
4. Railway will create a public URL like: `automation-trading-bot-production.up.railway.app`
5. **Save this URL** - this is your live dashboard!

### 1.4 Set Environment Variables

Go to **Variables** tab and add:

```bash
# Delta Exchange Credentials (REQUIRED - use your real credentials)
DELTA_API_KEY=your_actual_api_key_here
DELTA_API_SECRET=your_actual_api_secret_here
DELTA_BASE_URL=https://api.india.delta.exchange

# Trading Configuration
SYMBOL=RIVERUSD
TIMEFRAME_HTF=4H
TIMEFRAME_LTF=15m
PORTFOLIO_VALUE_USD=20
MAX_TRADE_SIZE_USD=20
MAX_TRADES_PER_DAY=3
LEVERAGE=5
RISK_REWARD_RATIO=2
TRADE_MODE=futures

# Paper Trading (START WITH TRUE)
PAPER_TRADING=true

# Trade Permissions
ALLOW_LONG=true
ALLOW_SHORT=true

# Monitoring
MONITOR_INTERVAL_SECONDS=30
ENABLE_NOTIFICATIONS=true

# Dashboard Port (Railway will use PORT automatically)
PORT=3000
```

**⚠️ IMPORTANT:** Replace `DELTA_API_KEY` and `DELTA_API_SECRET` with your actual credentials!

### 1.5 Deploy Dashboard

1. Click **Deploy** button (or it will auto-deploy)
2. Wait for deployment to complete
3. Check **Deployments** tab for status
4. Once deployed, click on the generated domain URL
5. You should see your live dashboard! 🎉

## Step 2: Add Bot Service (Cron Job)

### 2.1 Create New Service

1. In your Railway project, click **+ New** button
2. Select **Empty Service**
3. Name it: **"Trading Bot Cron"**

### 2.2 Connect to GitHub (Recommended)

**Option A: Connect GitHub Repository**
1. Click on the new service
2. Go to **Settings** → **Source**
3. Click **Connect Repo**
4. Select your repository
5. Set **Root Directory** to `/` (leave blank)
6. Set **Start Command** to: `node bot.js`

**Option B: Deploy from Local**

If you don't have GitHub connected, you can deploy manually:

```bash
# In your terminal (outside Claude Code)
cd D:\claude\claude-execute
railway link --service "Trading Bot Cron"
railway up
```

### 2.3 Configure Cron Schedule

1. In the **Trading Bot Cron** service
2. Go to **Settings** tab
3. Scroll to **Cron Schedule** section
4. Add schedule:

**Recommended schedules:**

| Timeframe | Cron Expression | Description |
|-----------|----------------|-------------|
| 4H chart | `0 */4 * * *` | Every 4 hours |
| 1H chart | `0 * * * *` | Every hour |
| 15m chart | `*/15 * * * *` | Every 15 minutes |

**For your setup (4H/15m), use:**
```
0 */4 * * *
```

This runs the bot every 4 hours.

### 2.4 Copy Environment Variables

1. Go to **Variables** tab in the Bot service
2. Copy all the same variables from the Dashboard service
3. Or use **Reference Variables** to share them:
   - Click **+ New Variable**
   - Select **Reference**
   - Choose variables from Dashboard service

### 2.5 Important: Disable Web Server for Bot

1. In Bot service **Settings**
2. Find **Service Type**
3. Change from **Web Service** to **Cron Job**
4. This ensures the bot only runs on schedule, not as a web server

## Step 3: Verify Everything Works

### 3.1 Check Dashboard

1. Open your dashboard URL (from Step 1.3)
2. You should see:
   - Stats strip (total decisions, trades, etc.)
   - Decision feed (empty initially)
   - Configuration panel

### 3.2 Test Bot Manually

Before waiting for cron, test the bot manually:

**In Railway Dashboard:**
1. Go to **Trading Bot Cron** service
2. Click **Deployments** tab
3. Click **View Logs**
4. Manually trigger: Click **Redeploy** button

**Or in your terminal:**
```bash
railway run node bot.js --service "Trading Bot Cron"
```

### 3.3 Check Logs

**Dashboard Service Logs:**
- Should show: `Dashboard server running on port 3000`
- Should show: `Listening at http://...`

**Bot Service Logs:**
- Should show: `🚀 Starting Automated Trading Bot...`
- Should show: `✅ Connected to Binance Futures API`
- Should show: `── ICT Strategy Safety Check ──`
- Should show trade decision (PASS or BLOCK)

## Step 4: Monitor Your Bot

### 4.1 View Live Dashboard

Open your dashboard URL anytime to see:
- Recent trade decisions
- Passed/failed conditions
- Position status
- ICT analysis results

### 4.2 View Railway Logs

**Dashboard logs:**
```bash
railway logs --service "Automation trading bot"
```

**Bot logs:**
```bash
railway logs --service "Trading Bot Cron"
```

### 4.3 Check Cron Execution

In Railway dashboard:
1. Go to **Trading Bot Cron** service
2. Click **Deployments** tab
3. You'll see each cron execution as a new deployment
4. Click on any deployment to view logs

## Step 5: Switch to Live Trading (When Ready)

After monitoring paper trades for 24-48 hours:

1. Go to **Variables** tab (in both services)
2. Change `PAPER_TRADING=false`
3. Services will auto-redeploy
4. Bot will now execute real trades!

**⚠️ WARNING:** Only switch to live after thoroughly testing paper mode!

## Troubleshooting

### Dashboard not loading

**Check:**
- Service is deployed and running
- Domain is generated
- PORT environment variable is set
- Check logs for errors

**Solution:**
```bash
railway logs --service "Automation trading bot"
```

### Bot not executing on schedule

**Check:**
- Cron schedule is set correctly
- Service type is "Cron Job" not "Web Service"
- Environment variables are set
- Check logs for errors

**Solution:**
- Manually trigger: Click **Redeploy** in Railway dashboard
- Check cron expression: https://crontab.guru

### Binance API connection fails

**Check:**
- Internet connectivity in Railway
- Symbol format (RIVERUSD → RIVERUSDT conversion)
- Check Binance API status

**Solution:**
```bash
railway run node bot.js --service "Trading Bot Cron"
```

### Delta Exchange authentication fails

**Check:**
- API credentials are correct
- No extra spaces in credentials
- API key permissions (Read + Trade only)

**Solution:**
- Regenerate API key in Delta Exchange
- Update variables in Railway

### Dashboard shows no data

**Cause:** Bot hasn't run yet or no trades executed

**Solution:**
- Wait for first cron execution
- Or manually trigger bot
- Check if trades are being blocked (view logs)

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         Railway Project                  │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  Dashboard Service (Always On)     │ │
│  │  - Runs: node dashboard/server.js  │ │
│  │  - Port: 3000                      │ │
│  │  - Public URL: ✅                  │ │
│  │  - Shows: Trade decisions, stats   │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  Bot Service (Cron Job)            │ │
│  │  - Runs: node bot.js               │ │
│  │  - Schedule: 0 */4 * * *           │ │
│  │  - Fetches: Binance data           │ │
│  │  - Executes: Delta Exchange trades │ │
│  └────────────────────────────────────┘ │
│                                          │
└─────────────────────────────────────────┘
```

## Cost Estimation

**Railway Pricing:**
- Hobby Plan: $5/month
- Pro Plan: $20/month

**Estimated Usage:**
- Dashboard: Always on (~720 hours/month)
- Bot: Runs every 4 hours (~180 executions × 30 seconds = 1.5 hours/month)
- Total: ~721.5 hours/month

**Recommendation:** Start with Hobby plan ($5/month)

## Security Checklist

✅ Delta Exchange API: Read + Trade only (NO Withdraw)
✅ Environment variables: Set in Railway (encrypted)
✅ Paper trading: Enabled initially
✅ Trade limits: MAX_TRADES_PER_DAY set
✅ Position sizing: MAX_TRADE_SIZE_USD set
✅ IP whitelist: Enabled on Delta Exchange (if possible)

## Next Steps

1. ✅ Configure Dashboard service (Step 1)
2. ✅ Add Bot cron service (Step 2)
3. ✅ Test both services (Step 3)
4. ✅ Monitor paper trades for 24-48 hours
5. ✅ Review dashboard and logs
6. ✅ When confident, switch to live trading

---

**Your Dashboard URL:** (will be generated in Step 1.3)

**Example:** `https://automation-trading-bot-production.up.railway.app`

**Bookmark this URL to access your live dashboard anytime!** 🚀
