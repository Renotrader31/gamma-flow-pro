'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, RefreshCw, TrendingUp, TrendingDown, Droplets,
  Activity, Zap, Target, AlertCircle, Filter, ChevronDown, ChevronUp,
  Plus, X, Layers, DollarSign, CheckCircle, Clock, TrendingUpDown
} from 'lucide-react'

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

interface Stock {
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

// Pre-configured watchlists
const WATCHLISTS = {
  popular: ['SPY', 'QQQ', 'NVDA', 'TSLA', 'AAPL', 'AMD', 'MSFT', 'GOOGL', 'AMZN', 'META'],
  tech: ['NVDA', 'AMD', 'INTC', 'TSM', 'AVGO', 'QCOM', 'MU', 'AMAT', 'LRCX', 'KLAC'],
  memes: ['GME', 'AMC', 'BBBY', 'PLTR', 'SOFI', 'HOOD', 'RIVN', 'LCID', 'NIO', 'COIN'],
  semiconductors: ['NVDA', 'AMD', 'INTC', 'TSM', 'AVGO', 'QCOM', 'MU', 'AMAT', 'LRCX', 'ASML'],
  etfs: ['SPY', 'QQQ', 'IWM', 'DIA', 'SOXL', 'TQQQ', 'SPXL', 'ARKK', 'GLD', 'TLT'],
  energy: ['XLE', 'XOM', 'CVX', 'SLB', 'COP', 'EOG', 'OXY', 'PSX', 'VLO', 'MPC'],
  banks: ['JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'SCHW', 'BLK', 'USB', 'PNC'],
}

export default function LiquidityScanner() {
  const [stocks, setStocks] = useState<Stock[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  // Custom symbols management
  const [customSymbols, setCustomSymbols] = useState('')
  const [activeWatchlist, setActiveWatchlist] = useState<string>('popular')
  const [currentSymbols, setCurrentSymbols] = useState<string[]>(WATCHLISTS.popular)

  // Filters
  const [minAlignmentStrength, setMinAlignmentStrength] = useState(50)
  const [showAlignedOnly, setShowAlignedOnly] = useState(false)
  const [filterDirection, setFilterDirection] = useState<'all' | 'bullish' | 'bearish'>('all')

  // Auto-refresh
  const [isAutoRefresh, setIsAutoRefresh] = useState(false)

  // Advanced config
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false)
  const [fvgThreshold, setFvgThreshold] = useState(0.5)
  const [deltaThreshold, setDeltaThreshold] = useState(1000)
  const [liqMultiplier, setLiqMultiplier] = useState(1.5)

  // Fetch liquidity data
  const fetchData = async (symbols: string[] = currentSymbols) => {
    if (symbols.length === 0) return

    setIsLoading(true)
    try {
      const symbolsParam = symbols.join(',')
      const params = new URLSearchParams({
        symbols: symbolsParam,
        fvgThreshold: fvgThreshold.toString(),
        deltaThreshold: deltaThreshold.toString(),
        liqMultiplier: liqMultiplier.toString(),
      })

      const response = await fetch(`/api/liquidity-hunter?${params}`)
      const result = await response.json()

      if (result.status === 'success' && result.data) {
        setStocks(result.data)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Error fetching liquidity data:', error)
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

    const interval = setInterval(() => {
      fetchData()
    }, 60000) // Every 60 seconds

    return () => clearInterval(interval)
  }, [isAutoRefresh, currentSymbols])

  // Switch watchlist
  const loadWatchlist = (name: string) => {
    setActiveWatchlist(name)
    const symbols = WATCHLISTS[name as keyof typeof WATCHLISTS] || []
    setCurrentSymbols(symbols)
    setCustomSymbols('')
    fetchData(symbols)
  }

  // Load custom symbols
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

  // Remove symbol
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
  const filteredStocks = stocks
    .filter(stock => {
      if (showAlignedOnly && !stock.aligned) return false
      if (stock.alignmentStrength < minAlignmentStrength) return false
      if (filterDirection !== 'all' && stock.alignmentDirection !== filterDirection) return false
      return true
    })
    .sort((a, b) => {
      // Sort by alignment first, then by strength
      if (a.aligned && !b.aligned) return -1
      if (!a.aligned && b.aligned) return 1
      return b.alignmentStrength - a.alignmentStrength
    })

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`
    return num.toFixed(0)
  }

  const getDirectionBadge = (direction: 'bullish' | 'bearish' | 'neutral') => {
    if (direction === 'bullish') {
      return <span className="text-green-400 font-semibold">BULLISH</span>
    } else if (direction === 'bearish') {
      return <span className="text-red-400 font-semibold">BEARISH</span>
    } else {
      return <span className="text-gray-500">NEUTRAL</span>
    }
  }

  const alignedCount = stocks.filter(s => s.aligned).length
  const bullishAlignedCount = stocks.filter(s => s.aligned && s.alignmentDirection === 'bullish').length
  const bearishAlignedCount = stocks.filter(s => s.aligned && s.alignmentDirection === 'bearish').length

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
                Liquidity Hunter - Multi-Timeframe Scanner
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                5-Minute vs Daily Alignment • FVG Detection & Order Flow Analysis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAutoRefresh(!isAutoRefresh)}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                isAutoRefresh
                  ? 'bg-cyan-600 hover:bg-cyan-700'
                  : 'bg-gray-700 hover:bg-gray-600'
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

        {/* Stats Row */}
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
            <div className="text-2xl font-bold text-green-400">{bullishAlignedCount}</div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-red-700/50">
            <div className="text-gray-400 text-xs mb-1">Bearish</div>
            <div className="text-2xl font-bold text-red-400">{bearishAlignedCount}</div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-xs mb-1">Showing</div>
            <div className="text-2xl font-bold text-white">{filteredStocks.length}</div>
          </div>
        </div>

        {/* Watchlist Selection */}
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

          {/* Custom symbols input */}
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

          {/* Active symbols chips */}
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

        {/* Filters */}
        <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-cyan-400" />
            <span className="font-semibold">Filters & Configuration</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-sm text-gray-400 block mb-2">
                Min Alignment Strength: {minAlignmentStrength}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={minAlignmentStrength}
                onChange={(e) => setMinAlignmentStrength(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                id="alignedOnly"
                checked={showAlignedOnly}
                onChange={(e) => setShowAlignedOnly(e.target.checked)}
                className="w-5 h-5"
              />
              <label htmlFor="alignedOnly" className="text-sm">
                Aligned Only
              </label>
            </div>

            <div className="col-span-2">
              <label className="text-sm text-gray-400 block mb-2">
                Filter by Direction
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterDirection('all')}
                  className={`px-4 py-2 rounded-lg transition ${
                    filterDirection === 'all'
                      ? 'bg-cyan-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterDirection('bullish')}
                  className={`px-4 py-2 rounded-lg transition ${
                    filterDirection === 'bullish'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  Bullish
                </button>
                <button
                  onClick={() => setFilterDirection('bearish')}
                  className={`px-4 py-2 rounded-lg transition ${
                    filterDirection === 'bearish'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  Bearish
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Configuration */}
          <div>
            <button
              onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
              className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-2"
            >
              {showAdvancedConfig ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              Advanced Configuration
            </button>

            {showAdvancedConfig && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-900/50 rounded-lg">
                <div>
                  <label className="text-sm text-gray-400 block mb-2">
                    FVG Threshold (%): {fvgThreshold}
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    max="5"
                    step="0.1"
                    value={fvgThreshold}
                    onChange={(e) => setFvgThreshold(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-2">
                    Delta Threshold: {deltaThreshold}
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="50000"
                    step="100"
                    value={deltaThreshold}
                    onChange={(e) => setDeltaThreshold(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-2">
                    Liquidity Multiplier: {liqMultiplier}x
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="3"
                    step="0.1"
                    value={liqMultiplier}
                    onChange={(e) => setLiqMultiplier(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                  />
                </div>

                <div className="col-span-full">
                  <button
                    onClick={() => fetchData()}
                    className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition"
                  >
                    Apply & Rescan
                  </button>
                </div>
              </div>
            )}
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
                  <th className="px-4 py-3 text-center text-sm font-semibold">Aligned</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Strength</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Direction</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">5-Min</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Daily</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Trade</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                      <RefreshCw className="animate-spin inline-block mr-2" size={20} />
                      Scanning {currentSymbols.length} symbols across 2 timeframes...
                    </td>
                  </tr>
                ) : filteredStocks.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                      {stocks.length === 0
                        ? 'No data yet. Click "Scan Now" to analyze symbols.'
                        : 'No stocks match the current filters.'}
                    </td>
                  </tr>
                ) : (
                  filteredStocks.map((stock) => (
                    <React.Fragment key={stock.symbol}>
                      <tr className={`border-t transition ${
                        stock.aligned
                          ? 'border-cyan-700/50 bg-cyan-500/5 hover:bg-cyan-500/10'
                          : 'border-gray-700 hover:bg-gray-700/30'
                      }`}>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-cyan-400">{stock.symbol}</div>
                          <div className="text-xs text-gray-500">{stock.changePercent.toFixed(2)}%</div>
                        </td>
                        <td className="px-4 py-3 font-mono">${stock.price.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          {stock.aligned ? (
                            <CheckCircle className="inline-block text-cyan-400" size={20} />
                          ) : (
                            <X className="inline-block text-gray-600" size={20} />
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                            stock.alignmentStrength >= 70 ? 'bg-green-500/20 text-green-400' :
                            stock.alignmentStrength >= 50 ? 'bg-cyan-500/20 text-cyan-400' :
                            stock.alignmentStrength >= 30 ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {stock.alignmentStrength}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {getDirectionBadge(stock.alignmentDirection)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="text-xs">
                            <div className={stock.fiveMin.direction === 'bullish' ? 'text-green-400' : stock.fiveMin.direction === 'bearish' ? 'text-red-400' : 'text-gray-500'}>
                              {stock.fiveMin.direction.toUpperCase()}
                            </div>
                            <div className="text-gray-500">Score: {stock.fiveMin.liquidityScore}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="text-xs">
                            <div className={stock.daily.direction === 'bullish' ? 'text-green-400' : stock.daily.direction === 'bearish' ? 'text-red-400' : 'text-gray-500'}>
                              {stock.daily.direction.toUpperCase()}
                            </div>
                            <div className="text-gray-500">Score: {stock.daily.liquidityScore}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {stock.aligned && stock.alignmentStrength >= 60 ? (
                            <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                              stock.alignmentDirection === 'bullish'
                                ? 'bg-green-500/30 text-green-300 border border-green-500/50'
                                : 'bg-red-500/30 text-red-300 border border-red-500/50'
                            }`}>
                              <Target size={14} />
                              {stock.alignmentDirection === 'bullish' ? 'LONG' : 'SHORT'}
                            </div>
                          ) : (
                            <span className="text-gray-600 text-xs">WAIT</span>
                          )}
                        </td>
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
                          <td colSpan={9} className="px-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* 5-Minute Timeframe */}
                              <div className="bg-gray-800/50 rounded-lg p-4 border border-green-700/30">
                                <h4 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                                  <Clock size={16} />
                                  5-Minute Timeframe
                                </h4>
                                <div className="space-y-3">
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <span className="text-gray-400">Direction:</span>
                                      <div className="mt-1">{getDirectionBadge(stock.fiveMin.direction)}</div>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">Liquidity Score:</span>
                                      <div className="mt-1 font-semibold text-cyan-400">{stock.fiveMin.liquidityScore}</div>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <span className="text-gray-400">FVGs (B/B):</span>
                                      <div className="mt-1">
                                        <span className="text-green-400">{stock.fiveMin.bullishFVGCount}</span> / <span className="text-red-400">{stock.fiveMin.bearishFVGCount}</span>
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">Liq Zones:</span>
                                      <div className="mt-1 font-semibold text-orange-400">{stock.fiveMin.liquidityZoneCount}</div>
                                    </div>
                                  </div>
                                  <div className="text-sm">
                                    <span className="text-gray-400">Delta:</span>
                                    <div className="mt-1">
                                      <span className={`font-mono font-semibold ${stock.fiveMin.delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {formatNumber(stock.fiveMin.delta)}
                                      </span>
                                    </div>
                                  </div>
                                  {stock.fiveMin.liquiditySignals.length > 0 && (
                                    <div>
                                      <span className="text-gray-400 text-sm">Signals:</span>
                                      <div className="mt-1 space-y-1">
                                        {stock.fiveMin.liquiditySignals.map((signal, idx) => (
                                          <div key={idx} className="text-xs bg-cyan-500/10 text-cyan-300 px-2 py-1 rounded">
                                            {signal}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Daily Timeframe */}
                              <div className="bg-gray-800/50 rounded-lg p-4 border border-blue-700/30">
                                <h4 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
                                  <TrendingUpDown size={16} />
                                  Daily Timeframe
                                </h4>
                                <div className="space-y-3">
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <span className="text-gray-400">Direction:</span>
                                      <div className="mt-1">{getDirectionBadge(stock.daily.direction)}</div>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">Liquidity Score:</span>
                                      <div className="mt-1 font-semibold text-cyan-400">{stock.daily.liquidityScore}</div>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <span className="text-gray-400">FVGs (B/B):</span>
                                      <div className="mt-1">
                                        <span className="text-green-400">{stock.daily.bullishFVGCount}</span> / <span className="text-red-400">{stock.daily.bearishFVGCount}</span>
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">Liq Zones:</span>
                                      <div className="mt-1 font-semibold text-orange-400">{stock.daily.liquidityZoneCount}</div>
                                    </div>
                                  </div>
                                  <div className="text-sm">
                                    <span className="text-gray-400">Delta:</span>
                                    <div className="mt-1">
                                      <span className={`font-mono font-semibold ${stock.daily.delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {formatNumber(stock.daily.delta)}
                                      </span>
                                    </div>
                                  </div>
                                  {stock.daily.liquiditySignals.length > 0 && (
                                    <div>
                                      <span className="text-gray-400 text-sm">Signals:</span>
                                      <div className="mt-1 space-y-1">
                                        {stock.daily.liquiditySignals.map((signal, idx) => (
                                          <div key={idx} className="text-xs bg-cyan-500/10 text-cyan-300 px-2 py-1 rounded">
                                            {signal}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Alignment Summary */}
                            {stock.aligned && (
                              <div className="mt-4 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <CheckCircle className="text-cyan-400" size={20} />
                                  <span className="font-semibold text-cyan-400">TIMEFRAME ALIGNMENT DETECTED</span>
                                </div>
                                <div className="text-sm text-gray-300">
                                  Both 5-minute and daily timeframes are showing <strong className={stock.alignmentDirection === 'bullish' ? 'text-green-400' : 'text-red-400'}>{stock.alignmentDirection.toUpperCase()}</strong> signals with an alignment strength of <strong className="text-cyan-400">{stock.alignmentStrength}/100</strong>.
                                  {stock.alignmentStrength >= 70 && (
                                    <span className="block mt-2 text-yellow-300">
                                      ⚡ <strong>High-probability setup!</strong> Consider {stock.alignmentDirection === 'bullish' ? 'LONG' : 'SHORT'} entry with proper risk management.
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
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

        {/* Footer Info */}
        {lastUpdate && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()} |
            Showing {filteredStocks.length} of {stocks.length} symbols |
            {alignedCount} aligned setups |
            Auto-refresh: {isAutoRefresh ? 'ON (60s)' : 'OFF'}
          </div>
        )}
      </div>
    </div>
  )
}
