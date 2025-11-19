'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, RefreshCw, TrendingUp, TrendingDown, Droplets,
  Activity, Zap, Target, AlertCircle, Filter, ChevronDown, ChevronUp,
  Plus, X, Layers, CheckCircle, Clock, BarChart3, TrendingUpDown,
  Eye, Shield, Flame
} from 'lucide-react'

// Liquidity Hunter types
interface TimeframeLiquidity {
  activeFVGCount: number
  bullishFVGCount: number
  bearishFVGCount: number
  liquidityZoneCount: number
  buyVolume: number
  sellVolume: number
  delta: number
  avgAbsDelta: number
  isSignificantBuying: boolean
  isSignificantSelling: boolean
  liquidityScore: number
  liquiditySignals: string[]
  direction: 'bullish' | 'bearish' | 'neutral'
}

interface LiquidityStock {
  symbol: string
  price: number
  changePercent: number
  volume: number
  fiveMin: TimeframeLiquidity
  daily: TimeframeLiquidity
  aligned: boolean
  alignmentStrength: number
  alignmentDirection: 'bullish' | 'bearish' | 'neutral'
}

// Decision Dashboard types
interface IndicatorResult {
  symbol: string
  action: string
  direction: number
  alignmentScore: number
  confidence: string
  sizePercent: number
  bfci: number
  bfciState: number
  coreValue: number
  cci: number
  orderFlowDelta: number
  orderFlowBuyPct: number
  fearExtreme: boolean
  squeezeOn: boolean
  prohibitionActive: boolean
  currentPrice?: number
  priceChangePercent?: number
}

interface DashboardStock {
  symbol: string
  aligned: boolean
  alignmentStrength: number
  fiveMin: IndicatorResult
  daily: IndicatorResult
  combinedScore: number
}

// Combined result
interface CombinedStock {
  symbol: string
  price: number
  changePercent: number
  liquidity: LiquidityStock | null
  dashboard: DashboardStock | null
}

// Pre-configured watchlists
const WATCHLISTS = {
  popular: ['SPY', 'QQQ', 'NVDA', 'TSLA', 'AAPL', 'AMD', 'MSFT', 'GOOGL', 'AMZN', 'META'],
  tech: ['NVDA', 'AMD', 'INTC', 'TSM', 'AVGO', 'QCOM', 'MU', 'AMAT', 'LRCX', 'KLAC'],
  memes: ['GME', 'AMC', 'PLTR', 'SOFI', 'HOOD', 'RIVN', 'LCID', 'NIO', 'COIN'],
  semiconductors: ['NVDA', 'AMD', 'INTC', 'TSM', 'AVGO', 'QCOM', 'MU', 'AMAT', 'LRCX', 'ASML'],
  etfs: ['SPY', 'QQQ', 'IWM', 'DIA', 'SOXL', 'TQQQ', 'SPXL', 'ARKK', 'GLD', 'TLT'],
}

