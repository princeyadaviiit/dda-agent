import { exec } from 'child_process';

const INTERVAL_MINUTES = 15;
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;

function runBot() {
  console.log(`\n[${new Date().toISOString()}] Running node bot.js...`);
  
  exec('node bot.js', (error, stdout, stderr) => {
    if (stdout) console.log(stdout);
    if (stderr) console.error(`[Error Output]:\n${stderr}`);
    
    if (error) {
      console.error(`[Execution Error]: ${error.message}`);
    } else {
      console.log(`\n[${new Date().toISOString()}] Bot run completed successfully.`);
    }
  });
}

console.log(`\n🤖 Starting local bot loop. The bot will run every ${INTERVAL_MINUTES} minutes.`);
console.log(`Press Ctrl+C to stop.\n`);

// Run immediately for the first time
runBot();

// Schedule subsequent runs
setInterval(runBot, INTERVAL_MS);
