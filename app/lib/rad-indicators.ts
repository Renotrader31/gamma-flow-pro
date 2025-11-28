/**
 * RAD Indicators - Complete Trading Analysis System
 *
 * Includes:
 * - RAD (Resistance After Dip) - Post-dip behavior patterns
 * - TANK Chart/Table - Real-time order flow & dark pool injections
 * - MP/LP (Magnet Price/Liquidity Pull) - OI-based price attraction zones
 * - OSV (Options Strike Volume) - Multi-ticker strike analysis
 */

import { PriceBar } from './liquidity-hunter'

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface RADPattern {
  type: 'accumulation' | 'distribution' | 'consolidation' | 'reversal'
  startIndex: number
  endIndex: number
  dipDepth: number // Percentage dip
  dipLow: number
  preDipHigh: number
  recoveryPercent: number
  volumeProfile: 'increasing' | 'decreasing' | 'neutral'
  signal: 'bullish_reversal' | 'bearish_continuation' | 'consolidation' | 'breakout_pending'
  strength: number // 0-100
  resistanceLevels: number[]
  supportLevels: number[]
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

export interface TANKMetrics {
  currentStrength: number // -100 to +100 (negative = selling, positive = buying)
  strengthTrend: 'rising' | 'falling' | 'flat'
  netInjectionVolume: number
  darkPoolPercent: number
  injections: TANKInjection[]
  buyWallStrength: number
  sellWallStrength: number
  dominantFlow: 'buyers' | 'sellers' | 'neutral'
}

export interface MagnetPriceZone {
  price: number
  type: 'magnet' | 'liquidity_pull'
  strength: number // 0-100
  openInterest: number
  callOI: number
  putOI: number
  gammaDelta: number
  pullDirection: 'above' | 'below' | 'neutral'
  distancePercent: number
}

export interface MPLPResult {
  magnetPrice: number
  magnetStrength: number
  liquidityPullZones: MagnetPriceZone[]
  maxPainPrice: number
  gammaFlipLevel: number
  expectedGravity: 'strong_up' | 'weak_up' | 'neutral' | 'weak_down' | 'strong_down'
  priceTarget: number
  confidence: number
}

export interface StrikeAnalysis {
  strike: number
  callVolume: number
  putVolume: number
  callOI: number
  putOI: number
  totalPremium: number
  netFlow: number // positive = bullish, negative = bearish
  gammaAtStrike: number
  loadingZone: boolean
  loadingStrength: number
  impliedMove: number
}

export interface OSVResult {
  symbol: string
  currentPrice: number
  strikes: StrikeAnalysis[]
  strongestBullStrike: number
  strongestBearStrike: number
  loadingZones: number[]
  expectedRange: { low: number; high: number }
  dominantSentiment: 'bullish' | 'bearish' | 'neutral'
  keyLevels: number[]
  multiExpAnalysis?: {
    expiration: string
    totalCallOI: number
    totalPutOI: number
    maxPain: number
    dominantStrikes: number[]
  }[]
}

export interface RADIndicatorResult {
  symbol: string
  timestamp: number
  rad: {
    patterns: RADPattern[]
    currentPhase: 'dip' | 'recovery' | 'consolidation' | 'breakout' | 'none'
    overallSignal: string
    strength: number
  }
  tank: TANKMetrics
  mplp: MPLPResult
  osv: OSVResult
  compositeScore: number // -100 to +100
  actionSignal: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell'
}

// ═══════════════════════════════════════════════════════════════════════════
// RAD CHART - RESISTANCE AFTER DIP ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

export interface RADConfig {
  dipThreshold: number // Minimum % dip to consider (default: 3%)
  recoveryThreshold: number // Minimum % recovery to confirm (default: 1.5%)
  lookbackPeriod: number // Bars to look back (default: 50)
  volumeConfirmation: boolean // Require volume confirmation
  consolidationBars: number // Min bars for consolidation (default: 5)
}

export const DEFAULT_RAD_CONFIG: RADConfig = {
  dipThreshold: 3,
  recoveryThreshold: 1.5,
  lookbackPeriod: 50,
  volumeConfirmation: true,
  consolidationBars: 5,
}

/**
 * Finds local highs and lows in price data
 */
function findPivots(bars: PriceBar[], lookback: number = 5): {
  highs: { index: number; price: number }[]
  lows: { index: number; price: number }[]
} {
  const highs: { index: number; price: number }[] = []
  const lows: { index: number; price: number }[] = []

  for (let i = lookback; i < bars.length - lookback; i++) {
    let isHigh = true
    let isLow = true

    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue
      if (bars[j].high >= bars[i].high) isHigh = false
      if (bars[j].low <= bars[i].low) isLow = false
    }

    if (isHigh) highs.push({ index: i, price: bars[i].high })
    if (isLow) lows.push({ index: i, price: bars[i].low })
  }

  return { highs, lows }
}

