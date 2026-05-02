import React, { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE } from '../config';
import { getApiBase } from '../config';

// ─── Internal helpers ────────────────────────────────────────────────────────

function apiUrl(path: string) {
  return `${getApiBase()}${path}`;
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export function useStats(year?: string) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (refresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      let url = year && year !== 'All Time' ? apiUrl(`/stats?year=${year}`) : apiUrl('/stats');
      if (refresh) {
        url += (url.includes('?') ? '&' : '?') + 'refresh=true';
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log(`[Dashboard] Stats received: Income=${data.total_income}, Savings=${data.net_savings}`);
      setStats(data);
    } catch (e: any) {
      console.error(`[Dashboard] Error: ${e.message}`);
      setError(e.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

// ─── Detailed Stats ───────────────────────────────────────────────────────────

export function useDetailedStats(year: string) {
  const [detailedStats, setDetailedStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetailedStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(apiUrl(`/stats/detailed?year=${year}`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDetailedStats(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load detailed stats');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { fetchDetailedStats(); }, [fetchDetailedStats]);

  return { detailedStats, loading, error, refetch: fetchDetailedStats };
}

// ─── Insights ─────────────────────────────────────────────────────────────────

export function useInsights() {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async (force: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      // Pass ?force=true to bypass the backend's permanent in-memory LLM cache
      const url = force
        ? apiUrl(`/portfolio/analysis?force=true&_t=${Date.now()}`)
        : apiUrl('/portfolio/analysis');
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setInsights(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  return { insights, loading, error, refetch: () => fetchInsights(true) };
}

// ─── Stocks ───────────────────────────────────────────────────────────────────

export function useStocks() {
  const [data, setData] = useState<any>({ holdings: [], is_cached: false, last_updated: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStocks = useCallback(async (refresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      const url = refresh ? apiUrl('/stocks?refresh=true') : apiUrl('/stocks');
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message || 'Failed to load stocks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStocks(); }, [fetchStocks]);

  return {
    stocks: data.holdings || [],
    metadata: { is_cached: data.is_cached, last_updated: data.last_updated },
    loading,
    error,
    refetch: fetchStocks
  };
}

// ─── Assets ───────────────────────────────────────────────────────────────────

export function useAssets() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(apiUrl('/assets/'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAssets(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);
  return { assets, loading, error, refetch: fetchAssets };
}

// ─── FIRE ─────────────────────────────────────────────────────────────────────

export function useFireStatus() {
  const [fireStatus, setFireStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(apiUrl('/fire/status'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFireStatus(await res.json());
    } catch (e: any) {
      setError(e.message || 'Failed to load FIRE status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { fireStatus, loading, error, refetch: fetch_ };
}

// ─── Tax ─────────────────────────────────────────────────────────────────────

export function useTaxSummary() {
  const [taxSummary, setTaxSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(apiUrl('/tax/summary'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTaxSummary(await res.json());
    } catch (e: any) {
      setError(e.message || 'Failed to load tax summary');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { taxSummary, loading, error, refetch: fetch_ };
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export function useAnalytics() {
  const [allocation, setAllocation] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [risk, setRisk] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [allocRes, perfRes, riskRes] = await Promise.all([
        fetch(apiUrl('/analytics/allocation')),
        fetch(apiUrl('/analytics/performance')),
        fetch(apiUrl('/analytics/risk')),
      ]);
      if (allocRes.ok) setAllocation(await allocRes.json());
      if (perfRes.ok) setPerformance(await perfRes.json());
      if (riskRes.ok) setRisk(await riskRes.json());
    } catch (e: any) {
      setError(e.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { allocation, performance, risk, loading, error, refetch: fetch_ };
}
