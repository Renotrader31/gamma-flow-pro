// CSV Parser utilities for different broker formats

export interface ParsedTrade {
  symbol: string;
  assetType: 'stock' | 'option' | 'multi-leg';
  action: 'BUY' | 'SELL';
  position: 'LONG' | 'SHORT';
  quantity?: number;
  shares?: number;
  contracts?: number;
  entryPrice?: number;
  premium?: number;
  optionType?: 'CALL' | 'PUT';
  strikePrice?: number;
  expirationDate?: string;
  date: string;
  totalAmount: number;
  broker: 'FIDELITY' | 'TDA' | 'WEDBUSH';
  status?: 'OPEN' | 'CLOSED' | 'EXPIRED' | 'ASSIGNED';
  rawAction?: string;
}

/**
 * Parse Fidelity CSV format
 *
 * Fidelity Format:
 * - Action: Full description (e.g., "YOU SOLD OPENING TRANSACTION PUT...")
 * - Symbol: "#NAME?" for options, actual symbol for stocks
 * - Description: Full option details "CALL (SYMBOL) Company Name MMM DD YY $STRIKE (100 SHS)"
 * - Price: Premium per contract/share
 * - Quantity: Negative for sells, positive for buys
 * - Amount ($): Total dollar amount
 * - Settlement Date: MM/DD/YY format
 */
export function parseFidelityCSV(csvContent: string): ParsedTrade[] {
  const lines = csvContent.trim().split('\n');
  const trades: ParsedTrade[] = [];

  // Skip header row (first row)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV line (handle tabs or commas)
    const columns = line.split('\t').length > 1 ? line.split('\t') : line.split(',');

    const [action, symbol, description, type, price, quantity, amount, settlementDate] = columns;

    if (!action || !description) continue;

    try {
      const trade = parseFidelityTrade({
        action,
        symbol,
        description,
        type,
        price,
        quantity,
        amount,
        settlementDate
      });

      if (trade) {
        trades.push(trade);
      }
    } catch (error) {
      console.error('Error parsing Fidelity trade:', error, { action, description });
    }
  }

  return trades;
}

