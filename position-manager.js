/**
 * Position Manager
 * Tracks open positions with entry, TP, SL, leverage, and P&L
 */

import { readFileSync, writeFileSync, existsSync } from "fs";

const POSITIONS_FILE = "open-positions.json";

// ─── Load/Save Positions ──────────────────────────────────────────────────────

export function loadPositions() {
  if (!existsSync(POSITIONS_FILE)) {
    return { positions: [] };
  }
  return JSON.parse(readFileSync(POSITIONS_FILE, "utf8"));
}

export function savePositions(data) {
  writeFileSync(POSITIONS_FILE, JSON.stringify(data, null, 2));
}

// ─── Add New Position ─────────────────────────────────────────────────────────

export function addPosition(positionData) {
  const positions = loadPositions();

  const position = {
    id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    symbol: positionData.symbol,
    side: positionData.side, // "long" or "short"
    entryPrice: positionData.entryPrice,
    quantity: positionData.quantity,
    leverage: positionData.leverage,
    stopLoss: positionData.stopLoss,
    takeProfit: positionData.takeProfit,
    riskRewardRatio: positionData.riskRewardRatio,
    entryTime: new Date().toISOString(),
    status: "open", // "open", "closed_tp", "closed_sl", "closed_manual"
    orderId: positionData.orderId || null,
    paperTrading: positionData.paperTrading || false,

    // ICT Analysis snapshot
    ictAnalysis: positionData.ictAnalysis || {},

    // P&L tracking
    unrealizedPnL: 0,
    unrealizedPnLPercent: 0,
    realizedPnL: null,
    realizedPnLPercent: null,

    // Exit tracking
    exitPrice: null,
    exitTime: null,
    exitReason: null,
  };

  positions.positions.push(position);
  savePositions(positions);

  console.log(`\n✅ Position added: ${position.id}`);
  console.log(`   ${position.side.toUpperCase()} ${position.symbol} @ $${position.entryPrice.toFixed(2)}`);
  console.log(`   Leverage: ${position.leverage}x | Quantity: ${position.quantity}`);
  console.log(`   TP: $${position.takeProfit.toFixed(2)} | SL: $${position.stopLoss.toFixed(2)}`);
  console.log(`   Risk:Reward = 1:${position.riskRewardRatio}\n`);

  return position;
}

// ─── Update Position P&L ──────────────────────────────────────────────────────

export function updatePositionPnL(positionId, currentPrice) {
  const data = loadPositions();
  const position = data.positions.find(p => p.id === positionId && p.status === "open");

  if (!position) return null;

  let pnl = 0;
  let pnlPercent = 0;

  if (position.side === "long") {
    pnl = (currentPrice - position.entryPrice) * position.quantity * position.leverage;
    pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100 * position.leverage;
  } else if (position.side === "short") {
    pnl = (position.entryPrice - currentPrice) * position.quantity * position.leverage;
    pnlPercent = ((position.entryPrice - currentPrice) / position.entryPrice) * 100 * position.leverage;
  }

  position.unrealizedPnL = pnl;
  position.unrealizedPnLPercent = pnlPercent;

  savePositions(data);
  return position;
}

// ─── Close Position ───────────────────────────────────────────────────────────

