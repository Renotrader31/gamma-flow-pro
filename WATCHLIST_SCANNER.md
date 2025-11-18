# Watchlist Scanner - Multi-Timeframe Alignment Detector

## Overview

The Watchlist Scanner is a powerful tool that translates the TradingView "Decision Dashboard" indicator into a TypeScript implementation and identifies when indicators **align across multiple timeframes** (5-minute and daily charts).

### Key Features

✅ **Multi-Timeframe Analysis** - Scans both 5-minute and daily timeframes simultaneously
✅ **Alignment Detection** - Identifies when both timeframes agree on direction (LONG or SHORT)
✅ **Comprehensive Indicator Suite** - Includes BFCI, Order Flow, CCI, Core Value, Fear Gauge, and Squeeze Detection
✅ **Real-Time Monitoring** - Auto-refresh capability with live updates
✅ **Custom Watchlists** - Add your own symbols or use the default list
✅ **Scoring System** - 0-12 alignment score for each timeframe

---

## How It Works

### Indicator Components

The scanner evaluates 6 major components to generate an alignment score (0-12):

1. **BFCI Regime Filter (0-3 points)**
   - Broad Financial Conditions Index
   - Uses SPY, HYG, LQD, VIX, and DXY to determine market regime
   - States: BULL, BEAR, or NEUTRAL

2. **Core Value Engine (0-3 points)**
   - Combines moving averages, RSI, MACD, VWAP, and Supertrend
   - Directional score: -100 to +100
   - Includes momentum multiplier and prohibition checks

3. **Order Flow Analysis (0-2 points)**
   - Estimates buy/sell volume from candlestick patterns
   - Detects order flow imbalances
   - Measures flow strength percentage

4. **CCI Momentum (0-2 points)**
   - Commodity Channel Index with smoothing
   - Detects divergences (bullish/bearish)
   - Identifies overbought/oversold conditions

5. **Fear Gauge (0-1 point)**
   - Williams VIX Fix implementation
   - Detects extreme fear conditions
   - Useful for contrarian signals

6. **Squeeze Detection (0-1 point)**
   - Identifies Bollinger Band / Keltner Channel squeezes
   - Tracks squeeze duration
   - Signals potential breakouts

### Alignment Logic

**Alignment occurs when:**
- Both 5-minute AND daily timeframes show the same direction (both LONG or both SHORT)
- Both timeframes have alignment scores ≥ 4 (out of 12)
- Neither timeframe is in PROHIBITED or NEUTRAL state

**Alignment Strength:**
- Average of both timeframe scores
- Higher strength = stronger confirmation
- Maximum strength: 12/12 (both timeframes at max score)

### Action Signals

The scanner generates the following actions based on alignment scores:

| Score | Action | Direction | Size |
|-------|--------|-----------|------|
| 8-12 | 🚀🚀 MAX LONG / 💣💣 MAX SHORT | Strong | 100% |
| 6-7 | 🚀 STRONG LONG / 💣 STRONG SHORT | High | 75% |
| 4-5 | ↗️ LONG BIAS / ↘️ SHORT BIAS | Medium | 50% |
| 0-3 | ⏸️ NEUTRAL | None | 0% |
| Any | 🚫 PROHIBITED | Blocked | 0% |

---

## Usage

### Accessing the Scanner

Navigate to `/watchlist` in your application or click "Watchlist Scanner" from the main menu.

### Interface Overview

#### 1. **Control Panel**
- **Min Alignment Score**: Filter results by minimum score (0-12)
- **Aligned Only**: Toggle to show only aligned symbols
- **Auto Refresh**: Enable 1-minute automatic scanning
- **Scan Now**: Manual refresh button

#### 2. **Custom Symbols**
- Click "Add Custom Symbols"
- Enter comma-separated symbols (e.g., `AAPL, MSFT, TSLA`)
- Leave empty to use default watchlist

#### 3. **Statistics Dashboard**
- Total Symbols scanned
- Number of aligned symbols
- Long signal count
- Short signal count

