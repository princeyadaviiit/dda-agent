/**
 * Multi-Strategy Manager
 *
 * Orchestrates execution of multiple trading strategies.
 * Checks all enabled strategies and executes trade if ANY strategy passes (OR logic).
 *
 * Architecture:
 * - Each strategy is a separate module with analyze() and validate() functions
 * - Strategy manager loads enabled strategies from .env
 * - Runs all strategies in parallel
 * - Returns first valid signal or null if none pass
 */

import "dotenv/config";

// Strategy imports
import * as Strategy1 from "./strategies/strategy-1-cisd.js";
import * as Strategy2 from "./strategies/strategy-2-fvg-cisd.js";
import * as Strategy3 from "./strategies/strategy-3-fibonacci.js";
import * as Strategy4 from "./strategies/strategy-4-smt-divergence.js";

// Strategy registry
const STRATEGIES = {
  1: { name: "CISD (Candle in Supply/Demand)", module: Strategy1, enabled: process.env.STRATEGY_1_ENABLED !== "false" },
  2: { name: "FVG + CISD Combined", module: Strategy2, enabled: process.env.STRATEGY_2_ENABLED !== "false" },
  3: { name: "Fibonacci Retracement", module: Strategy3, enabled: process.env.STRATEGY_3_ENABLED !== "false" },
  4: { name: "SMT Divergence", module: Strategy4, enabled: process.env.STRATEGY_4_ENABLED !== "false" },
};

/**
 * Run all enabled strategies and return first valid signal
 * @param {Object} marketData - Market data from Binance
 * @param {Object} config - Bot configuration
 * @returns {Promise<Object|null>} - Trade signal or null
 */
export async function analyzeAllStrategies(marketData, config) {
  console.log("\n── Multi-Strategy Analysis ──────────────────────────────\n");

  // Get all enabled strategies
  const enabledStrategies = Object.entries(STRATEGIES)
    .filter(([_, strategy]) => strategy.enabled)
    .map(([id, _]) => parseInt(id));

  console.log(`Enabled strategies: ${enabledStrategies.join(", ")}\n`);

  if (enabledStrategies.length === 0) {
    console.log("⚠️  No strategies enabled! Enable at least one strategy in .env\n");
    return null;
  }

  // Run all strategies in parallel
  const results = await Promise.all(
    enabledStrategies.map(id => runStrategy(id, marketData, config))
  );

  // Collect all validation results (including failures)
  const allValidations = results
    .filter(r => r !== null)
    .map(r => ({
      strategyId: r.strategyId,
      strategyName: r.strategyName,
      isValid: r.validation.isValid,
      conditions: r.validation.conditions,
      passedConditions: r.validation.passedConditions,
      totalConditions: r.validation.totalConditions,
    }));

  // Find first valid signal
  const validSignal = results.find(result => result !== null && result.validation.isValid);

  if (validSignal) {
    console.log(`\n✅ Strategy ${validSignal.strategyId} generated valid signal\n`);
    return {
      ...validSignal,
      allValidations, // Include all strategy results for logging
    };
  }

  console.log("\n🚫 No strategy generated valid signal\n");

  // Return failure with all validation details
  return {
    success: false,
    allValidations,
  };
}

/**
 * Run a single strategy
 * @param {number} strategyId - Strategy ID (1-6)
 * @param {Object} marketData - Market data
 * @param {Object} config - Bot configuration
 * @returns {Promise<Object|null>} - Trade signal or null
 */
async function runStrategy(strategyId, marketData, config) {
  const strategy = STRATEGIES[strategyId];

  if (!strategy) {
    console.log(`⚠️  Strategy ${strategyId} not found`);
    return null;
  }

  if (!strategy.enabled) {
    console.log(`⏭️  Strategy ${strategyId} disabled`);
    return null;
  }

  console.log(`\n── Strategy ${strategyId}: ${strategy.name} ──────────────────────────────\n`);

  try {
    // Analyze market with this strategy
    const analysis = await strategy.module.analyze(marketData, config);

    // Validate entry conditions
    const validation = await strategy.module.validate(analysis, config);

    if (validation.isValid) {
      console.log(`✅ Strategy ${strategyId} conditions met`);
      console.log(`   Passed: ${validation.passedConditions}/${validation.totalConditions}`);

      return {
        strategyId,
        strategyName: strategy.name,
        analysis,
        validation,
        signal: validation.signal,
      };
    } else {
      console.log(`🚫 Strategy ${strategyId} conditions NOT met`);
      console.log(`   Passed: ${validation.passedConditions}/${validation.totalConditions}`);

      const failed = validation.conditions
        .filter(c => !c.pass)
        .map(c => c.label)
        .join(", ");
      console.log(`   Failed: ${failed}`);

      // Return validation results even when failed (for dashboard logging)
      return {
        strategyId,
        strategyName: strategy.name,
        analysis,
        validation,
        signal: null,
      };
    }
  } catch (error) {
    console.log(`❌ Strategy ${strategyId} error: ${error.message}`);
    return {
      strategyId,
      strategyName: strategy.name,
      validation: {
        isValid: false,
        conditions: [{ label: "Error", required: "No error", actual: error.message, pass: false }],
        passedConditions: 0,
        totalConditions: 1,
      },
      signal: null,
    };
  }
}

/**
 * Get risk multiplier for a strategy
 * @param {number} strategyId - Strategy ID
 * @returns {number} - Risk multiplier (default 1.0)
 */
export function getStrategyRiskMultiplier(strategyId) {
  const multiplier = parseFloat(process.env[`STRATEGY_${strategyId}_RISK_MULTIPLIER`] || "1.0");
  return Math.max(0.1, Math.min(2.0, multiplier)); // Clamp between 0.1 and 2.0
}

/**
 * Get list of enabled strategies
 * @returns {Array} - Array of enabled strategy IDs
 */
export function getEnabledStrategies() {
  return Object.entries(STRATEGIES)
    .filter(([_, strategy]) => strategy.enabled)
    .map(([id, strategy]) => ({ id: parseInt(id), name: strategy.name }));
}

/**
 * Get strategy info
 * @param {number} strategyId - Strategy ID
 * @returns {Object|null} - Strategy info or null
 */
export function getStrategyInfo(strategyId) {
  const strategy = STRATEGIES[strategyId];
  if (!strategy) return null;

  return {
    id: strategyId,
    name: strategy.name,
    enabled: strategy.enabled,
    riskMultiplier: getStrategyRiskMultiplier(strategyId),
  };
}
