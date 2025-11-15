// Portfolio Storage Manager (localStorage-based)
import { Portfolio, Trade, PortfolioData } from './portfolio-types'

const STORAGE_KEY = 'gamma-flow-portfolios'

// Initialize default data
const getDefaultData = (): PortfolioData => ({
  portfolios: [
    {
      id: 'default',
      name: 'Main Portfolio',
      description: 'My primary trading account',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalPL: 0,
      totalRealizedPL: 0,
      totalUnrealizedPL: 0,
      openPositions: 0,
      closedPositions: 0,
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      color: '#8b5cf6',
      isActive: true
    }
  ],
  trades: [],
  settings: {
    defaultPortfolioId: 'default',
    currency: 'USD',
    timezone: 'America/New_York'
  }
})

// Load all data
export const loadPortfolioData = (): PortfolioData => {
  if (typeof window === 'undefined') return getDefaultData()

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return getDefaultData()

    return JSON.parse(stored)
  } catch (error) {
    console.error('Error loading portfolio data:', error)
    return getDefaultData()
  }
}

// Save all data
export const savePortfolioData = (data: PortfolioData): void => {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Error saving portfolio data:', error)
  }
}

// Portfolio operations
export const createPortfolio = (name: string, description?: string, color?: string): Portfolio => {
  const data = loadPortfolioData()

  const newPortfolio: Portfolio = {
    id: `portfolio-${Date.now()}`,
    name,
    description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalPL: 0,
    totalRealizedPL: 0,
    totalUnrealizedPL: 0,
    openPositions: 0,
    closedPositions: 0,
    winRate: 0,
    avgWin: 0,
    avgLoss: 0,
    color: color || '#8b5cf6',
    isActive: true
  }

  data.portfolios.push(newPortfolio)
  savePortfolioData(data)

  return newPortfolio
}

export const updatePortfolio = (portfolioId: string, updates: Partial<Portfolio>): void => {
  const data = loadPortfolioData()
  const index = data.portfolios.findIndex(p => p.id === portfolioId)

  if (index !== -1) {
    data.portfolios[index] = {
      ...data.portfolios[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    savePortfolioData(data)
  }
}

export const deletePortfolio = (portfolioId: string): void => {
  const data = loadPortfolioData()

  // Don't delete if it's the only portfolio
  if (data.portfolios.length <= 1) {
    console.warn('Cannot delete the last portfolio')
    return
  }

  data.portfolios = data.portfolios.filter(p => p.id !== portfolioId)
  data.trades = data.trades.filter(t => t.portfolioId !== portfolioId)

  savePortfolioData(data)
}

// Trade operations
export const addTrade = (trade: Omit<Trade, 'id'>): Trade => {
  const data = loadPortfolioData()

  const newTrade: Trade = {
    ...trade,
    id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  data.trades.push(newTrade)
  savePortfolioData(data)
  recalculatePortfolioStats(trade.portfolioId)

  return newTrade
}

export const updateTrade = (tradeId: string, updates: Partial<Trade>): void => {
  const data = loadPortfolioData()
  const index = data.trades.findIndex(t => t.id === tradeId)

  if (index !== -1) {
    const trade = data.trades[index]
    data.trades[index] = { ...trade, ...updates }
    savePortfolioData(data)
    recalculatePortfolioStats(trade.portfolioId)
  }
}

export const deleteTrade = (tradeId: string): void => {
  const data = loadPortfolioData()
  const trade = data.trades.find(t => t.id === tradeId)

  if (trade) {
    data.trades = data.trades.filter(t => t.id !== tradeId)
    savePortfolioData(data)
    recalculatePortfolioStats(trade.portfolioId)
  }
}

export const getTrades = (portfolioId?: string): Trade[] => {
  const data = loadPortfolioData()

  if (portfolioId) {
    return data.trades.filter(t => t.portfolioId === portfolioId)
  }

  return data.trades
}

// Calculate portfolio statistics
export const recalculatePortfolioStats = (portfolioId: string): void => {
  const data = loadPortfolioData()
  const portfolio = data.portfolios.find(p => p.id === portfolioId)

  if (!portfolio) return

  const trades = data.trades.filter(t => t.portfolioId === portfolioId)

  const openTrades = trades.filter(t => t.status === 'open')
  const closedTrades = trades.filter(t => t.status === 'closed')

  const totalRealizedPL = closedTrades.reduce((sum, t) => sum + (t.realizedPL || 0), 0)
  const totalUnrealizedPL = openTrades.reduce((sum, t) => sum + (t.unrealizedPL || 0), 0)

  const winners = closedTrades.filter(t => (t.realizedPL || 0) > 0)
  const losers = closedTrades.filter(t => (t.realizedPL || 0) < 0)

  const avgWin = winners.length > 0
    ? winners.reduce((sum, t) => sum + (t.realizedPL || 0), 0) / winners.length
    : 0

  const avgLoss = losers.length > 0
    ? losers.reduce((sum, t) => sum + (t.realizedPL || 0), 0) / losers.length
    : 0

  const winRate = closedTrades.length > 0
    ? (winners.length / closedTrades.length) * 100
    : 0

  updatePortfolio(portfolioId, {
    totalPL: totalRealizedPL + totalUnrealizedPL,
    totalRealizedPL,
    totalUnrealizedPL,
    openPositions: openTrades.length,
    closedPositions: closedTrades.length,
    winRate,
    avgWin,
    avgLoss
  })
}

// Bulk import trades
export const importTrades = (trades: Omit<Trade, 'id'>[]): void => {
  const data = loadPortfolioData()

  const newTrades = trades.map((trade, index) => ({
    ...trade,
    id: `trade-${Date.now()}-${index}`
  }))

  data.trades.push(...newTrades)
  savePortfolioData(data)

  // Recalculate stats for affected portfolios
  const portfolioIds = new Set(newTrades.map(t => t.portfolioId))
  portfolioIds.forEach(id => recalculatePortfolioStats(id))
}

// Get overall stats across all portfolios
export const getOverallStats = () => {
  const data = loadPortfolioData()

  const totalPL = data.portfolios.reduce((sum, p) => sum + p.totalPL, 0)
  const totalRealizedPL = data.portfolios.reduce((sum, p) => sum + p.totalRealizedPL, 0)
  const totalUnrealizedPL = data.portfolios.reduce((sum, p) => sum + p.totalUnrealizedPL, 0)
  const openPositions = data.portfolios.reduce((sum, p) => sum + p.openPositions, 0)
  const closedPositions = data.portfolios.reduce((sum, p) => sum + p.closedPositions, 0)

  const closedTrades = data.trades.filter(t => t.status === 'closed')
  const winners = closedTrades.filter(t => (t.realizedPL || 0) > 0)
  const winRate = closedTrades.length > 0 ? (winners.length / closedTrades.length) * 100 : 0

  return {
    totalPL,
    totalRealizedPL,
    totalUnrealizedPL,
    openPositions,
    closedPositions,
    winRate,
    totalTrades: data.trades.length,
    activePortfolios: data.portfolios.filter(p => p.isActive).length
  }
}
