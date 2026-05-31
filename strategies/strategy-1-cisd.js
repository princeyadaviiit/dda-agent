/**
 * Strategy 2: CISD (Candle in Supply/Demand)
 *
 * Identifies supply/demand zones and waits for candle to close INSIDE the zone.
 * Key difference from traditional S/D: requires candle BODY to close inside zone, not just wick.
 */

/**
 * Detect supply/demand zones on HTF
 * @param {Array} candles - Candle data
 * @returns {Array} - Array of supply/demand zones
 */
function detectSupplyDemandZones(candles) {
  const zones = [];
  const minZoneStrength = 1.5; // Minimum % move after zone to be considered valid

  for (let i = 5; i < candles.length - 5; i++) {
    const current = candles[i];

    // Check for demand zone (sharp move up after this candle)
    const moveUpPercent = ((candles[i + 5].high - current.low) / current.low) * 100;
    if (moveUpPercent >= minZoneStrength) {
      // Check if zone is "fresh" (not tested yet)
      let isFresh = true;
      for (let j = i + 1; j < candles.length; j++) {
        if (candles[j].low <= current.high && candles[j].low >= current.low) {
          isFresh = false;
          break;
        }
      }

      zones.push({
        type: "demand",
        high: current.high,
        low: current.low,
        index: i,
        strength: moveUpPercent,
        isFresh,
        testedCount: isFresh ? 0 : 1,
      });
    }

    // Check for supply zone (sharp move down after this candle)
    const moveDownPercent = ((current.high - candles[i + 5].low) / current.high) * 100;
    if (moveDownPercent >= minZoneStrength) {
      // Check if zone is "fresh" (not tested yet)
      let isFresh = true;
      for (let j = i + 1; j < candles.length; j++) {
        if (candles[j].high >= current.low && candles[j].high <= current.high) {
          isFresh = false;
          break;
        }
      }

      zones.push({
        type: "supply",
        high: current.high,
        low: current.low,
        index: i,
        strength: moveDownPercent,
        isFresh,
        testedCount: isFresh ? 0 : 1,
      });
    }
  }

  // Return only the most recent zones
  return zones.slice(-5);
}

/**
 * Check if current candle closed inside a zone
 * @param {Object} candle - Current candle
 * @param {Object} zone - Supply/demand zone
 * @returns {boolean} - True if candle body closed inside zone
 */
function isClosedInsideZone(candle, zone) {
  // Check if candle CLOSE is inside the zone (not just wick)
  return candle.close >= zone.low && candle.close <= zone.high;
}

/**
 * Calculate average volume for recent candles
 * @param {Array} candles - Candle data
 * @param {number} period - Number of candles to average
 * @returns {number} - Average volume
 */
function calcAverageVolume(candles, period = 20) {
  const recentCandles = candles.slice(-period);
  const totalVolume = recentCandles.reduce((sum, c) => sum + c.volume, 0);
  return totalVolume / period;
}

/**
 * Analyze market data using CISD strategy
 * @param {Object} marketData - Market data from Binance
 * @param {Object} config - Bot configuration
 * @returns {Promise<Object>} - Analysis result
 */
export async function analyze(marketData, config) {
  const { candlesHTF, candlesLTF } = marketData;

  // Detect supply/demand zones on HTF
  const zones = detectSupplyDemandZones(candlesHTF);

  // Get current candle
  const currentCandle = candlesLTF[candlesLTF.length - 1];
  const previousCandle = candlesLTF[candlesLTF.length - 2];

  // Calculate average volume
  const avgVolume = calcAverageVolume(candlesLTF, 20);
  const currentVolume = currentCandle.volume;
  const volumeSpike = currentVolume > avgVolume * 1.2; // 20% above average

  // Check if current candle closed inside any zone
  let activeZone = null;
  let closedInsideZone = false;

  for (const zone of zones) {
    if (isClosedInsideZone(currentCandle, zone)) {
      activeZone = zone;
      closedInsideZone = true;
      break;
    }
  }

  // Determine trend direction (simple EMA-based)
  const closes = candlesHTF.map(c => c.close);
  const ema50 = calcEMA(closes, 50);
  const currentPrice = closes[closes.length - 1];
  const trend = currentPrice > ema50 ? "BULLISH" : currentPrice < ema50 ? "BEARISH" : "NEUTRAL";

  return {
    zones,
    activeZone,
    closedInsideZone,
    currentCandle,
    previousCandle,
    avgVolume,
    currentVolume,
    volumeSpike,
    trend,
    currentPrice,
  };
}

