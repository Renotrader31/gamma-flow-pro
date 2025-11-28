/**
 * OSV - Options Strike Volume Analysis
 *
 * Analyzes multiple stocks & expirations, compares strike strength across them,
 * and spots loading zones to predict future moves.
 */

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

export interface StrikeAnalysis {
  strike: number
  callVolume: number
  putVolume: number
  callOI: number
  putOI: number
  totalPremium: number
  netFlow: number          // positive = bullish, negative = bearish
  gammaAtStrike: number
  loadingZone: boolean
  loadingStrength: number
  impliedMove: number
}

export interface ExpirationAnalysis {
  expiration: string
  totalCallOI: number
  totalPutOI: number
  maxPain: number
  dominantStrikes: number[]
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
  multiExpAnalysis?: ExpirationAnalysis[]
}

export interface OSVConfig {
  loadingZoneThreshold: number    // Volume/OI ratio for "loading" (default: 0.3)
  significantFlowThreshold: number // Minimum premium for significant flow
  multiExpiration: boolean         // Analyze multiple expirations
}

export const DEFAULT_OSV_CONFIG: OSVConfig = {
  loadingZoneThreshold: 0.3,
  significantFlowThreshold: 100000,
  multiExpiration: true,
}

/**
 * Analyzes a single strike for loading zones and flow
 */