function parseFidelityTrade(row: {
  action: string;
  symbol: string;
  description: string;
  type: string;
  price: string;
  quantity: string;
  amount: string;
  settlementDate: string;
}): ParsedTrade | null {
  const actionUpper = row.action.toUpperCase();

  // Skip if no amount (expired/assigned with $0)
  const amountValue = parseFloat(row.amount?.replace(/[,$]/g, '') || '0');
  if (amountValue === 0 && (actionUpper.includes('EXPIRED') || actionUpper.includes('ASSIGNED'))) {
    return null;
  }

  // Determine if this is an option or stock
  const isOption = row.description.includes('CALL (') || row.description.includes('PUT (');
  const qty = parseFloat(row.quantity || '0');
  const priceValue = parseFloat(row.price || '0');

  // Parse settlement date (MM/DD/YY)
  let date = new Date().toISOString().split('T')[0];
  if (row.settlementDate) {
    try {
      const [month, day, year] = row.settlementDate.split('/');
      const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`;
      date = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    } catch (e) {
      console.error('Error parsing date:', row.settlementDate);
    }
  }

  if (isOption) {
    return parseFidelityOption(row, actionUpper, qty, priceValue, amountValue, date);
  } else {
    return parseFidelityStock(row, actionUpper, qty, priceValue, amountValue, date);
  }
}

function parseFidelityOption(
  row: any,
  actionUpper: string,
  qty: number,
  priceValue: number,
  amountValue: number,
  date: string
): ParsedTrade {
  // Parse option details from description
  // Format: "CALL (CORZ) CORE SCIENTIFIC INC NOV 07 25 $22.5 (100 SHS)"
  const description = row.description;

  // Extract option type
  const optionType = description.startsWith('CALL') ? 'CALL' : 'PUT';

  // Extract symbol from parentheses
  const symbolMatch = description.match(/\(([A-Z]+)\)/);
  const symbol = symbolMatch ? symbolMatch[1] : row.symbol;

  // Extract expiration date (MMM DD YY)
  const dateMatch = description.match(/([A-Z]{3})\s+(\d{1,2})\s+(\d{2})\s+\$(\d+\.?\d*)/);
  let expirationDate = '';
  let strikePrice = 0;

  if (dateMatch) {
    const [, month, day, year] = dateMatch;
    const monthMap: { [key: string]: string } = {
      'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
      'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
      'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
    };
    const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`;
    expirationDate = `${fullYear}-${monthMap[month]}-${day.padStart(2, '0')}`;
    strikePrice = parseFloat(dateMatch[4]);
  }

  // Determine action and position
  let action: 'BUY' | 'SELL' = 'BUY';
  let position: 'LONG' | 'SHORT' = 'LONG';
  let status: 'OPEN' | 'CLOSED' | 'EXPIRED' | 'ASSIGNED' = 'OPEN';

  if (actionUpper.includes('EXPIRED')) {
    status = 'EXPIRED';
  } else if (actionUpper.includes('ASSIGNED')) {
    status = 'ASSIGNED';
  } else if (actionUpper.includes('CLOSING')) {
    status = 'CLOSED';
  }

  // Fidelity uses negative quantity for sells
  if (qty < 0) {
    action = 'SELL';
    position = 'SHORT';
  } else {
    action = 'BUY';
    position = 'LONG';
  }

  // Opening sells are short positions
  if (actionUpper.includes('SOLD') && actionUpper.includes('OPENING')) {
    position = 'SHORT';
  }

  return {
    symbol,
    assetType: 'option',
    action,
    position,
    contracts: Math.abs(qty),
    premium: priceValue,
    optionType,
    strikePrice,
    expirationDate,
    date,
    totalAmount: amountValue,
    broker: 'FIDELITY',
    status,
    rawAction: row.action
  };
}

function parseFidelityStock(
  row: any,
  actionUpper: string,
  qty: number,
  priceValue: number,
  amountValue: number,
  date: string
): ParsedTrade {
  const symbol = row.symbol;

  // Determine action and position
  let action: 'BUY' | 'SELL' = qty > 0 ? 'BUY' : 'SELL';
  let position: 'LONG' | 'SHORT' = qty > 0 ? 'LONG' : 'SHORT';

  // Check if it's from assignment
  let status: 'OPEN' | 'CLOSED' = 'OPEN';
  if (actionUpper.includes('ASSIGNED')) {
    status = 'OPEN'; // Stock received from assignment is an open position
  }

  return {
    symbol,
    assetType: 'stock',
    action,
    position,
    shares: Math.abs(qty),
    entryPrice: priceValue,
    date,
    totalAmount: Math.abs(amountValue),
    broker: 'FIDELITY',
    status,
    rawAction: row.action
  };
}

/**
 * Parse Think or Swim (TDA) CSV format
 * Will be implemented after receiving sample TDA CSV
 */
export function parseTDACSV(csvContent: string): ParsedTrade[] {
  // TODO: Implement after receiving TDA CSV format
  console.warn('TDA CSV parser not yet implemented');
  return [];
}

/**
 * Parse Wedbush CSV format
 * Will be implemented after receiving sample Wedbush CSV
 */
export function parseWedbushCSV(csvContent: string): ParsedTrade[] {
  // TODO: Implement after receiving Wedbush CSV format
  console.warn('Wedbush CSV parser not yet implemented');
  return [];
}

/**
 * Auto-detect broker format and parse accordingly
 */
export function parseCSV(csvContent: string, broker?: 'FIDELITY' | 'TDA' | 'WEDBUSH'): ParsedTrade[] {
  // If broker specified, use that parser
  if (broker === 'FIDELITY') return parseFidelityCSV(csvContent);
  if (broker === 'TDA') return parseTDACSV(csvContent);
  if (broker === 'WEDBUSH') return parseWedbushCSV(csvContent);

  // Auto-detect based on headers
  const firstLine = csvContent.split('\n')[0].toUpperCase();

  if (firstLine.includes('ACTION') && firstLine.includes('SETTLEMENT DATE')) {
    return parseFidelityCSV(csvContent);
  }

  // Default to Fidelity for now
  console.warn('Could not auto-detect broker format, defaulting to Fidelity');
  return parseFidelityCSV(csvContent);
}
