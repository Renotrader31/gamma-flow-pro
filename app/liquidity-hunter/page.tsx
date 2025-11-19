'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Droplets,
  Zap,
  Filter,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Save,
  Download,
  Settings,
  Activity,
  Target,
  AlertCircle,
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Stock {
  symbol: string
  price: number
  changePercent: number
  volume: number
  liquidity: {
    activeFVGCount: number
    bullishFVGCount: number
    bearishFVGCount: number
    liquidityZoneCount: number
    delta: number
    avgAbsDelta: number
    isSignificantBuying: boolean
    isSignificantSelling: boolean
    liquidityScore: number
    liquiditySignals: string[]
  }
}

type SortField = 'symbol' | 'price' | 'changePercent' | 'volume' | 'liquidityScore' | 'fvgCount' | 'zones'
type SortDirection = 'asc' | 'desc'

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT SYMBOLS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_SYMBOLS = [
  'NVDA',
  'TSLA',
  'AAPL',
  'MSFT',
  'META',
  'GOOGL',
  'AMZN',
  'AMD',
  'SPY',
  'QQQ',
]

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function LiquidityHunterWatchlist() {
  // State
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS)
  const [stocks, setStocks] = useState<Stock[]>([])
  const [filteredStocks, setFilteredStocks] = useState<Stock[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(120) // seconds
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Symbol management
  const [newSymbol, setNewSymbol] = useState('')
  const [showAddSymbol, setShowAddSymbol] = useState(false)

  // Filtering & Sorting
  const [minLiquidityScore, setMinLiquidityScore] = useState(0)
  const [minFVGCount, setMinFVGCount] = useState(0)
  const [showOnlyLiquidityZones, setShowOnlyLiquidityZones] = useState(false)
  const [showOnlyBullish, setShowOnlyBullish] = useState(false)
  const [showOnlyBearish, setShowOnlyBearish] = useState(false)
  const [sortField, setSortField] = useState<SortField>('liquidityScore')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Settings
  const [showSettings, setShowSettings] = useState(false)
  const [fvgThreshold, setFvgThreshold] = useState(0.5)
  const [deltaThreshold, setDeltaThreshold] = useState(1000)

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCALSTORAGE PERSISTENCE
  // ═══════════════════════════════════════════════════════════════════════════

  // Load saved symbols on mount
  useEffect(() => {
    const saved = localStorage.getItem('liquidityHunter_symbols')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSymbols(parsed)
        }
      } catch (e) {
        console.error('Error loading saved symbols:', e)
      }
    }

    // Load saved settings
    const savedSettings = localStorage.getItem('liquidityHunter_settings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        if (parsed.fvgThreshold) setFvgThreshold(parsed.fvgThreshold)
        if (parsed.deltaThreshold) setDeltaThreshold(parsed.deltaThreshold)
        if (parsed.refreshInterval) setRefreshInterval(parsed.refreshInterval)
      } catch (e) {
        console.error('Error loading settings:', e)
      }
    }
  }, [])

  // Save symbols when they change
  const saveSymbols = useCallback(() => {
    localStorage.setItem('liquidityHunter_symbols', JSON.stringify(symbols))
  }, [symbols])

  // Save settings
  const saveSettings = useCallback(() => {
    localStorage.setItem(
      'liquidityHunter_settings',
      JSON.stringify({
        fvgThreshold,
        deltaThreshold,
        refreshInterval,
      })
    )
    setShowSettings(false)
  }, [fvgThreshold, deltaThreshold, refreshInterval])

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════════════

  const fetchData = useCallback(async () => {
    if (symbols.length === 0) {
      setError('Add symbols to your watchlist to get started')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const symbolsParam = symbols.join(',')
      const url = `/api/liquidity-hunter?symbols=${symbolsParam}&fvgThreshold=${fvgThreshold}&deltaThreshold=${deltaThreshold}`

      const response = await fetch(url)
      const result = await response.json()

      if (result.status === 'success' && result.data) {
        setStocks(result.data)
        setLastUpdate(new Date())
      } else {
        setError(result.error || 'Failed to fetch data')
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Network error - check your connection')
    } finally {
      setIsLoading(false)
    }
  }, [symbols, fvgThreshold, deltaThreshold])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, []) // Only on mount

  // Auto-refresh
  useEffect(() => {
    if (!isAutoRefresh) return

    const interval = setInterval(() => {
      fetchData()
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [isAutoRefresh, refreshInterval, fetchData])

  // ═══════════════════════════════════════════════════════════════════════════
  // SYMBOL MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  const addSymbol = () => {
    const symbol = newSymbol.trim().toUpperCase()
    if (symbol && !symbols.includes(symbol)) {
      const updated = [...symbols, symbol]
      setSymbols(updated)
      localStorage.setItem('liquidityHunter_symbols', JSON.stringify(updated))
      setNewSymbol('')
      setShowAddSymbol(false)
      // Auto-fetch with new symbol
      setTimeout(() => fetchData(), 100)
    }
  }

  const removeSymbol = (symbol: string) => {
    const updated = symbols.filter(s => s !== symbol)
    setSymbols(updated)
    localStorage.setItem('liquidityHunter_symbols', JSON.stringify(updated))
    setStocks(stocks.filter(s => s.symbol !== symbol))
  }

  const resetToDefaults = () => {
    setSymbols(DEFAULT_SYMBOLS)
    localStorage.setItem('liquidityHunter_symbols', JSON.stringify(DEFAULT_SYMBOLS))
    setTimeout(() => fetchData(), 100)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTERING & SORTING
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    let filtered = stocks.filter(stock => {
      // Min liquidity score
      if (stock.liquidity.liquidityScore < minLiquidityScore) return false

      // Min FVG count
      if (stock.liquidity.activeFVGCount < minFVGCount) return false

      // Only liquidity zones
      if (showOnlyLiquidityZones && stock.liquidity.liquidityZoneCount === 0) return false

      // Only bullish
      if (showOnlyBullish && stock.liquidity.bullishFVGCount === 0) return false

      // Only bearish
      if (showOnlyBearish && stock.liquidity.bearishFVGCount === 0) return false

      return true
    })

    // Sort
    filtered.sort((a, b) => {
      let aVal: number
      let bVal: number

      switch (sortField) {
        case 'symbol':
          return sortDirection === 'asc'
            ? a.symbol.localeCompare(b.symbol)
            : b.symbol.localeCompare(a.symbol)
        case 'price':
          aVal = a.price
          bVal = b.price
          break
        case 'changePercent':
          aVal = a.changePercent
          bVal = b.changePercent
          break
        case 'volume':
          aVal = a.volume
          bVal = b.volume
          break
        case 'liquidityScore':
          aVal = a.liquidity.liquidityScore
          bVal = b.liquidity.liquidityScore
          break
        case 'fvgCount':
          aVal = a.liquidity.activeFVGCount
          bVal = b.liquidity.activeFVGCount
          break
        case 'zones':
          aVal = a.liquidity.liquidityZoneCount
          bVal = b.liquidity.liquidityZoneCount
          break
        default:
          aVal = 0
          bVal = 0
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
    })

    setFilteredStocks(filtered)
  }, [
    stocks,
    minLiquidityScore,
    minFVGCount,
    showOnlyLiquidityZones,
    showOnlyBullish,
    showOnlyBearish,
    sortField,
    sortDirection,
  ])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORT
  // ═══════════════════════════════════════════════════════════════════════════

  const exportToCSV = () => {
    const headers = [
      'Symbol',
      'Price',
      'Change %',
      'Volume',
      'Liquidity Score',
      'Active FVGs',
      'Bullish FVGs',
      'Bearish FVGs',
      'Liquidity Zones',
      'Delta',
      'Signals',
    ]

    const rows = filteredStocks.map(stock => [
      stock.symbol,
      stock.price.toFixed(2),
      stock.changePercent.toFixed(2),
      stock.volume,
      stock.liquidity.liquidityScore,
      stock.liquidity.activeFVGCount,
      stock.liquidity.bullishFVGCount,
      stock.liquidity.bearishFVGCount,
      stock.liquidity.liquidityZoneCount,
      stock.liquidity.delta.toFixed(0),
      stock.liquidity.liquiditySignals.join(' | '),
    ])

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `liquidity-hunter-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`
    return num.toFixed(0)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

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
                Liquidity Hunter Pro
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Custom Watchlist • FVG Detection • Order Flow Analysis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition"
              title="Settings"
            >
              <Settings size={20} />
            </button>

            <button
              onClick={exportToCSV}
              disabled={filteredStocks.length === 0}
              className="px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition disabled:opacity-50 flex items-center gap-2"
              title="Export to CSV"
            >
              <Download size={16} />
              Export
            </button>

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
              onClick={fetchData}
              disabled={isLoading}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-gray-800/90 backdrop-blur rounded-lg p-6 border border-cyan-500/30 mb-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Settings size={20} className="text-cyan-400" />
              Configuration
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  FVG Threshold (%): {fvgThreshold}
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="2.0"
                  step="0.1"
                  value={fvgThreshold}
                  onChange={e => setFvgThreshold(parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum gap size to detect FVGs</p>
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  Delta Threshold: {deltaThreshold}
                </label>
                <input
                  type="range"
                  min="100"
                  max="5000"
                  step="100"
                  value={deltaThreshold}
                  onChange={e => setDeltaThreshold(parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">Significant order flow threshold</p>
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  Refresh Interval: {refreshInterval}s
                </label>
                <select
                  value={refreshInterval}
                  onChange={e => setRefreshInterval(parseInt(e.target.value))}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white"
                >
                  <option value={30}>30 seconds</option>
                  <option value={60}>1 minute</option>
                  <option value={120}>2 minutes</option>
                  <option value={300}>5 minutes</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={saveSettings}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition flex items-center gap-2"
              >
                <Save size={16} />
                Save Settings
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Symbol Management */}
        <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Target size={18} className="text-cyan-400" />
              Watchlist Symbols ({symbols.length})
            </h3>
            <div className="flex gap-2">
              <button
                onClick={resetToDefaults}
                className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded transition"
              >
                Reset to Defaults
              </button>
              <button
                onClick={saveSymbols}
                className="text-xs px-3 py-1 bg-cyan-600 hover:bg-cyan-700 rounded transition flex items-center gap-1"
              >
                <Save size={14} />
                Save
              </button>
              <button
                onClick={() => setShowAddSymbol(!showAddSymbol)}
                className="text-xs px-3 py-1 bg-green-600 hover:bg-green-700 rounded transition flex items-center gap-1"
              >
                <Plus size={14} />
                Add Symbol
              </button>
            </div>
          </div>

          {/* Add Symbol Input */}
          {showAddSymbol && (
            <div className="mb-3 flex gap-2">
              <input
                type="text"
                value={newSymbol}
                onChange={e => setNewSymbol(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && addSymbol()}
                placeholder="Enter symbol (e.g., AAPL)"
                className="flex-1 bg-gray-700 rounded px-3 py-2 text-white placeholder-gray-400"
                autoFocus
              />
              <button
                onClick={addSymbol}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddSymbol(false)
                  setNewSymbol('')
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Symbol Pills */}
          <div className="flex flex-wrap gap-2">
            {symbols.map(symbol => (
              <div
                key={symbol}
                className="bg-gray-700/50 px-3 py-1 rounded-full text-sm flex items-center gap-2 group hover:bg-gray-700 transition"
              >
                <span className="font-mono font-semibold">{symbol}</span>
                <button
                  onClick={() => removeSymbol(symbol)}
                  className="text-gray-400 hover:text-red-400 transition"
                  title="Remove"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Total Symbols</div>
            <div className="text-2xl font-bold">{symbols.length}</div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Filtered Results</div>
            <div className="text-2xl font-bold text-cyan-400">{filteredStocks.length}</div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Liquidity Zones</div>
            <div className="text-2xl font-bold text-orange-400">
              {stocks.reduce((sum, s) => sum + s.liquidity.liquidityZoneCount, 0)}
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Active FVGs</div>
            <div className="text-2xl font-bold text-green-400">
              {stocks.reduce((sum, s) => sum + s.liquidity.activeFVGCount, 0)}
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Last Update</div>
            <div className="text-sm font-medium">
              {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
            </div>
            {isLoading && (
              <div className="text-xs text-cyan-400 mt-1 flex items-center gap-1">
                <Activity size={12} className="animate-pulse" />
                Updating...
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="text-red-400" size={20} />
            <div>
              <div className="font-semibold text-red-400">Error</div>
              <div className="text-sm text-red-300">{error}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-cyan-400" />
            <span className="font-semibold">Filters & Sorting</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-gray-400 block mb-2">
                Min Liquidity Score: {minLiquidityScore}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={minLiquidityScore}
                onChange={e => setMinLiquidityScore(Number(e.target.value))}
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
                onChange={e => setMinFVGCount(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-2">Sort By</label>
              <select
                value={sortField}
                onChange={e => setSortField(e.target.value as SortField)}
                className="w-full bg-gray-700 rounded px-3 py-2 text-white text-sm"
              >
                <option value="liquidityScore">Liquidity Score</option>
                <option value="fvgCount">FVG Count</option>
                <option value="zones">Liquidity Zones</option>
                <option value="volume">Volume</option>
                <option value="changePercent">Change %</option>
                <option value="price">Price</option>
                <option value="symbol">Symbol</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showOnlyLiquidityZones}
                  onChange={e => setShowOnlyLiquidityZones(e.target.checked)}
                  className="w-4 h-4"
                />
                Zones Only
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showOnlyBullish}
                  onChange={e => setShowOnlyBullish(e.target.checked)}
                  className="w-4 h-4"
                />
                Bullish Only
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showOnlyBearish}
                  onChange={e => setShowOnlyBearish(e.target.checked)}
                  className="w-4 h-4"
                />
                Bearish Only
              </label>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-gray-800/50 backdrop-blur rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-800/50"
                    onClick={() => toggleSort('symbol')}
                  >
                    Symbol {sortField === 'symbol' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-800/50"
                    onClick={() => toggleSort('price')}
                  >
                    Price {sortField === 'price' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-800/50"
                    onClick={() => toggleSort('changePercent')}
                  >
                    Change {sortField === 'changePercent' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-800/50"
                    onClick={() => toggleSort('volume')}
                  >
                    Volume {sortField === 'volume' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 py-3 text-center text-sm font-semibold cursor-pointer hover:bg-gray-800/50"
                    onClick={() => toggleSort('liquidityScore')}
                  >
                    Score {sortField === 'liquidityScore' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 py-3 text-center text-sm font-semibold cursor-pointer hover:bg-gray-800/50"
                    onClick={() => toggleSort('fvgCount')}
                  >
                    FVGs {sortField === 'fvgCount' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 py-3 text-center text-sm font-semibold cursor-pointer hover:bg-gray-800/50"
                    onClick={() => toggleSort('zones')}
                  >
                    Zones {sortField === 'zones' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Order Flow</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Signals</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading && stocks.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                      <RefreshCw className="animate-spin inline-block mr-2" size={20} />
                      Loading...
                    </td>
                  </tr>
                ) : filteredStocks.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                      {stocks.length === 0
                        ? 'No data yet - click Refresh to load'
                        : 'No stocks match the current filters'}
                    </td>
                  </tr>
                ) : (
                  filteredStocks.map(stock => (
                    <React.Fragment key={stock.symbol}>
                      <tr className="border-t border-gray-700 hover:bg-gray-700/30 transition">
                        <td className="px-4 py-3">
                          <div className="font-semibold font-mono">{stock.symbol}</div>
                        </td>
                        <td className="px-4 py-3 font-mono">${stock.price.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`flex items-center gap-1 ${
                              stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {stock.changePercent >= 0 ? (
                              <TrendingUp size={16} />
                            ) : (
                              <TrendingDown size={16} />
                            )}
                            {stock.changePercent.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{formatNumber(stock.volume)}</td>
                        <td className="px-4 py-3 text-center">
                          <div
                            className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                              stock.liquidity.liquidityScore >= 80
                                ? 'bg-green-500/20 text-green-400'
                                : stock.liquidity.liquidityScore >= 60
                                ? 'bg-cyan-500/20 text-cyan-400'
                                : stock.liquidity.liquidityScore >= 40
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}
                          >
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
                          <span
                            className={`font-semibold ${
                              stock.liquidity.liquidityZoneCount > 0
                                ? 'text-orange-400'
                                : 'text-gray-500'
                            }`}
                          >
                            {stock.liquidity.liquidityZoneCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {stock.liquidity.isSignificantBuying ? (
                            <span className="text-green-400 flex items-center justify-center gap-1">
                              <Zap size={16} /> BUY
                            </span>
                          ) : stock.liquidity.isSignificantSelling ? (
                            <span className="text-red-400 flex items-center justify-center gap-1">
                              <Zap size={16} /> SELL
                            </span>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {stock.liquidity.liquiditySignals.length > 0 ? (
                            <span className="text-cyan-400 font-semibold">
                              {stock.liquidity.liquiditySignals.length}
                            </span>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() =>
                              setExpandedRow(expandedRow === stock.symbol ? null : stock.symbol)
                            }
                            className="text-cyan-400 hover:text-cyan-300 transition"
                          >
                            {expandedRow === stock.symbol ? (
                              <ChevronUp size={20} />
                            ) : (
                              <ChevronDown size={20} />
                            )}
                          </button>
                        </td>
                      </tr>
                      {expandedRow === stock.symbol && (
                        <tr className="border-t border-gray-700 bg-gray-900/50">
                          <td colSpan={10} className="px-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <h4 className="text-sm font-semibold text-cyan-400 mb-2">
                                  Order Flow Details
                                </h4>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Delta:</span>
                                    <span className="font-mono">
                                      {formatNumber(stock.liquidity.delta)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Avg Delta:</span>
                                    <span className="font-mono">
                                      {formatNumber(stock.liquidity.avgAbsDelta)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h4 className="text-sm font-semibold text-cyan-400 mb-2">
                                  Fair Value Gaps
                                </h4>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Active FVGs:</span>
                                    <span className="font-semibold">
                                      {stock.liquidity.activeFVGCount}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-green-400">Bullish:</span>
                                    <span>{stock.liquidity.bullishFVGCount}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-red-400">Bearish:</span>
                                    <span>{stock.liquidity.bearishFVGCount}</span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h4 className="text-sm font-semibold text-cyan-400 mb-2">
                                  Active Signals
                                </h4>
                                {stock.liquidity.liquiditySignals.length > 0 ? (
                                  <div className="space-y-1">
                                    {stock.liquidity.liquiditySignals.map((signal, idx) => (
                                      <div
                                        key={idx}
                                        className="text-sm bg-cyan-500/10 text-cyan-300 px-2 py-1 rounded"
                                      >
                                        {signal}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-500">No active signals</div>
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
      </div>
    </div>
  )
}
