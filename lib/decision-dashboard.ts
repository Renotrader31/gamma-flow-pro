/**
 * Decision Dashboard Indicator - TypeScript Implementation
 * Translates TradingView Pine Script logic to TypeScript
 *
 * Combines: BFCI Regime + Order Flow + CCI Momentum + Core Value + Fear Gauge + Squeeze
 */

export interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

export interface MarketData {
  symbol: string;
  candles: CandleData[];
  // BFCI data sources (daily data)
  spy?: CandleData[];
  hyg?: CandleData[];
  lqd?: CandleData[];
  vix?: CandleData[];
  dxy?: CandleData[];
}

export interface IndicatorResult {
  symbol: string;
  timeframe: string;
  timestamp: number;

  // Main outputs
  action: string;
  direction: number; // 1 = long, -1 = short, 0 = neutral
  alignmentScore: number; // 0-12
  confidence: string; // 'MAX' | 'HIGH' | 'MED' | 'LOW'
  sizePercent: number; // 0-100

  // Component scores
  bfci: number;
  bfciState: number; // 1 = bull, -1 = bear, 0 = neutral
  bfciStrong: boolean;

  coreValue: number;
  directionalScore: number;
  momentumMultiplier: number;

  cci: number;
  cciMomentum: number;
  cciBullDiv: boolean;
  cciBearDiv: boolean;

  orderFlowDelta: number;
  orderFlowCumDelta: number;
  orderFlowStrength: number;
  orderFlowBuyPct: number;
  orderFlowImbalance: boolean;

  fearValue: number;
  fearExtreme: boolean;

  squeezeOn: boolean;
  squeezeCount: number;
  squeezeFired: boolean;

  prohibitionActive: boolean;
  volumeSurge: boolean;
  adxValue: number;
}

// Helper functions
function sma(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j];
      }
      result.push(sum / period);
    }
  }
  return result;
}

function ema(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(data[0]);
    } else {
      result.push((data[i] - result[i - 1]) * multiplier + result[i - 1]);
    }
  }
  return result;
}

function stdev(data: number[], period: number, index: number): number {
  if (index < period - 1) return 0;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[index - i];
  }
  const mean = sum / period;

  let variance = 0;
  for (let i = 0; i < period; i++) {
    variance += Math.pow(data[index - i] - mean, 2);
  }

  return Math.sqrt(variance / period);
}

function rsi(data: number[], period: number): number[] {
  const result: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      gains.push(0);
      losses.push(0);
      result.push(50);
    } else {
      const change = data[i] - data[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? -change : 0);

      if (i < period) {
        result.push(50);
      } else {
        const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period;
        const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period;

        if (avgLoss === 0) {
          result.push(100);
        } else {
          const rs = avgGain / avgLoss;
          result.push(100 - (100 / (1 + rs)));
        }
      }
    }
  }
  return result;
}

function atr(candles: CandleData[], period: number): number[] {
  const trueRanges: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      trueRanges.push(candles[i].high - candles[i].low);
    } else {
      const tr = Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - candles[i - 1].close),
        Math.abs(candles[i].low - candles[i - 1].close)
      );
      trueRanges.push(tr);
    }
  }

  return sma(trueRanges, period);
}

