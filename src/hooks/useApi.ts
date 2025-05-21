/* eslint-disable  @typescript-eslint/no-explicit-any*/
import { useCallback, useRef } from 'react';
import { useGlobalStore } from '../lib/stores/globalStore';

// Default request timeout in milliseconds
const DEFAULT_TIMEOUT = 10000;

type ApiOptions = RequestInit & {
  timeout?: number;
  retry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  cacheKey?: string;
  cacheTTL?: number;
};

// Simple in-memory cache
const apiCache = new Map<string, { data: any; timestamp: number }>();

export const useApi = () => {
  const store = useGlobalStore();
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  // Abort pending requests with the same cache key
  const abortPendingRequest = useCallback((cacheKey: string) => {
    if (cacheKey && abortControllers.current.has(cacheKey)) {
      const controller = abortControllers.current.get(cacheKey);
      if (controller) {
        controller.abort();
        abortControllers.current.delete(cacheKey);
      }
    }
  }, []);

  // Fetch with timeout, retry logic, and caching
  const fetchWithAuth = useCallback(async (url: string, options: ApiOptions = {}) => {
    const {
      timeout = DEFAULT_TIMEOUT,
      retry = false,
      maxRetries = 3,
      retryDelay = 1000,
      cacheKey,
      cacheTTL = 5 * 60 * 1000, // 5 minutes default
      ...fetchOptions
    } = options;

    // Check cache first if cacheKey is provided
    if (cacheKey && apiCache.has(cacheKey)) {
      const cached = apiCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < cacheTTL) {
        return cached.data;
      } else {
        // Cache expired, remove it
        apiCache.delete(cacheKey);
      }
    }

    // Abort any pending request with the same cache key
    if (cacheKey) {
      abortPendingRequest(cacheKey);
    }

    // Create abort controller for this request
    const controller = new AbortController();
    if (cacheKey) {
      abortControllers.current.set(cacheKey, controller);
    }

    // Set up timeout
    const timeoutId = setTimeout(() => {
      controller.abort('Request timeout');
      if (cacheKey) {
        abortControllers.current.delete(cacheKey);
      }
    }, timeout);

    // Get auth token
    const token = store.auth.accessToken;

    let attempts = 0;
    let lastError: any = null;

    while (attempts <= maxRetries) {
      try {
        const response = await fetch(url, {
          ...fetchOptions,
          headers: {
            ...fetchOptions.headers,
            ...(token && { Authorization: `Bearer ${token}` }),
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        // Clear timeout
        clearTimeout(timeoutId);

        // Handle response
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        // Parse JSON response
        const data = await response.json();

        // Cache the result if cacheKey provided
        if (cacheKey) {
          apiCache.set(cacheKey, { data, timestamp: Date.now() });
          abortControllers.current.delete(cacheKey);
        }

        return data;
      } catch (error: any) {
        // Clear timeout if not already cleared
        clearTimeout(timeoutId);

        // Store error for potential retries
        lastError = error;

        // Check if we aborted the request or if it's a different error
        if (error.name === 'AbortError') {
          throw new Error('Request was aborted');
        }

        // Retry logic
        if (retry && attempts < maxRetries) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempts));
        } else {
          if (cacheKey) {
            abortControllers.current.delete(cacheKey);
          }
          throw error;
        }
      }
    }

    // Shouldn't get here, but just in case
    throw lastError || new Error('Request failed after multiple attempts');
  }, [store.auth.accessToken, abortPendingRequest]);

  // Refresh token handler
  const refreshTokenIfNeeded = useCallback(async () => {
    if (!store.auth.refreshToken) return false;

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: store.auth.refreshToken }),
      });

      if (response.ok) {
        const { access_token } = await response.json();
        useGlobalStore.getState().updateSlice('auth', { accessToken: access_token });
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
    return false;
  }, [store.auth.refreshToken]);

  // Clear cache helper
  const clearCache = useCallback((keyPrefix?: string) => {
    if (keyPrefix) {
      // Clear keys matching prefix
      for (const key of apiCache.keys()) {
        if (key.startsWith(keyPrefix)) {
          apiCache.delete(key);
        }
      }
    } else {
      // Clear entire cache
      apiCache.clear();
    }
  }, []);

  // Abort all pending requests
  const abortAllRequests = useCallback(() => {
    abortControllers.current.forEach(controller => {
      controller.abort();
    });
    abortControllers.current.clear();
  }, []);

  return { 
    fetchWithAuth, 
    refreshTokenIfNeeded, 
    clearCache, 
    abortAllRequests 
  };
};