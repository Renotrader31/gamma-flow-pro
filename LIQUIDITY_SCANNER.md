# Liquidity Hunter Scanner - Custom Watchlist Edition

## Overview

The **Liquidity Hunter Scanner** is an advanced trading tool that translates the TradingView "Liquidity Hunter" indicator (FVG + Order Flow) into a powerful web-based scanner. It analyzes Fair Value Gaps (FVGs) and Order Flow across multiple symbols simultaneously, helping you identify high-probability institutional liquidity zones.

### What Makes This Scanner Unique

✅ **Custom Symbol Tracking** - Scan any symbols you want, not just top movers
✅ **Pre-configured Watchlists** - Popular, Tech, Meme stocks, Semiconductors, ETFs, Energy, Banks
✅ **Real-Time FVG Detection** - Identifies unfilled Fair Value Gaps in live market data
✅ **Order Flow Analysis** - Estimates buy/sell volume and delta from price action
✅ **Liquidity Zone Identification** - Highlights FVGs with strong institutional interest
✅ **Advanced Configuration** - Customize FVG thresholds, delta requirements, and multipliers
✅ **Auto-Refresh Mode** - Continuous monitoring with 60-second updates

---

## Key Concepts

### 1. Fair Value Gaps (FVGs)

**What are FVGs?**
Fair Value Gaps are price inefficiencies where the market moves so quickly that it leaves a "gap" in trading. These gaps often get filled as the market returns to find liquidity.

**Types:**
- **Bullish FVG**: Gap between bar[2].high and current.low (upward gap)
- **Bearish FVG**: Gap between bar[2].low and current.high (downward gap)

**How they're detected:**
```
Bullish FVG = current.low - bar[2].high > threshold%
Bearish FVG = bar[2].low - current.high > threshold%
```

**Why they matter:**
- Institutional traders often leave FVGs when aggressively entering positions
- Price frequently returns to fill these gaps
- High-volume FVGs can act as support/resistance zones

### 2. Order Flow Analysis

**What is Order Flow?**
Order Flow estimates the buying vs. selling pressure from candlestick patterns and volume.

**How it's calculated:**
```typescript
buyVolume = volume * buyRatio
sellVolume = volume * (1 - buyRatio)
delta = buyVolume - sellVolume
```

**Advanced Pressure Method:**
- Analyzes where the close is relative to high/low
- Factors in the relationship between close and open
- More accurate than simple green/red candle analysis

**What to look for:**
- **Positive Delta** (green): More buying than selling
- **Negative Delta** (red): More selling than buying
- **High Delta Ratio**: Current delta >> average delta = significant move

### 3. Liquidity Zones

**What are Liquidity Zones?**
Liquidity Zones are FVGs that formed with exceptionally strong order flow (high delta).

**Criteria:**
```
abs(delta) >= deltaThreshold * liquidityMultiplier
```

**Default Settings:**
- Delta Threshold: 1,000
- Liquidity Multiplier: 1.5x
- Required Delta: 1,500+ for liquidity zone

**Why they're important:**
- Indicate institutional order flow
- High probability of price returning to these zones
- Often become major support/resistance levels

---

## Using the Scanner

### Quick Start

1. **Navigate** to the scanner:
   - Click "Liquidity Scanner" button on the home page
   - Or visit `/liquidity-scanner` directly

2. **Choose a Watchlist**:
   - Click any pre-configured watchlist button (Popular, Tech, etc.)
   - Or enter custom symbols in the input field

3. **Scan**:
   - Click "Scan Now" to analyze all symbols
   - View results sorted by Liquidity Score

4. **Analyze Results**:
   - Click the expand button (▼) to see detailed analysis
   - Review FVGs, Order Flow, and Active Signals

### Pre-configured Watchlists

