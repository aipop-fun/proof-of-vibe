/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
"use client";

import { useCallback, useRef, useMemo, useEffect, useState } from 'react';
import { z } from 'zod';

const PerformanceConfigSchema = z.object({
    debounceMs: z.number().default(300),
    throttleMs: z.number().default(100),
    enableVirtualization: z.boolean().default(false),
    itemHeight: z.number().default(60),
    overscan: z.number().default(5),
});

type PerformanceConfig = z.infer<typeof PerformanceConfigSchema>;

export const usePerformance = (config: Partial<PerformanceConfig> = {}) => {
    const { debounceMs = 300, throttleMs = 100 } = config;

    // Debounce hook
    const useDebounce = <T extends unknown[]>(
        callback: (...args: T) => void,
        delay: number = debounceMs
    ) => {
        const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

        return useCallback((...args: T) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                callback(...args);
            }, delay);
        }, [callback, delay]);
    };

    // Throttle hook
    const useThrottle = <T extends unknown[]>(
        callback: (...args: T) => void,
        delay: number = throttleMs
    ) => {
        const lastCall = useRef<number>(0);
        const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

        return useCallback((...args: T) => {
            const now = Date.now();

            if (now - lastCall.current >= delay) {
                lastCall.current = now;
                callback(...args);
            } else {
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }

                timeoutRef.current = setTimeout(() => {
                    lastCall.current = Date.now();
                    callback(...args);
                }, delay - (now - lastCall.current));
            }
        }, [callback, delay]);
    };

    // Memoized selector
    const useSelector = <T, R>(
        source: T,
        selector: (source: T) => R,
        dependencies: unknown[] = []
    ): R => {
        return useMemo(() => selector(source), [source, ...dependencies]);
    };

    // Virtual list hook for large datasets
    const useVirtualList = <T>(
        items: T[],
        containerHeight: number,
        itemHeight: number = config.itemHeight || 60,
        overscan: number = config.overscan || 5
    ) => {
        const [scrollTop, setScrollTop] = useState(0);

        const visibleRange = useMemo(() => {
            const start = Math.floor(scrollTop / itemHeight);
            const visibleCount = Math.ceil(containerHeight / itemHeight);
            const end = start + visibleCount;

            return {
                start: Math.max(0, start - overscan),
                end: Math.min(items.length, end + overscan),
            };
        }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

        const visibleItems = useMemo(() => {
            return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
                item,
                index: visibleRange.start + index,
                style: {
                    position: 'absolute' as const,
                    top: (visibleRange.start + index) * itemHeight,
                    height: itemHeight,
                    width: '100%',
                },
            }));
        }, [items, visibleRange, itemHeight]);

        const totalHeight = items.length * itemHeight;

        return {
            visibleItems,
            totalHeight,
            setScrollTop,
            visibleRange,
        };
    };

    // Intersection observer for lazy loading
    const useIntersectionObserver = (
        callback: () => void,
        options: IntersectionObserverInit = {}
    ) => {
        const targetRef = useRef<HTMLElement | null>(null);
        const observerRef = useRef<IntersectionObserver | null>(null);

        useEffect(() => {
            if (!targetRef.current) return;

            observerRef.current = new IntersectionObserver(([entry]) => {
                if (entry.isIntersecting) {
                    callback();
                }
            }, options);

            observerRef.current.observe(targetRef.current);

            return () => {
                if (observerRef.current) {
                    observerRef.current.disconnect();
                }
            };
        }, [callback, options]);

        return targetRef;
    };

    return {
        useDebounce,
        useThrottle,
        useSelector,
        useVirtualList,
        useIntersectionObserver,
    };
};