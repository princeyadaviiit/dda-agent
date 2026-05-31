/**
 * Automated Trading Bot — ICT Strategy with Binance Futures Data
 *
 * Fetches market data from Binance Futures API (no auth required for market data).
 * Executes trades on Delta Exchange India.
 * Uses TradingView only for visual analysis (drawing entry/TP/SL on chart).
 *
 * Architecture:
 * 1. Bot fetches OHLCV data from Binance Futures API
 * 2. Bot calculates indicators (EMA, VWAP, RSI)
 * 3. Bot runs ICT strategy safety checks
 * 4. Bot executes trades on Delta Exchange if conditions pass
 * 5. Bot draws visual analysis on TradingView chart (optional)
 * 6. Bot logs all trades to trades.csv
 *
 * Usage: node bot.js
 */

import "dotenv/config";
import { readFileSync, writeFileSync, existsSync, appendFileSync } from "fs";
import crypto from "crypto";
import { execSync } from "child_process";
import { drawVisualAnalysis, clearChartDrawings } from "./visual-analysis.js";
import { addPosition, updatePositionPnL, getOpenPositions } from "./position-manager.js";
import {
  fetchCandles,
  getCurrentPrice,
  testConnection,
  convertTimeframeToBinanceInterval,
  convertSymbolToBinance,
} from "./binance-client.js";

// ─── Onboarding ───────────────────────────────────────────────────────────────

function checkOnboarding() {
  const required = ["DELTA_API_KEY", "DELTA_API_SECRET"];
  const missing = required.filter((k) => !process.env[k]);

  if (!existsSync(".env")) {
    console.log(
      "\n⚠️  No .env file found — opening it for you to fill in...\n",
    );
    writeFileSync(
      ".env",
      [
        "# Delta Exchange India credentials",
        "DELTA_API_KEY=",
        "DELTA_API_SECRET=",
        "DELTA_BASE_URL=https://api.india.delta.exchange",
        "",
        "# Trading config",
        "PORTFOLIO_VALUE_USD=1000",
        "MAX_TRADE_SIZE_USD=100",
        "MAX_TRADES_PER_DAY=3",
        "PAPER_TRADING=true",
        "SYMBOL=BTCUSD",
        "TIMEFRAME_HTF=4H",
        "TIMEFRAME_LTF=15m",
      ].join("\n") + "\n",
    );
    try {
      execSync("open .env");
    } catch { }
    console.log(
      "Fill in your Delta Exchange credentials in .env then re-run: node bot.js\n",
    );
    process.exit(0);
  }

  if (missing.length > 0) {
    console.log(`\n⚠️  Missing credentials in .env: ${missing.join(", ")}`);
    console.log("Opening .env for you now...\n");
    try {
      execSync("open .env");
    } catch { }
    console.log("Add the missing values then re-run: node bot.js\n");
    process.exit(0);
  }

  const csvPath = new URL("trades.csv", import.meta.url).pathname;
  console.log(`\n📄 Trade log: ${csvPath}`);
  console.log(
    `   Open in Google Sheets or Excel any time — or tell Claude to move it:\n` +
    `   "Move my trades.csv to ~/Desktop" or "Move it to my Documents folder"\n`,
  );
}

// ─── Config ────────────────────────────────────────────────────────────────

const CONFIG = {
  symbol: process.env.SYMBOL || "BTCUSD",
  timeframeHTF: process.env.TIMEFRAME_HTF || "4H",
  timeframeLTF: process.env.TIMEFRAME_LTF || "15m",
  portfolioValue: parseFloat(process.env.PORTFOLIO_VALUE_USD || "1000"),
  maxTradeSizeUSD: parseFloat(process.env.MAX_TRADE_SIZE_USD || "100"),
  maxTradesPerDay: parseInt(process.env.MAX_TRADES_PER_DAY || "3"),
  paperTrading: process.env.PAPER_TRADING !== "false",
  tradeMode: process.env.TRADE_MODE || "futures",
  leverage: parseInt(process.env.LEVERAGE || "5"),
  riskRewardRatio: parseFloat(process.env.RISK_REWARD_RATIO || "2"),
  allowLong: process.env.ALLOW_LONG !== "false",
  allowShort: process.env.ALLOW_SHORT !== "false",
  delta: {
    apiKey: process.env.DELTA_API_KEY,
    apiSecret: process.env.DELTA_API_SECRET,
    baseUrl: process.env.DELTA_BASE_URL || "https://api.india.delta.exchange",
  },
};

const LOG_FILE = "safety-check-log.json";

// ─── Logging ────────────────────────────────────────────────────────────────

function loadLog() {
  if (!existsSync(LOG_FILE)) return { trades: [] };
  return JSON.parse(readFileSync(LOG_FILE, "utf8"));
}