#### 4. **Results Table**
Shows for each symbol:
- **Symbol**: Ticker name
- **Aligned**: ✓ if timeframes align
- **Combined Score**: Average of both timeframes
- **5-Min Action**: Current 5-minute signal
- **Daily Action**: Current daily signal
- **Scores**: Individual alignment scores (0-12)
- **Details**: Expandable row with full indicator breakdown

### API Endpoints

#### GET `/api/watchlist`

**Query Parameters:**
- `symbols` (optional): Comma-separated list of symbols
- `minScore` (optional): Minimum alignment score (default: 4)
- `alignedOnly` (optional): Filter for aligned only (default: false)

**Example:**
```bash
GET /api/watchlist?symbols=AAPL,MSFT,GOOGL&minScore=6&alignedOnly=true
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "symbol": "AAPL",
      "aligned": true,
      "alignmentStrength": 8.5,
      "fiveMin": {
        "action": "🚀 STRONG LONG",
        "alignmentScore": 9,
        "confidence": "HIGH",
        "bfci": 1.2,
        "coreValue": 75,
        ...
      },
      "daily": {
        "action": "🚀 STRONG LONG",
        "alignmentScore": 8,
        "confidence": "HIGH",
        "bfci": 0.9,
        "coreValue": 68,
        ...
      },
      "combinedScore": 8.5
    }
  ],
  "count": 1,
  "totalScanned": 3,
  "timestamp": 1700000000000
}
```

#### POST `/api/watchlist`

**Body:**
```json
{
  "symbols": ["AAPL", "MSFT", "GOOGL"],
  "minScore": 4,
  "alignedOnly": false
}
```

---

## Implementation Details

### File Structure

```
/lib/decision-dashboard.ts       # Core indicator calculations
/app/api/watchlist/route.ts      # API endpoint
/app/watchlist/page.tsx           # UI component
```

### Key Functions

#### `calculateDecisionDashboard(marketData, timeframe)`
Main calculation function that:
1. Processes candle data
2. Calculates all 6 indicator components
3. Generates alignment score (0-12)
4. Determines action recommendation

#### `checkAlignment(result1, result2)`
Determines if two timeframe results are aligned:
- Same direction (both long or both short)
- Both have meaningful signals (score ≥ 4)
- Returns `true` if aligned

#### `getAlignmentStrength(result1, result2)`
Calculates alignment strength:
- Average of both alignment scores
- Returns 0 if not aligned
- Maximum value: 12

---

## Integration with Real Data

### Current Implementation (Mock Data)

The current implementation uses **mock data generators** for testing. To integrate with real market data:

### Option 1: Polygon.io Integration

```typescript
async function fetchMarketData(symbol: string, interval: '5m' | '1d'): Promise<MarketData> {
  const apiKey = process.env.POLYGON_API_KEY;
  const endpoint = interval === '5m'
    ? `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/5/minute/${from}/${to}`
    : `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${from}/${to}`;

  const response = await fetch(`${endpoint}?apiKey=${apiKey}`);
  const data = await response.json();

  return {
    symbol,
    candles: data.results.map(r => ({
      open: r.o,
      high: r.h,
      low: r.l,
      close: r.c,
      volume: r.v,
      timestamp: r.t
    }))
  };
}
```

### Option 2: Alpha Vantage Integration

```typescript
async function fetchMarketData(symbol: string, interval: '5m' | '1d'): Promise<MarketData> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  const func = interval === '5m' ? 'TIME_SERIES_INTRADAY' : 'TIME_SERIES_DAILY';
  const intParam = interval === '5m' ? '&interval=5min' : '';

  const response = await fetch(
    `https://www.alphavantage.co/query?function=${func}&symbol=${symbol}${intParam}&apikey=${apiKey}`
  );
  const data = await response.json();

  // Parse and transform data...
}
```

### Option 3: Your Existing API

If you already have market data endpoints, modify the `fetchMarketData` function in `/app/api/watchlist/route.ts`:

```typescript
async function fetchMarketData(symbol: string, interval: '5m' | '1d'): Promise<MarketData> {
  const response = await fetch(`/api/your-existing-endpoint?symbol=${symbol}&interval=${interval}`);
  const data = await response.json();

  return {
    symbol,
    candles: data.candles, // Must match CandleData interface
    // Add BFCI data sources for daily interval
  };
}
```

---

## Configuration Options

### Indicator Settings

You can customize indicator parameters in `/lib/decision-dashboard.ts`:

```typescript
// BFCI Settings
bfci_lookback: 252,      // Lookback period (days)
bfci_smooth: 10,         // EMA smoothing
bfci_ret_len: 63,        // Return window
bfci_bull_threshold: 0.5,
bfci_bear_threshold: -0.5

