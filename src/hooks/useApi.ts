import { useState, useRef, useCallback, useEffect } from 'react';

type UseApiState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

type UseApiReturn<T> = UseApiState<T> & {
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
};

export function useApi<T = any>(
  fetcher: (signal: AbortSignal, ...args: any[]) => Promise<T>,
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({ data: null, loading: false, error: null });
  const abortRef = useRef<AbortController | null>(null);

  const execute = useCallback(async (...args: any[]): Promise<T | null> => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await fetcher(controller.signal, ...args);
      if (!controller.signal.aborted) {
        setState({ data, loading: false, error: null });
      }
      return data;
    } catch (err: any) {
      if (err.name === 'AbortError') return null;
      const message = err.message || 'An error occurred';
      if (!controller.signal.aborted) {
        setState(prev => ({ ...prev, loading: false, error: message }));
      }
      return null;
    }
  }, [fetcher]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({ data: null, loading: false, error: null });
  }, []);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return { ...state, execute, reset };
}

export function useFetch<T = any>(url: string, immediate = false): UseApiReturn<T> {
  const fetcher = useCallback(async (signal: AbortSignal) => {
    const res = await fetch(url, { signal });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  }, [url]);

  const api = useApi<T>(fetcher);

  useEffect(() => {
    if (immediate) api.execute();
  }, [immediate, api.execute]);

  return api;
}
