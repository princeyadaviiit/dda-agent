/**
 * Dashboard Server
 * Serves the trading dashboard and provides API endpoints for real-time data
 */

import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = process.env.PORT || process.env.DASHBOARD_PORT || 3000;

// File paths
const LOG_FILE = join(__dirname, '..', 'safety-check-log.json');
const ENV_FILE = join(__dirname, '..', '.env');
const CSV_FILE = join(__dirname, '..', 'trades.csv');
const RULES_FILE = join(__dirname, '..', 'rules.json');
const POSITIONS_FILE = join(__dirname, '..', 'open-positions.json');
const INDEX_FILE = join(__dirname, 'index.html');

// Helper to read JSON file
function readJSON(path, fallback = {}) {
  try {
    if (!existsSync(path)) return fallback;
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    console.error(`Error reading ${path}:`, e.message);
    return fallback;
  }
}

// Helper to read text file
function readText(path, fallback = '') {
  try {
    if (!existsSync(path)) return fallback;
    return readFileSync(path, 'utf8');
  } catch (e) {
    console.error(`Error reading ${path}:`, e.message);
    return fallback;
  }
}

// Parse .env file into object
function parseEnv(envContent) {
  const env = {};
  const lines = envContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  }
  return env;
}

// Create HTTP server
const server = createServer((req, res) => {
  const url = req.url;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Serve dashboard HTML
  if (url === '/' || url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(readText(INDEX_FILE, '<h1>Dashboard not found</h1>'));
    return;
  }

  // API: Trade log
  if (url === '/api/log') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(readJSON(LOG_FILE, { trades: [] })));
    return;
  }

  // API: Environment config
  if (url === '/api/env') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const envContent = readText(ENV_FILE, '');
    const env = parseEnv(envContent);

    // Return safe subset (no secrets)
    const safeEnv = {
      symbol: env.SYMBOL || 'BTCUSD',
      timeframe: env.TIMEFRAME_HTF || '4H',
      timeframeLTF: env.TIMEFRAME_LTF || '15m',
      paperTrading: env.PAPER_TRADING !== 'false',
      maxTradesPerDay: parseInt(env.MAX_TRADES_PER_DAY || '3'),
      maxTradeSizeUSD: parseFloat(env.MAX_TRADE_SIZE_USD || '100'),
      leverage: parseInt(env.LEVERAGE || '5'),
      riskRewardRatio: parseFloat(env.RISK_REWARD_RATIO || '2'),
      allowLong: env.ALLOW_LONG !== 'false',
      allowShort: env.ALLOW_SHORT !== 'false',
    };

    res.end(JSON.stringify(safeEnv));
    return;
  }

  // API: CSV data
  if (url === '/api/csv') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(readText(CSV_FILE, ''));
    return;
  }

  // API: Rules
  if (url === '/api/rules') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(readJSON(RULES_FILE, {})));
    return;
  }

  // API: Open positions (NEW)
  if (url === '/api/positions') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(readJSON(POSITIONS_FILE, { positions: [] })));
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  CLAUDE EXECUTE :: DASHBOARD SERVER');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  🌐 Dashboard: http://localhost:${PORT}`);
  console.log(`  📊 Monitoring: safety-check-log.json`);
  console.log(`  💼 Positions: open-positions.json`);
  console.log(`  🔄 Auto-refresh: 5 seconds`);
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('  Press Ctrl+C to stop\n');

  // Start the background cron bot loop
  const intervalMinutes = parseInt(process.env.BOT_INTERVAL_MINUTES || '240', 10);
  console.log(`  🤖 Bot Loop started, running every ${intervalMinutes} minute(s).`);
  console.log('═══════════════════════════════════════════════════════════\n');

  function runBot() {
    console.log(`\n[${new Date().toISOString()}] Triggering scheduled bot execution...`);
    exec('node bot.js', { cwd: join(__dirname, '..') }, (err, stdout, stderr) => {
      if (stdout) console.log(stdout);
      if (stderr) console.error(`[BOT STDERR]:\n${stderr}`);
      if (err) console.error(`[BOT EXEC ERROR]: ${err.message}`);
    });
  }

  // Schedule the first run after 10 seconds, then loop based on interval
  setTimeout(() => {
    runBot();
    setInterval(runBot, intervalMinutes * 60 * 1000);
  }, 10000);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down dashboard server...\n');
  server.close(() => {
    console.log('✅ Server stopped\n');
    process.exit(0);
  });
});
