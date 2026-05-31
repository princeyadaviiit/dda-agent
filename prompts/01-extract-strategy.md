# Strategy Extraction Prompt

Use this after scraping YouTube transcripts with Apify.
Paste the transcript content below, then run this prompt in Claude Code.

---

I have pasted the transcripts from one or more traders below.

Read through all of the content and extract their trading strategy in structured form.
Answer these questions precisely — do not invent details that aren't in the transcripts:

1. **What indicators do they use?**
   List each one, what settings they use (if mentioned), and what they use it for.

2. **What conditions define a valid entry?**
   What specific things need to be true before they would enter a trade?
   Separate LONG entries from SHORT entries.

3. **What makes them avoid a trade?**
   What red flags do they explicitly mention? What conditions make them stay out?

4. **How do they manage risk?**
   Position sizing, stop loss placement, take profit targets — what do they say?

5. **What timeframes do they use?**
   Higher timeframe for bias, lower timeframe for entry?

Once you have extracted the strategy, format it as a `rules.json` file using this exact structure:

```json
{
  "watchlist": ["BTCUSD"],
  "default_timeframe": "4H",
  "strategy": {
    "name": "[strategy name]",
    "sources": ["[trader name and handle]"]
  },
  "indicators": {
    "[indicator_key]": "[what it tells you]"
  },
  "bias_criteria": {
    "bullish": ["condition 1", "condition 2"],
    "bearish": ["condition 1", "condition 2"],
    "neutral": ["condition 1"]
  },
  "entry_rules": {
    "long": ["condition 1", "condition 2"],
    "short": ["condition 1", "condition 2"]
  },
  "exit_rules": ["rule 1", "rule 2"],
  "risk_rules": ["rule 1", "rule 2"],
  "notes": ""
}
```

Save the output as `rules.json` in the current directory.

---

[PASTE TRANSCRIPT CONTENT BELOW THIS LINE]
The 5 Trading Strategies Covered:
CRT (Candle Range Theory) Strategy (0:15 - 3:25):

Focuses on identifying liquidity sweeps on higher timeframes (like the 1-hour chart).
After a sweep of the high or low, traders use Fair Value Gaps (FVG) on a 5-minute chart for entry confirmation.
CISD Sweep Strategy (3:26 - 6:22):

Uses a 1-hour (or 15/30-minute) timeframe to identify a swing high/low sweep.
Confirms the setup using a specific CISD line drawn from the close of the opposite candle of a significant move, entering once price closes back below/above the level.
FVG + CISD Combined Strategy (6:23 - 9:00):

Identifies a Fair Value Gap (FVG) on a high timeframe and waits for the price to tap into it.
Once the price touches the FVG zone, it drops to a lower timeframe (15-minute) to find a secondary entry confirmation using the CISD method.
Fibonacci Retracement Strategy (9:01 - 10:54):

Uses the Fibonacci tool to identify key reversal levels (specifically 0.5, 0.62, and 0.79) during trends.
Entry is triggered when price pulls back to these levels; the stop loss is placed above/below the recent swing high/low.
SMT (Smart Money Tool) Divergence Strategy (10:55 - 15:54):

Utilizes a divergence indicator to compare two correlated assets (like Bitcoin and Ethereum).
When one asset fails to make a higher high or lower low while the other does, it signals a potential trend reversal, serving as a basis for entry.
Key Takeaway: The creator emphasizes the importance of Smart Money Concepts (SMC) knowledge for effectively using these strategies and suggests consistent practice or backtesting.
...
and now i want you to modify the trading statergy that i was using to this new statergy make sure that i have pasted 5 trading statergies and if you have to check any of the conditons applies for these any staergeis execute the trade write these staegres in detial 