/**
 * Strategy 3: FVG + CISD Combined
 *
 * Two-timeframe strategy:
 * 1. Identify Fair Value Gap on HTF (4H/Daily)
 * 2. Wait for price to tap into the FVG
 * 3. Drop to LTF (15m) and find CISD entry within the FVG zone
 */

/**
 * Detect Fair Value Gaps on HTF
 * @param {Array} candles - Candle data
 * @param {boolean} isBullish - Looking for bullish or bearish FVGs
 * @returns {Array} - Array of FVG zones
 */
function detectFVGsHTF(candles, isBullish) {
  const fvgs = [];

  for (let i = 2; i < candles.length; i++) {
    if (isBullish) {
      // Bullish FVG: gap between candle[i-2].high and candle[i].low
      const gap = candles[i].low - candles[i - 2].high;
      if (gap > 0) {
        // Check if FVG has been filled
        let fillPercent = 0;
        const fvgMid = (candles[i].low + candles[i - 2].high) / 2;

        for (let j = i + 1; j < candles.length; j++) {
          if (candles[j].low <= fvgMid) {
            fillPercent = 50;
            if (candles[j].low <= candles[i - 2].high) {
              fillPercent = 100;
            }
            break;
          }
        }

        fvgs.push({
          type: "bullish",
          high: candles[i].low,
          low: candles[i - 2].high,
          index: i,
          fillPercent,
          isFresh: fillPercent === 0,
        });
      }
    } else {
      // Bearish FVG: gap between candle[i-2].low and candle[i].high
      const gap = candles[i - 2].low - candles[i].high;
      if (gap > 0) {
        // Check if FVG has been filled
        let fillPercent = 0;
        const fvgMid = (candles[i - 2].low + candles[i].high) / 2;

        for (let j = i + 1; j < candles.length; j++) {
          if (candles[j].high >= fvgMid) {
            fillPercent = 50;
            if (candles[j].high >= candles[i - 2].low) {
              fillPercent = 100;
            }
            break;
          }
        }

        fvgs.push({
          type: "bearish",
          high: candles[i - 2].low,
          low: candles[i].high,
          index: i,
          fillPercent,
          isFresh: fillPercent === 0,
        });
      }
    }
  }

  // Return only recent FVGs that are not fully filled
  return fvgs.filter(fvg => fvg.fillPercent < 100).slice(-5);
}

/**
 * Check if price has tapped into FVG
 * @param {number} price - Current price
 * @param {Object} fvg - FVG zone
 * @returns {boolean} - True if price is in FVG
 */
function isPriceInFVG(price, fvg) {
  return price >= fvg.low && price <= fvg.high;
}

/**
 * Detect supply/demand zones on LTF within HTF FVG
 * @param {Array} candles - LTF candle data
 * @param {Object} fvg - HTF FVG zone
 * @returns {Array} - Array of S/D zones within FVG
 */
function detectSDZonesInFVG(candles, fvg) {
  const zones = [];

  for (let i = 5; i < candles.length - 1; i++) {
    const current = candles[i];

    // Check if this candle is within the FVG zone
    const candleInFVG = (current.high >= fvg.low && current.low <= fvg.high);
    if (!candleInFVG) continue;

    if (fvg.type === "bullish") {
      // Look for demand zones (bullish reversal)
      const isBearishCandle = current.close < current.open;
      const strongMoveUp = candles[i + 1].close > current.high * 1.001;

      if (isBearishCandle && strongMoveUp) {
        zones.push({
          type: "demand",
          high: current.high,
          low: current.low,
          index: i,
          withinFVG: true,
        });
      }
    } else {
      // Look for supply zones (bearish reversal)
      const isBullishCandle = current.close > current.open;
      const strongMoveDown = candles[i + 1].close < current.low * 0.999;

      if (isBullishCandle && strongMoveDown) {
        zones.push({
          type: "supply",
          high: current.high,
          low: current.low,
          index: i,
          withinFVG: true,
        });
      }
    }
  }

  return zones.slice(-3);
}

/**
 * Check if current candle closed inside a zone
 * @param {Object} candle - Current candle
 * @param {Object} zone - Supply/demand zone
 * @returns {boolean} - True if candle body closed inside zone
 */
