import { NextResponse } from 'next/server'

export async function GET() {
  // Simulate some dynamic data
  const mockStocks = [
    {
      symbol: 'SPY',
      price: 445.20 + (Math.random() - 0.5) * 2,
      change: (Math.random() - 0.5) * 5,
      gex: Math.floor(Math.random() * 5000000) + 20000000,
      volume: Math.floor(Math.random() * 10000000) + 80000000,
      flowScore: Math.floor(Math.random() * 30) + 70,
      lastUpdate: new Date().toISOString()
    },
    {
      symbol: 'AAPL',
      price: 178.50 + (Math.random() - 0.5) * 3,
      change: (Math.random() - 0.5) * 4,
      gex: Math.floor(Math.random() * 3000000) + 2000000,
      volume: Math.floor(Math.random() * 10000000) + 50000000,
      flowScore: Math.floor(Math.random() * 20) + 80,
      lastUpdate: new Date().toISOString()
    },
    {
      symbol: 'NVDA',
      price: 485.30 + (Math.random() - 0.5) * 5,
      change: (Math.random() - 0.5) * 6,
      gex: Math.floor(Math.random() * 4000000) + 5000000,
      volume: Math.floor(Math.random() * 8000000) + 40000000,
      flowScore: Math.floor(Math.random() * 25) + 75,
      lastUpdate: new Date().toISOString()
    }
  ]
  
  return NextResponse.json({
    stocks: mockStocks,
    timestamp: new Date().toISOString(),
    market: {
      isOpen: new Date().getHours() >= 9 && new Date().getHours() < 16,
      session: 'regular'
    }
  })
}