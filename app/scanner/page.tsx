'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Zap, TrendingUp, Clock, Users, Building2, Briefcase,
  Target, Activity, Brain, Sparkles, RefreshCw, Filter, Search,
  ChevronRight, DollarSign, Percent, Hash, Calendar, AlertTriangle,
  TrendingDown, Radio, Eye, BarChart3, Flame, Shield
} from 'lucide-react'

type ScanMode = 'intraday' | 'swing' | 'longterm'

interface ScanResult {
  symbol: string
  company: string
  price: number
  change: number
  changePercent: number
  volume: number
  score: number
  signals: string[]
  reasoning: string
  mode: ScanMode
  timestamp: Date
}

export default function ScannerHub() {
  const router = useRouter()
  const [activeMode, setActiveMode] = useState<ScanMode>('intraday')
  const [scanResults, setScanResults] = useState<ScanResult[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [lastScan, setLastScan] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [filterScore, setFilterScore] = useState(70)

  // Auto-refresh intervals based on mode
  const refreshIntervals = {
    intraday: 60000,   // 60 seconds
    swing: 300000,     // 5 minutes
    longterm: 3600000  // 1 hour
  }

  // Run scan on mount and when mode changes
  useEffect(() => {
    runScan()
  }, [activeMode])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      runScan()
    }, refreshIntervals[activeMode])

    return () => clearInterval(interval)
  }, [autoRefresh, activeMode])

  const runScan = async () => {
    setIsScanning(true)
    try {
      const response = await fetch(`/api/scanner/${activeMode}`)
      const data = await response.json()

      if (data.results) {
        setScanResults(data.results.filter((r: ScanResult) => r.score >= filterScore))
        setLastScan(new Date())
      }
    } catch (error) {
      console.error('Scan error:', error)
    } finally {
      setIsScanning(false)
    }
  }

  const getModeInfo = (mode: ScanMode) => {
    const modeData = {
      intraday: {
        title: 'Intraday Scalper',
        description: '0-2 DTE options, GEX pivots, 60-second refresh',
        icon: Zap,
        color: 'purple',
        refresh: '60s',
        targets: ['SPY', 'QQQ', 'IWM', 'High gamma stocks'],
        strategies: ['0DTE scalps', 'GEX wall fades', 'Flow pressure plays']
      },
      swing: {
        title: 'Swing Trading',
        description: '30-45 DTE spreads, multi-day holds, 5-minute refresh',
        icon: TrendingUp,
        color: 'blue',
        refresh: '5min',
        targets: ['Top 50 tickers', 'Earnings plays', 'Momentum stocks'],
        strategies: ['Bull/Bear spreads', 'Iron condors', 'Calendar spreads']
      },
      longterm: {
        title: 'Long-Term Investment',
        description: 'Congress tracking (30%), 13F filings, hourly refresh',
        icon: Building2,
        color: 'green',
        refresh: '1hr',
        targets: ['Blue chips', 'Congress buys', 'Institutional accumulation'],
        strategies: ['Stock positions', 'LEAPS', 'Covered calls']
      }
    }
    return modeData[mode]
  }

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`
    return `$${num.toFixed(2)}`
  }

  const currentMode = getModeInfo(activeMode)
  const ModeIcon = currentMode.icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => router.push('/')}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-4xl font-bold flex items-center gap-3">
                <Brain className="w-10 h-10 text-purple-400" />
                Institutional Scanner Pro
                {isScanning && (
                  <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
                )}
              </h1>
            </div>
            <p className="text-gray-400 ml-16">Multi-mode professional scanning with Congress tracking</p>
            {lastScan && (
              <div className="flex items-center gap-2 ml-16 mt-1">
                <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                <span className="text-xs text-gray-500">
                  Last scan: {lastScan.toLocaleTimeString()} • Next: {autoRefresh ? currentMode.refresh : 'Paused'}
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                autoRefresh ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <Radio className="w-4 h-4" />
              {autoRefresh ? 'Live' : 'Paused'}
            </button>
            <button
              onClick={() => router.push('/portfolio')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2 transition-all"
            >
              <Briefcase className="w-4 h-4" />
              Portfolio
            </button>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {(['intraday', 'swing', 'longterm'] as ScanMode[]).map((mode) => {
            const info = getModeInfo(mode)
            const Icon = info.icon
            const isActive = activeMode === mode

            return (
              <button
                key={mode}
                onClick={() => setActiveMode(mode)}
                className={`p-6 rounded-xl border-2 transition-all ${
                  isActive
                    ? `bg-${info.color}-900/30 border-${info.color}-500 shadow-lg shadow-${info.color}-500/20`
                    : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <Icon className={`w-8 h-8 ${isActive ? `text-${info.color}-400` : 'text-gray-400'}`} />
                  <div className={`px-2 py-1 rounded text-xs font-bold ${
                    isActive ? `bg-${info.color}-500/20 text-${info.color}-300` : 'bg-gray-700 text-gray-400'
                  }`}>
                    {info.refresh}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2">{info.title}</h3>
                <p className="text-sm text-gray-400 mb-4">{info.description}</p>

                <div className="space-y-2">
                  <div className="text-xs text-gray-500">Targets:</div>
                  <div className="flex flex-wrap gap-1">
                    {info.targets.map((target, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-700/50 rounded text-xs">
                        {target}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Current Mode Info */}
        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <ModeIcon className={`w-10 h-10 text-${currentMode.color}-400`} />
            <div>
              <h2 className="text-2xl font-bold">{currentMode.title} Mode</h2>
              <p className="text-gray-400">{currentMode.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-400 mb-2">Strategies</div>
              <div className="space-y-1">
                {currentMode.strategies.map((strategy, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Target className="w-4 h-4 text-green-400" />
                    {strategy}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-400 mb-2">Refresh Rate</div>
              <div className="text-3xl font-bold text-purple-400">{currentMode.refresh}</div>
              <div className="text-sm text-gray-500 mt-1">Auto-scanning {autoRefresh ? 'ON' : 'OFF'}</div>
            </div>

            <div>
              <div className="text-sm text-gray-400 mb-2">Results</div>
              <div className="text-3xl font-bold text-blue-400">{scanResults.length}</div>
              <div className="text-sm text-gray-500 mt-1">Score ≥ {filterScore}</div>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-4 mb-6 bg-gray-800/50 p-4 rounded-xl border border-gray-700">
          <Filter className="w-5 h-5 text-gray-400" />
          <div className="flex items-center gap-3 flex-1">
            <span className="text-sm text-gray-400">Min Score:</span>
            <input
              type="range"
              min="50"
              max="95"
              step="5"
              value={filterScore}
              onChange={(e) => setFilterScore(parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm font-bold text-purple-400 w-12">{filterScore}</span>
          </div>
          <button
            onClick={runScan}
            disabled={isScanning}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            Scan Now
          </button>
        </div>

        {/* Results Table */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700 bg-gray-900/50">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Scan Results ({scanResults.length})
            </h3>
          </div>

          {scanResults.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500">
                {isScanning ? 'Scanning markets...' : 'No results found. Try lowering the minimum score.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/70">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Symbol</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Company</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Price</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Change</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Volume</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Score</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Signals</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {scanResults.map((result, idx) => (
                    <tr
                      key={`${result.symbol}-${idx}`}
                      className="hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-lg">{result.symbol}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-400">{result.company}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-semibold">${result.price.toFixed(2)}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className={`flex items-center justify-end gap-1 ${
                          result.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {result.changePercent >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          {result.changePercent >= 0 ? '+' : ''}{result.changePercent.toFixed(2)}%
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm">{formatNumber(result.volume)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <div className={`px-3 py-1 rounded-full font-bold ${
                            result.score >= 85 ? 'bg-green-900/30 text-green-400 border border-green-500/50' :
                            result.score >= 70 ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/50' :
                            'bg-gray-700/30 text-gray-400 border border-gray-500/50'
                          }`}>
                            {result.score}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {result.signals.slice(0, 3).map((signal, i) => (
                            <span key={i} className="px-2 py-1 bg-purple-900/30 text-purple-300 rounded text-xs">
                              {signal}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => router.push(`/?symbol=${result.symbol}`)}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded flex items-center gap-2 ml-auto transition-all"
                        >
                          Analyze
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="mt-8 grid grid-cols-4 gap-4">
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm">High Conviction</span>
            </div>
            <div className="text-2xl font-bold text-green-400">
              {scanResults.filter(r => r.score >= 85).length}
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Target className="w-4 h-4" />
              <span className="text-sm">Medium Conviction</span>
            </div>
            <div className="text-2xl font-bold text-yellow-400">
              {scanResults.filter(r => r.score >= 70 && r.score < 85).length}
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Activity className="w-4 h-4" />
              <span className="text-sm">Active Mode</span>
            </div>
            <div className="text-2xl font-bold text-purple-400">
              {currentMode.title.split(' ')[0]}
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Refresh Rate</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">
              {currentMode.refresh}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
