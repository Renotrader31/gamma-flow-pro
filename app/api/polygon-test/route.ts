/**
 * Polygon API Test Endpoint
 * GET /api/polygon-test
 *
 * This endpoint tests the Polygon API and returns detailed logs
 * to help debug why real data isn't being fetched.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const logs: string[] = [];
  const apiKey = process.env.POLYGON_API_KEY || '75rlu6cWGNnIqqR_x8M384YUjBgGk6kT';

  logs.push('🧪 Polygon API Test Starting...');
  logs.push('');

  // Check API key
  logs.push('📋 Step 1: Check API Key');
  if (apiKey) {
    logs.push(`✅ API Key found: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
  } else {
    logs.push('❌ No API key found!');
    return NextResponse.json({ logs, success: false });
  }
  logs.push('');

  // Test fetching AAPL daily data
  logs.push('📋 Step 2: Test Fetch AAPL Daily Data');

  const to = new Date().toISOString().split('T')[0];
  const from = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const url = `https://api.polygon.io/v2/aggs/ticker/AAPL/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=10&apiKey=${apiKey}`;

  logs.push(`URL: ${url.replace(apiKey, 'API_KEY_HIDDEN')}`);
  logs.push('');

  try {
    logs.push('⏳ Sending request to Polygon...');
    const response = await fetch(url);

    logs.push(`📥 Response status: ${response.status} ${response.statusText}`);

    const data = await response.json();
    logs.push('');
    logs.push('📋 Step 3: Parse Response');
    logs.push(`Response status field: ${data.status}`);
    logs.push(`Results count: ${data.results ? data.results.length : 0}`);

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      logs.push('');
      logs.push('✅ SUCCESS! Polygon API is working!');
      logs.push('');
      logs.push('📊 Sample Data (last 3 candles):');

      const last3 = data.results.slice(-3);
      last3.forEach((candle: any, i: number) => {
        const date = new Date(candle.t).toISOString().split('T')[0];
        logs.push(`  ${i + 1}. Date: ${date}, Close: $${candle.c.toFixed(2)}, Volume: ${candle.v.toLocaleString()}`);
      });

      logs.push('');
      logs.push(`🎯 Latest AAPL Price: $${last3[last3.length - 1].c.toFixed(2)}`);
      logs.push('');
      logs.push('✅ Polygon API is working correctly!');
      logs.push('⚠️  If watchlist scanner shows different prices, the issue is elsewhere.');

      return NextResponse.json({
        logs,
        success: true,
        latestPrice: last3[last3.length - 1].c,
        sampleData: last3
      });

    } else {
      logs.push('');
      logs.push('❌ FAILED! Polygon returned an error or no data');
      logs.push('');
      logs.push('Full Response:');
      logs.push(JSON.stringify(data, null, 2));

      if (data.error) {
        logs.push('');
        logs.push(`❌ Error: ${data.error}`);
      }

      if (data.message) {
        logs.push(`❌ Message: ${data.message}`);
      }

      return NextResponse.json({
        logs,
        success: false,
        error: data.error || data.message || 'Unknown error',
        fullResponse: data
      });
    }

  } catch (error) {
    logs.push('');
    logs.push('❌ EXCEPTION occurred while fetching from Polygon!');
    logs.push('');
    logs.push(`Error: ${error instanceof Error ? error.message : String(error)}`);

    if (error instanceof Error && error.stack) {
      logs.push('');
      logs.push('Stack trace:');
      logs.push(error.stack);
    }

    return NextResponse.json({
      logs,
      success: false,
      exception: error instanceof Error ? error.message : String(error)
    });
  }
}
