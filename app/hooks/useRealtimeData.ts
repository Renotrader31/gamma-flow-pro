// @ts-nocheck
import { useState, useEffect } from 'react';

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  gex?: number;
  putCallRatio?: number;
  ivRank?: number;
  flowScore?: number;
  netPremium?: number;
  darkPoolRatio?: number;
  gammaLevels?: {
    flip: number;
    resistance: number[];
    support: number[];
  };
}

interface RealtimeData {
  data: StockData[];
  timestamp: string;
}

export function useRealtimeData(endpoint: string, interval: number = 5000) {
  const [data, setData] = useState<RealtimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result: RealtimeData = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Set up interval for real-time updates
    const intervalId = setInterval(fetchData, interval);

    // Cleanup
    return () => clearInterval(intervalId);
  }, [endpoint, interval]);

  return { data, loading, error };
}