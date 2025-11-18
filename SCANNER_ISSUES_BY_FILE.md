# Scanner Issues - Organized by File & Line Numbers

## Quick Navigation Guide

**Files with CRITICAL Issues:**
- `/home/user/gamma-flow-pro/app/api/stocks/route.ts` - Main data pipeline
- `/home/user/gamma-flow-pro/app/page.tsx` - Frontend scanner logic
- `/home/user/gamma-flow-pro/app/api/gex/[symbol]/route.ts` - GEX calculations

**Files with Data Quality Issues:**
- `/home/user/gamma-flow-pro/app/api/options-flow/route.ts` - Trade ideas
- `/home/user/gamma-flow-pro/app/components/GammaFlowPro.tsx` - UI component

---

## app/api/stocks/route.ts (409 lines)
**SEVERITY:** CRITICAL - Core data pipeline

### Issue #1: Sequential API Calls (PERFORMANCE KILLER)
**Lines:** 192-225
**Severity:** CRITICAL - Causes 125-500 second delays
**Code:**
```typescript
for (const ticker of topStocks) {
  if (ticker.ticker) {
    const optionsData = await fetchOptionsDataForSymbol(ticker.ticker) // ❌ SEQUENTIAL
    const optionsMetrics = calculateOptionsMetrics(optionsData)
    // ...
  }
}
```
**Fix:** Use `Promise.all()` to parallelize
**Effort:** 2 hours

### Issue #2: Random IV Rank (DATA INTEGRITY)
**Line:** 244
**Severity:** CRITICAL - Users make decisions on fake data
**Code:**
```typescript
ivRank: Math.floor(Math.random() * 100), // ❌ COMPLETELY RANDOM
```
**What's needed:** Historical IV data calculation
**Effort:** 4 hours (need data storage)

### Issue #3: Hardcoded Zero for VEX
**Line:** 242
**Severity:** HIGH - Missing volatility exposure metric
**Code:**
```typescript
vex: 0, // Would need volatility calculation ❌
```
**What's needed:** Vega exposure calculation
**Effort:** 3 hours

### Issue #4: Fake Dark Pool Data
**Line:** 247
**Severity:** HIGH - Contradicts product features
**Code:**
```typescript
darkPoolRatio: Math.random() * 50, // Would need dark pool data source ❌
```
**What's needed:** Real dark pool API integration
**Effort:** 6 hours (API work)

### Issue #5: Naive Strike Selection
**Lines:** 209-225
**Severity:** MEDIUM - Misses important gamma levels
**Code:**
```typescript
const nearbyStrikes = strikes.filter(s => Math.abs(s - price) / price < 0.15)
if (nearbyStrikes.length >= 3) {
  const abovePrice = nearbyStrikes.filter(s => s > price).slice(0, 3) // Only uses top 3
  const belowPrice = nearbyStrikes.filter(s => s < price).slice(-3).reverse()
  // ❌ Misses deep OTM concentration
}
```
**What's needed:** Weighted gamma concentration analysis
**Effort:** 4 hours

### Issue #6: Arbitrary Stock Limit
**Lines:** 188-190
**Severity:** MEDIUM - Biased toward large caps
**Code:**
```typescript
.filter(t => t.day?.v > 500000) // Only >500K volume
.slice(0, 250)  // ❌ ARBITRARY LIMIT
```
**What's needed:** Dynamic limiting or sector-based selection
**Effort:** 2 hours

### Issue #7: No Error Recovery
**Lines:** 254-290
**Severity:** MEDIUM - Partial data when APIs fail
**Code:**
```typescript
if (ticker.ticker && !stockMap.has(ticker.ticker)) {
  // Sets all to 0 when data missing - no way to distinguish
  gex: 0,
  optionVolume: 0,
}
```
**What's needed:** Error flag or null value + proper handling
**Effort:** 2 hours

---

## app/page.tsx (925 lines)
**SEVERITY:** HIGH - Frontend logic