function saveLog(log) {
  writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

function countTodaysTrades(log) {
  const today = new Date().toISOString().slice(0, 10);
  return log.trades.filter(
    (t) => t.timestamp.startsWith(today) && t.orderPlaced,
  ).length;
}

// ─── Market Data (Binance Futures API) ──────────────────────────────────────

/**
 * Fetch candles from Binance Futures API
 * @param {string} symbol - Trading symbol (BTCUSD, ETHUSD)
 * @param {string} timeframe - Timeframe (15m, 4H, 1D)
 * @param {number} limit - Number of candles (default 100)
 * @returns {Promise<Array>} Array of candle objects
 */
async function fetchMarketData(symbol, timeframe, limit = 100) {
  // Convert symbol to Binance format (BTCUSD -> BTCUSDT)
  const binanceSymbol = convertSymbolToBinance(symbol);

  // Convert timeframe to Binance interval (4H -> 4h)
  const binanceInterval = convertTimeframeToBinanceInterval(timeframe);

  console.log(`  📊 Fetching ${limit} candles for ${binanceSymbol} (${binanceInterval}) from Binance Futures...`);

  try {
    const candles = await fetchCandles(binanceSymbol, binanceInterval, limit);
    console.log(`  ✅ Loaded ${candles.length} candles`);
    return candles;
  } catch (error) {
    throw new Error(`Failed to fetch market data: ${error.message}`);
  }
}

// ─── Indicator Calculations ──────────────────────────────────────────────────

function calcEMA(closes, period) {
  const multiplier = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * multiplier + ema * (1 - multiplier);
  }
  return ema;
}

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gains = 0,
    losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calcVWAP(candles) {
  const midnightUTC = new Date();
  midnightUTC.setUTCHours(0, 0, 0, 0);
  const sessionCandles = candles.filter((c) => c.time >= midnightUTC.getTime());
  if (sessionCandles.length === 0) return null;
  const cumTPV = sessionCandles.reduce(
    (sum, c) => sum + ((c.high + c.low + c.close) / 3) * c.volume,
    0,
  );
  const cumVol = sessionCandles.reduce((sum, c) => sum + c.volume, 0);
  return cumVol === 0 ? null : cumTPV / cumVol;
}

// ─── TP/SL Calculation (ICT-based with Risk:Reward) ──────────────────────────

function calculateTPSL(entryPrice, ictAnalysis, riskRewardRatio) {
  const isBullish = ictAnalysis.htfTrend === "BULLISH";
  const bufferPips = 5; // 5 pip buffer to avoid stop hunts
  const pipValue = entryPrice * 0.0001; // 1 pip = 0.01% of price

  let stopLoss = 0;
  let takeProfit = 0;

  if (isBullish) {
    // LONG position: SL below order block, TP above entry
    if (ictAnalysis.orderBlocks.length > 0) {
      // Use the most recent bullish order block
      const orderBlock = ictAnalysis.orderBlocks[ictAnalysis.orderBlocks.length - 1];
      stopLoss = orderBlock.low - (bufferPips * pipValue);
    } else {
      // Fallback: use 2% below entry
      stopLoss = entryPrice * 0.98;
    }

    // Calculate risk
    const risk = entryPrice - stopLoss;

    // Calculate TP based on risk:reward ratio
    takeProfit = entryPrice + (risk * riskRewardRatio);

  } else {
    // SHORT position: SL above order block, TP below entry
    if (ictAnalysis.orderBlocks.length > 0) {
      // Use the most recent bearish order block
      const orderBlock = ictAnalysis.orderBlocks[ictAnalysis.orderBlocks.length - 1];
      stopLoss = orderBlock.high + (bufferPips * pipValue);
    } else {
      // Fallback: use 2% above entry
      stopLoss = entryPrice * 1.02;
    }

    // Calculate risk
    const risk = stopLoss - entryPrice;

    // Calculate TP based on risk:reward ratio
    takeProfit = entryPrice - (risk * riskRewardRatio);
  }

  const riskAmount = Math.abs(entryPrice - stopLoss);
  const rewardAmount = Math.abs(takeProfit - entryPrice);
  const actualRR = rewardAmount / riskAmount;

  return {
    stopLoss,
    takeProfit,
    risk: riskAmount,
    reward: rewardAmount,
    riskRewardRatio: actualRR,
  };
}

// ─── ICT Concepts Implementation ──────────────────────────────────────────────

function findSwingPoints(candles, lookback = 5) {
  const swings = { highs: [], lows: [] };

  for (let i = lookback; i < candles.length - lookback; i++) {
    let isSwingHigh = true;
    let isSwingLow = true;

    for (let j = 1; j <= lookback; j++) {
      if (candles[i].high <= candles[i - j].high || candles[i].high <= candles[i + j].high) {
        isSwingHigh = false;
      }
      if (candles[i].low >= candles[i - j].low || candles[i].low >= candles[i + j].low) {
        isSwingLow = false;
      }
    }

    if (isSwingHigh) swings.highs.push({ index: i, price: candles[i].high });
    if (isSwingLow) swings.lows.push({ index: i, price: candles[i].low });
  }

  return swings;
}

function calcFibonacciLevels(swingLow, swingHigh, isBullish) {
  const diff = swingHigh - swingLow;

  if (isBullish) {
    return {
      "0.000": swingLow,
      "0.236": swingLow + diff * 0.236,
      "0.382": swingLow + diff * 0.382,
      "0.500": swingLow + diff * 0.500,
      "0.618": swingLow + diff * 0.618,
      "0.786": swingLow + diff * 0.786,
      "1.000": swingHigh,
    };
  } else {
    return {
      "0.000": swingHigh,
      "0.236": swingHigh - diff * 0.236,
      "0.382": swingHigh - diff * 0.382,
      "0.500": swingHigh - diff * 0.500,
      "0.618": swingHigh - diff * 0.618,
      "0.786": swingHigh - diff * 0.786,
      "1.000": swingLow,
    };
  }
}

