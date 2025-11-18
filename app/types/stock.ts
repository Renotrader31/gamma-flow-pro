/**
 * Stock Data Types
 * Includes base market data + options metrics + liquidity hunter metrics
 */

export interface GammaLevels {
  flip: number
  resistance: number[]
  support: number[]
}

export interface LiquidityMetrics {
  // FVG Data
  activeFVGCount: number
  bullishFVGCount: number
  bearishFVGCount: number
  liquidityZoneCount: number

  // Order Flow
  buyVolume: number
  sellVolume: number
  delta: number
  avgAbsDelta: number
  isSignificantBuying: boolean
  isSignificantSelling: boolean

  // Overall Score
  liquidityScore: number // 0-100

  // Active Signals
  liquiditySignals: string[]
}

export interface Stock {
  // Basic Info
  symbol: string
  name: string

  // Price Data
  price: number
  open: number
  high: number
  low: number
  prevClose: number
  changePercent: number

  // Volume & Market Cap
  volume: number
  marketCap: number

  // Options Metrics
  gex: number // Gamma Exposure
  dex: number // Delta Exposure
  vex: number // Vega Exposure
  putCallRatio: number
  ivRank: number
  flowScore: number
  netPremium: number
  darkPoolRatio: number
  optionVolume: number

  // Gamma Levels
  gammaLevels: GammaLevels

  // Liquidity Hunter Metrics (NEW)
  liquidity?: LiquidityMetrics
}

export interface StockAPIResponse {
  data: Stock[]
  timestamp: string
  status: 'success' | 'mock' | 'fallback'
  count: number
  liveOptionsCount: number
}
