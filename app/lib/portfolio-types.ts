// Portfolio Tracker Type Definitions

export interface Trade {
  id: string
  portfolioId: string
  symbol: string
  tradeType: 'call' | 'put' | 'call_spread' | 'put_spread' | 'iron_condor' | 'strangle' | 'straddle' | 'covered_call' | 'stock' | 'other'
  strategy?: string

  // Entry details
  entryDate: string
  entryPrice: number // Total cost/credit
  quantity: number // Number of contracts or shares

  // For options
  strikes?: {
    long?: number
    short?: number
    longPut?: number
    shortPut?: number
    longCall?: number
    shortCall?: number
  }
  expirationDate?: string

  // Exit details
  exitDate?: string | null
  exitPrice?: number | null

  // P&L
  realizedPL?: number
  unrealizedPL?: number
  currentPrice?: number

  // Status
  status: 'open' | 'closed'

  // Notes
  notes?: string
  tags?: string[]
}

export interface Portfolio {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string

  // Summary stats
  totalPL: number
  totalRealizedPL: number
  totalUnrealizedPL: number
  openPositions: number
  closedPositions: number
  winRate: number
  avgWin: number
  avgLoss: number

  // Settings
  color?: string
  isActive: boolean
}

export interface PortfolioData {
  portfolios: Portfolio[]
  trades: Trade[]
  settings: {
    defaultPortfolioId?: string
    currency: string
    timezone: string
  }
}

export interface TradeFormData {
  symbol: string
  tradeType: string
  strategy?: string
  entryDate: string
  entryPrice: string
  quantity: string
  strikes?: {
    long?: string
    short?: string
    longPut?: string
    shortPut?: string
    longCall?: string
    shortCall?: string
  }
  expirationDate?: string
  exitDate?: string
  exitPrice?: string
  status: 'open' | 'closed'
  notes?: string
}

export interface CSVTradeRow {
  Symbol: string
  Type: string
  'Entry Date': string
  'Entry Price': string
  Quantity: string
  'Exit Date'?: string
  'Exit Price'?: string
  Strike?: string
  Expiration?: string
  Status?: string
  Notes?: string
  [key: string]: string | undefined
}