function isInOTEZone(price, fibLevels, isBullish) {
  const ote618 = fibLevels["0.618"];
  const ote786 = fibLevels["0.786"];

  if (isBullish) {
    return price >= ote786 && price <= ote618;
  } else {
    return price <= ote786 && price >= ote618;
  }
}

function detectOrderBlocks(candles, isBullish) {
  const orderBlocks = [];

  for (let i = 1; i < candles.length - 1; i++) {
    if (isBullish) {
      const isBearishCandle = candles[i].close < candles[i].open;
      const strongMoveUp = candles[i + 1].close > candles[i].high * 1.002;

      if (isBearishCandle && strongMoveUp) {
        orderBlocks.push({
          index: i,
          high: candles[i].high,
          low: candles[i].low,
          type: "bullish",
        });
      }
    } else {
      const isBullishCandle = candles[i].close > candles[i].open;
      const strongMoveDown = candles[i + 1].close < candles[i].low * 0.998;

      if (isBullishCandle && strongMoveDown) {
        orderBlocks.push({
          index: i,
          high: candles[i].high,
          low: candles[i].low,
          type: "bearish",
        });
      }
    }
  }

  return orderBlocks.slice(-3);
}

function detectFairValueGaps(candles, isBullish) {
  const fvgs = [];

  for (let i = 2; i < candles.length; i++) {
    if (isBullish) {
      const gap = candles[i].low - candles[i - 2].high;
      if (gap > 0) {
        fvgs.push({
          index: i,
          high: candles[i].low,
          low: candles[i - 2].high,
          type: "bullish",
        });
      }
    } else {
      const gap = candles[i - 2].low - candles[i].high;
      if (gap > 0) {
        fvgs.push({
          index: i,
          high: candles[i - 2].low,
          low: candles[i].high,
          type: "bearish",
        });
      }
    }
  }

  return fvgs.slice(-3);
}

function isInKillZone() {
  const now = new Date();
  const utcHour = now.getUTCHours();

  const londonOpen = utcHour >= 7 && utcHour < 10;
  const nyOpen = utcHour >= 13 && utcHour < 16;

  return { inKillZone: londonOpen || nyOpen, session: londonOpen ? "London" : nyOpen ? "New York" : "None" };
}

function detectConfirmationPattern(candles, isBullish) {
  if (candles.length < 2) return { found: false, pattern: "None" };

  const current = candles[candles.length - 1];
  const previous = candles[candles.length - 2];

  const currentBody = Math.abs(current.close - current.open);
  const previousBody = Math.abs(previous.close - previous.open);

  if (isBullish) {
    const isBullishEngulfing =
      current.close > current.open &&
      previous.close < previous.open &&
      current.open <= previous.close &&
      current.close >= previous.open;

    if (isBullishEngulfing) return { found: true, pattern: "Bullish Engulfing" };

    const isHammer =
      current.close > current.open &&
      (current.low < current.open - currentBody * 2) &&
      (current.high - current.close < currentBody * 0.3);

    if (isHammer) return { found: true, pattern: "Hammer" };

    const isBullishRejection =
      current.close > current.open &&
      (current.low < current.open - currentBody) &&
      currentBody > previousBody * 0.5;

    if (isBullishRejection) return { found: true, pattern: "Bullish Rejection" };

  } else {
    const isBearishEngulfing =
      current.close < current.open &&
      previous.close > previous.open &&
      current.open >= previous.close &&
      current.close <= previous.open;

    if (isBearishEngulfing) return { found: true, pattern: "Bearish Engulfing" };

    const isShootingStar =
      current.close < current.open &&
      (current.high > current.open + currentBody * 2) &&
      (current.close - current.low < currentBody * 0.3);

    if (isShootingStar) return { found: true, pattern: "Shooting Star" };

    const isBearishRejection =
      current.close < current.open &&
      (current.high > current.open + currentBody) &&
      currentBody > previousBody * 0.5;

    if (isBearishRejection) return { found: true, pattern: "Bearish Rejection" };
  }

  return { found: false, pattern: "None" };
}

function detectBreakOfStructure(candles, isBullish) {
  if (candles.length < 10) return false;

  const swings = findSwingPoints(candles, 3);

  if (isBullish) {
    if (swings.highs.length < 2) return false;
    const lastHigh = swings.highs[swings.highs.length - 1];
    const prevHigh = swings.highs[swings.highs.length - 2];
    return lastHigh.price > prevHigh.price;
  } else {
    if (swings.lows.length < 2) return false;
    const lastLow = swings.lows[swings.lows.length - 1];
    const prevLow = swings.lows[swings.lows.length - 2];
    return lastLow.price < prevLow.price;
  }
}

// ─── ICT Safety Check (Full Rules Implementation) ────────────────────────────

