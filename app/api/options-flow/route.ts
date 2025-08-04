import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('📈 Fetching options flow data...');
    
    let flowData = [];
    
    // Try Unusual Whales first
    if (process.env.UNUSUAL_WHALES_API_KEY) {
      try {
        const uwResponse = await fetch(
          'https://api.unusualwhales.com/api/options/flow?limit=50',
          {
            headers: {
              'Authorization': `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`,
              'Accept': 'application/json',
            },
          }
        );
        
        if (uwResponse.ok) {
          const uwData = await uwResponse.json();
          flowData = uwData.results?.map((trade: any, index: number) => ({
            id: trade.id || `uw_${index}`,
            timestamp: trade.timestamp || new Date().toISOString(),
            symbol: trade.symbol,
            type: trade.option_type,
            strike: trade.strike_price,
            expiry: trade.expiration_date,
            premium: trade.premium_paid,
            volume: trade.volume,
            openInterest: trade.open_interest,
            side: trade.side,
            size: trade.trade_size,
            sentiment: trade.sentiment || 'neutral',
            price: trade.underlying_price,
            iv: trade.implied_volatility
          })) || [];
          
          console.log(`✅ Got ${flowData.length} real options trades from UW`);
        }
      } catch (uwError) {
        console.log('UW options flow unavailable, using mock data');
      }
    }
    
    // Fallback to realistic mock data
    if (flowData.length === 0) {
      const symbols = ['AAPL', 'NVDA', 'TSLA', 'SPY', 'QQQ', 'GME'];
      const types = ['call', 'put'];
      const sides = ['buy', 'sell'];
      const sizes = ['small', 'large', 'sweep'];
      const sentiments = ['bullish', 'bearish', 'neutral'];
      
      flowData = Array.from({ length: 40 }, (_, i) => {
        const symbol = symbols[Math.floor(Math.random() * symbols.length)];
        const basePrice = symbol === 'AAPL' ? 228 : symbol === 'NVDA' ? 140 : symbol === 'SPY' ? 589 : 100;
        
        return {
          id: `mock_${i}`,
          timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
          symbol,
          type: types[Math.floor(Math.random() * types.length)],
          strike: Math.round(basePrice + (Math.random() - 0.5) * 20),
          expiry: new Date(Date.now() + Math.random() * 30 * 24 * 3600000).toISOString().split('T')[0],
          premium: Math.round(Math.random() * 100000 + 1000),
          volume: Math.floor(Math.random() * 5000) + 100,
          openInterest: Math.floor(Math.random() * 10000),
          side: sides[Math.floor(Math.random() * sides.length)],
          size: sizes[Math.floor(Math.random() * sizes.length)],
          sentiment: sentiments[Math.floor(Math.random() * sentiments.length)],
          price: Math.round((basePrice + (Math.random() - 0.5) * 10) * 100) / 100,
          iv: Math.round((20 + Math.random() * 60) * 100) / 100
        };
      });
      
      console.log(`✅ Generated ${flowData.length} mock options trades`);
    }
    
    return NextResponse.json({
      success: true,
      data: flowData,
      timestamp: new Date().toISOString(),
      source: flowData[0]?.id?.startsWith('uw_') ? 'Unusual Whales' : 'Mock Data'
    });
    
  } catch (error) {
    console.error('Options Flow API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}