/**
 * Simple EMA calculation (copied from bot.js)
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
 * Validate entry conditions for CISD strategy
 * @param {Object} analysis - Analysis result from analyze()
 * @param {Object} config - Bot configuration
 * @returns {Promise<Object>} - Validation result
 */
export async function validate(analysis, config) {
  const conditions = [];

  const check = (label, required, actual, pass) => {
    conditions.push({ label, required, actual, pass });
  };

  // Determine if this is a long or short setup
  const isLongSetup = analysis.activeZone?.type === "demand";
  const isShortSetup = analysis.activeZone?.type === "supply";

  if (!isLongSetup && !isShortSetup) {
    return {
      isValid: false,
      conditions: [{ label: "Active Zone", required: "Supply or Demand zone", actual: "None", pass: false }],
      passedConditions: 0,
      totalConditions: 1,
      signal: null,
    };
  }

  if (isLongSetup) {
    // LONG setup validation
    check(
      "Fresh Demand Zone",
      "Fresh demand zone identified on HTF",
      analysis.activeZone.isFresh ? "Fresh zone found" : "Zone already tested",
      analysis.activeZone.isFresh
    );

    check(
      "Candle Closed Inside Zone",
      "Candle body closed inside demand zone",
      analysis.closedInsideZone ? "Yes" : "No",
      analysis.closedInsideZone
    );

    check(
      "Volume Confirmation",
      "Volume spike on approach to zone",
      analysis.volumeSpike ? `${((analysis.currentVolume / analysis.avgVolume) * 100).toFixed(0)}% of avg` : "No spike",
      analysis.volumeSpike
    );

    check(
      "Trend Alignment",
      "HTF trend is bullish or neutral",
      analysis.trend,
      analysis.trend === "BULLISH" || analysis.trend === "NEUTRAL"
    );

  } else {
    // SHORT setup validation
    check(
      "Fresh Supply Zone",
      "Fresh supply zone identified on HTF",
      analysis.activeZone.isFresh ? "Fresh zone found" : "Zone already tested",
      analysis.activeZone.isFresh
    );

    check(
      "Candle Closed Inside Zone",
      "Candle body closed inside supply zone",
      analysis.closedInsideZone ? "Yes" : "No",
      analysis.closedInsideZone
    );

    check(
      "Volume Confirmation",
      "Volume spike on approach to zone",
      analysis.volumeSpike ? `${((analysis.currentVolume / analysis.avgVolume) * 100).toFixed(0)}% of avg` : "No spike",
      analysis.volumeSpike
    );

    check(
      "Trend Alignment",
      "HTF trend is bearish or neutral",
      analysis.trend,
      analysis.trend === "BEARISH" || analysis.trend === "NEUTRAL"
    );
  }

  // Calculate pass rate
  const totalConditions = conditions.length;
  const passedConditions = conditions.filter(c => c.pass).length;
  const passPercentage = (passedConditions / totalConditions) * 100;
  const allPass = passedConditions === totalConditions; // Require ALL conditions for CISD

  // Generate trade signal if all conditions pass
  let signal = null;
  if (allPass) {
    signal = {
      side: isLongSetup ? "long" : "short",
      entryPrice: analysis.currentPrice,
      orderBlocks: [{
        type: isLongSetup ? "bullish" : "bearish",
        high: analysis.activeZone.high,
        low: analysis.activeZone.low,
      }],
      zone: analysis.activeZone,
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