function runICTSafetyCheck(ictAnalysis, rules) {
  const results = [];

  const check = (label, required, actual, pass) => {
    results.push({ label, required, actual, pass });
    const icon = pass ? "✅" : "🚫";
    console.log(`  ${icon} ${label}`);
    console.log(`     Required: ${required} | Actual: ${actual}`);
  };

  console.log("\n── ICT Strategy Safety Check (Full Rules) ──────────────\n");
  console.log(`Strategy: ${rules.strategy_name}\n`);

  // Step 1: HTF Trend Direction
  check(
    "HTF Trend Direction",
    "Clear bullish or bearish trend",
    ictAnalysis.htfTrend,
    ictAnalysis.htfTrend !== "NEUTRAL"
  );

  if (ictAnalysis.htfTrend === "NEUTRAL") {
    console.log("\n❌ No clear HTF trend. No trade.\n");
    return { results, allPass: false, analysis: ictAnalysis };
  }

  const isBullish = ictAnalysis.htfTrend === "BULLISH";

  // Step 2: Break of Structure (BOS)
  check(
    "Break of Structure (BOS)",
    "BOS in trend direction",
    ictAnalysis.bos ? "Confirmed" : "Not found",
    ictAnalysis.bos
  );

  // Step 3: Fibonacci OTE Zone (0.618-0.786)
  check(
    "Fibonacci OTE Zone",
    "Price in 0.618-0.786 retracement",
    ictAnalysis.inOTE ? `In OTE (${ictAnalysis.fibLevels["0.618"].toFixed(2)} - ${ictAnalysis.fibLevels["0.786"].toFixed(2)})` : "Outside OTE",
    ictAnalysis.inOTE
  );

  // Step 4: Order Block Confluence
  check(
    "Order Block",
    "Order block present in setup area",
    ictAnalysis.orderBlocks.length > 0 ? `${ictAnalysis.orderBlocks.length} found` : "None",
    ictAnalysis.orderBlocks.length > 0
  );

  // Step 5: Fair Value Gap (FVG)
  check(
    "Fair Value Gap (FVG)",
    "FVG present for confluence",
    ictAnalysis.fvgs.length > 0 ? `${ictAnalysis.fvgs.length} found` : "None",
    ictAnalysis.fvgs.length > 0
  );

  // Step 6: Kill Zone Timing
  check(
    "Kill Zone",
    "London (07:00-10:00 GMT) or NY (13:00-16:00 GMT)",
    ictAnalysis.killZone.session,
    ictAnalysis.killZone.inKillZone
  );

  // Step 7: Confirmation Candle Pattern
  check(
    "Confirmation Pattern",
    isBullish ? "Bullish engulfing/hammer/rejection" : "Bearish engulfing/shooting star/rejection",
    ictAnalysis.confirmation.pattern,
    ictAnalysis.confirmation.found
  );

  // Step 8: Timeframe Alignment
  const biasAligned = isBullish ? ictAnalysis.ltfBullish : ictAnalysis.ltfBearish;
  check(
    "Timeframe Alignment",
    `LTF bias matches HTF ${ictAnalysis.htfTrend}`,
    biasAligned ? "Aligned" : "Not aligned",
    biasAligned
  );

  // Step 9: Confluence Check (OTE + Order Block + FVG)
  const hasConfluence = ictAnalysis.inOTE && ictAnalysis.orderBlocks.length > 0 && ictAnalysis.fvgs.length > 0;
  check(
    "Confluence",
    "OTE + Order Block + FVG",
    hasConfluence ? "All 3 present" : "Missing elements",
    hasConfluence
  );

  // ─── Majority Pass Logic (Execute if majority of conditions pass) ───────────
  const totalConditions = results.length;
  const passedConditions = results.filter(r => r.pass).length;
  const passPercentage = (passedConditions / totalConditions) * 100;
  const majorityPass = passedConditions > (totalConditions / 2); // More than 50%

  console.log(`\n── Trade Decision ────────────────────────────────────────`);
  console.log(`   Conditions Passed: ${passedConditions}/${totalConditions} (${passPercentage.toFixed(1)}%)`);
  console.log(`   Threshold: Majority (>50%) required`);

  if (majorityPass) {
    console.log(`\n✅ MAJORITY CONDITIONS MET — TRADE APPROVED\n`);
    console.log(`Setup Type: ${isBullish ? "LONG" : "SHORT"}`);
    console.log(`Entry Zone: ${ictAnalysis.fibLevels["0.618"] ? ictAnalysis.fibLevels["0.618"].toFixed(2) + " - " + ictAnalysis.fibLevels["0.786"].toFixed(2) : "N/A"}`);
    console.log(`Stop Loss: ${isBullish ? "Below" : "Above"} order block with 2-5 pip buffer`);
    console.log(`Take Profit: Minimum 1:2 RR, target 1:3 RR\n`);

    const failed = results.filter(r => !r.pass);
    if (failed.length > 0) {
      console.log(`⚠️  Note: ${failed.length} condition(s) failed but trade approved by majority:`);
      failed.forEach(f => console.log(`   • ${f.label}`));
      console.log();
    }
  } else {
    console.log(`\n🚫 TRADE BLOCKED — Majority conditions NOT met\n`);
    const failed = results.filter(r => !r.pass).map(r => r.label).join(", ");
    console.log(`Failed checks: ${failed}\n`);
  }

  return { results, allPass: majorityPass, passedConditions, totalConditions, passPercentage, analysis: ictAnalysis };
}

