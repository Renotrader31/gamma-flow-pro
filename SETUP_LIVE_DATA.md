# 🚀 Setting Up Live Data for Gamma Flow Pro

This guide will help you get live market data flowing into your watchlist.

## ⚡ Quick Start (5 minutes)

### Step 1: Get Your Polygon.io API Key

1. Go to **https://polygon.io/**
2. Click "Get Your Free API Key" or "Sign Up"
3. Create an account
4. Navigate to your dashboard to find your API key

**Pricing Options:**
- **Free Tier**: 5 API calls/minute (good for testing)
- **Starter ($29/mo)**: 100 calls/minute + real-time data
- **Developer ($99/mo)**: Unlimited calls + options data

### Step 2: Add Your API Key

1. Open the `.env.local` file in the root directory
2. Replace the empty value with your key:

```bash
POLYGON_API_KEY=your_actual_key_here
```

**Example:**
```bash
POLYGON_API_KEY=abcd1234567890efghijklmnop
```

### Step 3: Restart Your Development Server

```bash
# In your terminal, stop the server (Ctrl+C or Cmd+C)
# Then restart:
npm run dev
```

### Step 4: Verify Live Data is Working

1. Open your browser to http://localhost:3000
2. Open the browser console (F12 or Cmd+Option+I)
3. Look for these log messages:
   - ✅ `Got X stocks from Polygon` (where X > 0)
   - ✅ `X stocks have live options data`
   - ❌ **NOT** `No API data available, using defaults`

## 📊 Current Data Flow

Once your API key is set up, here's what happens:

```
1. Frontend requests data
   ↓
2. /api/stocks calls Polygon.io API
   ↓
3. Fetches 500 stock snapshots
   ↓
4. For each stock, fetches options chain
   ↓
5. Calculates GEX, DEX, Flow Score, etc.
   ↓
6. Returns live data to your watchlist
```

## 🎯 Optional: Enhanced Data Sources

For even better data quality, add these optional APIs:

### Financial Modeling Prep (Fundamentals)
```bash
FMP_API_KEY=your_key_here
```
Get key at: https://financialmodelingprep.com/

### Unusual Whales (Options Flow)
```bash
UNUSUAL_WHALES_KEY=your_key_here
```
Get key at: https://unusualwhales.com/

## ⚠️ Troubleshooting

### "No API data available, using defaults"
- **Cause**: API key is missing or invalid
- **Fix**: Double-check your `.env.local` file and restart server

### "Polygon response not OK: 403"
- **Cause**: Invalid API key
- **Fix**: Verify you copied the key correctly (no extra spaces)

### "Polygon response not OK: 429"
- **Cause**: Rate limit exceeded (too many requests)
- **Fix**: Upgrade to a paid plan or wait a minute

### Data looks stale
- **Cause**: Caching issue
- **Fix**: Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

## 📈 What You'll Get With Live Data

Your watchlist will now show:
- ✅ Real-time stock prices
- ✅ Actual volume and price changes
- ✅ Live gamma exposure (GEX)
- ✅ Real put/call ratios
- ✅ Actual options flow data
- ✅ True IV rank and metrics
- ✅ **NEW: Fair Value Gaps (FVG)**
- ✅ **NEW: Order Flow Analysis**
- ✅ **NEW: Liquidity Zones**

## 🎉 Next Steps

Once you have live data working:
1. Try the different scanner modes (Intraday, Swing, Long-Term)
2. Check out the 10 watchlist strategies on the home page
3. Explore the new **Liquidity Hunter** mode (coming in next commit)

---

**Need Help?** Check the console logs in your browser's developer tools for detailed error messages.
