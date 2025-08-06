'use client'

import { useState, useEffect } from 'react'

export default function Home() {
  const [currentTime, setCurrentTime] = useState('')
  const [isOnline, setIsOnline] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [mode, setMode] = useState<'screener' | 'scanner'>('scanner')
  const [scanResults, setScanResults] = useState<{[key: string]: number}>({})
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null)
  const [selectedStock, setSelectedStock] = useState<any>(null)
  const [marketStatus, setMarketStatus] = useState('closed')
  const [aiIdeas, setAiIdeas] = useState<any[]>([])
  const [showAI, setShowAI] = useState(false)
  
  // Mock real-time stock data
  const stockDatabase: {[key: string]: any[]} = {
    movers: [
      { symbol: 'NVDA', price: 875.32, change: 12.5, volume: 45000000, gamma: 0.82, iv: 0.45, gex: 2850000, dex: -1200000, score: 95 },
      { symbol: 'TSLA', price: 242.15, change: 8.3, volume: 38000000, gamma: 0.75, iv: 0.52, gex: 1950000, dex: -890000, score: 92 },
      { symbol: 'AMD', price: 142.30, change: 6.8, volume: 28000000, gamma: 0.68, iv: 0.48, gex: 1450000, dex: -650000, score: 89 },
      { symbol: 'AAPL', price: 195.82, change: 3.2, volume: 52000000, gamma: 0.45, iv: 0.28, gex: 3200000, dex: -1500000, score: 87 },
      { symbol: 'META', price: 485.20, change: 5.1, volume: 18000000, gamma: 0.62, iv: 0.38, gex: 1850000, dex: -920000, score: 85 },
    ],
    volume: [
      { symbol: 'SPY', price: 438.50, change: 0.8, volume: 95000000, gamma: 0.92, iv: 0.18, gex: 8500000, dex: -4200000, score: 98 },
      { symbol: 'QQQ', price: 365.20, change: 1.2, volume: 48000000, gamma: 0.88, iv: 0.22, gex: 5200000, dex: -2800000, score: 94 },
      { symbol: 'AAPL', price: 195.82, change: 3.2, volume: 52000000, gamma: 0.45, iv: 0.28, gex: 3200000, dex: -1500000, score: 91 },
      { symbol: 'NVDA', price: 875.32, change: 12.5, volume: 45000000, gamma: 0.82, iv: 0.45, gex: 2850000, dex: -1200000, score: 88 },
      { symbol: 'MSFT', price: 412.30, change: 2.1, volume: 22000000, gamma: 0.52, iv: 0.25, gex: 2100000, dex: -980000, score: 85 },
    ],
    caps: [
      { symbol: 'AAPL', price: 195.82, change: 3.2, volume: 52000000, gamma: 0.45, iv: 0.28, gex: 3200000, dex: -1500000, marketCap: 3000, score: 96 },
      { symbol: 'MSFT', price: 412.30, change: 2.1, volume: 22000000, gamma: 0.52, iv: 0.25, gex: 2100000, dex: -980000, marketCap: 2900, score: 94 },
      { symbol: 'GOOGL', price: 138.45, change: 1.8, volume: 28000000, gamma: 0.48, iv: 0.32, gex: 1800000, dex: -850000, marketCap: 1800, score: 92 },
      { symbol: 'AMZN', price: 178.20, change: 2.5, volume: 35000000, gamma: 0.55, iv: 0.35, gex: 2300000, dex: -1100000, marketCap: 1700, score: 90 },
    ],
    iv: [
      { symbol: 'GME', price: 22.45, change: -2.3, volume: 8000000, gamma: 0.35, iv: 1.25, gex: 450000, dex: -280000, score: 98 },
      { symbol: 'AMC', price: 4.82, change: -1.8, volume: 12000000, gamma: 0.28, iv: 1.15, gex: 320000, dex: -180000, score: 95 },
      { symbol: 'RIVN', price: 12.30, change: 1.5, volume: 15000000, gamma: 0.42, iv: 0.95, gex: 580000, dex: -320000, score: 88 },
    ],
    gamma: [
      { symbol: 'SPY', price: 438.50, change: 0.8, volume: 95000000, gamma: 0.92, iv: 0.18, gex: 8500000, dex: -4200000, pin: 440, score: 99 },
      { symbol: 'QQQ', price: 365.20, change: 1.2, volume: 48000000, gamma: 0.88, iv: 0.22, gex: 5200000, dex: -2800000, pin: 365, score: 97 },
      { symbol: 'IWM', price: 198.30, change: 1.5, volume: 32000000, gamma: 0.78, iv: 0.25, gex: 2800000, dex: -1400000, pin: 200, score: 94 },
    ],
    squeeze: [
      { symbol: 'GME', price: 22.45, change: -2.3, volume: 8000000, gamma: 0.35, iv: 1.25, gex: 450000, si: 45.2, daysToC: 2.5, score: 97 },
      { symbol: 'AMC', price: 4.82, change: -1.8, volume: 12000000, gamma: 0.28, iv: 1.15, gex: 320000, si: 38.5, daysToC: 1.8, score: 94 },
      { symbol: 'BYND', price: 6.75, change: 2.1, volume: 3500000, gamma: 0.32, iv: 0.88, gex: 280000, si: 35.8, daysToC: 3.2, score: 90 },
    ]
  }

  const gammaLevels: {[key: string]: any} = {
    'SPY': { strikes: [435, 438, 440, 442, 445], gex: [1200000, 2800000, 8500000, 2400000, 1800000] },
    'QQQ': { strikes: [360, 363, 365, 367, 370], gex: [800000, 1600000, 5200000, 1400000, 900000] },
    'NVDA': { strikes: [860, 870, 875, 880, 890], gex: [450000, 780000, 2850000, 920000, 560000] },
    'TSLA': { strikes: [235, 240, 242, 245, 250], gex: [320000, 680000, 1950000, 720000, 480000] },
  }
  
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      }))
      
      // Check market hours
      const hours = now.getHours()
      const minutes = now.getMinutes()
      const totalMinutes = hours * 60 + minutes
      const marketOpen = 9 * 60 + 30
      const marketClose = 16 * 60
      
      if (totalMinutes >= marketOpen && totalMinutes <= marketClose && now.getDay() !== 0 && now.getDay() !== 6) {
        setMarketStatus('open')
      } else if (totalMinutes < marketOpen && now.getDay() !== 0 && now.getDay() !== 6) {
        setMarketStatus('pre-market')
      } else if (totalMinutes > marketClose && totalMinutes < 20 * 60 && now.getDay() !== 0 && now.getDay() !== 6) {
        setMarketStatus('after-hours')
      } else {
        setMarketStatus('closed')
      }
    }
    
    updateTime()
    const interval = setInterval(updateTime, 1000)
    setTimeout(() => setIsOnline(true), 1000)
    
    return () => clearInterval(interval)
  }, [])

  const scanners = [
    { id: 'movers', icon: '🔥', bgColor: 'bg-orange-500/20', title: 'Top Movers', desc: 'Stocks with significant price movement' },
    { id: 'volume', icon: '📊', bgColor: 'bg-purple-500/20', title: 'High Volume', desc: 'Stocks with high trading volume' },
    { id: 'caps', icon: '📈', bgColor: 'bg-blue-500/20', title: 'Large Caps', desc: 'Large market cap stocks' },
    { id: 'iv', icon: '📉', bgColor: 'bg-red-500/20', title: 'IV Crush Play', desc: 'High IV rank for premium selling' },
    { id: 'gamma', icon: '🎯', bgColor: 'bg-green-500/20', title: 'Gamma Wall Pin', desc: 'Stocks pinned by gamma exposure' },
    { id: 'squeeze', icon: '🚀', bgColor: 'bg-yellow-500/20', title: 'Short Squeeze Setup', desc: 'High SI with positive flow' },
  ]

  const startScan = () => {
    setIsScanning(true)
    setScanResults({})
    setSelectedStrategy(null)
    
    scanners.forEach((scanner, index) => {
      setTimeout(() => {
        setScanResults(prev => ({
          ...prev,
          [scanner.id]: stockDatabase[scanner.id]?.length || 0
        }))
      }, (index + 1) * 300)
    })

    setTimeout(() => {
      setIsScanning(false)
    }, scanners.length * 300 + 500)
  }

  const scanAll = () => {
    setIsScanning(true)
    setScanResults({})
    setSelectedStrategy(null)
    
    setTimeout(() => {
      const results: {[key: string]: number} = {}
      scanners.forEach(scanner => {
        results[scanner.id] = stockDatabase[scanner.id]?.length || 0
      })
      setScanResults(results)
      setIsScanning(false)
    }, 1500)
  }

  const scanSingle = (scannerId: string) => {
    setIsScanning(true)
    setScanResults(prev => ({ ...prev, [scannerId]: 0 }))
    
    setTimeout(() => {
      setScanResults(prev => ({
        ...prev,
        [scannerId]: stockDatabase[scannerId]?.length || 0
      }))
      setIsScanning(false)
      setSelectedStrategy(scannerId)
    }, 1000)
  }

  const generateAIIdeas = (symbol: string) => {
    const stock = Object.values(stockDatabase).flat().find(s => s.symbol === symbol)
    if (!stock) return []
    
    const ideas = []
    
    if (stock.gamma > 0.7) {
      ideas.push({
        strategy: 'Bull Call Spread',
        entry: `${Math.floor(stock.price)}//${Math.floor(stock.price * 1.05)}`,
        risk: 2.5,
        reward: 7.5,
        confidence: 85,
        reason: 'High gamma exposure indicates strong directional momentum'
      })
    }
    
    if (stock.iv > 0.8) {
      ideas.push({
        strategy: 'Iron Condor',
        entry: `${Math.floor(stock.price * 0.95)}/${Math.floor(stock.price * 0.98)}/${Math.floor(stock.price * 1.02)}/${Math.floor(stock.price * 1.05)}`,
        risk: 2.0,
        reward: 3.0,
        confidence: 72,
        reason: 'Elevated IV creates premium selling opportunity'
      })
    }
    
    if (stock.gex && stock.gex > 1000000) {
      ideas.push({
        strategy: 'Put Credit Spread',
        entry: `${Math.floor(stock.price * 0.95)}/${Math.floor(stock.price * 0.93)}`,
        risk: 2.0,
        reward: 1.0,
        confidence: 78,
        reason: 'Gamma wall provides support level'
      })
    }
    
    return ideas
  }

  const showGammaLevels = (symbol: string) => {
    const levels = gammaLevels[symbol]
    if (!levels) {
      setSelectedStock({ 
        symbol, 
        message: 'Gamma levels data coming soon for this symbol' 
      })
      return
    }
    
    setSelectedStock({
      symbol,
      gammaData: levels,
      currentPrice: stockDatabase.gamma?.find(s => s.symbol === symbol)?.price || 
                    stockDatabase.movers?.find(s => s.symbol === symbol)?.price
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0F1A] to-[#1A1A2E] text-white">
      <div className="container mx-auto px-4 py-6">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
            <div>
              <h1 className="text-3xl font-bold">Gamma Flow Pro</h1>
              <p className="text-sm text-gray-400">Advanced Options Analytics</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${
                isScanning ? 'bg-yellow-500 animate-pulse' : 
                marketStatus === 'open' ? 'bg-green-500' : 
                marketStatus === 'pre-market' || marketStatus === 'after-hours' ? 'bg-yellow-500' :
                'bg-red-500'
              }`}></span>
              <span className="text-gray-400">
                {isScanning ? 'Scanning...' : 
                 marketStatus === 'open' ? 'Market Open' :
                 marketStatus === 'pre-market' ? 'Pre-Market' :
                 marketStatus === 'after-hours' ? 'After Hours' :
                 'Market Closed'}
              </span>
            </div>
            <div className="text-gray-400">
              Updated: {currentTime || '--:--:--'}
            </div>
          </div>
        </header>

        <p className="text-gray-400 mb-6">Real-time gamma exposure, options flow, and dark pool analysis</p>

        <div className="flex flex-wrap gap-4 mb-8">
          <button 
            onClick={() => {
              setMode('screener')
              setScanResults({})
              setSelectedStrategy(null)
            }}
            className={`px-6 py-3 rounded-lg flex items-center space-x-2 transition ${
              mode === 'screener' 
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/25' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
            </svg>
            <span>Screener Mode</span>
          </button>
          <button 
            onClick={() => {
              setMode('scanner')
              setScanResults({})
              setSelectedStrategy(null)
            }}
            className={`px-6 py-3 rounded-lg flex items-center space-x-2 transition ${
              mode === 'scanner' 
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/25' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <span>Scanner Mode</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-4 mb-8 justify-between">
          <button 
            onClick={startScan}
            disabled={isScanning}
            className={`px-8 py-3 rounded-lg flex items-center space-x-2 text-white font-semibold transition ${
              isScanning 
                ? 'bg-gray-600 cursor-not-allowed' 
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40'
            }`}
          >
            {isScanning ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
                </svg>
                <span>Start Scan</span>
              </>
            )}
          </button>

          <div className="flex gap-4">
            <button 
              onClick={() => setShowAI(!showAI)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg flex items-center space-x-2 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
              <span>AI Trade Ideas</span>
            </button>
            <button 
              onClick={scanAll}
              disabled={isScanning}
              className={`px-6 py-3 rounded-lg flex items-center space-x-2 text-white transition ${
                isScanning 
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/25'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>Scan All Strategies</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scanners.map((scanner) => (
            <div 
              key={scanner.id} 
              onClick={() => !isScanning && scanSingle(scanner.id)}
              className={`bg-[#1A1A2E]/80 backdrop-blur-lg border border-purple-500/20 rounded-xl p-6 transition-all ${
                isScanning ? 'cursor-wait' : 'cursor-pointer hover:border-purple-500/50 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 ${scanner.bgColor} rounded-lg flex items-center justify-center`}>
                    <span className="text-2xl">{scanner.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{scanner.title}</h3>
                    <p className="text-sm text-gray-400">{scanner.desc}</p>
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  className="text-gray-400 hover:text-white transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </button>
              </div>
              <div className="text-3xl font-bold mb-2">
                {scanResults[scanner.id] !== undefined ? (
                  <span className="text-green-400">{scanResults[scanner.id]}</span>
                ) : (
                  '0'
                )}
              </div>
              <div className="text-sm text-gray-400">stocks found</div>
              {scanResults[scanner.id] > 0 && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedStrategy(scanner.id)
                  }}
                  className="mt-3 text-sm text-purple-400 hover:text-purple-300 transition"
                >
                  View Results →
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Results Table */}
        {selectedStrategy && (
          <div className="mt-8 bg-[#1A1A2E]/80 backdrop-blur-lg border border-purple-500/20 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                {scanners.find(s => s.id === selectedStrategy)?.title} Results
              </h3>
              <button 
                onClick={() => setSelectedStrategy(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2">Symbol</th>
                    <th className="text-right py-2">Price</th>
                    <th className="text-right py-2">Change %</th>
                    <th className="text-right py-2">Volume</th>
                    <th className="text-right py-2">Gamma</th>
                    <th className="text-right py-2">IV</th>
                    <th className="text-right py-2 cursor-pointer hover:text-purple-400" title="Click for gamma levels">GEX</th>
                    <th className="text-right py-2">Score</th>
                    <th className="text-center py-2">AI Ideas</th>
                  </tr>
                </thead>
                <tbody>
                  {stockDatabase[selectedStrategy]?.map((stock, idx) => (
                    <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="py-3 font-semibold">{stock.symbol}</td>
                      <td className="text-right">${stock.price.toFixed(2)}</td>
                      <td className={`text-right ${stock.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {stock.change > 0 ? '+' : ''}{stock.change}%
                      </td>
                      <td className="text-right">{(stock.volume / 1000000).toFixed(1)}M</td>
                      <td className="text-right">{stock.gamma.toFixed(2)}</td>
                      <td className="text-right">{stock.iv.toFixed(2)}</td>
                      <td 
                        className="text-right cursor-pointer hover:text-purple-400"
                        onClick={() => showGammaLevels(stock.symbol)}
                      >
                        {stock.gex ? (stock.gex / 1000000).toFixed(1) + 'M' : '-'}
                      </td>
                      <td className="text-right">
                        <span className={`px-2 py-1 rounded text-xs ${
                          stock.score >= 90 ? 'bg-green-500/20 text-green-400' :
                          stock.score >= 85 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {stock.score}
                        </span>
                      </td>
                      <td className="text-center">
                        <button 
                          onClick={() => {
                            const ideas = generateAIIdeas(stock.symbol)
                            setAiIdeas(ideas)
                            setSelectedStock({ ...stock, aiIdeas: ideas })
                          }}
                          className="text-purple-400 hover:text-purple-300 text-xs"
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Gamma Levels Display */}
        {selectedStock?.gammaData && (
          <div className="mt-4 bg-[#1A1A2E]/80 backdrop-blur-lg border border-green-500/20 rounded-xl p-6">
            <h4 className="text-lg font-bold mb-4">
              {selectedStock.symbol} Gamma Levels (Current: ${selectedStock.currentPrice?.toFixed(2)})
            </h4>
            <div className="grid grid-cols-5 gap-4">
              {selectedStock.gammaData.strikes.map((strike: number, idx: number) => (
                <div 
                  key={idx} 
                  className={`text-center p-3 rounded-lg ${
                    Math.abs(strike - selectedStock.currentPrice) < 2 
                      ? 'bg-purple-500/20 border border-purple-500' 
                      : 'bg-gray-800/50'
                  }`}
                >
                  <div className="text-sm text-gray-400">Strike ${strike}</div>
                  <div className="text-lg font-bold text-green-400">
                    {(selectedStock.gammaData.gex[idx] / 1000000).toFixed(1)}M
                  </div>
                  <div className="text-xs text-gray-500">GEX</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Trade Ideas for Selected Stock */}
        {selectedStock?.aiIdeas && selectedStock.aiIdeas.length > 0 && (
          <div className="mt-4 bg-[#1A1A2E]/80 backdrop-blur-lg border border-purple-500/20 rounded-xl p-6">
            <h4 className="text-lg font-bold mb-4">
              🤖 AI Trade Ideas for {selectedStock.symbol}
            </h4>
            <div className="space-y-3">
              {selectedStock.aiIdeas.map((idea: any, idx: number) => (
                <div key={idx} className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-semibold text-purple-400">{idea.strategy}</span>
                      <div className="text-sm text-gray-400 mt-1">{idea.reason}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-400">{idea.confidence}%</div>
                      <div className="text-xs text-gray-400">Confidence</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 mt-3 text-sm">
                    <div>
                      <span className="text-gray-400">Entry:</span>
                      <div className="font-semibold">{idea.entry}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Risk:</span>
                      <div className="font-semibold text-red-400">${idea.risk}k</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Reward:</span>
                      <div className="font-semibold text-green-400">${idea.reward}k</div>
                    </div>
                    <div>
                      <span className="text-gray-400">R:R:</span>
                      <div className="font-semibold">1:{(idea.reward/idea.risk).toFixed(1)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