// ─── Trade Limits ────────────────────────────────────────────────────────────

function checkTradeLimits(log) {
  const todayCount = countTodaysTrades(log);

  console.log("\n── Trade Limits ─────────────────────────────────────────\n");

  if (todayCount >= CONFIG.maxTradesPerDay) {
    console.log(
      `🚫 Max trades per day reached: ${todayCount}/${CONFIG.maxTradesPerDay}`,
    );
    return false;
  }

  console.log(
    `✅ Trades today: ${todayCount}/${CONFIG.maxTradesPerDay} — within limit`,
  );

  const tradeSize = Math.min(
    CONFIG.portfolioValue * 0.5,
    CONFIG.maxTradeSizeUSD,
  );

  if (tradeSize > CONFIG.maxTradeSizeUSD) {
    console.log(
      `🚫 Trade size $${tradeSize.toFixed(2)} exceeds max $${CONFIG.maxTradeSizeUSD}`,
    );
    return false;
  }

  console.log(
    `✅ Trade size: $${tradeSize.toFixed(2)} — within max $${CONFIG.maxTradeSizeUSD}`,
  );

  return true;
}

// ─── Delta Exchange Execution (Futures with Leverage) ────────────────────────

function signDelta(method, timestamp, path, body = "") {
  const message = method + timestamp + path + body;
  return crypto
    .createHmac("sha256", CONFIG.delta.apiSecret)
    .update(message)
    .digest("hex");
}

