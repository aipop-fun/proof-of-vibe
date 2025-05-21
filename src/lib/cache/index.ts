/* eslint-disable @typescript-eslint/no-explicit-any,  @typescript-eslint/ban-ts-comment */
// @ts-nocheck


/**
 * Simple in-memory cache with expiration
 * For production, you would replace this with Redis or another distributed caching solution
 */

interface CacheItem<T> {
    value: T;
    expiry: number | null; // Timestamp when this item expires, or null for no expiration
}

class Cache {
    private store: Map<string, CacheItem<any>> = new Map();
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor(private defaultTTL: number = 3600, private maxSize: number = 1000) {
        // Start periodic cleanup process if in browser environment
        if (typeof window !== 'undefined') {
            this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Cleanup every minute
        }
    }

    /**
     * Get a value from the cache
     * @param key - Cache key
     * @returns Cached value or undefined if not found or expired
     */
    async get<T>(key: string): Promise<T | undefined> {
        const item = this.store.get(key);

        // If item doesn't exist or has expired, return undefined
        if (!item || (item.expiry !== null && item.expiry < Date.now())) {
            if (item) {
                // Remove expired item
                this.store.delete(key);
            }
            return undefined;
        }

        return item.value as T;
    }

    /**
     * Set a value in the cache
     * @param key - Cache key
     * @param value - Value to store
     * @param ttl - Time to live in seconds (0 for no expiration)
     */
    async set<T>(key: string, value: T, ttl: number = this.defaultTTL): Promise<void> {
        // Ensure cache doesn't grow too large
        if (this.store.size >= this.maxSize) {
            this.evictOldest();
        }

        const expiry = ttl > 0 ? Date.now() + (ttl * 1000) : null;

        this.store.set(key, {
            value,
            expiry
        });
    }

    /**
     * Delete a value from the cache
     * @param key - Cache key
     */
    async del(key: string): Promise<void> {
        this.store.delete(key);
    }

    /**
     * Clear the entire cache
     */
    async clear(): Promise<void> {
        this.store.clear();
    }

    /**
     * Remove expired items from the cache
     */
    private cleanup(): void {
        const now = Date.now();

        for (const [key, item] of this.store.entries()) {
            if (item.expiry !== null && item.expiry < now) {
                this.store.delete(key);
            }
        }
    }

    /**
     * Evict the oldest items when cache is full
     */
    private evictOldest(): void {
        // Simple LRU-like approach: remove 20% of the oldest entries
        const itemsToRemove = Math.ceil(this.maxSize * 0.2);
        const keys = Array.from(this.store.keys());

        // Sort by time added (this is simplified; a real LRU would track actual usage)
        keys.slice(0, itemsToRemove).forEach(key => {
            this.store.delete(key);
        });
    }

    /**
     * Stop the cleanup interval when no longer needed
     */
    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
}

// Create a singleton instance
export const cache = new Cache();

// For server-side environments, ensure cleanup
if (typeof window === 'undefined') {
    // In Node.js environment, handle cleanup when process exits
    process.on('beforeExit', () => {
        cache.destroy();
    });
}