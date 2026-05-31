/**
 * Binance Futures API Client
 *
 * Fetches OHLCV data from Binance Futures for technical analysis.
 * No authentication required for market data endpoints.
 */

const BINANCE_FUTURES_BASE = "https://fapi.binance.com";

/**
 * Convert bot timeframe format to Binance interval format
 * @param {string} timeframe - Bot format (15m, 4H, 1D)
 * @returns {string} Binance format (15m, 4h, 1d)
 */
function convertTimeframeToBinanceInterval(timeframe) {
  const map = {
    "1m": "1m",
    "3m": "3m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1H": "1h",
    "2H": "2h",
    "4H": "4h",
    "6H": "6h",
    "8H": "8h",
    "12H": "12h",
    "1D": "1d",
    "3D": "3d",
    "1W": "1w",
    "1M": "1M",
  };

  return map[timeframe] || timeframe.toLowerCase();
}

/**
 * Convert symbol from Delta format to Binance format
 * @param {string} symbol - Delta format (BTCUSD, ETHUSD)
 * @returns {string} Binance format (BTCUSDT, ETHUSDT)
 */
function convertSymbolToBinance(symbol) {
  // Delta uses BTCUSD, Binance Futures uses BTCUSDT
  if (symbol.endsWith("USD") && !symbol.endsWith("USDT")) {
    return symbol.replace("USD", "USDT");
  }
  return symbol;
}

/**
 * Fetch OHLCV candles from Binance Futures
 * @param {string} symbol - Trading pair (BTCUSDT)
 * @param {string} interval - Binance interval (1m, 5m, 15m, 1h, 4h, 1d)
 * @param {number} limit - Number of candles to fetch (max 1500, default 100)
 * @returns {Promise<Array>} Array of candle objects
 */
async function fetchCandles(symbol, interval, limit = 100) {
  const url = `${BINANCE_FUTURES_BASE}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Binance API error: ${error.msg || response.statusText}`);
    }

    const data = await response.json();

    // Binance returns: [timestamp, open, high, low, close, volume, closeTime, quoteVolume, trades, takerBuyBase, takerBuyQuote, ignore]
    const candles = data.map((bar) => ({
      time: bar[0], // Unix timestamp in milliseconds
      open: parseFloat(bar[1]),
      high: parseFloat(bar[2]),
      low: parseFloat(bar[3]),
      close: parseFloat(bar[4]),
      volume: parseFloat(bar[5]),
    }));

    return candles;
  } catch (error) {
    throw new Error(`Failed to fetch Binance data: ${error.message}`);
  }
}

/**
 * Get current price for a symbol
 * @param {string} symbol - Trading pair (BTCUSDT)
 * @returns {Promise<number>} Current price
 */
async function getCurrentPrice(symbol) {
  const url = `${BINANCE_FUTURES_BASE}/fapi/v1/ticker/price?symbol=${symbol}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.statusText}`);
    }

    const data = await response.json();
    return parseFloat(data.price);
  } catch (error) {
    throw new Error(`Failed to fetch current price: ${error.message}`);
  }
}

/**
 * Test Binance API connection
 * @returns {Promise<boolean>} True if connection successful
 */
async function testConnection() {
  try {
    const response = await fetch(`${BINANCE_FUTURES_BASE}/fapi/v1/ping`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

export {
  fetchCandles,
  getCurrentPrice,
  testConnection,
  convertTimeframeToBinanceInterval,
  convertSymbolToBinance,
};
