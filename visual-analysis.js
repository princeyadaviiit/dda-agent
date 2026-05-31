/**
 * Visual Analysis Module
 * Identifies ICT concepts for drawing on TradingView chart
 * Drawing is done by Claude Code via MCP (not by this module)
 */

// ─── Identify Order Blocks ───────────────────────────────────────────────────

function identifyOrderBlocks(candles) {
  const orderBlocks = [];

  // Look for last bullish candle before bearish move (bullish OB)
  // Look for last bearish candle before bullish move (bearish OB)

  for (let i = 2; i < candles.length - 2; i++) {
    const prev = candles[i - 1];
    const current = candles[i];
    const next = candles[i + 1];
    const next2 = candles[i + 2];

    // Bullish OB: down candle followed by strong up move
    if (current.close < current.open &&
        next.close > next.open &&
        next2.close > next2.open &&
        next2.close > current.high) {
      orderBlocks.push({
        type: 'bullish',
        time: current.time,
        high: current.high,
        low: current.low,
        price: current.low
      });
    }

    // Bearish OB: up candle followed by strong down move
    if (current.close > current.open &&
        next.close < next.open &&
        next2.close < next2.open &&
        next2.close < current.low) {
      orderBlocks.push({
        type: 'bearish',
        time: current.time,
        high: current.high,
        low: current.low,
        price: current.high
      });
    }
  }

  // Return only the most recent 3 order blocks
  return orderBlocks.slice(-3);
}

// ─── Identify Liquidity Pools ────────────────────────────────────────────────

function identifyLiquidityPools(candles) {
  const pools = [];
  const tolerance = 0.002; // 0.2% tolerance for "equal" highs/lows

  // Find equal highs (sell-side liquidity)
  for (let i = 10; i < candles.length - 10; i++) {
    const high = candles[i].high;
    let equalCount = 1;

    // Check for equal highs within tolerance
    for (let j = i - 10; j < i + 10; j++) {
      if (j !== i && Math.abs(candles[j].high - high) / high < tolerance) {
        equalCount++;
      }
    }

    if (equalCount >= 3) {
      pools.push({
        type: 'sell-side',
        price: high,
        time: candles[i].time
      });
    }
  }

  // Find equal lows (buy-side liquidity)
  for (let i = 10; i < candles.length - 10; i++) {
    const low = candles[i].low;
    let equalCount = 1;

    for (let j = i - 10; j < i + 10; j++) {
      if (j !== i && Math.abs(candles[j].low - low) / low < tolerance) {
        equalCount++;
      }
    }

    if (equalCount >= 3) {
      pools.push({
        type: 'buy-side',
        price: low,
        time: candles[i].time
      });
    }
  }

  // Return unique pools (deduplicate by price)
  const uniquePools = [];
  const seenPrices = new Set();

  for (const pool of pools) {
    const priceKey = Math.round(pool.price * 100) / 100;
    if (!seenPrices.has(priceKey)) {
      seenPrices.add(priceKey);
      uniquePools.push(pool);
    }
  }

  return uniquePools.slice(-5); // Return last 5 pools
}

// ─── Identify Fair Value Gaps ────────────────────────────────────────────────

function identifyFairValueGaps(candles) {
  const fvgs = [];

  for (let i = 2; i < candles.length; i++) {
    const candle1 = candles[i - 2];
    const candle2 = candles[i - 1];
    const candle3 = candles[i];

    // Bullish FVG: gap between candle1 high and candle3 low
    if (candle3.low > candle1.high && candle2.close > candle2.open) {
      fvgs.push({
        type: 'bullish',
        time: candle2.time,
        high: candle3.low,
        low: candle1.high,
        midpoint: (candle3.low + candle1.high) / 2
      });
    }

    // Bearish FVG: gap between candle1 low and candle3 high
    if (candle3.high < candle1.low && candle2.close < candle2.open) {
      fvgs.push({
        type: 'bearish',
        time: candle2.time,
        high: candle1.low,
        low: candle3.high,
        midpoint: (candle1.low + candle3.high) / 2
      });
    }
  }

  return fvgs.slice(-3); // Return last 3 FVGs
}

// ─── Calculate Fibonacci Levels ──────────────────────────────────────────────

