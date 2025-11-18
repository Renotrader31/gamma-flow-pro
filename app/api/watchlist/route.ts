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

/**
 * Fetch candle data from Polygon.io API
 */
async function fetchPolygonCandles(
  symbol: string,
  multiplier: number,
  timespan: 'minute' | 'day',
  limit: number = 500
): Promise<CandleData[]> {
  // Hardcoded API key (use environment variable in production for security)
  const apiKey = process.env.POLYGON_API_KEY || '75rlu6cWGNnIqqR_x8M384YUjBgGk6kT';

  if (!apiKey) {
    console.warn('POLYGON_API_KEY not found, using mock data');
    return generateMockCandles(symbol, limit, timespan === 'minute' ? '5m' : '1d');
  }

  try {
    // Calculate date range (500 periods back)
    const to = new Date();
    const from = new Date();

    if (timespan === 'minute') {
      // 500 * 5 minutes = 2500 minutes = ~42 hours = ~2 trading days
      from.setDate(from.getDate() - 5); // Get 5 days to ensure we have enough data
    } else {
      // 500 days = ~1.4 years
      from.setFullYear(from.getFullYear() - 2); // Get 2 years to ensure enough data
    }

    const fromStr = from.toISOString().split('T')[0];
    const toStr = to.toISOString().split('T')[0];

    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${fromStr}/${toStr}?adjusted=true&sort=asc&limit=50000&apiKey=${apiKey}`;

    console.log(`Fetching ${symbol} ${multiplier}${timespan} data from Polygon...`);

    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      console.log(`✓ Got ${data.results.length} candles for ${symbol}`);

      // Convert Polygon format to our CandleData format
      const candles: CandleData[] = data.results.map((bar: any) => ({
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        volume: bar.v,
        timestamp: bar.t // Polygon already provides timestamp in milliseconds
      }));

      // Return the most recent 'limit' candles
      return candles.slice(-limit);
    } else {
      console.warn(`No data from Polygon for ${symbol}, using mock data`);
      return generateMockCandles(symbol, limit, timespan === 'minute' ? '5m' : '1d');
    }
  } catch (error) {
    console.error(`Error fetching ${symbol} from Polygon:`, error);
    return generateMockCandles(symbol, limit, timespan === 'minute' ? '5m' : '1d');
  }
}

/**
 * Mock data generator (fallback when API unavailable)
 */
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

/**
 * Fetch BFCI component data from Polygon
 */
async function fetchBFCIData(): Promise<{
  spy: CandleData[];
  hyg: CandleData[];
  lqd: CandleData[];
  vix: CandleData[];
  dxy: CandleData[];
}> {
  console.log('Fetching BFCI component data...');

  const [spy, hyg, lqd, vix, dxy] = await Promise.all([
    fetchPolygonCandles('SPY', 1, 'day', 500),
    fetchPolygonCandles('HYG', 1, 'day', 500),
    fetchPolygonCandles('LQD', 1, 'day', 500),
    fetchPolygonCandles('VIX', 1, 'day', 500),
    fetchPolygonCandles('DXY', 1, 'day', 500)
  ]);

  return { spy, hyg, lqd, vix, dxy };
}

/**
 * Fetch market data for a symbol using Polygon.io API
 */
async function fetchMarketData(
  symbol: string,
  interval: '5m' | '1d'
): Promise<MarketData> {
  console.log(`Fetching ${symbol} ${interval} data...`);

  // Fetch candles based on interval
  const candles = interval === '5m'
    ? await fetchPolygonCandles(symbol, 5, 'minute', 500)
    : await fetchPolygonCandles(symbol, 1, 'day', 500);

  return {
    symbol,
    candles
  };
}

/**
 * Scan a single symbol for alignment
 */
async function scanSymbol(
  symbol: string,
  bfciData: {
    spy: CandleData[];
    hyg: CandleData[];
    lqd: CandleData[];
    vix: CandleData[];
    dxy: CandleData[];
  }
): Promise<WatchlistResult | null> {
  try {
    // Fetch data for both timeframes
    const [fiveMinData, dailyData] = await Promise.all([
      fetchMarketData(symbol, '5m'),
      fetchMarketData(symbol, '1d')
    ]);

    // Add BFCI data to both
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

    // Fetch BFCI data once (shared across all symbols)
    console.log('Fetching BFCI data for all symbols...');
    const bfciData = await fetchBFCIData();

    // Scan all symbols in parallel
    const scanPromises = symbols.map(symbol => scanSymbol(symbol, bfciData));
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

    // Fetch BFCI data once (shared across all symbols)
    console.log('Fetching BFCI data for all symbols...');
    const bfciData = await fetchBFCIData();

    // Scan all symbols
    const scanPromises = symbols.map((symbol: string) =>
      scanSymbol(symbol.trim().toUpperCase(), bfciData)
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
