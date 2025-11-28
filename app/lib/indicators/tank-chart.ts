/**
 * TANK Chart/Table - Order Flow & Dark Pool Analysis
 *
 * Visualizes real-time tank strength shifts and logs 2-minute historical
 * market injections. Shows where large orders, including dark pool activity,
 * are flowing.
 */

export interface PriceBar {
  open: number
  high: number
  low: number
  close: number
  volume: number
  timestamp: number
}

export interface TANKInjection {
  timestamp: number
  timeLabel: string
  type: 'buy' | 'sell' | 'dark_pool'
  volume: number
  price: number
  deltaImpact: number
  strength: 'weak' | 'moderate' | 'strong' | 'extreme'
  source: 'lit' | 'dark' | 'mixed'
}

export interface TANKResult {
  currentStrength: number      // -100 to +100 (negative = selling, positive = buying)
  strengthTrend: 'rising' | 'falling' | 'flat'
  netInjectionVolume: number
  darkPoolPercent: number
  injections: TANKInjection[]
  buyWallStrength: number
  sellWallStrength: number
  dominantFlow: 'buyers' | 'sellers' | 'neutral'
}

export interface TANKConfig {
  injectionWindow: number   // Minutes for injection tracking (default: 2)
  historyDepth: number      // Number of injections to keep (default: 30)
  strengthThreshold: number // Volume threshold for strength levels
  darkPoolWeight: number    // Weight factor for dark pool activity (default: 1.5)
}

export const DEFAULT_TANK_CONFIG: TANKConfig = {
  injectionWindow: 2,
  historyDepth: 30,
  strengthThreshold: 100000,
  darkPoolWeight: 1.5,
}

/**
 * Estimates buy and sell volume from price action
 * Uses multiple methods for accuracy
 */
export function estimateBuySellVolume(
  bar: PriceBar,
  method: 'simple' | 'advanced' | 'mixed' = 'advanced'
): { buyVolume: number; sellVolume: number } {
  const { open, high, low, close, volume } = bar

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

  let buyRatio: number
  if (method === 'simple') {
    buyRatio = simpleRatio
  } else if (method === 'advanced') {
    buyRatio = advancedRatio
  } else {
    buyRatio = (simpleRatio + advancedRatio) / 2
  }

  return {
    buyVolume: volume * buyRatio,
    sellVolume: volume * (1 - buyRatio),
  }
}

/**
 * Analyzes order flow to detect market injections
 */
export function detectInjections(
  bars: PriceBar[],
  darkPoolRatio: number = 0,
  config: TANKConfig = DEFAULT_TANK_CONFIG
): TANKInjection[] {
  const injections: TANKInjection[] = []
  const avgVolume = bars.reduce((sum, b) => sum + b.volume, 0) / bars.length

  for (let i = 1; i < bars.length; i++) {
    const bar = bars[i]

    // Detect significant volume spikes
    const volumeRatio = bar.volume / avgVolume
    if (volumeRatio < 1.5) continue

    // Calculate delta impact
    const priceChange = bar.close - bar.open
    const totalRange = bar.high - bar.low
    const buyPressure = bar.close - bar.low
    const sellPressure = bar.high - bar.close
    const deltaImpact = totalRange > 0
      ? ((buyPressure - sellPressure) / totalRange) * 100
      : 0

    // Determine injection type
    let type: TANKInjection['type'] = deltaImpact > 0 ? 'buy' : 'sell'

    // Dark pool detection: unusual volume with small price change
    const bodySize = Math.abs(priceChange)
    const isDarkPool = volumeRatio > 2.5 && (bodySize / (totalRange || 1)) < 0.3
    if (isDarkPool || darkPoolRatio > 0.4) {
      type = 'dark_pool'
    }

    // Determine strength level
    let strength: TANKInjection['strength']
    if (volumeRatio >= 5) strength = 'extreme'
    else if (volumeRatio >= 3) strength = 'strong'
    else if (volumeRatio >= 2) strength = 'moderate'
    else strength = 'weak'

    injections.push({
      timestamp: bar.timestamp,
      timeLabel: new Date(bar.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      type,
      volume: bar.volume,
      price: bar.close,
      deltaImpact,
      strength,
      source: isDarkPool ? 'dark' : 'lit',
    })
  }

  return injections.slice(-config.historyDepth)
}

/**
 * Calculates overall TANK metrics
 */
export function analyzeTANK(
  bars: PriceBar[],
  darkPoolRatio: number = 0,
  config: TANKConfig = DEFAULT_TANK_CONFIG
): TANKResult {
  const injections = detectInjections(bars, darkPoolRatio, config)

  // Calculate current strength (-100 to +100)
  let buyVolume = 0
  let sellVolume = 0
  let darkPoolVolume = 0

  for (const inj of injections) {
    if (inj.type === 'buy') {
      buyVolume += inj.volume
    } else if (inj.type === 'sell') {
      sellVolume += inj.volume
    } else {
      darkPoolVolume += inj.volume
      // Dark pool attributed based on delta
      if (inj.deltaImpact > 0) buyVolume += inj.volume * 0.5
      else sellVolume += inj.volume * 0.5
    }
  }

  const totalVolume = buyVolume + sellVolume
  const currentStrength = totalVolume > 0
    ? ((buyVolume - sellVolume) / totalVolume) * 100
    : 0

  // Determine strength trend
  const recentInjections = injections.slice(-5)
  const olderInjections = injections.slice(-10, -5)

  const recentDelta = recentInjections.reduce((sum, inj) => sum + inj.deltaImpact, 0)
  const olderDelta = olderInjections.reduce((sum, inj) => sum + inj.deltaImpact, 0)

  let strengthTrend: TANKResult['strengthTrend']
  if (recentDelta > olderDelta + 20) strengthTrend = 'rising'
  else if (recentDelta < olderDelta - 20) strengthTrend = 'falling'
  else strengthTrend = 'flat'

  // Calculate buy/sell wall strength near support/resistance
  const recentBars = bars.slice(-20)
  const resistance = Math.max(...recentBars.map(b => b.high))
  const support = Math.min(...recentBars.map(b => b.low))

  const buyWallStrength = injections
    .filter(inj => inj.type === 'buy' && Math.abs(inj.price - support) < support * 0.01)
    .reduce((sum, inj) => sum + inj.volume, 0)

  const sellWallStrength = injections
    .filter(inj => inj.type === 'sell' && Math.abs(inj.price - resistance) < resistance * 0.01)
    .reduce((sum, inj) => sum + inj.volume, 0)

  // Dominant flow
  let dominantFlow: TANKResult['dominantFlow']
  if (currentStrength > 20) dominantFlow = 'buyers'
  else if (currentStrength < -20) dominantFlow = 'sellers'
  else dominantFlow = 'neutral'

  return {
    currentStrength: Math.round(currentStrength),
    strengthTrend,
    netInjectionVolume: buyVolume - sellVolume,
    darkPoolPercent: totalVolume > 0 ? (darkPoolVolume / (totalVolume + darkPoolVolume)) * 100 : 0,
    injections,
    buyWallStrength,
    sellWallStrength,
    dominantFlow,
  }
}
