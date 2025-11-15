# Deployment Guide - Live Data Configuration

## Updates in This Version

### ✅ Live Data Integration (Fixed)
The app was showing **live stock prices** from Polygon/FMP APIs, but **gamma exposure, options flow, and related metrics were randomly generated**.

This has been fixed! The app now fetches **real gamma exposure data** from Polygon's options API.

### ✅ Enhanced Scanner Strategies (New!)
Expanded from 6 to **10 professional scanner strategies**:

**New Scanners:**
- 🏢 **Institutional Flow** - Tracks large premium flow (>$5M) indicating institutional activity
- 💼 **Portfolio Defensive** - Blue-chip stocks ($50B+ market cap) for conservative portfolios
- 🔄 **Reversal Setup** - Identifies potential reversals using P/C ratio extremes
- 💰 **Penny Momentum** - Low-price stocks ($1-$10) with high momentum (5%+ moves)

**Enhanced Scanners:**
- 🐋 **Options Whale** - Massive options volume (50K+) with high gamma exposure
- 🔥 **Top Movers** - Improved filtering for significant price movements
- Plus: High Volume, IV Crush, Gamma Wall Pin, Short Squeeze

## How It Works Now

### Live Data Sources:
1. **Stock Prices & Volume**: Polygon.io market snapshot API ✅
2. **Gamma Exposure (GEX)**: Calculated from Polygon options chain data ✅
3. **Put/Call Ratios**: Calculated from live options volume ✅
4. **Flow Scores**: Calculated from call vs put activity ✅
5. **Net Premium**: Calculated from options price × volume ✅

### What's Calculated:
- **GEX (Gamma Exposure)**: `Σ(gamma × open_interest × 100)` for all options
- **Put/Call Ratio**: `total_put_volume / total_call_volume`
- **Flow Score**: 0-100 scale based on call/put ratio
- **Gamma Levels**: Support/resistance based on high GEX strikes

## Vercel Deployment Setup

### Step 1: Set Environment Variables

In your Vercel project dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add the following variable:

```
POLYGON_API_KEY=your_polygon_api_key
```

**Required for live gamma data:** You must set `POLYGON_API_KEY` to get real options/gamma data.

### Optional APIs (for enhanced data):
```
FMP_API_KEY=your_fmp_key                    # Additional stock data
UNUSUAL_WHALES_KEY=your_unusual_whales_key  # Premium options flow data
```

### Step 2: Get Your Polygon API Key

1. Visit [polygon.io](https://polygon.io/)
2. Sign up for a free or paid account
3. Get your API key from the dashboard
4. **Important**: The FREE tier may have rate limits. For best results with 100+ stocks, use a paid plan.

### Step 3: Redeploy

After adding environment variables:
1. Go to **Deployments** tab
2. Click the **•••** menu on the latest deployment
3. Select **Redeploy**

## How to Verify It's Working

After deployment, check the browser console (F12 → Console):

You should see logs like:
```
Got 500 stocks from Polygon
Returning 500 total stocks
85 stocks have live options data  <-- This confirms live gamma data!
```

If you see `0 stocks have live options data`, check:
1. ✅ POLYGON_API_KEY is set in Vercel
2. ✅ API key is valid and active
3. ✅ You have sufficient API credits/quota

## Rate Limiting Notes

The code fetches options data for the **top 100 stocks by volume** to avoid hitting API rate limits.

If you have a higher-tier Polygon plan, you can increase this limit in:
`app/api/stocks/route.ts` line 190:
```typescript
.slice(0, 100)  // Change to 200, 500, etc.
```

## Data That Still Needs Premium APIs

Some metrics still use placeholder values and require premium data sources:

- **IV Rank**: Needs historical volatility data (consider Unusual Whales)
- **Dark Pool Ratio**: Needs dark pool feed (consider Unusual Whales)
- **VEX (Vega Exposure)**: Would need volatility calculations

To get these, integrate Unusual Whales or similar premium API.

## Support

If live data still isn't showing:
1. Check Vercel deployment logs for API errors
2. Verify your Polygon API key has options data access
3. Check if you've exceeded API rate limits
