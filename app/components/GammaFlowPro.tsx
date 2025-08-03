'use client'
import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, TrendingUp, TrendingDown, 
  Activity, BarChart3, Zap, Clock,
  ChevronUp, ChevronDown, ArrowUpRight, ArrowDownRight,
  Flame, Settings, Sparkles, Target, Users, Gauge,
  Radio, PlayCircle, RefreshCw, Download, Save,
  Eye, Moon, Shield, AlertTriangle, Layers,
  DollarSign, Percent, Hash, Timer
} from 'lucide-react';
import { useRealtimeData } from '../hooks/useRealtimeData';
import { RealtimeIndicator } from './RealtimeIndicator';
const GammaFlowPro = () => {
  const [mode, setMode] = useState('screener');
  const [activeView, setActiveView] = useState('table'); // table, gex, flow, darkpool
  const [activeStrategy, setActiveStrategy] = useState('gammaSqueezer');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanResults, setScanResults] = useState({});
  const [scanLoading, setScanLoading] = useState({});
  const [selectedStock, setSelectedStock] = useState(null);
  const [showGEXDetails, setShowGEXDetails] = useState(false);
  // Add real-time data hook
const { data: liveData, loading: liveLoading, error } = useRealtimeData('/api/stocks', 5000)
  
  // Enhanced filters including GEX and options flow
  const [filters, setFilters] = useState({
    // Basic filters
    marketCap: { min: '', max: '' },
    price: { min: '', max: '' },
    volume: { min: '', max: '' },
    change: { min: '', max: '' },
    
    // Technical filters
    rsi: { min: '', max: '' },
    beta: { min: '', max: '' },
    volatility: { min: '', max: '' },
    
    // Options & Greeks filters
    gex: { min: '', max: '' },
    dex: { min: '', max: '' },
    vex: { min: '', max: '' },
    putCallRatio: { min: '', max: '' },
    ivRank: { min: '', max: '' },
    optionVolume: { min: '', max: '' },
    flowScore: { min: '', max: '' },
    
    // Advanced filters
    darkPoolRatio: { min: '', max: '' },
    shortInterest: { min: '', max: '' },
    netPremium: { min: '', max: '' },
    
    // Categories
    sector: 'all',
    exchange: 'all'
  });

  // Enhanced mock data with GEX and options data
  const mockStocks = [
    { 
      symbol: 'AAPL', 
      name: 'Apple Inc.', 
      sector: 'Technology', 
      price: 178.50, 
      change: 2.3, 
      changePercent: 1.31, 
      volume: 58942330, 
      marketCap: 2.8e12,
      exchange: 'NASDAQ',
      
      // Technical data
      rsi: 58,
      beta: 1.20,
      volatility: 22.5,
      high: 180.20, 
      low: 176.80,
      vwap: 178.95,
      
      // Options & Greeks
      gex: 2500000,
      dex: 1800000,
      vex: 450000,
      putCallRatio: 0.65,
      ivRank: 45,
      ivPercentile: 62,
      optionVolume: 125000,
      flowScore: 85,
      
      // Flow data
      callPremium: 8500000,
      putPremium: 5525000,
      netPremium: 2975000,
      largeOrders: 42,
      sweepCount: 18,
      
      // Dark pool & shorts
      darkPoolVolume: 12500000,
      darkPoolRatio: 21.2,
      shortInterest: 1.2,
      shortVolume: 8500000,
      
      // GEX levels
      gammaLevels: {
        flip: 175.50,
        resistance: [180, 182.50, 185],
        support: [175, 172.50, 170]
      }
    },
    { 
      symbol: 'NVDA', 
      name: 'NVIDIA Corp.', 
      sector: 'Technology', 
      price: 485.30, 
      change: 12.5, 
      changePercent: 2.64, 
      volume: 42134500, 
      marketCap: 1.2e12,
      exchange: 'NASDAQ',
      
      rsi: 72,
      beta: 1.65,
      volatility: 45.8,
      high: 492.80, 
      low: 478.20,
      vwap: 486.50,
      
      gex: 5800000,
      dex: 3200000,
      vex: 780000,
      putCallRatio: 0.48,
      ivRank: 82,
      ivPercentile: 91,
      optionVolume: 180000,
      flowScore: 92,
      
      callPremium: 22500000,
      putPremium: 10800000,
      netPremium: 11700000,
      largeOrders: 78,
      sweepCount: 34,
      
      darkPoolVolume: 8900000,
      darkPoolRatio: 21.1,
      shortInterest: 3.2,
      shortVolume: 12300000,
      
      gammaLevels: {
        flip: 480,
        resistance: [490, 495, 500],
        support: [480, 475, 470]
      }
    },
    { 
      symbol: 'GME', 
      name: 'GameStop Corp.', 
      sector: 'Consumer Discretionary', 
      price: 45.30, 
      change: 5.2, 
      changePercent: 12.97, 
      volume: 15234500, 
      marketCap: 13.8e9,
      exchange: 'NYSE',
      
      rsi: 78,
      beta: 2.35,
      volatility: 85.2,
      high: 46.80, 
      low: 40.20,
      vwap: 44.50,
      
      gex: 1200000,
      dex: 850000,
      vex: 320000,
      putCallRatio: 0.35,
      ivRank: 95,
      ivPercentile: 98,
      optionVolume: 250000,
      flowScore: 95,
      
      callPremium: 15600000,
      putPremium: 5460000,
      netPremium: 10140000,
      largeOrders: 125,
      sweepCount: 67,
      
      darkPoolVolume: 3200000,
      darkPoolRatio: 21.0,
      shortInterest: 24.5,
      shortVolume: 8900000,
      
      gammaLevels: {
        flip: 42,
        resistance: [47.50, 50, 55],
        support: [42.50, 40, 37.50]
      }
    },
    { 
      symbol: 'SPY', 
      name: 'SPDR S&P 500 ETF', 
      sector: 'ETF', 
      price: 445.20, 
      change: 1.5, 
      changePercent: 0.34, 
      volume: 85234500, 
      marketCap: 410e9,
      exchange: 'NYSE',
      
      rsi: 55,
      beta: 1.0,
      volatility: 12.5,
      high: 446.80, 
      low: 443.20,
      vwap: 445.00,
      
      gex: 25000000,
      dex: 18000000,
      vex: 4500000,
      putCallRatio: 1.35,
      ivRank: 28,
      ivPercentile: 35,
      optionVolume: 2500000,
      flowScore: 50,
      
      callPremium: 125000000,
      putPremium: 168750000,
      netPremium: -43750000,
      largeOrders: 450,
      sweepCount: 89,
      
      darkPoolVolume: 22500000,
      darkPoolRatio: 26.4,
      shortInterest: 2.1,
      shortVolume: 15600000,
      
      gammaLevels: {
        flip: 444,
        resistance: [447, 450, 452],
        support: [443, 440, 437]
      }
    }
  ];

  // Advanced scanner strategies
  const scannerStrategies = [
    {
      id: 'gammaSqueezer',
      name: '🚀 Gamma Squeeze',
      description: 'High GEX with call skew - potential squeeze',
      icon: Flame,
      color: 'text-orange-400',
      bgColor: 'bg-orange-900/20',
      filters: {
        gex: { min: '1000000', max: '' },
        putCallRatio: { min: '', max: '0.7' },
        optionVolume: { min: '10000', max: '' },
        change: { min: '2', max: '' },
        flowScore: { min: '80', max: '' }
      }
    },
    {
      id: 'darkPoolAccumulation',
      name: '🌑 Dark Pool Accumulation',
      description: 'Institutional buying in dark pools',
      icon: Moon,
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/20',
      filters: {
        darkPoolRatio: { min: '25', max: '' },
        darkPoolVolume: { min: '5000000', max: '' },
        netPremium: { min: '1000000', max: '' },
        change: { min: '-2', max: '2' }
      }
    },
    {
      id: 'optionsWhale',
      name: '🐋 Options Whale Activity',
      description: 'Large options trades by smart money',
      icon: Activity,
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
      filters: {
        largeOrders: { min: '50', max: '' },
        netPremium: { min: '5000000', max: '' },
        flowScore: { min: '85', max: '' },
        sweepCount: { min: '20', max: '' }
      }
    },
    {
      id: 'ivCrush',
      name: '📊 IV Crush Play',
      description: 'High IV rank for premium selling',
      icon: Gauge,
      color: 'text-red-400',
      bgColor: 'bg-red-900/20',
      filters: {
        ivRank: { min: '80', max: '' },
        ivPercentile: { min: '85', max: '' },
        volatility: { min: '40', max: '' },
        optionVolume: { min: '5000', max: '' }
      }
    },
    {
      id: 'gammaWall',
      name: '🧱 Gamma Wall Pin',
      description: 'Stocks pinned by gamma exposure',
      icon: Shield,
      color: 'text-green-400',
      bgColor: 'bg-green-900/20',
      filters: {
        gex: { min: '2000000', max: '' },
        change: { min: '-1', max: '1' },
        volume: { min: '10000000', max: '' }
      }
    },
    {
      id: 'shortSqueeze',
      name: '🔥 Short Squeeze Setup',
      description: 'High SI with positive flow',
      icon: Target,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-900/20',
      filters: {
        shortInterest: { min: '20', max: '' },
        netPremium: { min: '2000000', max: '' },
        change: { min: '3', max: '' },
        flowScore: { min: '75', max: '' }
      }
    }
  ];

  // Filter stocks based on criteria
  const filterStocks = (stockList, customFilters = null) => {
    const filtersToUse = customFilters || filters;
    
    return stockList.filter(stock => {
      // Basic filters
      if (filtersToUse.price?.min && stock.price < parseFloat(filtersToUse.price.min)) return false;
      if (filtersToUse.price?.max && stock.price > parseFloat(filtersToUse.price.max)) return false;
      if (filtersToUse.volume?.min && stock.volume < parseFloat(filtersToUse.volume.min)) return false;
      if (filtersToUse.volume?.max && stock.volume > parseFloat(filtersToUse.volume.max)) return false;
      if (filtersToUse.change?.min && stock.changePercent < parseFloat(filtersToUse.change.min)) return false;
      if (filtersToUse.change?.max && stock.changePercent > parseFloat(filtersToUse.change.max)) return false;
      
      // Greeks filters
      if (filtersToUse.gex?.min && stock.gex < parseFloat(filtersToUse.gex.min)) return false;
      if (filtersToUse.gex?.max && stock.gex > parseFloat(filtersToUse.gex.max)) return false;
      if (filtersToUse.putCallRatio?.min && stock.putCallRatio < parseFloat(filtersToUse.putCallRatio.min)) return false;
      if (filtersToUse.putCallRatio?.max && stock.putCallRatio > parseFloat(filtersToUse.putCallRatio.max)) return false;
      if (filtersToUse.ivRank?.min && stock.ivRank < parseFloat(filtersToUse.ivRank.min)) return false;
      if (filtersToUse.ivRank?.max && stock.ivRank > parseFloat(filtersToUse.ivRank.max)) return false;
      
      // Flow filters
      if (filtersToUse.flowScore?.min && stock.flowScore < parseFloat(filtersToUse.flowScore.min)) return false;
      if (filtersToUse.flowScore?.max && stock.flowScore > parseFloat(filtersToUse.flowScore.max)) return false;
      if (filtersToUse.netPremium?.min && stock.netPremium < parseFloat(filtersToUse.netPremium.min)) return false;
      if (filtersToUse.netPremium?.max && stock.netPremium > parseFloat(filtersToUse.netPremium.max)) return false;
      
      // Advanced filters
      if (filtersToUse.darkPoolRatio?.min && stock.darkPoolRatio < parseFloat(filtersToUse.darkPoolRatio.min)) return false;
      if (filtersToUse.darkPoolRatio?.max && stock.darkPoolRatio > parseFloat(filtersToUse.darkPoolRatio.max)) return false;
      if (filtersToUse.shortInterest?.min && stock.shortInterest < parseFloat(filtersToUse.shortInterest.min)) return false;
      if (filtersToUse.shortInterest?.max && stock.shortInterest > parseFloat(filtersToUse.shortInterest.max)) return false;
      
      // Additional filters for scanner strategies
      if (filtersToUse.largeOrders?.min && stock.largeOrders < parseFloat(filtersToUse.largeOrders.min)) return false;
      if (filtersToUse.sweepCount?.min && stock.sweepCount < parseFloat(filtersToUse.sweepCount.min)) return false;
      if (filtersToUse.ivPercentile?.min && stock.ivPercentile < parseFloat(filtersToUse.ivPercentile.min)) return false;
      if (filtersToUse.darkPoolVolume?.min && stock.darkPoolVolume < parseFloat(filtersToUse.darkPoolVolume.min)) return false;
      
      return true;
    });
  };

  // Run screener
  const runScreener = () => {
    setLoading(true);
    setTimeout(() => {
      const filtered = filterStocks(mockStocks);
      setResults(filtered);
      setLoading(false);
    }, 500);
  };

  // Run scanner
  const runScanner = async (strategyId) => {
    setScanLoading({ ...scanLoading, [strategyId]: true });
    
    const strategy = scannerStrategies.find(s => s.id === strategyId);
    if (!strategy) return;
    
    setTimeout(() => {
      const scanFilters = { ...filters, ...strategy.filters };
      const filtered = filterStocks(mockStocks, scanFilters);
      setScanResults({ ...scanResults, [strategyId]: filtered });
      setScanLoading({ ...scanLoading, [strategyId]: false });
    }, 500);
  };

  // Run all scans
  const runAllScans = () => {
    scannerStrategies.forEach(strategy => {
      runScanner(strategy.id);
    });
  };

  // Format numbers
  const formatNumber = (num) => {
    if (!num) return 'N/A';
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const formatVolume = (num) => {
    if (!num) return 'N/A';
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  };

  useEffect(() => {
    if (mode === 'scanner') {
      runAllScans();
    }
  }, [mode]);

  const containerStyle = {
    backgroundColor: '#030712',
    color: '#f3f4f6',
    minHeight: '100vh'
  };

  // GEX Details Component
  const GEXDetailsModal = ({ stock }) => {
    if (!stock) return null;
    
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setShowGEXDetails(false)}>
        <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              {stock.symbol} - Gamma Exposure Analysis
            </h3>
            <button onClick={() => setShowGEXDetails(false)} className="text-gray-400 hover:text-white">
              ✕
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-800 p-4 rounded">
              <div className="text-sm text-gray-400 mb-1">Total GEX</div>
              <div className="text-2xl font-bold text-purple-400">{formatNumber(stock.gex)}</div>
            </div>
            <div className="bg-gray-800 p-4 rounded">
              <div className="text-sm text-gray-400 mb-1">Gamma Flip Point</div>
              <div className="text-2xl font-bold text-yellow-400">${stock.gammaLevels.flip}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2">Resistance Levels (Negative Gamma)</h4>
              {stock.gammaLevels.resistance.map((level, i) => (
                <div key={i} className="flex justify-between items-center py-1">
                  <span className="text-red-400">R{i + 1}</span>
                  <span className="font-mono">${level}</span>
                </div>
              ))}
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2">Support Levels (Positive Gamma)</h4>
              {stock.gammaLevels.support.map((level, i) => (
                <div key={i} className="flex justify-between items-center py-1">
                  <span className="text-green-400">S{i + 1}</span>
                  <span className="font-mono">${level}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-gray-800 rounded text-sm">
            <p className="text-gray-300">
              <span className="font-medium">Analysis:</span> Price is currently 
              {stock.price > stock.gammaLevels.flip ? (
                <span className="text-green-400"> above </span>
              ) : (
                <span className="text-red-400"> below </span>
              )}
              the gamma flip point. Market makers are 
              {stock.price > stock.gammaLevels.flip ? (
                <span className="text-red-400"> short gamma </span>
              ) : (
                <span className="text-green-400"> long gamma </span>
              )}
              which means volatility is likely to be 
              {stock.price > stock.gammaLevels.flip ? ' higher' : ' lower'}.
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6" style={containerStyle}>
      <div className="max-w-7xl mx-auto">
       {/* Header */}
<div className="mb-6">
  <div className="flex justify-between items-center">
    <div>
      <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
        <Sparkles className="w-8 h-8 text-purple-400" />
        Gamma Flow Pro
        <span className="text-sm bg-purple-900/30 text-purple-400 px-3 py-1 rounded-full">
          Advanced Options Analytics
        </span>
      </h1>
      <p className="text-gray-400">Real-time gamma exposure, options flow, and dark pool analysis</p>
    </div>
    <RealtimeIndicator 
      isConnected={!error} 
      lastUpdate={liveData?.timestamp}
      isLoading={liveLoading}
    />
  </div>
</div>

        {/* Mode & View Switcher */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setMode('screener')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                mode === 'screener' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Filter className="w-5 h-5 inline mr-2" />
              Screener Mode
            </button>
            <button
              onClick={() => setMode('scanner')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                mode === 'scanner' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Radio className="w-5 h-5 inline mr-2" />
              Scanner Mode
            </button>
          </div>
          
          {mode === 'scanner' && (
            <button
              onClick={runAllScans}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
            >
              <PlayCircle className="w-5 h-5" />
              Scan All Strategies
            </button>
          )}
        </div>

        {/* View Tabs (for screener mode) */}
        {mode === 'screener' && results.length > 0 && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveView('table')}
              className={`px-4 py-2 rounded transition-all ${
                activeView === 'table'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4 inline mr-2" />
              Table View
            </button>
            <button
              onClick={() => setActiveView('gex')}
              className={`px-4 py-2 rounded transition-all ${
                activeView === 'gex'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4 inline mr-2" />
              GEX Analysis
            </button>
            <button
              onClick={() => setActiveView('flow')}
              className={`px-4 py-2 rounded transition-all ${
                activeView === 'flow'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4 inline mr-2" />
              Options Flow
            </button>
            <button
              onClick={() => setActiveView('darkpool')}
              className={`px-4 py-2 rounded transition-all ${
                activeView === 'darkpool'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Moon className="w-4 h-4 inline mr-2" />
              Dark Pool
            </button>
          </div>
        )}

        {/* Scanner Mode */}
        {mode === 'scanner' ? (
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
              {scannerStrategies.map(strategy => {
                const Icon = strategy.icon;
                const results = scanResults[strategy.id] || [];
                const isActive = activeStrategy === strategy.id;
                const isLoading = scanLoading[strategy.id];
                
                return (
                  <div
                    key={strategy.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      isActive 
                        ? 'border-purple-500 bg-purple-900/10' 
                        : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                    }`}
                    onClick={() => setActiveStrategy(strategy.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${strategy.bgColor}`}>
                          <Icon className={`w-5 h-5 ${strategy.color}`} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{strategy.name}</h3>
                          <p className="text-sm text-gray-400">{strategy.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          runScanner(strategy.id);
                        }}
                        className="p-2 bg-gray-800 rounded hover:bg-gray-700"
                      >
                        {isLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <PlayCircle className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">{results.length}</span>
                      <span className="text-sm text-gray-400">stocks found</span>
                    </div>
                    
                    {results.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-800">
                        <div className="flex gap-2 flex-wrap">
                          {results.slice(0, 3).map(stock => (
                            <span
                              key={stock.symbol}
                              className="text-xs bg-gray-800 px-2 py-1 rounded flex items-center gap-1"
                            >
                              {stock.symbol}
                              <span className={stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}>
                                {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(1)}%
                              </span>
                            </span>
                          ))}
                          {results.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{results.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Scanner Results */}
            {scanResults[activeStrategy] && scanResults[activeStrategy].length > 0 && (
              <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-800">
                  <h2 className="text-lg font-bold">
                    {scannerStrategies.find(s => s.id === activeStrategy)?.name} Results
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="p-3 text-left">Symbol</th>
                        <th className="p-3 text-left">Name</th>
                        <th className="p-3 text-right">Price</th>
                        <th className="p-3 text-right">Change</th>
                        <th className="p-3 text-right">GEX</th>
                        <th className="p-3 text-right">P/C Ratio</th>
                        <th className="p-3 text-right">Flow Score</th>
                        <th className="p-3 text-right">Net Premium</th>
                        <th className="p-3 text-right">Dark Pool</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scanResults[activeStrategy].map(stock => (
                        <tr key={stock.symbol} className="border-t border-gray-800 hover:bg-gray-800">
                          <td className="p-3 font-medium">{stock.symbol}</td>
                          <td className="p-3 text-gray-300">{stock.name}</td>
                          <td className="p-3 text-right">${stock.price.toFixed(2)}</td>
                          <td className="p-3 text-right">
                            <span className={`flex items-center justify-end gap-1 ${
                              stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {stock.changePercent >= 0 ? (
                                <ArrowUpRight className="w-4 h-4" />
                              ) : (
                                <ArrowDownRight className="w-4 h-4" />
                              )}
                              {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedStock(stock);
                                setShowGEXDetails(true);
                              }}
                              className="text-purple-400 hover:text-purple-300 font-medium"
                            >
                              {formatNumber(stock.gex)}
                            </button>
                          </td>
                          <td className="p-3 text-right">
                            <span className={`px-2 py-1 rounded text-xs ${
                              stock.putCallRatio > 1.5 ? 'bg-red-900 text-red-400' :
                              stock.putCallRatio < 0.5 ? 'bg-green-900 text-green-400' :
                              'bg-gray-700'
                            }`}>
                              {stock.putCallRatio.toFixed(2)}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <div className="w-16 bg-gray-700 rounded-full h-2">
                                <div
                                  className="bg-purple-500 h-2 rounded-full"
                                  style={{ width: `${stock.flowScore}%` }}
                                />
                              </div>
                              <span className="text-xs">{stock.flowScore}</span>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <span className={stock.netPremium >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {formatNumber(Math.abs(stock.netPremium))}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <span className="text-gray-400">{stock.darkPoolRatio.toFixed(1)}%</span>
                          </td>
                          <td className="p-3 text-center">
                            <button className="text-purple-400 hover:text-purple-300">
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Screener Mode */
          <>
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Filter className="w-5 h-5 text-purple-400" />
                Advanced Screening Filters
              </h2>
              
              {/* Basic Filters */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Basic Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Price Range</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.price.min}
                        onChange={(e) => setFilters({...filters, price: {...filters.price, min: e.target.value}})}
                        className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.price.max}
                        onChange={(e) => setFilters({...filters, price: {...filters.price, max: e.target.value}})}
                        className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Change %</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.change.min}
                        onChange={(e) => setFilters({...filters, change: {...filters.change, min: e.target.value}})}
                        className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.change.max}
                        onChange={(e) => setFilters({...filters, change: {...filters.change, max: e.target.value}})}
                        className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Volume</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.volume.min}
                        onChange={(e) => setFilters({...filters, volume: {...filters.volume, min: e.target.value}})}
                        className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.volume.max}
                        onChange={(e) => setFilters({...filters, volume: {...filters.volume, max: e.target.value}})}
                        className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Market Cap</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.marketCap.min}
                        onChange={(e) => setFilters({...filters, marketCap: {...filters.marketCap, min: e.target.value}})}
                        className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.marketCap.max}
                        onChange={(e) => setFilters({...filters, marketCap: {...filters.marketCap, max: e.target.value}})}
                        className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Greeks & Options Filters */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Greeks & Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block flex items-center gap-1">
                      GEX (Gamma Exposure)
                      <Sparkles className="w-3 h-3 text-purple-400" />
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.gex.min}
                        onChange={(e) => setFilters({...filters, gex: {...filters.gex, min: e.target.value}})}
                        className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.gex.max}
                        onChange={(e) => setFilters({...filters, gex: {...filters.gex, max: e.target.value}})}
                        className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Put/Call Ratio</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.putCallRatio.min}
                        onChange={(e) => setFilters({...filters, putCallRatio: {...filters.putCallRatio, min: e.target.value}})}
                        className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.putCallRatio.max}
                        onChange={(e) => setFilters({...filters, putCallRatio: {...filters.putCallRatio, max: e.target.value}})}
                        className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">IV Rank %</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.ivRank.min}
                        onChange={(e) => setFilters({...filters, ivRank: {...filters.ivRank, min: e.target.value}})}
                        className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.ivRank.max}
                        onChange={(e) => setFilters({...filters, ivRank: {...filters.ivRank, max: e.target.value}})}
                        className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Flow Score</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.flowScore.min}
                        onChange={(e) => setFilters({...filters, flowScore: {...filters.flowScore, min: e.target.value}})}
                        className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.flowScore.max}
                        onChange={(e) => setFilters({...filters, flowScore: {...filters.flowScore, max: e.target.value}})}
                        className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={runScreener}
                className="w-full px-6 py-3 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 inline mr-2 animate-spin" />
                    Screening...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 inline mr-2" />
                    Run Advanced Screener
                  </>
                )}
              </button>
            </div>

            {/* Results */}
            {results.length > 0 && activeView === 'table' && (
              <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-800">
                  <h2 className="text-lg font-bold">Screener Results ({results.length} stocks)</h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="p-3 text-left">Symbol</th>
                        <th className="p-3 text-left">Name</th>
                        <th className="p-3 text-right">Price</th>
                        <th className="p-3 text-right">Change</th>
                        <th className="p-3 text-right">Volume</th>
                        <th className="p-3 text-right">GEX</th>
                        <th className="p-3 text-right">P/C Ratio</th>
                        <th className="p-3 text-right">IV Rank</th>
                        <th className="p-3 text-right">Flow Score</th>
                        <th className="p-3 text-right">Net Premium</th>
                        <th className="p-3 text-right">Dark Pool</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map(stock => (
                        <tr key={stock.symbol} className="border-t border-gray-800 hover:bg-gray-800">
                          <td className="p-3 font-medium">{stock.symbol}</td>
                          <td className="p-3 text-gray-300">{stock.name}</td>
                          <td className="p-3 text-right">${stock.price.toFixed(2)}</td>
                          <td className="p-3 text-right">
                            <span className={stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                            </span>
                          </td>
                          <td className="p-3 text-right">{formatVolume(stock.volume)}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedStock(stock);
                                setShowGEXDetails(true);
                              }}
                              className="text-purple-400 hover:text-purple-300 font-medium"
                            >
                              {formatNumber(stock.gex)}
                            </button>
                          </td>
                          <td className="p-3 text-right">
                            <span className={`px-2 py-1 rounded text-xs ${
                              stock.putCallRatio > 1.5 ? 'bg-red-900 text-red-400' :
                              stock.putCallRatio < 0.5 ? 'bg-green-900 text-green-400' :
                              'bg-gray-700'
                            }`}>
                              {stock.putCallRatio.toFixed(2)}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <span className={`px-2 py-1 rounded text-xs ${
                              stock.ivRank > 80 ? 'bg-orange-900 text-orange-400' :
                              stock.ivRank < 30 ? 'bg-blue-900 text-blue-400' :
                              'bg-gray-700'
                            }`}>
                              {stock.ivRank}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <div className="w-16 bg-gray-700 rounded-full h-2">
                                <div
                                  className="bg-purple-500 h-2 rounded-full"
                                  style={{ width: `${stock.flowScore}%` }}
                                />
                              </div>
                              <span className="text-xs">{stock.flowScore}</span>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <span className={stock.netPremium >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {formatNumber(Math.abs(stock.netPremium))}
                            </span>
                          </td>
                          <td className="p-3 text-right text-gray-400">
                            {stock.darkPoolRatio.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* GEX View */}
            {results.length > 0 && activeView === 'gex' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {results.map(stock => (
                  <div key={stock.symbol} className="bg-gray-900 rounded-lg border border-gray-800 p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold">{stock.symbol}</h3>
                        <p className="text-sm text-gray-400">{stock.name}</p>
                      </div>
                      <span className={`text-lg font-bold ${
                        stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        ${stock.price.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center">
                        <div className="text-xs text-gray-400 mb-1">Total GEX</div>
                        <div className="text-purple-400 font-bold">{formatNumber(stock.gex)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-400 mb-1">Gamma Flip</div>
                        <div className="text-yellow-400 font-bold">${stock.gammaLevels.flip}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-400 mb-1">Position</div>
                        <div className={stock.price > stock.gammaLevels.flip ? 'text-red-400' : 'text-green-400'}>
                          {stock.price > stock.gammaLevels.flip ? 'Above' : 'Below'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Next Resistance</span>
                        <span className="text-red-400">
                          ${stock.gammaLevels.resistance.find(r => r > stock.price) || stock.gammaLevels.resistance[0]}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Next Support</span>
                        <span className="text-green-400">
                          ${[...stock.gammaLevels.support].reverse().find(s => s < stock.price) || stock.gammaLevels.support[stock.gammaLevels.support.length - 1]}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Options Flow View */}
            {results.length > 0 && activeView === 'flow' && (
              <div className="space-y-4">
                {results.map(stock => (
                  <div key={stock.symbol} className="bg-gray-900 rounded-lg border border-gray-800 p-4">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="text-lg font-bold">{stock.symbol}</h3>
                          <p className="text-sm text-gray-400">{stock.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm bg-purple-900/30 text-purple-400 px-2 py-1 rounded">
                            Flow Score: {stock.flowScore}
                          </span>
                          <span className={`text-sm px-2 py-1 rounded ${
                            stock.netPremium >= 0 
                              ? 'bg-green-900/30 text-green-400' 
                              : 'bg-red-900/30 text-red-400'
                          }`}>
                            Net: {formatNumber(Math.abs(stock.netPremium))}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">${stock.price.toFixed(2)}</div>
                        <div className={stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Call Premium</div>
                        <div className="text-green-400 font-medium">{formatNumber(stock.callPremium)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Put Premium</div>
                        <div className="text-red-400 font-medium">{formatNumber(stock.putPremium)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Large Orders</div>
                        <div className="font-medium">{stock.largeOrders}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Sweep Count</div>
                        <div className="font-medium">{stock.sweepCount}</div>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-800">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Put/Call Ratio</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-red-500 to-green-500 h-2 rounded-full"
                              style={{ width: `${(1 - stock.putCallRatio) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{stock.putCallRatio.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Dark Pool View */}
            {results.length > 0 && activeView === 'darkpool' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {results.map(stock => (
                  <div key={stock.symbol} className="bg-gray-900 rounded-lg border border-gray-800 p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold">{stock.symbol}</h3>
                        <p className="text-sm text-gray-400">{stock.name}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">${stock.price.toFixed(2)}</div>
                        <div className={`text-sm ${
                          stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-400">Dark Pool Volume</span>
                          <span className="text-sm font-medium">{formatVolume(stock.darkPoolVolume)}</span>
                        </div>
                        <div className="bg-gray-800 rounded-full h-3">
                          <div
                            className="bg-purple-500 h-3 rounded-full"
                            style={{ width: `${stock.darkPoolRatio}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{stock.darkPoolRatio.toFixed(1)}% of total volume</div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Short Interest</div>
                          <div className="font-medium">{stock.shortInterest.toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Short Volume</div>
                          <div className="font-medium">{formatVolume(stock.shortVolume)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* GEX Details Modal */}
      {showGEXDetails && <GEXDetailsModal stock={selectedStock} />}
    </div>
  );
};

export default GammaFlowPro;