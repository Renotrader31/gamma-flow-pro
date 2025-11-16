'use client'
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Radio, PlayCircle, Settings, Activity, TrendingUp, TrendingDown,
  Zap, Clock, Target, Eye, RefreshCw, Briefcase, Sparkles
} from 'lucide-react';
import { AITradeIdeas } from '../components/AITradeIdeas';

type ScanMode = 'intraday' | 'swing' | 'longterm';

interface ScanResult {
  symbol: string;
  company: string;
  price: number;
  changePercent: number;
  volume: number;
  score: number;
  signals: string[];
}

const formatVolume = (num: number) => {
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
};

const modeConfigs = {
  intraday: {
    name: 'Intraday Scalper',
    description: '0-2 DTE options, GEX pivots, 60-second refresh',
    interval: 60,
    targets: ['SPY', 'QQQ', 'IWM', 'High gamma stocks'],
    strategies: ['0DTE scalps', 'GEX wall fades', 'Flow pressure plays'],
    icon: Zap,
    color: 'text-orange-400',
    bgColor: 'bg-orange-900/20'
  },
  swing: {
    name: 'Swing Trading',
    description: '30-45 DTE spreads, multi-day holds, 5-minute refresh',
    interval: 300,
    targets: ['Top 50 tickers', 'Earnings plays', 'Momentum stocks'],
    strategies: ['Credit spreads', 'Iron condors', 'Trend following'],
    icon: Activity,
    color: 'text-blue-400',
    bgColor: 'bg-blue-900/20'
  },
  longterm: {
    name: 'Long-Term Investment',
    description: 'Congress tracking (30%), 13F filings, hourly refresh',
    interval: 3600,
    targets: ['Blue chips', 'Congress buys', 'Institutional accumulation'],
    strategies: ['Congress tracking', '13F filings', 'Institutional flow'],
    icon: Briefcase,
    color: 'text-green-400',
    bgColor: 'bg-green-900/20'
  }
};