/**
 * Calculates volume trend
 */
function analyzeVolumeTrend(bars: PriceBar[], startIdx: number, endIdx: number): 'increasing' | 'decreasing' | 'neutral' {
  if (endIdx - startIdx < 3) return 'neutral'

  const midpoint = Math.floor((startIdx + endIdx) / 2)
  const firstHalfVol = bars.slice(startIdx, midpoint).reduce((sum, b) => sum + b.volume, 0)
  const secondHalfVol = bars.slice(midpoint, endIdx + 1).reduce((sum, b) => sum + b.volume, 0)

  const ratio = secondHalfVol / (firstHalfVol || 1)
  if (ratio > 1.2) return 'increasing'
  if (ratio < 0.8) return 'decreasing'
  return 'neutral'
}

/**
 * Detects RAD (Resistance After Dip) patterns
 */
export function detectRADPatterns(
  bars: PriceBar[],
  config: RADConfig = DEFAULT_RAD_CONFIG
): RADPattern[] {
  const patterns: RADPattern[] = []
  const { highs, lows } = findPivots(bars, 3)

  // Find dips (high followed by low)
  for (let i = 0; i < highs.length; i++) {
    const preDipHigh = highs[i]

    // Find the next low after this high
    const followingLows = lows.filter(l => l.index > preDipHigh.index && l.index < preDipHigh.index + config.lookbackPeriod)

    for (const dipLow of followingLows) {
      const dipPercent = ((preDipHigh.price - dipLow.price) / preDipHigh.price) * 100

      // Check if dip is significant
      if (dipPercent >= config.dipThreshold) {
        // Find recovery from dip
        const recoveryBars = bars.slice(dipLow.index, Math.min(dipLow.index + config.lookbackPeriod, bars.length))
        const maxRecovery = Math.max(...recoveryBars.map(b => b.high))
        const recoveryPercent = ((maxRecovery - dipLow.price) / dipLow.price) * 100

        // Analyze the pattern
        const volumeTrend = analyzeVolumeTrend(bars, preDipHigh.index, dipLow.index + recoveryBars.length - 1)

        // Determine pattern type
        let patternType: RADPattern['type']
        let signal: RADPattern['signal']

        if (recoveryPercent >= config.recoveryThreshold) {
          if (maxRecovery >= preDipHigh.price * 0.95) {
            patternType = 'reversal'
            signal = volumeTrend === 'increasing' ? 'bullish_reversal' : 'breakout_pending'
          } else {
            patternType = 'accumulation'
            signal = 'bullish_reversal'
          }
        } else {
          patternType = 'consolidation'
          signal = recoveryPercent > dipPercent * 0.3 ? 'breakout_pending' : 'bearish_continuation'
        }

        // Calculate resistance and support levels
        const resistanceLevels: number[] = []
        const supportLevels: number[] = []

        // Resistance: Pre-dip high and intermediate highs
        resistanceLevels.push(preDipHigh.price)
        const midPoint = (preDipHigh.price + dipLow.price) / 2
        if (maxRecovery < preDipHigh.price) {
          resistanceLevels.push(maxRecovery)
        }
        resistanceLevels.push(midPoint * 1.02) // 2% above midpoint

        // Support: Dip low and derived levels
        supportLevels.push(dipLow.price)
        supportLevels.push(dipLow.price * 1.01) // 1% above low
        supportLevels.push(midPoint * 0.98) // 2% below midpoint

        // Calculate pattern strength
        let strength = 50

        // Volume confirmation
        if (config.volumeConfirmation && volumeTrend === 'increasing') {
          strength += 15
        }

        // Recovery strength
        if (recoveryPercent >= dipPercent * 0.5) {
          strength += 15
        }

        // Clean dip (V-shape vs U-shape)
        const dipBars = bars.slice(preDipHigh.index, dipLow.index + 1)
        const avgDipPrice = dipBars.reduce((sum, b) => sum + b.close, 0) / dipBars.length
        const vShapeScore = (avgDipPrice - dipLow.price) / (preDipHigh.price - dipLow.price)
        if (vShapeScore > 0.4) {
          strength += 10
        }

        // Dip depth bonus
        if (dipPercent >= 5) strength += 10

        patterns.push({
          type: patternType,
          startIndex: preDipHigh.index,
          endIndex: dipLow.index + recoveryBars.length - 1,
          dipDepth: dipPercent,
          dipLow: dipLow.price,
          preDipHigh: preDipHigh.price,
          recoveryPercent,
          volumeProfile: volumeTrend,
          signal,
          strength: Math.min(100, strength),
          resistanceLevels: [...new Set(resistanceLevels)].sort((a, b) => a - b),
          supportLevels: [...new Set(supportLevels)].sort((a, b) => a - b),
        })

        break // Only capture first valid dip after each high
      }
    }
  }

  return patterns.sort((a, b) => b.startIndex - a.startIndex).slice(0, 5) // Return most recent 5
}

