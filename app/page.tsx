'use client'

import { useState, useEffect } from 'react'

export default function Home() {
  const [currentTime, setCurrentTime] = useState('')
  const [isOnline, setIsOnline] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [mode, setMode] = useState<'screener' | 'scanner'>('scanner')
  const [scanResults, setScanResults] = useState<{[key: string]: number}>({})
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [marketStatus, setMarketStatus] = useState('closed')
  const [aiIdeas, setAiIdeas] = useState<any[]>([])
  const [showAI, setShowAI] = useState(false)
  
  // Mock real-time stock data
  const stockDatabase: {[key: string]: any[]} = {
    movers: [
      { symbol: 'NVDA', price: 875.32, change: 12.5, volume: 45000000, gamma: 0.82, iv: 0.45, score: 95 },
      { symbol: 'TSLA', price: 242.15, change: 8.3, volume: 38000000, gamma: 0.75, iv: 0.52, score: 92 },
      { symbol: 'AMD', price: 142.30, change: 6.8, volume: 28000000, gamma: 0.68, iv: 0.48, score: 89 },
      { symbol: 'AAPL', price: 195.82, change: 3.2, volume: 52000000, gamma: 0.45, iv: 0.28, score: 87 },
      { symbol: 'META', price: 485.20, change: 5.1, volume: 18000000, gamma: 0.62, iv: 0.38, score: 85 },
    ],
    volume: [
      { symbol: 'SPY', price: 438.50, change: 0.8, volume: 95000000, gamma: 0.92, iv: 0.18, score: 98 },
      { symbol: 'QQQ', price: 365.20, change: 1.2, volume: 48000000, gamma: 0.88, iv: 0.22, score: 94 },
      { symbol: 'AAPL', price: 195.82, change: 3.2, volume: 52000000, gamma: 0.45, iv: 0.28, score: 91 },
      { symbol: 'NVDA', price: 875.32, change: 12.5, volume: 45000000, gamma: 0.82, iv: 0.45, score: 88 },
      { symbol: 'MSFT', price: 412.30, change: 2.1, volume: 22000000, gamma: 0.52, iv: 0.25, score: 85 },
    ],
    caps: [
      { symbol: 'AAPL', price: 195.82, change: 3.2, volume: 52000000, gamma: 0.45, iv: 0.28, marketCap: 3000, score: 96 },
      { symbol: 'MSFT', price: 412.30, change: 2.1, volume: 22000000, gamma: 0.52, iv: 0.25, marketCap: 2900, score: 94 },
      { symbol: 'GOOGL', price: 138.45, change: 1.8, volume: 28000000, gamma: 0.48, iv: 0.32, marketCap: 1800, score: 92 },
      { symbol: 'AMZN', price: 178.20, change: 2.5, volume: 35000000, gamma: 0.55, iv: 0.35, marketCap: 1700, score: 90 },
    ],
    iv: [
      { symbol: 'GME', price: 22.45, change: -2.3, volume: 8000000, gamma: 0.35, iv: 1.25, score: 98 },
      { symbol: 'AMC', price: 4.82, change: -1.8, volume: 12000000, gamma: 0.28, iv: 1.15, score: 95 },
      { symbol: 'RIVN', price: 12.30, change: 1.5, volume: 15000000, gamma: 0.42, iv: 0.95, score: 88 },
    ],
    gamma: [
      { symbol: 'SPY', price: 438.50, change: 0.8, volume: 95000000, gamma: 0.92, pin: 440, score: 99 },
      { symbol: 'QQQ', price: 365.20, change: 1.2, volume: 48000000, gamma: 0.88, pin: 365, score: 97 },
      { symbol: 'IWM', price: 198.30, change: 1.5, volume: 32000000, gamma: 0.78, pin: 200, score: 94 },
    ],
    squeeze: [
      { symbol: 'GME', price: 22.45, change: -2.3, volume: 8000000, si: 45.2, daysToC: 2.5, score: 97 },
      { symbol: 'AMC', price: 4.82, change: -1.8, volume: 12000000, si: 38.5, daysToC: 1.8, score: 94 },
      { symbol: 'BYND', price: 6.75, change: 2.1, volume: 3500000, si: 35.8, daysToC: 3.2, score: 90 },
    ]
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
      generateAIIdeas()
    }, scanners.length * 300 + 500)
  }

  const scanAll = () => {
    setIsScanning(true)
    setScanResults({})
    
    setTimeout(() => {
      const results: {[key: string]: number} = {}
      scanners.forEach(scanner => {
        results[scanner.id] = stockDatabase[scanner.id]?.length || 0
      })
      setScanResults(results)
      setIsScanning(false)
      generateAIIdeas()
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
    }, 1000)
  }

  const generateAIIdeas = () => {
    const ideas = [
      { 
        symbol: 'NVDA', 
        strategy: 'Bull Call Spread', 
        entry: '880/900', 
        risk: 2.5, 
        reward: 7.5, 
        confidence: 85,
        reason: 'Strong gamma wall support at 880, bullish flow detected'
      },
      { 
        symbol: 'SPY', 
        strategy: 'Iron Condor', 
        entry: '435/440/445/450', 
        risk: 1.8, 
        reward: 3.2, 
        confidence: 78,
        reason: 'Pinned between gamma walls, low IV environment'
      },
      { 
        symbol: 'GME', 
        strategy: 'Put Credit Spread', 
        entry: '20/22.5', 
        risk: 2.5, 
        reward: 1.5, 
        confidence: 72,
        reason: 'High IV rank, support at 20 strike'
      },
    ]
    setAiIdeas(ideas)
  }

  const showStrategyResults = (strategyId: string) => {
    const stocks = stockDatabase[strategyId] || []
    const scanner = scanners.find(s => s.id === strategyId)
    
    let resultText = `📊 ${scanner?.title} Results\n\n`
    resultText += `Found ${stocks.length} stocks:\n\n`
    
    stocks.forEach((stock, idx) => {
      resultText += `${idx + 1}. ${stock.symbol}\n`
      resultText += `   Price: $${stock.price.toFixed(2)} (${stock.change > 0 ? '+' : ''}${stock.change}%)\n`
      resultText += `   Volume: ${(stock.volume / 1000000).toFixed(1)}M\n`
      resultText += `   Gamma: ${stock.gamma.toFixed(2)} | IV: ${stock.iv.toFixed(2)}\n`
      resultText += `   Score: ${stock.score}/100\n\n`
    })
    
    alert(resultText)
  }

  const showAIIdeas = () => {
    generateAIIdeas()
    let aiText = '🤖 AI Trade Ideas\n\n'
    
    aiIdeas.forEach((idea, idx) => {
      aiText += `${idx + 1}. ${idea.symbol} - ${idea.strategy}\n`
      aiText += `   Entry: ${idea.entry}\n`
      aiText += `   Risk: $${idea.risk}k | Reward: $${idea.reward}k\n`
      aiText += `   R:R Ratio: 1:${(idea.reward/idea.risk).toFixed(1)}\n`
      aiText += `   Confidence: ${idea.confidence}%\n`
      aiText += `   ${idea.reason}\n\n`
    })
    
    alert(aiText)
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
              onClick={showAIIdeas}
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
                    alert(`ℹ️ ${scanner.title}\n\n${scanner.desc}\n\nThis scanner analyzes:\n• Technical patterns\n• Volume anomalies\n• Options flow\n• Risk/reward setups`)
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
                    showStrategyResults(scanner.id)
                  }}
                  className="mt-3 text-sm text-purple-400 hover:text-purple-300 transition"
                >
                  View Results →
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