function calculateFibonacci(candles) {
  // Find swing high and swing low in recent candles
  const recentCandles = candles.slice(-100);

  let swingHigh = recentCandles[0].high;
  let swingHighTime = recentCandles[0].time;
  let swingLow = recentCandles[0].low;
  let swingLowTime = recentCandles[0].time;

  for (const candle of recentCandles) {
    if (candle.high > swingHigh) {
      swingHigh = candle.high;
      swingHighTime = candle.time;
    }
    if (candle.low < swingLow) {
      swingLow = candle.low;
      swingLowTime = candle.time;
    }
  }

  const range = swingHigh - swingLow;

  return {
    swingHigh,
    swingHighTime,
    swingLow,
    swingLowTime,
    fib236: swingHigh - (range * 0.236),
    fib382: swingHigh - (range * 0.382),
    fib500: swingHigh - (range * 0.500),
    fib618: swingHigh - (range * 0.618),
    fib786: swingHigh - (range * 0.786)
  };
}

// ─── Main Analysis Function ──────────────────────────────────────────────────

export async function drawVisualAnalysis(ictAnalysis, position, tpsl) {
  console.log('\n── Drawing Visual Analysis on TradingView Chart ─────────\n');

  try {
    // This function returns the data structure that Claude Code will use
    // to draw on the TradingView chart via MCP tools

    const drawings = [];

    // Draw Entry Price Line
    drawings.push({
      type: 'horizontal_line',
      price: position.entryPrice,
      color: position.side === 'long' ? '#00FF00' : '#FF0000',
      label: `${position.side.toUpperCase()} ENTRY: $${position.entryPrice.toFixed(2)}`,
      lineWidth: 2,
      style: 'solid',
    });

    // Draw Take Profit Line
    drawings.push({
      type: 'horizontal_line',
      price: tpsl.takeProfit,
      color: '#00FF00',
      label: `TP: $${tpsl.takeProfit.toFixed(2)} (1:${tpsl.riskRewardRatio.toFixed(1)})`,
      lineWidth: 2,
      style: 'dashed',
    });

    // Draw Stop Loss Line
    drawings.push({
      type: 'horizontal_line',
      price: tpsl.stopLoss,
      color: '#FF0000',
      label: `SL: $${tpsl.stopLoss.toFixed(2)}`,
      lineWidth: 2,
      style: 'dashed',
    });

    // Draw Order Blocks (if present)
    if (ictAnalysis.orderBlocks && ictAnalysis.orderBlocks.length > 0) {
      ictAnalysis.orderBlocks.forEach((ob, idx) => {
        drawings.push({
          type: 'rectangle',
          high: ob.high,
          low: ob.low,
          color: ob.type === 'bullish' ? '#00FF0033' : '#FF000033',
          label: `OB ${idx + 1}`,
        });
      });
    }

    // Draw Fair Value Gaps (if present)
    if (ictAnalysis.fvgs && ictAnalysis.fvgs.length > 0) {
      ictAnalysis.fvgs.forEach((fvg, idx) => {
        drawings.push({
          type: 'rectangle',
          high: fvg.high,
          low: fvg.low,
          color: fvg.type === 'bullish' ? '#0000FF33' : '#FF00FF33',
          label: `FVG ${idx + 1}`,
        });
      });
    }

    // Draw Fibonacci OTE Zone (if available)
    if (ictAnalysis.fibLevels && ictAnalysis.fibLevels["0.618"]) {
      drawings.push({
        type: 'horizontal_line',
        price: ictAnalysis.fibLevels["0.618"],
        color: '#FFD700',
        label: 'OTE 0.618',
        lineWidth: 1,
        style: 'dotted',
      });

      drawings.push({
        type: 'horizontal_line',
        price: ictAnalysis.fibLevels["0.786"],
        color: '#FFD700',
        label: 'OTE 0.786',
        lineWidth: 1,
        style: 'dotted',
      });
    }

    console.log(`  ✅ Prepared ${drawings.length} drawings for TradingView chart`);
    console.log(`     • Entry: $${position.entryPrice.toFixed(2)}`);
    console.log(`     • TP: $${tpsl.takeProfit.toFixed(2)}`);
    console.log(`     • SL: $${tpsl.stopLoss.toFixed(2)}`);
    console.log(`     • Order Blocks: ${ictAnalysis.orderBlocks?.length || 0}`);
    console.log(`     • FVGs: ${ictAnalysis.fvgs?.length || 0}\n`);

    console.log('  📝 Note: Claude Code will draw these on the chart via MCP\n');

    return {
      drawings,
      position,
      tpsl,
      ictAnalysis,
    };

  } catch (err) {
    console.log(`  ⚠️  Visual analysis preparation failed: ${err.message}`);
    console.log('     Continuing without visual markers...\n');
    return null;
  }
}

// Export for use by Claude Code monitoring skill
export function clearChartDrawings() {
  // This will be called by Claude Code via MCP, not by bot.js
  console.log('  📝 Chart clearing will be done by Claude Code via MCP');
}
