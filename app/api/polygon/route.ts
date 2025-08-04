import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  const symbol = searchParams.get('symbol');
  
  try {
    let url = '';
    
    switch(endpoint) {
      case 'quote':
        url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev`;
        break;
      case 'snapshot':
        url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}`;
        break;
      case 'market-status':
        url = 'https://api.polygon.io/v1/marketstatus/now';
        break;
      default:
        throw new Error('Invalid endpoint');
    }
    
    const response = await fetch(`${url}?apiKey=${process.env.POLYGON_API_KEY}`);
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch from Polygon' },
      { status: 500 }
    );
  }
}