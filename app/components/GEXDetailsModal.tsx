'use client'
import React from 'react';
import { X, Sparkles } from 'lucide-react';

const formatNumber = (num: any) => {
  if (!num && num !== 0) return 'N/A';
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
};

export const GEXDetailsModal = ({ stock, onClose }: { stock: any; onClose: () => void }) => {
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
            <div className="text-2xl font-bold text-purple-400">{formatNumber(stock.gex)}</div>
          </div>
          <div className="bg-gray-800 p-4 rounded">
            <div className="text-sm text-gray-400 mb-1">Gamma Flip Point</div>
            <div className="text-2xl font-bold text-yellow-400">${stock.gammaLevels?.flip || stock.price}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-2">Resistance Levels (Negative Gamma)</h4>
            {stock.gammaLevels?.resistance?.map((level: number, i: number) => (
              <div key={i} className="flex justify-between items-center py-1 px-2 hover:bg-gray-800 rounded">
                <span className="text-red-400">R{i + 1}</span>
                <span className="font-mono">${level}</span>
              </div>
            ))}
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-2">Support Levels (Positive Gamma)</h4>
            {stock.gammaLevels?.support?.map((level: number, i: number) => (
              <div key={i} className="flex justify-between items-center py-1 px-2 hover:bg-gray-800 rounded">
                <span className="text-green-400">S{i + 1}</span>
                <span className="font-mono">${level}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 p-3 bg-gray-800 rounded text-sm">
          <p className="text-gray-300">
            <span className="font-medium">Analysis:</span> Price is currently
            {stock.price > (stock.gammaLevels?.flip || stock.price) ? (
              <span className="text-green-400"> above </span>
            ) : (
              <span className="text-red-400"> below </span>
            )}
            the gamma flip point. Market makers are
            {stock.price > (stock.gammaLevels?.flip || stock.price) ? (
              <span className="text-red-400"> short gamma </span>
            ) : (
              <span className="text-green-400"> long gamma </span>
            )}
            which means volatility is likely to be
            {stock.price > (stock.gammaLevels?.flip || stock.price) ? ' higher' : ' lower'}.
          </p>
        </div>
      </div>
    </div>
  );
};