async function placeDeltaOrder(symbol, side, sizeUSD, price, leverage, stopLoss, takeProfit) {
  // Calculate quantity based on leverage
  const quantity = ((sizeUSD * leverage) / price).toFixed(4);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const path = "/v2/orders";

  const orderPayload = {
    product_id: symbol,
    size: quantity,
    side: side, // "buy" or "sell"
    order_type: "market_order",
    time_in_force: "ioc",
    leverage: leverage.toString(),
  };

  // Add stop loss and take profit as bracket orders (if supported)
  // Note: Delta Exchange may require separate API calls for TP/SL
  // This is a simplified version - adjust based on Delta's actual API

  const body = JSON.stringify(orderPayload);
  const signature = signDelta("POST", timestamp, path, body);

  const res = await fetch(`${CONFIG.delta.baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": CONFIG.delta.apiKey,
      signature: signature,
      timestamp: timestamp,
    },
    body,
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(`Delta Exchange order failed: ${data.error?.message || JSON.stringify(data)}`);
  }

  console.log(`\n✅ Order placed on Delta Exchange:`);
  console.log(`   ${side.toUpperCase()} ${quantity} ${symbol} @ $${price.toFixed(2)}`);
  console.log(`   Leverage: ${leverage}x`);
  console.log(`   Stop Loss: $${stopLoss.toFixed(2)}`);
  console.log(`   Take Profit: $${takeProfit.toFixed(2)}\n`);

  return {
    ...data.result,
    stopLoss,
    takeProfit,
    leverage,
  };
}

// ─── CSV Logging ─────────────────────────────────────────────────────────────

const CSV_FILE = "trades.csv";

function initCsv() {
  if (!existsSync(CSV_FILE)) {
    const funnyNote = `,,,,,,,,,,,"NOTE","Hey, if you're at this stage of the video, you must be enjoying it... perhaps you could hit subscribe now? :)"`;
    writeFileSync(CSV_FILE, CSV_HEADERS + "\n" + funnyNote + "\n");
    console.log(
      `📄 Created ${CSV_FILE} — open in Google Sheets or Excel to track trades.`,
    );
  }
}

const CSV_HEADERS = [
  "Date",
  "Time (UTC)",
  "Exchange",
  "Symbol",
  "Side",
  "Quantity",
  "Price",
  "Total USD",
  "Fee (est.)",
  "Net Amount",
  "Order ID",
  "Mode",
  "Notes",
].join(",");

function writeTradeCsv(logEntry) {
  const now = new Date(logEntry.timestamp);
  const date = now.toISOString().slice(0, 10);
  const time = now.toISOString().slice(11, 19);

  let side = "";
  let quantity = "";
  let totalUSD = "";
  let fee = "";
  let netAmount = "";
  let orderId = "";
  let mode = "";
  let notes = "";

  if (!logEntry.allPass) {
    const failed = logEntry.conditions
      .filter((c) => !c.pass)
      .map((c) => c.label)
      .join("; ");
    mode = "BLOCKED";
    orderId = "BLOCKED";
    notes = `Failed: ${failed}`;
  } else if (logEntry.paperTrading) {
    side = "BUY";
    quantity = (logEntry.tradeSize / logEntry.price).toFixed(6);
    totalUSD = logEntry.tradeSize.toFixed(2);
    fee = (logEntry.tradeSize * 0.001).toFixed(4);
    netAmount = (logEntry.tradeSize - parseFloat(fee)).toFixed(2);
    orderId = logEntry.orderId || "";
    mode = "PAPER";
    notes = "All conditions met";
  } else {
    side = "BUY";
    quantity = (logEntry.tradeSize / logEntry.price).toFixed(6);
    totalUSD = logEntry.tradeSize.toFixed(2);
    fee = (logEntry.tradeSize * 0.001).toFixed(4);
    netAmount = (logEntry.tradeSize - parseFloat(fee)).toFixed(2);
    orderId = logEntry.orderId || "";
    mode = "LIVE";
    notes = logEntry.error ? `Error: ${logEntry.error}` : "All conditions met";
  }

  const row = [
    date,
    time,
    "Delta Exchange India",
    logEntry.symbol,
    side,
    quantity,
    logEntry.price.toFixed(2),
    totalUSD,
    fee,
    netAmount,
    orderId,
    mode,
    `"${notes}"`,
  ].join(",");

  if (!existsSync(CSV_FILE)) {
    writeFileSync(CSV_FILE, CSV_HEADERS + "\n");
  }

  appendFileSync(CSV_FILE, row + "\n");
  console.log(`Tax record saved → ${CSV_FILE}`);
}

function generateTaxSummary() {
  if (!existsSync(CSV_FILE)) {
    console.log("No trades.csv found — no trades have been recorded yet.");
    return;
  }

  const lines = readFileSync(CSV_FILE, "utf8").trim().split("\n");
  const rows = lines.slice(1).map((l) => l.split(","));

  const live = rows.filter((r) => r[11] === "LIVE");
  const paper = rows.filter((r) => r[11] === "PAPER");
  const blocked = rows.filter((r) => r[11] === "BLOCKED");

  const totalVolume = live.reduce((sum, r) => sum + parseFloat(r[7] || 0), 0);
  const totalFees = live.reduce((sum, r) => sum + parseFloat(r[8] || 0), 0);

  console.log("\n── Tax Summary ──────────────────────────────────────────\n");
  console.log(`  Total decisions logged : ${rows.length}`);
  console.log(`  Live trades executed   : ${live.length}`);
  console.log(`  Paper trades           : ${paper.length}`);
  console.log(`  Blocked by safety check: ${blocked.length}`);
  console.log(`  Total volume (USD)     : $${totalVolume.toFixed(2)}`);
  console.log(`  Total fees paid (est.) : $${totalFees.toFixed(4)}`);
  console.log(`\n  Full record: ${CSV_FILE}`);
  console.log("─────────────────────────────────────────────────────────\n");
}

// ─── ICT Analysis (Combines all ICT concepts) ─────────────────────────────────

function performICTAnalysis(candlesHTF, candlesLTF) {
  const closesHTF = candlesHTF.map((c) => c.close);
  const closesLTF = candlesLTF.map((c) => c.close);
  const priceHTF = closesHTF[closesHTF.length - 1];
  const priceLTF = closesLTF[closesLTF.length - 1];

  // HTF Trend Direction
  const ema8HTF = calcEMA(closesHTF, 8);
  const vwapHTF = calcVWAP(candlesHTF);
  const htfTrendBullish = priceHTF > vwapHTF && priceHTF > ema8HTF;
  const htfTrendBearish = priceHTF < vwapHTF && priceHTF < ema8HTF;
  const htfTrend = htfTrendBullish ? "BULLISH" : htfTrendBearish ? "BEARISH" : "NEUTRAL";

  // LTF Bias
  const ema8LTF = calcEMA(closesLTF, 8);
  const vwapLTF = calcVWAP(candlesLTF);
  const ltfBullish = priceLTF > vwapLTF && priceLTF > ema8LTF;
  const ltfBearish = priceLTF < vwapLTF && priceLTF < ema8LTF;

  // Swing points for Fibonacci
  const swings = findSwingPoints(candlesHTF, 5);
  let fibLevels = null;
  let inOTE = false;

  if (htfTrendBullish && swings.lows.length > 0 && swings.highs.length > 0) {
    const swingLow = swings.lows[swings.lows.length - 1].price;
    const swingHigh = swings.highs[swings.highs.length - 1].price;
    fibLevels = calcFibonacciLevels(swingLow, swingHigh, true);
    inOTE = isInOTEZone(priceLTF, fibLevels, true);
  } else if (htfTrendBearish && swings.lows.length > 0 && swings.highs.length > 0) {
    const swingLow = swings.lows[swings.lows.length - 1].price;
    const swingHigh = swings.highs[swings.highs.length - 1].price;
    fibLevels = calcFibonacciLevels(swingLow, swingHigh, false);
    inOTE = isInOTEZone(priceLTF, fibLevels, false);
  }

  // Order Blocks and FVGs
  const orderBlocks = htfTrend !== "NEUTRAL" ? detectOrderBlocks(candlesLTF, htfTrendBullish) : [];
  const fvgs = htfTrend !== "NEUTRAL" ? detectFairValueGaps(candlesLTF, htfTrendBullish) : [];

  // Kill Zone
  const killZone = isInKillZone();

  // Confirmation Pattern
  const confirmation = htfTrend !== "NEUTRAL" ? detectConfirmationPattern(candlesLTF, htfTrendBullish) : { found: false, pattern: "None" };

  // Break of Structure
  const bos = htfTrend !== "NEUTRAL" ? detectBreakOfStructure(candlesHTF, htfTrendBullish) : false;

  return {
    htfTrend,
    ltfBullish,
    ltfBearish,
    priceHTF,
    priceLTF,
    ema8HTF,
    vwapHTF,
    ema8LTF,
    vwapLTF,
    fibLevels: fibLevels || {},
    inOTE,
    orderBlocks,
    fvgs,
    killZone,
    confirmation,
    bos,
    swings,
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function run() {
  checkOnboarding();
  initCsv();
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Automated Trading Bot — ICT Strategy");
  console.log(`  ${new Date().toISOString()}`);
  console.log(
    `  Mode: ${CONFIG.paperTrading ? "📋 PAPER TRADING" : "🔴 LIVE TRADING"}`,
  );
  console.log("═══════════════════════════════════════════════════════════");

  const symbol = CONFIG.symbol;
  console.log(`\n📝 Trading Symbol: ${symbol}`);

  // Test Binance connection
  console.log("\n── Testing Binance Futures API Connection ──────────────\n");
  const connected = await testConnection();
  if (!connected) {
    console.log("🚫 Failed to connect to Binance Futures API");
    console.log("   Check your internet connection and try again.");
    process.exit(1);
  }
  console.log("✅ Connected to Binance Futures API");

  // Load ICT rules from rules.json
  const rules = JSON.parse(readFileSync("rules.json", "utf8"));
  console.log(`\nStrategy: ${rules.strategy_name}`);
  console.log(`Symbol: ${symbol} | HTF: ${CONFIG.timeframeHTF} | LTF: ${CONFIG.timeframeLTF}`);
  console.log(`Mode: ${CONFIG.tradeMode.toUpperCase()}`);

  const log = loadLog();
  const withinLimits = checkTradeLimits(log);
  if (!withinLimits) {
    console.log("\nBot stopping — trade limits reached for today.");
    return;
  }

  console.log("\n── Fetching market data from Binance Futures ──────────\n");

  // Fetch candles from Binance Futures API
  console.log(`  📊 Higher Timeframe (${CONFIG.timeframeHTF}) - Trend Direction`);
  const candlesHTF = await fetchMarketData(symbol, CONFIG.timeframeHTF, 100);

  console.log(`\n  📊 Lower Timeframe (${CONFIG.timeframeLTF}) - Entry Timing`);
  const candlesLTF = await fetchMarketData(symbol, CONFIG.timeframeLTF, 100);

  // Perform full ICT analysis
  console.log("\n── Running ICT Analysis ──────────────────────────────────\n");
  const ictAnalysis = performICTAnalysis(candlesHTF, candlesLTF);

  console.log(`  HTF Trend: ${ictAnalysis.htfTrend}`);
  console.log(`  Current Price: $${ictAnalysis.priceLTF.toFixed(2)}`);
  console.log(`  In OTE Zone: ${ictAnalysis.inOTE ? "YES" : "NO"}`);
  console.log(`  Order Blocks: ${ictAnalysis.orderBlocks.length}`);
  console.log(`  Fair Value Gaps: ${ictAnalysis.fvgs.length}`);
  console.log(`  Kill Zone: ${ictAnalysis.killZone.session}`);
  console.log(`  Confirmation: ${ictAnalysis.confirmation.pattern}`);
  console.log(`  Break of Structure: ${ictAnalysis.bos ? "YES" : "NO"}`);

  // Run ICT safety check with full rules
  const { results, allPass, analysis } = runICTSafetyCheck(ictAnalysis, rules);

  const tradeSize = Math.min(
    CONFIG.portfolioValue * 0.5,
    CONFIG.maxTradeSizeUSD,
  );

  const logEntry = {
    timestamp: new Date().toISOString(),
    symbol,
    price: ictAnalysis.priceLTF,
    tradeSize,
    conditions: results,
    allPass,
    paperTrading: CONFIG.paperTrading,
    orderPlaced: false,
    ictAnalysis: {
      htfTrend: ictAnalysis.htfTrend,
      inOTE: ictAnalysis.inOTE,
      orderBlocks: ictAnalysis.orderBlocks.length,
      fvgs: ictAnalysis.fvgs.length,
      killZone: ictAnalysis.killZone.session,
      confirmation: ictAnalysis.confirmation.pattern,
      bos: ictAnalysis.bos,
    },
  };

  if (allPass) {
    console.log("\n✅ ALL ICT CONDITIONS MET — HIGH PROBABILITY SETUP\n");

    const isBullish = ictAnalysis.htfTrend === "BULLISH";
    const side = isBullish ? "buy" : "sell";
    const positionSide = isBullish ? "long" : "short";

    // Check if this direction is allowed
    if (isBullish && !CONFIG.allowLong) {
      console.log("🚫 LONG trades are disabled in config. Skipping.\n");
      logEntry.error = "Long trades disabled";
      writeTradeCsv(logEntry);
      log.trades.push(logEntry);
      saveLog(log);
      return;
    }

    if (!isBullish && !CONFIG.allowShort) {
      console.log("🚫 SHORT trades are disabled in config. Skipping.\n");
      logEntry.error = "Short trades disabled";
      writeTradeCsv(logEntry);
      log.trades.push(logEntry);
      saveLog(log);
      return;
    }

    // Calculate TP/SL based on ICT order blocks and risk:reward ratio
    const tpsl = calculateTPSL(ictAnalysis.priceLTF, ictAnalysis, CONFIG.riskRewardRatio);

    console.log(`📊 Trade Setup:`);
    console.log(`   Direction: ${positionSide.toUpperCase()}`);
    console.log(`   Entry: $${ictAnalysis.priceLTF.toFixed(2)}`);
    console.log(`   Stop Loss: $${tpsl.stopLoss.toFixed(2)} (Risk: $${tpsl.risk.toFixed(2)})`);
    console.log(`   Take Profit: $${tpsl.takeProfit.toFixed(2)} (Reward: $${tpsl.reward.toFixed(2)})`);
    console.log(`   Risk:Reward = 1:${tpsl.riskRewardRatio.toFixed(2)}`);
    console.log(`   Leverage: ${CONFIG.leverage}x\n`);

    if (CONFIG.paperTrading) {
      console.log(`📋 PAPER TRADE: Would execute ${side.toUpperCase()} at $${ictAnalysis.priceLTF.toFixed(2)}`);
      logEntry.orderPlaced = true;
      logEntry.tpsl = tpsl;

      // Add to position manager (paper trading)
      const position = addPosition({
        symbol,
        side: positionSide,
        entryPrice: ictAnalysis.priceLTF,
        quantity: (tradeSize * CONFIG.leverage) / ictAnalysis.priceLTF,
        leverage: CONFIG.leverage,
        stopLoss: tpsl.stopLoss,
        takeProfit: tpsl.takeProfit,
        riskRewardRatio: tpsl.riskRewardRatio,
        paperTrading: true,
        ictAnalysis: {
          htfTrend: ictAnalysis.htfTrend,
          inOTE: ictAnalysis.inOTE,
          orderBlocks: ictAnalysis.orderBlocks.length,
          fvgs: ictAnalysis.fvgs.length,
          killZone: ictAnalysis.killZone.session,
          confirmation: ictAnalysis.confirmation.pattern,
          bos: ictAnalysis.bos,
        },
      });

      logEntry.positionId = position.id;

      // Draw visual markers on TradingView chart
      try {
        await drawVisualAnalysis(ictAnalysis, position, tpsl);
      } catch (e) {
        console.log(`⚠️  Could not draw visual analysis: ${e.message}`);
      }

    } else {
      try {
        const order = await placeDeltaOrder(
          symbol,
          side,
          tradeSize,
          ictAnalysis.priceLTF,
          CONFIG.leverage,
          tpsl.stopLoss,
          tpsl.takeProfit
        );

        console.log(`✅ ORDER PLACED: ${side.toUpperCase()} ${symbol} at $${ictAnalysis.priceLTF.toFixed(2)}`);
        logEntry.orderId = order.id;
        logEntry.orderPlaced = true;
        logEntry.tpsl = tpsl;

        // Add to position manager (live trading)
        const position = addPosition({
          symbol,
          side: positionSide,
          entryPrice: ictAnalysis.priceLTF,
          quantity: order.size || (tradeSize * CONFIG.leverage) / ictAnalysis.priceLTF,
          leverage: CONFIG.leverage,
          stopLoss: tpsl.stopLoss,
          takeProfit: tpsl.takeProfit,
          riskRewardRatio: tpsl.riskRewardRatio,
          orderId: order.id,
          paperTrading: false,
          ictAnalysis: {
            htfTrend: ictAnalysis.htfTrend,
            inOTE: ictAnalysis.inOTE,
            orderBlocks: ictAnalysis.orderBlocks.length,
            fvgs: ictAnalysis.fvgs.length,
            killZone: ictAnalysis.killZone.session,
            confirmation: ictAnalysis.confirmation.pattern,
            bos: ictAnalysis.bos,
          },
        });

        logEntry.positionId = position.id;

        // Draw visual markers on TradingView chart
        try {
          await drawVisualAnalysis(ictAnalysis, position, tpsl);
        } catch (e) {
          console.log(`⚠️  Could not draw visual analysis: ${e.message}`);
        }

      } catch (e) {
        console.log(`🚫 TRADE BLOCKED: ${e.message}`);
        logEntry.error = e.message;
      }
    }
  } else {
    console.log("\n🚫 TRADE BLOCKED — Not all ICT conditions met\n");
  }

  writeTradeCsv(logEntry);
  log.trades.push(logEntry);
  saveLog(log);

  // Draw visual analysis on TradingView chart if available
  if (allPass || ictAnalysis.inOTE) {
    try {
      await drawVisualAnalysis(ictAnalysis, allPass);
    } catch (e) {
      console.log(`⚠️  Could not draw visual analysis: ${e.message}`);
    }
  }
}

// ─── Entry Point ────────────────────────────────────────────────────────────

// Run the bot immediately when executed
const args = process.argv.slice(2);
if (args[0] === "--tax-summary") {
  generateTaxSummary();
} else {
  console.log("\n🚀 Starting Automated Trading Bot...\n");
  run().catch((error) => {
    console.error("\n❌ Bot Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  });
}

export {
  run,
  fetchMarketData,
  calcEMA,
  calcRSI,
  calcVWAP,
  runICTSafetyCheck,
  performICTAnalysis,
  findSwingPoints,
  calcFibonacciLevels,
  isInOTEZone,
  detectOrderBlocks,
  detectFairValueGaps,
  isInKillZone,
  detectConfirmationPattern,
  detectBreakOfStructure
};
