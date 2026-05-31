/**
 * Wrapper script to run the trading bot with TradingView data
 * Called by Claude with chart data as arguments
 */

import { run } from './bot.js';
import { readFileSync } from 'fs';

async function main() {
  try {
    // Read chart data from temp files written by Claude
    const htfDataPath = process.argv[2];
    const ltfDataPath = process.argv[3];

    if (!htfDataPath || !ltfDataPath) {
      console.error('❌ Usage: node run-bot.js <htf-data.json> <ltf-data.json>');
      process.exit(1);
    }

    console.log('📊 Loading chart data from TradingView...');
    const chartDataHTF = JSON.parse(readFileSync(htfDataPath, 'utf8'));
    const chartDataLTF = JSON.parse(readFileSync(ltfDataPath, 'utf8'));

    console.log(`✅ HTF: ${chartDataHTF.bars.length} bars loaded`);
    console.log(`✅ LTF: ${chartDataLTF.bars.length} bars loaded`);

    // Run the bot analysis
    await run(chartDataHTF, chartDataLTF);

    console.log('\n✅ Bot analysis complete');
    process.exit(0);

  } catch (error) {
    console.error('❌ Bot error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
