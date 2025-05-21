/* eslint-disable @typescript-eslint/ban-ts-comment*/
// @ts-nocheck


"use client";

import React, { ReactNode, memo, useEffect, useCallback } from 'react';
import { useAsync } from '~/hooks/useAsync';
import { useApi } from '~/hooks/useApi';

// Basic props type for rendering data arrays
interface ApiDataRendererProps<T> {
  data?: T[] | null;
  loading?: boolean;
  error?: string | null;
  renderItem: (item: T, index: number) => ReactNode;
  renderEmpty?: () => ReactNode;
  renderError?: (error: string, retry?: () => void) => ReactNode;
  renderLoading?: () => ReactNode;
  endpoint?: string;
  fetchOptions?: RequestInit & {
    cacheKey?: string;
    retry?: boolean;
  };
  onDataLoaded?: (data: T[]) => void;
  transformData?: (data: unknown) => T[];
  autoRefresh?: boolean;
  refreshInterval?: number;
}

function ApiDataRenderer<T>({
  // Props for direct data passing
  data: propData,
  loading: propLoading,
  error: propError,
  
  // Rendering functions
  renderItem,
  renderEmpty = () => <div className="text-gray-400 p-4 text-center">No data available</div>,
  renderError = (err) => <div className="text-red-400 p-4 text-center">Error: {err}</div>,
  renderLoading = () => (
    <div className="flex flex-col items-center justify-center p-8 space-y-2">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-500 text-sm">Loading data...</p>
    </div>
  ),
  
  // API fetch options
  endpoint,
  fetchOptions,
  onDataLoaded,
  transformData = (data) => data as T[],
  autoRefresh = false,
  refreshInterval = 30000,
}: ApiDataRendererProps<T>) {
  // State to track if we're using props or fetching
  const usingApi = !!endpoint;
  
  // API fetching logic
  const { fetchWithAuth, clearCache } = useApi();
  
  const fetchData = useCallback(async () => {
    if (!endpoint) return null;
    const response = await fetchWithAuth(endpoint, fetchOptions);
    const transformed = transformData(response);
    return transformed;
  }, [endpoint, fetchOptions, transformData, fetchWithAuth]);

  const {
    execute: loadData,
    abort: abortFetch,
    data: fetchedData,
    isLoading: isFetching,
    error: fetchError,
    isError: hasFetchError,
  } = useAsync<T[]>(fetchData, {
    abortPrevious: true,
    onSuccess: onDataLoaded,
  });

  // Set up auto refresh
  useEffect(() => {
    if (!usingApi || !autoRefresh) return;
    
    const intervalId = setInterval(() => {
      loadData();
    }, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [usingApi, autoRefresh, refreshInterval, loadData]);

  // Determine loading state
  const loading = usingApi ? isFetching : propLoading || false;
  
  // Determine error state
  const error = usingApi 
    ? (hasFetchError && fetchError ? fetchError.message : null) 
    : propError || null;
  
  // Determine data
  const data = usingApi ? fetchedData : propData;

  // Initial data load when using API
  useEffect(() => {
    if (usingApi) {
      loadData();
    }
    
    return () => {
      if (usingApi) {
        abortFetch();
      }
    };
  }, [usingApi, loadData, abortFetch]);

  // Load more data when scrolling to the bottom (for infinite loading)
  const refreshData = useCallback(() => {
    if (usingApi) {
      // Clear the cache for this endpoint if needed
      if (fetchOptions?.cacheKey) {
        clearCache(fetchOptions.cacheKey);
      }
      loadData();
    }
  }, [usingApi, loadData, clearCache, fetchOptions]);

  // Early returns
  if (loading && !data) return <>{renderLoading()}</>;
  if (error) return <>{renderError(error, refreshData)}</>;
  if (!data || data.length === 0) return <>{renderEmpty()}</>;

  // Regular rendering for all lists (we removed virtualization)
  return <>{data.map(renderItem)}</>;
}

export default memo(ApiDataRenderer) as typeof ApiDataRenderer;