// CCI Settings
cci_length: 20,
cci_smoothing: 5

// Core Value Settings
core_entry_threshold: 70

// Squeeze Settings
squeeze_threshold: 15    // Minimum bars in squeeze
```

### Enable/Disable Components

Pass configuration to `calculateDecisionDashboard`:

```typescript
const result = calculateDecisionDashboard(marketData, '5m', {
  enableBFCI: true,
  enableOrderFlow: true,
  enableCCI: true,
  enableCore: true,
  enableFear: false,      // Disable fear gauge
  enableSqueeze: false    // Disable squeeze detection
});
```

---

## Trading Strategy Examples

### Example 1: High Conviction Long Entry

**Conditions:**
- 5-min alignment score: 9/12
- Daily alignment score: 8/12
- Both show "STRONG LONG"
- Aligned: ✓

**Action:**
- Enter LONG position
- Size: 75% of allocation
- Stop loss: Below recent swing low
- Target: Risk/reward 2:1 or higher

### Example 2: Short Bias with Divergence

**Conditions:**
- 5-min: SHORT BIAS (score: 5)
- Daily: STRONG SHORT (score: 7)
- CCI showing bearish divergence
- Fear gauge: Not extreme

**Action:**
- Enter SHORT position
- Size: 50-75% based on risk tolerance
- Watch for daily confirmation

### Example 3: Avoid Trade - No Alignment

**Conditions:**
- 5-min: LONG BIAS (score: 5)
- Daily: SHORT BIAS (score: 4)
- Aligned: ✗

**Action:**
- WAIT for alignment
- Do not trade conflicting signals
- Monitor for convergence

---

## Best Practices

### 1. **Wait for Alignment**
- Don't force trades when timeframes conflict
- Higher probability when both agree

### 2. **Respect Prohibitions**
- Red "PROHIBITED" signals indicate poor conditions
- Low volatility, low volume, choppy price action

### 3. **Use Combined Scores**
- Higher combined scores = higher confidence
- Look for 8+ for best setups

### 4. **Monitor Multiple Timeframes**
- 5-min for entries
- Daily for overall trend direction

### 5. **Risk Management**
- Size based on alignment strength
- Never exceed suggested position size percentages

### 6. **Auto-Refresh Usage**
- Enable for active monitoring
- Disable to reduce API calls and costs

---

## Troubleshooting

### No Results Showing

**Check:**
1. Min score too high? Try lowering to 0-2
2. "Aligned Only" enabled? Disable to see all results
3. Custom symbols entered correctly?
4. API endpoint responding? Check browser console

### Alignment Not Detected

**Possible Reasons:**
- Timeframes genuinely disagree on direction
- One timeframe in NEUTRAL or PROHIBITED state
- Alignment scores below threshold (< 4)

### Slow Performance

**Solutions:**
1. Reduce number of symbols in watchlist
2. Disable auto-refresh when not needed
3. Increase refresh interval
4. Use real-time data APIs instead of batch processing

---

## Future Enhancements

Potential improvements:

- [ ] Add 15-minute and 1-hour timeframes
- [ ] Email/SMS alerts for alignment events
- [ ] Backtesting capability
- [ ] Machine learning score optimization
- [ ] Integration with broker APIs for automated trading
- [ ] Historical alignment tracking and analytics
- [ ] Custom indicator weight configuration
- [ ] Sector/industry alignment scanning

---

## Support & Contributing

For issues or feature requests, please see the main project README or contact the development team.

**Related Documentation:**
- TradingView Pine Script (original indicator)
- API Documentation
- Trading Strategy Guide

---

**Disclaimer**: This tool is for informational purposes only. Trading stocks and options involves risk. Always do your own research and consult with a licensed financial advisor before making investment decisions.