export function analyzeStrike(
  strike: OptionsData['strikes'][0],
  currentPrice: number,
  config: OSVConfig = DEFAULT_OSV_CONFIG
): StrikeAnalysis {
  const totalVolume = strike.callVolume + strike.putVolume
  const totalOI = strike.callOI + strike.putOI

  // Net flow direction (positive = bullish, negative = bearish)
  const netFlow = strike.callVolume - strike.putVolume

  // Loading zone detection: high volume relative to OI
  const volumeOIRatio = totalOI > 0 ? totalVolume / totalOI : 0
  const loadingZone = volumeOIRatio >= config.loadingZoneThreshold && totalVolume > 1000
  const loadingStrength = loadingZone ? Math.min(100, volumeOIRatio * 200) : 0

  // Net gamma at strike
  const gammaAtStrike = strike.callGamma - strike.putGamma

  // Implied move based on distance and gamma
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
 * Finds loading zones - strikes with unusual volume/OI activity
 */
export function findLoadingZones(
  strikes: StrikeAnalysis[],
  config: OSVConfig = DEFAULT_OSV_CONFIG
): number[] {
  return strikes
    .filter(s => s.loadingZone)
    .sort((a, b) => b.loadingStrength - a.loadingStrength)
    .map(s => s.strike)
}

/**
 * Calculates expected price range based on options positioning
 */
export function calculateExpectedRange(
  strikes: StrikeAnalysis[],
  currentPrice: number
): { low: number; high: number } {
  const loadingStrikes = strikes.filter(s => s.loadingZone)

  if (loadingStrikes.length === 0) {
    return {
      low: currentPrice * 0.95,
      high: currentPrice * 1.05,
    }
  }

  const strikePrices = loadingStrikes.map(s => s.strike)
  return {
    low: Math.min(...strikePrices) * 0.98,
    high: Math.max(...strikePrices) * 1.02,
  }
}

/**
 * Determines dominant sentiment from options flow
 */
export function determineSentiment(
  strikes: StrikeAnalysis[]
): 'bullish' | 'bearish' | 'neutral' {
  const totalCallFlow = strikes.reduce((sum, s) => sum + s.callVolume, 0)
  const totalPutFlow = strikes.reduce((sum, s) => sum + s.putVolume, 0)

  const flowRatio = totalCallFlow / (totalPutFlow || 1)

  if (flowRatio > 1.3) return 'bullish'
  if (flowRatio < 0.7) return 'bearish'
  return 'neutral'
}

/**
 * Finds key price levels based on highest activity
 */
export function findKeyLevels(strikes: StrikeAnalysis[], limit: number = 5): number[] {
  return strikes
    .sort((a, b) => (b.callVolume + b.putVolume) - (a.callVolume + a.putVolume))
    .slice(0, limit)
    .map(s => s.strike)
    .sort((a, b) => a - b)
}

/**
 * Compares strike strength across multiple symbols
 */
export function compareStrikes(
  symbolsData: { symbol: string; osv: OSVResult }[]
): {
  symbol: string
  relativeStrength: number
  dominantSentiment: string
  loadingZoneCount: number
}[] {
  return symbolsData.map(({ symbol, osv }) => {
    const totalVolume = osv.strikes.reduce(
      (sum, s) => sum + s.callVolume + s.putVolume,
      0
    )
    const avgVolume = totalVolume / (osv.strikes.length || 1)

    return {
      symbol,
      relativeStrength: avgVolume,
      dominantSentiment: osv.dominantSentiment,
      loadingZoneCount: osv.loadingZones.length,
    }
  }).sort((a, b) => b.relativeStrength - a.relativeStrength)
}

/**
 * Full OSV analysis for a single symbol
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
  const strongestBullStrike = sortedByFlow.length > 0
    ? sortedByFlow[0].strike
    : currentPrice
  const strongestBearStrike = sortedByFlow.length > 0
    ? sortedByFlow[sortedByFlow.length - 1].strike
    : currentPrice

  // Find loading zones
  const loadingZones = findLoadingZones(strikeAnalyses, config)

  // Calculate expected range
  const expectedRange = calculateExpectedRange(strikeAnalyses, currentPrice)

  // Determine sentiment
  const dominantSentiment = determineSentiment(strikeAnalyses)

  // Find key levels
  const keyLevels = findKeyLevels(strikeAnalyses)

  return {
    symbol,
    currentPrice,
    strikes: strikeAnalyses.sort((a, b) => a.strike - b.strike),
    strongestBullStrike,
    strongestBearStrike,
    loadingZones,
    expectedRange,
    dominantSentiment,
    keyLevels,
  }
}

/**
 * Multi-ticker OSV analysis
 */
export function analyzeMultipleSymbols(
  symbolsData: { symbol: string; optionsData: OptionsData }[],
  config: OSVConfig = DEFAULT_OSV_CONFIG
): {
  results: { symbol: string; osv: OSVResult }[]
  comparison: ReturnType<typeof compareStrikes>
} {
  const results = symbolsData.map(({ symbol, optionsData }) => ({
    symbol,
    osv: analyzeOSV(symbol, optionsData, config),
  }))

  const comparison = compareStrikes(results)

  return { results, comparison }
}

/**
 * Generates mock options data for testing
 */
export function generateMockOptionsData(
  currentPrice: number,
  volatilityFactor: number = 1.0
): OptionsData {
  const strikes: OptionsData['strikes'] = []

  const strikeInterval = currentPrice > 100 ? 5 : currentPrice > 20 ? 2.5 : 0.5
  const baseStrike = Math.round(currentPrice / strikeInterval) * strikeInterval

  for (let i = -10; i <= 10; i++) {
    const strike = baseStrike + (i * strikeInterval)
    if (strike <= 0) continue

    const distanceFromPrice = Math.abs(strike - currentPrice)
    const atmFactor = Math.exp(-distanceFromPrice / (currentPrice * 0.1))

    // Add some randomness for loading zones
    const volumeSpike = Math.random() > 0.8 ? 3 : 1

    strikes.push({
      strike,
      callOI: Math.round(1000 + Math.random() * 5000 * atmFactor),
      putOI: Math.round(1000 + Math.random() * 5000 * atmFactor),
      callVolume: Math.round((100 + Math.random() * 500 * atmFactor) * volumeSpike * volatilityFactor),
      putVolume: Math.round((100 + Math.random() * 500 * atmFactor) * volumeSpike * volatilityFactor),
      callGamma: (0.01 + Math.random() * 0.05) * atmFactor,
      putGamma: (0.01 + Math.random() * 0.05) * atmFactor,
      callPremium: Math.round(10000 + Math.random() * 50000 * atmFactor),
      putPremium: Math.round(10000 + Math.random() * 50000 * atmFactor),
    })
  }

  return {
    strikes,
    currentPrice,
    gex: (Math.random() - 0.5) * 100000000,
    gammaFlip: currentPrice * (0.95 + Math.random() * 0.1),
  }
}
