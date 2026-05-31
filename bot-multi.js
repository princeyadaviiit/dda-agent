/**
 * Multi-Strategy Automated Trading Bot
 *
 * Supports 6 different trading strategies with OR logic:
 * - Strategy 1: ICT + Fibonacci OTE (original)
 * - Strategy 2: CISD (Candle in Supply/Demand)
 * - Strategy 3: FVG + CISD Combined
 * - Strategy 4: Fibonacci Retracement
 * - Strategy 5: SMT Divergence
 * - Strategy 6: Placeholder (future)
 *
 * Execution Logic: If ANY enabled strategy passes, execute the trade.
 *
 * Usage: node bot-multi.js
 */

import "dotenv/config";
import { readFileSync, writeFileSync, existsSync, appendFileSync } from "fs";
import crypto from "crypto";
import { execSync } from "child_process";
import { analyzeAllStrategies, getEnabledStrategies, getStrategyRiskMultiplier } from "./strategy-manager.js";
import {
  calculatePositionSize,
  calculateTPSL,
  validateRiskManagement,
  loadRiskConfig,
  calculateDailyPnL,
  formatRiskSummary,
} from "./risk-calculator.js";
import { addPosition } from "./position-manager.js";
import { drawVisualAnalysis } from "./visual-analysis.js";
import {
  fetchCandles,
  getCurrentPrice,
  testConnection,
  convertTimeframeToBinanceInterval,
  convertSymbolToBinance,
} from "./binance-client.js";

// ─── Config ────────────────────────────────────────────────────────────────

const CONFIG = {
  symbol: process.env.SYMBOL || "BTCUSD",
  timeframeHTF: process.env.TIMEFRAME_HTF || "4H",
  timeframeLTF: process.env.TIMEFRAME_LTF || "15m",
  paperTrading: process.env.PAPER_TRADING !== "false",
  tradeMode: process.env.TRADE_MODE || "futures",
  allowLong: process.env.ALLOW_LONG !== "false",
  allowShort: process.env.ALLOW_SHORT !== "false",
  delta: {
    apiKey: process.env.DELTA_API_KEY,
    apiSecret: process.env.DELTA_API_SECRET,
    baseUrl: process.env.DELTA_BASE_URL || "https://api.india.delta.exchange",
  },
};

const LOG_FILE = "safety-check-log.json";
const CSV_FILE = "trades.csv";

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

// ─── Market Data ────────────────────────────────────────────────────────────

async function fetchMarketData(symbol, timeframe, limit = 100) {
  const binanceSymbol = convertSymbolToBinance(symbol);
  const binanceInterval = convertTimeframeToBinanceInterval(timeframe);

  console.log(`  📊 Fetching ${limit} candles for ${binanceSymbol} (${binanceInterval})...`);

  try {
    const candles = await fetchCandles(binanceSymbol, binanceInterval, limit);
    console.log(`  ✅ Loaded ${candles.length} candles`);
    return candles;
  } catch (error) {
    throw new Error(`Failed to fetch market data: ${error.message}`);
  }
}

// ─── Trade Limits ────────────────────────────────────────────────────────────

function checkTradeLimits(log, riskConfig) {
  const todayCount = countTodaysTrades(log);

  console.log("\n── Trade Limits ─────────────────────────────────────────\n");

  if (todayCount >= riskConfig.maxTradesPerDay) {
    console.log(
      `🚫 Max trades per day reached: ${todayCount}/${riskConfig.maxTradesPerDay}`,
    );
    return false;
  }

  console.log(
    `✅ Trades today: ${todayCount}/${riskConfig.maxTradesPerDay} — within limit`,
  );

  // Check daily loss limit
  const dailyPnL = calculateDailyPnL(log.trades);
  if (Math.abs(dailyPnL.totalPnLPercent) >= riskConfig.maxDailyLossPercent) {
    console.log(
      `🚫 Max daily loss reached: ${dailyPnL.totalPnLPercent.toFixed(2)}% / ${riskConfig.maxDailyLossPercent}%`,
    );
    return false;
  }

  console.log(
    `✅ Daily P&L: ${dailyPnL.totalPnLPercent.toFixed(2)}% — within limit`,
  );

  return true;
}

