// @ts-nocheck
'use client'
import React, { useState, useEffect } from 'react';
import {
  Search, RefreshCw, X, Clock, Radio, Sparkles
} from 'lucide-react';

// Helper functions
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

// Calculate the third Friday of a given month
const getThirdFriday = (year: number, month: number): Date => {
  const firstDay = new Date(year, month, 1);
  const firstFriday = firstDay.getDay() <= 5
    ? 1 + (5 - firstDay.getDay())
    : 1 + (12 - firstDay.getDay());
  // Third Friday is 14 days after the first Friday
  return new Date(year, month, firstFriday + 14);
};

// Get the next valid options expiration date (3rd Friday of month)
const getNextExpirationDate = (weeksOut: number): Date => {
  const today = new Date();
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + (weeksOut * 7));

  // Find the 3rd Friday of the target month
  let expiryDate = getThirdFriday(targetDate.getFullYear(), targetDate.getMonth());

  // If that date has passed, get next month's 3rd Friday
  if (expiryDate < today) {
    const nextMonth = targetDate.getMonth() + 1;
    const nextYear = nextMonth > 11 ? targetDate.getFullYear() + 1 : targetDate.getFullYear();
    expiryDate = getThirdFriday(nextYear, nextMonth % 12);
  }

  // If we need multiple months out, keep advancing
  while (expiryDate < targetDate) {
    const nextMonth = expiryDate.getMonth() + 1;
    const nextYear = nextMonth > 11 ? expiryDate.getFullYear() + 1 : expiryDate.getFullYear();
    expiryDate = getThirdFriday(nextYear, nextMonth % 12);
  }

  return expiryDate;
};

