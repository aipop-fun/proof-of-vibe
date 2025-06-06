/*eslint-disable @typescript-eslint/no-unused-vars */

"use client";

import { useCallback, useRef, useEffect } from 'react';
import { z } from 'zod';
import { useValidation } from './useCommon';

const CacheConfigSchema = z.object({
    ttl: z.number().default(5 * 60 * 1000), // 5 minutes
    maxSize: z.number().default(100),
    persistLocal: z.boolean().default(false),
});

const DataManagerConfigSchema = z.object({
    cache: CacheConfigSchema.optional(),
    retries: z.number().min(0).max(5).default(2),
    timeout: z.number().default(10000),
    transform: z.function(z.tuple([z.unknown()]), z.unknown()).optional(),
});

type CacheConfig = z.infer<typeof CacheConfigSchema>;
type DataManagerConfig = Partial<z.infer<typeof DataManagerConfigSchema>>;

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    key: string;
}

export const useDataManager = <T>(config: DataManagerConfig = {}) => {
    const { validateAndParse } = useValidation();
    const validatedConfig = validateAndParse(DataManagerConfigSchema, config) ?? {
        retries: 2,
        timeout: 10000,
        cache: undefined,
        transform: undefined
    };

    const cache = useRef(new Map<string, CacheEntry<T>>());
    const pendingRequests = useRef(new Map<string, Promise<T>>());

    const { cache: cacheConfig = {}, retries = 2, timeout = 10000, transform } = validatedConfig;
    const { ttl = 5 * 60 * 1000, maxSize = 100, persistLocal = false } = cacheConfig;

    // Load from localStorage on mount
    useEffect(() => {
        if (!persistLocal || typeof window === 'undefined') return;

        try {
            const stored = localStorage.getItem('timbra-cache');
            if (stored) {
                const parsed = JSON.parse(stored);
                Object.entries(parsed).forEach(([key, entry]) => {
                    cache.current.set(key, entry as CacheEntry<T>);
                });
            }
        } catch (error) {
            console.warn('Failed to load cache from localStorage:', error);
        }
    }, [persistLocal]);

    // Save to localStorage when cache changes
    const persistCache = useCallback(() => {
        if (!persistLocal || typeof window === 'undefined') return;

        try {
            const cacheObject = Object.fromEntries(cache.current.entries());
            localStorage.setItem('timbra-cache', JSON.stringify(cacheObject));
        } catch (error) {
            console.warn('Failed to persist cache:', error);
        }
    }, [persistLocal]);

    const isExpired = useCallback((entry: CacheEntry<T>): boolean => {
        return Date.now() - entry.timestamp > ttl;
    }, [ttl]);

    const evictExpired = useCallback(() => {
        const now = Date.now();
        for (const [key, entry] of cache.current.entries()) {
            if (now - entry.timestamp > ttl) {
                cache.current.delete(key);
            }
        }
    }, [ttl]);

    const evictOldest = useCallback(() => {
        if (cache.current.size <= maxSize) return;

        let oldestKey = '';
        let oldestTime = Date.now();

        for (const [key, entry] of cache.current.entries()) {
            if (entry.timestamp < oldestTime) {
                oldestTime = entry.timestamp;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            cache.current.delete(oldestKey);
        }
    }, [maxSize]);

    const getCached = useCallback((key: string): T | null => {
        const entry = cache.current.get(key);
        if (!entry || isExpired(entry)) {
            cache.current.delete(key);
            return null;
        }
        return entry.data;
    }, [isExpired]);

    const setCached = useCallback((key: string, data: T) => {
        evictExpired();
        evictOldest();

        cache.current.set(key, {
            data,
            timestamp: Date.now(),
            key,
        });

        persistCache();
    }, [evictExpired, evictOldest, persistCache]);

    const fetchWithRetry = useCallback(async (
        fetcher: () => Promise<T>,
        attemptCount = 0
    ): Promise<T> => {
        try {
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout')), timeout);
            });

            const result = await Promise.race([fetcher(), timeoutPromise]);
            return transform ? (transform(result) as T) : result;
        } catch (error) {
            if (attemptCount < retries) {
                const delay = Math.pow(2, attemptCount) * 1000; // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, delay));
                return fetchWithRetry(fetcher, attemptCount + 1);
            }
            throw error;
        }
    }, [retries, timeout, transform]);

    const fetchData = useCallback(async (
        key: string,
        fetcher: () => Promise<T>,
        options: { skipCache?: boolean; forceRefresh?: boolean } = {}
    ): Promise<T> => {
        const { skipCache = false, forceRefresh = false } = options;

        // Check cache first
        if (!skipCache && !forceRefresh) {
            const cached = getCached(key);
            if (cached !== null) {
                return cached;
            }
        }

        // Check if request is already pending
        const pending = pendingRequests.current.get(key);
        if (pending) {
            return pending;
        }

        // Create new request
        const promise = fetchWithRetry(fetcher)
            .then(data => {
                setCached(key, data);
                return data;
            })
            .finally(() => {
                pendingRequests.current.delete(key);
            });

        pendingRequests.current.set(key, promise);
        return promise;
    }, [getCached, setCached, fetchWithRetry]);

    const invalidate = useCallback((pattern?: string | RegExp) => {
        if (!pattern) {
            cache.current.clear();
            pendingRequests.current.clear();
        } else if (typeof pattern === 'string') {
            cache.current.delete(pattern);
            pendingRequests.current.delete(pattern);
        } else {
            // RegExp pattern
            for (const key of cache.current.keys()) {
                if (pattern.test(key)) {
                    cache.current.delete(key);
                    pendingRequests.current.delete(key);
                }
            }
        }
        persistCache();
    }, [persistCache]);

    const prefetch = useCallback(async (
        key: string,
        fetcher: () => Promise<T>
    ): Promise<void> => {
        try {
            await fetchData(key, fetcher);
        } catch (error) {
            // Prefetch failures are silent
            console.debug('Prefetch failed for key:', key, error);
        }
    }, [fetchData]);

    return {
        fetchData,
        getCached,
        setCached,
        invalidate,
        prefetch,
        clearCache: () => invalidate(),
        getCacheStats: () => ({
            size: cache.current.size,
            keys: Array.from(cache.current.keys()),
            pending: Array.from(pendingRequests.current.keys()),
        }),
    };
};