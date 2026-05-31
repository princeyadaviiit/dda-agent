/**
 * Risk Calculator for Leveraged Trading
 *
 * IMPORTANT: Risk % is calculated on MARGIN (actual capital), NOT leveraged position size.
 *
 * Example:
 *   Portfolio: $1000
 *   Risk per trade: 1% = $10 (max loss if SL hits)
 *   Entry: $50,000 | Stop Loss: $49,000 (2% distance)
 *   Risk distance: 2%
 *   Required margin: $10 / 0.02 = $500
 *   With 5x leverage: Position size = $500 × 5 = $2,500
 *   If SL hits: You lose $10 (1% of portfolio), NOT $50
 *
 * This is the CORRECT way to calculate risk in leveraged trading.
 */

import "dotenv/config";

/**
 * Calculate position size based on risk management rules
 * @param {Object} params - Calculation parameters
 * @returns {Object} - Position sizing details
 */
export function calculatePositionSize(params) {
  const {
    portfolioValue,
    entryPrice,
    stopLoss,
    leverage = 1,
    riskPerTradePercent = 1.0,
    maxPortfolioPercent = 10.0,
    maxTradeSizeUSD = 1000,
    positionSizingMethod = "risk_based",
    strategyRiskMultiplier = 1.0,
  } = params;

  // Adjust risk based on strategy multiplier
  const adjustedRiskPercent = riskPerTradePercent * strategyRiskMultiplier;

  // Calculate risk amount in USD (this is the max loss if SL hits)
  const riskAmountUSD = (portfolioValue * adjustedRiskPercent) / 100;

  // Calculate stop loss distance as percentage
  const slDistancePercent = Math.abs((entryPrice - stopLoss) / entryPrice) * 100;

  // Calculate required margin based on risk and SL distance
  // Formula: Margin = Risk Amount / (SL Distance %)
  // This ensures that if SL hits, you lose exactly riskAmountUSD
  const requiredMargin = riskAmountUSD / (slDistancePercent / 100);

  // Calculate position size with leverage
  const positionSizeFromRisk = requiredMargin * leverage;

  // Calculate position size from fixed percentage
  const positionSizeFromPercent = (portfolioValue * maxPortfolioPercent / 100) * leverage;

  // Calculate position size from fixed USD
  const positionSizeFromFixed = maxTradeSizeUSD * leverage;

  // Select position size based on method
  let positionSize;
  let method;

  if (positionSizingMethod === "risk_based") {
    positionSize = positionSizeFromRisk;
    method = "Risk-based";
  } else if (positionSizingMethod === "fixed_percent") {
    positionSize = positionSizeFromPercent;
    method = "Fixed percentage";
  } else if (positionSizingMethod === "fixed_usd") {
    positionSize = positionSizeFromFixed;
    method = "Fixed USD";
  } else {
    positionSize = positionSizeFromRisk;
    method = "Risk-based (default)";
  }

  // Apply maximum limits
  const maxPositionSize = Math.min(
    positionSizeFromPercent,
    positionSizeFromFixed
  );

  if (positionSize > maxPositionSize) {
    positionSize = maxPositionSize;
    method += " (capped by limits)";
  }

  // Calculate actual margin used (position size / leverage)
  const marginUsed = positionSize / leverage;

  // Calculate margin as percentage of portfolio
  const marginPercent = (marginUsed / portfolioValue) * 100;

  // Calculate actual risk if SL hits
  const actualRiskUSD = marginUsed * (slDistancePercent / 100);
  const actualRiskPercent = (actualRiskUSD / portfolioValue) * 100;

  // Calculate quantity (how many units to buy/sell)
  const quantity = positionSize / entryPrice;

  return {
    positionSize,           // Total position size in USD (with leverage)
    marginUsed,             // Actual capital used (without leverage)
    marginPercent,          // Margin as % of portfolio
    quantity,               // Number of units to trade
    leverage,               // Leverage used
    riskAmountUSD,          // Target risk in USD
    riskPercent: adjustedRiskPercent, // Target risk as %
    actualRiskUSD,          // Actual risk if SL hits
    actualRiskPercent,      // Actual risk as % of portfolio
    slDistancePercent,      // Stop loss distance as %
    method,                 // Position sizing method used
    strategyRiskMultiplier, // Risk multiplier applied
  };
}

