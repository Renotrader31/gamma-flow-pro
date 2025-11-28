/**
 * MP/LP - Magnet Price & Liquidity Pull Zones
 *
 * Shows where price is naturally pulled based on open interest and liquidity
 * clusters. Price tends to gravitate toward these zones, making them powerful
 * for timing entries and exits.
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

export interface MPLPConfig {
  strikeRange: number      // Number of strikes above/below current price (default: 10)
  minOIThreshold: number   // Minimum OI to consider (default: 1000)
  gammaWeight: number      // Weight for gamma in calculation (default: 1.2)
}

export const DEFAULT_MPLP_CONFIG: MPLPConfig = {
  strikeRange: 10,
  minOIThreshold: 1000,
  gammaWeight: 1.2,
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

  // Filter relevant strikes within range
  const relevantStrikes = strikes.filter(s =>
    Math.abs(s.strike - currentPrice) / currentPrice <= 0.15 &&
    (s.callOI + s.putOI) >= config.minOIThreshold
  )

  if (relevantStrikes.length === 0) return currentPrice

  // Calculate OI-weighted magnet price
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
 * Identifies Liquidity Pull zones based on OI clusters and gamma
 */
export function identifyLiquidityPullZones(
  optionsData: OptionsData,
  config: MPLPConfig = DEFAULT_MPLP_CONFIG
): MagnetPriceZone[] {
  const { strikes, currentPrice } = optionsData
  const zones: MagnetPriceZone[] = []

  // Sort strikes by total OI
  const sortedStrikes = [...strikes]
    .filter(s => (s.callOI + s.putOI) >= config.minOIThreshold)
    .sort((a, b) => (b.callOI + b.putOI) - (a.callOI + a.putOI))

  // Top 5 strikes by OI are liquidity pull zones
  const topStrikes = sortedStrikes.slice(0, 5)
  const maxOI = topStrikes.length > 0 ? topStrikes[0].callOI + topStrikes[0].putOI : 1

  for (const strike of topStrikes) {
    const totalOI = strike.callOI + strike.putOI
    const strength = Math.min(100, (totalOI / maxOI) * 100)

    // Calculate pull direction based on gamma
    const gammaDelta = strike.callGamma - strike.putGamma
    let pullDirection: MagnetPriceZone['pullDirection']
    if (gammaDelta > 0) pullDirection = 'above'
    else if (gammaDelta < 0) pullDirection = 'below'
    else pullDirection = 'neutral'

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
      // Call holders' pain (calls are worthless below strike)
      if (s.strike < targetStrike.strike) {
        totalPain += s.callOI * (targetStrike.strike - s.strike)
      }
      // Put holders' pain (puts are worthless above strike)
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

  const { currentPrice, gammaFlip, gex } = optionsData

  // Calculate expected gravity direction
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

  // Price target based on magnet and gamma regime
  const priceTarget = gex > 0
    ? magnetPrice * 1.01  // Positive gamma = price sticky to magnet
    : magnetPrice * (magnetPrice > currentPrice ? 1.02 : 0.98)  // Negative gamma = amplified moves

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

/**
 * Generates mock options data for testing
 */
export function generateMockOptionsData(
  currentPrice: number,
  gex: number = 0,
  gammaFlip: number = 0
): OptionsData {
  const strikes: OptionsData['strikes'] = []

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