// BFCI Calculation
function calculateBFCI(
  spy: CandleData[],
  hyg: CandleData[],
  lqd: CandleData[],
  vix: CandleData[],
  dxy: CandleData[],
  lookback: number,
  smooth: number,
  retLen: number
): number {
  const idx = spy.length - 1;

  if (idx < lookback) return 0;

  // Z-score calculation
  const zScore = (src: number[], len: number, index: number): number => {
    const vals = src.slice(Math.max(0, index - len + 1), index + 1);
    const mean = vals.reduce((a, b) => a + b) / vals.length;
    const std = Math.sqrt(vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length);
    return std === 0 ? 0 : (src[index] - mean) / std;
  };

  const zRet = (src: number[], win: number, len: number, index: number): number => {
    if (index < win) return 0;
    const ret = Math.log(src[index] / src[index - win]);
    return zScore([ret], len, 0);
  };

  const clamp = (x: number, lim: number): number => Math.max(-lim, Math.min(lim, x));

  const spyCloses = spy.map(c => c.close);
  const hygCloses = hyg.map(c => c.close);
  const lqdCloses = lqd.map(c => c.close);
  const vixCloses = vix.map(c => c.close);
  const dxyCloses = dxy.map(c => c.close);

  // Component z-scores
  const eqZ = clamp(zRet(spyCloses, retLen, lookback, idx), 3.0);

  const creditSpread = lqdCloses.map((l, i) => l / (hygCloses[i] || 1));
  const csZ = clamp(-zScore(creditSpread, lookback, idx), 3.0);

  const volZ = clamp(-zScore(vixCloses, lookback, idx), 3.0);
  const usdZ = clamp(-zScore(dxyCloses, lookback, idx), 3.0);

  const raw = (eqZ + csZ + volZ + usdZ) / 4.0;

  // Apply EMA smoothing
  return raw; // Simplified - full EMA would require tracking state
}

// Order Flow Estimation
function estimateBuySellVolume(
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number,
  method: 'Simple' | 'Advanced' | 'Hybrid' = 'Advanced'
): [number, number] {
  if (volume === 0 || high === low) {
    return [volume * 0.5, volume * 0.5];
  }

  const priceRange = high - low;
  const closePosition = (close - low) / priceRange;

  const simpleRatio = close > open ? 0.6 : 0.4;

  const buyPressure = close - low;
  const sellPressure = high - close;
  const advancedRatio = buyPressure > sellPressure
    ? 0.4 + closePosition * 0.4
    : 0.2 + closePosition * 0.3;

  const buyRatio = method === 'Simple' ? simpleRatio
    : method === 'Advanced' ? advancedRatio
    : (simpleRatio + advancedRatio) / 2;

  const buyVol = volume * buyRatio;
  const sellVol = volume - buyVol;

  return [buyVol, sellVol];
}

// CCI Calculation
function calculateCCI(candles: CandleData[], length: number, smoothing: number): number[] {
  const hlc3 = candles.map(c => (c.high + c.low + c.close) / 3);
  const smaVals = sma(hlc3, length);
  const cci: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i < length - 1) {
      cci.push(0);
    } else {
      const deviation = stdev(hlc3, length, i);
      const rawCCI = deviation === 0 ? 0 : (hlc3[i] - smaVals[i]) / (0.015 * deviation);
      cci.push(rawCCI);
    }
  }

  return ema(ema(cci, smoothing), 2);
}

// Fear Gauge (Williams VIX Fix)
function calculateFear(candles: CandleData[], pd: number = 22, bbl: number = 20, mult: number = 2.0): [number, boolean] {
  if (candles.length < pd) return [0, false];

  const idx = candles.length - 1;
  const closes = candles.map(c => c.close);

  // Highest price in period
  let hp = candles[idx].close;
  for (let i = Math.max(0, idx - pd + 1); i <= idx; i++) {
    hp = Math.max(hp, candles[i].close);
  }

  const wvf = ((hp - candles[idx].close) / hp) * 100;

  // Calculate bands
  const wvfHistory: number[] = [];
  for (let i = Math.max(0, idx - bbl + 1); i <= idx; i++) {
    let hpTemp = candles[i].close;
    for (let j = Math.max(0, i - pd + 1); j <= i; j++) {
      hpTemp = Math.max(hpTemp, candles[j].close);
    }
    wvfHistory.push(((hpTemp - candles[i].close) / hpTemp) * 100);
  }

  const midLine = wvfHistory.reduce((a, b) => a + b) / wvfHistory.length;
  const sDev = mult * Math.sqrt(wvfHistory.reduce((a, b) => a + Math.pow(b - midLine, 2), 0) / wvfHistory.length);
  const upperBand = midLine + sDev;

  // Range high/low
  const lb = 50;
  const ph = 0.85;
  const allWvf: number[] = [];
  for (let i = Math.max(0, idx - lb + 1); i <= idx; i++) {
    let hpTemp = candles[i].close;
    for (let j = Math.max(0, i - pd + 1); j <= i; j++) {
      hpTemp = Math.max(hpTemp, candles[j].close);
    }
    allWvf.push(((hpTemp - candles[i].close) / hpTemp) * 100);
  }
  const rangeHigh = Math.max(...allWvf) * ph;

  const extreme = wvf >= upperBand || wvf >= rangeHigh;

  return [wvf, extreme];
}