export default function InstitutionalScanner() {
  const [mode, setMode] = useState<ScanMode>('intraday');
  const [isAutoScanning, setIsAutoScanning] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [minScore, setMinScore] = useState(70);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [lastScan, setLastScan] = useState<Date>(new Date());
  const [countdown, setCountdown] = useState(60);
  const [stockData, setStockData] = useState<any[]>([]);
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [showAIIdeas, setShowAIIdeas] = useState(false);

  const config = modeConfigs[mode];

  // Fetch stock data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/stocks');
        const data = await response.json();
        if (data.status === 'success' && data.data) {
          setStockData(data.data);
        }
      } catch (error) {
        console.error('Error fetching stock data:', error);
      }
    };

    fetchData();
  }, []);

  // Scan function
  const runScan = () => {
    if (stockData.length === 0) {
      // Demo data when API is unavailable
      const demoResults: ScanResult[] = [
        {
          symbol: 'SPY',
          company: 'SPDR S&P 500 ETF',
          price: 478.25,
          changePercent: 0.81,
          volume: 85420000,
          score: 88,
          signals: ['High Volume', 'Big Mover', 'Extreme Flow']
        },
        {
          symbol: 'QQQ',
          company: 'Invesco QQQ Trust',
          price: 412.50,
          changePercent: 1.03,
          volume: 52300000,
          score: 85,
          signals: ['Above Avg Volume', 'Big Mover', 'Strong Flow']
        },
        {
          symbol: 'NVDA',
          company: 'NVIDIA Corporation',
          price: 875.50,
          changePercent: 2.19,
          volume: 42100000,
          score: 92,
          signals: ['High Volume', 'Big Mover', 'Extreme Flow']
        },
        {
          symbol: 'TSLA',
          company: 'Tesla Inc',
          price: 242.80,
          changePercent: -1.68,
          volume: 98500000,
          score: 82,
          signals: ['High Volume', 'Big Mover', 'Strong Flow']
        },
        {
          symbol: 'AMD',
          company: 'Advanced Micro Devices',
          price: 178.45,
          changePercent: 1.65,
          volume: 35200000,
          score: 78,
          signals: ['Above Avg Volume', 'Big Mover', 'GEX Wall Nearby']
        },
        {
          symbol: 'AAPL',
          company: 'Apple Inc',
          price: 195.25,
          changePercent: -0.54,
          volume: 52800000,
          score: 72,
          signals: ['Above Avg Volume', 'Active', 'Strong Flow']
        }
      ];
      setResults(demoResults.filter(r => r.score >= minScore));
    } else {
      // Calculate scores from real data - mode-specific scoring
      const scoredResults = stockData
        .map(stock => {
          let score = 50;
          const signals: string[] = [];

          if (mode === 'intraday') {
            // Intraday Scalper: Focus on volume, volatility, and quick moves
            if (stock.volume > 50000000) {
              score += 20;
              signals.push('High Volume');
            } else if (stock.volume > 20000000) {
              score += 10;
              signals.push('Above Avg Volume');
            }

            if (Math.abs(stock.changePercent) > 2) {
              score += 20;
              signals.push('Big Mover');
            } else if (Math.abs(stock.changePercent) > 1) {
              score += 12;
              signals.push('Active');
            }

            if (stock.flowScore > 80) {
              score += 15;
              signals.push('Extreme Flow');
            } else if (stock.flowScore > 60) {
              score += 10;
              signals.push('Strong Flow');
            }

            if (stock.gex > 200000000) {
              score += 10;
              signals.push('GEX Wall Nearby');
            }

            // Prefer liquid, high-volume stocks
            if (stock.price > 100 && stock.volume > 30000000) {
              score += 5;
            }

          } else if (mode === 'swing') {
            // Swing Trading: Focus on moderate moves, consistent volume, trend strength
            if (stock.volume > 30000000) {
              score += 12;
              signals.push('Consistent Volume');
            } else if (stock.volume > 10000000) {
              score += 8;
              signals.push('Decent Volume');
            }

            // Moderate price changes (not too volatile)
            if (Math.abs(stock.changePercent) > 1 && Math.abs(stock.changePercent) < 4) {
              score += 18;
              signals.push('Good Swing Setup');
            } else if (Math.abs(stock.changePercent) > 0.5) {
              score += 10;
              signals.push('Moderate Move');
            }

            // Options activity
            if (stock.optionVolume > 20000) {
              score += 15;
              signals.push('Active Options');
            }

            // IV Rank for spreads
            if (stock.ivRank > 50 && stock.ivRank < 80) {
              score += 12;
              signals.push('Good IV for Spreads');
            }

            // Trend strength
            if (stock.flowScore > 65 && stock.flowScore < 90) {
              score += 10;
              signals.push('Trend Following');
            }

          } else if (mode === 'longterm') {
            // Long-term Investment: Focus on fundamentals, market cap, institutional activity
            if (stock.marketCap > 50000000000) {
              score += 20;
              signals.push('Blue Chip');
            } else if (stock.marketCap > 10000000000) {
              score += 12;
              signals.push('Large Cap');
            }

            // Prefer steady, not too volatile
            if (Math.abs(stock.changePercent) < 2 && stock.volume > 5000000) {
              score += 15;
              signals.push('Stable Growth');
            }

            // Institutional flow (net premium)
            if (stock.netPremium && Math.abs(stock.netPremium) > 10000000) {
              score += 20;
              signals.push('Institutional Flow');
            } else if (stock.netPremium && Math.abs(stock.netPremium) > 3000000) {
              score += 12;
              signals.push('Smart Money');
            }

            // Options interest for covered calls
            if (stock.optionVolume > 10000 && stock.price > 50) {
              score += 10;
              signals.push('Options Liquidity');
            }

            // Quality filter - price and market cap
            if (stock.price > 30 && stock.marketCap > 5000000000) {
              score += 8;
              signals.push('Quality Stock');
            }
          }

          return {
            symbol: stock.symbol,
            company: stock.name || stock.symbol,
            price: stock.price,
            changePercent: stock.changePercent,
            volume: stock.volume,
            score: Math.min(100, score),
            signals
          };
        })
        .filter(r => r.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);

      setResults(scoredResults);
    }

    setLastScan(new Date());
    setCountdown(config.interval);
  };

  // Auto-scan effect
  useEffect(() => {
    if (isAutoScanning) {
      runScan();
    }
  }, [mode, stockData, minScore]);

  // Countdown timer
  useEffect(() => {
    if (!isAutoScanning) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          runScan();
          return config.interval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAutoScanning, config.interval]);

  const formatTime = (seconds: number) => {
    if (seconds >= 3600) return `${Math.floor(seconds / 3600)}hr`;
    if (seconds >= 60) return `${Math.floor(seconds / 60)}min`;
    return `${seconds}s`;
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
            Back to Scanner
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Institutional Scanner Pro</h1>
              <p className="text-gray-400">Multi-mode professional scanning with Congress tracking</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">
                Last scan: {lastScan.toLocaleTimeString()} • Next: {formatTime(countdown)}
              </div>
              <div className="flex items-center justify-end gap-2">
                <span className={`w-2 h-2 rounded-full ${isAutoScanning ? 'bg-green-500' : 'bg-gray-500'} animate-pulse`}></span>
                <span className="text-sm font-medium">{isAutoScanning ? 'Live' : 'Paused'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {(Object.keys(modeConfigs) as ScanMode[]).map(modeKey => {
            const cfg = modeConfigs[modeKey];
            const Icon = cfg.icon;
            const isActive = mode === modeKey;

            return (
              <div
                key={modeKey}
                onClick={() => setMode(modeKey)}
                className={`border rounded-lg p-6 cursor-pointer transition-all ${
                  isActive
                    ? 'border-purple-500 bg-purple-900/10'
                    : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-3 rounded-lg ${cfg.bgColor}`}>
                    <Icon className={`w-6 h-6 ${cfg.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{cfg.name}</h3>
                    <p className="text-sm text-gray-400">{cfg.description}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Targets:</div>
                    <div className="flex flex-wrap gap-1">
                      {cfg.targets.map((target, i) => (
                        <span key={i} className="text-xs bg-gray-800 px-2 py-1 rounded">
                          {target}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Control Panel */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold mb-2">{config.name} Mode</h3>
              <p className="text-sm text-gray-400">{config.description}</p>
              {stockData.length === 0 && (
                <p className="text-xs text-yellow-500 mt-1">Using demo data - API unavailable</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-400 mb-1">Strategies</div>
                <div className="space-y-1">
                  {config.strategies.map((strategy, i) => (
                    <div key={i} className="text-xs text-gray-500">{strategy}</div>
                  ))}
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm text-gray-400 mb-1">Refresh Rate</div>
                <div className="text-2xl font-bold text-purple-400">{formatTime(config.interval)}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Auto-scanning {isAutoScanning ? 'ON' : 'OFF'}
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm text-gray-400 mb-1">Results</div>
                <div className="text-2xl font-bold text-white">{results.length}</div>
                <div className="text-xs text-gray-500 mt-1">Score ≥ {minScore}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-800 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Min Score:</label>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={minScore}
                onChange={(e) => setMinScore(parseInt(e.target.value))}
                className="w-32"
              />
              <span className="text-sm font-medium w-8">{minScore}</span>
            </div>

            <button
              onClick={() => setIsAutoScanning(!isAutoScanning)}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                isAutoScanning
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <Radio className={`w-4 h-4 ${isAutoScanning ? 'animate-pulse' : ''}`} />
              {isAutoScanning ? 'Auto-Scan ON' : 'Auto-Scan OFF'}
            </button>

            <button
              onClick={runScan}
              disabled={isScanning}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg font-medium transition-all flex items-center gap-2"
            >
              <PlayCircle className="w-4 h-4" />
              Scan Now
            </button>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-lg font-bold">Scan Results ({results.length})</h3>
          </div>

          {results.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No results found matching your criteria</p>
              <p className="text-sm text-gray-500 mt-1">Try lowering the minimum score</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="p-3 text-left">Symbol</th>
                    <th className="p-3 text-left">Company</th>
                    <th className="p-3 text-right">Price</th>
                    <th className="p-3 text-right">Change</th>
                    <th className="p-3 text-right">Volume</th>
                    <th className="p-3 text-right">Score</th>
                    <th className="p-3 text-left">Signals</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result.symbol} className="border-t border-gray-800 hover:bg-gray-800/50">
                      <td className="p-3 font-bold">{result.symbol}</td>
                      <td className="p-3 text-gray-300">{result.company}</td>
                      <td className="p-3 text-right">${result.price.toFixed(2)}</td>
                      <td className="p-3 text-right">
                        <span className={result.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {result.changePercent >= 0 ? '+' : ''}{result.changePercent.toFixed(2)}%
                        </span>
                      </td>
                      <td className="p-3 text-right">{formatVolume(result.volume)}</td>
                      <td className="p-3 text-right">
                        <span className={`px-3 py-1 rounded-full font-bold ${
                          result.score >= 90 ? 'bg-green-900/30 text-green-400' :
                          result.score >= 80 ? 'bg-blue-900/30 text-blue-400' :
                          result.score >= 70 ? 'bg-yellow-900/30 text-yellow-400' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {result.score}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {result.signals.map((signal, i) => (
                            <span
                              key={i}
                              className="text-xs bg-purple-900/30 text-purple-400 px-2 py-1 rounded"
                            >
                              {signal}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedStock(result);
                            setShowAIIdeas(true);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium transition-all"
                        >
                          <Sparkles className="w-3 h-3" />
                          Analyze
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* AI Trade Ideas Modal */}
      {showAIIdeas && (
        <AITradeIdeas
          stock={selectedStock}
          onClose={() => setShowAIIdeas(false)}
        />
      )}
    </div>
  );
}
