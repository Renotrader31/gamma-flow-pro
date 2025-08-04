// Options flow from Unusual Whales
export async function getOptionsFlow() {
  const response = await fetch('/api/options-flow');
  if (!response.ok) throw new Error('Failed to fetch options flow');
  return response.json();
}

// GEX data
export async function getGEXData(symbol: string) {
  const response = await fetch(`/api/gex/stocks?symbol=${symbol}`);
  if (!response.ok) throw new Error('Failed to fetch GEX data');
  return response.json();
}

// Dark pool data
export async function getDarkPoolData(symbol: string) {
  const response = await fetch(`/api/darkpool?symbol=${symbol}`);
  if (!response.ok) throw new Error('Failed to fetch dark pool data');
  return response.json();
}

// Stock quotes from Polygon
export async function getStockQuote(symbol: string) {
  const response = await fetch(`/api/polygon?endpoint=quote&symbol=${symbol}`);
  if (!response.ok) throw new Error('Failed to fetch quote');
  return response.json();
}

// Market status
export async function getMarketStatus() {
  const response = await fetch('/api/polygon?endpoint=market-status');
  if (!response.ok) throw new Error('Failed to fetch market status');
  return response.json();
}