'use client'

import React, { useState, useEffect } from 'react'
import { 
  Search, Filter, TrendingUp, TrendingDown, 
  Activity, BarChart3, Zap, Clock,
  ChevronUp, ChevronDown, ArrowUpRight, ArrowDownRight,
  Flame, Settings, Sparkles, Target, Users, Gauge,
  Radio, PlayCircle, RefreshCw, Download, Save,
  Eye, Moon, Shield, AlertTriangle, Layers,
  DollarSign, Percent, Hash, Timer,
  X, Brain
} from 'lucide-react'

// Helper functions
const formatNumber = (num: any) => {
  if (!num && num !== 0) return 'N/A'
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`
  return `$${num.toFixed(2)}`
}

const formatVolume = (num: any) => {
  if (!num && num !== 0) return 'N/A'
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`
  return num.toString()
}

const getRiskColor = (confidence: number) => {
  if (confidence >= 85) return 'text-green-400 bg-green-900/20'
  if (confidence >= 70) return 'text-yellow-400 bg-yellow-900/20'
  return 'text-red-400 bg-red-900/20'
}

// AI Trade Ideas Component (inline)
const AITradeIdeasSection = ({ stock }: { stock: any }) => {
  const [ideas, setIdeas] = useState<any[]>([])
  
  useEffect(() => {
    if (stock) {
      generateIdeasForStock(stock)
    }
  }, [stock])
  
  const generateIdeasForStock = (stockData: any) => {
    const newIdeas = []
    
    if (stockData.flowScore > 80) {
      newIdeas.push({
        type: 'Long Call Spread',
        confidence: Math.min(95, stockData.flowScore + 10),
        entry: `Buy ${Math.round(stockData.price * 1.02)}C / Sell ${Math.round(stockData.price * 1.08)}C`,
        riskReward: '1:3.5',
        timeframe: '2-3 weeks',
        maxProfit: Math.round(stockData.price * 0.06 * 100),
        maxLoss: Math.round(stockData.price * 0.02 * 100),
        reasoning: 'High options flow detected with bullish sentiment'
      })
    }
    
    if (stockData.ivRank > 70) {
      newIdeas.push({
        type: 'Iron Condor',
        confidence: Math.min(85, stockData.ivRank),
        entry: `${Math.round(stockData.price * 0.95)}P/${Math.round(stockData.price * 0.97)}P - ${Math.round(stockData.price * 1.03)}C/${Math.round(stockData.price * 1.05)}C`,
        riskReward: '1:2.5',
        timeframe: '30 days',
        maxProfit: Math.round(stockData.price * 0.015 * 100),
        maxLoss: Math.round(stockData.price * 0.006 * 100),
        reasoning: 'Elevated IV creates premium selling opportunity'
      })
    }
    
    if (stockData.putCallRatio < 0.7 && stockData.netPremium > 0) {
      newIdeas.push({
        type: 'Bull Put Spread',
        confidence: 78,
        entry: `Sell ${Math.round(stockData.price * 0.95)}P / Buy ${Math.round(stockData.price * 0.92)}P`,
        riskReward: '1:1.5',
        timeframe: '2 weeks',
        maxProfit: Math.round(stockData.price * 0.01 * 100),
        maxLoss: Math.round(stockData.price * 0.02 * 100),
        reasoning: 'Bullish flow with support at key levels'
      })
    }
    
    setIdeas(newIdeas)
  }
  
  if (!stock || ideas.length === 0) return null
  
  return (
    <div className="mt-4 bg-gray-800/50 rounded-lg p-4">
      <h4 className="text-lg font-bold mb-3 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-purple-400" />
        AI Trade Ideas for {stock.symbol}
      </h4>
      <div className="space-y-3">
        {ideas.map((idea, idx) => (
          <div key={idx} className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="font-semibold text-purple-400">{idea.type}</span>
                <span className="ml-2 text-sm text-gray-400">• {idea.timeframe}</span>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(idea.confidence)}`}>
                {idea.confidence}% Confidence
              </span>
            </div>
            <div className="text-sm text-gray-300 mb-2">{idea.entry}</div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Risk/Reward</span>
                <div className="font-medium">{idea.riskReward}</div>
              </div>
              <div>
                <span className="text-gray-500">Max Profit</span>
                <div className="font-medium text-green-400">${idea.maxProfit}</div>
              </div>
              <div>
                <span className="text-gray-500">Max Loss</span>
                <div className="font-medium text-red-400">${idea.maxLoss}</div>
              </div>
              <div>
                <span className="text-gray-500">Reason</span>
                <div className="font-medium text-purple-400" title={idea.reasoning}>View</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// GEX Details Component (inline)
const GEXDetailsSection = ({ stock }: { stock: any }) => {
  if (!stock || !stock.gammaLevels) return null
  
  return (
    <div className="mt-4 bg-gray-800/50 rounded-lg p-4">
      <h4 className="text-lg font-bold mb-3 flex items-center gap-2">
        <Activity className="w-5 h-5 text-green-400" />
        Gamma Exposure Analysis - {stock.symbol}
      </h4>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-900/50 p-3 rounded">
          <div className="text-sm text-gray-400 mb-1">Total GEX</div>
          <div className="text-2xl font-bold text-purple-400">{formatNumber(stock.gex)}</div>
        </div>
        <div className="bg-gray-900/50 p-3 rounded">
          <div className="text-sm text-gray-400 mb-1">Gamma Flip Point</div>
          <div className="text-2xl font-bold text-yellow-400">${stock.gammaLevels.flip}</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h5 className="text-sm font-medium text-gray-400 mb-2">Resistance Levels</h5>
          {stock.gammaLevels.resistance.map((level: number, i: number) => (
            <div key={i} className="flex justify-between items-center py-1 px-2 hover:bg-gray-900/50 rounded">
              <span className="text-red-400">R{i + 1}</span>
              <span className="font-mono">${level}</span>
            </div>
          ))}
        </div>
        <div>
          <h5 className="text-sm font-medium text-gray-400 mb-2">Support Levels</h5>
          {stock.gammaLevels.support.map((level: number, i: number) => (
            <div key={i} className="flex justify-between items-center py-1 px-2 hover:bg-gray-900/50 rounded">
              <span className="text-green-400">S{i + 1}</span>
              <span className="font-mono">${level}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-3 p-2 bg-gray-900/50 rounded text-sm">
        <p className="text-gray-300">
          Price is {stock.price > stock.gammaLevels.flip ? 
            <span className="text-red-400">above</span> : 
            <span className="text-green-400">below</span>
          } gamma flip. Market makers are {stock.price > stock.gammaLevels.flip ? 
            <span className="text-red-400">short gamma (higher volatility)</span> : 
            <span className="text-green-400">long gamma (lower volatility)</span>
          }.
        </p>
      </div>
    </div>
  )
}

// Main Component
export default function Home() {
  const [currentTime, setCurrentTime] = useState('')
  const [isOnline, setIsOnline] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [mode, setMode] = useState<'screener' | 'scanner'>('scanner')
  const [scanResults, setScanResults] = useState<{[key: string]: any[]}>({})
  const [scanLoading, setScanLoading] = useState<{[key: string]: boolean}>({})
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null)
  const [selectedStock, setSelectedStock] = useState<any>(null)
  const [showGEXDetails, setShowGEXDetails] = useState<string | null>(null)
  const [showAIIdeas, setShowAIIdeas] = useState<string | null>(null)
  const [marketStatus, setMarketStatus] = useState('closed')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dataStatus, setDataStatus] = useState('Loading...')
  const [filters, setFilters] = useState({
    price: { min: '', max: '' },
    volume: { min: '', max: '' },
    changePercent: { min: '', max: '' },
    marketCap: { min: '', max: '' },
    gex: { min: '', max: '' },
    putCallRatio: { min: '', max: '' },
    ivRank: { min: '', max: '' },
    flowScore: { min: '', max: '' }
  })
  
  // Live stock data from API
  const [stockData, setStockData] = useState<any[]>([])
  
  // Fetch real data from API
  useEffect(() => {
    const fetchRealData = async () => {
      try {
        setDataStatus('Fetching market data...')
        const response = await fetch('/api/stocks')
        const result = await response.json()
        
        if (result.status === 'success' && result.data && result.data.length > 0) {
          console.log(`Loaded ${result.data.length} stocks from API`)
          setStockData(result.data)
          setDataStatus(`Live: ${result.data.length} stocks`)
          setIsOnline(true)
        } else {
          console.log('No data from API')
          setDataStatus('API Error - Using defaults')
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        setDataStatus('Connection error')
      } finally {
        setLoading(false)
      }
    }

    fetchRealData()
    const interval = setInterval(fetchRealData, 30000)
    return () => clearInterval(interval)
  }, [])
  
  // Update time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString())
    }, 1000)
    return () => clearInterval(timer)
  }, [])
  
  // Scanner strategies
  const scannerStrategies = [
    {
      id: 'gammaSqueezer',
      name: 'Top Movers',
      description: 'Stocks with significant price movement',
      icon: Flame,
      color: 'text-orange-400',
      bgColor: 'bg-orange-900/20',
      filter: (stocks: any[]) => stocks
        .filter(s => s.changePercent && Math.abs(s.changePercent) > 3)
        .sort((a, b) => Math.abs(b.changePercent || 0) - Math.abs(a.changePercent || 0))
        .slice(0, 20)
    },
    {
      id: 'darkPoolAccumulation',
      name: 'High Volume',
      description: 'Stocks with high trading volume',
      icon: Moon,
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/20',
      filter: (stocks: any[]) => stocks
        .filter(s => s.volume && s.volume > 10000000)
        .sort((a, b) => (b.volume || 0) - (a.volume || 0))
        .slice(0, 20)
    },
    {
      id: 'optionsWhale',
      name: 'Large Caps',
      description: 'Large market cap stocks',
      icon: Activity,
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
      filter: (stocks: any[]) => stocks
        .filter(s => s.marketCap && s.marketCap > 100000000000)
        .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
        .slice(0, 20)
    },
    {
      id: 'ivCrush',
      name: 'IV Crush Play',
      description: 'High IV rank for premium selling',
      icon: Gauge,
      color: 'text-red-400',
      bgColor: 'bg-red-900/20',
      filter: (stocks: any[]) => stocks
        .filter(s => s.ivRank && s.ivRank > 70)
        .sort((a, b) => (b.ivRank || 0) - (a.ivRank || 0))
        .slice(0, 20)
    },
    {
      id: 'gammaWall',
      name: 'Gamma Wall Pin',
      description: 'Stocks pinned by gamma exposure',
      icon: Shield,
      color: 'text-green-400',
      bgColor: 'bg-green-900/20',
      filter: (stocks: any[]) => stocks
        .filter(s => s.gex && s.gex > 1000000000)
        .sort((a, b) => (b.gex || 0) - (a.gex || 0))
        .slice(0, 20)
    },
    {
      id: 'shortSqueeze',
      name: 'Short Squeeze Setup',
      description: 'High SI with positive flow',
      icon: Target,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-900/20',
      filter: (stocks: any[]) => stocks
        .filter(s => s.flowScore && s.flowScore > 85 && s.netPremium > 0)
        .sort((a, b) => (b.flowScore || 0) - (a.flowScore || 0))
        .slice(0, 20)
    }
  ]
  
  // Filter stocks for screener
  const filterStocks = (stockList: any[] = []) => {
    if (!stockList || stockList.length === 0) return []
    
    return stockList.filter(stock => {
      if (filters.price?.min && stock.price < parseFloat(filters.price.min)) return false
      if (filters.price?.max && stock.price > parseFloat(filters.price.max)) return false
      if (filters.volume?.min && stock.volume < parseFloat(filters.volume.min)) return false
      if (filters.volume?.max && stock.volume > parseFloat(filters.volume.max)) return false
      if (filters.changePercent?.min && stock.changePercent < parseFloat(filters.changePercent.min)) return false
      if (filters.changePercent?.max && stock.changePercent > parseFloat(filters.changePercent.max)) return false
      if (filters.marketCap?.min && stock.marketCap < parseFloat(filters.marketCap.min)) return false
      if (filters.marketCap?.max && stock.marketCap > parseFloat(filters.marketCap.max)) return false
      if (filters.gex?.min && stock.gex < parseFloat(filters.gex.min)) return false
      if (filters.gex?.max && stock.gex > parseFloat(filters.gex.max)) return false
      if (filters.putCallRatio?.min && stock.putCallRatio < parseFloat(filters.putCallRatio.min)) return false
      if (filters.putCallRatio?.max && stock.putCallRatio > parseFloat(filters.putCallRatio.max)) return false
      if (filters.ivRank?.min && stock.ivRank < parseFloat(filters.ivRank.min)) return false
      if (filters.ivRank?.max && stock.ivRank > parseFloat(filters.ivRank.max)) return false
      if (filters.flowScore?.min && stock.flowScore < parseFloat(filters.flowScore.min)) return false
      if (filters.flowScore?.max && stock.flowScore > parseFloat(filters.flowScore.max)) return false
      return true
    })
  }
  
  // Run screener
  const runScreener = () => {
    setLoading(true)
    setTimeout(() => {
      const filtered = filterStocks(stockData)
      setResults(filtered)
      setLoading(false)
    }, 500)
  }
  
  // Run scanner
  const runScanner = (strategyId: string) => {
    if (!stockData || stockData.length === 0) {
      console.log('No stock data available')
      return
    }
    
    setScanLoading(prev => ({ ...prev, [strategyId]: true }))
    const strategy = scannerStrategies.find(s => s.id === strategyId)
    
    if (strategy) {
      setTimeout(() => {
        const filtered = strategy.filter(stockData)
        setScanResults(prev => ({ ...prev, [strategyId]: filtered }))
        setScanLoading(prev => ({ ...prev, [strategyId]: false }))
      }, 500)
    }
  }
  
  // Run all scans
  const runAllScans = () => {
    if (!stockData || stockData.length === 0) {
      console.log('No stock data available')
      return
    }
    
    const loadingState: any = {}
    scannerStrategies.forEach(strategy => {
      loadingState[strategy.id] = true
    })
    setScanLoading(loadingState)
    
    scannerStrategies.forEach((strategy, index) => {
      setTimeout(() => {
        const filtered = strategy.filter(stockData)
        setScanResults(prev => ({ ...prev, [strategy.id]: filtered }))
        setScanLoading(prev => ({ ...prev, [strategy.id]: false }))
      }, 300 * (index + 1))
    })
  }
  
  // Auto-run scans when data loads
  useEffect(() => {
    if (stockData.length > 0 && mode === 'scanner') {
      runAllScans()
    } else if (stockData.length > 0 && mode === 'screener') {
      runScreener()
    }
  }, [stockData, mode])
  
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-purple-400" />
                Gamma Flow Pro
                <span className="text-sm bg-purple-900/30 text-purple-400 px-3 py-1 rounded-full">
                  Advanced Options Analytics
                </span>
              </h1>
              <p className="text-gray-400">Real-time gamma exposure, options flow, and dark pool analysis</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end mb-1">
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
                <span className="text-sm text-gray-400">{dataStatus}</span>
              </div>
              <div className="text-sm text-gray-500">{currentTime}</div>
            </div>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setMode('screener')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                mode === 'screener' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Filter className="w-5 h-5 inline mr-2" />
              Screener Mode
            </button>
            <button
              onClick={() => setMode('scanner')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                mode === 'scanner' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Radio className="w-5 h-5 inline mr-2" />
              Scanner Mode
            </button>
          </div>
          
          {mode === 'scanner' && (
            <button
              onClick={runAllScans}
              disabled={stockData.length === 0}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-all flex items-center gap-2"
            >
              <PlayCircle className="w-5 h-5" />
              Scan All Strategies
            </button>
          )}
        </div>

        {/* Scanner Mode */}
        {mode === 'scanner' ? (
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
              {scannerStrategies.map(strategy => {
                const Icon = strategy.icon
                const results = scanResults[strategy.id] || []
                const isActive = selectedStrategy === strategy.id
                const isLoading = scanLoading[strategy.id]
                
                return (
                  <div
                    key={strategy.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      isActive 
                        ? 'border-purple-500 bg-purple-900/10' 
                        : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                    }`}
                    onClick={() => setSelectedStrategy(strategy.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${strategy.bgColor}`}>
                          <Icon className={`w-5 h-5 ${strategy.color}`} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{strategy.name}</h3>
                          <p className="text-sm text-gray-400">{strategy.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          runScanner(strategy.id)
                        }}
                        className="p-2 bg-gray-800 rounded hover:bg-gray-700"
                      >
                        {isLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <PlayCircle className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">{results.length}</span>
                      <span className="text-sm text-gray-400">stocks found</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Scanner Results Table */}
            {selectedStrategy && scanResults[selectedStrategy] && scanResults[selectedStrategy].length > 0 && (
              <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-800">
                  <h2 className="text-lg font-bold">
                    {scannerStrategies.find(s => s.id === selectedStrategy)?.name} Results
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="p-3 text-left">Symbol</th>
                        <th className="p-3 text-left">Name</th>
                        <th className="p-3 text-right">Price</th>
                        <th className="p-3 text-right">Change</th>
                        <th className="p-3 text-right">Volume</th>
                        <th className="p-3 text-right cursor-pointer hover:text-purple-400">
                          GEX ↕
                        </th>
                        <th className="p-3 text-right">P/C Ratio</th>
                        <th className="p-3 text-right">IV Rank</th>
                        <th className="p-3 text-right">Flow Score</th>
                        <th className="p-3 text-center">AI Ideas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scanResults[selectedStrategy].map((stock: any) => (
                        <React.Fragment key={stock.symbol}>
                          <tr className="border-t border-gray-800 hover:bg-gray-800">
                            <td className="p-3 font-medium">{stock.symbol}</td>
                            <td className="p-3 text-gray-300">{stock.name || stock.symbol}</td>
                            <td className="p-3 text-right">${stock.price?.toFixed(2)}</td>
                            <td className="p-3 text-right">
                              <span className={`flex items-center justify-end gap-1 ${
                                stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {stock.changePercent >= 0 ? (
                                  <ArrowUpRight className="w-4 h-4" />
                                ) : (
                                  <ArrowDownRight className="w-4 h-4" />
                                )}
                                {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                              </span>
                            </td>
                            <td className="p-3 text-right">{formatVolume(stock.volume)}</td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => setShowGEXDetails(showGEXDetails === stock.symbol ? null : stock.symbol)}
                                className="text-purple-400 hover:text-purple-300 font-medium"
                              >
                                {formatNumber(stock.gex)}
                              </button>
                            </td>
                            <td className="p-3 text-right">
                              <span className={`px-2 py-1 rounded text-xs ${
                                stock.putCallRatio > 1.5 ? 'bg-red-900 text-red-400' :
                                stock.putCallRatio < 0.5 ? 'bg-green-900 text-green-400' :
                                'bg-gray-700'
                              }`}>
                                {stock.putCallRatio?.toFixed(2)}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <span className={`px-2 py-1 rounded text-xs ${
                                stock.ivRank > 80 ? 'bg-orange-900 text-orange-400' :
                                stock.ivRank < 30 ? 'bg-blue-900 text-blue-400' :
                                'bg-gray-700'
                              }`}>
                                {stock.ivRank}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <div className="w-16 bg-gray-700 rounded-full h-2">
                                  <div
                                    className="bg-purple-500 h-2 rounded-full"
                                    style={{ width: `${stock.flowScore}%` }}
                                  />
                                </div>
                                <span className="text-xs">{stock.flowScore}</span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <button 
                                onClick={() => setShowAIIdeas(showAIIdeas === stock.symbol ? null : stock.symbol)}
                                className="text-purple-400 hover:text-purple-300"
                              >
                                <Sparkles className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                          {showGEXDetails === stock.symbol && (
                            <tr>
                              <td colSpan={10} className="p-0">
                                <GEXDetailsSection stock={stock} />
                              </td>
                            </tr>
                          )}
                          {showAIIdeas === stock.symbol && (
                            <tr>
                              <td colSpan={10} className="p-0">
                                <AITradeIdeasSection stock={stock} />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Screener Mode */
          <>
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Filter className="w-5 h-5 text-purple-400" />
                Advanced Screening Filters
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Price Range</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.price.min}
                      onChange={(e) => setFilters({...filters, price: {...filters.price, min: e.target.value}})}
                      className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.price.max}
                      onChange={(e) => setFilters({...filters, price: {...filters.price, max: e.target.value}})}
                      className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Volume</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.volume.min}
                      onChange={(e) => setFilters({...filters, volume: {...filters.volume, min: e.target.value}})}
                      className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.volume.max}
                      onChange={(e) => setFilters({...filters, volume: {...filters.volume, max: e.target.value}})}
                      className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">GEX (Gamma Exposure)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.gex.min}
                      onChange={(e) => setFilters({...filters, gex: {...filters.gex, min: e.target.value}})}
                      className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.gex.max}
                      onChange={(e) => setFilters({...filters, gex: {...filters.gex, max: e.target.value}})}
                      className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Flow Score</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.flowScore.min}
                      onChange={(e) => setFilters({...filters, flowScore: {...filters.flowScore, min: e.target.value}})}
                      className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.flowScore.max}
                      onChange={(e) => setFilters({...filters, flowScore: {...filters.flowScore, max: e.target.value}})}
                      className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={runScreener}
                disabled={stockData.length === 0}
                className="w-full px-6 py-3 bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-gray-600 transition-colors font-medium"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 inline mr-2 animate-spin" />
                    Screening...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 inline mr-2" />
                    Run Advanced Screener
                  </>
                )}
              </button>
            </div>

            {/* Screener Results */}
            {results.length > 0 && (
              <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-800">
                  <h2 className="text-lg font-bold">Screener Results ({results.length} stocks)</h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="p-3 text-left">Symbol</th>
                        <th className="p-3 text-left">Name</th>
                        <th className="p-3 text-right">Price</th>
                        <th className="p-3 text-right">Change</th>
                        <th className="p-3 text-right">Volume</th>
                        <th className="p-3 text-right">Market Cap</th>
                        <th className="p-3 text-right">GEX</th>
                        <th className="p-3 text-right">Flow Score</th>
                        <th className="p-3 text-center">Analysis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.slice(0, 50).map((stock: any) => (
                        <React.Fragment key={stock.symbol}>
                          <tr className="border-t border-gray-800 hover:bg-gray-800">
                            <td className="p-3 font-medium">{stock.symbol}</td>
                            <td className="p-3 text-gray-300">{stock.name || stock.symbol}</td>
                            <td className="p-3 text-right">${stock.price?.toFixed(2)}</td>
                            <td className="p-3 text-right">
                              <span className={stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}>
                                {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                              </span>
                            </td>
                            <td className="p-3 text-right">{formatVolume(stock.volume)}</td>
                            <td className="p-3 text-right">{formatNumber(stock.marketCap)}</td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => setShowGEXDetails(showGEXDetails === stock.symbol ? null : stock.symbol)}
                                className="text-purple-400 hover:text-purple-300 font-medium"
                              >
                                {formatNumber(stock.gex)}
                              </button>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <div className="w-16 bg-gray-700 rounded-full h-2">
                                  <div
                                    className="bg-purple-500 h-2 rounded-full"
                                    style={{ width: `${stock.flowScore}%` }}
                                  />
                                </div>
                                <span className="text-xs">{stock.flowScore}</span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <button 
                                onClick={() => setShowAIIdeas(showAIIdeas === stock.symbol ? null : stock.symbol)}
                                className="text-purple-400 hover:text-purple-300"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                          {showGEXDetails === stock.symbol && (
                            <tr>
                              <td colSpan={9} className="p-0">
                                <GEXDetailsSection stock={stock} />
                              </td>
                            </tr>
                          )}
                          {showAIIdeas === stock.symbol && (
                            <tr>
                              <td colSpan={9} className="p-0">
                                <AITradeIdeasSection stock={stock} />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