// Squeeze Detection
function calculateSqueeze(candles: CandleData[], length: number = 20, multBB: number = 2.0, multKC: number = 1.5): [boolean, boolean, boolean] {
  if (candles.length < length) return [false, false, true];

  const idx = candles.length - 1;
  const closes = candles.map(c => c.close);

  // Bollinger Bands
  const basis = sma(closes, length)[idx];
  const dev = stdev(closes, length, idx);
  const upperBB = basis + multBB * dev;
  const lowerBB = basis - multBB * dev;

  // Keltner Channels
  const ma = basis;
  const atrVals = atr(candles, length);
  const atrVal = atrVals[idx];
  const upperKC = ma + atrVal * multKC;
  const lowerKC = ma - atrVal * multKC;

  const sqzOn = lowerBB > lowerKC && upperBB < upperKC;
  const sqzOff = lowerBB < lowerKC && upperBB > upperKC;
  const noSqz = !sqzOn && !sqzOff;

  return [sqzOn, sqzOff, noSqz];
}

// Core Value Engine
function calculateCoreValue(candles: CandleData[]): {
  coreValue: number;
  directionalScore: number;
  momentumMultiplier: number;
  prohibitionActive: boolean;
  adxValue: number;
  volumeRatio: number;
  volumeSurge: boolean;
} {
  if (candles.length < 200) {
    return {
      coreValue: 0,
      directionalScore: 0,
      momentumMultiplier: 1,
      prohibitionActive: true,
      adxValue: 0,
      volumeRatio: 1,
      volumeSurge: false
    };
  }

  const idx = candles.length - 1;
  const closes = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);

  // Volume analysis
  const volAvg = sma(volumes, 20)[idx];
  const volRatio = volAvg > 0 ? volumes[idx] / volAvg : 1.0;
  const volSurge = volRatio >= 1.5;

  // Moving averages
  const sma9 = sma(closes, 9)[idx];
  const sma21 = sma(closes, 21)[idx];
  const sma50 = sma(closes, 50)[idx];
  const sma200 = sma(closes, 200)[idx];

  let smaScore = 0;
  smaScore += sma9 > sma21 ? 33.33 : -33.33;
  smaScore += sma21 > sma50 ? 33.33 : -33.33;
  smaScore += sma50 > sma200 ? 33.34 : -33.34;

  // RSI
  const rsiVals = rsi(closes, 14);
  const rsiVal = rsiVals[idx];
  const rsiScore = rsiVal > 70 ? 50 : rsiVal > 50 ? 100 : rsiVal > 30 ? -100 : -50;

  // MACD (simplified)
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const macdSignal = ema(macdLine, 9);
  const macdHist = macdLine.map((v, i) => v - macdSignal[i]);

  let macdScore = 0;
  macdScore += macdHist[idx] > 0 ? 50 : -50;
  macdScore += macdLine[idx] > macdSignal[idx] ? 50 : -50;

  // VWAP approximation
  const hlc3 = candles.map(c => (c.high + c.low + c.close) / 3);
  const vwapApprox = hlc3.slice(-20).reduce((a, b) => a + b) / 20;
  const vwapDist = ((candles[idx].close - vwapApprox) / vwapApprox) * 100;
  const vwapScore = vwapDist > 1 ? 100 : vwapDist > 0 ? 50 : vwapDist > -1 ? -50 : -100;

  // Supertrend (simplified - assume direction from price vs MA)
  const stScore = candles[idx].close > sma21 ? 100 : -100;

  const directionalScore = (
    smaScore * 0.3 +
    rsiScore * 0.2 +
    macdScore * 0.2 +
    vwapScore * 0.15 +
    stScore * 0.15
  );

  // Calculate real ADX (Average Directional Index)
  const atrVals = atr(candles, 14);
  const atrCurrent = atrVals[idx];
  const atrAvg = sma(atrVals, 50)[idx];
  const atrRatio = atrAvg > 0 ? atrCurrent / atrAvg : 1.0;

  // Real ADX calculation
  const adxPeriod = 14;
  const diPlus: number[] = [];
  const diMinus: number[] = [];
  const dx: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const highDiff = candles[i].high - candles[i - 1].high;
    const lowDiff = candles[i - 1].low - candles[i].low;

    const plusDM = highDiff > lowDiff && highDiff > 0 ? highDiff : 0;
    const minusDM = lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0;

    if (i < adxPeriod) {
      diPlus.push(0);
      diMinus.push(0);
      dx.push(0);
      continue;
    }

    // Calculate smoothed DMs
    let sumPlusDM = 0;
    let sumMinusDM = 0;
    let sumTR = 0;

    for (let j = 0; j < adxPeriod; j++) {
      const idx2 = i - j;
      if (idx2 <= 0) continue;

      const hd = candles[idx2].high - candles[idx2 - 1].high;
      const ld = candles[idx2 - 1].low - candles[idx2].low;
      sumPlusDM += hd > ld && hd > 0 ? hd : 0;
      sumMinusDM += ld > hd && ld > 0 ? ld : 0;

      const tr = Math.max(
        candles[idx2].high - candles[idx2].low,
        Math.abs(candles[idx2].high - candles[idx2 - 1].close),
        Math.abs(candles[idx2].low - candles[idx2 - 1].close)
      );
      sumTR += tr;
    }

    const diP = sumTR > 0 ? (sumPlusDM / sumTR) * 100 : 0;
    const diM = sumTR > 0 ? (sumMinusDM / sumTR) * 100 : 0;

    diPlus.push(diP);
    diMinus.push(diM);

    // Calculate DX
    const diSum = diP + diM;
    const dxVal = diSum > 0 ? (Math.abs(diP - diM) / diSum) * 100 : 0;
    dx.push(dxVal);
  }

  // Calculate ADX as smoothed DX
  const adxValue = idx >= adxPeriod * 2 ? sma(dx, adxPeriod)[idx - 1] || 0 : 0;

  // Momentum multiplier
  const adxStrength = Math.min(adxValue / 50, 1.0);
  const atrStrength = Math.min(atrRatio, 2.0) / 2.0;
  const volStrength = Math.min(volRatio / 1.5, 2.0) / 2.0;
  const avgStrength = (adxStrength + atrStrength + volStrength) / 3.0;
  const momentumMultiplier = 0.5 + 1.5 * avgStrength;

  // Prohibitions
  let prohibitionActive = false;
  if (adxValue < 20) prohibitionActive = true;
  if (atrRatio < 0.8) prohibitionActive = true;
  const maDist = Math.abs((candles[idx].close - sma50) / sma50 * 100);
  if (maDist < 0.5) prohibitionActive = true;
  if (volRatio < 0.5) prohibitionActive = true;

  // Final core value
  const baseCoreValue = directionalScore * momentumMultiplier;
  const coreValue = prohibitionActive ? 0 : Math.max(-100, Math.min(100, baseCoreValue));

  return {
    coreValue,
    directionalScore,
    momentumMultiplier,
    prohibitionActive,
    adxValue,
    volumeRatio: volRatio,
    volumeSurge: volSurge
  };
}

