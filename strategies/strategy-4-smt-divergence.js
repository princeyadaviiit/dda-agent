/**
 * Strategy 5: SMT (Smart Money Tool) Divergence
 *
 * Compares two correlated assets (BTC vs ETH) for divergence signals.
 * When one asset fails to make a new high/low while the other does,
 * it signals a potential trend reversal.
 */

import { fetchCandles, convertSymbolToBinance, convertTimeframeToBinanceInterval } from "../binance-client.js";

/**
 * Find recent swing highs and lows
 * @param {Array} candles - Candle data
 * @param {number} lookback - Lookback period
 * @returns {Object} - Most recent swing high and low
 */
function findRecentSwings(candles, lookback = 5) {
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

    if (isSwingHigh) swings.highs.push({ index: i, price: candles[i].high, time: candles[i].time });
    if (isSwingLow) swings.lows.push({ index: i, price: candles[i].low, time: candles[i].time });
  }

  return {
    recentHigh: swings.highs.length > 0 ? swings.highs[swings.highs.length - 1] : null,
    recentLow: swings.lows.length > 0 ? swings.lows[swings.lows.length - 1] : null,
    previousHigh: swings.highs.length > 1 ? swings.highs[swings.highs.length - 2] : null,
    previousLow: swings.lows.length > 1 ? swings.lows[swings.lows.length - 2] : null,
  };
}

/**
 * Detect bullish divergence (price makes lower low, but secondary asset doesn't)
 * @param {Object} primarySwings - Primary asset swings
 * @param {Object} secondarySwings - Secondary asset swings
 * @returns {Object} - Divergence info
 */
function detectBullishDivergence(primarySwings, secondarySwings) {
  // Check if primary made new lower low
  if (!primarySwings.recentLow || !primarySwings.previousLow) {
    return { found: false, reason: "Insufficient primary swing lows" };
  }

  if (!secondarySwings.recentLow || !secondarySwings.previousLow) {
    return { found: false, reason: "Insufficient secondary swing lows" };
  }

  const primaryMadeLowerLow = primarySwings.recentLow.price < primarySwings.previousLow.price;
  const secondaryFailedLowerLow = secondarySwings.recentLow.price >= secondarySwings.previousLow.price;

  if (primaryMadeLowerLow && secondaryFailedLowerLow) {
    return {
      found: true,
      type: "bullish",
      primaryLow: primarySwings.recentLow.price,
      secondaryLow: secondarySwings.recentLow.price,
      divergenceStrength: Math.abs(
        ((primarySwings.recentLow.price - primarySwings.previousLow.price) / primarySwings.previousLow.price) * 100
      ),
    };
  }

  return { found: false, reason: "No bullish divergence detected" };
}

/**
 * Detect bearish divergence (price makes higher high, but secondary asset doesn't)
 * @param {Object} primarySwings - Primary asset swings
 * @param {Object} secondarySwings - Secondary asset swings
 * @returns {Object} - Divergence info
 */
function detectBearishDivergence(primarySwings, secondarySwings) {
  // Check if primary made new higher high
  if (!primarySwings.recentHigh || !primarySwings.previousHigh) {
    return { found: false, reason: "Insufficient primary swing highs" };
  }

  if (!secondarySwings.recentHigh || !secondarySwings.previousHigh) {
    return { found: false, reason: "Insufficient secondary swing highs" };
  }

  const primaryMadeHigherHigh = primarySwings.recentHigh.price > primarySwings.previousHigh.price;
  const secondaryFailedHigherHigh = secondarySwings.recentHigh.price <= secondarySwings.previousHigh.price;

  if (primaryMadeHigherHigh && secondaryFailedHigherHigh) {
    return {
      found: true,
      type: "bearish",
      primaryHigh: primarySwings.recentHigh.price,
      secondaryHigh: secondarySwings.recentHigh.price,
      divergenceStrength: Math.abs(
        ((primarySwings.recentHigh.price - primarySwings.previousHigh.price) / primarySwings.previousHigh.price) * 100
      ),
    };
  }

  return { found: false, reason: "No bearish divergence detected" };
}

