'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, RefreshCw, TrendingUp, TrendingDown, Droplets,
  Activity, Zap, Target, AlertCircle, Filter, ChevronDown, ChevronUp
} from 'lucide-react'

interface Stock {
  symbol: string
  name: string
  price: number
  changePercent: number
  volume: number
  liquidity?: {
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

export default function LiquidityWatchlist() {
  const [stocks, setStocks] = useState<Stock[]>([])
  const [filteredStocks, setFilteredStocks] = useState<Stock[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [minLiquidityScore, setMinLiquidityScore] = useState(60)
  const [minFVGCount, setMinFVGCount] = useState(1)
  const [showOnlyLiquidityZones, setShowOnlyLiquidityZones] = useState(false)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  // Fetch data
  const fetchData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/stocks')
      const result = await response.json()

      if (result.status === 'success' && result.data) {
        // Filter stocks with liquidity data
        const stocksWithLiquidity = result.data.filter((s: Stock) => s.liquidity)
        setStocks(stocksWithLiquidity)
        setLastUpdate(new Date())
      }
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

    const interval = setInterval(() => {
      fetchData()
    }, 120000) // Refresh every 2 minutes

    return () => clearInterval(interval)
  }, [isAutoRefresh])

  // Filter stocks
  useEffect(() => {
    let filtered = stocks.filter(stock => {
      if (!stock.liquidity) return false

      // Min liquidity score
      if (stock.liquidity.liquidityScore < minLiquidityScore) return false

      // Min FVG count
      if (stock.liquidity.activeFVGCount < minFVGCount) return false

      // Only liquidity zones
      if (showOnlyLiquidityZones && stock.liquidity.liquidityZoneCount === 0) return false

      return true
    })

    // Sort by liquidity score
    filtered.sort((a, b) =>
      (b.liquidity?.liquidityScore || 0) - (a.liquidity?.liquidityScore || 0)
    )

    setFilteredStocks(filtered)
  }, [stocks, minLiquidityScore, minFVGCount, showOnlyLiquidityZones])

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`
    return num.toFixed(0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-400 hover:text-white transition">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Droplets className="text-cyan-400" size={32} />
                Liquidity Hunter Watchlist
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Live FVG Detection & Order Flow Analysis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
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
              onClick={fetchData}
              disabled={isLoading}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Total Stocks</div>
            <div className="text-2xl font-bold">{stocks.length}</div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Filtered Results</div>
            <div className="text-2xl font-bold text-cyan-400">{filteredStocks.length}</div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Liquidity Zones</div>
            <div className="text-2xl font-bold text-green-400">
              {stocks.reduce((sum, s) => sum + (s.liquidity?.liquidityZoneCount || 0), 0)}
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Last Update</div>
            <div className="text-sm font-medium">
              {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-cyan-400" />
            <span className="font-semibold">Filters</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <th className="px-4 py-3 text-left text-sm font-semibold">Volume</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Liquidity Score</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">FVGs</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Zones</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Order Flow</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Signals</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                      <RefreshCw className="animate-spin inline-block mr-2" size={20} />
                      Loading...
                    </td>
                  </tr>
                ) : filteredStocks.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                      No stocks match the current filters
                    </td>
                  </tr>
                ) : (
                  filteredStocks.map((stock) => (
                    <React.Fragment key={stock.symbol}>
                      <tr className="border-t border-gray-700 hover:bg-gray-700/30 transition">
                        <td className="px-4 py-3">
                          <div className="font-semibold">{stock.symbol}</div>
                          <div className="text-xs text-gray-400">{stock.name}</div>
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
                        <td className="px-4 py-3 text-sm">{formatNumber(stock.volume)}</td>
                        <td className="px-4 py-3 text-center">
                          <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                            (stock.liquidity?.liquidityScore || 0) >= 80 ? 'bg-green-500/20 text-green-400' :
                            (stock.liquidity?.liquidityScore || 0) >= 60 ? 'bg-cyan-500/20 text-cyan-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {stock.liquidity?.liquidityScore || 0}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="text-sm">
                            <span className="text-green-400">{stock.liquidity?.bullishFVGCount || 0}</span>
                            {' / '}
                            <span className="text-red-400">{stock.liquidity?.bearishFVGCount || 0}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-semibold ${
                            (stock.liquidity?.liquidityZoneCount || 0) > 0 ? 'text-orange-400' : 'text-gray-500'
                          }`}>
                            {stock.liquidity?.liquidityZoneCount || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {stock.liquidity?.isSignificantBuying ? (
                            <span className="text-green-400 flex items-center justify-center gap-1">
                              <Zap size={16} /> BUY
                            </span>
                          ) : stock.liquidity?.isSignificantSelling ? (
                            <span className="text-red-400 flex items-center justify-center gap-1">
                              <Zap size={16} /> SELL
                            </span>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {(stock.liquidity?.liquiditySignals?.length || 0) > 0 ? (
                            <span className="text-cyan-400 font-semibold">
                              {stock.liquidity?.liquiditySignals?.length}
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
                      {expandedRow === stock.symbol && stock.liquidity && (
                        <tr className="border-t border-gray-700 bg-gray-900/50">
                          <td colSpan={10} className="px-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <h4 className="text-sm font-semibold text-cyan-400 mb-2">Order Flow Details</h4>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Delta:</span>
                                    <span className="font-mono">{formatNumber(stock.liquidity.delta)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Avg Delta:</span>
                                    <span className="font-mono">{formatNumber(stock.liquidity.avgAbsDelta)}</span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h4 className="text-sm font-semibold text-cyan-400 mb-2">Fair Value Gaps</h4>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Active FVGs:</span>
                                    <span className="font-semibold">{stock.liquidity.activeFVGCount}</span>
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
                                <h4 className="text-sm font-semibold text-cyan-400 mb-2">Active Signals</h4>
                                {stock.liquidity.liquiditySignals && stock.liquidity.liquiditySignals.length > 0 ? (
                                  <div className="space-y-1">
                                    {stock.liquidity.liquiditySignals.map((signal, idx) => (
                                      <div key={idx} className="text-sm bg-cyan-500/10 text-cyan-300 px-2 py-1 rounded">
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
