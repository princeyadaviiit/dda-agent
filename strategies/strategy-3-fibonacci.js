/**
 * Strategy 4: Fibonacci Retracement
 *
 * Uses Fibonacci levels (0.5, 0.618, 0.786) for reversal entries during trends.
 * Simpler than Strategy 1 - focuses purely on Fib levels without ICT concepts.
 */

/**
 * Find swing points for Fibonacci drawing
 * @param {Array} candles - Candle data
 * @param {number} lookback - Lookback period
 * @returns {Object} - Swing highs and lows
 */
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

    if (isSwingHigh) swings.highs.push({ index: i, price: candles[i].high, time: candles[i].time });
    if (isSwingLow) swings.lows.push({ index: i, price: candles[i].low, time: candles[i].time });
  }

  return swings;
}

/**
 * Calculate Fibonacci retracement levels
 * @param {number} swingLow - Swing low price
 * @param {number} swingHigh - Swing high price
 * @param {boolean} isBullish - Bullish or bearish trend
 * @returns {Object} - Fibonacci levels
 */
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

/**
 * Check if price is at a Fibonacci level
 * @param {number} price - Current price
 * @param {Object} fibLevels - Fibonacci levels
 * @param {number} tolerance - Tolerance as percentage (default 0.5%)
 * @returns {Object} - Level info or null
 */
function isPriceAtFibLevel(price, fibLevels, tolerance = 0.5) {
  const keyLevels = ["0.500", "0.618", "0.786"];

  for (const level of keyLevels) {
    const fibPrice = fibLevels[level];
    const toleranceAmount = fibPrice * (tolerance / 100);

    if (price >= fibPrice - toleranceAmount && price <= fibPrice + toleranceAmount) {
      return {
        level,
        price: fibPrice,
        distance: Math.abs(price - fibPrice),
        distancePercent: (Math.abs(price - fibPrice) / fibPrice) * 100,
      };
    }
  }

  return null;
}

/**
 * Detect reversal candle patterns
 * @param {Array} candles - Recent candles
 * @param {boolean} isBullish - Looking for bullish or bearish reversal
 * @returns {Object} - Pattern info
 */
function detectReversalPattern(candles, isBullish) {
  if (candles.length < 2) return { found: false, pattern: "None" };

  const current = candles[candles.length - 1];
  const previous = candles[candles.length - 2];

  const currentBody = Math.abs(current.close - current.open);
  const previousBody = Math.abs(previous.close - previous.open);

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

    // Pin bar (bullish)
    const isPinBar =
      (current.low < Math.min(current.open, current.close) - currentBody * 1.5) &&
      (current.high - Math.max(current.open, current.close) < currentBody * 0.5);

    if (isPinBar) return { found: true, pattern: "Bullish Pin Bar" };

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

    // Pin bar (bearish)
    const isPinBar =
      (current.high > Math.max(current.open, current.close) + currentBody * 1.5) &&
      (Math.min(current.open, current.close) - current.low < currentBody * 0.5);

    if (isPinBar) return { found: true, pattern: "Bearish Pin Bar" };
  }

  return { found: false, pattern: "None" };
}

/**
 * Simple EMA calculation
 */
function calcEMA(closes, period) {
  const multiplier = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * multiplier + ema * (1 - multiplier);
  }
  return ema;
}

/**
 * Analyze market data using Fibonacci Retracement strategy
 * @param {Object} marketData - Market data from Binance
 * @param {Object} config - Bot configuration
 * @returns {Promise<Object>} - Analysis result
 */
export async function analyze(marketData, config) {
  const { candlesHTF, candlesLTF } = marketData;

  // Determine HTF trend
  const closesHTF = candlesHTF.map(c => c.close);
  const ema50HTF = calcEMA(closesHTF, 50);
  const currentPriceHTF = closesHTF[closesHTF.length - 1];
  const htfTrend = currentPriceHTF > ema50HTF ? "BULLISH" : currentPriceHTF < ema50HTF ? "BEARISH" : "NEUTRAL";

  // Find swing points
  const swings = findSwingPoints(candlesHTF, 5);

  // Calculate Fibonacci levels based on trend
  let fibLevels = null;
  let swingLow = null;
  let swingHigh = null;

  if (htfTrend === "BULLISH" && swings.lows.length > 0 && swings.highs.length > 0) {
    swingLow = swings.lows[swings.lows.length - 1].price;
    swingHigh = swings.highs[swings.highs.length - 1].price;
    fibLevels = calcFibonacciLevels(swingLow, swingHigh, true);
  } else if (htfTrend === "BEARISH" && swings.lows.length > 0 && swings.highs.length > 0) {
    swingLow = swings.lows[swings.lows.length - 1].price;
    swingHigh = swings.highs[swings.highs.length - 1].price;
    fibLevels = calcFibonacciLevels(swingLow, swingHigh, false);
  }

  // Get current price on LTF
  const currentPriceLTF = candlesLTF[candlesLTF.length - 1].close;

  // Check if price is at a key Fibonacci level
  const atFibLevel = fibLevels ? isPriceAtFibLevel(currentPriceLTF, fibLevels) : null;

  // Detect reversal pattern
  const reversalPattern = htfTrend !== "NEUTRAL"
    ? detectReversalPattern(candlesLTF, htfTrend === "BULLISH")
    : { found: false, pattern: "None" };

  return {
    htfTrend,
    swings,
    swingLow,
    swingHigh,
    fibLevels,
    atFibLevel,
    reversalPattern,
    currentPriceLTF,
  };
}

/**
 * Validate entry conditions for Fibonacci Retracement strategy
 * @param {Object} analysis - Analysis result from analyze()
 * @param {Object} config - Bot configuration
 * @returns {Promise<Object>} - Validation result
 */
export async function validate(analysis, config) {
  const conditions = [];

  const check = (label, required, actual, pass) => {
    conditions.push({ label, required, actual, pass });
  };

  // Check if we have a clear trend
  if (analysis.htfTrend === "NEUTRAL") {
    return {
      isValid: false,
      conditions: [{ label: "HTF Trend", required: "Clear bullish or bearish trend", actual: "NEUTRAL", pass: false }],
      passedConditions: 0,
      totalConditions: 1,
      signal: null,
    };
  }

  const isBullish = analysis.htfTrend === "BULLISH";

  // Validation
  check(
    "HTF Trend",
    isBullish ? "Uptrend confirmed" : "Downtrend confirmed",
    analysis.htfTrend,
    true
  );

  check(
    "Impulse Move Identified",
    "Clear swing low to swing high (or vice versa)",
    analysis.swingLow && analysis.swingHigh ? "Yes" : "No",
    analysis.swingLow && analysis.swingHigh
  );

  check(
    "Price at Fibonacci Level",
    "Price at 0.5, 0.618, or 0.786 retracement",
    analysis.atFibLevel ? `At ${analysis.atFibLevel.level} (${analysis.atFibLevel.price.toFixed(2)})` : "Not at key level",
    analysis.atFibLevel !== null
  );

  check(
    "Reversal Pattern",
    isBullish ? "Bullish reversal pattern" : "Bearish reversal pattern",
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
      fibLevel: analysis.atFibLevel,
      swingLow: analysis.swingLow,
      swingHigh: analysis.swingHigh,
      previousHigh: analysis.swingHigh,
      previousLow: analysis.swingLow,
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