| Watchlist | Symbols | Best For |
|-----------|---------|----------|
| **Popular** | SPY, QQQ, NVDA, TSLA, AAPL, AMD, MSFT, GOOGL, AMZN, META | General market scanning |
| **Tech** | NVDA, AMD, INTC, TSM, AVGO, QCOM, MU, AMAT, LRCX, KLAC | Technology sector |
| **Memes** | GME, AMC, BBBY, PLTR, SOFI, HOOD, RIVN, LCID, NIO, COIN | High-volatility retail favorites |
| **Semiconductors** | NVDA, AMD, INTC, TSM, AVGO, QCOM, MU, AMAT, LRCX, ASML | Chip stocks |
| **ETFs** | SPY, QQQ, IWM, DIA, SOXL, TQQQ, SPXL, ARKK, GLD, TLT | Index and leveraged ETFs |
| **Energy** | XLE, XOM, CVX, SLB, COP, EOG, OXY, PSX, VLO, MPC | Energy sector |
| **Banks** | JPM, BAC, WFC, C, GS, MS, SCHW, BLK, USB, PNC | Financial sector |

### Custom Symbols

**Adding Custom Symbols:**
1. Type symbols separated by commas: `AAPL, MSFT, GOOGL`
2. Click "Load" or press Enter
3. Scanner will analyze up to 50 symbols

**Managing Symbols:**
- Click the ✕ on any symbol chip to remove it
- Mix and match from different watchlists
- Save your custom list by bookmarking the page

---

## Understanding the Results

### Liquidity Score (0-100)

The Liquidity Score aggregates multiple factors:

**Base Score:** 50

**+10 points per** active liquidity zone

**+15 points** for significant buying/selling (delta > threshold)

**+10 points** for high delta ratio (delta > 2x average)

**+10 points** for multiple FVGs in same direction as order flow

**Score Interpretation:**
- **80-100**: 🟢 Exceptional liquidity - High institutional interest
- **60-79**: 🔵 Strong liquidity - Good trading opportunities
- **40-59**: 🟡 Moderate liquidity - Some activity
- **0-39**: ⚪ Low liquidity - Limited signals

### Results Table Columns

| Column | Description |
|--------|-------------|
| **Symbol** | Stock ticker |
| **Price** | Current price |
| **Change** | % change today |
| **Liq Score** | Liquidity Score (0-100) |
| **FVGs (B/B)** | Bullish FVGs / Bearish FVGs |
| **Liq Zones** | Count of high-delta liquidity zones |
| **Order Flow** | BUY/SELL/Neutral based on significant delta |
| **Delta** | Current buy-sell volume delta |
| **Signals** | Number of active liquidity signals |

### Expanded Details

Click the expand button (▼) to view:

**Order Flow Analysis:**
- Buy Volume / Sell Volume
- Current Delta (with positive/negative indicator)
- Average Delta (for context)
- Delta Ratio (current / average)

**Fair Value Gaps:**
- Total Active FVGs
- Bullish FVG count
- Bearish FVG count
- Liquidity Zone count

**Active Signals:**
- 🟢 BULLISH LIQUIDITY at $X - $Y
- 🔴 BEARISH LIQUIDITY at $X - $Y
- Price range for each liquidity zone

---

## Filters & Configuration

### Basic Filters

**Min Liquidity Score (0-100)**
- Filter out low-liquidity stocks
- Recommended: 50+ for active trading

**Min FVG Count (0-10)**
- Require minimum number of FVGs
- Recommended: 1+ to see only stocks with gaps

**Liquidity Zones Only**
- Show only stocks with high-delta zones
- Best for finding institutional activity

**Active Signals Only**
- Show only stocks with current price in liquidity zones
- Use for immediate trading opportunities

### Advanced Configuration

**FVG Threshold (0.1% - 5%)**
- Minimum gap size as % of price
- Lower = more sensitive (more FVGs detected)
- Higher = less noise (only significant gaps)
- **Default: 0.5%**

**Delta Threshold (100 - 50,000)**
- Minimum delta to qualify as "significant"
- Lower = more sensitive to order flow
- Higher = only major institutional moves
- **Default: 1,000**

**Liquidity Multiplier (1.0x - 3.0x)**
- Multiplier for liquidity zone qualification
- Required delta = threshold × multiplier
- Higher = fewer but stronger zones
- **Default: 1.5x** (requires 1,500 delta)

---

## Trading Strategies

### Strategy 1: Liquidity Zone Bounce

**Setup:**
1. Find stock with Liquidity Score > 70
2. Identify bullish FVG with active signal
3. Wait for price to enter the FVG zone
4. Confirm with positive order flow delta

