/**
 * Strategy 1: ICT + Fibonacci OTE
 *
 * Original ICT strategy with:
 * - Order Blocks
 * - Fair Value Gaps
 * - Fibonacci OTE Zone (0.618-0.786)
 * - Kill Zones (London/NY sessions)
 * - Break of Structure
 * - Confirmation patterns
 */

import {
  calcEMA,
  calcVWAP,
  findSwingPoints,
  calcFibonacciLevels,
  isInOTEZone,
  detectOrderBlocks,
  detectFairValueGaps,
  isInKillZone,
  detectConfirmationPattern,
  detectBreakOfStructure,
} from "../bot.js";

/**
 * Analyze market data using ICT + Fibonacci OTE strategy
 * @param {Object} marketData - Market data from Binance
 * @param {Object} config - Bot configuration
 * @returns {Promise<Object>} - Analysis result
 */
export async function analyze(marketData, config) {
  const { candlesHTF, candlesLTF } = marketData;

  const closesHTF = candlesHTF.map(c => c.close);
  const closesLTF = candlesLTF.map(c => c.close);
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

/**
 * Validate entry conditions for ICT + Fibonacci OTE strategy
 * @param {Object} analysis - Analysis result from analyze()
 * @param {Object} config - Bot configuration
 * @returns {Promise<Object>} - Validation result
 */
export async function validate(analysis, config) {
  const conditions = [];
  const isBullish = analysis.htfTrend === "BULLISH";

  const check = (label, required, actual, pass) => {
    conditions.push({ label, required, actual, pass });
  };

  // Step 1: HTF Trend Direction
  check(
    "HTF Trend Direction",
    "Clear bullish or bearish trend",
    analysis.htfTrend,
    analysis.htfTrend !== "NEUTRAL"
  );

  if (analysis.htfTrend === "NEUTRAL") {
    return {
      isValid: false,
      conditions,
      passedConditions: 0,
      totalConditions: 1,
      signal: null,
    };
  }

  // Step 2: Break of Structure (BOS)
  check(
    "Break of Structure (BOS)",
    "BOS in trend direction",
    analysis.bos ? "Confirmed" : "Not found",
    analysis.bos
  );

  // Step 3: Fibonacci OTE Zone (0.618-0.786)
  check(
    "Fibonacci OTE Zone",
    "Price in 0.618-0.786 retracement",
    analysis.inOTE ? `In OTE` : "Outside OTE",
    analysis.inOTE
  );

  // Step 4: Order Block Confluence
  check(
    "Order Block",
    "Order block present in setup area",
    analysis.orderBlocks.length > 0 ? `${analysis.orderBlocks.length} found` : "None",
    analysis.orderBlocks.length > 0
  );

  // Step 5: Fair Value Gap (FVG)
  check(
    "Fair Value Gap (FVG)",
    "FVG present for confluence",
    analysis.fvgs.length > 0 ? `${analysis.fvgs.length} found` : "None",
    analysis.fvgs.length > 0
  );

  // Step 6: Kill Zone Timing
  check(
    "Kill Zone",
    "London (07:00-10:00 GMT) or NY (13:00-16:00 GMT)",
    analysis.killZone.session,
    analysis.killZone.inKillZone
  );

  // Step 7: Confirmation Candle Pattern
  check(
    "Confirmation Pattern",
    isBullish ? "Bullish engulfing/hammer/rejection" : "Bearish engulfing/shooting star/rejection",
    analysis.confirmation.pattern,
    analysis.confirmation.found
  );

  // Step 8: Timeframe Alignment
  const biasAligned = isBullish ? analysis.ltfBullish : analysis.ltfBearish;
  check(
    "Timeframe Alignment",
    `LTF bias matches HTF ${analysis.htfTrend}`,
    biasAligned ? "Aligned" : "Not aligned",
    biasAligned
  );

  // Step 9: Confluence Check (OTE + Order Block + FVG)
  const hasConfluence = analysis.inOTE && analysis.orderBlocks.length > 0 && analysis.fvgs.length > 0;
  check(
    "Confluence",
    "OTE + Order Block + FVG",
    hasConfluence ? "All 3 present" : "Missing elements",
    hasConfluence
  );

  // Calculate pass rate
  const totalConditions = conditions.length;
  const passedConditions = conditions.filter(c => c.pass).length;
  const passPercentage = (passedConditions / totalConditions) * 100;
  const majorityPass = passedConditions > (totalConditions / 2); // More than 50%

  // Generate trade signal if majority pass
  let signal = null;
  if (majorityPass) {
    signal = {
      side: isBullish ? "long" : "short",
      entryPrice: analysis.priceLTF,
      orderBlocks: analysis.orderBlocks,
      fibLevels: analysis.fibLevels,
      previousHigh: analysis.swings.highs.length > 0 ? analysis.swings.highs[analysis.swings.highs.length - 1].price : null,
      previousLow: analysis.swings.lows.length > 0 ? analysis.swings.lows[analysis.swings.lows.length - 1].price : null,
    };
  }

  return {
    isValid: majorityPass,
    conditions,
    passedConditions,
    totalConditions,
    passPercentage,
    signal,
  };
}