export function closePosition(positionId, exitPrice, exitReason) {
  const data = loadPositions();
  const position = data.positions.find(p => p.id === positionId);

  if (!position) {
    console.log(`⚠️  Position ${positionId} not found`);
    return null;
  }

  if (position.status !== "open") {
    console.log(`⚠️  Position ${positionId} already closed`);
    return position;
  }

  // Calculate final P&L
  let realizedPnL = 0;
  let realizedPnLPercent = 0;

  if (position.side === "long") {
    realizedPnL = (exitPrice - position.entryPrice) * position.quantity * position.leverage;
    realizedPnLPercent = ((exitPrice - position.entryPrice) / position.entryPrice) * 100 * position.leverage;
  } else if (position.side === "short") {
    realizedPnL = (position.entryPrice - exitPrice) * position.quantity * position.leverage;
    realizedPnLPercent = ((position.entryPrice - exitPrice) / position.entryPrice) * 100 * position.leverage;
  }

  position.status = exitReason;
  position.exitPrice = exitPrice;
  position.exitTime = new Date().toISOString();
  position.exitReason = exitReason;
  position.realizedPnL = realizedPnL;
  position.realizedPnLPercent = realizedPnLPercent;

  savePositions(data);

  const profitEmoji = realizedPnL >= 0 ? "💰" : "📉";
  const statusEmoji = exitReason === "closed_tp" ? "🎯" : exitReason === "closed_sl" ? "🛑" : "✋";

  console.log(`\n${statusEmoji} Position closed: ${position.id}`);
  console.log(`   ${position.side.toUpperCase()} ${position.symbol}`);
  console.log(`   Entry: $${position.entryPrice.toFixed(2)} → Exit: $${exitPrice.toFixed(2)}`);
  console.log(`   ${profitEmoji} P&L: $${realizedPnL.toFixed(2)} (${realizedPnLPercent.toFixed(2)}%)`);
  console.log(`   Reason: ${exitReason.replace('closed_', '').toUpperCase()}\n`);

  return position;
}

// ─── Get Open Positions ───────────────────────────────────────────────────────

export function getOpenPositions() {
  const data = loadPositions();
  return data.positions.filter(p => p.status === "open");
}

// ─── Get All Positions ────────────────────────────────────────────────────────

export function getAllPositions() {
  const data = loadPositions();
  return data.positions;
}

// ─── Check if TP or SL Hit ────────────────────────────────────────────────────

export function checkTPSL(position, currentPrice) {
  if (position.status !== "open") return null;

  if (position.side === "long") {
    // Long position: TP above entry, SL below entry
    if (currentPrice >= position.takeProfit) {
      return { hit: "tp", price: currentPrice };
    }
    if (currentPrice <= position.stopLoss) {
      return { hit: "sl", price: currentPrice };
    }
  } else if (position.side === "short") {
    // Short position: TP below entry, SL above entry
    if (currentPrice <= position.takeProfit) {
      return { hit: "tp", price: currentPrice };
    }
    if (currentPrice >= position.stopLoss) {
      return { hit: "sl", price: currentPrice };
    }
  }

  return null;
}

// ─── Get Position Summary ─────────────────────────────────────────────────────

export function getPositionSummary() {
  const positions = getAllPositions();
  const open = positions.filter(p => p.status === "open");
  const closed = positions.filter(p => p.status !== "open");

  const totalPnL = closed.reduce((sum, p) => sum + (p.realizedPnL || 0), 0);
  const winners = closed.filter(p => (p.realizedPnL || 0) > 0).length;
  const losers = closed.filter(p => (p.realizedPnL || 0) < 0).length;
  const winRate = closed.length > 0 ? (winners / closed.length) * 100 : 0;

  return {
    totalPositions: positions.length,
    openPositions: open.length,
    closedPositions: closed.length,
    totalPnL,
    winners,
    losers,
    winRate,
    open,
    closed,
  };
}

// ─── Display Position Summary ─────────────────────────────────────────────────

export function displayPositionSummary() {
  const summary = getPositionSummary();

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  Position Summary");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Total Positions: ${summary.totalPositions}`);
  console.log(`  Open: ${summary.openPositions} | Closed: ${summary.closedPositions}`);
  console.log(`  Win Rate: ${summary.winRate.toFixed(1)}% (${summary.winners}W / ${summary.losers}L)`);
  console.log(`  Total P&L: $${summary.totalPnL.toFixed(2)}`);
  console.log("═══════════════════════════════════════════════════════════\n");

  if (summary.open.length > 0) {
    console.log("Open Positions:");
    summary.open.forEach(p => {
      console.log(`  • ${p.side.toUpperCase()} ${p.symbol} @ $${p.entryPrice.toFixed(2)}`);
      console.log(`    TP: $${p.takeProfit.toFixed(2)} | SL: $${p.stopLoss.toFixed(2)}`);
      console.log(`    Unrealized P&L: $${p.unrealizedPnL.toFixed(2)} (${p.unrealizedPnLPercent.toFixed(2)}%)\n`);
    });
  }
}