/**
 * Calculate stop loss and take profit levels
 * @param {Object} params - Calculation parameters
 * @returns {Object} - TP/SL details
 */
export function calculateTPSL(params) {
  const {
    entryPrice,
    side,                    // "long" or "short"
    orderBlocks = [],        // Order blocks from strategy
    riskRewardRatio = 2.0,
    slBufferPips = 5,
    tpStrategy = "fixed_rr",
    previousHigh = null,
    previousLow = null,
  } = params;

  const pipValue = entryPrice * 0.0001; // 1 pip = 0.01% of price
  const buffer = slBufferPips * pipValue;

  let stopLoss;
  let takeProfit;

  if (side === "long") {
    // LONG: SL below order block or entry, TP above
    if (orderBlocks.length > 0) {
      const orderBlock = orderBlocks[orderBlocks.length - 1];
      stopLoss = orderBlock.low - buffer;
    } else {
      // Fallback: 2% below entry
      stopLoss = entryPrice * 0.98;
    }

    const risk = entryPrice - stopLoss;

    if (tpStrategy === "dynamic" && previousHigh) {
      // Use previous high as TP
      takeProfit = previousHigh;
    } else {
      // Fixed RR
      takeProfit = entryPrice + (risk * riskRewardRatio);
    }

  } else {
    // SHORT: SL above order block or entry, TP below
    if (orderBlocks.length > 0) {
      const orderBlock = orderBlocks[orderBlocks.length - 1];
      stopLoss = orderBlock.high + buffer;
    } else {
      // Fallback: 2% above entry
      stopLoss = entryPrice * 1.02;
    }

    const risk = stopLoss - entryPrice;

    if (tpStrategy === "dynamic" && previousLow) {
      // Use previous low as TP
      takeProfit = previousLow;
    } else {
      // Fixed RR
      takeProfit = entryPrice - (risk * riskRewardRatio);
    }
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
    slDistancePercent: (riskAmount / entryPrice) * 100,
    tpDistancePercent: (rewardAmount / entryPrice) * 100,
  };
}

/**
 * Validate if trade meets risk management criteria
 * @param {Object} params - Validation parameters
 * @returns {Object} - Validation result
 */
