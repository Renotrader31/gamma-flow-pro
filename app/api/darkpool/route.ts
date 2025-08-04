import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  
  try {
    const response = await fetch(
      `https://api.unusualwhales.com/api/darkpool/${symbol}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`,
          'Accept': 'application/json',
        },
      }
    );

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch dark pool data' },
      { status: 500 }
    );
  }
}