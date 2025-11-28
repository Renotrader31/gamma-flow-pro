/**
 * RAD Chart - Resistance After Dip
 *
 * Tracks how price behaves after key dips. Identifies potential bottoms
 * and predicts whether consolidation will lead to a pump or continue sideways.
 */

export interface PriceBar {
  open: number
  high: number
  low: number
  close: number
  volume: number
  timestamp: number
}

export interface RADPattern {
  type: 'accumulation' | 'distribution' | 'consolidation' | 'reversal'
  startIndex: number
  endIndex: number
  dipDepth: number
  dipLow: number
  preDipHigh: number
  recoveryPercent: number
  volumeProfile: 'increasing' | 'decreasing' | 'neutral'
  signal: 'bullish_reversal' | 'bearish_continuation' | 'consolidation' | 'breakout_pending'
  strength: number // 0-100
  resistanceLevels: number[]
  supportLevels: number[]
}

export interface RADResult {
  patterns: RADPattern[]
  currentPhase: 'dip' | 'recovery' | 'consolidation' | 'breakout' | 'none'
  overallSignal: string
  strength: number
}

export interface RADConfig {
  dipThreshold: number      // Minimum % dip to consider (default: 3%)
  recoveryThreshold: number // Minimum % recovery to confirm (default: 1.5%)
  lookbackPeriod: number    // Bars to look back (default: 50)
  volumeConfirmation: boolean
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
 * Calculates volume trend between two points
 */
function analyzeVolumeTrend(
  bars: PriceBar[],
  startIdx: number,
  endIdx: number
): 'increasing' | 'decreasing' | 'neutral' {
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

  for (let i = 0; i < highs.length; i++) {
    const preDipHigh = highs[i]

    // Find the next low after this high
    const followingLows = lows.filter(
      l => l.index > preDipHigh.index && l.index < preDipHigh.index + config.lookbackPeriod
    )

    for (const dipLow of followingLows) {
      const dipPercent = ((preDipHigh.price - dipLow.price) / preDipHigh.price) * 100

      if (dipPercent >= config.dipThreshold) {
        // Find recovery from dip
        const recoveryBars = bars.slice(
          dipLow.index,
          Math.min(dipLow.index + config.lookbackPeriod, bars.length)
        )
        const maxRecovery = Math.max(...recoveryBars.map(b => b.high))
        const recoveryPercent = ((maxRecovery - dipLow.price) / dipLow.price) * 100

        const volumeTrend = analyzeVolumeTrend(
          bars,
          preDipHigh.index,
          dipLow.index + recoveryBars.length - 1
        )

        // Determine pattern type and signal
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
        const resistanceLevels: number[] = [preDipHigh.price]
        const supportLevels: number[] = [dipLow.price]

        const midPoint = (preDipHigh.price + dipLow.price) / 2
        if (maxRecovery < preDipHigh.price) {
          resistanceLevels.push(maxRecovery)
        }
        resistanceLevels.push(midPoint * 1.02)
        supportLevels.push(dipLow.price * 1.01)
        supportLevels.push(midPoint * 0.98)

        // Calculate strength score
        let strength = 50
        if (config.volumeConfirmation && volumeTrend === 'increasing') strength += 15
        if (recoveryPercent >= dipPercent * 0.5) strength += 15

        const dipBars = bars.slice(preDipHigh.index, dipLow.index + 1)
        const avgDipPrice = dipBars.reduce((sum, b) => sum + b.close, 0) / dipBars.length
        const vShapeScore = (avgDipPrice - dipLow.price) / (preDipHigh.price - dipLow.price)
        if (vShapeScore > 0.4) strength += 10
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

        break
      }
    }
  }

  return patterns.sort((a, b) => b.startIndex - a.startIndex).slice(0, 5)
}

/**
 * Determines current market phase
 */
export function determineCurrentPhase(
  bars: PriceBar[],
  patterns: RADPattern[]
): 'dip' | 'recovery' | 'consolidation' | 'breakout' | 'none' {
  if (patterns.length === 0) return 'none'

  const latestPattern = patterns[0]
  const currentBar = bars[bars.length - 1]
  const currentPrice = currentBar.close

  const recentHigh = Math.max(...bars.slice(-10).map(b => b.high))
  const dipFromRecent = ((recentHigh - currentPrice) / recentHigh) * 100

  if (dipFromRecent >= 3) return 'dip'
  if (currentPrice > latestPattern.preDipHigh * 1.02) return 'breakout'
  if (currentPrice > latestPattern.dipLow * 1.02 && currentPrice < latestPattern.preDipHigh * 0.98) {
    return 'recovery'
  }

  return 'consolidation'
}

/**
 * Main RAD analysis function
 */
export function analyzeRAD(
  bars: PriceBar[],
  config: RADConfig = DEFAULT_RAD_CONFIG
): RADResult {
  const patterns = detectRADPatterns(bars, config)
  const currentPhase = determineCurrentPhase(bars, patterns)

  return {
    patterns,
    currentPhase,
    overallSignal: patterns.length > 0 ? patterns[0].signal : 'no_pattern',
    strength: patterns.length > 0 ? patterns[0].strength : 0,
  }
}
