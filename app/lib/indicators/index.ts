/**
 * Standalone Trading Indicators
 *
 * Each indicator can be used independently:
 *
 * - RAD Chart: Post-dip pattern analysis
 * - TANK Chart: Order flow & dark pool tracking
 * - MP/LP: Magnet price & liquidity pull zones
 * - OSV: Options strike volume analysis
 */

// RAD Chart - Resistance After Dip
export {
  analyzeRAD,
  detectRADPatterns,
  determineCurrentPhase,
  DEFAULT_RAD_CONFIG,
  type RADPattern,
  type RADResult,
  type RADConfig,
} from './rad-chart'

// TANK Chart - Order Flow Analysis
export {
  analyzeTANK,
  detectInjections,
  estimateBuySellVolume,
  DEFAULT_TANK_CONFIG,
  type TANKInjection,
  type TANKResult,
  type TANKConfig,
} from './tank-chart'

// MP/LP - Magnet Price & Liquidity Pull
export {
  analyzeMPLP,
  calculateMagnetPrice,
  calculateMaxPain,
  identifyLiquidityPullZones,
  generateMockOptionsData as generateMPLPMockData,
  DEFAULT_MPLP_CONFIG,
  type MagnetPriceZone,
  type MPLPResult,
  type MPLPConfig,
  type OptionsData,
} from './mplp-zones'

// OSV - Options Strike Volume
export {
  analyzeOSV,
  analyzeStrike,
  analyzeMultipleSymbols,
  findLoadingZones,
  findKeyLevels,
  compareStrikes,
  determineSentiment,
  calculateExpectedRange,
  generateMockOptionsData as generateOSVMockData,
  DEFAULT_OSV_CONFIG,
  type StrikeAnalysis,
  type OSVResult,
  type OSVConfig,
  type ExpirationAnalysis,
} from './osv-analysis'

// Common PriceBar type
export type { PriceBar } from './rad-chart'
