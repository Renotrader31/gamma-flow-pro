/**
 * Liquidity Hunter - Fair Value Gap & Order Flow Analysis
 *
 * Translates TradingView Pine Script "Liquidity Hunter" indicator
 * to TypeScript for use in watchlist/scanner
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface PriceBar {
  open: number
  high: number
  low: number
  close: number
  volume: number
  timestamp: number
}

export interface FairValueGap {
  type: 'bullish' | 'bearish'
  top: number
  bottom: number
  mid: number
  gapSize: number
  gapPercent: number
  createdAt: number
  isFilled: boolean
  deltaAtCreation: number
  isLiquidityZone: boolean
}

export interface OrderFlowMetrics {
  buyVolume: number
  sellVolume: number
  delta: number
  avgAbsDelta: number
  buyPressure: number
  sellPressure: number
  isSignificantBuying: boolean
  isSignificantSelling: boolean
}

export interface LiquidityHunterResult {
  symbol: string
  fvgs: FairValueGap[]
  activeFVGCount: number
  bullishFVGCount: number
  bearishFVGCount: number
  liquidityZoneCount: number
  orderFlow: OrderFlowMetrics
  liquidityScore: number // 0-100
  signals: string[]
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export interface LiquidityHunterConfig {
  // FVG Settings
  enableFVG: boolean
  fvgThreshold: number // Minimum gap size as % (default: 0.5%)
  fvgMaxAge: number // Max bars before FVG is removed (default: 50)
  showUnfilledOnly: boolean

  // Order Flow Settings
  enableOrderFlow: boolean
  ofLookback: number // Lookback bars (default: 20)
  ofDeltaThreshold: number // Significant delta threshold (default: 1000)
  volumeMethod: 'simple' | 'advanced' | 'mixed'

  // Liquidity Zone Settings
  enableLiquidity: boolean
  liqDeltaMultiplier: number // Delta must be this * threshold (default: 1.5)
}

export const DEFAULT_CONFIG: LiquidityHunterConfig = {
  enableFVG: true,
  fvgThreshold: 0.5,
  fvgMaxAge: 50,
  showUnfilledOnly: true,
  enableOrderFlow: true,
  ofLookback: 20,
  ofDeltaThreshold: 1000,
  volumeMethod: 'advanced',
  enableLiquidity: true,
  liqDeltaMultiplier: 1.5,
}

// ═══════════════════════════════════════════════════════════════════════════
// ORDER FLOW ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Estimates buy and sell volume from price action
 * Translates the Pine Script estimateBuySellVolume function
 */
export function estimateBuySellVolume(
  bar: PriceBar,
  method: 'simple' | 'advanced' | 'mixed' = 'advanced'
): { buyVolume: number; sellVolume: number } {
  const { open, high, low, close, volume } = bar

  // Handle edge cases
  if (!volume || volume === 0) {
    return { buyVolume: 0, sellVolume: 0 }
  }

  if (high === low) {
    return { buyVolume: volume * 0.5, sellVolume: volume * 0.5 }
  }

  const priceRange = high - low
  const closePosition = (close - low) / priceRange

  // Simple method: based on candle direction
  const simpleRatio = close > open ? 0.6 : 0.4

  // Advanced method: based on price pressure
  const buyPressure = close - low
  const sellPressure = high - close
  const advancedRatio = buyPressure > sellPressure
    ? 0.4 + closePosition * 0.4
    : 0.2 + closePosition * 0.3

  // Select method
  let buyRatio: number
  if (method === 'simple') {
    buyRatio = simpleRatio
  } else if (method === 'advanced') {
    buyRatio = advancedRatio
  } else {
    buyRatio = (simpleRatio + advancedRatio) / 2
  }

  const buyVolume = volume * buyRatio
  const sellVolume = volume - buyVolume

  return { buyVolume, sellVolume }
}

/**
 * Calculate order flow metrics for recent bars
 */
