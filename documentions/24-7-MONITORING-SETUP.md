# 🤖 24/7 Autonomous Trading Monitor Setup

## What This Does

This sets up Claude to monitor your Delta Exchange account 24/7 and execute trades autonomously while you sleep.

**Features:**
- ✅ Reads symbol from your TradingView chart
- ✅ Analyzes market every 15 minutes
- ✅ Executes trades when ICT conditions align
- ✅ Sets TP/SL automatically (1:2 to 1:3 RR)
- ✅ Sends push notifications to your phone
- ✅ Respects daily limits (max 3 trades)
- ✅ Logs everything for review

---

## Setup Instructions

### Step 1: Install the Monitoring Skill

The skill has been created at:
```
C:\Users\Admin\.claude\skills\delta-trading-monitor.md
```

This skill contains all the logic for autonomous trading.

### Step 2: Start the Monitor

In Claude Code, run:

```
/loop 15m /delta-trading-monitor
```

This tells Claude to:
- Run the trading monitor skill
- Check every 15 minutes
- Continue indefinitely (until you stop it)

### Step 3: What Happens Next

**Every 15 minutes, Claude will:**

1. **Read your TradingView chart**
   - Gets current symbol you're analyzing
   - Falls back to .env if TradingView not open

2. **Analyze the market**
   - 4H chart: Determine trend direction
   - 15min chart: Find entry setup
   - Check all ICT conditions

3. **Make a decision**
   - If ALL conditions pass → Execute trade
   - If any condition fails → Skip and report why

4. **Execute trade (if conditions met)**
   - Calculate position size
   - Set TP/SL automatically
   - Place order on Delta Exchange
   - Send notification to your phone

5. **Report status**
   - Brief update in chat
   - Full details in trades.csv

---

## What You'll See

### When NO trade is taken:

```
📊 Market Check - 14:15 UTC
Symbol: BTCUSD
HTF Trend: BULLISH
LTF Bias: ALIGNED
Conditions: 3/4 passed
Decision: No trade - RSI(3) too high (65.4, need <30)
```

### When a TRADE is executed:

```
🚀 TRADE EXECUTED - 14:30 UTC
Symbol: BTCUSD
Direction: LONG
Entry: $73,689.56
Size: $100.00
TP1 (1:2): $75,163.35
TP2 (1:3): $75,880.65
SL: $72,952.67
Risk: 1% | Reward: 2-3%
```

**Plus a push notification to your phone!**

---

## How TP/SL Works

### For LONG trades:
- **Entry**: Current market price
- **Stop Loss**: 1% below entry (protects capital)
- **TP1**: 2% above entry (1:2 risk-reward)
- **TP2**: 3% above entry (1:3 risk-reward)

### For SHORT trades:
- **Entry**: Current market price
- **Stop Loss**: 1% above entry
- **TP1**: 2% below entry (1:2 risk-reward)
- **TP2**: 3% below entry (1:3 risk-reward)

**Strategy:**
- Close 50% of position at TP1
- Let remaining 50% run to TP2
- Move SL to breakeven after TP1 hit

---

## Safety Features

### Daily Limits:
- ✅ Max 3 trades per day
- ✅ Max $100 per trade
- ✅ Max 1% portfolio risk per trade

### Condition Checks:
- ✅ HTF trend must be clear (not neutral)
- ✅ LTF must align with HTF
- ✅ All 4 entry conditions must pass
- ✅ Price not overextended

### Fail-Safes:
- ✅ If bot fails → Log error, continue monitoring
- ✅ If TradingView disconnects → Use .env symbol
- ✅ If API fails → Log error, notify you, continue
- ✅ Paper trading mode until you enable live

---

## Commands

### Start monitoring:
```
/loop 15m /delta-trading-monitor
```

### Stop monitoring:
```
Press Ctrl+C or type: /stop
```

### Check status:
```
Open: D:\claude\claude-execute\trades.csv
```