**Entry:** Price touches bottom of bullish FVG
**Stop:** Below FVG zone
**Target:** Previous high or 2:1 R/R

**Example:**
```
Symbol: NVDA
Liq Score: 85
Signal: 🟢 BULLISH LIQUIDITY at $870 - $875
Current Price: $871
Delta: +2,500 (strong buying)

Action: Enter LONG at $871
Stop: $869.50 (below FVG)
Target: $877+ (2:1 R/R)
```

### Strategy 2: Counter-Trend Liquidity Fill

**Setup:**
1. Find stock in strong trend (up or down)
2. Identify unfilled FVG in opposite direction
3. Wait for reversal signs (divergence, exhaustion)
4. Enter when price approaches FVG

**Entry:** Price enters unfilled FVG
**Stop:** Beyond FVG midpoint
**Target:** FVG fill + continuation

**Example:**
```
Symbol: TSLA
Liq Score: 72
Bearish FVG: $238 - $242 (unfilled)
Current Price: $245 (uptrend weakening)
Delta: -1,800 (selling pressure)

Action: Enter SHORT as price rejects $242
Stop: $243 (above FVG top)
Target: $238 (FVG fill)
```

### Strategy 3: Multiple FVG Confluence

**Setup:**
1. Find stocks with 3+ FVGs in same direction
2. All FVGs should be liquidity zones (high delta)
3. Order flow confirms direction
4. Enter on pullback to nearest FVG

**Entry:** Price enters nearest FVG
**Stop:** Below all FVGs
**Target:** Beyond previous high/low

**Example:**
```
Symbol: AMD
Liq Score: 88
3 Bullish FVGs:
  - $165 - $167
  - $168 - $170
  - $172 - $174
Current Price: $166
Delta: +3,200 (very strong buying)

Action: Enter LONG at $166 (in first FVG)
Stop: $164 (below all zones)
Target: $180+ (breakout continuation)
```

---

## Best Practices

### 1. **Use with Other Indicators**
- Don't rely solely on FVGs
- Combine with trend analysis, support/resistance
- Check broader market conditions (SPY, QQQ)

### 2. **Focus on High Scores**
- Liquidity Score 70+ = best setups
- Multiple liquidity zones = stronger signal
- Confirm with volume and price action

### 3. **Respect Order Flow**
- Positive delta + bullish FVG = strong long setup
- Negative delta + bearish FVG = strong short setup
- Conflicting signals = wait for clarity

### 4. **Monitor Delta Ratio**
- Delta ratio > 2x average = exceptional move
- Institutional activity likely present
- Higher probability of FVG fill

### 5. **Time Your Entries**
- Don't chase - wait for price to enter FVG
- Use limit orders at FVG boundaries
- Better R/R when patient

### 6. **Risk Management**
- Always use stops below/above FVG zones
- Position size based on liquidity score
- Higher scores = larger position (within risk limits)

---

## Auto-Refresh Mode

**What it does:**
- Automatically rescans every 60 seconds
- Updates prices, FVGs, and order flow
- Keeps you in sync with live markets

**When to use:**
- Active trading hours (9:30 AM - 4:00 PM ET)
- Monitoring for signal triggers
- Day trading setups

**When to disable:**
- Reduce API usage
- Analyzing static watchlists
- Backtesting or research

**Note:** Auto-refresh uses API calls which may count against rate limits. Use strategically during market hours.

---

## API Integration

### Endpoint