/**
 * Determines current phase based on recent patterns
 */
export function determineCurrentPhase(
  bars: PriceBar[],
  patterns: RADPattern[]
): 'dip' | 'recovery' | 'consolidation' | 'breakout' | 'none' {
  if (patterns.length === 0) return 'none'

  const latestPattern = patterns[0]
  const currentBar = bars[bars.length - 1]
  const currentPrice = currentBar.close

  // Check if currently in a dip
  const recentHigh = Math.max(...bars.slice(-10).map(b => b.high))
  const dipFromRecent = ((recentHigh - currentPrice) / recentHigh) * 100

  if (dipFromRecent >= 3) return 'dip'

  // Check for breakout
  if (currentPrice > latestPattern.preDipHigh * 1.02) return 'breakout'

  // Check for recovery
  if (currentPrice > latestPattern.dipLow * 1.02 && currentPrice < latestPattern.preDipHigh * 0.98) {
    return 'recovery'
  }

  return 'consolidation'
}

// ═══════════════════════════════════════════════════════════════════════════
// TANK CHART - ORDER FLOW & DARK POOL ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

export interface TANKConfig {
  injectionWindow: number // Minutes for injection tracking (default: 2)
  historyDepth: number // Number of injections to keep (default: 30)
  strengthThreshold: number // Volume threshold for strength levels
  darkPoolWeight: number // Weight factor for dark pool activity (default: 1.5)
}

export const DEFAULT_TANK_CONFIG: TANKConfig = {
  injectionWindow: 2,
  historyDepth: 30,
  strengthThreshold: 100000,
  darkPoolWeight: 1.5,
}

/**
 * Analyzes order flow to detect market injections
 */