export function validateRiskManagement(params) {
  const {
    portfolioValue,
    marginUsed,
    actualRiskPercent,
    riskRewardRatio,
    maxPortfolioPercent,
    maxDailyLossPercent,
    currentDailyLoss = 0,
    minRiskRewardRatio = 2.0,
  } = params;

  const issues = [];

  // Check margin usage
  const marginPercent = (marginUsed / portfolioValue) * 100;
  if (marginPercent > maxPortfolioPercent) {
    issues.push(`Margin usage ${marginPercent.toFixed(2)}% exceeds max ${maxPortfolioPercent}%`);
  }

  // Check risk:reward ratio
  if (riskRewardRatio < minRiskRewardRatio) {
    issues.push(`Risk:reward ${riskRewardRatio.toFixed(2)} below minimum ${minRiskRewardRatio}`);
  }

  // Check daily loss limit
  const potentialDailyLoss = currentDailyLoss + actualRiskPercent;
  if (potentialDailyLoss > maxDailyLossPercent) {
    issues.push(`Potential daily loss ${potentialDailyLoss.toFixed(2)}% exceeds max ${maxDailyLossPercent}%`);
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Load risk management config from .env
 * @returns {Object} - Risk management configuration
 */
export function loadRiskConfig() {
  return {
    portfolioValue: parseFloat(process.env.PORTFOLIO_VALUE_USD || "1000"),
    riskPerTradePercent: parseFloat(process.env.RISK_PER_TRADE_PERCENT || "1.0"),
    maxPortfolioPercent: parseFloat(process.env.MAX_PORTFOLIO_PER_TRADE_PERCENT || "10.0"),
    maxTradeSizeUSD: parseFloat(process.env.MAX_TRADE_SIZE_USD || "100"),
    maxTradesPerDay: parseInt(process.env.MAX_TRADES_PER_DAY || "3"),
    maxDailyLossPercent: parseFloat(process.env.MAX_DAILY_LOSS_PERCENT || "4.0"),
    maxOpenPositions: parseInt(process.env.MAX_OPEN_POSITIONS || "2"),
    leverage: parseInt(process.env.LEVERAGE || "5"),
    positionSizingMethod: process.env.POSITION_SIZING_METHOD || "risk_based",
    riskRewardRatio: parseFloat(process.env.RISK_REWARD_RATIO || "2.0"),
    slBufferPips: parseFloat(process.env.SL_BUFFER_PIPS || "5"),
    tpStrategy: process.env.TP_STRATEGY || "fixed_rr",
    enablePartialProfits: process.env.ENABLE_PARTIAL_PROFITS !== "false",
    breakevenRRThreshold: parseFloat(process.env.BREAKEVEN_RR_THRESHOLD || "1.5"),
  };
}

/**
 * Calculate daily P&L from trades log
 * @param {Array} trades - Array of trade entries
 * @returns {Object} - Daily P&L summary
 */
export function calculateDailyPnL(trades) {
  const today = new Date().toISOString().slice(0, 10);
  const todayTrades = trades.filter(t => t.timestamp.startsWith(today));

  let totalPnL = 0;
  let totalPnLPercent = 0;
  let wins = 0;
  let losses = 0;

  todayTrades.forEach(trade => {
    if (trade.pnl) {
      totalPnL += trade.pnl;
      totalPnLPercent += trade.pnlPercent || 0;
      if (trade.pnl > 0) wins++;
      else if (trade.pnl < 0) losses++;
    }
  });

  return {
    totalPnL,
    totalPnLPercent,
    wins,
    losses,
    totalTrades: todayTrades.length,
    winRate: todayTrades.length > 0 ? (wins / todayTrades.length) * 100 : 0,
  };
}

/**
 * Format risk summary for console output
 * @param {Object} positionSize - Position sizing result
 * @param {Object} tpsl - TP/SL result
 * @returns {string} - Formatted summary
 */
export function formatRiskSummary(positionSize, tpsl) {
  return `
── Risk Management Summary ──────────────────────────────

  Position Sizing Method: ${positionSize.method}

  Position Size: $${positionSize.positionSize.toFixed(2)} (with ${positionSize.leverage}x leverage)
  Margin Used: $${positionSize.marginUsed.toFixed(2)} (${positionSize.marginPercent.toFixed(2)}% of portfolio)
  Quantity: ${positionSize.quantity.toFixed(6)} units

  Risk Management:
    Target Risk: $${positionSize.riskAmountUSD.toFixed(2)} (${positionSize.riskPercent.toFixed(2)}%)
    Actual Risk: $${positionSize.actualRiskUSD.toFixed(2)} (${positionSize.actualRiskPercent.toFixed(2)}%)
    Stop Loss Distance: ${positionSize.slDistancePercent.toFixed(2)}%

  TP/SL Levels:
    Stop Loss: $${tpsl.stopLoss.toFixed(2)} (${tpsl.slDistancePercent.toFixed(2)}% away)
    Take Profit: $${tpsl.takeProfit.toFixed(2)} (${tpsl.tpDistancePercent.toFixed(2)}% away)
    Risk:Reward Ratio: 1:${tpsl.riskRewardRatio.toFixed(2)}

  IMPORTANT: Risk % is calculated on MARGIN (actual capital), not leveraged position.
  If SL hits, you lose $${positionSize.actualRiskUSD.toFixed(2)}, which is ${positionSize.actualRiskPercent.toFixed(2)}% of your portfolio.

─────────────────────────────────────────────────────────
`;
}
