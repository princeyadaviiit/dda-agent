/**
 * Position Monitor
 * Continuously monitors open positions and checks for TP/SL hits
 */

import "dotenv/config";
import {
  getOpenPositions,
  updatePositionPnL,
  closePosition,
  checkTPSL,
  displayPositionSummary,
} from "./position-manager.js";
import { getCurrentPrice as getBinancePrice, convertSymbolToBinance } from "./binance-client.js";

const MONITOR_INTERVAL = parseInt(process.env.MONITOR_INTERVAL_SECONDS || "30") * 1000;
const ENABLE_NOTIFICATIONS = process.env.ENABLE_NOTIFICATIONS !== "false";

// ─── Get Current Price ────────────────────────────────────────────────────────
// Using binance-client.js directly now

// ─── Send Notification ────────────────────────────────────────────────────────

function sendNotification(message) {
  if (!ENABLE_NOTIFICATIONS) return;

  console.log("\n" + "═".repeat(60));
  console.log("🔔 NOTIFICATION");
  console.log("═".repeat(60));
  console.log(message);
  console.log("═".repeat(60) + "\n");
}

// ─── Monitor Positions ────────────────────────────────────────────────────────

export async function monitorPositions() {
  const openPositions = getOpenPositions();

  if (openPositions.length === 0) {
    console.log("📊 No open positions to monitor.\n");
    return { closedPositions: [], openPositions: [] };
  }

  console.log(`\n📊 Monitoring ${openPositions.length} open position(s)...\n`);

  const closedPositions = [];

  for (const position of openPositions) {
    const binanceSymbol = convertSymbolToBinance(position.symbol);
    let currentPrice;
    
    try {
      currentPrice = await getBinancePrice(binanceSymbol);
    } catch (error) {
      console.error(`   ❌ Failed to get price for ${position.symbol}: ${error.message}`);
      continue;
    }

    const updated = updatePositionPnL(position.id, currentPrice);
    if (!updated) continue;

    const pnlColor = updated.unrealizedPnL >= 0 ? "💚" : "❤️";
    console.log(`   ${pnlColor} ${updated.side.toUpperCase()} ${updated.symbol}`);
    console.log(`      Entry: $${updated.entryPrice.toFixed(2)} | Current: $${currentPrice.toFixed(2)}`);
    console.log(`      P&L: $${updated.unrealizedPnL.toFixed(2)} (${updated.unrealizedPnLPercent.toFixed(2)}%)`);
    console.log(`      TP: $${updated.takeProfit.toFixed(2)} | SL: $${updated.stopLoss.toFixed(2)}`);

    const tpslCheck = checkTPSL(updated, currentPrice);

    if (tpslCheck) {
      const { hit, price } = tpslCheck;

      if (hit === "tp") {
        console.log(`      🎯 TAKE PROFIT HIT!\n`);
        const closed = closePosition(position.id, price, "closed_tp");
        closedPositions.push(closed);

        sendNotification(
          `🎯 TAKE PROFIT HIT!\n\n` +
          `Position: ${closed.side.toUpperCase()} ${closed.symbol}\n` +
          `Entry: $${closed.entryPrice.toFixed(2)}\n` +
          `Exit: $${closed.exitPrice.toFixed(2)}\n` +
          `Profit: $${closed.realizedPnL.toFixed(2)} (${closed.realizedPnLPercent.toFixed(2)}%)\n` +
          `Leverage: ${closed.leverage}x\n` +
          `Risk:Reward: 1:${closed.riskRewardRatio.toFixed(1)}`
        );

      } else if (hit === "sl") {
        console.log(`      🛑 STOP LOSS HIT!\n`);
        const closed = closePosition(position.id, price, "closed_sl");
        closedPositions.push(closed);

        sendNotification(
          `🛑 STOP LOSS HIT!\n\n` +
          `Position: ${closed.side.toUpperCase()} ${closed.symbol}\n` +
          `Entry: $${closed.entryPrice.toFixed(2)}\n` +
          `Exit: $${closed.exitPrice.toFixed(2)}\n` +
          `Loss: $${closed.realizedPnL.toFixed(2)} (${closed.realizedPnLPercent.toFixed(2)}%)\n` +
          `Leverage: ${closed.leverage}x`
        );
      }
    } else {
      console.log(`      ⏳ Position still open\n`);
    }
  }

  if (closedPositions.length > 0) {
    console.log(`\n✅ Closed ${closedPositions.length} position(s) this cycle.\n`);
    displayPositionSummary();
  }

  return {
    closedPositions,
    openPositions: getOpenPositions()
  };
}

// ─── Continuous Monitoring Loop ──────────────────────────────────────────────

export async function startMonitoring() {
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  Position Monitor Started");
  console.log(`  Interval: ${MONITOR_INTERVAL / 1000}s`);
  console.log(`  Notifications: ${ENABLE_NOTIFICATIONS ? "ON" : "OFF"}`);
  console.log("═══════════════════════════════════════════════════════════\n");

  let running = true;

  process.on("SIGINT", () => {
    console.log("\n\n🛑 Stopping monitor...\n");
    running = false;
    displayPositionSummary();
    process.exit(0);
  });

  while (running) {
    try {
      await monitorPositions();
      await new Promise(resolve => setTimeout(resolve, MONITOR_INTERVAL));
    } catch (error) {
      console.error(`❌ Monitor error: ${error.message}`);
      console.log("   Retrying in 30 seconds...\n");
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }
}

// Run if executed directly
const isMainModule = process.argv[1] && process.argv[1].endsWith('monitor.js');
if (isMainModule) {
  startMonitoring();
}

export { sendNotification };
