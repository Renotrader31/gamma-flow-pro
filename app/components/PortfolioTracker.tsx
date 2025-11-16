'use client'
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Percent, Activity } from 'lucide-react';

interface Position {
  id: string;
  symbol: string;
  shares: number;
  avgCost: number;
  currentPrice?: number;
  entryDate: string;
}

const formatNumber = (num: number) => {
  if (!num && num !== 0) return 'N/A';
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
};

export const PortfolioTracker = ({ onClose }: { onClose: () => void }) => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [newPosition, setNewPosition] = useState({
    symbol: '',
    shares: '',
    avgCost: '',
  });
  const [showAddForm, setShowAddForm] = useState(false);

  // Load positions from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('gamma-flow-portfolio');
    if (saved) {
      setPositions(JSON.parse(saved));
    }
  }, []);

  // Save positions to localStorage whenever they change
  useEffect(() => {
    if (positions.length > 0) {
      localStorage.setItem('gamma-flow-portfolio', JSON.stringify(positions));
    }
  }, [positions]);

  // Fetch current prices for positions
  useEffect(() => {
    const fetchPrices = async () => {
      if (positions.length === 0) return;

      try {
        const response = await fetch('/api/stocks');
        const data = await response.json();

        if (data.status === 'success' && data.data) {
          const updatedPositions = positions.map(pos => {
            const stockData = data.data.find((s: any) => s.symbol === pos.symbol);
            return {
              ...pos,
              currentPrice: stockData?.price || pos.currentPrice
            };
          });
          setPositions(updatedPositions);
        }
      } catch (error) {
        console.error('Error fetching prices:', error);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [positions.length]);

  const handleAddPosition = () => {
    if (!newPosition.symbol || !newPosition.shares || !newPosition.avgCost) {
      alert('Please fill in all fields');
      return;
    }

    const position: Position = {
      id: Date.now().toString(),
      symbol: newPosition.symbol.toUpperCase(),
      shares: parseFloat(newPosition.shares),
      avgCost: parseFloat(newPosition.avgCost),
      entryDate: new Date().toISOString(),
    };

    setPositions([...positions, position]);
    setNewPosition({ symbol: '', shares: '', avgCost: '' });
    setShowAddForm(false);
  };

  const handleDeletePosition = (id: string) => {
    setPositions(positions.filter(p => p.id !== id));
    if (positions.length === 1) {
      localStorage.removeItem('gamma-flow-portfolio');
    }
  };

  const calculateStats = () => {
    let totalValue = 0;
    let totalCost = 0;
    let totalGainLoss = 0;

    positions.forEach(pos => {
      const currentPrice = pos.currentPrice || pos.avgCost;
      const posValue = pos.shares * currentPrice;
      const posCost = pos.shares * pos.avgCost;

      totalValue += posValue;
      totalCost += posCost;
      totalGainLoss += (posValue - posCost);
    });

    const percentGainLoss = totalCost > 0 ? ((totalGainLoss / totalCost) * 100) : 0;

    return { totalValue, totalCost, totalGainLoss, percentGainLoss };
  };

  const stats = calculateStats();

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-gray-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-900/30 rounded-lg">
              <Activity className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">Portfolio Tracker</h3>
              <p className="text-gray-400 text-sm">Track your positions and performance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Summary */}
        <div className="p-6 bg-gray-800/50 border-b border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Total Value</div>
              <div className="text-2xl font-bold text-white">{formatNumber(stats.totalValue)}</div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Total Cost</div>
              <div className="text-2xl font-bold text-gray-300">{formatNumber(stats.totalCost)}</div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Total Gain/Loss</div>
              <div className={`text-2xl font-bold ${stats.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.totalGainLoss >= 0 ? '+' : ''}{formatNumber(stats.totalGainLoss)}
              </div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Return %</div>
              <div className={`text-2xl font-bold flex items-center gap-1 ${stats.percentGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.percentGainLoss >= 0 ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
                {stats.percentGainLoss >= 0 ? '+' : ''}{stats.percentGainLoss.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        {/* Positions Table */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-400px)]">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-bold">Your Positions</h4>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Position
            </button>
          </div>

          {/* Add Position Form */}
          {showAddForm && (
            <div className="mb-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
              <h5 className="font-medium mb-3">Add New Position</h5>
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Symbol (e.g., NVDA)"
                  value={newPosition.symbol}
                  onChange={(e) => setNewPosition({ ...newPosition, symbol: e.target.value.toUpperCase() })}
                  className="px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="number"
                  placeholder="Shares"
                  value={newPosition.shares}
                  onChange={(e) => setNewPosition({ ...newPosition, shares: e.target.value })}
                  className="px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Avg Cost"
                  value={newPosition.avgCost}
                  onChange={(e) => setNewPosition({ ...newPosition, avgCost: e.target.value })}
                  className="px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleAddPosition}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-all"
                >
                  Add Position
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewPosition({ symbol: '', shares: '', avgCost: '' });
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Positions List */}
          {positions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No positions yet. Click "Add Position" to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="p-3 text-left">Symbol</th>
                    <th className="p-3 text-right">Shares</th>
                    <th className="p-3 text-right">Avg Cost</th>
                    <th className="p-3 text-right">Current Price</th>
                    <th className="p-3 text-right">Total Value</th>
                    <th className="p-3 text-right">Total Cost</th>
                    <th className="p-3 text-right">Gain/Loss</th>
                    <th className="p-3 text-right">Return %</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((pos) => {
                    const currentPrice = pos.currentPrice || pos.avgCost;
                    const totalValue = pos.shares * currentPrice;
                    const totalCost = pos.shares * pos.avgCost;
                    const gainLoss = totalValue - totalCost;
                    const gainLossPercent = ((gainLoss / totalCost) * 100);

                    return (
                      <tr key={pos.id} className="border-t border-gray-800 hover:bg-gray-800">
                        <td className="p-3 font-medium">{pos.symbol}</td>
                        <td className="p-3 text-right">{pos.shares}</td>
                        <td className="p-3 text-right">${pos.avgCost.toFixed(2)}</td>
                        <td className="p-3 text-right">
                          {pos.currentPrice ? (
                            <span className={currentPrice >= pos.avgCost ? 'text-green-400' : 'text-red-400'}>
                              ${currentPrice.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-500">Loading...</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-medium">{formatNumber(totalValue)}</td>
                        <td className="p-3 text-right text-gray-400">{formatNumber(totalCost)}</td>
                        <td className="p-3 text-right">
                          <span className={gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {gainLoss >= 0 ? '+' : ''}{formatNumber(gainLoss)}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            gainLossPercent >= 0 ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
                          }`}>
                            {gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleDeletePosition(pos.id)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
