'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, RefreshCw, TrendingUp, TrendingDown, Droplets,
  Activity, Zap, Target, AlertCircle, Filter, ChevronDown, ChevronUp,
  Plus, X, Layers, DollarSign
} from 'lucide-react'

interface LiquidityData {
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
}

interface Stock {
  symbol: string
  price: number
  changePercent: number
  volume: number
  liquidity: LiquidityData
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
  const [minLiquidityScore, setMinLiquidityScore] = useState(50)
  const [minFVGCount, setMinFVGCount] = useState(1)
  const [showOnlyLiquidityZones, setShowOnlyLiquidityZones] = useState(false)
  const [showOnlySignals, setShowOnlySignals] = useState(false)

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

  // Add single symbol
  const addSymbol = (symbol: string) => {
    const s = symbol.trim().toUpperCase()
    if (s && !currentSymbols.includes(s)) {
      const newSymbols = [...currentSymbols, s]
      setCurrentSymbols(newSymbols)
      setActiveWatchlist('custom')
      fetchData(newSymbols)
    }
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
  const filteredStocks = stocks.filter(stock => {
    if (stock.liquidity.liquidityScore < minLiquidityScore) return false
    if (stock.liquidity.activeFVGCount < minFVGCount) return false
    if (showOnlyLiquidityZones && stock.liquidity.liquidityZoneCount === 0) return false
    if (showOnlySignals && stock.liquidity.liquiditySignals.length === 0) return false
    return true
  }).sort((a, b) => b.liquidity.liquidityScore - a.liquidity.liquidityScore)

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`
    return num.toFixed(0)
  }

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
                Liquidity Hunter Scanner
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                FVG Detection & Order Flow Analysis - Custom Symbol Tracking
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-xs mb-1">Symbols Tracked</div>
            <div className="text-2xl font-bold">{currentSymbols.length}</div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-xs mb-1">Showing Results</div>
            <div className="text-2xl font-bold text-cyan-400">{filteredStocks.length}</div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-xs mb-1">Liquidity Zones</div>
            <div className="text-2xl font-bold text-orange-400">
              {stocks.reduce((sum, s) => sum + s.liquidity.liquidityZoneCount, 0)}
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-xs mb-1">Active Signals</div>
            <div className="text-2xl font-bold text-green-400">
              {stocks.reduce((sum, s) => sum + s.liquidity.liquiditySignals.length, 0)}
            </div>
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
              <button
                className="px-4 py-2 rounded-lg bg-purple-600 text-white"
              >
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
                Min Liquidity Score: {minLiquidityScore}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={minLiquidityScore}
                onChange={(e) => setMinLiquidityScore(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-2">
                Min FVG Count: {minFVGCount}
              </label>
              <input
                type="range"
                min="0"
                max="10"
                value={minFVGCount}
                onChange={(e) => setMinFVGCount(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                id="liquidityZonesOnly"
                checked={showOnlyLiquidityZones}
                onChange={(e) => setShowOnlyLiquidityZones(e.target.checked)}
                className="w-5 h-5"
              />
              <label htmlFor="liquidityZonesOnly" className="text-sm">
                Liquidity Zones Only
              </label>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                id="signalsOnly"
                checked={showOnlySignals}
                onChange={(e) => setShowOnlySignals(e.target.checked)}
                className="w-5 h-5"
              />
              <label htmlFor="signalsOnly" className="text-sm">
                Active Signals Only
              </label>
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
                  <p className="text-xs text-gray-500 mt-1">Minimum gap size as % of price</p>
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
                  <p className="text-xs text-gray-500 mt-1">Significant order flow delta</p>
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
                  <p className="text-xs text-gray-500 mt-1">Delta multiplier for liquidity zones</p>
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
                  <th className="px-4 py-3 text-left text-sm font-semibold">Change</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Liq Score</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">FVGs (B/B)</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Liq Zones</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Order Flow</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Delta</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Signals</th>
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
                      {stocks.length === 0
                        ? 'No data yet. Click "Scan Now" to analyze symbols.'
                        : 'No stocks match the current filters.'}
                    </td>
                  </tr>
                ) : (
                  filteredStocks.map((stock) => (
                    <React.Fragment key={stock.symbol}>
                      <tr className="border-t border-gray-700 hover:bg-gray-700/30 transition">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-cyan-400">{stock.symbol}</div>
                        </td>
                        <td className="px-4 py-3 font-mono">${stock.price.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1 ${
                            stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {stock.changePercent >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                            {stock.changePercent.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                            stock.liquidity.liquidityScore >= 80 ? 'bg-green-500/20 text-green-400' :
                            stock.liquidity.liquidityScore >= 60 ? 'bg-cyan-500/20 text-cyan-400' :
                            stock.liquidity.liquidityScore >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {stock.liquidity.liquidityScore}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="text-sm">
                            <span className="text-green-400">{stock.liquidity.bullishFVGCount}</span>
                            {' / '}
                            <span className="text-red-400">{stock.liquidity.bearishFVGCount}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {stock.liquidity.liquidityZoneCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-orange-400 font-semibold">
                              <Target size={16} />
                              {stock.liquidity.liquidityZoneCount}
                            </span>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {stock.liquidity.isSignificantBuying ? (
                            <span className="text-green-400 flex items-center justify-center gap-1 font-semibold">
                              <Zap size={16} /> BUY
                            </span>
                          ) : stock.liquidity.isSignificantSelling ? (
                            <span className="text-red-400 flex items-center justify-center gap-1 font-semibold">
                              <Zap size={16} /> SELL
                            </span>
                          ) : (
                            <span className="text-gray-500">Neutral</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-sm">
                          <span className={stock.liquidity.delta >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {formatNumber(stock.liquidity.delta)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {stock.liquidity.liquiditySignals.length > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm font-semibold">
                              <AlertCircle size={14} />
                              {stock.liquidity.liquiditySignals.length}
                            </span>
                          ) : (
                            <span className="text-gray-500">—</span>
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
                        <tr className="border-t border-gray-700 bg-gray-900/50">
                          <td colSpan={10} className="px-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* Order Flow Details */}
                              <div className="bg-gray-800/50 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                                  <Activity size={16} />
                                  Order Flow Analysis
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Buy Volume:</span>
                                    <span className="font-mono text-green-400">{formatNumber(stock.liquidity.buyVolume)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Sell Volume:</span>
                                    <span className="font-mono text-red-400">{formatNumber(stock.liquidity.sellVolume)}</span>
                                  </div>
                                  <div className="flex justify-between border-t border-gray-700 pt-2">
                                    <span className="text-gray-400">Current Delta:</span>
                                    <span className={`font-mono font-semibold ${stock.liquidity.delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {formatNumber(stock.liquidity.delta)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Avg Delta:</span>
                                    <span className="font-mono">{formatNumber(stock.liquidity.avgAbsDelta)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Delta Ratio:</span>
                                    <span className="font-mono">
                                      {(Math.abs(stock.liquidity.delta) / (stock.liquidity.avgAbsDelta || 1)).toFixed(2)}x
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* FVG Details */}
                              <div className="bg-gray-800/50 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                                  <Layers size={16} />
                                  Fair Value Gaps
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Total Active:</span>
                                    <span className="font-semibold">{stock.liquidity.activeFVGCount}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-green-400">Bullish FVGs:</span>
                                    <span className="font-semibold">{stock.liquidity.bullishFVGCount}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-red-400">Bearish FVGs:</span>
                                    <span className="font-semibold">{stock.liquidity.bearishFVGCount}</span>
                                  </div>
                                  <div className="flex justify-between border-t border-gray-700 pt-2">
                                    <span className="text-orange-400">Liquidity Zones:</span>
                                    <span className="font-semibold text-orange-400">{stock.liquidity.liquidityZoneCount}</span>
                                  </div>
                                  <div className="mt-3 text-xs text-gray-500">
                                    {stock.liquidity.liquidityZoneCount > 0
                                      ? `${stock.liquidity.liquidityZoneCount} zone(s) with strong institutional interest`
                                      : 'No high-delta liquidity zones detected'}
                                  </div>
                                </div>
                              </div>

                              {/* Active Signals */}
                              <div className="bg-gray-800/50 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                                  <AlertCircle size={16} />
                                  Active Signals ({stock.liquidity.liquiditySignals.length})
                                </h4>
                                {stock.liquidity.liquiditySignals.length > 0 ? (
                                  <div className="space-y-2">
                                    {stock.liquidity.liquiditySignals.map((signal, idx) => (
                                      <div
                                        key={idx}
                                        className={`text-sm px-3 py-2 rounded ${
                                          signal.includes('BULLISH')
                                            ? 'bg-green-500/10 text-green-300 border border-green-500/30'
                                            : 'bg-red-500/10 text-red-300 border border-red-500/30'
                                        }`}
                                      >
                                        {signal}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-500 py-4 text-center">
                                    No active liquidity signals
                                  </div>
                                )}

                                {stock.liquidity.liquidityScore >= 70 && (
                                  <div className="mt-3 p-2 bg-cyan-500/10 border border-cyan-500/30 rounded text-xs text-cyan-300">
                                    <strong>High liquidity score</strong> - Strong market interest detected
                                  </div>
                                )}
                              </div>
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

        {/* Footer Info */}
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
