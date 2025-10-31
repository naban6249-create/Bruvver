'use client';

import { useState, useEffect, useCallback } from 'react';

type Timeframe = 'daily' | 'weekly' | 'monthly';
type AnalysisType = 'trend_analysis' | 'sales_forecast' | 'inventory_optimization' | 'recommendations';

interface InsightData {
  trend_analysis?: {
    summary: string;
    key_insights: string[];
    data_points?: Array<{ date: string; value: number }>;
  };
  sales_forecast?: {
    prediction: string;
    confidence: string;
    recommendations: string[];
  };
  inventory_optimization?: {
    suggestions: string[];
    priority_items: string[];
  };
  recommendations?: {
    actionable_items: string[];
    quick_wins: string[];
  };
}

/**
 * Custom hook for fetching business insights
 * 
 * This hook calls the Next.js API route (/api/ai/business-insights)
 * which then calls the Python backend internally.
 * 
 * ✅ CORRECT: Frontend → Next.js API Route → Python Backend
 * ❌ WRONG: Frontend → Python Backend directly
 */
export function useBusinessInsights() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch quick insights from the AI API
   * This calls /api/ai/business-insights (Next.js API route)
   */
  const fetchQuickInsights = useCallback(
    async (
      timeframe: Timeframe,
      analysisType: AnalysisType,
      branchId?: number
    ): Promise<InsightData> => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          timeframe,
          analysisType,
          ...(branchId && { branchId: branchId.toString() }),
        });

        // ✅ Call Next.js API route (NOT the Python backend directly)
        // This is correct because:
        // 1. Next.js API route runs server-side and has access to SERVICE_API_KEY
        // 2. Browser doesn't expose environment variables
        // 3. API route handles authentication with Python backend
        const response = await fetch(`/api/ai/business-insights?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch insights');
        }

        const data = await response.json();
        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch insights';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    fetchQuickInsights,
    isLoading,
    error,
  };
}

/**
 * Custom hook for real-time insights with auto-refresh
 */
export function useRealtimeInsights(
  refreshInterval: number, // in milliseconds
  timeframe: Timeframe,
  analysisType: AnalysisType,
  branchId?: number
) {
  const [data, setData] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { fetchQuickInsights } = useBusinessInsights();

  useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    const loadData = async () => {
      try {
        setLoading(true);
        const insights = await fetchQuickInsights(timeframe, analysisType, branchId);
        
        if (isMounted) {
          setData(insights);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load insights');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Load data immediately
    loadData();

    // Set up auto-refresh
    if (refreshInterval > 0) {
      intervalId = setInterval(loadData, refreshInterval);
    }

    // Cleanup
    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [refreshInterval, timeframe, analysisType, branchId, fetchQuickInsights]);

  return { data, loading, error };
}

/**
 * Hook for batch insights fetching
 */
export function useBatchInsights() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Record<string, InsightData>>({});
  const [error, setError] = useState<string | null>(null);

  const { fetchQuickInsights } = useBusinessInsights();

  const fetchBatchInsights = useCallback(
    async (
      requests: Array<{
        timeframe: Timeframe;
        analysisType: AnalysisType;
        branchId?: number;
      }>
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const promises = requests.map(async (req) => {
          const key = `${req.timeframe}-${req.analysisType}-${req.branchId || 'all'}`;
          const data = await fetchQuickInsights(req.timeframe, req.analysisType, req.branchId);
          return { key, data };
        });

        const responses = await Promise.all(promises);
        
        const newResults: Record<string, InsightData> = {};
        responses.forEach(({ key, data }) => {
          newResults[key] = data;
        });

        setResults(newResults);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch batch insights';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchQuickInsights]
  );

  return {
    fetchBatchInsights,
    results,
    isLoading,
    error,
  };
}

/**
 * Hook for caching insights
 */
export function useCachedInsights(cacheTime: number = 5 * 60 * 1000) {
  const [cache, setCache] = useState<Map<string, { data: InsightData; timestamp: number }>>(
    new Map()
  );

  const { fetchQuickInsights } = useBusinessInsights();

  const getCachedOrFetch = useCallback(
    async (
      timeframe: Timeframe,
      analysisType: AnalysisType,
      branchId?: number
    ): Promise<InsightData> => {
      const cacheKey = `${timeframe}-${analysisType}-${branchId || 'all'}`;
      const cached = cache.get(cacheKey);

      // Return cached data if still valid
      if (cached && Date.now() - cached.timestamp < cacheTime) {
        return cached.data;
      }

      // Fetch fresh data
      const data = await fetchQuickInsights(timeframe, analysisType, branchId);

      // Update cache
      setCache((prev) => {
        const newCache = new Map(prev);
        newCache.set(cacheKey, { data, timestamp: Date.now() });
        return newCache;
      });

      return data;
    },
    [cache, cacheTime, fetchQuickInsights]
  );

  const clearCache = useCallback(() => {
    setCache(new Map());
  }, []);

  return {
    getCachedOrFetch,
    clearCache,
  };
}
