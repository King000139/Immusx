import { useCallback, useEffect, useState } from "react";
import { fetchMarkets } from "../api/api";
import { Market } from "../types";

interface UseMarketsResult {
  markets: Market[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * useMarkets – fetches live market data from the FastAPI backend.
 *
 * @param category  Optional category filter. Pass undefined for all markets.
 */
export function useMarkets(category?: string): UseMarketsResult {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMarkets(category);
      setMarkets(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load markets");
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    load();
  }, [load]);

  return { markets, loading, error, refresh: load };
}
