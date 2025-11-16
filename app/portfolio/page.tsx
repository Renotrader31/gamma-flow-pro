'use client'
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Trash2, TrendingUp, TrendingDown, Download, Upload,
  Filter, Calendar, DollarSign, Percent, Target, Activity, Eye, Edit, X, FileUp
} from 'lucide-react';
import { parseCSV, ParsedTrade } from '@/lib/csv-parsers';

interface OptionLeg {
  legId: string;
  action: 'BUY' | 'SELL';
  optionType: 'CALL' | 'PUT';
  strikePrice: number;
  expirationDate: string;
  premium: number;
  contracts: number;
}

interface Trade {
  id: string;
  portfolioId: string;
  symbol: string;
  assetType: 'stock' | 'option' | 'multi-leg';
  type: 'long' | 'short';
  entryDate: string;

  // Stock fields
  entryPrice?: number;
  shares?: number;
  exitPrice?: number;

  // Single option fields
  optionType?: 'CALL' | 'PUT';
  strikePrice?: number;
  expirationDate?: string;
  premium?: number;
  contracts?: number;

  // Multi-leg strategy fields
  strategyType?: string;
  legs?: OptionLeg[];
  netPremium?: number;

  exitDate?: string;
  exitPremium?: number;
  status: 'open' | 'closed';
  notes?: string;
  broker?: 'FIDELITY' | 'TDA' | 'WEDBUSH' | 'MANUAL';
}

interface Portfolio {
  id: string;
  name: string;
  createdAt: string;
  broker?: 'FIDELITY' | 'TDA' | 'WEDBUSH' | 'ALL' | 'MANUAL';
}

interface StrategyTemplate {
  name: string;
  legs: number;
  description: string;
  template?: Array<{
    action: 'BUY' | 'SELL';
    optionType: 'CALL' | 'PUT';
    strikeOffset: number;
    quantity?: number;
  }>;
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

  // Popular symbols for quick entry
  const popularSymbols = [
    'AAPL', 'TSLA', 'NVDA', 'AMD', 'SPY', 'QQQ', 'META', 'AMZN',
    'GOOGL', 'MSFT', 'NFLX', 'PLTR', 'SOFI', 'RIVN', 'NIO'
  ];

  // Strategy templates
  const strategyTemplates: { [key: string]: StrategyTemplate } = {
    SINGLE: {
      name: 'Single Option',
      legs: 1,
      description: 'Buy or sell a single call or put'
    },
    CALL_SPREAD: {
      name: 'Bull Call Spread',
      legs: 2,
      description: 'Buy call at lower strike, sell call at higher strike',
      template: [
        { action: 'BUY', optionType: 'CALL', strikeOffset: 0 },
        { action: 'SELL', optionType: 'CALL', strikeOffset: 5 }
      ]
    },
    PUT_SPREAD: {
      name: 'Bull Put Spread',
      legs: 2,
      description: 'Sell put at higher strike, buy put at lower strike (bullish)',
      template: [
        { action: 'SELL', optionType: 'PUT', strikeOffset: 5 },
        { action: 'BUY', optionType: 'PUT', strikeOffset: 0 }
      ]
    },
    BEAR_CALL_SPREAD: {
      name: 'Bear Call Spread',
      legs: 2,
      description: 'Sell call at lower strike, buy call at higher strike (bearish)',
      template: [
        { action: 'SELL', optionType: 'CALL', strikeOffset: 0 },
        { action: 'BUY', optionType: 'CALL', strikeOffset: 5 }
      ]
    },
    BEAR_PUT_SPREAD: {
      name: 'Bear Put Spread',
      legs: 2,
      description: 'Buy put at higher strike, sell put at lower strike (bearish)',
      template: [
        { action: 'BUY', optionType: 'PUT', strikeOffset: 5 },
        { action: 'SELL', optionType: 'PUT', strikeOffset: 0 }
      ]
    },
    STRADDLE: {
      name: 'Long Straddle',
      legs: 2,
      description: 'Buy call and put at same strike (volatility play)',
      template: [
        { action: 'BUY', optionType: 'CALL', strikeOffset: 0 },
        { action: 'BUY', optionType: 'PUT', strikeOffset: 0 }
      ]
    },
    STRANGLE: {
      name: 'Long Strangle',
      legs: 2,
      description: 'Buy call and put at different strikes',
      template: [
        { action: 'BUY', optionType: 'CALL', strikeOffset: 5 },
        { action: 'BUY', optionType: 'PUT', strikeOffset: -5 }
      ]
    },
    IRON_CONDOR: {
      name: 'Iron Condor',
      legs: 4,
      description: 'Sell call spread + sell put spread (range-bound)',
      template: [
        { action: 'SELL', optionType: 'PUT', strikeOffset: -10 },
        { action: 'BUY', optionType: 'PUT', strikeOffset: -15 },
        { action: 'SELL', optionType: 'CALL', strikeOffset: 10 },
        { action: 'BUY', optionType: 'CALL', strikeOffset: 15 }
      ]
    },
    BUTTERFLY: {
      name: 'Butterfly Spread',
      legs: 3,
      description: 'Buy 1 ITM call + Sell 2 ATM calls + Buy 1 OTM call',
      template: [
        { action: 'BUY', optionType: 'CALL', strikeOffset: -5 },
        { action: 'SELL', optionType: 'CALL', strikeOffset: 0, quantity: 2 },
        { action: 'BUY', optionType: 'CALL', strikeOffset: 5 }
      ]
    },
    JADE_LIZARD: {
      name: 'Jade Lizard',
      legs: 3,
      description: 'Sell put + sell call spread (no upside risk)',
      template: [
        { action: 'SELL', optionType: 'PUT', strikeOffset: -5 },
        { action: 'SELL', optionType: 'CALL', strikeOffset: 5 },
        { action: 'BUY', optionType: 'CALL', strikeOffset: 10 }
      ]
    },
    CALENDAR_SPREAD: {
      name: 'Calendar Spread',
      legs: 2,
      description: 'Sell near-term option, buy longer-term option (same strike)',
      template: [
        { action: 'SELL', optionType: 'CALL', strikeOffset: 0 },
        { action: 'BUY', optionType: 'CALL', strikeOffset: 0 }
      ]
    },
    DIAGONAL_SPREAD: {
      name: 'Diagonal Spread',
      legs: 2,
      description: 'Sell near-term option, buy longer-term option (different strikes)',
      template: [
        { action: 'SELL', optionType: 'CALL', strikeOffset: 0 },
        { action: 'BUY', optionType: 'CALL', strikeOffset: 5 }
      ]
    }
  };

