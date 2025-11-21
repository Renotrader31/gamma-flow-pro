// Type definitions for Google Calendar integration

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  colorId?: string;
  location?: string;
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  backgroundColor?: string;
  foregroundColor?: string;
  selected?: boolean;
}

export interface CalendarSyncSettings {
  syncEnabled: boolean;
  selectedCalendars: string[];
  autoSyncInterval: number; // minutes
  syncTradeAlerts: boolean;
  syncPortfolioEvents: boolean;
}

export interface TradeEvent extends CalendarEvent {
  symbol?: string;
  tradeType?: 'buy' | 'sell' | 'option' | 'alert';
  sentiment?: 'bullish' | 'bearish' | 'neutral';
}