export default function UnifiedWatchlist() {
  const [stocks, setStocks] = useState<CombinedStock[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  // Watchlist management
  const [customSymbols, setCustomSymbols] = useState('')
  const [activeWatchlist, setActiveWatchlist] = useState<string>('popular')
  const [currentSymbols, setCurrentSymbols] = useState<string[]>(WATCHLISTS.popular)

  // View mode
  const [viewMode, setViewMode] = useState<'both' | 'liquidity' | 'dashboard'>('both')

  // Filters
  const [showAlignedOnly, setShowAlignedOnly] = useState(false)
  const [filterDirection, setFilterDirection] = useState<'all' | 'bullish' | 'bearish'>('all')

  // Auto-refresh
  const [isAutoRefresh, setIsAutoRefresh] = useState(false)

  // Fetch data from both APIs
  const fetchData = async (symbols: string[] = currentSymbols) => {
    if (symbols.length === 0) return

    setIsLoading(true)
    try {
      const symbolsParam = symbols.join(',')

      // Fetch both APIs in parallel
      const [liquidityRes, dashboardRes] = await Promise.all([
        fetch(`/api/liquidity-hunter?symbols=${symbolsParam}`),
        fetch(`/api/watchlist?symbols=${symbolsParam}&minScore=0&alignedOnly=false`)
      ])

      const [liquidityData, dashboardData] = await Promise.all([
        liquidityRes.json(),
        dashboardRes.json()
      ])

      // Combine results
      const combined: CombinedStock[] = symbols.map(symbol => {
        const liq = liquidityData.data?.find((s: LiquidityStock) => s.symbol === symbol)
        const dash = dashboardData.data?.find((s: DashboardStock) => s.symbol === symbol)

        return {
          symbol,
          price: liq?.price || dash?.daily?.currentPrice || 0,
          changePercent: liq?.changePercent || dash?.daily?.priceChangePercent || 0,
          liquidity: liq || null,
          dashboard: dash || null,
        }
      })

      setStocks(combined)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [])

  // Auto-refresh
  useEffect(() => {
    if (!isAutoRefresh) return
    const interval = setInterval(() => fetchData(), 60000)
    return () => clearInterval(interval)
  }, [isAutoRefresh, currentSymbols])

  // Watchlist management
  const loadWatchlist = (name: string) => {
    setActiveWatchlist(name)
    const symbols = WATCHLISTS[name as keyof typeof WATCHLISTS] || []
    setCurrentSymbols(symbols)
    setCustomSymbols('')
    fetchData(symbols)
  }

  const loadCustomSymbols = () => {
    const symbols = customSymbols
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(s => s.length > 0)
    if (symbols.length === 0) return
    setActiveWatchlist('custom')
    setCurrentSymbols(symbols)
    fetchData(symbols)
  }

  const removeSymbol = (symbol: string) => {
    const newSymbols = currentSymbols.filter(s => s !== symbol)
    setCurrentSymbols(newSymbols)
    if (newSymbols.length > 0) {
      fetchData(newSymbols)
    } else {
      setStocks([])
    }
  }

  // Filter stocks
  const filteredStocks = stocks.filter(stock => {
    const liq = stock.liquidity
    const dash = stock.dashboard

    if (showAlignedOnly) {
      const isAligned = (liq?.aligned || dash?.aligned)
      if (!isAligned) return false
    }

    if (filterDirection !== 'all') {
      const liqDir = liq?.alignmentDirection
      const dashDir = dash?.fiveMin?.direction > 0 ? 'bullish' : dash?.fiveMin?.direction < 0 ? 'bearish' : 'neutral'
      if (liqDir !== filterDirection && dashDir !== filterDirection) return false
    }

    return true
  })

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`
    return num.toFixed(0)
  }

  const getActionColor = (action: string) => {
    if (action?.includes('MAX LONG')) return 'text-green-400'
    if (action?.includes('STRONG LONG')) return 'text-green-300'
    if (action?.includes('LONG')) return 'text-cyan-400'
    if (action?.includes('MAX SHORT')) return 'text-red-400'
    if (action?.includes('STRONG SHORT')) return 'text-orange-400'
    if (action?.includes('SHORT')) return 'text-yellow-400'
    if (action?.includes('PROHIBITED')) return 'text-red-500'
    return 'text-gray-400'
  }

  const alignedCount = stocks.filter(s => s.liquidity?.aligned || s.dashboard?.aligned).length
  const bullishCount = stocks.filter(s =>
    s.liquidity?.alignmentDirection === 'bullish' ||
    (s.dashboard?.fiveMin?.direction > 0 && s.dashboard?.daily?.direction > 0)
  ).length
  const bearishCount = stocks.filter(s =>
    s.liquidity?.alignmentDirection === 'bearish' ||
    (s.dashboard?.fiveMin?.direction < 0 && s.dashboard?.daily?.direction < 0)
  ).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-400 hover:text-white transition">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Droplets className="text-cyan-400" size={32} />
                Unified Watchlist
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Combined Liquidity Hunter + Decision Dashboard Analysis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAutoRefresh(!isAutoRefresh)}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                isAutoRefresh ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <RefreshCw size={16} className={isAutoRefresh ? 'animate-spin' : ''} />
              {isAutoRefresh ? 'Auto' : 'Manual'}
            </button>

            <button
              onClick={() => fetchData()}
              disabled={isLoading}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              Scan Now
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-xs mb-1">Symbols</div>
            <div className="text-2xl font-bold">{currentSymbols.length}</div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-cyan-700/50">
            <div className="text-gray-400 text-xs mb-1">Aligned</div>
            <div className="text-2xl font-bold text-cyan-400">{alignedCount}</div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-green-700/50">
            <div className="text-gray-400 text-xs mb-1">Bullish</div>
            <div className="text-2xl font-bold text-green-400">{bullishCount}</div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-red-700/50">
            <div className="text-gray-400 text-xs mb-1">Bearish</div>
            <div className="text-2xl font-bold text-red-400">{bearishCount}</div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-xs mb-1">Showing</div>
            <div className="text-2xl font-bold">{filteredStocks.length}</div>
          </div>
        </div>

        {/* Watchlists */}
        <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Layers size={20} className="text-cyan-400" />
            <span className="font-semibold">Watchlists</span>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {Object.keys(WATCHLISTS).map((name) => (
              <button
                key={name}
                onClick={() => loadWatchlist(name)}
                className={`px-4 py-2 rounded-lg transition capitalize ${
                  activeWatchlist === name
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                {name}
              </button>
            ))}
            {activeWatchlist === 'custom' && (
              <button className="px-4 py-2 rounded-lg bg-purple-600 text-white">
                Custom ({currentSymbols.length})
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={customSymbols}
              onChange={(e) => setCustomSymbols(e.target.value)}
              placeholder="Enter symbols (e.g., AAPL, TSLA, NVDA)"
              className="flex-1 px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter') loadCustomSymbols()
              }}
            />
            <button
              onClick={loadCustomSymbols}
              disabled={!customSymbols.trim()}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
            >
              <Plus size={16} />
              Load
            </button>
          </div>

          {currentSymbols.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {currentSymbols.map((symbol) => (
                <div
                  key={symbol}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-gray-700 rounded-full text-sm"
                >
                  <span>{symbol}</span>
                  <button
                    onClick={() => removeSymbol(symbol)}
                    className="text-gray-400 hover:text-white transition"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* View Mode & Filters */}
        <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-cyan-400" />
            <span className="font-semibold">View & Filters</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-400 block mb-2">Analysis Mode</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('both')}
                  className={`flex-1 px-3 py-2 rounded-lg transition text-sm ${
                    viewMode === 'both' ? 'bg-purple-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  Both
                </button>
                <button
                  onClick={() => setViewMode('liquidity')}
                  className={`flex-1 px-3 py-2 rounded-lg transition text-sm ${
                    viewMode === 'liquidity' ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  Liquidity
                </button>
                <button
                  onClick={() => setViewMode('dashboard')}
                  className={`flex-1 px-3 py-2 rounded-lg transition text-sm ${
                    viewMode === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  Dashboard
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                id="alignedOnly"
                checked={showAlignedOnly}
                onChange={(e) => setShowAlignedOnly(e.target.checked)}
                className="w-5 h-5"
              />
              <label htmlFor="alignedOnly" className="text-sm">Aligned Only</label>
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-2">Direction Filter</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterDirection('all')}
                  className={`px-4 py-2 rounded-lg transition text-sm ${
                    filterDirection === 'all' ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterDirection('bullish')}
                  className={`px-4 py-2 rounded-lg transition text-sm ${
                    filterDirection === 'bullish' ? 'bg-green-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  Bullish
                </button>
                <button
                  onClick={() => setFilterDirection('bearish')}
                  className={`px-4 py-2 rounded-lg transition text-sm ${
                    filterDirection === 'bearish' ? 'bg-red-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  Bearish
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-gray-800/50 backdrop-blur rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Symbol</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Price</th>
                  {(viewMode === 'both' || viewMode === 'liquidity') && (
                    <>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Liq Aligned</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">FVGs</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Zones</th>
                    </>
                  )}
                  {(viewMode === 'both' || viewMode === 'dashboard') && (
                    <>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Dash Aligned</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">5-Min Action</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Daily Action</th>
                    </>
                  )}
                  <th className="px-4 py-3 text-center text-sm font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                      <RefreshCw className="animate-spin inline-block mr-2" size={20} />
                      Scanning {currentSymbols.length} symbols...
                    </td>
                  </tr>
                ) : filteredStocks.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                      No stocks match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredStocks.map((stock) => (
                    <React.Fragment key={stock.symbol}>
                      <tr className="border-t border-gray-700 hover:bg-gray-700/30 transition">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-cyan-400">{stock.symbol}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-mono">${stock.price.toFixed(2)}</div>
                          <div className={`text-xs ${stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                          </div>
                        </td>
                        {(viewMode === 'both' || viewMode === 'liquidity') && (
                          <>
                            <td className="px-4 py-3 text-center">
                              {stock.liquidity?.aligned ? (
                                <CheckCircle className="inline-block text-cyan-400" size={20} />
                              ) : (
                                <X className="inline-block text-gray-600" size={20} />
                              )}
                            </td>
                            <td className="px-4 py-3 text-center text-sm">
                              <span className="text-green-400">{stock.liquidity?.fiveMin?.bullishFVGCount || 0}</span>
                              {' / '}
                              <span className="text-red-400">{stock.liquidity?.fiveMin?.bearishFVGCount || 0}</span>
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-orange-400 font-semibold">
                              {stock.liquidity?.fiveMin?.liquidityZoneCount || 0}
                            </td>
                          </>
                        )}
                        {(viewMode === 'both' || viewMode === 'dashboard') && (
                          <>
                            <td className="px-4 py-3 text-center">
                              {stock.dashboard?.aligned ? (
                                <CheckCircle className="inline-block text-green-400" size={20} />
                              ) : (
                                <X className="inline-block text-gray-600" size={20} />
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-sm font-medium ${getActionColor(stock.dashboard?.fiveMin?.action || '')}`}>
                                {stock.dashboard?.fiveMin?.action || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-sm font-medium ${getActionColor(stock.dashboard?.daily?.action || '')}`}>
                                {stock.dashboard?.daily?.action || 'N/A'}
                              </span>
                            </td>
                          </>
                        )}
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setExpandedRow(expandedRow === stock.symbol ? null : stock.symbol)}
                            className="text-cyan-400 hover:text-cyan-300 transition"
                          >
                            {expandedRow === stock.symbol ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </button>
                        </td>
                      </tr>
                      {expandedRow === stock.symbol && (
                        <tr className="border-t border-gray-700 bg-gray-900/70">
                          <td colSpan={10} className="px-4 py-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Liquidity Analysis */}
                              {stock.liquidity && (viewMode === 'both' || viewMode === 'liquidity') && (
                                <div className="bg-gray-800/50 rounded-lg p-4 border border-cyan-700/30">
                                  <h4 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                                    <Droplets size={16} />
                                    Liquidity Hunter Analysis
                                  </h4>
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      <div>
                                        <span className="text-gray-400">5-Min FVGs:</span>
                                        <div className="mt-1">
                                          <span className="text-green-400">{stock.liquidity.fiveMin.bullishFVGCount}</span>
                                          {' / '}
                                          <span className="text-red-400">{stock.liquidity.fiveMin.bearishFVGCount}</span>
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Daily FVGs:</span>
                                        <div className="mt-1">
                                          <span className="text-green-400">{stock.liquidity.daily.bullishFVGCount}</span>
                                          {' / '}
                                          <span className="text-red-400">{stock.liquidity.daily.bearishFVGCount}</span>
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">5-Min Delta:</span>
                                        <div className={`mt-1 font-mono ${stock.liquidity.fiveMin.delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                          {formatNumber(stock.liquidity.fiveMin.delta)}
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Daily Delta:</span>
                                        <div className={`mt-1 font-mono ${stock.liquidity.daily.delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                          {formatNumber(stock.liquidity.daily.delta)}
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Liq Zones:</span>
                                        <div className="mt-1 font-semibold text-orange-400">
                                          {stock.liquidity.fiveMin.liquidityZoneCount}
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Alignment:</span>
                                        <div className="mt-1 font-semibold text-cyan-400">
                                          {stock.liquidity.alignmentStrength}/100
                                        </div>
                                      </div>
                                    </div>
                                    {stock.liquidity.aligned && (
                                      <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded text-xs text-cyan-300">
                                        <strong>Aligned {stock.liquidity.alignmentDirection.toUpperCase()}</strong>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Dashboard Analysis */}
                              {stock.dashboard && (viewMode === 'both' || viewMode === 'dashboard') && (
                                <div className="bg-gray-800/50 rounded-lg p-4 border border-purple-700/30">
                                  <h4 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
                                    <BarChart3 size={16} />
                                    Decision Dashboard Analysis
                                  </h4>
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      <div>
                                        <span className="text-gray-400">5-Min Action:</span>
                                        <div className={`mt-1 font-semibold ${getActionColor(stock.dashboard.fiveMin.action)}`}>
                                          {stock.dashboard.fiveMin.action}
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Daily Action:</span>
                                        <div className={`mt-1 font-semibold ${getActionColor(stock.dashboard.daily.action)}`}>
                                          {stock.dashboard.daily.action}
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">BFCI:</span>
                                        <div className="mt-1 font-medium">{stock.dashboard.fiveMin.bfci.toFixed(2)}</div>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Core Value:</span>
                                        <div className="mt-1 font-medium">{stock.dashboard.fiveMin.coreValue.toFixed(0)}</div>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">CCI:</span>
                                        <div className="mt-1 font-medium">{stock.dashboard.fiveMin.cci.toFixed(0)}</div>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Confidence:</span>
                                        <div className="mt-1 font-medium">{stock.dashboard.fiveMin.confidence}</div>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Position Size:</span>
                                        <div className="mt-1 font-medium">{stock.dashboard.fiveMin.sizePercent}%</div>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Combined Score:</span>
                                        <div className="mt-1 font-semibold text-purple-400">
                                          {stock.dashboard.combinedScore.toFixed(1)}/12
                                        </div>
                                      </div>
                                    </div>
                                    {stock.dashboard.fiveMin.prohibitionActive && (
                                      <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-300 flex items-center gap-1">
                                        <Shield size={14} />
                                        Trading PROHIBITED
                                      </div>
                                    )}
                                    {stock.dashboard.aligned && (
                                      <div className="p-2 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-300">
                                        <strong>Dashboard Aligned</strong>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {lastUpdate && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()} |
            Showing {filteredStocks.length} of {stocks.length} symbols |
            Auto-refresh: {isAutoRefresh ? 'ON (60s)' : 'OFF'}
          </div>
        )}
      </div>
    </div>
  )
}
