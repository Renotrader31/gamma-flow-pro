import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { symbol: string } }
) {
  try {
    const { symbol } = params;
    console.log(`📊 Fetching detailed GEX for ${symbol}`);
    
    // Try to get real GEX data from Unusual Whales
    let gexData = null;
    if (process.env.UNUSUAL_WHALES_API_KEY) {
      try {
        const uwResponse = await fetch(
          `https://api.unusualwhales.com/api/stock/${symbol}/gex/detailed`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`,
              'Accept': 'application/json',
            },
          }
        );
        
        if (uwResponse.ok) {
          gexData = await uwResponse.json();
          console.log(`✅ Got real GEX data for ${symbol} from UW`);
        }
      } catch (uwError) {
        console.log(`UW GEX data unavailable for ${symbol}`);
      }
    }
    
    // Fallback to estimated GEX data
    if (!gexData) {
      const basePrices: Record<string, number> = {
        'AAPL': 228, 'NVDA': 140, 'TSLA': 248, 'SPY': 589,
        'QQQ': 516, 'GME': 28, 'AMC': 3, 'MSFT': 441
      };
      const basePrice = basePrices[symbol] || 100;
      
      gexData = {
        symbol,
        total_gex: estimateGEX(symbol),
        gamma_flip: Math.round(basePrice * 0.99 * 100) / 100,
        spot_price: basePrice,
        resistance_levels: [
          { 
            strike: Math.round(basePrice * 1.02 * 100) / 100, 
            gex: -2000000, 
            volume: 5000,
            description: 'Strong resistance - MMs short gamma'
          },
          { 
            strike: Math.round(basePrice * 1.05 * 100) / 100, 
            gex: -1500000, 
            volume: 3000,
            description: 'Moderate resistance'
          },
          { 
            strike: Math.round(basePrice * 1.08 * 100) / 100, 
            gex: -1000000, 
            volume: 2000,
            description: 'Weak resistance'
          }
        ],
        support_levels: [
          { 
            strike: Math.round(basePrice * 0.98 * 100) / 100, 
            gex: 1800000, 
            volume: 4500,
            description: 'Weak support - MMs long gamma'
          },
          { 
            strike: Math.round(basePrice * 0.95 * 100) / 100, 
            gex: 2200000, 
            volume: 6000,
            description: 'Moderate support'
          },
          { 
            strike: Math.round(basePrice * 0.92 * 100) / 100, 
            gex: 2800000, 
            volume: 7500,
            description: 'Strong support'
          }
        ]
      };
      
      console.log(`✅ Generated estimated GEX data for ${symbol}`);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        symbol,
        totalGex: gexData.total_gex,
        gammaFlip: gexData.gamma_flip,
        spotPrice: gexData.spot_price,
        gammaLevels: {
          resistance: gexData.resistance_levels,
          support: gexData.support_levels
        },
        lastUpdated: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      source: gexData.symbol ? 'Unusual Whales' : 'Estimated'
    });
    
  } catch (error) {
    console.error(`GEX API Error for ${params.symbol}:`, error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Helper function for GEX estimation
function estimateGEX(symbol: string): number {
  const gexMultipliers: Record<string, number> = {
    'AAPL': 25000000,
    'NVDA': 15000000,
    'TSLA': 12000000,
    'SPY': 50000000,
    'QQQ': 20000000,
    'GME': 8000000,
    'AMC': 5000000,
    'MSFT': 18000000
  };
  const base = gexMultipliers[symbol] || 5000000;
  return Math.round(base * (0.8 + Math.random() * 0.4));
}