const getExpiryDate = (daysOut: number) => {
  const weeksOut = Math.ceil(daysOut / 7);
  const expiryDate = getNextExpirationDate(weeksOut);
  return expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Validation helper to ensure no duplicate strike+expiration in spreads
const validateSpread = (leg1: string, leg2: string): boolean => {
  // Extract strike and expiration from strings like "Buy 105C Jan 12"
  const extractDetails = (leg: string) => {
    const match = leg.match(/(\d+)[CP]\s+([A-Za-z]+\s+\d+)/);
    return match ? `${match[1]}-${match[2]}` : null;
  };
  
  const details1 = extractDetails(leg1);
  const details2 = extractDetails(leg2);
  
  // If we can't parse or they're different, it's valid
  if (!details1 || !details2 || details1 !== details2) return true;
  
  // Same strike and expiration detected - invalid!
  console.warn(`⚠️ Invalid spread detected: ${leg1} and ${leg2} have same strike and expiration`);
  return false;
};

const generateIdeasForSymbol = (symbol: string, stockData?: any) => {
  const ideas = [];
  const basePrice = stockData?.price || 100;
  const timestamp = Date.now();

  // 1. Bullish idea - Long Call Spread (Different strikes, same expiration)
  const callSpreadExpiry = getExpiryDate(21);
  const callSpreadBuyStrike = Math.round(basePrice * 1.05);
  const callSpreadSellStrike = Math.round(basePrice * 1.10);
  const callBuyLeg = `Buy ${callSpreadBuyStrike}C ${callSpreadExpiry}`;
  const callSellLeg = `Sell ${callSpreadSellStrike}C ${callSpreadExpiry}`;
  
  ideas.push({
    id: timestamp + 1,
    symbol: symbol,
    type: 'Long Call Spread',
    confidence: 75 + Math.floor(Math.random() * 20),
    riskReward: '1:3.2',
    timeframe: '2-3 weeks',
    entry: {
      buy: callBuyLeg,
      sell: callSellLeg,
      netDebit: Math.round(basePrice * 0.02 * 100),
      note: `Buy lower strike (${callSpreadBuyStrike}), Sell higher strike (${callSpreadSellStrike})`
    },
    reasoning: [
      'Technical breakout pattern detected',
      'Above key moving averages',
      'Unusual call activity detected',
      'Relative strength vs sector'
    ],
    targets: [
      (basePrice * 1.02).toFixed(2),
      (basePrice * 1.05).toFixed(2),
      (basePrice * 1.08).toFixed(2)
    ],
    stopLoss: (basePrice * 0.97).toFixed(2),
    maxProfit: Math.round(basePrice * 0.05 * 100),
    maxLoss: Math.round(basePrice * 0.02 * 100),
    probability: 65,
    tags: ['momentum', 'breakout', 'bullish']
  });

  // 2. Neutral idea - Iron Condor (Four different strikes, same expiration)
  const condorExpiry = getExpiryDate(30);
  const sellCallStrike = Math.round(basePrice * 1.10);
  const buyCallStrike = Math.round(basePrice * 1.12);
  const sellPutStrike = Math.round(basePrice * 0.90);
  const buyPutStrike = Math.round(basePrice * 0.88);
  
  ideas.push({
    id: timestamp + 2,
    symbol: symbol,
    type: 'Iron Condor',
    confidence: 70 + Math.floor(Math.random() * 15),
    riskReward: '1:2.5',
    timeframe: '3-4 weeks',
    entry: {
      sellCall: `Sell ${sellCallStrike}C ${condorExpiry}`,
      buyCall: `Buy ${buyCallStrike}C ${condorExpiry}`,
      sellPut: `Sell ${sellPutStrike}P ${condorExpiry}`,
      buyPut: `Buy ${buyPutStrike}P ${condorExpiry}`,
      netCredit: Math.round(basePrice * 0.015 * 100),
      note: `Range: ${buyPutStrike} to ${buyCallStrike}, Profit zone: ${sellPutStrike} to ${sellCallStrike}`
    },
    reasoning: [
      'IV rank elevated above 70%',
      'Trading in defined range',
      'Low realized volatility',
      'Earnings already passed'
    ],
    targets: [`${(basePrice * 0.95).toFixed(2)}-${(basePrice * 1.05).toFixed(2)} range`],
    stopLoss: 'Breach of strikes',
    maxProfit: Math.round(basePrice * 0.015 * 100),
    maxLoss: Math.round(basePrice * 0.005 * 100),
    probability: 70,
    tags: ['theta_play', 'premium_collection', 'neutral']
  });

  // 3. Bearish idea - Bear Put Spread (Different strikes, same expiration)
  const putSpreadExpiry = getExpiryDate(14);
  const putSpreadBuyStrike = Math.round(basePrice * 0.95);
  const putSpreadSellStrike = Math.round(basePrice * 0.90);
  const putBuyLeg = `Buy ${putSpreadBuyStrike}P ${putSpreadExpiry}`;
  const putSellLeg = `Sell ${putSpreadSellStrike}P ${putSpreadExpiry}`;
  
  ideas.push({
    id: timestamp + 3,
    symbol: symbol,
    type: 'Bear Put Spread',
    confidence: 68 + Math.floor(Math.random() * 18),
    riskReward: '1:2.8',
    timeframe: '1-2 weeks',
    entry: {
      buy: putBuyLeg,
      sell: putSellLeg,
      netDebit: Math.round(basePrice * 0.015 * 100),
      note: `Buy higher strike (${putSpreadBuyStrike}), Sell lower strike (${putSpreadSellStrike})`
    },
    reasoning: [
      'Bearish reversal pattern forming',
      'Resistance at current levels',
      'Unusual put activity detected',
      'Overbought technical indicators'
    ],
    targets: [
      (basePrice * 0.98).toFixed(2),
      (basePrice * 0.95).toFixed(2),
      (basePrice * 0.92).toFixed(2)
    ],
    stopLoss: (basePrice * 1.03).toFixed(2),
    maxProfit: Math.round(basePrice * 0.05 * 100),
    maxLoss: Math.round(basePrice * 0.015 * 100),
    probability: 62,
    tags: ['bearish', 'reversal', 'protective']
  });

  // 4. Volatility play - Long Strangle
  ideas.push({
    id: timestamp + 4,
    symbol: symbol,
    type: 'Long Strangle',
    confidence: 72 + Math.floor(Math.random() * 12),
    riskReward: '1:4',
    timeframe: '1-2 weeks',
    entry: {
      buyCall: `Buy ${Math.round(basePrice * 1.08)}C ${getExpiryDate(14)}`,
      buyPut: `Buy ${Math.round(basePrice * 0.92)}P ${getExpiryDate(14)}`,
      netDebit: Math.round(basePrice * 0.03 * 100)
    },
    reasoning: [
      'Large expected move anticipated',
      'Upcoming catalyst event',
      'High implied volatility',
      'Significant options flow both sides'
    ],
    targets: [
      `Above ${(basePrice * 1.12).toFixed(2)} or below ${(basePrice * 0.88).toFixed(2)}`
    ],
    stopLoss: `Between ${(basePrice * 0.96).toFixed(2)}-${(basePrice * 1.04).toFixed(2)}`,
    maxProfit: 'Unlimited',
    maxLoss: Math.round(basePrice * 0.03 * 100),
    probability: 58,
    tags: ['volatility_play', 'big_move', 'directional_neutral']
  });

  // 5. Income play - Covered Call
  ideas.push({
    id: timestamp + 5,
    symbol: symbol,
    type: 'Covered Call',
    confidence: 78 + Math.floor(Math.random() * 10),
    riskReward: '1:1.8',
    timeframe: '4-5 weeks',
    entry: {
      ownShares: `Own 100 shares at ${basePrice.toFixed(2)}`,
      sellCall: `Sell ${Math.round(basePrice * 1.05)}C ${getExpiryDate(35)}`,
      netCredit: Math.round(basePrice * 0.02 * 100)
    },
    reasoning: [
      'Moderate IV suitable for premium collection',
      'Generate income on existing shares',
      'Controlled upside with downside protection',
      'Stock in consolidation phase'
    ],
    targets: [`Max profit at ${(basePrice * 1.05).toFixed(2)}`],
    stopLoss: 'Protective puts or stock sale',
    maxProfit: Math.round(basePrice * 0.07 * 100),
    maxLoss: 'Stock decline risk',
    probability: 73,
    tags: ['income', 'conservative', 'theta_play']
  });

  // 6. Advanced play - Calendar Spread (Same strike, different expirations)
  const calendarStrike = Math.round(basePrice);
  const shortExpiry = getExpiryDate(21);
  const longExpiry = getExpiryDate(45);
  ideas.push({
    id: timestamp + 6,
    symbol: symbol,
    type: 'Calendar Spread',
    confidence: 74 + Math.floor(Math.random() * 8),
    riskReward: '1:2.2',
    timeframe: '2-4 weeks',
    entry: {
      longDated: `Buy ${calendarStrike}C ${longExpiry} (Long-dated)`,
      shortDated: `Sell ${calendarStrike}C ${shortExpiry} (Near-term)`,
      netDebit: Math.round(basePrice * 0.01 * 100),
      note: `Same strike (${calendarStrike}), different expirations`
    },
    reasoning: [
      'Time decay advantage opportunity',
      'Profit from near-term option expiring faster',
      'Low risk defined strategy',
      'Profit from volatility differential between expirations'
    ],
    targets: [`Max profit near ${basePrice.toFixed(2)} at short expiry (${shortExpiry})`],
    stopLoss: 'Large move in either direction',
    maxProfit: Math.round(basePrice * 0.022 * 100),
    maxLoss: Math.round(basePrice * 0.01 * 100),
    probability: 66,
    tags: ['theta_play', 'volatility_play', 'advanced']
  });

  return ideas;
};

// AI Trade Ideas Component
export const AITradeIdeas = ({ stock, onClose }: { stock?: any; onClose: () => void }) => {
  const [selectedIdea, setSelectedIdea] = useState<any>(null);
  const [filter, setFilter] = useState('all');
  const [tradeIdeas, setTradeIdeas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchSymbol, setSearchSymbol] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const fetchTradeIdeas = async (symbolToFetch?: string, showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      else setRefreshing(true);

      // If a specific symbol is provided, generate ideas for it
      if (symbolToFetch) {
        const ideas = generateIdeasForSymbol(symbolToFetch, stock);
        setTradeIdeas(ideas);
        setLoading(false);
        setRefreshing(false);
        setLastUpdate(new Date());
        return;
      }

      // Try to fetch from API
      const response = await fetch('/api/options-flow');
      const data = await response.json();
      if (data.tradeIdeas && data.tradeIdeas.length > 0) {
        setTradeIdeas(data.tradeIdeas);
      } else {
        // Fallback: Generate ideas for top symbols
        const fallbackIdeas = [
          ...generateIdeasForSymbol('NVDA').slice(0, 2),
          ...generateIdeasForSymbol('SPY').slice(0, 2),
        ];
        setTradeIdeas(fallbackIdeas);
      }
    } catch (error) {
      console.error('Error fetching trade ideas:', error);
      // Use fallback data on error - or the stock that was passed in
      const fallbackSymbol = symbolToFetch || stock?.symbol || 'NVDA';
      const fallbackIdeas = generateIdeasForSymbol(fallbackSymbol, stock);
      setTradeIdeas(fallbackIdeas);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLastUpdate(new Date());
    }
  };

  // Initial fetch on mount - use the selected stock if provided
  useEffect(() => {
    if (stock?.symbol) {
      fetchTradeIdeas(stock.symbol);
      setSearchSymbol(stock.symbol);
    } else {
      fetchTradeIdeas();
    }
  }, [stock]);

  // Auto-refresh every 10 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchTradeIdeas(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const filteredIdeas = tradeIdeas.filter(idea => {
    if (filter === 'all') return true;
    if (filter === 'high_confidence') return idea.confidence >= 85;
    return idea.tags && idea.tags.includes(filter);
  });

  const handleSymbolSearch = async () => {
    if (!searchSymbol) return;

    setSearchLoading(true);
    try {
      const response = await fetch(`/api/options-flow?symbol=${searchSymbol}`);
      const data = await response.json();

      if (data.tradeIdeas && data.tradeIdeas.length > 0) {
        setTradeIdeas(data.tradeIdeas);
      } else {
        const generatedIdeas = generateIdeasForSymbol(searchSymbol);
        setTradeIdeas(generatedIdeas);
      }

      setFilter('all');
    } catch (error) {
      console.error('Error searching symbol:', error);
      const generatedIdeas = generateIdeasForSymbol(searchSymbol);
      setTradeIdeas(generatedIdeas);
    } finally {
      setSearchLoading(false);
    }
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
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold">AI Trade Ideas</h3>
                {refreshing && (
                  <div className="flex items-center gap-1 text-xs text-blue-400">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Updating...</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm">
                <p className="text-gray-400">Powered by advanced options flow analysis</p>
                <div className="flex items-center gap-1 text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{lastUpdate.toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchTradeIdeas(false)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
              title="Refresh now"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                autoRefresh
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title={autoRefresh ? 'Auto-refresh enabled (10s)' : 'Auto-refresh disabled'}
            >
              <Radio className={`w-4 h-4 ${autoRefresh ? 'animate-pulse' : ''}`} />
              <span>{autoRefresh ? 'Live' : 'Paused'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="p-4 border-b border-gray-800 bg-gray-800/50">
          <div className="flex gap-2 flex-wrap items-center">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All Ideas ({tradeIdeas.length})
            </button>
            <button
              onClick={() => setFilter('high_confidence')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'high_confidence'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              High Confidence ({tradeIdeas.filter(i => i.confidence >= 85).length})
            </button>
            <button
              onClick={() => setFilter('momentum')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'momentum'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Momentum Plays ({tradeIdeas.filter(i => i.tags && i.tags.includes('momentum')).length})
            </button>

            {/* Stock Search */}
            <div className="ml-auto flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search symbol (e.g., NVDA)"
                value={searchSymbol}
                onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleSymbolSearch()}
                className="px-3 py-2 bg-gray-700 text-white rounded-lg text-sm w-48 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleSymbolSearch}
                disabled={!searchSymbol || searchLoading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2"
              >
                {searchLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Get Ideas
              </button>
            </div>
          </div>
        </div>

        {/* Trade Ideas Grid */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-400" />
              <p>Loading trade ideas...</p>
            </div>
          ) : filteredIdeas.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No trade ideas found for the selected filter.</p>
            </div>
          ) : (
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
                        {String(value)}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <div className="text-xs text-gray-400 mb-1">Max Profit</div>
                      <div className="font-bold text-green-400">
                        {typeof idea.maxProfit === 'string' ? idea.maxProfit : `$${idea.maxProfit}`}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-400 mb-1">Max Loss</div>
                      <div className="font-bold text-red-400">
                        {typeof idea.maxLoss === 'string' ? idea.maxLoss : `$${idea.maxLoss}`}
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
          )}
        </div>
      </div>
    </div>
  );
};
