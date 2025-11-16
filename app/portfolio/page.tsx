'use client'
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Trash2, TrendingUp, TrendingDown, Download, Upload,
  Filter, Calendar, DollarSign, Percent, Target, Activity, Eye, Edit, X
} from 'lucide-react';

interface Trade {
  id: string;
  portfolioId: string;
  symbol: string;
  type: 'long' | 'short';
  entryDate: string;
  entryPrice: number;
  shares: number;
  exitDate?: string;
  exitPrice?: number;
  status: 'open' | 'closed';
  notes?: string;
}

interface Portfolio {
  id: string;
  name: string;
  createdAt: string;
}

const formatNumber = (num: number) => {
  if (!num && num !== 0) return '$0.00';
  if (Math.abs(num) >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (Math.abs(num) >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
};

export default function PortfolioPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('all');
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [showAddPortfolio, setShowAddPortfolio] = useState(false);
  const [stockPrices, setStockPrices] = useState<{[key: string]: number}>({});

  const [newTrade, setNewTrade] = useState({
    portfolioId: '',
    symbol: '',
    type: 'long' as 'long' | 'short',
    entryDate: new Date().toISOString().split('T')[0],
    entryPrice: '',
    shares: '',
    notes: ''
  });

  const [newPortfolioName, setNewPortfolioName] = useState('');

  // Load data from localStorage
  useEffect(() => {
    const savedPortfolios = localStorage.getItem('gamma-flow-portfolios');
    const savedTrades = localStorage.getItem('gamma-flow-trades');

    if (savedPortfolios) {
      setPortfolios(JSON.parse(savedPortfolios));
    } else {
      // Create default portfolio
      const defaultPortfolio: Portfolio = {
        id: 'main',
        name: 'Main Portfolio',
        createdAt: new Date().toISOString()
      };
      setPortfolios([defaultPortfolio]);
      localStorage.setItem('gamma-flow-portfolios', JSON.stringify([defaultPortfolio]));
    }

    if (savedTrades) {
      setTrades(JSON.parse(savedTrades));
    }
  }, []);

  // Save trades to localStorage
  useEffect(() => {
    if (trades.length > 0 || localStorage.getItem('gamma-flow-trades')) {
      localStorage.setItem('gamma-flow-trades', JSON.stringify(trades));
    }
  }, [trades]);

  // Save portfolios to localStorage
  useEffect(() => {
    if (portfolios.length > 0) {
      localStorage.setItem('gamma-flow-portfolios', JSON.stringify(portfolios));
    }
  }, [portfolios]);

  // Fetch current prices for open positions
  useEffect(() => {
    const fetchPrices = async () => {
      const openTrades = trades.filter(t => t.status === 'open');
      if (openTrades.length === 0) return;

      try {
        const response = await fetch('/api/stocks');
        const data = await response.json();

        if (data.status === 'success' && data.data) {
          const prices: {[key: string]: number} = {};
          data.data.forEach((stock: any) => {
            prices[stock.symbol] = stock.price;
          });
          setStockPrices(prices);
        }
      } catch (error) {
        console.error('Error fetching prices:', error);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [trades]);

  const handleAddPortfolio = () => {
    if (!newPortfolioName.trim()) {
      alert('Please enter a portfolio name');
      return;
    }

    const portfolio: Portfolio = {
      id: Date.now().toString(),
      name: newPortfolioName,
      createdAt: new Date().toISOString()
    };

    setPortfolios([...portfolios, portfolio]);
    setNewPortfolioName('');
    setShowAddPortfolio(false);
  };

  const handleAddTrade = () => {
    if (!newTrade.symbol || !newTrade.entryPrice || !newTrade.shares) {
      alert('Please fill in all required fields');
      return;
    }

    const portfolioId = newTrade.portfolioId || portfolios[0]?.id || 'main';

    const trade: Trade = {
      id: Date.now().toString(),
      portfolioId,
      symbol: newTrade.symbol.toUpperCase(),
      type: newTrade.type,
      entryDate: newTrade.entryDate,
      entryPrice: parseFloat(newTrade.entryPrice),
      shares: parseFloat(newTrade.shares),
      status: 'open',
      notes: newTrade.notes
    };

    setTrades([...trades, trade]);
    setNewTrade({
      portfolioId: '',
      symbol: '',
      type: 'long',
      entryDate: new Date().toISOString().split('T')[0],
      entryPrice: '',
      shares: '',
      notes: ''
    });
    setShowAddTrade(false);
  };

  const handleCloseTrade = (tradeId: string, exitPrice: number) => {
    setTrades(trades.map(t =>
      t.id === tradeId
        ? { ...t, status: 'closed' as const, exitDate: new Date().toISOString(), exitPrice }
        : t
    ));
  };

  const handleDeleteTrade = (id: string) => {
    if (confirm('Are you sure you want to delete this trade?')) {
      setTrades(trades.filter(t => t.id !== id));
    }
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all trades? This cannot be undone.')) {
      setTrades([]);
      localStorage.removeItem('gamma-flow-trades');
    }
  };

  const handleImportCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event: any) => {
        const csv = event.target.result;
        const lines = csv.split('\n');
        const importedTrades: Trade[] = [];

        // Skip header row
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const [symbol, type, entryDate, entryPrice, shares, exitDate, exitPrice, status, notes] = line.split(',');

          if (symbol && entryPrice && shares) {
            importedTrades.push({
              id: Date.now().toString() + i,
              portfolioId: portfolios[0]?.id || 'main',
              symbol: symbol.trim(),
              type: (type?.trim() as 'long' | 'short') || 'long',
              entryDate: entryDate?.trim() || new Date().toISOString(),
              entryPrice: parseFloat(entryPrice),
              shares: parseFloat(shares),
              exitDate: exitDate?.trim() || undefined,
              exitPrice: exitPrice ? parseFloat(exitPrice) : undefined,
              status: (status?.trim() as 'open' | 'closed') || 'open',
              notes: notes?.trim() || ''
            });
          }
        }

        if (importedTrades.length > 0) {
          setTrades([...trades, ...importedTrades]);
          alert(`Imported ${importedTrades.length} trades`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Symbol', 'Type', 'Entry Date', 'Entry Price', 'Shares', 'Exit Date', 'Exit Price', 'Status', 'Notes'].join(','),
      ...filteredTrades.map(t => [
        t.symbol,
        t.type,
        t.entryDate,
        t.entryPrice,
        t.shares,
        t.exitDate || '',
        t.exitPrice || '',
        t.status,
        t.notes || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gamma-flow-trades-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const calculateTradeStats = () => {
    const portfolioTrades = selectedPortfolio === 'all'
      ? trades
      : trades.filter(t => t.portfolioId === selectedPortfolio);

    let totalPnL = 0;
    let realizedPnL = 0;
    let unrealizedPnL = 0;
    let wins = 0;
    let losses = 0;
    let totalWinAmount = 0;
    let totalLossAmount = 0;

    portfolioTrades.forEach(trade => {
      if (trade.status === 'closed' && trade.exitPrice) {
        const pnl = trade.type === 'long'
          ? (trade.exitPrice - trade.entryPrice) * trade.shares
          : (trade.entryPrice - trade.exitPrice) * trade.shares;

        realizedPnL += pnl;
        totalPnL += pnl;

        if (pnl > 0) {
          wins++;
          totalWinAmount += pnl;
        } else if (pnl < 0) {
          losses++;
          totalLossAmount += Math.abs(pnl);
        }
      } else if (trade.status === 'open') {
        const currentPrice = stockPrices[trade.symbol] || trade.entryPrice;
        const pnl = trade.type === 'long'
          ? (currentPrice - trade.entryPrice) * trade.shares
          : (trade.entryPrice - currentPrice) * trade.shares;

        unrealizedPnL += pnl;
        totalPnL += pnl;
      }
    });

    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const avgWin = wins > 0 ? totalWinAmount / wins : 0;
    const avgLoss = losses > 0 ? totalLossAmount / losses : 0;

    const openPositions = portfolioTrades.filter(t => t.status === 'open').length;
    const closedPositions = portfolioTrades.filter(t => t.status === 'closed').length;

    return {
      totalPnL,
      realizedPnL,
      unrealizedPnL,
      winRate,
      avgWin,
      avgLoss,
      openPositions,
      closedPositions
    };
  };

  const filteredTrades = trades.filter(t => {
    if (selectedPortfolio !== 'all' && t.portfolioId !== selectedPortfolio) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    return true;
  });

  const stats = calculateTradeStats();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-3"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Scanner
              </Link>
              <h1 className="text-3xl font-bold mb-2">Portfolio Tracker</h1>
              <p className="text-gray-400">Track your trades across multiple portfolios</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleImportCSV}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Import CSV
              </button>
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded-lg font-medium transition-all flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear All Trades
              </button>
            </div>
          </div>

          {/* Portfolio Selector */}
          <div className="flex gap-2 items-center mb-4">
            <select
              value={selectedPortfolio}
              onChange={(e) => setSelectedPortfolio(e.target.value)}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Portfolios</option>
              {portfolios.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              onClick={() => setShowAddPortfolio(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Portfolio
            </button>
            <button
              onClick={() => setShowAddTrade(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Trade
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
            <div className="text-sm text-gray-400 mb-1">Total P&L</div>
            <div className={`text-xl font-bold ${stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.totalPnL >= 0 ? '+' : ''}{formatNumber(stats.totalPnL)}
            </div>
          </div>
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
            <div className="text-sm text-gray-400 mb-1">Realized P&L</div>
            <div className={`text-xl font-bold ${stats.realizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.realizedPnL >= 0 ? '+' : ''}{formatNumber(stats.realizedPnL)}
            </div>
          </div>
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
            <div className="text-sm text-gray-400 mb-1">Unrealized P&L</div>
            <div className={`text-xl font-bold ${stats.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.unrealizedPnL >= 0 ? '+' : ''}{formatNumber(stats.unrealizedPnL)}
            </div>
          </div>
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
            <div className="text-sm text-gray-400 mb-1">Win Rate</div>
            <div className="text-xl font-bold text-white">{stats.winRate.toFixed(1)}%</div>
          </div>
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
            <div className="text-sm text-gray-400 mb-1">Open Positions</div>
            <div className="text-xl font-bold text-white">{stats.openPositions}</div>
          </div>
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
            <div className="text-sm text-gray-400 mb-1">Closed Positions</div>
            <div className="text-xl font-bold text-white">{stats.closedPositions}</div>
          </div>
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
            <div className="text-sm text-gray-400 mb-1">Avg Win</div>
            <div className="text-xl font-bold text-green-400">+{formatNumber(stats.avgWin)}</div>
          </div>
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
            <div className="text-sm text-gray-400 mb-1">Avg Loss</div>
            <div className="text-xl font-bold text-red-400">-{formatNumber(stats.avgLoss)}</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterStatus === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            All ({trades.filter(t => selectedPortfolio === 'all' || t.portfolioId === selectedPortfolio).length})
          </button>
          <button
            onClick={() => setFilterStatus('open')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterStatus === 'open'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Open ({stats.openPositions})
          </button>
          <button
            onClick={() => setFilterStatus('closed')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterStatus === 'closed'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Closed ({stats.closedPositions})
          </button>
        </div>

        {/* Trades Table */}
        {filteredTrades.length === 0 ? (
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-12 text-center">
            <Activity className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400">No trades found</p>
            <p className="text-sm text-gray-500 mt-1">Add your first trade to get started</p>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="p-3 text-left">Symbol</th>
                    <th className="p-3 text-left">Type</th>
                    <th className="p-3 text-right">Entry Date</th>
                    <th className="p-3 text-right">Entry Price</th>
                    <th className="p-3 text-right">Shares</th>
                    <th className="p-3 text-right">Current/Exit Price</th>
                    <th className="p-3 text-right">P&L</th>
                    <th className="p-3 text-right">P&L %</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.map((trade) => {
                    const currentPrice = trade.status === 'open'
                      ? (stockPrices[trade.symbol] || trade.entryPrice)
                      : (trade.exitPrice || trade.entryPrice);

                    const pnl = trade.type === 'long'
                      ? (currentPrice - trade.entryPrice) * trade.shares
                      : (trade.entryPrice - currentPrice) * trade.shares;

                    const pnlPercent = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;

                    return (
                      <tr key={trade.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                        <td className="p-3 font-medium">{trade.symbol}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            trade.type === 'long' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                          }`}>
                            {trade.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 text-right text-sm">{new Date(trade.entryDate).toLocaleDateString()}</td>
                        <td className="p-3 text-right">${trade.entryPrice.toFixed(2)}</td>
                        <td className="p-3 text-right">{trade.shares}</td>
                        <td className="p-3 text-right">
                          {trade.status === 'open' && stockPrices[trade.symbol] ? (
                            <span className={currentPrice >= trade.entryPrice ? 'text-green-400' : 'text-red-400'}>
                              ${currentPrice.toFixed(2)}
                            </span>
                          ) : (
                            <span>${currentPrice.toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <span className={`font-medium ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {pnl >= 0 ? '+' : ''}{formatNumber(pnl)}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className={`font-medium ${pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs ${
                            trade.status === 'open' ? 'bg-blue-900/30 text-blue-400' : 'bg-gray-700 text-gray-300'
                          }`}>
                            {trade.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {trade.status === 'open' && (
                              <button
                                onClick={() => {
                                  const price = prompt(`Enter exit price for ${trade.symbol}:`, currentPrice.toFixed(2));
                                  if (price) handleCloseTrade(trade.id, parseFloat(price));
                                }}
                                className="p-1 text-green-400 hover:text-green-300 hover:bg-green-900/20 rounded transition-all"
                                title="Close Trade"
                              >
                                <Target className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteTrade(trade.id)}
                              className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-all"
                              title="Delete Trade"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Trade Modal */}
      {showAddTrade && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setShowAddTrade(false)}>
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full border border-gray-800" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Add New Trade</h3>
              <button onClick={() => setShowAddTrade(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Portfolio</label>
                <select
                  value={newTrade.portfolioId}
                  onChange={(e) => setNewTrade({ ...newTrade, portfolioId: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {portfolios.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Symbol *</label>
                <input
                  type="text"
                  placeholder="NVDA"
                  value={newTrade.symbol}
                  onChange={(e) => setNewTrade({ ...newTrade, symbol: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Type</label>
                <select
                  value={newTrade.type}
                  onChange={(e) => setNewTrade({ ...newTrade, type: e.target.value as 'long' | 'short' })}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Entry Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="100.00"
                    value={newTrade.entryPrice}
                    onChange={(e) => setNewTrade({ ...newTrade, entryPrice: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Shares *</label>
                  <input
                    type="number"
                    placeholder="100"
                    value={newTrade.shares}
                    onChange={(e) => setNewTrade({ ...newTrade, shares: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Entry Date</label>
                <input
                  type="date"
                  value={newTrade.entryDate}
                  onChange={(e) => setNewTrade({ ...newTrade, entryDate: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Notes</label>
                <textarea
                  placeholder="Trade notes..."
                  value={newTrade.notes}
                  onChange={(e) => setNewTrade({ ...newTrade, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleAddTrade}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-all"
                >
                  Add Trade
                </button>
                <button
                  onClick={() => setShowAddTrade(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Portfolio Modal */}
      {showAddPortfolio && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setShowAddPortfolio(false)}>
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full border border-gray-800" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Create New Portfolio</h3>
              <button onClick={() => setShowAddPortfolio(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Portfolio Name</label>
                <input
                  type="text"
                  placeholder="My Portfolio"
                  value={newPortfolioName}
                  onChange={(e) => setNewPortfolioName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleAddPortfolio}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium transition-all"
                >
                  Create Portfolio
                </button>
                <button
                  onClick={() => setShowAddPortfolio(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