/**
 * Detect reversal pattern on LTF
 * @param {Array} candles - Recent candles
 * @param {boolean} isBullish - Looking for bullish or bearish reversal
 * @returns {Object} - Pattern info
 */
function detectReversalPattern(candles, isBullish) {
  if (candles.length < 2) return { found: false, pattern: "None" };

  const current = candles[candles.length - 1];
  const previous = candles[candles.length - 2];

  const currentBody = Math.abs(current.close - current.open);

  if (isBullish) {
    // Bullish engulfing
    const isBullishEngulfing =
      current.close > current.open &&
      previous.close < previous.open &&
      current.open <= previous.close &&
      current.close >= previous.open;

    if (isBullishEngulfing) return { found: true, pattern: "Bullish Engulfing" };

    // Hammer
    const isHammer =
      current.close > current.open &&
      (current.low < current.open - currentBody * 2) &&
      (current.high - current.close < currentBody * 0.3);

    if (isHammer) return { found: true, pattern: "Hammer" };

    // Break of Structure to upside
    const bos = current.close > previous.high * 1.001;
    if (bos) return { found: true, pattern: "BOS to Upside" };

  } else {
    // Bearish engulfing
    const isBearishEngulfing =
      current.close < current.open &&
      previous.close > previous.open &&
      current.open >= previous.close &&
      current.close <= previous.open;

    if (isBearishEngulfing) return { found: true, pattern: "Bearish Engulfing" };

    // Shooting star
    const isShootingStar =
      current.close < current.open &&
      (current.high > current.open + currentBody * 2) &&
      (current.close - current.low < currentBody * 0.3);

    if (isShootingStar) return { found: true, pattern: "Shooting Star" };

    // Break of Structure to downside
    const bos = current.close < previous.low * 0.999;
    if (bos) return { found: true, pattern: "BOS to Downside" };
  }

  return { found: false, pattern: "None" };
}

/**
 * Calculate correlation coefficient between two assets
 * @param {Array} prices1 - First asset prices
 * @param {Array} prices2 - Second asset prices
 * @returns {number} - Correlation coefficient (-1 to 1)
 */
