/**
 * Watchlist Scanner API
 * Scans multiple symbols across 5-minute and daily timeframes
 * Identifies when Decision Dashboard indicators align
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  calculateDecisionDashboard,
  checkAlignment,
  getAlignmentStrength,
  type MarketData,
  type CandleData,
  type IndicatorResult
} from '@/lib/decision-dashboard';

export interface WatchlistResult {
  symbol: string;
  aligned: boolean;
  alignmentStrength: number;
  fiveMin: IndicatorResult;
  daily: IndicatorResult;
  combinedScore: number;
  timestamp: number;
}

// Mock data generator for testing
// In production, replace with actual market data API calls
function generateMockCandles(
  symbol: string,
  count: number,
  interval: '5m' | '1d'
): CandleData[] {
  const candles: CandleData[] = [];
  const now = Date.now();
  const intervalMs = interval === '5m' ? 5 * 60 * 1000 : 24 * 60 * 60 * 1000;

  let basePrice = 100 + Math.random() * 400;

  for (let i = count - 1; i >= 0; i--) {
    const timestamp = now - (i * intervalMs);
    const volatility = basePrice * 0.02;

    const open = basePrice;
    const close = open + (Math.random() - 0.5) * volatility;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.floor(1000000 + Math.random() * 10000000);

    candles.push({
      open,
      high,
      low,
      close,
      volume,
      timestamp
    });

    basePrice = close;
  }

  return candles;
}

// Generate mock BFCI data
function generateBFCIData(): {
  spy: CandleData[];
  hyg: CandleData[];
  lqd: CandleData[];
  vix: CandleData[];
  dxy: CandleData[];
} {
  return {
    spy: generateMockCandles('SPY', 500, '1d'),
    hyg: generateMockCandles('HYG', 500, '1d'),
    lqd: generateMockCandles('LQD', 500, '1d'),
    vix: generateMockCandles('VIX', 500, '1d'),
    dxy: generateMockCandles('DXY', 500, '1d')
  };
}

/**
 * Fetch market data for a symbol
 * TODO: Replace with actual API calls (Polygon, Alpha Vantage, etc.)
 */
async function fetchMarketData(
  symbol: string,
  interval: '5m' | '1d'
): Promise<MarketData> {
  // Mock implementation
  const candles = generateMockCandles(symbol, interval === '5m' ? 500 : 500, interval);
  const bfciData = interval === '1d' ? generateBFCIData() : undefined;

  return {
    symbol,
    candles,
    ...(bfciData || {})
  };
}

/**
 * Scan a single symbol for alignment
 */
async function scanSymbol(symbol: string): Promise<WatchlistResult | null> {
  try {
    // Fetch data for both timeframes
    const [fiveMinData, dailyData] = await Promise.all([
      fetchMarketData(symbol, '5m'),
      fetchMarketData(symbol, '1d')
    ]);

    // Add BFCI data to both
    const bfciData = generateBFCIData();
    fiveMinData.spy = bfciData.spy;
    fiveMinData.hyg = bfciData.hyg;
    fiveMinData.lqd = bfciData.lqd;
    fiveMinData.vix = bfciData.vix;
    fiveMinData.dxy = bfciData.dxy;

    dailyData.spy = bfciData.spy;
    dailyData.hyg = bfciData.hyg;
    dailyData.lqd = bfciData.lqd;
    dailyData.vix = bfciData.vix;
    dailyData.dxy = bfciData.dxy;

    // Calculate indicators for both timeframes
    const fiveMinResult = calculateDecisionDashboard(fiveMinData, '5m');
    const dailyResult = calculateDecisionDashboard(dailyData, '1d');

    if (!fiveMinResult || !dailyResult) {
      return null;
    }

    // Check alignment
    const aligned = checkAlignment(fiveMinResult, dailyResult);
    const alignmentStrength = getAlignmentStrength(fiveMinResult, dailyResult);

    // Combined score considers both alignment scores
    const combinedScore = aligned
      ? (fiveMinResult.alignmentScore + dailyResult.alignmentScore) / 2
      : 0;

    return {
      symbol,
      aligned,
      alignmentStrength,
      fiveMin: fiveMinResult,
      daily: dailyResult,
      combinedScore,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error(`Error scanning ${symbol}:`, error);
    return null;
  }
}

/**
 * GET /api/watchlist
 * Scan a list of symbols for alignment
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Get symbols from query param (comma-separated)
    const symbolsParam = searchParams.get('symbols');
    const minAlignmentScore = parseInt(searchParams.get('minScore') || '4');
    const alignedOnly = searchParams.get('alignedOnly') === 'true';

    // Default watchlist
    const defaultSymbols = [
      'SPY', 'QQQ', 'IWM', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA',
      'TSLA', 'META', 'AMD', 'NFLX', 'DIS', 'BABA', 'INTC', 'CSCO'
    ];

    const symbols = symbolsParam
      ? symbolsParam.split(',').map(s => s.trim().toUpperCase())
      : defaultSymbols;

    // Scan all symbols in parallel
    const scanPromises = symbols.map(symbol => scanSymbol(symbol));
    const scanResults = await Promise.all(scanPromises);

    // Filter out nulls and apply filters
    let results = scanResults.filter((r): r is WatchlistResult => r !== null);

    // Apply filters
    if (alignedOnly) {
      results = results.filter(r => r.aligned);
    }

    results = results.filter(r => r.combinedScore >= minAlignmentScore);

    // Sort by combined score (highest first)
    results.sort((a, b) => b.combinedScore - a.combinedScore);

    return NextResponse.json({
      status: 'success',
      data: results,
      count: results.length,
      totalScanned: symbols.length,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Watchlist API error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        data: null
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/watchlist
 * Scan custom list of symbols
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols, minScore = 4, alignedOnly = false } = body;

    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Invalid symbols array',
          data: null
        },
        { status: 400 }
      );
    }

    // Scan all symbols
    const scanPromises = symbols.map((symbol: string) =>
      scanSymbol(symbol.trim().toUpperCase())
    );
    const scanResults = await Promise.all(scanPromises);

    // Filter and sort
    let results = scanResults.filter((r): r is WatchlistResult => r !== null);

    if (alignedOnly) {
      results = results.filter(r => r.aligned);
    }

    results = results.filter(r => r.combinedScore >= minScore);
    results.sort((a, b) => b.combinedScore - a.combinedScore);

    return NextResponse.json({
      status: 'success',
      data: results,
      count: results.length,
      totalScanned: symbols.length,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Watchlist API error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        data: null
      },
      { status: 500 }
    );
  }
}
