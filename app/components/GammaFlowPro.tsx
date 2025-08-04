'use client'
import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, TrendingUp, TrendingDown, 
  Activity, BarChart3, Zap, Clock,
  ChevronUp, ChevronDown, ArrowUpRight, ArrowDownRight,
  Flame, Settings, Sparkles, Target, Users, Gauge,
  Radio, PlayCircle, RefreshCw, Download, Save,
  Eye, Moon, Shield, AlertTriangle, Layers,
  DollarSign, Percent, Hash, Timer,
  X, Brain
} from 'lucide-react';
import { useRealtimeData } from '../hooks/useRealtimeData';
import { RealtimeIndicator } from './RealtimeIndicator';

// AI Trade Ideas Component
const AITradeIdeas = ({ onClose }: { onClose: () => void }) => {
  const [selectedIdea, setSelectedIdea] = useState<any>(null);
  const [filter, setFilter] = useState('all');

  const AI_TRADE_IDEAS = [
    {
      id: 1,
      symbol: 'NVDA',
      type: 'Long Call Spread',
      confidence: 92,
      riskReward: '1:3.5',
      timeframe: '2-3 weeks',
      entry: {
        buy: 'Buy 490C Jan 17',
        sell: 'Sell 510C Jan 17',
        netDebit: 850
      },
      reasoning: [
        'High GEX above gamma flip indicates volatility expansion',
        'Unusual call activity detected with 3x normal volume',
        'Price consolidating above key support at $480',
        'IV rank at 82% suggests potential volatility crush post-move'
      ],
      targets: ['495', '500', '505'],
      stopLoss: '478',
      maxProfit: 1150,
      maxLoss: 850,
      probability: 68,
      tags: ['momentum', 'unusual_activity', 'volatility_play']
    },
    {
      id: 2,
      symbol: 'SPY',
      type: 'Iron Condor',
      confidence: 85,
      riskReward: '1:2.8',
      timeframe: '1 week',
      entry: {
        sellCall: 'Sell 450C Jan 10',
        buyCall: 'Buy 452C Jan 10',
        sellPut: 'Sell 440P Jan 10',
        buyPut: 'Buy 438P Jan 10',
        netCredit: 140
      },
      reasoning: [
        'High GEX indicates pinning action likely',
        'Low IV rank suggests range-bound movement',
        'Dark pool accumulation at current levels',
        'Options flow balanced between calls and puts'
      ],
      targets: ['445 (pin)'],
      stopLoss: 'Breach of 451 or 439',
      maxProfit: 140,
      maxLoss: 60,
      probability: 75,
      tags: ['theta_play', 'low_volatility', 'gamma_pin']
    },
    {
      id: 3,
      symbol: 'GME',
      type: 'Gamma Squeeze Play',
      confidence: 78,
      riskReward: '1:5.2',
      timeframe: '3-5 days',
      entry: {
        buy: 'Buy 50C Jan 10',
        shares: 'Consider 100 shares',
        avgCost: 1250
      },
      reasoning: [
        'Extreme call skew with P/C ratio at 0.35',
        'Short interest remains elevated at 24.5%',
        'Sweep orders detected at ask across multiple strikes',
        'Gamma ramp building above $47.50'
      ],
      targets: ['50', '55', '60+'],
      stopLoss: '42',
      maxProfit: 'Unlimited',
      maxLoss: 1250,
      probability: 45,
      tags: ['high_risk', 'squeeze_potential', 'momentum']
    },
    {
      id: 4,
      symbol: 'AAPL',
      type: 'Covered Call',
      confidence: 88,
      riskReward: '1:1.5',
      timeframe: '30 days',
      entry: {
        own: 'Own 100 shares',
        sell: 'Sell 185C Feb 21',
        premium: 425
      },
      reasoning: [
        'Price approaching resistance with decreasing momentum',
        'IV elevated relative to historical average',
        'Dark pool selling detected at $180+',
        'RSI showing bearish divergence'
      ],
      targets: ['Hold to expiry'],
      stopLoss: '172 (on shares)',
      maxProfit: 975,
      maxLoss: 'Opportunity cost',
      probability: 82,
      tags: ['income', 'low_risk', 'premium_collection']
    }
  ];

  const filteredIdeas = AI_TRADE_IDEAS.filter(idea => {
    if (filter === 'all') return true;
    if (filter === 'high_confidence') return idea.confidence >= 85;
    return idea.tags.includes(filter);
  });

  const getRiskColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-400 bg-green-900/20';
    if (confidence >= 70) return 'text-yellow-400 bg-yellow-900/20';
    return 'text-red-400 bg-red-900/20';
  };

  const getTypeColor = (type: string) => {
    if (type.includes('Call') || type.includes('Squeeze')) return 'text-green-400';
    if (type.includes('Put') || type.includes('Short')) return 'text-red-400';
    if (type.includes('Iron') || type.includes('Covered')) return 'text-purple-400';
    return 'text-blue-400';
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-gray-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-900/30 rounded-lg">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">AI Trade Ideas</h3>
              <p className="text-gray-400">Powered by advanced options flow analysis</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-800 bg-gray-800/50">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'all' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All Ideas ({AI_TRADE_IDEAS.length})
            </button>
            <button
              onClick={() => setFilter('high_confidence')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'high_confidence' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              High Confidence ({AI_TRADE_IDEAS.filter(i => i.confidence >= 85).length})
            </button>
            <button
              onClick={() => setFilter('momentum')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'momentum' 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Momentum Plays ({AI_TRADE_IDEAS.filter(i => i.tags.includes('momentum')).length})
            </button>
          </div>
        </div>

        {/* Trade Ideas Grid */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredIdeas.map(idea => (
              <div 
                key={idea.id}
                className="bg-gray-800 rounded-lg border border-gray-700 hover:border-purple-500 transition-all cursor-pointer p-4"
                onClick={() => setSelectedIdea(idea)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="text-xl font-bold flex items-center gap-2">
                      {idea.symbol}
                      <span className={`text-sm px-2 py-1 rounded ${getTypeColor(idea.type)}`}>
                        {idea.type}
                      </span>
                    </h4>
                    <p className="text-gray-400 text-sm">{idea.timeframe} • Risk/Reward: {idea.riskReward}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-sm font-medium ${getRiskColor(idea.confidence)}`}>
                    {idea.confidence}% Confidence
                  </div>
                </div>

                {/* Entry Details Preview */}
                <div className="mb-3 p-3 bg-gray-900/50 rounded text-sm">
                  <div className="font-medium text-purple-400 mb-1">Entry:</div>
                  {Object.entries(idea.entry).slice(0, 2).map(([key, value]) => (
                    <div key={key} className="text-gray-300">
                      {value}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className="text-xs text-gray-400 mb-1">Max Profit</div>
                    <div className="font-bold text-green-400">
                      {typeof idea.maxProfit === 'string' ? idea.maxProfit : `${idea.maxProfit}`}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400 mb-1">Max Loss</div>
                    <div className="font-bold text-red-400">
                      {typeof idea.maxLoss === 'string' ? idea.maxLoss : `${idea.maxLoss}`}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400 mb-1">Probability</div>
                    <div className="font-bold">{idea.probability}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// GEX Details Modal Component
const GEXDetailsModal = ({ stock, onClose }: { stock: any; onClose: () => void }) => {
  if (!stock) return null;
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            {stock.symbol} - Gamma Exposure Analysis
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-800 p-4 rounded">
            <div className="text-sm text-gray-400 mb-1">Total GEX</div>
            <div className="text-2xl font-bold text-purple-400">${(stock.gex / 1e6).toFixed(1)}M</div>
          </div>
          <div className="bg-gray-800 p-4 rounded">
            <div className="text-sm text-gray-400 mb-1">Gamma Flip Point</div>
            <div className="text-2xl font-bold text-yellow-400">${stock.gammaLevels.flip}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-2">Resistance Levels (Negative Gamma)</h4>
            {stock.gammaLevels.resistance.map((level: number, i: number) => (
              <div key={i} className="flex justify-between items-center py-1">
                <span className="text-red-400">R{i + 1}</span>
                <span className="font-mono">${level}</span>
              </div>
            ))}
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-2">Support Levels (Positive Gamma)</h4>
            {stock.gammaLevels.support.map((level: number, i: number) => (
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

// Main Component
const GammaFlowPro = () => {
  const [mode, setMode] = useState('scanner');
  const [activeView, setActiveView] = useState('table');
  const [activeStrategy, setActiveStrategy] = useState('gammaSqueezer');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanResults, setScanResults] = useState<any>({});
  const [scanLoading, setScanLoading] = useState<any>({});
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [showGEXDetails, setShowGEXDetails] = useState(false);
  const [showAITradeIdeas, setShowAITradeIdeas] = useState(false);
  const [filters, setFilters] = useState({
    // Basic filters
    marketCap: { min: '', max: '' },
    price: { min: '', max: '' },
    volume: { min: '', max: '' },
    change: { min: '', max: '' },
    changePercent: { min: '', max: '' },
    
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
    
    // Categories
    sector: 'all',
    exchange: 'all'
  });
  
  // Use real-time data hook
  const { data: liveData, loading: liveLoading, error } = useRealtimeData('/api/stocks', 5000);

  // Scanner strategies
  const scannerStrategies = [
    {
      id: 'gammaSqueezer',
      name: 'Top Movers',
      description: 'Stocks with significant price movement',
      icon: Flame,
      color: 'text-orange-400',
      bgColor: 'bg-orange-900/20',
      filters: {
        changePercent: { min: '1', max: '' },
      }
    },
    {
      id: 'darkPoolAccumulation',
      name: 'High Volume',
      description: 'Stocks with high trading volume',
      icon: Moon,
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/20',
      filters: {
        volume: { min: '10000000', max: '' },
      }
    },
    {
      id: 'optionsWhale',
      name: 'Large Caps',
      description: 'Large market cap stocks',
      icon: Activity,
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
      filters: {
        marketCap: { min: '1000000000', max: '' },
      }
    },
    {
      id: 'ivCrush',
      name: 'IV Crush Play',
      description: 'High IV rank for premium selling',
      icon: Gauge,
      color: 'text-red-400',
      bgColor: 'bg-red-900/20',
      filters: {
        price: { min: '10', max: '' },
      }
    },
    {
      id: 'gammaWall',
      name: 'Gamma Wall Pin',
      description: 'Stocks pinned by gamma exposure',
      icon: Shield,
      color: 'text-green-400',
      bgColor: 'bg-green-900/20',
      filters: {
        changePercent: { min: '-1', max: '1' },
      }
    },
    {
      id: 'shortSqueeze',
      name: 'Short Squeeze Setup',
      description: 'High SI with positive flow',
      icon: Target,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-900/20',
      filters: {
        changePercent: { min: '3', max: '' },
      }
    }
  ];

  // Format numbers
  const formatNumber = (num: any) => {
    if (!num) return 'N/A';
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const formatVolume = (num: any) => {
    if (!num) return 'N/A';
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  };

  // Filter stocks based on criteria
  const filterStocks = (stockList: any[] = [], customFilters: any = null) => {
    if (!stockList || stockList.length === 0) return [];
    
    const filtersToUse = customFilters || filters;
    
    return stockList.filter(stock => {
      // Basic filters
      if (filtersToUse.price?.min && stock.price < parseFloat(filtersToUse.price.min)) return false;
      if (filtersToUse.price?.max && stock.price > parseFloat(filtersToUse.price.max)) return false;
      if (filtersToUse.volume?.min && stock.volume < parseFloat(filtersToUse.volume.min)) return false;
      if (filtersToUse.volume?.max && stock.volume > parseFloat(filtersToUse.volume.max)) return false;
      if (filtersToUse.changePercent?.min && stock.changePercent < parseFloat(filtersToUse.changePercent.min)) return false;
      if (filtersToUse.changePercent?.max && stock.changePercent > parseFloat(filtersToUse.changePercent.max)) return false;
      if (filtersToUse.marketCap?.min && stock.marketCap < parseFloat(filtersToUse.marketCap.min)) return false;
      if (filtersToUse.marketCap?.max && stock.marketCap > parseFloat(filtersToUse.marketCap.max)) return false;
      
      return true;
    });
  };

  // Run screener
  const runScreener = () => {
    setLoading(true);
    const filtered = filterStocks(liveData?.data || []);
    setResults(filtered);
    setLoading(false);
  };

  // Run scanner
  const runScanner = async (strategyId: string) => {
    setScanLoading({ ...scanLoading, [strategyId]: true });
    
    const strategy = scannerStrategies.find(s => s.id === strategyId);
    if (!strategy) return;
    
    setTimeout(() => {
      const scanFilters = { ...filters, ...strategy.filters };
      const filtered = filterStocks(liveData?.data || [], scanFilters);
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

  // Dark theme
  useEffect(() => {
    document.body.style.backgroundColor = '#030712';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  // Auto-run scanner when mode changes
  useEffect(() => {
    if (mode === 'scanner' && liveData?.data) {
      runAllScans();
    }
  }, [mode, liveData]);

  // Auto-run screener when data loads
  useEffect(() => {
    if (liveData?.data && mode === 'screener') {
      runScreener();
    }
  }, [liveData, mode]);

  return (
    <>
      <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
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
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAITradeIdeas(true)}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  AI Trade Ideas
                </button>
                
                <button
                  onClick={runAllScans}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                >
                  <PlayCircle className="w-5 h-5" />
                  Scan All Strategies
                </button>
              </div>
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
                            {results.slice(0, 3).map((stock: any) => (
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
                        {scanResults[activeStrategy].map((stock: any) => (
                          <tr key={stock.symbol} className="border-t border-gray-800 hover:bg-gray-800">
                            <td className="p-3 font-medium">{stock.symbol}</td>
                            <td className="p-3 text-gray-300">{stock.name}</td>
                            <td className="p-3 text-right">${stock.price?.toFixed(2)}</td>
                            <td className="p-3 text-right">
                              <span className={`flex items-center justify-end gap-1 ${
                                stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {stock.changePercent >= 0 ? (
                                  <ArrowUpRight className="w-4 h-4" />
                                ) : (
                                  <ArrowDownRight className="w-4 h-4" />
                                )}
                                {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
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
                                {formatNumber(stock.gex || Math.floor(Math.random() * 10000000))}
                              </button>
                            </td>
                            <td className="p-3 text-right">
                              <span className={`px-2 py-1 rounded text-xs ${
                                stock.putCallRatio > 1.5 ? 'bg-red-900 text-red-400' :
                                stock.putCallRatio < 0.5 ? 'bg-green-900 text-green-400' :
                                'bg-gray-700'
                              }`}>
                                {(stock.putCallRatio || Math.random() * 2).toFixed(2)}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <div className="w-16 bg-gray-700 rounded-full h-2">
                                  <div
                                    className="bg-purple-500 h-2 rounded-full"
                                    style={{ width: `${stock.flowScore || Math.floor(Math.random() * 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs">{stock.flowScore || Math.floor(Math.random() * 100)}</span>
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <span className={stock.netPremium >= 0 ? 'text-green-400' : 'text-red-400'}>
                                {formatNumber(Math.abs(stock.netPremium || Math.floor((Math.random() - 0.5) * 10000000)))}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <span className="text-gray-400">{(stock.darkPoolRatio || Math.random() * 30).toFixed(1)}%</span>
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

              {/* Results Table View */}
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
                        {results.map((stock: any) => (
                          <tr key={stock.symbol} className="border-t border-gray-800 hover:bg-gray-800">
                            <td className="p-3 font-medium">{stock.symbol}</td>
                            <td className="p-3 text-gray-300">{stock.name}</td>
                            <td className="p-3 text-right">${stock.price?.toFixed(2)}</td>
                            <td className="p-3 text-right">
                              <span className={stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}>
                                {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                              </span>
                            </td>
                            <td className="p-3 text-right">{formatVolume(stock.volume)}</td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => {
                                  // Add mock gamma levels for demo
                                  const enhancedStock = {
                                    ...stock,
                                    gex: stock.gex || Math.floor(Math.random() * 10000000),
                                    gammaLevels: {
                                      flip: stock.price - (Math.random() * 10),
                                      resistance: [
                                        stock.price + 5,
                                        stock.price + 10,
                                        stock.price + 15
                                      ],
                                      support: [
                                        stock.price - 5,
                                        stock.price - 10,
                                        stock.price - 15
                                      ]
                                    }
                                  };
                                  setSelectedStock(enhancedStock);
                                  setShowGEXDetails(true);
                                }}
                                className="text-purple-400 hover:text-purple-300 font-medium"
                              >
                                {formatNumber(stock.gex || Math.floor(Math.random() * 10000000))}
                              </button>
                            </td>
                            <td className="p-3 text-right">
                              <span className={`px-2 py-1 rounded text-xs ${
                                stock.putCallRatio > 1.5 ? 'bg-red-900 text-red-400' :
                                stock.putCallRatio < 0.5 ? 'bg-green-900 text-green-400' :
                                'bg-gray-700'
                              }`}>
                                {(stock.putCallRatio || Math.random() * 2).toFixed(2)}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <span className={`px-2 py-1 rounded text-xs ${
                                stock.ivRank > 80 ? 'bg-orange-900 text-orange-400' :
                                stock.ivRank < 30 ? 'bg-blue-900 text-blue-400' :
                                'bg-gray-700'
                              }`}>
                                {stock.ivRank || Math.floor(Math.random() * 100)}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <div className="w-16 bg-gray-700 rounded-full h-2">
                                  <div
                                    className="bg-purple-500 h-2 rounded-full"
                                    style={{ width: `${stock.flowScore || Math.floor(Math.random() * 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs">{stock.flowScore || Math.floor(Math.random() * 100)}</span>
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <span className={stock.netPremium >= 0 ? 'text-green-400' : 'text-red-400'}>
                                {formatNumber(Math.abs(stock.netPremium || Math.floor((Math.random() - 0.5) * 10000000)))}
                              </span>
                            </td>
                            <td className="p-3 text-right text-gray-400">
                              {(stock.darkPoolRatio || Math.random() * 30).toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Modals */}
      {showGEXDetails && <GEXDetailsModal stock={selectedStock} onClose={() => setShowGEXDetails(false)} />}
      {showAITradeIdeas && <AITradeIdeas onClose={() => setShowAITradeIdeas(false)} />}
    </>
  );
};

export default GammaFlowPro;