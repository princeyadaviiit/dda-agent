# 🔧 Quick Connection Test

Run this to verify the complete TradingView → Bot → Delta Exchange flow:

## Test Command

```bash
cd D:\claude\claude-execute
set TRADING_SYMBOL=BTCUSD
node bot.js
```

## What This Tests

1. ✅ Bot reads the symbol (BTCUSD)
2. ✅ Fetches data from Binance API
3. ✅ Analyzes 4H + 15min timeframes
4. ✅ Checks ICT conditions
5. ✅ Would execute on Delta Exchange (if conditions pass)
6. ✅ Logs to trades.csv

## Expected Output

You should see:
```
✅ Using symbol from TradingView: BTCUSD
Strategy: ICT Inner Circle Trading with Fibonacci Retracement
Symbol: BTCUSD | HTF: 4H | LTF: 15m
Mode: FUTURES

── Fetching market data (Multi-Timeframe Analysis) ──

  📊 Higher Timeframe (4H) - Trend Direction
     Current price: $73,689.56
     EMA(8):  $73,642.61
     VWAP:    $73,428.21
     HTF Trend: BULLISH

  📊 Lower Timeframe (15m) - Entry Timing
     Current price: $73,689.56
     EMA(8):  $73,516.81
     VWAP:    $73,459.50
     RSI(3):  96.25

── Safety Check (ICT Multi-Timeframe) ──────────────────

  ✅ HTF Trend: BULLISH — Clear direction established
  ✅ Timeframe Alignment: LTF bias matches HTF BULLISH
  
  [... condition checks ...]
  
── Decision ─────────────────────────────────────────────

[Trade executed or blocked with reason]
```

## If This Works

✅ **Everything is connected correctly!**

The monitoring system will:
1. Read symbol from TradingView every 15 minutes
2. Run this exact same analysis
3. Execute trades on Delta Exchange when conditions pass
4. Notify you on your phone

## If This Fails

Check:
- [ ] .env has Delta Exchange API credentials
- [ ] Internet connection is working
- [ ] Binance API is accessible
- [ ] Delta Exchange API is accessible

---

**Run the test now to verify everything works!**