  const [newTrade, setNewTrade] = useState({
    portfolioId: '',
    symbol: '',
    assetType: 'stock' as 'stock' | 'option' | 'multi-leg',
    type: 'long' as 'long' | 'short',
    entryDate: new Date().toISOString().split('T')[0],
    strategyType: 'SINGLE',
    // Stock fields
    entryPrice: '',
    shares: '',
    // Option fields
    optionType: 'CALL' as 'CALL' | 'PUT',
    strikePrice: '',
    expirationDate: '',
    premium: '',
    contracts: '',
    // Multi-leg fields
    legs: [
      {
        action: 'BUY' as 'BUY' | 'SELL',
        optionType: 'CALL' as 'CALL' | 'PUT',
        strikePrice: '',
        expirationDate: '',
        premium: '',
        contracts: ''
      }
    ],
    notes: ''
  });

  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [showImportCSV, setShowImportCSV] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<'FIDELITY' | 'TDA' | 'WEDBUSH'>('FIDELITY');
  const [importStatus, setImportStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load data from localStorage
  useEffect(() => {
    const savedPortfolios = localStorage.getItem('gamma-flow-portfolios');
    const savedTrades = localStorage.getItem('gamma-flow-trades');

    if (savedPortfolios) {
      const parsed = JSON.parse(savedPortfolios);
      // Ensure broker portfolios exist
      const brokerPortfolios = ensureBrokerPortfolios(parsed);
      setPortfolios(brokerPortfolios);
      localStorage.setItem('gamma-flow-portfolios', JSON.stringify(brokerPortfolios));
    } else {
      const defaultPortfolios = createDefaultBrokerPortfolios();
      setPortfolios(defaultPortfolios);
      localStorage.setItem('gamma-flow-portfolios', JSON.stringify(defaultPortfolios));
    }

    if (savedTrades) {
      setTrades(JSON.parse(savedTrades));
    }
  }, []);

  // Create default broker portfolios
  const createDefaultBrokerPortfolios = (): Portfolio[] => {
    const now = new Date().toISOString();
    return [
      { id: 'all', name: 'All Accounts', createdAt: now, broker: 'ALL' },
      { id: 'fidelity', name: 'Fidelity', createdAt: now, broker: 'FIDELITY' },
      { id: 'tda', name: 'Think or Swim', createdAt: now, broker: 'TDA' },
      { id: 'wedbush', name: 'Wedbush', createdAt: now, broker: 'WEDBUSH' }
    ];
  };

  // Ensure broker portfolios exist in the list
  const ensureBrokerPortfolios = (existingPortfolios: Portfolio[]): Portfolio[] => {
    const now = new Date().toISOString();
    const brokerIds = ['all', 'fidelity', 'tda', 'wedbush'];
    const existing = new Set(existingPortfolios.map(p => p.id));

    const defaultBrokers = createDefaultBrokerPortfolios();
    const missing = defaultBrokers.filter(p => !existing.has(p.id));

    return [...missing, ...existingPortfolios];
  };

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

  // Quick symbol selection
  const selectSymbol = (symbol: string) => {
    setNewTrade(prev => ({ ...prev, symbol }));
  };

  // Change strategy type
  const changeStrategyType = (newStrategyType: string) => {
    const template = strategyTemplates[newStrategyType];
    if (template?.template) {
      setNewTrade(prev => ({
        ...prev,
        strategyType: newStrategyType,
        assetType: 'multi-leg',
        legs: template.template!.map(leg => ({
          action: leg.action,
          optionType: leg.optionType,
          strikePrice: '',
          expirationDate: '',
          premium: '',
          contracts: (leg.quantity || 1).toString()
        }))
      }));
    } else {
      setNewTrade(prev => ({
        ...prev,
        strategyType: newStrategyType,
        legs: [{
          action: 'BUY',
          optionType: 'CALL',
          strikePrice: '',
          expirationDate: '',
          premium: '',
          contracts: '1'
        }]
      }));
    }
  };

  const handleAddPortfolio = () => {
    if (!newPortfolioName.trim()) {
      alert('Please enter a portfolio name');
      return;
    }

    const portfolio: Portfolio = {
      id: Date.now().toString(),
      name: newPortfolioName,
      createdAt: new Date().toISOString(),
      broker: 'MANUAL'
    };

    setPortfolios([...portfolios, portfolio]);
    setNewPortfolioName('');
    setShowAddPortfolio(false);
  };

  // Handle CSV Import
  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportStatus('Reading file...');

    try {
      const text = await file.text();
      setImportStatus('Parsing trades...');

      // Parse CSV with selected broker format
      const parsedTrades = parseCSV(text, selectedBroker);

      if (parsedTrades.length === 0) {
        setImportStatus('No trades found in CSV');
        return;
      }

      setImportStatus(`Found ${parsedTrades.length} trades. Importing...`);

      // Get the broker portfolio
      const brokerPortfolio = portfolios.find(p => p.broker === selectedBroker);
      if (!brokerPortfolio) {
        setImportStatus('Error: Broker portfolio not found');
        return;
      }

      // Convert parsed trades to Trade objects
      const newTrades: Trade[] = parsedTrades.map((pt: ParsedTrade) => {
        const trade: Trade = {
          id: `${Date.now()}-${Math.random()}`,
          portfolioId: brokerPortfolio.id,
          symbol: pt.symbol,
          assetType: pt.assetType,
          type: pt.position === 'LONG' ? 'long' : 'short',
          entryDate: pt.date,
          status: pt.status === 'CLOSED' || pt.status === 'EXPIRED' ? 'closed' : 'open',
          broker: pt.broker,
          notes: pt.rawAction || ''
        };

        // Add asset-specific fields
        if (pt.assetType === 'stock') {
          trade.entryPrice = pt.entryPrice;
          trade.shares = pt.shares;
        } else if (pt.assetType === 'option') {
          trade.optionType = pt.optionType;
          trade.strikePrice = pt.strikePrice;
          trade.expirationDate = pt.expirationDate;
          trade.premium = pt.premium;
          trade.contracts = pt.contracts;
        }

        return trade;
      });

      // Add to existing trades
      setTrades([...trades, ...newTrades]);
      setImportStatus(`Successfully imported ${newTrades.length} trades!`);

      // Auto-select the broker portfolio
      setSelectedPortfolio(brokerPortfolio.id);

      setTimeout(() => {
        setShowImportCSV(false);
        setImportStatus('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 2000);

    } catch (error) {
      console.error('Error importing CSV:', error);
      setImportStatus(`Error: ${error instanceof Error ? error.message : 'Failed to import CSV'}`);
    }
  };

  const handleAddTrade = () => {
    if (!newTrade.symbol) {
      alert('Please enter a symbol');
      return;
    }

    // Validate based on asset type
    if (newTrade.assetType === 'stock') {
      if (!newTrade.entryPrice || !newTrade.shares) {
        alert('Please fill in entry price and shares for stock trades');
        return;
      }
    } else if (newTrade.assetType === 'option') {
      if (!newTrade.strikePrice || !newTrade.expirationDate || !newTrade.premium || !newTrade.contracts) {
        alert('Please fill in all option fields (strike, expiration, premium, contracts)');
        return;
      }
    } else if (newTrade.assetType === 'multi-leg') {
      const hasValidLeg = newTrade.legs.some(leg => leg.strikePrice && parseFloat(leg.strikePrice) > 0);
      if (!hasValidLeg) {
        alert('Please fill in at least one leg with valid strike price');
        return;
      }
    }

    const portfolioId = newTrade.portfolioId || portfolios[0]?.id || 'main';

    const trade: Trade = {
      id: Date.now().toString(),
      portfolioId,
      symbol: newTrade.symbol.toUpperCase(),
      assetType: newTrade.assetType,
      type: newTrade.type,
      entryDate: newTrade.entryDate,
      status: 'open',
      notes: newTrade.notes
    };

    // Add asset-specific fields
    if (newTrade.assetType === 'stock') {
      trade.entryPrice = parseFloat(newTrade.entryPrice);
      trade.shares = parseFloat(newTrade.shares);
    } else if (newTrade.assetType === 'option') {
      trade.optionType = newTrade.optionType;
      trade.strikePrice = parseFloat(newTrade.strikePrice);
      trade.expirationDate = newTrade.expirationDate;
      trade.premium = parseFloat(newTrade.premium);
      trade.contracts = parseFloat(newTrade.contracts);
    } else if (newTrade.assetType === 'multi-leg') {
      trade.strategyType = newTrade.strategyType;
      trade.legs = newTrade.legs
        .filter(leg => leg.strikePrice && parseFloat(leg.strikePrice) > 0)
        .map((leg, index) => ({
          legId: `${Date.now()}-${index}`,
          action: leg.action,
          optionType: leg.optionType,
          strikePrice: parseFloat(leg.strikePrice),
          expirationDate: leg.expirationDate,
          premium: parseFloat(leg.premium || '0'),
          contracts: parseFloat(leg.contracts || '1')
        }));

      // Calculate net premium
      let netPremium = 0;
      trade.legs.forEach(leg => {
        const legPremium = leg.premium * leg.contracts;
        if (leg.action === 'BUY') {
          netPremium -= legPremium;
        } else {
          netPremium += legPremium;
        }
      });
      trade.netPremium = netPremium;
    }

    setTrades([...trades, trade]);

    // Reset form
    setNewTrade({
      portfolioId: '',
      symbol: '',
      assetType: 'stock',
      type: 'long',
      entryDate: new Date().toISOString().split('T')[0],
      strategyType: 'SINGLE',
      entryPrice: '',
      shares: '',
      optionType: 'CALL',
      strikePrice: '',
      expirationDate: '',
      premium: '',
      contracts: '',
      legs: [{
        action: 'BUY',
        optionType: 'CALL',
        strikePrice: '',
        expirationDate: '',
        premium: '',
        contracts: '1'
      }],
      notes: ''
    });
    setShowAddTrade(false);
  };

  const handleCloseTrade = (tradeId: string, exitValue: number) => {
    setTrades(trades.map(t => {
      if (t.id === tradeId) {
        if (t.assetType === 'stock') {
          return { ...t, status: 'closed' as const, exitDate: new Date().toISOString(), exitPrice: exitValue };
        } else if (t.assetType === 'option' || t.assetType === 'multi-leg') {
          return { ...t, status: 'closed' as const, exitDate: new Date().toISOString(), exitPremium: exitValue };
        }
      }
      return t;
    }));
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

  const handleOpenImportModal = () => {
    setShowImportCSV(true);
  };

  const handleImportCSV_OLD = () => {
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

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const [symbol, assetType, type, entryDate, entryPrice, shares, exitDate, exitPrice, status, notes] = line.split(',');

          if (symbol) {
            const trade: Trade = {
              id: Date.now().toString() + i,
              portfolioId: portfolios[0]?.id || 'main',
              symbol: symbol.trim(),
              assetType: (assetType?.trim() as 'stock' | 'option' | 'multi-leg') || 'stock',
              type: (type?.trim() as 'long' | 'short') || 'long',
              entryDate: entryDate?.trim() || new Date().toISOString(),
              status: (status?.trim() as 'open' | 'closed') || 'open',
              notes: notes?.trim() || ''
            };

            if (trade.assetType === 'stock') {
              trade.entryPrice = parseFloat(entryPrice);
              trade.shares = parseFloat(shares);
              if (exitPrice) trade.exitPrice = parseFloat(exitPrice);
            }

            if (exitDate) trade.exitDate = exitDate.trim();

            importedTrades.push(trade);
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
      ['Symbol', 'Asset Type', 'Type', 'Entry Date', 'Entry Price/Premium', 'Shares/Contracts', 'Exit Date', 'Exit Price/Premium', 'Status', 'Notes'].join(','),
      ...filteredTrades.map(t => {
        const entryValue = t.assetType === 'stock' ? t.entryPrice : t.premium || t.netPremium;
        const quantity = t.assetType === 'stock' ? t.shares : t.contracts;
        const exitValue = t.assetType === 'stock' ? t.exitPrice : t.exitPremium;

        return [
          t.symbol,
          t.assetType,
          t.type,
          t.entryDate,
          entryValue || '',
          quantity || '',
          t.exitDate || '',
          exitValue || '',
          t.status,
          t.notes || ''
        ].join(',');
      })
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
      let pnl = 0;

      if (trade.status === 'closed') {
        if (trade.assetType === 'stock' && trade.exitPrice && trade.entryPrice && trade.shares) {
          pnl = trade.type === 'long'
            ? (trade.exitPrice - trade.entryPrice) * trade.shares
            : (trade.entryPrice - trade.exitPrice) * trade.shares;
        } else if (trade.assetType === 'option' && trade.exitPremium !== undefined && trade.premium && trade.contracts) {
          pnl = trade.type === 'long'
            ? (trade.exitPremium - trade.premium) * trade.contracts * 100
            : (trade.premium - trade.exitPremium) * trade.contracts * 100;
        } else if (trade.assetType === 'multi-leg' && trade.exitPremium !== undefined && trade.netPremium !== undefined) {
          pnl = trade.type === 'long'
            ? (trade.exitPremium - trade.netPremium) * 100
            : (trade.netPremium - trade.exitPremium) * 100;
        }

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
        if (trade.assetType === 'stock' && trade.entryPrice && trade.shares) {
          const currentPrice = stockPrices[trade.symbol] || trade.entryPrice;
          pnl = trade.type === 'long'
            ? (currentPrice - trade.entryPrice) * trade.shares
            : (trade.entryPrice - currentPrice) * trade.shares;
        }

        unrealizedPnL += pnl;
        totalPnL += pnl;
      }
    });

    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const avgWin = wins > 0 ? totalWinAmount / wins : 0;
    const avgLoss = losses > 0 ? totalLossAmount / losses : 0;
    const sharpeRatio = totalTrades > 3 ? (totalPnL / totalTrades) / (Math.max(avgLoss, 1)) : 0;

    const openPositions = portfolioTrades.filter(t => t.status === 'open').length;
    const closedPositions = portfolioTrades.filter(t => t.status === 'closed').length;

    return {
      totalPnL,
      realizedPnL,
      unrealizedPnL,
      winRate,
      avgWin,
      avgLoss,
      sharpeRatio,
      openPositions,
      closedPositions,
      totalTrades: portfolioTrades.length
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
              <h1 className="text-3xl font-bold mb-2 text-green-400">Portfolio Tracker</h1>
              <div className="flex items-center gap-2 text-gray-400">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span className="font-medium text-green-400">
                  Live P&L Tracking with Options Support
                  {Object.keys(stockPrices).length > 0 && (
                    <span className="text-xs bg-green-700 px-2 py-0.5 rounded ml-2">🔴 LIVE</span>
                  )}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleOpenImportModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
              >
                <FileUp className="w-4 h-4" />
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
                Clear All
              </button>
            </div>
          </div>

          {/* Portfolio Selector */}
          <div className="flex gap-2 items-center mb-4">
            <select
              value={selectedPortfolio}
              onChange={(e) => setSelectedPortfolio(e.target.value)}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
            >
              {portfolios.map(p => (
                <option key={p.id} value={p.id}>
                  {p.broker === 'ALL' ? '📊 All Accounts' :
                   p.broker === 'FIDELITY' ? '🏦 Fidelity' :
                   p.broker === 'TDA' ? '📈 Think or Swim' :
                   p.broker === 'WEDBUSH' ? '💼 Wedbush' :
                   p.name}
                </option>
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

        {/* Portfolio Performance Metrics */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
                <span className="text-lg">💰</span>
                {Object.keys(stockPrices).length > 0 && <span className="text-xs">🔴</span>}
              </div>
              <div className="text-sm text-gray-400">Total P&L</div>
              <div className={`text-xl font-bold ${stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${stats.totalPnL.toLocaleString()}
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
                <span className="text-lg">💵</span>
              </div>
              <div className="text-sm text-gray-400">Realized P&L</div>
              <div className={`text-xl font-bold ${stats.realizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${stats.realizedPnL.toLocaleString()}
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-yellow-400 mb-1">
                <span className="text-lg">🏆</span>
              </div>
              <div className="text-sm text-gray-400">Win Rate</div>
              <div className="text-xl font-bold text-yellow-400">
                {stats.winRate.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">
                {stats.closedPositions} closed
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-purple-400 mb-1">
                <span className="text-lg">📊</span>
              </div>
              <div className="text-sm text-gray-400">Sharpe Ratio</div>
              <div className="text-xl font-bold text-purple-400">
                {stats.sharpeRatio.toFixed(2)}
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-cyan-400 mb-1">
                <span className="text-lg">📈</span>
              </div>
              <div className="text-sm text-gray-400">Active Positions</div>
              <div className="text-xl font-bold text-cyan-400">
                {stats.openPositions}
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-orange-400 mb-1">
                <span className="text-lg">⏳</span>
              </div>
              <div className="text-sm text-gray-400">Total Trades</div>
              <div className="text-xl font-bold text-orange-400">
                {stats.totalTrades}
              </div>
            </div>
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
                    <th className="p-3 text-left">Asset</th>
                    <th className="p-3 text-left">Type</th>
                    <th className="p-3 text-right">Entry Date</th>
                    <th className="p-3 text-right">Details</th>
                    <th className="p-3 text-right">Quantity</th>
                    <th className="p-3 text-right">Entry/Premium</th>
                    <th className="p-3 text-right">Current/Exit</th>
                    <th className="p-3 text-right">P&L</th>
                    <th className="p-3 text-right">P&L %</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.map((trade) => {
                    let pnl = 0;
                    let pnlPercent = 0;
                    let currentValue = 0;
                    let entryValue = 0;
                    let details = '';
                    let quantity = '';

                    if (trade.assetType === 'stock' && trade.entryPrice && trade.shares) {
                      const currentPrice = trade.status === 'open'
                        ? (stockPrices[trade.symbol] || trade.entryPrice)
                        : (trade.exitPrice || trade.entryPrice);

                      currentValue = currentPrice;
                      entryValue = trade.entryPrice;
                      details = 'Stock';
                      quantity = `${trade.shares} shares`;

                      pnl = trade.type === 'long'
                        ? (currentPrice - trade.entryPrice) * trade.shares
                        : (trade.entryPrice - currentPrice) * trade.shares;
                      pnlPercent = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;
                    } else if (trade.assetType === 'option' && trade.premium && trade.contracts) {
                      const currentPremium = trade.status === 'open'
                        ? trade.premium
                        : (trade.exitPremium || trade.premium);

                      currentValue = currentPremium;
                      entryValue = trade.premium;
                      details = `${trade.optionType} $${trade.strikePrice} ${new Date(trade.expirationDate || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                      quantity = `${trade.contracts} contracts`;

                      if (trade.status === 'closed' && trade.exitPremium !== undefined) {
                        pnl = trade.type === 'long'
                          ? (trade.exitPremium - trade.premium) * trade.contracts * 100
                          : (trade.premium - trade.exitPremium) * trade.contracts * 100;
                        pnlPercent = ((trade.exitPremium - trade.premium) / trade.premium) * 100;
                      }
                    } else if (trade.assetType === 'multi-leg') {
                      details = trade.strategyType || 'Multi-Leg';
                      quantity = `${trade.legs?.length || 0} legs`;
                      entryValue = trade.netPremium || 0;
                      currentValue = trade.status === 'closed' ? (trade.exitPremium || 0) : entryValue;

                      if (trade.status === 'closed' && trade.exitPremium !== undefined && trade.netPremium !== undefined) {
                        pnl = trade.type === 'long'
                          ? (trade.exitPremium - trade.netPremium) * 100
                          : (trade.netPremium - trade.exitPremium) * 100;
                        if (trade.netPremium !== 0) {
                          pnlPercent = ((trade.exitPremium - trade.netPremium) / Math.abs(trade.netPremium)) * 100;
                        }
                      }
                    }

                    return (
                      <tr key={trade.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                        <td className="p-3 font-medium">{trade.symbol}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            trade.assetType === 'stock' ? 'bg-blue-900/30 text-blue-400' :
                            trade.assetType === 'option' ? 'bg-purple-900/30 text-purple-400' :
                            'bg-orange-900/30 text-orange-400'
                          }`}>
                            {trade.assetType.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            trade.type === 'long' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                          }`}>
                            {trade.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 text-right text-sm">{new Date(trade.entryDate).toLocaleDateString()}</td>
                        <td className="p-3 text-right text-xs">{details}</td>
                        <td className="p-3 text-right text-sm">{quantity}</td>
                        <td className="p-3 text-right">
                          ${entryValue.toFixed(2)}
                        </td>
                        <td className="p-3 text-right">
                          {trade.status === 'open' ? (
                            <span className={trade.assetType === 'stock' && stockPrices[trade.symbol] && currentValue >= entryValue ? 'text-green-400' : trade.assetType === 'stock' && stockPrices[trade.symbol] ? 'text-red-400' : ''}>
                              ${currentValue.toFixed(2)}
                            </span>
                          ) : (
                            <span>${currentValue.toFixed(2)}</span>
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
                                  const label = trade.assetType === 'stock' ? 'price' : 'premium';
                                  const value = prompt(`Enter exit ${label} for ${trade.symbol}:`, currentValue.toFixed(2));
                                  if (value) handleCloseTrade(trade.id, parseFloat(value));
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={() => setShowAddTrade(false)}>
          <div className="bg-gray-900 rounded-lg p-6 max-w-4xl w-full border border-gray-800 my-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Record New Trade</h3>
              <button onClick={() => setShowAddTrade(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Popular Symbols */}
            <div className="mb-6">
              <label className="text-sm text-gray-400 mb-2 block">Popular Symbols:</label>
              <div className="flex flex-wrap gap-2">
                {popularSymbols.map(symbol => (
                  <button
                    key={symbol}
                    onClick={() => selectSymbol(symbol)}
                    className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                      newTrade.symbol === symbol
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            </div>

            {/* Asset Type Selection */}
            <div className="mb-6">
              <label className="text-sm text-gray-400 mb-2 block">Trading Type</label>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => setNewTrade(prev => ({ ...prev, assetType: 'stock', strategyType: 'SINGLE' }))}
                  className={`px-4 py-2 rounded font-medium transition-colors ${
                    newTrade.assetType === 'stock'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  📈 Stocks
                </button>
                <button
                  onClick={() => setNewTrade(prev => ({ ...prev, assetType: 'option', strategyType: 'SINGLE' }))}
                  className={`px-4 py-2 rounded font-medium transition-colors ${
                    newTrade.assetType === 'option' && newTrade.strategyType === 'SINGLE'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  ⚡ Single Option
                </button>
                <button
                  onClick={() => changeStrategyType('CALL_SPREAD')}
                  className={`px-4 py-2 rounded font-medium transition-colors ${
                    ['CALL_SPREAD', 'PUT_SPREAD', 'BEAR_CALL_SPREAD', 'BEAR_PUT_SPREAD'].includes(newTrade.strategyType)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  📊 Spreads
                </button>
                <button
                  onClick={() => changeStrategyType('STRADDLE')}
                  className={`px-4 py-2 rounded font-medium transition-colors ${
                    ['STRADDLE', 'STRANGLE'].includes(newTrade.strategyType)
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  🎯 Straddle/Strangle
                </button>
                <button
                  onClick={() => changeStrategyType('IRON_CONDOR')}
                  className={`px-4 py-2 rounded font-medium transition-colors ${
                    ['IRON_CONDOR', 'BUTTERFLY', 'JADE_LIZARD'].includes(newTrade.strategyType)
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  🦋 Advanced
                </button>
              </div>
            </div>

            {/* Strategy Template Selection (for multi-leg) */}
            {newTrade.assetType === 'multi-leg' && (
              <div className="mb-6">
                <label className="text-sm text-gray-400 mb-2 block">Strategy Template</label>
                <select
                  value={newTrade.strategyType}
                  onChange={(e) => changeStrategyType(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                >
                  {Object.entries(strategyTemplates)
                    .filter(([key]) => key !== 'SINGLE')
                    .map(([key, strategy]) => (
                      <option key={key} value={key}>
                        {strategy.name} - {strategy.description}
                      </option>
                    ))}
                </select>
              </div>
            )}

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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Symbol *</label>
                  <input
                    type="text"
                    placeholder="AAPL"
                    value={newTrade.symbol}
                    onChange={(e) => setNewTrade({ ...newTrade, symbol: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Position Type</label>
                  <select
                    value={newTrade.type}
                    onChange={(e) => setNewTrade({ ...newTrade, type: e.target.value as 'long' | 'short' })}
                    className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="long">Long</option>
                    <option value="short">Short</option>
                  </select>
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
              </div>

              {/* Stock-specific fields */}
              {newTrade.assetType === 'stock' && (
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
              )}

              {/* Single option fields */}
              {newTrade.assetType === 'option' && newTrade.strategyType === 'SINGLE' && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Option Type *</label>
                      <select
                        value={newTrade.optionType}
                        onChange={(e) => setNewTrade({ ...newTrade, optionType: e.target.value as 'CALL' | 'PUT' })}
                        className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="CALL">📈 Call</option>
                        <option value="PUT">📉 Put</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Strike Price *</label>
                      <input
                        type="number"
                        step="0.50"
                        placeholder="155.00"
                        value={newTrade.strikePrice}
                        onChange={(e) => setNewTrade({ ...newTrade, strikePrice: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Expiration Date *</label>
                      <input
                        type="date"
                        value={newTrade.expirationDate}
                        onChange={(e) => setNewTrade({ ...newTrade, expirationDate: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Premium (per contract) *</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="5.50"
                        value={newTrade.premium}
                        onChange={(e) => setNewTrade({ ...newTrade, premium: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Contracts *</label>
                      <input
                        type="number"
                        placeholder="10"
                        value={newTrade.contracts}
                        onChange={(e) => setNewTrade({ ...newTrade, contracts: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Multi-leg Options Strategy Builder */}
              {newTrade.assetType === 'multi-leg' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-medium text-yellow-400">
                      🏧 {strategyTemplates[newTrade.strategyType]?.name} Builder
                    </h4>
                    <span className="text-xs text-gray-400">
                      {newTrade.legs.length} leg{newTrade.legs.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {newTrade.legs.map((leg, index) => (
                    <div key={index} className="bg-gray-800 p-4 rounded border-l-4 border-yellow-400">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm font-bold text-yellow-400">Leg {index + 1}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          leg.action === 'BUY' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                        }`}>
                          {leg.action}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          leg.optionType === 'CALL' ? 'bg-blue-900 text-blue-300' : 'bg-purple-900 text-purple-300'
                        }`}>
                          {leg.optionType}
                        </span>
                      </div>

                      <div className="grid grid-cols-5 gap-3">
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Action</label>
                          <select
                            value={leg.action}
                            onChange={(e) => {
                              const newLegs = [...newTrade.legs];
                              newLegs[index].action = e.target.value as 'BUY' | 'SELL';
                              setNewTrade(prev => ({ ...prev, legs: newLegs }));
                            }}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                          >
                            <option value="BUY">BUY</option>
                            <option value="SELL">SELL</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Type</label>
                          <select
                            value={leg.optionType}
                            onChange={(e) => {
                              const newLegs = [...newTrade.legs];
                              newLegs[index].optionType = e.target.value as 'CALL' | 'PUT';
                              setNewTrade(prev => ({ ...prev, legs: newLegs }));
                            }}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                          >
                            <option value="CALL">CALL</option>
                            <option value="PUT">PUT</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Strike *</label>
                          <input
                            type="number"
                            step="0.50"
                            placeholder="155"
                            value={leg.strikePrice}
                            onChange={(e) => {
                              const newLegs = [...newTrade.legs];
                              newLegs[index].strikePrice = e.target.value;
                              setNewTrade(prev => ({ ...prev, legs: newLegs }));
                            }}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Premium</label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="5.50"
                            value={leg.premium}
                            onChange={(e) => {
                              const newLegs = [...newTrade.legs];
                              newLegs[index].premium = e.target.value;
                              setNewTrade(prev => ({ ...prev, legs: newLegs }));
                            }}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Contracts</label>
                          <input
                            type="number"
                            placeholder="1"
                            value={leg.contracts}
                            onChange={(e) => {
                              const newLegs = [...newTrade.legs];
                              newLegs[index].contracts = e.target.value;
                              setNewTrade(prev => ({ ...prev, legs: newLegs }));
                            }}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                          />
                        </div>
                      </div>

                      <div className="mt-2">
                        <label className="text-xs text-gray-400 mb-1 block">Expiration Date</label>
                        <input
                          type="date"
                          value={leg.expirationDate}
                          onChange={(e) => {
                            const newLegs = [...newTrade.legs];
                            newLegs[index].expirationDate = e.target.value;
                            setNewTrade(prev => ({ ...prev, legs: newLegs }));
                          }}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

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

      {/* Import CSV Modal */}
      {showImportCSV && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setShowImportCSV(false)}>
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full border border-gray-800" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Import CSV from Broker</h3>
              <button onClick={() => setShowImportCSV(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Select Broker</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setSelectedBroker('FIDELITY')}
                    className={`px-4 py-3 rounded font-medium transition-all ${
                      selectedBroker === 'FIDELITY'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Fidelity
                  </button>
                  <button
                    onClick={() => setSelectedBroker('TDA')}
                    className={`px-4 py-3 rounded font-medium transition-all ${
                      selectedBroker === 'TDA'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    TDA
                  </button>
                  <button
                    onClick={() => setSelectedBroker('WEDBUSH')}
                    className={`px-4 py-3 rounded font-medium transition-all ${
                      selectedBroker === 'WEDBUSH'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Wedbush
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Upload CSV File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCSVImport}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
              </div>

              {importStatus && (
                <div className={`p-3 rounded ${
                  importStatus.includes('Error') || importStatus.includes('No trades')
                    ? 'bg-red-900/20 text-red-400'
                    : importStatus.includes('Successfully')
                    ? 'bg-green-900/20 text-green-400'
                    : 'bg-blue-900/20 text-blue-400'
                }`}>
                  {importStatus}
                </div>
              )}

              <div className="text-sm text-gray-400 bg-gray-800 p-3 rounded">
                <p className="font-semibold mb-1">Instructions:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Select your broker from the buttons above</li>
                  <li>Export your trades as CSV from your broker</li>
                  <li>Upload the CSV file using the button above</li>
                  <li>Trades will be automatically parsed and imported</li>
                </ol>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    setShowImportCSV(false);
                    setImportStatus('');
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