```
GET /api/liquidity-hunter?symbols=AAPL,TSLA,NVDA&fvgThreshold=0.5&deltaThreshold=1000&liqMultiplier=1.5
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `symbols` | string | required | Comma-separated symbols (max 50) |
| `fvgThreshold` | number | 0.5 | Min FVG gap size as % |
| `deltaThreshold` | number | 1000 | Significant delta threshold |
| `liqMultiplier` | number | 1.5 | Liquidity zone multiplier |

### Response

```json
{
  "data": [
    {
      "symbol": "AAPL",
      "price": 195.82,
      "changePercent": -0.5,
      "volume": 52000000,
      "liquidity": {
        "activeFVGCount": 3,
        "bullishFVGCount": 2,
        "bearishFVGCount": 1,
        "liquidityZoneCount": 1,
        "buyVolume": 850000,
        "sellVolume": 650000,
        "delta": 200000,
        "avgAbsDelta": 150000,
        "isSignificantBuying": false,
        "isSignificantSelling": false,
        "liquidityScore": 65,
        "liquiditySignals": []
      }
    }
  ],
  "timestamp": "2025-11-19T12:00:00.000Z",
  "status": "success",
  "count": 1,
  "config": {
    "enableFVG": true,
    "fvgThreshold": 0.5,
    "ofDeltaThreshold": 1000,
    "liqDeltaMultiplier": 1.5
  }
}
```

---

## Troubleshooting

### No Results Showing

**Possible Causes:**
1. No symbols entered - Load a watchlist or enter custom symbols
2. Filters too strict - Lower Min Liquidity Score or Min FVG Count
3. API error - Check browser console for errors

**Solutions:**
- Click "Scan Now" to refresh
- Try a pre-configured watchlist
- Lower filter thresholds

### Scanner Runs Slowly

**Possible Causes:**
1. Too many symbols (50 max recommended)
2. Network latency
3. API rate limiting

**Solutions:**
- Reduce symbol count
- Use pre-configured watchlists (10 symbols each)
- Disable auto-refresh when not needed

### Inaccurate Data

**Possible Causes:**
1. Market closed (using mock data)
2. API limits reached
3. Symbol not found

**Solutions:**
- Verify symbols are correct
- Check API key configuration in `.env`
- Run during market hours for live data

---

## Technical Details

### Data Sources

**Primary:** Polygon.io (5-minute bars)
**Fallback:** FMP (5-minute historical data)
**Mock Data:** Generated when APIs unavailable

### Calculation Method

1. **Fetch 100 bars** of 5-minute data (last ~8 hours)
2. **Detect FVGs** by comparing bar[i-2], bar[i-1], bar[i]
3. **Calculate Order Flow** using advanced pressure method
4. **Update FVG status** (filled vs. unfilled)
5. **Identify Liquidity Zones** based on delta at creation
6. **Generate Signals** when price enters active zones with confirming flow
7. **Calculate Liquidity Score** based on all factors

### Performance

- **50 symbols** analyzed in ~5-10 seconds (with API)
- **Mock data** generation: instant
- **Caching:** None (always live data)
- **Rate limits:** Depends on API provider

---

## Comparison with Pine Script Indicator

| Feature | Pine Script | Liquidity Scanner |
|---------|-------------|-------------------|
| FVG Detection | ✅ | ✅ |
| Order Flow | ✅ | ✅ |
| Liquidity Zones | ✅ | ✅ |
| Multiple Symbols | ❌ | ✅ (up to 50) |
| Custom Watchlists | ❌ | ✅ |
| Auto-Refresh | ❌ | ✅ |
| Filtering | ❌ | ✅ |
| API Access | ❌ | ✅ |
| Visual Charts | ✅ | ❌ (table view) |

---

## Future Enhancements

Potential improvements:

- [ ] Chart visualization with FVG boxes
- [ ] Historical FVG performance tracking
- [ ] Email/SMS alerts for liquidity signals
- [ ] Backtesting capability
- [ ] Export results to CSV
- [ ] Save custom watchlists
- [ ] Dark pool integration
- [ ] Multi-timeframe analysis (1min, 15min, 1hr, 1day)

---

## Support & Resources

**Related Documentation:**
- [LIQUIDITY_HUNTER_IMPLEMENTATION.md](LIQUIDITY_HUNTER_IMPLEMENTATION.md) - Technical implementation details
- [WATCHLIST_SCANNER.md](WATCHLIST_SCANNER.md) - Decision Dashboard scanner
- [API Documentation](README.md) - General API usage

**TradingView Indicator:**
- Original Pine Script code included in project
- Compatible logic with this scanner

**Questions?**
- Check browser console for errors
- Verify API keys in `.env` file
- Review the source code in `/app/liquidity-scanner/page.tsx`

---

**Disclaimer:** This tool is for informational and educational purposes only. Trading stocks and options involves substantial risk of loss. Always do your own research and consult with a licensed financial advisor before making investment decisions. Past performance does not guarantee future results.
