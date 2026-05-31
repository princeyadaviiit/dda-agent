# Delta Exchange India API Setup Guide

This guide walks you through creating API credentials for Delta Exchange India.

## Prerequisites

- A verified Delta Exchange India account
- 2FA (Two-Factor Authentication) enabled on your account

## Step-by-Step Instructions

### 1. Log in to Delta Exchange India

Go to [https://www.india.delta.exchange](https://www.india.delta.exchange) and log in to your account.

### 2. Navigate to API Management

1. Click on your **profile icon** in the top-right corner
2. Select **Settings** from the dropdown menu
3. In the left sidebar, click on **API Management**

### 3. Create a New API Key

1. Click the **Create New API** button
2. You'll be prompted to enter your 2FA code
3. Enter the 6-digit code from your authenticator app

### 4. Configure API Permissions

**IMPORTANT:** For security, only enable the minimum permissions needed:

- ✅ **Read** - Enable this (required to check balances and positions)
- ✅ **Trade** - Enable this (required to place orders)
- ❌ **Withdraw** - **NEVER enable this** (keep your funds safe)

### 5. Set IP Whitelist (Recommended)

For additional security:

1. Enable **IP Whitelist**
2. Add your current IP address
3. If deploying to Railway, you'll need to add Railway's IP ranges later

> **Note:** If you're not sure about IP whitelisting, you can skip this initially, but it's highly recommended for production use.

### 6. Generate the API Key

1. Click **Generate API Key**
2. You'll see two values:
   - **API Key** - A long string starting with letters/numbers
   - **API Secret** - Another long string (shown only once)

### 7. Save Your Credentials

**CRITICAL:** The API Secret is shown only once. Copy both values immediately:

```
API Key: abc123def456...
API Secret: xyz789ghi012...
```

Store these securely - you'll need them for the `.env` file.

### 8. Add to Your .env File

Open your `.env` file and add:

```bash
DELTA_API_KEY=your_api_key_here
DELTA_API_SECRET=your_api_secret_here
DELTA_BASE_URL=https://api.india.delta.exchange
```

## Security Best Practices

1. **Never share your API credentials** with anyone
2. **Never commit your .env file** to git (it's already in .gitignore)
3. **Keep withdrawals disabled** - there's no reason for a trading bot to withdraw funds
4. **Use IP whitelisting** when possible
5. **Regularly rotate your API keys** (every 3-6 months)
6. **Monitor your API usage** in the Delta Exchange dashboard

## Testing Your API Connection

After setting up your credentials, test the connection:

```bash
node bot.js
```

If configured correctly, you should see:

```
✅ Delta Exchange API connected
📄 Trade log: /path/to/trades.csv
```

## Troubleshooting

### "Invalid API Key" Error

- Double-check that you copied the API Key correctly (no extra spaces)
- Ensure the API Key hasn't been deleted from Delta Exchange
- Verify you're using the India API endpoint: `https://api.india.delta.exchange`

### "Invalid Signature" Error

- Verify your API Secret is correct
- Check that your system time is synchronized (Delta Exchange requires accurate timestamps)
- On Windows: `w32tm /resync`
- On Mac/Linux: `sudo ntpdate -s time.nist.gov`

### "Insufficient Permissions" Error

- Go back to Delta Exchange → API Management
- Edit your API key and ensure **Trade** permission is enabled

### "IP Not Whitelisted" Error

- If you enabled IP whitelisting, add your current IP address
- Find your IP: [https://whatismyipaddress.com](https://whatismyipaddress.com)
- Add it to the whitelist in Delta Exchange → API Management

## Product IDs (Symbols)

Delta Exchange uses specific product IDs for trading pairs. Common ones:

- **BTCUSD** - Bitcoin perpetual futures
- **ETHUSD** - Ethereum perpetual futures
- **SOLUSD** - Solana perpetual futures

To find the correct product ID:
1. Go to Delta Exchange trading page
2. Select your desired contract
3. The product ID is shown in the URL or contract details

Update your `.env` file:

```bash
SYMBOL=BTCUSD
```

## Rate Limits

Delta Exchange India has the following rate limits:

- **REST API**: 100 requests per 10 seconds
- **Order Placement**: 50 orders per 10 seconds

The bot is designed to stay well within these limits when running on a schedule (e.g., every 4 hours).

## Support

If you encounter issues:

- Delta Exchange Support: [support@delta.exchange](mailto:support@delta.exchange)
- Delta Exchange Docs: [https://docs.delta.exchange](https://docs.delta.exchange)
- Delta Exchange API Docs: [https://docs.delta.exchange/api](https://docs.delta.exchange/api)

---

**Ready?** Once your API credentials are in `.env`, you're all set to run the bot!
