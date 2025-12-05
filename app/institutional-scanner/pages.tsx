'use client';

import { useState, useEffect } from 'react';
import {
  processStocksForMode,
  getScoreBreakdown,
  getModeDescription,
  getModeWeightsDisplay,
  getScoreColor,
  getScoreLabel,
  ScanMode,
  ScannerResult,
  StockData
} from '@/lib/scanners';

interface ScoreBreakdown {
  symbol: string;
  breakdown: {
    tank: { score: number; weight: number; contribution: number };
    rad: { score: number; weight: number; contribution: number };
    mpLp: { score: number; weight: number; contribution: number };
    osv: { score: number; weight: number; contribution: number };
    liquidity: { score: number; weight: number; contribution: number };
    total: number;
  };
}

export default function InstitutionalScanner() {
  const [results, setResults] = useState<ScannerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<ScanMode>('intraday');
  const [selectedBreakdown, setSelectedBreakdown] = useState<ScoreBreakdown | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAndProcess = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/stocks');
      if (!response.ok) throw new Error('Failed to fetch stocks');
      
      const data = await response.json();
      const stocks: StockData[] = data.stocks || data || [];
      
      const processed = processStocksForMode(stocks, scanMode, 50);
      setResults(processed);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAndProcess();
  }, [scanMode]);

  const modeWeights = getModeWeightsDisplay(scanMode);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Institutional Scanner Pro</h1>
        <p className="text-gray-400">
          Multi-factor analysis combining TANK Flow, RAD Setups, MP/LP Zones, OSV Metrics & Liquidity
        </p>
      </div>

      {/* Mode Selection */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-3 mb-4">
          {(['intraday', 'swing', 'longterm', 'liquidity'] as ScanMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setScanMode(mode)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                scanMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
          <button
            onClick={fetchAndProcess}
            disabled={loading}
            className="ml-auto px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Scanning...' : '🔄 Refresh'}
          </button>
        </div>

        {/* Mode Description */}
        <p className="text-sm text-gray-400 mb-3">{getModeDescription(scanMode)}</p>

        {/* Weight Visualization */}
        <div className="flex gap-2 items-center">
          <span className="text-xs text-gray-500">Weights:</span>
          {modeWeights.map((w) => (
            <div key={w.name} className="flex items-center gap-1">
              <div
                className="h-2 rounded"
                style={{
                  width: `${w.weight * 1.5}px`,
                  backgroundColor: w.color,
                  minWidth: '8px'
                }}
              />
              <span className="text-xs text-gray-400">
                {w.name} {w.weight}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Score Breakdown Modal */}
      {selectedBreakdown && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{selectedBreakdown.symbol} Score Breakdown</h3>
              <button
                onClick={() => setSelectedBreakdown(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3">
              {[
                { name: 'TANK Flow', key: 'tank', color: '#3b82f6' },
                { name: 'RAD Setup', key: 'rad', color: '#10b981' },
                { name: 'MP/LP Zones', key: 'mpLp', color: '#f59e0b' },
                { name: 'OSV Metrics', key: 'osv', color: '#8b5cf6' },
                { name: 'Liquidity', key: 'liquidity', color: '#ef4444' }
              ].map((scanner) => {
                const data = selectedBreakdown.breakdown[scanner.key as keyof typeof selectedBreakdown.breakdown] as {
                  score: number;
                  weight: number;
                  contribution: number;
                };
                return (
                  <div key={scanner.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: scanner.color }}
                      />
                      <span className="text-gray-300">{scanner.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-400 text-sm">
                        {data.score} × {(data.weight * 100).toFixed(0)}% = 
                      </span>
                      <span className="font-bold ml-1" style={{ color: scanner.color }}>
                        {data.contribution}
                      </span>
                    </div>
                  </div>
                );
              })}
              
              <div className="border-t border-gray-700 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Combined Score</span>
                  <span
                    className="text-2xl font-bold"
                    style={{ color: getScoreColor(selectedBreakdown.breakdown.total) }}
                  >
                    {selectedBreakdown.breakdown.total}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  {getScoreLabel(selectedBreakdown.breakdown.total)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Results Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Symbol</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">Price</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">Change</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">
                  <span title="Click score for breakdown">Score 🔍</span>
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-blue-400">TANK</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-green-400">RAD</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-yellow-400">MP/LP</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-purple-400">OSV</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-red-400">LIQ</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Signals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      Scanning markets...
                    </div>
                  </td>
                </tr>
              ) : results.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                    No results found
                  </td>
                </tr>
              ) : (
                results.map((result, idx) => (
                  <tr key={result.symbol} className="hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-bold text-white">{result.symbol}</span>
                        <p className="text-xs text-gray-400 truncate max-w-[150px]">
                          {result.company}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      ${result.price.toFixed(2)}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${
                      result.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {result.changePercent >= 0 ? '+' : ''}{result.changePercent.toFixed(2)}%
                    </td>
                    <td
                      className="px-4 py-3 text-center cursor-pointer hover:bg-gray-600/50 rounded transition-colors"
                      onClick={() => {
                        const breakdown = getScoreBreakdown(
                          result.tankScore,
                          result.radScore,
                          result.mpLpScore,
                          result.osvScore,
                          result.liquidityScore,
                          scanMode
                        );
                        setSelectedBreakdown({ symbol: result.symbol, breakdown });
                      }}
                      title="Click for breakdown"
                    >
                      <span
                        className="font-bold text-lg"
                        style={{ color: getScoreColor(result.combinedScore) }}
                      >
                        {result.combinedScore}
                      </span>
                      <p className="text-xs text-gray-500">
                        {getScoreLabel(result.combinedScore)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm ${result.tankScore >= 60 ? 'text-blue-400' : 'text-gray-500'}`}>
                        {result.tankScore}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm ${result.radScore >= 60 ? 'text-green-400' : 'text-gray-500'}`}>
                        {result.radScore}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm ${result.mpLpScore >= 60 ? 'text-yellow-400' : 'text-gray-500'}`}>
                        {result.mpLpScore}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm ${result.osvScore >= 60 ? 'text-purple-400' : 'text-gray-500'}`}>
                        {result.osvScore}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm ${result.liquidityScore >= 60 ? 'text-red-400' : 'text-gray-500'}`}>
                        {result.liquidityScore}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[250px]">
                        {result.signals.slice(0, 3).map((signal, i) => (
                          <span
                            key={i}
                            className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300"
                          >
                            {signal}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {lastUpdated && (
          <div className="bg-gray-700/50 px-4 py-2 text-xs text-gray-400 flex justify-between">
            <span>Showing {results.length} results</span>
            <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