### Issue #1: Aggressive Polling (RATE LIMITING)
**Line:** 258
**Severity:** HIGH - Will cause API bans
**Code:**
```typescript
const interval = setInterval(fetchRealData, 10000) // Every 10 seconds ❌
// = 8,640 requests/day
// Polygon free tier = 5 calls/min max
// WILL EXCEED IMMEDIATELY
```
**What's needed:** 
- Reduce to 30-60 second interval
- Implement caching
- Add exponential backoff
**Effort:** 3 hours

### Issue #2: Hardcoded Scanner Thresholds
**Lines:** 271-396
**Severity:** MEDIUM - Not validated or explained
**Code:**
```typescript
{
  id: 'gammaSqueezer',
  name: 'Top Movers',
  filter: (stocks: any[]) => stocks
    .filter(s => s.price > 5 && s.changePercent && Math.abs(s.changePercent) > 3)
    // ❌ Why 3%? No backtesting data
    .filter(s => s.volume > 1000000)
    // ❌ Why 1M? Market dependent
}
```
**What's needed:**
- Document why each threshold
- Backtest strategy effectiveness
- Allow user customization
**Effort:** 8 hours

### Issue #3: No Watchlist Persistence
**Line:** 206
**Severity:** MEDIUM - Can't save important stocks
**Code:**
```typescript
const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null)
// ❌ Only in-memory, lost on refresh
```
**What's needed:** 
- Database storage (SQLite/Postgres)
- Local storage fallback
**Effort:** 6 hours

### Issue #4: Limited Filter Validation
**Lines:** 398-421
**Severity:** MEDIUM - Can cause NaN propagation
**Code:**
```typescript
if (filters.price?.min && stock.price < parseFloat(filters.price.min)) return false
// ❌ parseFloat("abc") = NaN, then NaN < price is always false
```
**What's needed:** Proper input validation
**Effort:** 2 hours

---

## app/api/gex/[symbol]/route.ts (132 lines)
**SEVERITY:** HIGH - GEX calculations

### Issue #1: Random GEX Variation
**Line:** 131
**Severity:** HIGH - Inconsistent results on every call
**Code:**
```typescript
function estimateGEX(symbol: string): number {
  const base = gexMultipliers[symbol] || 5000000;
  return Math.round(base * (0.8 + Math.random() * 0.4)); // ❌ VARIES ±20%
}
```
**Impact:** GEX for AAPL could be 20M or 30M on same day
**What's needed:** Real GEX from Unusual Whales API
**Effort:** 4 hours

### Issue #2: Oversimplified Gamma Flip
**Line:** 45
**Severity:** MEDIUM - Not accurate
**Code:**
```typescript
gamma_flip: Math.round(basePrice * 0.99 * 100) / 100, // ❌ TOO SIMPLISTIC
// Real gamma flip = weighted average of strikes by OI
```
**What's needed:** Weighted gamma calculation
**Effort:** 3 hours

### Issue #3: Hardcoded Base Prices
**Lines:** 36-40
**Severity:** MEDIUM - Only works for 8 stocks
**Code:**
```typescript
const basePrices: Record<string, number> = {
  'AAPL': 228, 'NVDA': 140, 'TSLA': 248, 'SPY': 589,
  'QQQ': 516, 'GME': 28, 'AMC': 3, 'MSFT': 441
};
const basePrice = basePrices[symbol] || 100; // ❌ 100 is fallback for unknown
```
**What's needed:** Fetch current price from API
**Effort:** 1 hour

---

## app/api/options-flow/route.ts (188 lines)
**SEVERITY:** MEDIUM - Trade idea generation

### Issue #1: Heuristic Confidence Scores
**Lines:** 52-73
**Severity:** MEDIUM - Not data-driven
**Code:**
```typescript
confidence: Math.min(95, 70 + (flowData.flowScore || 60) / 4),
// ❌ Made up formula with no validation
```
**What's needed:**
- Backtest strategy performance
- Calculate win rates
- Risk-adjust scores
**Effort:** 10 hours

### Issue #2: Fallback to Generic Ideas
**Lines:** 168-184
**Severity:** MEDIUM - Users get same ideas for all stocks
**Code:**
```typescript
if (ideas.length === 0) {
  ideas.push({
    id: now + 7,
    symbol,
    type: 'Bull Call Spread',
    confidence: 72,
    // ❌ Generic idea shown when data missing
  })
}
```
**What's needed:** Better data validation earlier
**Effort:** 2 hours

