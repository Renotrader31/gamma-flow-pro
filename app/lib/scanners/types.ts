// Unified Scanner Types for Gamma Flow Pro

export interface StockData {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  open?: number;
  high?: number;
  low?: number;
  prevClose?: number;
  gex?: number;
  netGEX?: number;
  putCallRatio?: number;
  flowScore?: number;
  netPremium?: number;
  optionVolume?: number;
  maxPain?: number;
  maxPainDistance?: number;
  unusualActivity?: number;
  ivRank?: number;
  gammaLevels?: {
    flip: number;
    resistance: number[];
    support: number[];
  };
  liquidity?: LiquidityData;
  tankFlow?: TANKFlowData;
  radSetup?: RADSetupData;
  mpLpZones?: MPLPZonesData;
  osvMetrics?: OSVMetricsData;
}

export interface TANKFlowData {
  tankRatio: number;
  netFlow: number;
  buyPremium: number;
  sellPremium: number;
  buyVolume: number;
  sellVolume: number;
  flowBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  largeInjections: number;
  darkPoolSentiment?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  score: number;
  signals: string[];
}

export interface TANKFlowAlert {
  ticker: string;
  strike: number;
  expiry: string;
  type: 'call' | 'put';
  totalPremium: number;
  askSidePremium: number;
  bidSidePremium: number;
  totalSize: number;
  isSweep: boolean;
  isFloor: boolean;
  createdAt: string;
}

export interface DarkPoolPrint {
  ticker: string;
  price: number;
  size: number;
  premium: number;
  nbboAsk: number;
  nbboBid: number;
  executedAt: string;
}

export interface RADSetupData {
  score: number;
  normalizedScore: number;
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  trend: 'UP' | 'DOWN';
  dipPercent: number;
  consolRange: number;
  higherLows: number;
  lowerHighs: number;
  emaValue: number;
  isAboveTrend: boolean;
  signals: string[];
}

export interface RADConfig {
  atrMultiplier: number;
  lookbackPeriod: number;
  consolidationDays: number;
  rangeThreshold: number;
  bullishThreshold: number;
  bearishThreshold: number;
  emaLength: number;
}

export interface PriceBar {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MPLPZonesData {
  magnetPrice: number;
  liquidityPull: number;
  callWall: number;
  putWall: number;
  netGEX: number;
  putCallOIRatio: number;
  priceVsMagnet: 'ABOVE' | 'BELOW' | 'AT';
  gammaEnvironment: 'POSITIVE' | 'NEGATIVE';
  score: number;
  signals: string[];
}

export interface OptionsStrike {
  strike: number;
  callOI: number;
  putOI: number;
  callGamma: number;
  putGamma: number;
  netGamma: number;
  callVolume: number;
  putVolume: number;
}

export interface OSVMetricsData {
  totalCallVolume: number;
  totalPutVolume: number;
  putCallRatio: number;
  callAskVolume: number;
  callBidVolume: number;
  putAskVolume: number;
  putBidVolume: number;
  netCallPremium: number;
  netPutPremium: number;
  bullishPremium: number;
  bearishPremium: number;
  maxPain: number;
  maxPainExpiry: string;
  volumeVsAvg: number;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  score: number;
  signals: string[];
}

export interface LiquidityData {
  activeFVGCount: number;
  bullishFVGCount: number;
  bearishFVGCount: number;
  liquidityZoneCount: number;
  buyVolume: number;
  sellVolume: number;
  delta: number;
  avgAbsDelta: number;
  isSignificantBuying: boolean;
  isSignificantSelling: boolean;
  liquidityScore: number;
  liquiditySignals: string[];
}

export interface ScannerResult {
  symbol: string;
  company: string;
  price: number;
  changePercent: number;
  volume: number;
  tankScore: number;
  radScore: number;
  mpLpScore: number;
  osvScore: number;
  liquidityScore: number;
  combinedScore: number;
  signals: string[];
  tankFlow?: TANKFlowData;
  radSetup?: RADSetupData;
  mpLpZones?: MPLPZonesData;
  osvMetrics?: OSVMetricsData;
  liquidity?: LiquidityData;
}

export type ScanMode = 'intraday' | 'swing' | 'longterm' | 'liquidity';

export interface ScanModeWeights {
  tank: number;
  rad: number;
  mpLp: number;
  osv: number;
  liquidity: number;
}

export const MODE_WEIGHTS: Record<ScanMode, ScanModeWeights> = {
  intraday: {
    tank: 0.35,
    rad: 0.10,
    mpLp: 0.30,
    osv: 0.15,
    liquidity: 0.10
  },
  swing: {
    tank: 0.15,
    rad: 0.35,
    mpLp: 0.15,
    osv: 0.25,
    liquidity: 0.10
  },
  longterm: {
    tank: 0.20,
    rad: 0.15,
    mpLp: 0.10,
    osv: 0.40,
    liquidity: 0.15
  },
  liquidity: {
    tank: 0.15,
    rad: 0.10,
    mpLp: 0.15,
    osv: 0.10,
    liquidity: 0.50
  }
};