/**
 * Main indicator calculation function
 */
export function calculateDecisionDashboard(
  marketData: MarketData,
  timeframe: string,
  config?: {
    enableBFCI?: boolean;
    enableOrderFlow?: boolean;
    enableCCI?: boolean;
    enableCore?: boolean;
    enableFear?: boolean;
    enableSqueeze?: boolean;
  }
): IndicatorResult | null {
  const {
    enableBFCI = true,
    enableOrderFlow = true,
    enableCCI = true,
    enableCore = true,
    enableFear = true,
    enableSqueeze = true
  } = config || {};

  const { symbol, candles } = marketData;

  if (candles.length < 200) {
    return null; // Not enough data
  }

  const idx = candles.length - 1;
  const lastCandle = candles[idx];

  // Initialize result
  const result: IndicatorResult = {
    symbol,
    timeframe,
    timestamp: lastCandle.timestamp,
    action: 'WAIT',
    direction: 0,
    alignmentScore: 0,
    confidence: 'LOW',
    sizePercent: 0,
    bfci: 0,
    bfciState: 0,
    bfciStrong: false,
    coreValue: 0,
    directionalScore: 0,
    momentumMultiplier: 1,
    cci: 0,
    cciMomentum: 0,
    cciBullDiv: false,
    cciBearDiv: false,
    orderFlowDelta: 0,
    orderFlowCumDelta: 0,
    orderFlowStrength: 0,
    orderFlowBuyPct: 50,
    orderFlowImbalance: false,
    fearValue: 0,
    fearExtreme: false,
    squeezeOn: false,
    squeezeCount: 0,
    squeezeFired: false,
    prohibitionActive: false,
    volumeSurge: false,
    adxValue: 0
  };

  // Calculate BFCI
  if (enableBFCI && marketData.spy && marketData.hyg && marketData.lqd && marketData.vix && marketData.dxy) {
    result.bfci = calculateBFCI(
      marketData.spy,
      marketData.hyg,
      marketData.lqd,
      marketData.vix,
      marketData.dxy,
      252, 10, 63
    );
    result.bfciState = result.bfci >= 0.5 ? 1 : result.bfci <= -0.5 ? -1 : 0;
    result.bfciStrong = Math.abs(result.bfci) >= 1.0;

    // BFCI contribution (0-3 points)
    if (result.bfciStrong && result.bfciState === 1) {
      result.alignmentScore += 3;
    } else if (result.bfciState === 1) {
      result.alignmentScore += 2;
    } else if (result.bfciState === 0) {
      result.alignmentScore += 1;
    }
  }

  // Calculate Core Value
  if (enableCore) {
    const coreResult = calculateCoreValue(candles);
    result.coreValue = coreResult.coreValue;
    result.directionalScore = coreResult.directionalScore;
    result.momentumMultiplier = coreResult.momentumMultiplier;
    result.prohibitionActive = coreResult.prohibitionActive;
    result.adxValue = coreResult.adxValue;
    result.volumeSurge = coreResult.volumeSurge;

    // Core Value contribution (0-3 points)
    if (result.coreValue >= 80) {
      result.alignmentScore += 3;
    } else if (result.coreValue >= 60) {
      result.alignmentScore += 2;
    } else if (result.coreValue >= 40) {
      result.alignmentScore += 1;
    }
  }

  // Calculate Order Flow
  if (enableOrderFlow) {
    const [buyVol, sellVol] = estimateBuySellVolume(
      lastCandle.open,
      lastCandle.high,
      lastCandle.low,
      lastCandle.close,
      lastCandle.volume
    );

    result.orderFlowDelta = buyVol - sellVol;
    result.orderFlowStrength = lastCandle.volume > 0 ? (Math.abs(result.orderFlowDelta) / lastCandle.volume) * 100 : 0;
    result.orderFlowBuyPct = lastCandle.volume > 0 ? (buyVol / lastCandle.volume) * 100 : 50;

    const imbalanceRatio = buyVol > 0 && sellVol > 0 ? Math.max(buyVol / sellVol, sellVol / buyVol) : 1.0;
    result.orderFlowImbalance = imbalanceRatio >= 2.0;

    // Order Flow contribution (0-2 points)
    if (result.orderFlowImbalance && Math.abs(result.orderFlowDelta) >= 1000) {
      result.alignmentScore += 2;
    } else if (result.orderFlowStrength >= 65) {
      result.alignmentScore += 1;
    }
  }

  // Calculate CCI
  if (enableCCI) {
    const cciVals = calculateCCI(candles, 20, 5);
    result.cci = cciVals[idx];
    result.cciMomentum = idx > 0 ? cciVals[idx] - cciVals[idx - 1] : 0;

    // CCI contribution (0-2 points)
    // Divergence detection is complex, simplified here
    if (Math.abs(result.cci) > 100) {
      result.alignmentScore += 1;
    }
  }

  // Calculate Fear Gauge
  if (enableFear) {
    const [fearVal, fearExt] = calculateFear(candles);
    result.fearValue = fearVal;
    result.fearExtreme = fearExt;

    // Fear contribution (0-1 point)
    if (result.fearExtreme) {
      result.alignmentScore += 1;
    }
  }

  // Calculate Squeeze
  if (enableSqueeze) {
    const [sqzOn, sqzOff, sqzNo] = calculateSqueeze(candles);
    result.squeezeOn = sqzOn;

    // Squeeze contribution (0-1 point)
    if (sqzOff) {
      result.alignmentScore += 1;
      result.squeezeFired = true;
    }
  }

  // Determine recommendation
  if (result.alignmentScore >= 8) {
    result.direction = result.bfciState >= 0 ? 1 : -1;
    result.action = result.direction > 0 ? '🚀🚀 MAX LONG' : '💣💣 MAX SHORT';
    result.confidence = 'MAX';
    result.sizePercent = 100;
  } else if (result.alignmentScore >= 6) {
    result.direction = result.bfciState >= 0 ? 1 : -1;
    result.action = result.direction > 0 ? '🚀 STRONG LONG' : '💣 STRONG SHORT';
    result.confidence = 'HIGH';
    result.sizePercent = 75;
  } else if (result.alignmentScore >= 4) {
    result.direction = result.bfciState >= 0 ? 1 : -1;
    result.action = result.direction > 0 ? '↗️ LONG BIAS' : '↘️ SHORT BIAS';
    result.confidence = 'MED';
    result.sizePercent = 50;
  } else if (result.prohibitionActive) {
    result.action = '🚫 PROHIBITED';
    result.confidence = 'LOW';
    result.sizePercent = 0;
  } else {
    result.action = '⏸️ NEUTRAL';
    result.confidence = 'LOW';
    result.sizePercent = 0;
  }

  return result;
}

/**
 * Check if two indicator results are aligned (same action direction)
 */
export function checkAlignment(result1: IndicatorResult, result2: IndicatorResult): boolean {
  // Both must have the same direction (both long, both short, or both neutral)
  if (result1.direction !== result2.direction) {
    return false;
  }

  // Both should have meaningful signals (not just neutral/prohibited)
  if (result1.direction === 0 || result2.direction === 0) {
    return false;
  }

  // Both should have at least medium confidence
  if (result1.alignmentScore < 4 || result2.alignmentScore < 4) {
    return false;
  }

  return true;
}

/**
 * Get alignment strength between two timeframes
 */
export function getAlignmentStrength(result1: IndicatorResult, result2: IndicatorResult): number {
  if (!checkAlignment(result1, result2)) {
    return 0;
  }

  // Average the alignment scores
  return (result1.alignmentScore + result2.alignmentScore) / 2;
}