export function calculateOrderFlow(
  bars: PriceBar[],
  config: LiquidityHunterConfig
): OrderFlowMetrics {
  const { volumeMethod, ofLookback, ofDeltaThreshold } = config

  const recentBars = bars.slice(-ofLookback)
  const deltas: number[] = []

  let totalBuyVolume = 0
  let totalSellVolume = 0

  for (const bar of recentBars) {
    const { buyVolume, sellVolume } = estimateBuySellVolume(bar, volumeMethod)
    const delta = buyVolume - sellVolume

    deltas.push(Math.abs(delta))
    totalBuyVolume += buyVolume
    totalSellVolume += sellVolume
  }

  const currentBar = bars[bars.length - 1]
  const { buyVolume: currentBuyVol, sellVolume: currentSellVol } =
    estimateBuySellVolume(currentBar, volumeMethod)
  const currentDelta = currentBuyVol - currentSellVol

  const avgAbsDelta = deltas.reduce((sum, d) => sum + d, 0) / deltas.length || 0

  return {
    buyVolume: currentBuyVol,
    sellVolume: currentSellVol,
    delta: currentDelta,
    avgAbsDelta,
    buyPressure: totalBuyVolume,
    sellPressure: totalSellVolume,
    isSignificantBuying: currentDelta >= ofDeltaThreshold,
    isSignificantSelling: currentDelta <= -ofDeltaThreshold,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FAIR VALUE GAP DETECTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detects Fair Value Gaps in price action
 * Translates Pine Script detectFVG function
 *
 * Bullish FVG: Gap between bar[i-2].high and bar[i].low (bar[i-1] doesn't fill it)
 * Bearish FVG: Gap between bar[i-2].low and bar[i].high (bar[i-1] doesn't fill it)
 */
export function detectFVG(
  bars: PriceBar[],
  index: number,
  threshold: number
): FairValueGap | null {
  // Need at least 3 bars
  if (index < 2) return null

  const bar0 = bars[index] // Current bar
  const bar1 = bars[index - 1] // Previous bar
  const bar2 = bars[index - 2] // Bar 2 ago

  // Bullish FVG: gap UP
  const bullishGap = bar0.low - bar2.high
  const bullishGapPct = (bullishGap / bar2.high) * 100
  const isBullishFVG =
    bullishGap > 0 &&
    bullishGapPct >= threshold &&
    bar1.low > bar2.high // Bar 1 didn't fill the gap

  if (isBullishFVG) {
    return {
      type: 'bullish',
      top: bar0.low,
      bottom: bar2.high,
      mid: (bar0.low + bar2.high) / 2,
      gapSize: bullishGap,
      gapPercent: bullishGapPct,
      createdAt: index,
      isFilled: false,
      deltaAtCreation: 0, // Will be filled by caller
      isLiquidityZone: false, // Will be determined by caller
    }
  }

  // Bearish FVG: gap DOWN
  const bearishGap = bar2.low - bar0.high
  const bearishGapPct = (bearishGap / bar2.low) * 100
  const isBearishFVG =
    bearishGap > 0 &&
    bearishGapPct >= threshold &&
    bar1.high < bar2.low // Bar 1 didn't fill the gap

  if (isBearishFVG) {
    return {
      type: 'bearish',
      top: bar2.low,
      bottom: bar0.high,
      mid: (bar2.low + bar0.high) / 2,
      gapSize: bearishGap,
      gapPercent: bearishGapPct,
      createdAt: index,
      isFilled: false,
      deltaAtCreation: 0, // Will be filled by caller
      isLiquidityZone: false, // Will be determined by caller
    }
  }

  return null
}

/**
 * Checks if a FVG has been filled by subsequent price action
 */
export function isFVGFilled(fvg: FairValueGap, bars: PriceBar[], currentIndex: number): boolean {
  // Check bars after FVG creation
  for (let i = fvg.createdAt + 1; i <= currentIndex; i++) {
    const bar = bars[i]

    if (fvg.type === 'bullish') {
      // Bullish FVG filled when price goes back down into it
      if (bar.low <= fvg.bottom) {
        return true
      }
    } else {
      // Bearish FVG filled when price goes back up into it
      if (bar.high >= fvg.top) {
        return true
      }
    }
  }

  return false
}

/**
 * Updates FVG filled status and removes old/filled FVGs
 */
export function updateFVGs(
  fvgs: FairValueGap[],
  bars: PriceBar[],
  currentIndex: number,
  config: LiquidityHunterConfig
): FairValueGap[] {
  return fvgs.filter(fvg => {
    // Update filled status
    if (!fvg.isFilled) {
      fvg.isFilled = isFVGFilled(fvg, bars, currentIndex)
    }

    // Remove if too old
    const age = currentIndex - fvg.createdAt
    if (age > config.fvgMaxAge) {
      return false
    }

    // Remove if filled (if configured)
    if (config.showUnfilledOnly && fvg.isFilled) {
      return false
    }

    return true
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// LIQUIDITY ZONE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Determines if a FVG qualifies as a liquidity zone
 * (Strong delta at creation time)
 */
export function isLiquidityZone(
  fvg: FairValueGap,
  deltaAtCreation: number,
  config: LiquidityHunterConfig
): boolean {
  const threshold = config.ofDeltaThreshold * config.liqDeltaMultiplier
  return Math.abs(deltaAtCreation) >= threshold
}

/**
 * Checks if price is currently inside a FVG
 */
export function isPriceInFVG(fvg: FairValueGap, currentBar: PriceBar): boolean {
  return currentBar.low <= fvg.top && currentBar.high >= fvg.bottom
}

/**
 * Calculates overall liquidity score (0-100)
 */
export function calculateLiquidityScore(
  fvgs: FairValueGap[],
  orderFlow: OrderFlowMetrics,
  config: LiquidityHunterConfig
): number {
  let score = 50 // Base score

  // Add points for active liquidity zones
  const liquidityZones = fvgs.filter(f => f.isLiquidityZone && !f.isFilled)
  score += liquidityZones.length * 10

  // Add points for significant order flow
  if (orderFlow.isSignificantBuying) {
    score += 15
  } else if (orderFlow.isSignificantSelling) {
    score += 15
  }

  // Add points for strong delta relative to average
  const deltaRatio = Math.abs(orderFlow.delta) / (orderFlow.avgAbsDelta || 1)
  if (deltaRatio > 2) {
    score += 10
  } else if (deltaRatio > 1.5) {
    score += 5
  }

  // Add points for multiple FVGs in same direction
  const bullishFVGs = fvgs.filter(f => f.type === 'bullish' && !f.isFilled)
  const bearishFVGs = fvgs.filter(f => f.type === 'bearish' && !f.isFilled)

  if (bullishFVGs.length >= 2 && orderFlow.delta > 0) {
    score += 10
  } else if (bearishFVGs.length >= 2 && orderFlow.delta < 0) {
    score += 10
  }

  return Math.min(100, Math.max(0, score))
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ANALYSIS FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analyzes price bars and returns comprehensive liquidity hunter metrics
 */
export function analyzeLiquidityHunter(
  symbol: string,
  bars: PriceBar[],
  config: LiquidityHunterConfig = DEFAULT_CONFIG
): LiquidityHunterResult {
  const fvgs: FairValueGap[] = []
  const signals: string[] = []

  // Detect all FVGs in the dataset
  for (let i = 2; i < bars.length; i++) {
    const fvg = detectFVG(bars, i, config.fvgThreshold)

    if (fvg) {
      // Calculate delta at creation
      const { buyVolume, sellVolume } = estimateBuySellVolume(bars[i], config.volumeMethod)
      fvg.deltaAtCreation = buyVolume - sellVolume

      // Determine if it's a liquidity zone
      fvg.isLiquidityZone = isLiquidityZone(fvg, fvg.deltaAtCreation, config)

      fvgs.push(fvg)
    }
  }

  // Update FVG filled status and remove old ones
  const currentIndex = bars.length - 1
  const activeFVGs = updateFVGs(fvgs, bars, currentIndex, config)

  // Calculate order flow metrics
  const orderFlow = calculateOrderFlow(bars, config)

  // Count FVG types
  const bullishFVGCount = activeFVGs.filter(f => f.type === 'bullish' && !f.isFilled).length
  const bearishFVGCount = activeFVGs.filter(f => f.type === 'bearish' && !f.isFilled).length
  const liquidityZoneCount = activeFVGs.filter(f => f.isLiquidityZone && !f.isFilled).length

  // Check for active signals
  const currentBar = bars[currentIndex]
  for (const fvg of activeFVGs) {
    if (!fvg.isFilled && fvg.isLiquidityZone && isPriceInFVG(fvg, currentBar)) {
      // Check if order flow confirms FVG direction
      const deltaConfirms = fvg.type === 'bullish'
        ? orderFlow.delta >= config.ofDeltaThreshold
        : orderFlow.delta <= -config.ofDeltaThreshold

      if (deltaConfirms) {
        const priceRange = `$${fvg.bottom.toFixed(2)} - $${fvg.top.toFixed(2)}`
        signals.push(
          fvg.type === 'bullish'
            ? `🟢 BULLISH LIQUIDITY at ${priceRange}`
            : `🔴 BEARISH LIQUIDITY at ${priceRange}`
        )
      }
    }
  }

  // Calculate liquidity score
  const liquidityScore = calculateLiquidityScore(activeFVGs, orderFlow, config)

  return {
    symbol,
    fvgs: activeFVGs,
    activeFVGCount: activeFVGs.filter(f => !f.isFilled).length,
    bullishFVGCount,
    bearishFVGCount,
    liquidityZoneCount,
    orderFlow,
    liquidityScore,
    signals,
  }
}