function calculateCorrelation(prices1, prices2) {
  const n = Math.min(prices1.length, prices2.length);
  if (n < 2) return 0;

  const mean1 = prices1.slice(-n).reduce((a, b) => a + b, 0) / n;
  const mean2 = prices2.slice(-n).reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let sum1 = 0;
  let sum2 = 0;

  for (let i = 0; i < n; i++) {
    const diff1 = prices1[prices1.length - n + i] - mean1;
    const diff2 = prices2[prices2.length - n + i] - mean2;
    numerator += diff1 * diff2;
    sum1 += diff1 * diff1;
    sum2 += diff2 * diff2;
  }

  const denominator = Math.sqrt(sum1 * sum2);
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Analyze market data using SMT Divergence strategy
 * @param {Object} marketData - Market data from Binance
 * @param {Object} config - Bot configuration
 * @returns {Promise<Object>} - Analysis result
 */
export async function analyze(marketData, config) {
  const { candlesHTF, candlesLTF, symbol } = marketData;

  // Get secondary symbol from config
  const secondarySymbol = process.env.SMT_SECONDARY_SYMBOL || "ETHUSD";

  // Fetch secondary asset data
  const binanceSecondary = convertSymbolToBinance(secondarySymbol);
  const binanceInterval = convertTimeframeToBinanceInterval(config.timeframeHTF);

  let secondaryCandlesHTF;
  try {
    secondaryCandlesHTF = await fetchCandles(binanceSecondary, binanceInterval, 100);
  } catch (error) {
    return {
      error: `Failed to fetch secondary asset data: ${error.message}`,
      divergence: { found: false },
    };
  }

  // Find swings for both assets
  const primarySwings = findRecentSwings(candlesHTF, 5);
  const secondarySwings = findRecentSwings(secondaryCandlesHTF, 5);

  // Check correlation
  const primaryPrices = candlesHTF.map(c => c.close);
  const secondaryPrices = secondaryCandlesHTF.map(c => c.close);
  const correlation = calculateCorrelation(primaryPrices, secondaryPrices);

  // Detect divergence
  const bullishDivergence = detectBullishDivergence(primarySwings, secondarySwings);
  const bearishDivergence = detectBearishDivergence(primarySwings, secondarySwings);

  const divergence = bullishDivergence.found ? bullishDivergence : bearishDivergence.found ? bearishDivergence : { found: false };

  // If divergence found, check for LTF reversal confirmation
  let reversalPattern = { found: false, pattern: "None" };
  if (divergence.found) {
    const isBullish = divergence.type === "bullish";
    reversalPattern = detectReversalPattern(candlesLTF, isBullish);
  }

  const currentPriceLTF = candlesLTF[candlesLTF.length - 1].close;

  return {
    primarySymbol: symbol,
    secondarySymbol,
    primarySwings,
    secondarySwings,
    correlation,
    divergence,
    reversalPattern,
    currentPriceLTF,
  };
}

/**
 * Validate entry conditions for SMT Divergence strategy
 * @param {Object} analysis - Analysis result from analyze()
 * @param {Object} config - Bot configuration
 * @returns {Promise<Object>} - Validation result
 */
export async function validate(analysis, config) {
  const conditions = [];

  const check = (label, required, actual, pass) => {
    conditions.push({ label, required, actual, pass });
  };

  // Check for errors
  if (analysis.error) {
    return {
      isValid: false,
      conditions: [{ label: "Data Fetch", required: "Secondary asset data", actual: analysis.error, pass: false }],
      passedConditions: 0,
      totalConditions: 1,
      signal: null,
    };
  }

  // Check if divergence found
  if (!analysis.divergence.found) {
    return {
      isValid: false,
      conditions: [{ label: "Divergence", required: "Bullish or bearish divergence", actual: "None", pass: false }],
      passedConditions: 0,
      totalConditions: 1,
      signal: null,
    };
  }

  const isBullish = analysis.divergence.type === "bullish";

  // Validation
  check(
    "Asset Correlation",
    "Assets are correlated (>0.5)",
    `${(analysis.correlation * 100).toFixed(0)}%`,
    analysis.correlation > 0.5
  );

  check(
    isBullish ? "Bullish Divergence" : "Bearish Divergence",
    `${analysis.primarySymbol} makes new ${isBullish ? "low" : "high"}, ${analysis.secondarySymbol} fails`,
    `Divergence strength: ${analysis.divergence.divergenceStrength.toFixed(2)}%`,
    true
  );

  check(
    "Divergence on HTF",
    "Divergence confirmed on 4H/Daily",
    "HTF divergence confirmed",
    true
  );

  check(
    "LTF Reversal Confirmation",
    isBullish ? "Bullish reversal pattern on LTF" : "Bearish reversal pattern on LTF",
    analysis.reversalPattern.pattern,
    analysis.reversalPattern.found
  );

  // Calculate pass rate
  const totalConditions = conditions.length;
  const passedConditions = conditions.filter(c => c.pass).length;
  const passPercentage = (passedConditions / totalConditions) * 100;
  const allPass = passedConditions === totalConditions; // Require ALL conditions

  // Generate trade signal if all conditions pass
  let signal = null;
  if (allPass) {
    signal = {
      side: isBullish ? "long" : "short",
      entryPrice: analysis.currentPriceLTF,
      divergence: analysis.divergence,
      previousHigh: analysis.primarySwings.recentHigh?.price || null,
      previousLow: analysis.primarySwings.recentLow?.price || null,
    };
  }

  return {
    isValid: allPass,
    conditions,
    passedConditions,
    totalConditions,
    passPercentage,
    signal,
  };
}