### Issue #3: No Position Sizing
**Lines:** 40-145
**Severity:** MEDIUM - Can't risk manage properly
**Code:**
```typescript
// Generates trade ideas but no:
// - Account size guidance
// - Position sizing (% of portfolio)
// - Risk per trade limits
```
**What's needed:** Position sizing calculator
**Effort:** 3 hours

---

## app/components/GammaFlowPro.tsx (1506 lines)
**SEVERITY:** LOW-MEDIUM - UI component (older version)

### Issue #1: Code Duplication
**Lines:** Multiple sections repeated
**Severity:** LOW - Maintenance burden
**Examples:**
- `formatNumber()` duplicated in `app/page.tsx`
- `getRiskColor()` logic repeated
- Filter functions duplicated

**What's needed:** Extract to shared utilities
**Effort:** 2 hours

### Issue #2: Missing Visualizations
**Throughout**
**Severity:** LOW - UX limitation
**Missing:**
- No option chain visualization
- No Greeks surface plot
- No IV term structure chart
- No correlation matrix

**What's needed:** Add chart library (Plotly, Chart.js)
**Effort:** 8 hours

---

## app/lib/api-config.ts (103 lines)
**SEVERITY:** LOW - Configuration

### Issue #1: Unused API Integrations
**Lines:** 1-58
**Severity:** LOW - Dead code
**Code:**
```typescript
export const API_CONFIG = {
  unusualWhales: { ... }, // ❌ Defined but not used
  ortex: { ... },         // ❌ Defined but not used
  alphaVantage: { ... },  // ❌ Defined but not used
  twelveData: { ... },    // ❌ Defined but not used
}
```
**What's needed:** Implement these integrations
**Effort:** 20+ hours (per API)

---

## Summary Table by Priority

### CRITICAL (Fix IMMEDIATELY)
```
FILE                          ISSUE                   LINE(S)    TIME
──────────────────────────────────────────────────────────────────────
app/api/stocks/route.ts      Sequential API calls    192-225    2h
app/api/stocks/route.ts      Random IV Rank          244        4h
app/page.tsx                 Aggressive polling      258        3h
app/api/stocks/route.ts      No error distinction    75-280     2h
──────────────────────────────────────────────────────────────────────
SUBTOTAL: 11 hours to fix critical issues
```

### HIGH (Fix This Sprint)
```
FILE                          ISSUE                   LINE(S)    TIME
──────────────────────────────────────────────────────────────────────
app/api/stocks/route.ts      Fake dark pool data     247        6h
app/api/gex/[symbol]/route.ts Random GEX variation   131        4h
app/api/stocks/route.ts      Missing Greeks          86-153     8h
app/page.tsx                 No filter validation    398-421    2h
──────────────────────────────────────────────────────────────────────
SUBTOTAL: 20 hours for HIGH priority
```

### MEDIUM (Fix Before Launch)
```
FILE                          ISSUE                   LINE(S)    TIME
──────────────────────────────────────────────────────────────────────
app/api/stocks/route.ts      Naive strike selection  209-225    4h
app/api/stocks/route.ts      Stock limit bias        188-190    2h
app/page.tsx                 Hardcoded thresholds    271-396    8h
app/page.tsx                 No watchlist persist.   206        6h
app/api/options-flow/route.ts Heuristic confidence  52-73      10h
──────────────────────────────────────────────────────────────────────
SUBTOTAL: 30 hours for MEDIUM priority
```

### LOW (Nice-to-Have)
```
FILE                          ISSUE                   LINE(S)    TIME
──────────────────────────────────────────────────────────────────────
app/components/GammaFlowPro.tsx Code duplication     Multiple   2h
app/components/GammaFlowPro.tsx Missing charts       Multiple   8h
app/lib/api-config.ts         Unused APIs            1-58       20h+
──────────────────────────────────────────────────────────────────────
SUBTOTAL: 30+ hours for LOW priority
```

**TOTAL ESTIMATED: 60-90 hours to reach production-ready state**