function isClosedInsideZone(candle, zone) {
  return candle.close >= zone.low && candle.close <= zone.high;
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
 * Analyze market data using FVG + CISD combined strategy
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

  // Detect FVGs on HTF
  const bullishFVGs = detectFVGsHTF(candlesHTF, true);
  const bearishFVGs = detectFVGsHTF(candlesHTF, false);

  // Get current LTF price
  const currentPriceLTF = candlesLTF[candlesLTF.length - 1].close;
  const currentCandle = candlesLTF[candlesLTF.length - 1];

  // Check if price is in any FVG
  let activeFVG = null;
  let priceInFVG = false;

  // Check bullish FVGs first
  for (const fvg of bullishFVGs) {
    if (isPriceInFVG(currentPriceLTF, fvg)) {
      activeFVG = fvg;
      priceInFVG = true;
      break;
    }
  }

  // If not in bullish FVG, check bearish FVGs
  if (!activeFVG) {
    for (const fvg of bearishFVGs) {
      if (isPriceInFVG(currentPriceLTF, fvg)) {
        activeFVG = fvg;
        priceInFVG = true;
        break;
      }
    }
  }

  // If price is in FVG, look for CISD entry on LTF
  let sdZones = [];
  let activeZone = null;
  let closedInsideZone = false;

  if (activeFVG) {
    sdZones = detectSDZonesInFVG(candlesLTF, activeFVG);

    // Check if current candle closed inside any zone
    for (const zone of sdZones) {
      if (isClosedInsideZone(currentCandle, zone)) {
        activeZone = zone;
        closedInsideZone = true;
        break;
      }
    }
  }

  return {
    htfTrend,
    bullishFVGs,
    bearishFVGs,
    activeFVG,
    priceInFVG,
    sdZones,
    activeZone,
    closedInsideZone,
    currentPriceLTF,
    currentCandle,
  };
}

/**
 * Validate entry conditions for FVG + CISD combined strategy
 * @param {Object} analysis - Analysis result from analyze()
 * @param {Object} config - Bot configuration
 * @returns {Promise<Object>} - Validation result
 */
export async function validate(analysis, config) {
  const conditions = [];

  const check = (label, required, actual, pass) => {
    conditions.push({ label, required, actual, pass });
  };

  // Check if we have an active FVG
  if (!analysis.activeFVG) {
    return {
      isValid: false,
      conditions: [{ label: "HTF FVG", required: "Fair Value Gap on HTF", actual: "None", pass: false }],
      passedConditions: 0,
      totalConditions: 1,
      signal: null,
    };
  }

  const isLongSetup = analysis.activeFVG.type === "bullish";
  const isShortSetup = analysis.activeFVG.type === "bearish";

  if (isLongSetup) {
    // LONG setup validation
    check(
      "Bullish FVG on HTF",
      "Bullish Fair Value Gap identified on 4H/Daily",
      analysis.activeFVG ? `FVG at ${analysis.activeFVG.low.toFixed(2)}-${analysis.activeFVG.high.toFixed(2)}` : "None",
      true
    );

    check(
      "Price Tapped FVG",
      "Price entered the FVG zone (50% fill minimum)",
      analysis.priceInFVG ? "Yes" : "No",
      analysis.priceInFVG
    );

    check(
      "Demand Zone on LTF",
      "Fresh demand zone on 15m within HTF FVG",
      analysis.sdZones.length > 0 ? `${analysis.sdZones.length} found` : "None",
      analysis.sdZones.length > 0
    );

    check(
      "Candle Closed Inside Zone",
      "Candle body closed inside 15m demand zone",
      analysis.closedInsideZone ? "Yes" : "No",
      analysis.closedInsideZone
    );

    check(
      "HTF Trend Alignment",
      "HTF trend is bullish",
      analysis.htfTrend,
      analysis.htfTrend === "BULLISH"
    );

  } else {
    // SHORT setup validation
    check(
      "Bearish FVG on HTF",
      "Bearish Fair Value Gap identified on 4H/Daily",
      analysis.activeFVG ? `FVG at ${analysis.activeFVG.low.toFixed(2)}-${analysis.activeFVG.high.toFixed(2)}` : "None",
      true
    );

    check(
      "Price Tapped FVG",
      "Price entered the FVG zone (50% fill minimum)",
      analysis.priceInFVG ? "Yes" : "No",
      analysis.priceInFVG
    );

    check(
      "Supply Zone on LTF",
      "Fresh supply zone on 15m within HTF FVG",
      analysis.sdZones.length > 0 ? `${analysis.sdZones.length} found` : "None",
      analysis.sdZones.length > 0
    );

    check(
      "Candle Closed Inside Zone",
      "Candle body closed inside 15m supply zone",
      analysis.closedInsideZone ? "Yes" : "No",
      analysis.closedInsideZone
    );

    check(
      "HTF Trend Alignment",
      "HTF trend is bearish",
      analysis.htfTrend,
      analysis.htfTrend === "BEARISH"
    );
  }

  // Calculate pass rate
  const totalConditions = conditions.length;
  const passedConditions = conditions.filter(c => c.pass).length;
  const passPercentage = (passedConditions / totalConditions) * 100;
  const allPass = passedConditions === totalConditions; // Require ALL conditions

  // Generate trade signal if all conditions pass
  let signal = null;
  if (allPass) {
    signal = {
      side: isLongSetup ? "long" : "short",
      entryPrice: analysis.currentPriceLTF,
      orderBlocks: [{
        type: isLongSetup ? "bullish" : "bearish",
        high: analysis.activeZone.high,
        low: analysis.activeZone.low,
      }],
      fvg: analysis.activeFVG,
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
