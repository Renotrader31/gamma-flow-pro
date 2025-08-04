// app/lib/api-config.ts
export const API_CONFIG = {
  polygon: {
    baseUrl: 'https://api.polygon.io',
    apiKey: process.env.POLYGON_API_KEY!,
    endpoints: {
      optionsSnapshot: '/v3/snapshot/options',
      optionsChain: '/v3/reference/options/contracts',
      aggregates: '/v2/aggs/ticker',
      trades: '/v3/trades',
      quotes: '/v3/quotes',
    }
  },
  unusualWhales: {
    baseUrl: 'https://api.unusualwhales.com/api',
    apiKey: process.env.UNUSUAL_WHALES_API_KEY!,
    endpoints: {
      optionsFlow: '/stock/options-flow',
      darkPool: '/darkpool',
      gammaExposure: '/stock/gamma-exposure',
      marketOverview: '/market/overview',
      unusualActivity: '/options/unusual-activity',
    }
  },
  fmp: {
    baseUrl: 'https://financialmodelingprep.com/api/v3',
    apiKey: process.env.FMP_API_KEY!,
    endpoints: {
      quote: '/quote',
      profile: '/profile',
      technicals: '/technical_indicator/1day',
      darkPool: '/stock_peers',
    }
  },
  ortex: {
    baseUrl: 'https://api.ortex.com',
    apiKey: process.env.ORTEX_API_KEY!,
    endpoints: {
      shortInterest: '/v1/short-interest',
      utilization: '/v1/utilization',
      costToBorrow: '/v1/cost-to-borrow',
    }
  },
  alphaVantage: {
    baseUrl: 'https://www.alphavantage.co/query',
    apiKey: process.env.ALPHA_VANTAGE_API_KEY!,
  },
  twelveData: {
    baseUrl: 'https://api.twelvedata.com',
    apiKey: process.env.TWELVE_DATA_API_KEY!,
    endpoints: {
      timeSeries: '/time_series',
      quote: '/quote',
      technicalIndicators: '/technical_indicators',
    }
  }
};

// Helper to build API URLs
export const buildApiUrl = (provider: keyof typeof API_CONFIG, endpoint: string, params: Record<string, any> = {}) => {
  const config = API_CONFIG[provider];
  const url = new URL(`${config.baseUrl}${endpoint}`);
  
  // Add API key
  if (provider === 'polygon') {
    params.apiKey = config.apiKey;
  } else if (provider === 'fmp') {
    params.apikey = config.apiKey;
  } else if (provider === 'alphaVantage') {
    params.apikey = config.apiKey;
  } else if (provider === 'twelveData') {
    params.apikey = config.apiKey;
  }
  
  // Add parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });
  
  return url.toString();
};

// For Unusual Whales and Ortex that use headers
export const getApiHeaders = (provider: 'unusualWhales' | 'ortex') => {
  if (provider === 'unusualWhales') {
    return {
      'Authorization': `Bearer ${API_CONFIG.unusualWhales.apiKey}`,
      'Content-Type': 'application/json',
    };
  }
  
  if (provider === 'ortex') {
    return {
      'Authorization': `Token ${API_CONFIG.ortex.apiKey}`,
      'Content-Type': 'application/json',
    };
  }
  
  return {};
};