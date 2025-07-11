/* eslint-disable  @typescript-eslint/no-explicit-any */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * FarcasterUser interface representing a Farcaster user profile
 */
export interface FarcasterUser {
    fid: number;
    username: string;
    displayName?: string;
    pfpUrl?: string;
    bio?: string;
    followerCount?: number;
    followingCount?: number;
    verifiedAddresses?: {
        eth_addresses: string[];
        sol_addresses: string[];
    };
    lastActiveTimestamp?: number;
}

export interface UseFarcasterSearchOptions {
    debounceMs?: number;      // Debounce delay in milliseconds
    minQueryLength?: number;  // Minimum query length to search
    initialQuery?: string;    // Initial search query
    limit?: number;           // Maximum number of results
    onError?: (error: Error) => void;  // Error callback
}

export interface UseFarcasterSearchReturn {
    results: FarcasterUser[];
    isLoading: boolean;
    error: string | null;
    search: (query: string) => Promise<void>;
    clear: () => void;
    query: string;            // Current search query
    hasSearched: boolean;     // Whether any search has been executed
    localResults: FarcasterUser[]; // Results from local cache
}

/**
 * Hook for searching Farcaster users with advanced features
 * - Debounced searching
 * - In-memory result caching
 * - Error handling
 * - Loading state management
 * - Abortable requests
 */
export function useFarcasterSearch({
    debounceMs = 300,
    minQueryLength = 2,
    initialQuery = '',
    limit = 20,
    onError
}: UseFarcasterSearchOptions = {}): UseFarcasterSearchReturn {
    // State management
    const [results, setResults] = useState<FarcasterUser[]>([]);
    const [localResults, setLocalResults] = useState<FarcasterUser[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState(initialQuery);
    const [hasSearched, setHasSearched] = useState(false);

    // Refs for memoization and abort control
    const abortControllerRef = useRef<AbortController | null>(null);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cacheRef = useRef<Map<string, FarcasterUser[]>>(new Map());
    const prevQueryRef = useRef<string>(initialQuery);

    // Effect to clean up on unmount
    useEffect(() => {
        return () => {
            // Cancel any pending search
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }

            // Abort any ongoing request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // Core search function
    const performSearch = useCallback(async (searchQuery: string): Promise<void> => {
        // Only search if query meets minimum length
        if (searchQuery.trim().length === 0) {
            setResults([]);
            setLocalResults([]);
            setIsLoading(false);
            setError(null);
            return;
        }

        if (searchQuery.trim().length < minQueryLength) {
            return;
        }

        // Mark as having searched
        setHasSearched(true);
        setError(null);

        // Check if we have cached results for this query
        const normalizedQuery = searchQuery.trim().toLowerCase();
        if (cacheRef.current.has(normalizedQuery)) {
            const cachedResults = cacheRef.current.get(normalizedQuery)!;
            setResults(cachedResults);
            setLocalResults(cachedResults);
            setIsLoading(false);
            return;
        }

        // Cancel any previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new abort controller
        abortControllerRef.current = new AbortController();
        const { signal } = abortControllerRef.current;

        setIsLoading(true);

        try {
            // Make API request with abort signal
            const response = await fetch(
                `/api/neynar/search?query=${encodeURIComponent(normalizedQuery)}&limit=${limit}`,
                { signal }
            );

            // Handle HTTP errors
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error: ${response.status}`);
            }

            const data = await response.json();

            if (!signal.aborted) {
                if (data.users && Array.isArray(data.users)) {
                    // Normalize response data
                    const normalizedUsers: FarcasterUser[] = data.users.map((user: any) => ({
                        fid: user.fid,
                        username: user.username || `user${user.fid}`,
                        displayName: user.displayName || user.display_name || user.username || `User ${user.fid}`,
                        pfpUrl: user.pfpUrl || user.pfp_url || null,
                        bio: user.bio || '',
                        followerCount: user.followerCount || user.follower_count || 0,
                        followingCount: user.followingCount || user.following_count || 0,
                        verifiedAddresses: user.verifiedAddresses || { eth_addresses: [], sol_addresses: [] },
                        lastActiveTimestamp: user.lastActiveTimestamp || user.lastActive || null
                    }));

                    // Update state
                    setResults(normalizedUsers);
                    setLocalResults(normalizedUsers);

                    // Cache results
                    cacheRef.current.set(normalizedQuery, normalizedUsers);

                    // Prune cache if it grows too large
                    if (cacheRef.current.size > 100) {
                        const keys = Array.from(cacheRef.current.keys());
                        // Remove oldest 20% of cache entries
                        const removeCount = Math.ceil(keys.length * 0.2);
                        for (let i = 0; i < removeCount; i++) {
                            cacheRef.current.delete(keys[i]);
                        }
                    }
                } else {
                    setResults([]);
                    setLocalResults([]);
                }
                setIsLoading(false);
            }
        } catch (err) {
            // Only update state if request wasn't aborted
            if (!signal.aborted) {
                const errorMessage = err instanceof Error ? err.message : 'Search failed';
                setError(errorMessage);
                setResults([]);

                // Call optional error handler
                if (onError && err instanceof Error) {
                    onError(err);
                }

                setIsLoading(false);
            }
        }
    }, [limit, minQueryLength, onError]);

    // Debounced search function
    const search = useCallback((searchQuery: string): Promise<void> => {
        setQuery(searchQuery);

        // Clear any pending search
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Skip debounce for empty queries
        if (!searchQuery.trim()) {
            return performSearch('');
        }

        // Skip if query is unchanged
        if (searchQuery === prevQueryRef.current) {
            return Promise.resolve();
        }

        prevQueryRef.current = searchQuery;

        // Start loading state immediately for better UX
        setIsLoading(true);

        // Return a promise that resolves when the search is complete
        return new Promise((resolve) => {
            searchTimeoutRef.current = setTimeout(() => {
                performSearch(searchQuery).then(resolve);
            }, debounceMs);
        });
    }, [debounceMs, performSearch]);

    // Clear function
    const clear = useCallback(() => {
        setQuery('');
        setResults([]);
        setLocalResults([]);
        setError(null);
        prevQueryRef.current = '';

        // Cancel any pending search
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Abort any ongoing request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    }, []);

    return {
        results,
        localResults,
        isLoading,
        error,
        search,
        clear,
        query,
        hasSearched
    };
}