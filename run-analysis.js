import { run } from './bot.js';

// Chart data passed from Claude
const chartDataHTF = JSON.parse(process.argv[2]);
const chartDataLTF = JSON.parse(process.argv[3]);

// Run the bot analysis
run(chartDataHTF, chartDataLTF).catch(err => {
  console.error('Bot error:', err);
  process.exit(1);
});
