'use client'

import React, { useState, useEffect } from 'react'
import {
  Briefcase, Plus, Upload, Download, TrendingUp, TrendingDown,
  DollarSign, Activity, PieChart, Filter, Search, X, Edit2,
  Trash2, Check, AlertCircle, BarChart3, Calendar, Target,
  Percent, RefreshCw, Eye, EyeOff, ChevronDown, Settings
} from 'lucide-react'
import {
  loadPortfolioData,
  savePortfolioData,
  createPortfolio,
  addTrade,
  updateTrade,
  deleteTrade,
  getTrades,
  getOverallStats,
  importTrades,
  deletePortfolio
} from '../lib/portfolio-storage'
import { Portfolio, Trade, TradeFormData } from '../lib/portfolio-types'

export default function PortfolioPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('all')
  const [trades, setTrades] = useState<Trade[]>([])
  const [showAddTrade, setShowAddTrade] = useState(false)
  const [showAddPortfolio, setShowAddPortfolio] = useState(false)
  const [showImportCSV, setShowImportCSV] = useState(false)
  const [viewMode, setViewMode] = useState<'all' | 'open' | 'closed'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
  const [livePrices, setLivePrices] = useState<{[symbol: string]: number}>({})
  const [pricesLoading, setPricesLoading] = useState(false)
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date>(new Date())

  // Load data on mount
  useEffect(() => {
    refreshData()
  }, [])

  const refreshData = () => {
    const data = loadPortfolioData()
    setPortfolios(data.portfolios)

    if (selectedPortfolioId === 'all') {
      setTrades(data.trades)
    } else {
      setTrades(getTrades(selectedPortfolioId))
    }
  }

  // Fetch real-time prices for open positions
  const fetchLivePrices = async () => {
    const openTrades = trades.filter(t => t.status === 'open')
    if (openTrades.length === 0) return

    const symbols = [...new Set(openTrades.map(t => t.symbol))]

    try {
      setPricesLoading(true)
      const response = await fetch('/api/stocks')
      const result = await response.json()

      if (result.status === 'success' && result.data) {
        const priceMap: {[symbol: string]: number} = {}

        result.data.forEach((stock: any) => {
          if (symbols.includes(stock.symbol)) {
            priceMap[stock.symbol] = stock.price
          }
        })

        setLivePrices(priceMap)
        setLastPriceUpdate(new Date())

        // Update trades with current prices and unrealized P&L
        const data = loadPortfolioData()
        let updated = false

        data.trades.forEach(trade => {
          if (trade.status === 'open' && priceMap[trade.symbol]) {
            const currentPrice = priceMap[trade.symbol]
            const priceDiff = currentPrice - trade.entryPrice
            const unrealizedPL = priceDiff * trade.quantity

            if (trade.currentPrice !== currentPrice || trade.unrealizedPL !== unrealizedPL) {
              trade.currentPrice = currentPrice
              trade.unrealizedPL = unrealizedPL
              updated = true
            }
          }
        })

        if (updated) {
          savePortfolioData(data)

          // Recalculate portfolio stats
          const portfolioIds = new Set(data.trades.map(t => t.portfolioId))
          portfolioIds.forEach(id => {
            const portfolio = data.portfolios.find(p => p.id === id)
            if (portfolio) {
              const portfolioTrades = data.trades.filter(t => t.portfolioId === id)
              const totalUnrealizedPL = portfolioTrades
                .filter(t => t.status === 'open')
                .reduce((sum, t) => sum + (t.unrealizedPL || 0), 0)

              portfolio.totalUnrealizedPL = totalUnrealizedPL
              portfolio.totalPL = portfolio.totalRealizedPL + totalUnrealizedPL
            }
          })

          savePortfolioData(data)
          refreshData()
        }
      }
    } catch (error) {
      console.error('Error fetching live prices:', error)
    } finally {
      setPricesLoading(false)
    }
  }

  // Fetch prices on mount and every 10 seconds
  useEffect(() => {
    fetchLivePrices()
    const interval = setInterval(fetchLivePrices, 10000) // Update every 10 seconds
    return () => clearInterval(interval)
  }, [trades.length])

  // Also fetch when selected portfolio changes
  useEffect(() => {
    fetchLivePrices()
  }, [selectedPortfolioId])

  // Update trades when portfolio selection changes
  useEffect(() => {
    if (selectedPortfolioId === 'all') {
      const data = loadPortfolioData()
      setTrades(data.trades)
    } else {
      setTrades(getTrades(selectedPortfolioId))
    }
  }, [selectedPortfolioId])

  // Get current portfolio or overall stats
  const currentPortfolio = selectedPortfolioId === 'all'
    ? null
    : portfolios.find(p => p.id === selectedPortfolioId)

  const overallStats = getOverallStats()

  const stats = selectedPortfolioId === 'all'
    ? overallStats
    : currentPortfolio

  // Filter trades based on view mode and search
  const filteredTrades = trades.filter(trade => {
    const matchesView = viewMode === 'all' || trade.status === viewMode
    const matchesSearch = !searchTerm ||
      trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.tradeType.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesView && matchesSearch
  })

  const formatCurrency = (num: number) => {
    const sign = num >= 0 ? '+' : ''
    return `${sign}$${num.toFixed(2)}`
  }

  const formatPercent = (num: number) => {
    return `${num.toFixed(1)}%`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Briefcase className="w-10 h-10 text-purple-400" />
              Portfolio Tracker
              {pricesLoading && (
                <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
              )}
            </h1>
            <div className="flex items-center gap-3">
              <p className="text-gray-400">Track your trades across multiple portfolios</p>
              {trades.filter(t => t.status === 'open').length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-gray-500">
                    Prices updated {lastPriceUpdate.toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowAddPortfolio(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              New Portfolio
            </button>
            <button
              onClick={() => setShowAddTrade(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Trade
            </button>
            <button
              onClick={() => setShowImportCSV(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-all"
            >
              <Upload className="w-4 h-4" />
              Import CSV
            </button>
          </div>
        </div>

        {/* Portfolio Selector */}
        <div className="mb-6 flex gap-3 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedPortfolioId('all')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              selectedPortfolioId === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              All Portfolios
            </div>
          </button>

          {portfolios.map(portfolio => (
            <button
              key={portfolio.id}
              onClick={() => setSelectedPortfolioId(portfolio.id)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                selectedPortfolioId === portfolio.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
              style={{
                borderLeft: selectedPortfolioId === portfolio.id
                  ? `4px solid ${portfolio.color}`
                  : 'none'
              }}
            >
              {portfolio.name}
            </button>
          ))}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={DollarSign}
            label="Total P&L"
            value={formatCurrency(stats?.totalPL || 0)}
            color={stats?.totalPL && stats.totalPL >= 0 ? 'text-green-400' : 'text-red-400'}
            bgColor={stats?.totalPL && stats.totalPL >= 0 ? 'bg-green-900/20' : 'bg-red-900/20'}
          />
          <StatCard
            icon={TrendingUp}
            label="Realized P&L"
            value={formatCurrency(stats?.totalRealizedPL || 0)}
            color={stats?.totalRealizedPL && stats.totalRealizedPL >= 0 ? 'text-green-400' : 'text-red-400'}
            bgColor="bg-blue-900/20"
          />
          <StatCard
            icon={Activity}
            label="Unrealized P&L"
            value={formatCurrency(stats?.totalUnrealizedPL || 0)}
            color={stats?.totalUnrealizedPL && stats.totalUnrealizedPL >= 0 ? 'text-green-400' : 'text-red-400'}
            bgColor="bg-purple-900/20"
          />
          <StatCard
            icon={Percent}
            label="Win Rate"
            value={formatPercent(stats?.winRate || 0)}
            color="text-yellow-400"
            bgColor="bg-yellow-900/20"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={Eye}
            label="Open Positions"
            value={stats?.openPositions?.toString() || '0'}
            color="text-blue-400"
            bgColor="bg-blue-900/20"
          />
          <StatCard
            icon={Check}
            label="Closed Positions"
            value={stats?.closedPositions?.toString() || '0'}
            color="text-gray-400"
            bgColor="bg-gray-800/20"
          />
          <StatCard
            icon={TrendingUp}
            label="Avg Win"
            value={formatCurrency(stats?.avgWin || 0)}
            color="text-green-400"
            bgColor="bg-green-900/20"
          />
          <StatCard
            icon={TrendingDown}
            label="Avg Loss"
            value={formatCurrency(stats?.avgLoss || 0)}
            color="text-red-400"
            bgColor="bg-red-900/20"
          />
        </div>

        {/* Filters and Search */}
        <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search trades..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-900 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                All ({trades.length})
              </button>
              <button
                onClick={() => setViewMode('open')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'open'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Open ({trades.filter(t => t.status === 'open').length})
              </button>
              <button
                onClick={() => setViewMode('closed')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'closed'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Closed ({trades.filter(t => t.status === 'closed').length})
              </button>
            </div>

            <button
              onClick={refreshData}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Trades Table */}
        <TradesTable
          trades={filteredTrades}
          onEdit={(trade) => {
            setEditingTrade(trade)
            setShowAddTrade(true)
          }}
          onDelete={(tradeId) => {
            if (confirm('Are you sure you want to delete this trade?')) {
              deleteTrade(tradeId)
              refreshData()
            }
          }}
        />

        {/* Modals */}
        {showAddTrade && (
          <AddTradeModal
            portfolios={portfolios}
            editingTrade={editingTrade}
            onClose={() => {
              setShowAddTrade(false)
              setEditingTrade(null)
            }}
            onSave={() => {
              setShowAddTrade(false)
              setEditingTrade(null)
              refreshData()
            }}
          />
        )}

        {showAddPortfolio && (
          <AddPortfolioModal
            onClose={() => setShowAddPortfolio(false)}
            onSave={() => {
              setShowAddPortfolio(false)
              refreshData()
            }}
          />
        )}

        {showImportCSV && (
          <ImportCSVModal
            portfolios={portfolios}
            onClose={() => setShowImportCSV(false)}
            onImport={() => {
              setShowImportCSV(false)
              refreshData()
            }}
          />
        )}
      </div>
    </div>
  )
}

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, color, bgColor }: any) => (
  <div className={`${bgColor} rounded-lg p-4 border border-gray-700`}>
    <div className="flex items-center gap-3">
      <div className={`p-2 ${bgColor} rounded-lg`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <div className="text-sm text-gray-400">{label}</div>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
      </div>
    </div>
  </div>
)

// Trades Table Component
const TradesTable = ({ trades, onEdit, onDelete }: any) => {
  if (trades.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-12 text-center">
        <Activity className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 text-lg">No trades found</p>
        <p className="text-gray-500 text-sm mt-2">Add your first trade to get started</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/50 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Symbol</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Entry</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Current</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Exit</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Qty</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">P&L</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {trades.map((trade: Trade) => {
              const pl = trade.status === 'closed' ? trade.realizedPL : trade.unrealizedPL
              const plColor = (pl || 0) >= 0 ? 'text-green-400' : 'text-red-400'

              return (
                <tr key={trade.id} className="hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-bold text-purple-400">{trade.symbol}</div>
                    {trade.expirationDate && (
                      <div className="text-xs text-gray-500">{new Date(trade.expirationDate).toLocaleDateString()}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">{trade.tradeType.replace('_', ' ').toUpperCase()}</div>
                    {trade.strikes && (
                      <div className="text-xs text-gray-500">
                        {Object.entries(trade.strikes).filter(([_, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">${trade.entryPrice.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">{new Date(trade.entryDate).toLocaleDateString()}</div>
                  </td>
                  <td className="px-4 py-3">
                    {trade.status === 'open' && trade.currentPrice ? (
                      <>
                        <div className={`text-sm font-medium ${
                          trade.currentPrice > trade.entryPrice ? 'text-green-400' :
                          trade.currentPrice < trade.entryPrice ? 'text-red-400' :
                          'text-gray-300'
                        }`}>
                          ${trade.currentPrice.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {((trade.currentPrice - trade.entryPrice) / trade.entryPrice * 100).toFixed(2)}%
                        </div>
                      </>
                    ) : trade.status === 'open' ? (
                      <span className="text-gray-500 text-sm">Loading...</span>
                    ) : (
                      <span className="text-gray-500 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {trade.exitPrice ? (
                      <>
                        <div className="text-sm">${trade.exitPrice.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">{trade.exitDate && new Date(trade.exitDate).toLocaleDateString()}</div>
                      </>
                    ) : (
                      <span className="text-gray-500 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">{trade.quantity}</td>
                  <td className="px-4 py-3">
                    <div className={`text-sm font-bold ${plColor}`}>
                      {pl !== undefined && pl !== null ? `${pl >= 0 ? '+' : ''}$${pl.toFixed(2)}` : '-'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      trade.status === 'open'
                        ? 'bg-green-900/30 text-green-400'
                        : 'bg-gray-700 text-gray-300'
                    }`}>
                      {trade.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEdit(trade)}
                        className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded transition-all"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(trade.id)}
                        className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Add Trade Modal Component
const AddTradeModal = ({ portfolios, editingTrade, onClose, onSave }: any) => {
  const [formData, setFormData] = useState<any>({
    portfolioId: portfolios[0]?.id || '',
    symbol: '',
    tradeType: 'call',
    entryDate: new Date().toISOString().split('T')[0],
    entryPrice: '',
    quantity: '1',
    status: 'open',
    strikes: {},
    expirationDate: '',
    exitDate: '',
    exitPrice: '',
    notes: ''
  })

  useEffect(() => {
    if (editingTrade) {
      setFormData({
        ...editingTrade,
        entryDate: editingTrade.entryDate.split('T')[0],
        exitDate: editingTrade.exitDate ? editingTrade.exitDate.split('T')[0] : '',
        expirationDate: editingTrade.expirationDate ? editingTrade.expirationDate.split('T')[0] : '',
        entryPrice: editingTrade.entryPrice.toString(),
        exitPrice: editingTrade.exitPrice?.toString() || '',
        quantity: editingTrade.quantity.toString()
      })
    }
  }, [editingTrade])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const tradeData: any = {
      portfolioId: formData.portfolioId,
      symbol: formData.symbol.toUpperCase(),
      tradeType: formData.tradeType,
      entryDate: formData.entryDate,
      entryPrice: parseFloat(formData.entryPrice),
      quantity: parseInt(formData.quantity),
      status: formData.status,
      notes: formData.notes
    }

    // Add strikes if it's an options trade
    if (formData.tradeType !== 'stock') {
      const strikes: any = {}
      if (formData.strikes?.long) strikes.long = parseFloat(formData.strikes.long)
      if (formData.strikes?.short) strikes.short = parseFloat(formData.strikes.short)
      if (formData.strikes?.longPut) strikes.longPut = parseFloat(formData.strikes.longPut)
      if (formData.strikes?.shortPut) strikes.shortPut = parseFloat(formData.strikes.shortPut)
      if (formData.strikes?.longCall) strikes.longCall = parseFloat(formData.strikes.longCall)
      if (formData.strikes?.shortCall) strikes.shortCall = parseFloat(formData.strikes.shortCall)

      if (Object.keys(strikes).length > 0) {
        tradeData.strikes = strikes
      }
    }

    // Add expiration date for options
    if (formData.expirationDate) {
      tradeData.expirationDate = formData.expirationDate
    }

    // Add exit data if provided
    if (formData.exitDate) {
      tradeData.exitDate = formData.exitDate
    }

    if (formData.exitPrice) {
      tradeData.exitPrice = parseFloat(formData.exitPrice)

      // Calculate realized P&L if closed
      if (formData.status === 'closed') {
        const pl = (tradeData.exitPrice - tradeData.entryPrice) * tradeData.quantity
        tradeData.realizedPL = pl
      }
    }

    if (editingTrade) {
      updateTrade(editingTrade.id, tradeData)
    } else {
      addTrade(tradeData)
    }

    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
      <div className="bg-gray-900 rounded-lg max-w-2xl w-full p-6 my-8" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold">{editingTrade ? 'Edit Trade' : 'Add Trade'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Portfolio Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Portfolio</label>
            <select
              value={formData.portfolioId}
              onChange={(e) => setFormData({ ...formData, portfolioId: e.target.value })}
              className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            >
              {portfolios.map((p: Portfolio) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Symbol and Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Symbol</label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="AAPL"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Trade Type</label>
              <select
                value={formData.tradeType}
                onChange={(e) => setFormData({ ...formData, tradeType: e.target.value })}
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="call">Call</option>
                <option value="put">Put</option>
                <option value="call_spread">Call Spread</option>
                <option value="put_spread">Put Spread</option>
                <option value="iron_condor">Iron Condor</option>
                <option value="strangle">Strangle</option>
                <option value="straddle">Straddle</option>
                <option value="covered_call">Covered Call</option>
                <option value="stock">Stock</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Strikes (for options) */}
          {formData.tradeType !== 'stock' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Long Strike</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.strikes?.long || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    strikes: { ...formData.strikes, long: e.target.value }
                  })}
                  className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="150"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Short Strike</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.strikes?.short || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    strikes: { ...formData.strikes, short: e.target.value }
                  })}
                  className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="155"
                />
              </div>
            </div>
          )}

          {/* Entry Details */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Entry Date</label>
              <input
                type="date"
                value={formData.entryDate}
                onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Entry Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.entryPrice}
                onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="100.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Quantity</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="1"
                required
              />
            </div>
          </div>

          {/* Expiration (for options) */}
          {formData.tradeType !== 'stock' && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Expiration Date</label>
              <input
                type="date"
                value={formData.expirationDate}
                onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          )}

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Exit Details (if closed) */}
          {formData.status === 'closed' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Exit Date</label>
                <input
                  type="date"
                  value={formData.exitDate}
                  onChange={(e) => setFormData({ ...formData, exitDate: e.target.value })}
                  className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Exit Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.exitPrice}
                  onChange={(e) => setFormData({ ...formData, exitPrice: e.target.value })}
                  className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="105.00"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 h-24 resize-none"
              placeholder="Optional trade notes..."
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all"
            >
              {editingTrade ? 'Update Trade' : 'Add Trade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Add Portfolio Modal Component
const AddPortfolioModal = ({ onClose, onSave }: any) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#8b5cf6'
  })

  const colors = [
    '#8b5cf6', // purple
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // yellow
    '#ef4444', // red
    '#ec4899', // pink
    '#6366f1', // indigo
    '#14b8a6'  // teal
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createPortfolio(formData.name, formData.description, formData.color)
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-gray-900 rounded-lg max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold">Create Portfolio</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Portfolio Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Main Account"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 h-20 resize-none"
              placeholder="My primary trading account"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Color</label>
            <div className="grid grid-cols-8 gap-2">
              {colors.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    formData.color === color ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all"
            >
              Create Portfolio
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Import CSV Modal Component
const ImportCSVModal = ({ portfolios, onClose, onImport }: any) => {
  const [selectedPortfolio, setSelectedPortfolio] = useState(portfolios[0]?.id || '')
  const [csvText, setCSVText] = useState('')
  const [preview, setPreview] = useState<any[]>([])
  const [error, setError] = useState('')

  const parseCSV = (text: string) => {
    try {
      const lines = text.trim().split('\n')
      if (lines.length < 2) {
        setError('CSV must have at least a header row and one data row')
        return
      }

      const headers = lines[0].split(',').map(h => h.trim())
      const trades: any[] = []

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        const trade: any = {}

        headers.forEach((header, index) => {
          trade[header] = values[index] || ''
        })

        trades.push(trade)
      }

      setPreview(trades.slice(0, 5)) // Show first 5 for preview
      setError('')
    } catch (err) {
      setError('Failed to parse CSV. Please check the format.')
      setPreview([])
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setCSVText(text)
      parseCSV(text)
    }
    reader.readAsText(file)
  }

  const handleImport = () => {
    if (!csvText || preview.length === 0) {
      setError('Please upload a valid CSV file first')
      return
    }

    const lines = csvText.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim())
    const trades: Omit<Trade, 'id'>[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const row: any = {}

      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })

      // Map CSV columns to Trade object
      const trade: Omit<Trade, 'id'> = {
        portfolioId: selectedPortfolio,
        symbol: row.Symbol || row.symbol || '',
        tradeType: (row.Type || row.type || 'other').toLowerCase(),
        entryDate: row['Entry Date'] || row.entryDate || new Date().toISOString(),
        entryPrice: parseFloat(row['Entry Price'] || row.entryPrice || '0'),
        quantity: parseInt(row.Quantity || row.quantity || '1'),
        status: (row.Status || row.status || 'open').toLowerCase() as 'open' | 'closed',
        notes: row.Notes || row.notes || ''
      }

      // Add strikes if provided
      if (row.Strike || row.strike) {
        trade.strikes = { long: parseFloat(row.Strike || row.strike) }
      }

      // Add expiration if provided
      if (row.Expiration || row.expiration || row['Expiration Date']) {
        trade.expirationDate = row.Expiration || row.expiration || row['Expiration Date']
      }

      // Add exit data if provided
      if (row['Exit Date'] || row.exitDate) {
        trade.exitDate = row['Exit Date'] || row.exitDate
      }

      if (row['Exit Price'] || row.exitPrice) {
        trade.exitPrice = parseFloat(row['Exit Price'] || row.exitPrice)

        // Calculate realized P&L for closed trades
        if (trade.status === 'closed' && trade.exitPrice) {
          trade.realizedPL = (trade.exitPrice - trade.entryPrice) * trade.quantity
        }
      }

      trades.push(trade)
    }

    importTrades(trades)
    onImport()
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
      <div className="bg-gray-900 rounded-lg max-w-4xl w-full p-6 my-8" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold">Import CSV</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Instructions */}
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
            <h4 className="font-bold text-blue-400 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              CSV Format Instructions
            </h4>
            <p className="text-sm text-gray-300 mb-2">Your CSV should have these columns (case-insensitive):</p>
            <code className="text-xs bg-gray-800 p-2 rounded block text-green-400">
              Symbol, Type, Entry Date, Entry Price, Quantity, Exit Date, Exit Price, Strike, Expiration, Status, Notes
            </code>
            <p className="text-xs text-gray-400 mt-2">
              Required: Symbol, Type, Entry Date, Entry Price, Quantity<br />
              Optional: Everything else
            </p>
          </div>

          {/* Portfolio Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Import to Portfolio</label>
            <select
              value={selectedPortfolio}
              onChange={(e) => setSelectedPortfolio(e.target.value)}
              className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {portfolios.map((p: Portfolio) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* File Upload or Paste */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Upload CSV File</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white file:cursor-pointer hover:file:bg-purple-700"
            />
          </div>

          <div className="text-center text-gray-500">OR</div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Paste CSV Data</label>
            <textarea
              value={csvText}
              onChange={(e) => {
                setCSVText(e.target.value)
                if (e.target.value) parseCSV(e.target.value)
              }}
              className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 h-32 resize-none font-mono text-sm"
              placeholder="Symbol,Type,Entry Date,Entry Price,Quantity,Status
AAPL,call,2024-01-15,150.00,1,open
TSLA,put,2024-01-20,220.00,2,closed"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <h4 className="font-bold mb-2 text-green-400">Preview (first {preview.length} rows)</h4>
              <div className="bg-gray-800 rounded-lg p-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="px-2 py-1 text-left">Symbol</th>
                      <th className="px-2 py-1 text-left">Type</th>
                      <th className="px-2 py-1 text-left">Entry Date</th>
                      <th className="px-2 py-1 text-left">Entry Price</th>
                      <th className="px-2 py-1 text-left">Qty</th>
                      <th className="px-2 py-1 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, idx) => (
                      <tr key={idx} className="border-b border-gray-700/50">
                        <td className="px-2 py-1">{row.Symbol || row.symbol}</td>
                        <td className="px-2 py-1">{row.Type || row.type}</td>
                        <td className="px-2 py-1">{row['Entry Date'] || row.entryDate}</td>
                        <td className="px-2 py-1">${row['Entry Price'] || row.entryPrice}</td>
                        <td className="px-2 py-1">{row.Quantity || row.quantity}</td>
                        <td className="px-2 py-1">{row.Status || row.status || 'open'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={preview.length === 0}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Import {csvText.split('\n').length - 1} Trades
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