### View logs:
```
Open: D:\claude\claude-execute\safety-check-log.json
```

---

## Notifications

You'll receive push notifications on your phone for:
- ✅ Trade executed
- ✅ Daily limit reached
- ✅ API errors
- ✅ Important alerts

**Make sure Remote Control is connected:**
```
/remote-control
```

---

## Going Live

**Currently in PAPER TRADING mode** (no real money)

**To enable live trading:**

1. Test for 3-7 days in paper mode
2. Review all paper trades in trades.csv
3. Verify strategy is working correctly
4. Open `.env` and change:
   ```
   PAPER_TRADING=false
   ```
5. Restart the monitor

**⚠️ Start with small position sizes!**

---

## Monitoring While You Sleep

**This is the key feature:**

1. Start the monitor before bed:
   ```
   /loop 15m /delta-trading-monitor
   ```

2. Leave Claude Code running (minimize the window)

3. Go to sleep

4. Claude monitors the market every 15 minutes

5. If a good setup appears → Trade executes automatically

6. You get a notification on your phone

7. Wake up to see your trades in trades.csv

**Requirements:**
- ✅ Computer must stay on (or use a VPS)
- ✅ Claude Code must stay running
- ✅ TradingView can be closed (uses Binance API)
- ✅ Internet connection must be stable

---

## Alternative: Use a VPS

For true 24/7 operation without your computer:

1. **Rent a VPS** (Virtual Private Server)
   - Vultr, DigitalOcean, or AWS
   - Windows or Linux
   - $5-10/month

2. **Install Claude Code on VPS**

3. **Set up the monitor**

4. **Let it run forever**

Benefits:
- ✅ Never turns off
- ✅ Always connected
- ✅ Your computer can be off

---

## Example Session

```
You: /loop 15m /delta-trading-monitor

Claude: Starting autonomous trading monitor...
        Checking every 15 minutes
        Symbol source: TradingView chart
        Mode: Paper Trading
        
        📊 Market Check - 14:00 UTC
        Symbol: BTCUSD
        HTF Trend: BULLISH
        LTF Bias: ALIGNED
        Conditions: 2/4 passed
        Decision: No trade - RSI not in pullback zone
        
        [15 minutes later]
        
        📊 Market Check - 14:15 UTC
        Symbol: BTCUSD
        HTF Trend: BULLISH
        LTF Bias: ALIGNED
        Conditions: 4/4 passed ✅
        
        🚀 TRADE EXECUTED!
        Direction: LONG
        Entry: $73,689.56
        Size: $100.00
        TP1: $75,163.35 (1:2 RR)
        TP2: $75,880.65 (1:3 RR)
        SL: $72,952.67
        
        📱 Notification sent to your phone
        
        [Continues monitoring every 15 minutes...]
```

---

## Troubleshooting

### Monitor not starting:
- Check: `/skills` to see if delta-trading-monitor is listed
- Verify: Skill file exists at `C:\Users\Admin\.claude\skills\delta-trading-monitor.md`

### No trades executing:
- Check: trades.csv to see why conditions are failing
- Verify: Paper trading mode is enabled (expected)
- Review: Safety check output for failed conditions

### Not getting notifications:
- Check: Remote Control is connected (`/remote-control`)
- Verify: Phone is paired with Claude Code

### Bot errors:
- Check: `.env` has correct API credentials
- Verify: Delta Exchange API is accessible
- Review: safety-check-log.json for error details

---

## Summary

**You now have:**
1. ✅ Autonomous trading monitor
2. ✅ TradingView integration (reads your chart)
3. ✅ Automatic TP/SL placement
4. ✅ Push notifications
5. ✅ 24/7 operation (while computer is on)

**To start:**
```
/loop 15m /delta-trading-monitor
```

**To stop:**
```
Ctrl+C or /stop
```

**Your bot will trade while you sleep!** 🌙💤📈
