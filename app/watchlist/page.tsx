'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, RefreshCw, Filter, ChevronDown, ChevronUp, TrendingUp,
  TrendingDown, Clock, Target, AlertCircle, CheckCircle2, Activity,
  Zap, BarChart3, Eye, Plus, Settings
} from 'lucide-react';

interface IndicatorResult {
  symbol: string;
  timeframe: string;
  action: string;
  direction: number;
  alignmentScore: number;
  confidence: string;
  sizePercent: number;
  bfci: number;
  bfciState: number;
  coreValue: number;
  cci: number;
  orderFlowDelta: number;
  orderFlowBuyPct: number;
  fearExtreme: boolean;
  squeezeOn: boolean;
  prohibitionActive: boolean;
  volumeSurge: boolean;
}

interface WatchlistResult {
  symbol: string;
  aligned: boolean;
  alignmentStrength: number;
  fiveMin: IndicatorResult;
  daily: IndicatorResult;
  combinedScore: number;
  timestamp: number;
}

interface ApiResponse {
  status: string;
  data: WatchlistResult[];
  count: number;
  totalScanned: number;
  timestamp: number;
}

export default function WatchlistScanner() {
  const [results, setResults] = useState<WatchlistResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoRefresh, setIsAutoRefresh] = useState(false);
  const [minScore, setMinScore] = useState(4);
  const [alignedOnly, setAlignedOnly] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [customSymbols, setCustomSymbols] = useState('');
  const [showAddSymbols, setShowAddSymbols] = useState(false);

  // Fetch watchlist data
  const fetchWatchlist = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        minScore: minScore.toString(),
        alignedOnly: alignedOnly.toString()
      });

      if (customSymbols.trim()) {
        params.set('symbols', customSymbols.trim());
      }

      const response = await fetch(`/api/watchlist?${params}`);
      const data: ApiResponse = await response.json();

      if (data.status === 'success') {
        setResults(data.data);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching watchlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchWatchlist();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!isAutoRefresh) return;

    const interval = setInterval(() => {
      fetchWatchlist();
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [isAutoRefresh, minScore, alignedOnly, customSymbols]);

  // Toggle row expansion
  const toggleRow = (symbol: string) => {
    setExpandedRow(expandedRow === symbol ? null : symbol);
  };

  // Get action color
  const getActionColor = (action: string) => {
    if (action.includes('MAX LONG')) return 'text-green-400';
    if (action.includes('STRONG LONG')) return 'text-green-300';
    if (action.includes('LONG BIAS')) return 'text-cyan-400';
    if (action.includes('MAX SHORT')) return 'text-red-400';
    if (action.includes('STRONG SHORT')) return 'text-orange-400';
    if (action.includes('SHORT BIAS')) return 'text-yellow-400';
    if (action.includes('PROHIBITED')) return 'text-red-500';
    return 'text-gray-400';
  };

  // Get score badge color
  const getScoreBadgeColor = (score: number) => {
    if (score >= 10) return 'bg-green-900/30 text-green-400 border-green-500/50';
    if (score >= 8) return 'bg-green-900/20 text-green-300 border-green-500/30';
    if (score >= 6) return 'bg-blue-900/30 text-blue-400 border-blue-500/50';
    if (score >= 4) return 'bg-yellow-900/30 text-yellow-400 border-yellow-500/50';
    return 'bg-gray-800 text-gray-400 border-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Watchlist Scanner</h1>
              <p className="text-gray-400">
                Multi-timeframe alignment detector - Identifies when 5-min and daily signals align
              </p>
            </div>

            <div className="text-right">
              {lastUpdate && (
                <div className="text-sm text-gray-400 mb-2">
                  Last update: {lastUpdate.toLocaleTimeString()}
                </div>
              )}
              <div className="flex items-center justify-end gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isAutoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
                  }`}
                ></span>
                <span className="text-sm font-medium">
                  {isAutoRefresh ? 'Live' : 'Manual'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Min Score Filter */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Min Alignment Score
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="1"
                  value={minScore}
                  onChange={(e) => setMinScore(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-8">{minScore}</span>
              </div>
            </div>

            {/* Aligned Only Filter */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Filter</label>
              <button
                onClick={() => setAlignedOnly(!alignedOnly)}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  alignedOnly
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                <Filter className="w-4 h-4" />
                {alignedOnly ? 'Aligned Only' : 'Show All'}
              </button>
            </div>

            {/* Auto Refresh */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Auto Refresh
              </label>
              <button
                onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  isAutoRefresh
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                <Activity className={`w-4 h-4 ${isAutoRefresh ? 'animate-pulse' : ''}`} />
                {isAutoRefresh ? 'ON (1m)' : 'OFF'}
              </button>
            </div>

            {/* Manual Refresh */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Actions</label>
              <button
                onClick={fetchWatchlist}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Scan Now
              </button>
            </div>
          </div>

          {/* Custom Symbols */}
          <div className="pt-4 border-t border-gray-800">
            <button
              onClick={() => setShowAddSymbols(!showAddSymbols)}
              className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {showAddSymbols ? 'Hide' : 'Add'} Custom Symbols
            </button>

            {showAddSymbols && (
              <div className="mt-3">
                <input
                  type="text"
                  placeholder="Enter symbols (comma-separated, e.g., AAPL, MSFT, TSLA)"
                  value={customSymbols}
                  onChange={(e) => setCustomSymbols(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use default watchlist
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-400">Total Symbols</div>
                <div className="text-2xl font-bold text-white">{results.length}</div>
              </div>
              <Target className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-400">Aligned</div>
                <div className="text-2xl font-bold text-green-400">
                  {results.filter(r => r.aligned).length}
                </div>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-400">Long Signals</div>
                <div className="text-2xl font-bold text-cyan-400">
                  {results.filter(r => r.fiveMin.direction > 0 && r.daily.direction > 0).length}
                </div>
              </div>
              <TrendingUp className="w-8 h-8 text-cyan-400" />
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-400">Short Signals</div>
                <div className="text-2xl font-bold text-orange-400">
                  {results.filter(r => r.fiveMin.direction < 0 && r.daily.direction < 0).length}
                </div>
              </div>
              <TrendingDown className="w-8 h-8 text-orange-400" />
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="text-lg font-bold">Scan Results</h3>
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Scanning...
              </div>
            )}
          </div>

          {results.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No results found</p>
              <p className="text-sm text-gray-500 mt-1">
                Try adjusting your filters or add custom symbols
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="p-3 text-left">Symbol</th>
                    <th className="p-3 text-right">Price</th>
                    <th className="p-3 text-center">Aligned</th>
                    <th className="p-3 text-center">Combined Score</th>
                    <th className="p-3 text-left">5-Min Action</th>
                    <th className="p-3 text-left">Daily Action</th>
                    <th className="p-3 text-center">5-Min Score</th>
                    <th className="p-3 text-center">Daily Score</th>
                    <th className="p-3 text-center">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <React.Fragment key={result.symbol}>
                      <tr className="border-t border-gray-800 hover:bg-gray-800/50">
                        <td className="p-3">
                          <div className="font-bold text-lg">{result.symbol}</div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="font-medium">${result.daily.currentPrice.toFixed(2)}</div>
                          <div className={`text-xs ${result.daily.priceChangePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {result.daily.priceChangePercent >= 0 ? '+' : ''}{result.daily.priceChangePercent.toFixed(2)}%
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {result.aligned ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-gray-500 mx-auto" />
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-bold border ${getScoreBadgeColor(
                              result.combinedScore
                            )}`}
                          >
                            {result.combinedScore.toFixed(1)}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`font-medium ${getActionColor(result.fiveMin.action)}`}>
                            {result.fiveMin.action}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`font-medium ${getActionColor(result.daily.action)}`}>
                            {result.daily.action}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-sm">{result.fiveMin.alignmentScore}/12</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-sm">{result.daily.alignmentScore}/12</span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => toggleRow(result.symbol)}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            {expandedRow === result.symbol ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Details */}
                      {expandedRow === result.symbol && (
                        <tr className="border-t border-gray-800 bg-gray-800/30">
                          <td colSpan={9} className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* 5-Min Details */}
                              <div>
                                <h4 className="text-sm font-bold text-purple-400 mb-3 flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  5-Minute Timeframe
                                </h4>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <span className="text-gray-400">BFCI:</span>{' '}
                                    <span className="font-medium">{result.fiveMin.bfci.toFixed(2)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Core Value:</span>{' '}
                                    <span className="font-medium">{result.fiveMin.coreValue.toFixed(0)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">CCI:</span>{' '}
                                    <span className="font-medium">{result.fiveMin.cci.toFixed(0)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Flow:</span>{' '}
                                    <span className="font-medium">{result.fiveMin.orderFlowBuyPct.toFixed(0)}%</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Confidence:</span>{' '}
                                    <span className="font-medium">{result.fiveMin.confidence}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Size:</span>{' '}
                                    <span className="font-medium">{result.fiveMin.sizePercent}%</span>
                                  </div>
                                </div>
                                {result.fiveMin.prohibitionActive && (
                                  <div className="mt-3 text-xs text-red-400 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Trading prohibited
                                  </div>
                                )}
                              </div>

                              {/* Daily Details */}
                              <div>
                                <h4 className="text-sm font-bold text-cyan-400 mb-3 flex items-center gap-2">
                                  <BarChart3 className="w-4 h-4" />
                                  Daily Timeframe
                                </h4>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <span className="text-gray-400">BFCI:</span>{' '}
                                    <span className="font-medium">{result.daily.bfci.toFixed(2)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Core Value:</span>{' '}
                                    <span className="font-medium">{result.daily.coreValue.toFixed(0)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">CCI:</span>{' '}
                                    <span className="font-medium">{result.daily.cci.toFixed(0)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Flow:</span>{' '}
                                    <span className="font-medium">{result.daily.orderFlowBuyPct.toFixed(0)}%</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Confidence:</span>{' '}
                                    <span className="font-medium">{result.daily.confidence}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Size:</span>{' '}
                                    <span className="font-medium">{result.daily.sizePercent}%</span>
                                  </div>
                                </div>
                                {result.daily.prohibitionActive && (
                                  <div className="mt-3 text-xs text-red-400 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Trading prohibited
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Alignment Info */}
                            {result.aligned && (
                              <div className="mt-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                                <div className="flex items-center gap-2 text-sm text-green-400">
                                  <Zap className="w-4 h-4" />
                                  <strong>ALIGNMENT DETECTED:</strong> Both timeframes agree on {result.fiveMin.direction > 0 ? 'LONG' : 'SHORT'} direction
                                  with strength of {result.alignmentStrength.toFixed(1)}/12
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