export function analyzeOrderFlow(
  bars: PriceBar[],
  darkPoolRatio: number = 0,
  config: TANKConfig = DEFAULT_TANK_CONFIG
): TANKInjection[] {
  const injections: TANKInjection[] = []
  const avgVolume = bars.reduce((sum, b) => sum + b.volume, 0) / bars.length

  for (let i = 1; i < bars.length; i++) {
    const bar = bars[i]
    const prevBar = bars[i - 1]

    // Detect significant volume
    const volumeRatio = bar.volume / avgVolume
    if (volumeRatio < 1.5) continue

    // Determine flow direction
    const priceChange = bar.close - bar.open
    const bodySize = Math.abs(priceChange)
    const totalRange = bar.high - bar.low

    // Calculate delta impact (buy vs sell pressure)
    const buyPressure = bar.close - bar.low
    const sellPressure = bar.high - bar.close
    const deltaImpact = (buyPressure - sellPressure) / (totalRange || 1) * 100

    // Determine injection type
    let type: TANKInjection['type'] = deltaImpact > 0 ? 'buy' : 'sell'

    // Check for dark pool characteristics (unusual volume with small price change)
    const isDarkPool = volumeRatio > 2.5 && (bodySize / (totalRange || 1)) < 0.3
    if (isDarkPool || darkPoolRatio > 0.4) {
      type = 'dark_pool'
    }

    // Determine strength
    let strength: TANKInjection['strength']
    if (volumeRatio >= 5) strength = 'extreme'
    else if (volumeRatio >= 3) strength = 'strong'
    else if (volumeRatio >= 2) strength = 'moderate'
    else strength = 'weak'

    injections.push({
      timestamp: bar.timestamp,
      timeLabel: new Date(bar.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
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
 * Calculates TANK metrics from injections
 */
export function calculateTANKMetrics(
  bars: PriceBar[],
  darkPoolRatio: number = 0,
  config: TANKConfig = DEFAULT_TANK_CONFIG
): TANKMetrics {
  const injections = analyzeOrderFlow(bars, darkPoolRatio, config)

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

  let strengthTrend: TANKMetrics['strengthTrend']
  if (recentDelta > olderDelta + 20) strengthTrend = 'rising'
  else if (recentDelta < olderDelta - 20) strengthTrend = 'falling'
  else strengthTrend = 'flat'

  // Calculate buy/sell wall strength
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
  let dominantFlow: TANKMetrics['dominantFlow']
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

// ═══════════════════════════════════════════════════════════════════════════
// MP/LP - MAGNET PRICE & LIQUIDITY PULL ZONES
// ═══════════════════════════════════════════════════════════════════════════

export interface MPLPConfig {
  strikeRange: number // Number of strikes above/below current price (default: 10)
  minOIThreshold: number // Minimum OI to consider (default: 1000)
  gammaWeight: number // Weight for gamma in calculation (default: 1.2)
}

export const DEFAULT_MPLP_CONFIG: MPLPConfig = {
  strikeRange: 10,
  minOIThreshold: 1000,
  gammaWeight: 1.2,
}

export interface OptionsData {
  strikes: {
    strike: number
    callOI: number
    putOI: number
    callVolume: number
    putVolume: number
    callGamma: number
    putGamma: number
    callPremium: number
    putPremium: number
  }[]
  currentPrice: number
  gex: number
  gammaFlip: number
}

/**
 * Calculates Magnet Price based on OI distribution
 * Price tends to gravitate toward areas of maximum OI clustering
 */
export function calculateMagnetPrice(
  optionsData: OptionsData,
  config: MPLPConfig = DEFAULT_MPLP_CONFIG
): number {
  const { strikes, currentPrice } = optionsData

  if (strikes.length === 0) return currentPrice

  // Filter relevant strikes
  const relevantStrikes = strikes.filter(s =>
    Math.abs(s.strike - currentPrice) / currentPrice <= 0.15 && // Within 15%
    (s.callOI + s.putOI) >= config.minOIThreshold
  )

  if (relevantStrikes.length === 0) return currentPrice

  // Calculate weighted magnet price
  let weightedSum = 0
  let totalWeight = 0

  for (const strike of relevantStrikes) {
    const totalOI = strike.callOI + strike.putOI
    const gammaWeight = Math.abs(strike.callGamma - strike.putGamma) * config.gammaWeight
    const weight = totalOI + gammaWeight * 1000

    weightedSum += strike.strike * weight
    totalWeight += weight
  }

  return totalWeight > 0 ? weightedSum / totalWeight : currentPrice
}

/**
 * Identifies Liquidity Pull zones based on OI clusters and gamma concentrations
 */
export function identifyLiquidityPullZones(
  optionsData: OptionsData,
  config: MPLPConfig = DEFAULT_MPLP_CONFIG
): MagnetPriceZone[] {
  const { strikes, currentPrice, gammaFlip } = optionsData
  const zones: MagnetPriceZone[] = []

  // Sort strikes by total OI
  const sortedStrikes = [...strikes]
    .filter(s => (s.callOI + s.putOI) >= config.minOIThreshold)
    .sort((a, b) => (b.callOI + b.putOI) - (a.callOI + a.putOI))

  // Top 5 strikes by OI are liquidity pull zones
  const topStrikes = sortedStrikes.slice(0, 5)

  for (const strike of topStrikes) {
    const totalOI = strike.callOI + strike.putOI
    const maxOI = sortedStrikes.length > 0 ? sortedStrikes[0].callOI + sortedStrikes[0].putOI : 1

    // Calculate strength (0-100)
    const strength = Math.min(100, (totalOI / maxOI) * 100)

    // Calculate pull direction
    const gammaDelta = strike.callGamma - strike.putGamma
    let pullDirection: MagnetPriceZone['pullDirection']
    if (gammaDelta > 0) pullDirection = 'above'
    else if (gammaDelta < 0) pullDirection = 'below'
    else pullDirection = 'neutral'

    // Distance from current price
    const distancePercent = ((strike.strike - currentPrice) / currentPrice) * 100

    zones.push({
      price: strike.strike,
      type: Math.abs(distancePercent) < 2 ? 'magnet' : 'liquidity_pull',
      strength,
      openInterest: totalOI,
      callOI: strike.callOI,
      putOI: strike.putOI,
      gammaDelta,
      pullDirection,
      distancePercent,
    })
  }

  return zones.sort((a, b) => Math.abs(a.distancePercent) - Math.abs(b.distancePercent))
}

/**
 * Calculates Max Pain price (price where most options expire worthless)
 */
export function calculateMaxPain(optionsData: OptionsData): number {
  const { strikes, currentPrice } = optionsData

  if (strikes.length === 0) return currentPrice

  let minPain = Infinity
  let maxPainPrice = currentPrice

  for (const targetStrike of strikes) {
    let totalPain = 0

    for (const s of strikes) {
      // Call holders' pain
      if (s.strike < targetStrike.strike) {
        totalPain += s.callOI * (targetStrike.strike - s.strike)
      }
      // Put holders' pain
      if (s.strike > targetStrike.strike) {
        totalPain += s.putOI * (s.strike - targetStrike.strike)
      }
    }

    if (totalPain < minPain) {
      minPain = totalPain
      maxPainPrice = targetStrike.strike
    }
  }

  return maxPainPrice
}

/**
 * Full MP/LP analysis
 */
export function analyzeMPLP(
  optionsData: OptionsData,
  config: MPLPConfig = DEFAULT_MPLP_CONFIG
): MPLPResult {
  const magnetPrice = calculateMagnetPrice(optionsData, config)
  const zones = identifyLiquidityPullZones(optionsData, config)
  const maxPainPrice = calculateMaxPain(optionsData)

  // Calculate expected gravity direction
  const { currentPrice, gammaFlip, gex } = optionsData
  const magnetDiff = magnetPrice - currentPrice
  const magnetPct = (magnetDiff / currentPrice) * 100

  let expectedGravity: MPLPResult['expectedGravity']
  if (magnetPct > 2) expectedGravity = 'strong_up'
  else if (magnetPct > 0.5) expectedGravity = 'weak_up'
  else if (magnetPct > -0.5) expectedGravity = 'neutral'
  else if (magnetPct > -2) expectedGravity = 'weak_down'
  else expectedGravity = 'strong_down'

  // Calculate confidence based on OI concentration
  const totalOI = zones.reduce((sum, z) => sum + z.openInterest, 0)
  const topZoneOI = zones.length > 0 ? zones[0].openInterest : 0
  const confidence = totalOI > 0 ? Math.min(100, (topZoneOI / totalOI) * 200) : 0

  // Price target based on magnet and gamma flip
  const priceTarget = gex > 0
    ? magnetPrice * 1.01 // Positive gamma = price sticky
    : magnetPrice * (magnetPrice > currentPrice ? 1.02 : 0.98) // Negative gamma = amplified moves

  return {
    magnetPrice,
    magnetStrength: zones.length > 0 ? zones[0].strength : 0,
    liquidityPullZones: zones,
    maxPainPrice,
    gammaFlipLevel: gammaFlip,
    expectedGravity,
    priceTarget,
    confidence,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// OSV - OPTIONS STRIKE VOLUME ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

export interface OSVConfig {
  loadingZoneThreshold: number // Volume/OI ratio to consider "loading" (default: 0.3)
  significantFlowThreshold: number // Minimum premium for significant flow (default: 100000)
  multiExpiration: boolean // Analyze multiple expirations (default: true)
}

export const DEFAULT_OSV_CONFIG: OSVConfig = {
  loadingZoneThreshold: 0.3,
  significantFlowThreshold: 100000,
  multiExpiration: true,
}

/**
 * Analyzes individual strike for loading zones and flow
 */
export function analyzeStrike(
  strike: OptionsData['strikes'][0],
  currentPrice: number,
  config: OSVConfig = DEFAULT_OSV_CONFIG
): StrikeAnalysis {
  const totalVolume = strike.callVolume + strike.putVolume
  const totalOI = strike.callOI + strike.putOI

  // Net flow direction
  const netFlow = (strike.callVolume * 1) + (strike.putVolume * -1)

  // Calculate loading zone detection
  const volumeOIRatio = totalOI > 0 ? totalVolume / totalOI : 0
  const loadingZone = volumeOIRatio >= config.loadingZoneThreshold && totalVolume > 1000
  const loadingStrength = loadingZone ? Math.min(100, volumeOIRatio * 200) : 0

  // Gamma at strike
  const gammaAtStrike = strike.callGamma - strike.putGamma

  // Implied move based on strike distance and gamma
  const distancePct = Math.abs(strike.strike - currentPrice) / currentPrice * 100
  const impliedMove = distancePct * (1 + Math.abs(gammaAtStrike) * 0.1)

  return {
    strike: strike.strike,
    callVolume: strike.callVolume,
    putVolume: strike.putVolume,
    callOI: strike.callOI,
    putOI: strike.putOI,
    totalPremium: strike.callPremium + strike.putPremium,
    netFlow,
    gammaAtStrike,
    loadingZone,
    loadingStrength,
    impliedMove,
  }
}

/**
 * Full OSV analysis
 */
export function analyzeOSV(
  symbol: string,
  optionsData: OptionsData,
  config: OSVConfig = DEFAULT_OSV_CONFIG
): OSVResult {
  const { strikes, currentPrice } = optionsData

  // Analyze each strike
  const strikeAnalyses = strikes.map(s => analyzeStrike(s, currentPrice, config))

  // Find strongest bull/bear strikes
  const sortedByFlow = [...strikeAnalyses].sort((a, b) => b.netFlow - a.netFlow)
  const strongestBullStrike = sortedByFlow.length > 0 ? sortedByFlow[0].strike : currentPrice
  const strongestBearStrike = sortedByFlow.length > 0 ? sortedByFlow[sortedByFlow.length - 1].strike : currentPrice

  // Find loading zones
  const loadingZones = strikeAnalyses
    .filter(s => s.loadingZone)
    .sort((a, b) => b.loadingStrength - a.loadingStrength)
    .map(s => s.strike)

  // Calculate expected range based on loading zones
  const loadingStrikes = loadingZones.length > 0 ? loadingZones : [currentPrice]
  const expectedLow = Math.min(...loadingStrikes) * 0.98
  const expectedHigh = Math.max(...loadingStrikes) * 1.02

  // Determine dominant sentiment
  const totalCallFlow = strikeAnalyses.reduce((sum, s) => sum + s.callVolume, 0)
  const totalPutFlow = strikeAnalyses.reduce((sum, s) => sum + s.putVolume, 0)
  const flowRatio = totalCallFlow / (totalPutFlow || 1)

  let dominantSentiment: OSVResult['dominantSentiment']
  if (flowRatio > 1.3) dominantSentiment = 'bullish'
  else if (flowRatio < 0.7) dominantSentiment = 'bearish'
  else dominantSentiment = 'neutral'

  // Key levels (strikes with highest activity)
  const keyLevels = strikeAnalyses
    .sort((a, b) => (b.callVolume + b.putVolume) - (a.callVolume + a.putVolume))
    .slice(0, 5)
    .map(s => s.strike)
    .sort((a, b) => a - b)

  return {
    symbol,
    currentPrice,
    strikes: strikeAnalyses.sort((a, b) => a.strike - b.strike),
    strongestBullStrike,
    strongestBearStrike,
    loadingZones,
    expectedRange: { low: expectedLow, high: expectedHigh },
    dominantSentiment,
    keyLevels,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSITE ANALYSIS - COMBINING ALL INDICATORS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generates composite signal from all indicators
 */
export function calculateCompositeScore(
  rad: RADIndicatorResult['rad'],
  tank: TANKMetrics,
  mplp: MPLPResult,
  osv: OSVResult
): { score: number; signal: RADIndicatorResult['actionSignal'] } {
  let score = 0

  // RAD contribution (weight: 25%)
  const radScore = rad.patterns.length > 0
    ? (rad.patterns[0].signal === 'bullish_reversal' ? 25 :
       rad.patterns[0].signal === 'breakout_pending' ? 15 :
       rad.patterns[0].signal === 'bearish_continuation' ? -20 : 0)
    : 0
  score += radScore

  // TANK contribution (weight: 30%)
  const tankScore = tank.currentStrength * 0.3
  score += tankScore

  // MP/LP contribution (weight: 25%)
  const mplpScore = mplp.expectedGravity === 'strong_up' ? 25 :
                    mplp.expectedGravity === 'weak_up' ? 12 :
                    mplp.expectedGravity === 'weak_down' ? -12 :
                    mplp.expectedGravity === 'strong_down' ? -25 : 0
  score += mplpScore

  // OSV contribution (weight: 20%)
  const osvScore = osv.dominantSentiment === 'bullish' ? 20 :
                   osv.dominantSentiment === 'bearish' ? -20 : 0
  score += osvScore

  // Clamp to -100 to +100
  score = Math.max(-100, Math.min(100, Math.round(score)))

  // Determine action signal
  let signal: RADIndicatorResult['actionSignal']
  if (score >= 50) signal = 'strong_buy'
  else if (score >= 20) signal = 'buy'
  else if (score >= -20) signal = 'hold'
  else if (score >= -50) signal = 'sell'
  else signal = 'strong_sell'

  return { score, signal }
}

/**
 * Full RAD Indicator analysis combining all components
 */
export function analyzeRADIndicators(
  symbol: string,
  bars: PriceBar[],
  optionsData: OptionsData,
  darkPoolRatio: number = 0
): RADIndicatorResult {
  // RAD Analysis
  const radPatterns = detectRADPatterns(bars)
  const currentPhase = determineCurrentPhase(bars, radPatterns)

  const radAnalysis = {
    patterns: radPatterns,
    currentPhase,
    overallSignal: radPatterns.length > 0 ? radPatterns[0].signal : 'no_pattern',
    strength: radPatterns.length > 0 ? radPatterns[0].strength : 0,
  }

  // TANK Analysis
  const tankMetrics = calculateTANKMetrics(bars, darkPoolRatio)

  // MP/LP Analysis
  const mplpAnalysis = analyzeMPLP(optionsData)

  // OSV Analysis
  const osvAnalysis = analyzeOSV(symbol, optionsData)

  // Composite Score
  const { score: compositeScore, signal: actionSignal } = calculateCompositeScore(
    radAnalysis,
    tankMetrics,
    mplpAnalysis,
    osvAnalysis
  )

  return {
    symbol,
    timestamp: Date.now(),
    rad: radAnalysis,
    tank: tankMetrics,
    mplp: mplpAnalysis,
    osv: osvAnalysis,
    compositeScore,
    actionSignal,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS FOR DATA GENERATION (When no real options data available)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generates mock options data for testing when API data unavailable
 */
export function generateMockOptionsData(
  currentPrice: number,
  gex: number = 0,
  gammaFlip: number = 0
): OptionsData {
  const strikes: OptionsData['strikes'] = []

  // Generate strikes around current price
  const strikeInterval = currentPrice > 100 ? 5 : currentPrice > 20 ? 2.5 : 0.5
  const baseStrike = Math.round(currentPrice / strikeInterval) * strikeInterval

  for (let i = -10; i <= 10; i++) {
    const strike = baseStrike + (i * strikeInterval)
    if (strike <= 0) continue

    const distanceFromPrice = Math.abs(strike - currentPrice)
    const atmFactor = Math.exp(-distanceFromPrice / (currentPrice * 0.1))

    strikes.push({
      strike,
      callOI: Math.round(1000 + Math.random() * 5000 * atmFactor),
      putOI: Math.round(1000 + Math.random() * 5000 * atmFactor),
      callVolume: Math.round(100 + Math.random() * 500 * atmFactor),
      putVolume: Math.round(100 + Math.random() * 500 * atmFactor),
      callGamma: (0.01 + Math.random() * 0.05) * atmFactor,
      putGamma: (0.01 + Math.random() * 0.05) * atmFactor,
      callPremium: Math.round(10000 + Math.random() * 50000 * atmFactor),
      putPremium: Math.round(10000 + Math.random() * 50000 * atmFactor),
    })
  }

  return {
    strikes,
    currentPrice,
    gex: gex || (Math.random() - 0.5) * 100000000,
    gammaFlip: gammaFlip || currentPrice * (0.95 + Math.random() * 0.1),
  }
}