// ─── Delta Exchange Execution ────────────────────────────────────────────────

function signDelta(method, timestamp, path, body = "") {
  const message = method + timestamp + path + body;
  return crypto
    .createHmac("sha256", CONFIG.delta.apiSecret)
    .update(message)
    .digest("hex");
}

async function placeDeltaOrder(symbol, side, quantity, price, leverage, stopLoss, takeProfit) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const path = "/v2/orders";

  const orderPayload = {
    product_id: symbol,
    size: quantity.toString(),
    side: side, // "buy" or "sell"
    order_type: "market_order",
    time_in_force: "ioc",
    leverage: leverage.toString(),
  };

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

function initCsv() {
  if (!existsSync(CSV_FILE)) {
    const headers = [
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
      "Strategy",
      "Notes",
    ].join(",");
    writeFileSync(CSV_FILE, headers + "\n");
    console.log(`📄 Created ${CSV_FILE}`);
  }
}

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
  let strategy = "";
  let notes = "";

  if (!logEntry.allPass) {
    mode = "BLOCKED";
    orderId = "BLOCKED";
    strategy = logEntry.strategyId ? `Strategy ${logEntry.strategyId}` : "N/A";
    notes = `Failed conditions`;
  } else if (logEntry.paperTrading) {
    side = logEntry.side?.toUpperCase() || "BUY";
    quantity = logEntry.quantity?.toFixed(6) || "0";
    totalUSD = logEntry.positionSize?.toFixed(2) || "0";
    fee = (parseFloat(totalUSD) * 0.001).toFixed(4);
    netAmount = (parseFloat(totalUSD) - parseFloat(fee)).toFixed(2);
    orderId = logEntry.orderId || "PAPER";
    mode = "PAPER";
    strategy = `Strategy ${logEntry.strategyId}`;
    notes = "All conditions met";
  } else {
    side = logEntry.side?.toUpperCase() || "BUY";
    quantity = logEntry.quantity?.toFixed(6) || "0";
    totalUSD = logEntry.positionSize?.toFixed(2) || "0";
    fee = (parseFloat(totalUSD) * 0.001).toFixed(4);
    netAmount = (parseFloat(totalUSD) - parseFloat(fee)).toFixed(2);
    orderId = logEntry.orderId || "";
    mode = "LIVE";
    strategy = `Strategy ${logEntry.strategyId}`;
    notes = logEntry.error ? `Error: ${logEntry.error}` : "All conditions met";
  }

  const row = [
    date,
    time,
    "Delta Exchange India",
    logEntry.symbol,
    side,
    quantity,
    logEntry.price?.toFixed(2) || "0",
    totalUSD,
    fee,
    netAmount,
    orderId,
    mode,
    strategy,
    `"${notes}"`,
  ].join(",");

  appendFileSync(CSV_FILE, row + "\n");
  console.log(`Tax record saved → ${CSV_FILE}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function run() {
  initCsv();
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Multi-Strategy Automated Trading Bot");
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
    process.exit(1);
  }
  console.log("✅ Connected to Binance Futures API");

  // Load risk management config
  const riskConfig = loadRiskConfig();

  // Show enabled strategies
  const enabledStrategies = getEnabledStrategies();
  console.log(`\n── Enabled Strategies ───────────────────────────────────\n`);
  enabledStrategies.forEach(s => {
    console.log(`  ${s.id}. ${s.name}`);
  });

  const log = loadLog();
  const withinLimits = checkTradeLimits(log, riskConfig);
  if (!withinLimits) {
    console.log("\nBot stopping — trade limits reached for today.");
    return;
  }

  console.log("\n── Fetching Market Data ─────────────────────────────────\n");

  // Fetch candles from Binance
  console.log(`  📊 Higher Timeframe (${CONFIG.timeframeHTF}) - Trend Direction`);
  const candlesHTF = await fetchMarketData(symbol, CONFIG.timeframeHTF, 100);

  console.log(`\n  📊 Lower Timeframe (${CONFIG.timeframeLTF}) - Entry Timing`);
  const candlesLTF = await fetchMarketData(symbol, CONFIG.timeframeLTF, 100);

  const marketData = {
    candlesHTF,
    candlesLTF,
    symbol,
  };

  // Run multi-strategy analysis
  const strategyResult = await analyzeAllStrategies(marketData, CONFIG);

  // Handle case where no strategy passed
  if (!strategyResult || strategyResult.success === false) {
    console.log("\n🚫 No strategy generated valid signal\n");

    // Flatten all conditions from all strategies for dashboard display
    const allConditions = [];
    if (strategyResult && strategyResult.allValidations) {
      strategyResult.allValidations.forEach(validation => {
        // Add strategy header
        allConditions.push({
          label: `━━━ Strategy ${validation.strategyId}: ${validation.strategyName} ━━━`,
          required: `${validation.passedConditions}/${validation.totalConditions} conditions passed`,
          actual: validation.isValid ? "VALID" : "FAILED",
          pass: validation.isValid,
        });
        // Add all conditions from this strategy
        validation.conditions.forEach(c => {
          allConditions.push(c);
        });
      });
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      symbol,
      price: candlesLTF[candlesLTF.length - 1].close,
      allPass: false,
      paperTrading: CONFIG.paperTrading,
      orderPlaced: false,
      conditions: allConditions.length > 0 ? allConditions : [
        { label: "Strategy Signal", required: "At least one strategy passes", actual: "No strategy passed", pass: false }
      ],
      strategiesChecked: strategyResult?.allValidations?.length || 0,
    };

    writeTradeCsv(logEntry);
    log.trades.push(logEntry);
    saveLog(log);
    return;
  }

  // Extract signal from strategy result
  const { strategyId, strategyName, signal, validation } = strategyResult;

  console.log(`\n✅ Strategy ${strategyId} (${strategyName}) generated valid signal\n`);
  console.log(`   Direction: ${signal.side.toUpperCase()}`);
  console.log(`   Entry Price: $${signal.entryPrice.toFixed(2)}`);
  console.log(`   Conditions Passed: ${validation.passedConditions}/${validation.totalConditions}\n`);

  // Check if direction is allowed
  if (signal.side === "long" && !CONFIG.allowLong) {
    console.log("🚫 LONG trades are disabled in config. Skipping.\n");
    return;
  }

  if (signal.side === "short" && !CONFIG.allowShort) {
    console.log("🚫 SHORT trades are disabled in config. Skipping.\n");
    return;
  }

  // Calculate TP/SL
  const tpsl = calculateTPSL({
    entryPrice: signal.entryPrice,
    side: signal.side,
    orderBlocks: signal.orderBlocks || [],
    riskRewardRatio: riskConfig.riskRewardRatio,
    slBufferPips: riskConfig.slBufferPips,
    tpStrategy: riskConfig.tpStrategy,
    previousHigh: signal.previousHigh,
    previousLow: signal.previousLow,
  });

  // Get strategy risk multiplier
  const strategyRiskMultiplier = getStrategyRiskMultiplier(strategyId);

  // Calculate position size
  const positionSize = calculatePositionSize({
    portfolioValue: riskConfig.portfolioValue,
    entryPrice: signal.entryPrice,
    stopLoss: tpsl.stopLoss,
    leverage: riskConfig.leverage,
    riskPerTradePercent: riskConfig.riskPerTradePercent,
    maxPortfolioPercent: riskConfig.maxPortfolioPercent,
    maxTradeSizeUSD: riskConfig.maxTradeSizeUSD,
    positionSizingMethod: riskConfig.positionSizingMethod,
    strategyRiskMultiplier,
  });

  // Validate risk management
  const dailyPnL = calculateDailyPnL(log.trades);
  const riskValidation = validateRiskManagement({
    portfolioValue: riskConfig.portfolioValue,
    marginUsed: positionSize.marginUsed,
    actualRiskPercent: positionSize.actualRiskPercent,
    riskRewardRatio: tpsl.riskRewardRatio,
    maxPortfolioPercent: riskConfig.maxPortfolioPercent,
    maxDailyLossPercent: riskConfig.maxDailyLossPercent,
    currentDailyLoss: Math.abs(dailyPnL.totalPnLPercent),
    minRiskRewardRatio: riskConfig.riskRewardRatio,
  });

  if (!riskValidation.isValid) {
    console.log("\n🚫 TRADE BLOCKED — Risk management validation failed\n");
    riskValidation.issues.forEach(issue => console.log(`   • ${issue}`));
    console.log();

    const logEntry = {
      timestamp: new Date().toISOString(),
      symbol,
      price: signal.entryPrice,
      allPass: false,
      paperTrading: CONFIG.paperTrading,
      orderPlaced: false,
      strategyId,
      strategyName,
      error: riskValidation.issues.join("; "),
    };

    writeTradeCsv(logEntry);
    log.trades.push(logEntry);
    saveLog(log);
    return;
  }

  // Display risk summary
  console.log(formatRiskSummary(positionSize, tpsl));

  const logEntry = {
    timestamp: new Date().toISOString(),
    symbol,
    price: signal.entryPrice,
    side: signal.side,
    quantity: positionSize.quantity,
    positionSize: positionSize.positionSize,
    marginUsed: positionSize.marginUsed,
    leverage: riskConfig.leverage,
    stopLoss: tpsl.stopLoss,
    takeProfit: tpsl.takeProfit,
    riskRewardRatio: tpsl.riskRewardRatio,
    allPass: true,
    paperTrading: CONFIG.paperTrading,
    orderPlaced: false,
    strategyId,
    strategyName,
    conditions: validation.conditions,
  };

  if (CONFIG.paperTrading) {
    console.log(`📋 PAPER TRADE: Would execute ${signal.side.toUpperCase()} at $${signal.entryPrice.toFixed(2)}`);
    logEntry.orderPlaced = true;
    logEntry.orderId = `PAPER-${Date.now()}`;

    // Add to position manager
    const position = addPosition({
      symbol,
      side: signal.side,
      entryPrice: signal.entryPrice,
      quantity: positionSize.quantity,
      leverage: riskConfig.leverage,
      stopLoss: tpsl.stopLoss,
      takeProfit: tpsl.takeProfit,
      riskRewardRatio: tpsl.riskRewardRatio,
      paperTrading: true,
      strategyId,
      strategyName,
    });

    logEntry.positionId = position.id;

    // Draw visual analysis (optional)
    try {
      await drawVisualAnalysis(strategyResult.analysis, position, tpsl);
    } catch (e) {
      console.log(`⚠️  Could not draw visual analysis: ${e.message}`);
    }

  } else {
    try {
      const deltaSide = signal.side === "long" ? "buy" : "sell";

      const order = await placeDeltaOrder(
        symbol,
        deltaSide,
        positionSize.quantity,
        signal.entryPrice,
        riskConfig.leverage,
        tpsl.stopLoss,
        tpsl.takeProfit
      );

      console.log(`✅ ORDER PLACED: ${signal.side.toUpperCase()} ${symbol} at $${signal.entryPrice.toFixed(2)}`);
      logEntry.orderId = order.id;
      logEntry.orderPlaced = true;

      // Add to position manager
      const position = addPosition({
        symbol,
        side: signal.side,
        entryPrice: signal.entryPrice,
        quantity: order.size || positionSize.quantity,
        leverage: riskConfig.leverage,
        stopLoss: tpsl.stopLoss,
        takeProfit: tpsl.takeProfit,
        riskRewardRatio: tpsl.riskRewardRatio,
        orderId: order.id,
        paperTrading: false,
        strategyId,
        strategyName,
      });

      logEntry.positionId = position.id;

      // Draw visual analysis (optional)
      try {
        await drawVisualAnalysis(strategyResult.analysis, position, tpsl);
      } catch (e) {
        console.log(`⚠️  Could not draw visual analysis: ${e.message}`);
      }

    } catch (e) {
      console.log(`🚫 TRADE BLOCKED: ${e.message}`);
      logEntry.error = e.message;
      logEntry.orderPlaced = false;
    }
  }

  writeTradeCsv(logEntry);
  log.trades.push(logEntry);
  saveLog(log);
}

// ─── Entry Point ────────────────────────────────────────────────────────────

console.log("\n🚀 Starting Multi-Strategy Trading Bot...\n");
run().catch((error) => {
  console.error("\n❌ Bot Error:", error.message);
  console.error(error.stack);
  process.exit(1);
});
