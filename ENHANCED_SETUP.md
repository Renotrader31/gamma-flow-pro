# Gamma Flow Pro - Enhanced Setup Guide

## What's New

This update adds **real data integration** for AI Trade Ideas:

- **Polygon**: Real-time prices, technicals, options data
- **Unusual Whales**: Options flow, sentiment, unusual activity
- **ORTEX**: Short interest, utilization, days to cover, squeeze scores

Trade recommendations are now based on **actual market data** instead of random generation.

---

## Quick Setup (5 minutes)

### Step 1: Add Environment Variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your **gamma-flow-pro** project
3. Go to **Settings** → **Environment Variables**
4. Add these three variables:

| Name | Value |
|------|-------|
| `POLYGON_API_KEY` | Your Polygon.io API key |
| `UNUSUAL_WHALES_KEY` | Your Unusual Whales API key |
| `ORTEX_API_KEY` | Your ORTEX API key |

### Step 2: Redeploy

After adding the environment variables, you MUST redeploy:

1. Go to **Deployments** tab
2. Click the **...** menu on the latest deployment
3. Click **Redeploy**

Or push a commit to trigger auto-deploy.

---

## New Features

### Enhanced AI Trade Ideas

The AI Trade Ideas now generate recommendations based on:

1. **Squeeze Plays** - When ORTEX shows high short interest + bullish flow
2. **Unusual Flow Momentum** - When Unusual Whales detects big money moves  
3. **Trend Continuation** - When technicals align above key moving averages
4. **Bearish Setups** - When flow and technicals both point down
5. **Oversold Bounces** - When RSI < 30 signals potential reversal

Each trade idea shows:
- Data sources used (Polygon, UW, ORTEX)
- Real reasoning based on actual indicators
- Confidence score derived from signal strength
- Entry points, targets, and stops

### Live Watchlist Scanner

The watchlist scanner now:
- Uses real Polygon data (no more mock fallback)
- Requires `POLYGON_API_KEY` to be set
- Falls back to mock data only if API key is missing

---

## API Tiers Required

| Service | Minimum Tier | Used For |
|---------|-------------|----------|
| Polygon | Starter ($29/mo) | Real-time quotes, candles, options |
| Unusual Whales | Basic | Options flow, sentiment |
| ORTEX | Advanced | Short interest, squeeze scores |

---

## Troubleshooting

### "Mock data" or no live prices?
→ Check that `POLYGON_API_KEY` is set in Vercel env vars and redeploy

### AI Trade Ideas showing old random data?
→ Check that all three API keys are set and redeploy

### API errors in console?
→ Verify your API keys are valid and subscriptions are active

---

## Files Changed

- `app/lib/enhanced-api-services.ts` - New unified API service
- `app/api/trade-ideas/route.ts` - New enhanced trade ideas endpoint
- `app/api/watchlist/route.ts` - Removed hardcoded fallback key
- `app/components/AITradeIdeas.tsx` - Uses real API now
- `.env.example` - Updated with clearer instructions

---

## Security Note

**Rotate your API keys** if you ever shared them in chat or committed them to code. Go to each service dashboard and regenerate new keys.
