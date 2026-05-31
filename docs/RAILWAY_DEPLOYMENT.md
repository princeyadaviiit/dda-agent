# Railway Deployment Guide

## Prerequisites

✅ Railway CLI installed (already done)
✅ Railway account (sign up at https://railway.app if you don't have one)
✅ Bot tested locally in paper mode
✅ Delta Exchange API credentials ready

## Step-by-Step Deployment

### Step 1: Login to Railway

Open a **new terminal** (outside Claude Code) and run:

```bash
railway login
```

This will open your browser for authentication. Login with your Railway account.

### Step 2: Initialize Railway Project

In the same terminal, navigate to the bot directory and initialize:

```bash
cd D:\claude\claude-execute
railway init
```

**Choose:**
- Create a new project
- Name it something like "crypto-trading-bot"

### Step 3: Deploy the Code

```bash
railway up
```

This will upload your code to Railway. Wait for the deployment to complete.

### Step 4: Set Environment Variables

Go to Railway dashboard: https://railway.app/dashboard

1. Click on your project
2. Go to **Variables** tab
3. Add all environment variables from your `.env` file:

**Required Variables:**

```bash
# Delta Exchange Credentials
DELTA_API_KEY=your_api_key_here
DELTA_API_SECRET=your_api_secret_here
DELTA_BASE_URL=https://api.india.delta.exchange

# Trading Configuration
SYMBOL=BTCUSD
TIMEFRAME_HTF=4H
TIMEFRAME_LTF=15m
PORTFOLIO_VALUE_USD=1000
MAX_TRADE_SIZE_USD=100
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
```

**Important:** Start with `PAPER_TRADING=true` to test in the cloud first.

### Step 5: Configure Cron Schedule

In Railway dashboard:

1. Go to **Settings** tab
2. Find **Cron Schedule** section
3. Add a schedule based on your timeframe:

**Recommended Schedules:**

| Timeframe | Cron Expression | Description |
|-----------|----------------|-------------|
| 4H chart | `0 */4 * * *` | Every 4 hours |
| 1H chart | `0 * * * *` | Every hour |
| 15m chart | `*/15 * * * *` | Every 15 minutes |
| 1D chart | `0 9 * * *` | Daily at 9am UTC |

**For your current setup (4H/15m):**
- Use: `0 */4 * * *` (every 4 hours)
- Or: `*/15 * * * *` (every 15 minutes for more frequent checks)

### Step 6: Test Deployment

After setting up cron, Railway will run the bot on schedule. To test immediately:

```bash
railway run node bot.js
```

This runs the bot once in the cloud environment.

### Step 7: Monitor Logs

View logs in Railway dashboard:

1. Go to **Deployments** tab
2. Click on latest deployment
3. View logs to see bot execution

Or use CLI:

```bash
railway logs
```

### Step 8: Verify Paper Trading

Check the logs for:
- ✅ Binance API connection successful
- ✅ ICT analysis running
- ✅ Trade decisions logged
- ✅ "PAPER TRADING" mode active

### Step 9: Switch to Live Trading (When Ready)

After verifying paper trades work correctly:

1. Go to Railway dashboard → Variables
2. Change `PAPER_TRADING=false`
3. Railway will automatically redeploy

**⚠️ Important:** Only switch to live after thoroughly testing paper mode!

## Troubleshooting

### Issue: Bot not running on schedule

**Solution:**
- Verify cron expression is correct
- Check Railway logs for errors
- Ensure all environment variables are set

### Issue: Binance API connection fails

**Solution:**
- Check Railway logs for error details
- Verify internet connectivity in Railway environment
- Test with: `railway run node bot.js`

### Issue: Delta Exchange authentication fails

**Solution:**
- Verify API credentials in Railway variables
- Check API key permissions (Read + Trade only)
- Ensure no extra spaces in credentials

### Issue: Bot runs but no trades execute

**Solution:**
- Check `safety-check-log.json` (if accessible)
- Review Railway logs for condition failures
- Verify market conditions meet ICT criteria
- Check if daily trade limit reached

## Monitoring Your Bot

### View Logs

```bash
railway logs --follow
```

### Check Deployment Status

```bash
railway status
```

### Run Bot Manually

```bash
railway run node bot.js
```

### Generate Tax Report

```bash
railway run node bot.js --tax-summary
```

## Cost Estimation

Railway pricing (as of 2024):
- **Hobby Plan:** $5/month (500 hours execution)
- **Pro Plan:** $20/month (unlimited execution)

**Estimated usage:**
- Running every 4 hours: ~180 executions/month
- Each execution: ~30 seconds
- Total: ~1.5 hours/month (well within Hobby plan)

## Security Best Practices

1. **Never commit `.env` file** - Already gitignored
2. **Use Railway's secret variables** - Encrypted at rest
3. **Enable IP whitelist on Delta Exchange** - If possible
4. **Start with paper trading** - Test thoroughly first
5. **Monitor regularly** - Check logs daily
6. **Set trade limits** - Use MAX_TRADES_PER_DAY
7. **Never enable Withdraw permission** - On Delta Exchange API

## Updating Your Bot

When you make code changes:

```bash
# In your local terminal
git add .
git commit -m "Update bot logic"
railway up
```

Railway will automatically redeploy with the new code.

## Stopping the Bot

### Temporarily pause:

In Railway dashboard:
1. Go to Settings
2. Disable cron schedule

### Permanently delete:

```bash
railway down
```

Or delete the project in Railway dashboard.

## Support

If you encounter issues:

1. Check Railway logs: `railway logs`
2. Review bot logs in Railway dashboard
3. Test locally first: `node bot.js`
4. Check Binance API status: https://www.binance.com/en/support/announcement
5. Check Delta Exchange status: https://www.delta.exchange

## Next Steps

After successful deployment:

1. ✅ Monitor paper trades for 24-48 hours
2. ✅ Verify ICT analysis is correct
3. ✅ Check trade decisions match expectations
4. ✅ Review safety-check-log.json
5. ✅ When confident, switch to live trading

---

**Remember:** Start with paper trading and monitor closely before going live!
