# 🚀 Polygon.io Integration Setup

## ✅ Real Market Data Now Connected!

The Watchlist Scanner now uses **real market data** from Polygon.io instead of mock data.

---

## 📋 Setup Instructions

### Step 1: Add Your API Key

**Local Development (.env.local):**
1. Copy `.env.example` to `.env.local`
2. Add your Polygon API key:
```bash
POLYGON_API_KEY=your_actual_polygon_api_key_here
```

**Vercel Deployment:**
1. Go to your Vercel project dashboard
2. Navigate to **Settings → Environment Variables**
3. Add a new variable:
   - **Name**: `POLYGON_API_KEY`
   - **Value**: Your Polygon API key
   - **Environment**: Production, Preview, Development (select all)
4. Click "Save"
5. Redeploy your app (or push a new commit to trigger deployment)

---

## 🔑 Getting Your Polygon API Key

1. Go to https://polygon.io/
2. Sign up for an account
3. Navigate to your **Dashboard**
4. Copy your API key

**Pricing:**
- ✅ **Free Tier**: 5 API calls/minute (good for testing)
- 💼 **Starter Plan**: $29/month - Unlimited calls, delayed data
- 🚀 **Developer Plan**: $99/month - Real-time data
- 💎 **Advanced Plan**: $199/month - More features

**For this scanner, the Starter plan ($29/month) is recommended** as you get unlimited API calls.

---

## 📊 What Data is Fetched

The scanner now fetches **real candle data** from Polygon for:

### Symbol Data (Per Scan)
- **5-minute candles** (last 500 bars ≈ 2 trading days)
- **Daily candles** (last 500 bars ≈ 2 years)

### BFCI Component Data (Once Per Scan)
- **SPY** (S&P 500 ETF) - daily candles
- **HYG** (High Yield Bond ETF) - daily candles
- **LQD** (Investment Grade Bond ETF) - daily candles
- **VIX** (Volatility Index) - daily candles
- **DXY** (Dollar Index) - daily candles

---

## 🎯 How It Works

### API Calls Per Scan

**Default Watchlist (16 symbols):**
- BFCI data: 5 API calls (SPY, HYG, LQD, VIX, DXY)
- Symbol 5-min data: 16 API calls
- Symbol daily data: 16 API calls
- **Total: ~37 API calls per scan**

**With Auto-Refresh Enabled (1-minute):**
- ~37 calls/minute
- ~2,220 calls/hour
- **Requires paid plan** (free tier is 5 calls/min)

**Recommendation:** Use manual refresh or disable auto-refresh if on free tier.

---

## 🔄 Fallback Behavior

If your API key is **not set** or API calls **fail**:
- ✅ Scanner still works
- ⚠️ Uses mock/random data (for testing)
- 📋 Console logs will show warnings

**Check your browser console or Vercel logs to see:**
```
✓ Got 500 candles for AAPL
✓ Got 500 candles for SPY
⚠ No data from Polygon for XYZ, using mock data
```

---

## 🧪 Testing the Integration

### 1. **Local Testing**
```bash
# Add your API key to .env.local
echo "POLYGON_API_KEY=your_key_here" >> .env.local

# Start dev server
npm run dev

# Open browser to http://localhost:3000/watchlist
# Check browser console for API logs
```

### 2. **Vercel Testing**
1. Add environment variable in Vercel dashboard
2. Push a commit or manually redeploy
3. Visit your live site at `/watchlist`
4. Click "Scan Now"
5. Check Vercel function logs to see API calls

### 3. **Verify Real Data**
- Compare scanner results with your TradingView charts
- Numbers should now match actual market prices
- Indicators should calculate based on real OHLCV data

---

## 📈 Data Quality

**Polygon.io provides:**
- ✅ Real OHLCV (Open, High, Low, Close, Volume) data
- ✅ Adjusted for splits and dividends
- ✅ Intraday data (5-minute granularity)
- ✅ Historical daily data (2+ years)
- ✅ High reliability and uptime

**Data Updates:**
- **Live during market hours**: Updates every 5 minutes
- **After hours**: Last closing prices
- **Weekends**: Last Friday's close

---

## 🛠️ Troubleshooting

### Issue: "POLYGON_API_KEY not found, using mock data"

**Solution:**
- Verify environment variable is set correctly
- Check spelling: `POLYGON_API_KEY` (case-sensitive)
- Restart your dev server after adding .env.local
- On Vercel: Redeploy after adding environment variable

### Issue: API returns no data for symbol

**Possible Reasons:**
1. Symbol doesn't exist or is delisted
2. Symbol is not available on Polygon (e.g., some OTC stocks)
3. API rate limit exceeded (free tier: 5 calls/min)

**Solution:**
- Verify symbol ticker on Polygon.io
- Upgrade to paid plan for unlimited calls
- Scanner will use mock data for unavailable symbols

### Issue: Slow performance

**Solution:**
- Reduce number of symbols in watchlist
- Disable auto-refresh during development
- Use smaller timeframe (5-min loads faster than daily)

---

## 🎉 You're All Set!

Your watchlist scanner is now using **real market data** from Polygon.io!

The indicators will calculate based on actual market prices, volumes, and technical patterns - matching what you see on TradingView and other charting platforms.

**Next Steps:**
1. Add your API key
2. Scan some symbols
3. Compare with your charts
4. Start finding aligned setups! 🚀

---

## 📚 Additional Resources

- [Polygon.io API Docs](https://polygon.io/docs/stocks)
- [Watchlist Scanner Guide](./WATCHLIST_SCANNER.md)
- [Decision Dashboard Indicator](./WATCHLIST_SCANNER.md#indicator-components)

---

**Questions?** Check the main WATCHLIST_SCANNER.md documentation or reach out for support!
