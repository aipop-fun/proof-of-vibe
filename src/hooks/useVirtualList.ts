/* eslint-disable @typescript-eslint/ban-ts-comment*/
// @ts-nocheck

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { throttle } from 'lodash';

interface VirtualListOptions {
  itemHeight: number; 
  overscan?: number;
  initialScrollTop?: number;
  onScrollEnd?: () => void;
  scrollEndThreshold?: number;
}

interface VirtualListResult<T> {
  virtualItems: {
    item: T;
    index: number;
    offsetTop: number;
  }[];
  totalHeight: number;
  startIndex: number;
  endIndex: number;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  isScrolling: boolean;
  onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
  scrollToTop: (behavior?: ScrollBehavior) => void;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}

export function useVirtualList<T>(
  items: T[],
  options: VirtualListOptions
): VirtualListResult<T> {
  const {
    itemHeight,
    overscan = 3,
    initialScrollTop = 0,
    onScrollEnd,
    scrollEndThreshold = 200,
  } = options;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(initialScrollTop);
  const [containerHeight, setContainerHeight] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Set up resize observer to track container height changes
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    setContainerHeight(scrollContainerRef.current.clientHeight);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === scrollContainerRef.current) {
          setContainerHeight(entry.contentRect.height);
        }
      }
    });

    resizeObserver.observe(scrollContainerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Handle scrolling state with debounce to prevent rapid toggles
  const handleScrollState = useCallback(() => {
    setIsScrolling(true);
    
    if (scrollingTimeoutRef.current) {
      clearTimeout(scrollingTimeoutRef.current);
    }
    
    scrollingTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, []);

  // Throttled scroll handler to prevent too many state updates
  const handleScroll = useMemo(() => throttle((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setScrollTop(scrollTop);
    handleScrollState();
    
    // Check if we're near the bottom to trigger onScrollEnd callback
    if (onScrollEnd) {
      const { scrollHeight, scrollTop: currentScrollTop, clientHeight } = e.currentTarget;
      if (scrollHeight - (currentScrollTop + clientHeight) < scrollEndThreshold) {
        onScrollEnd();
      }
    }
  }, 50), [handleScrollState, onScrollEnd, scrollEndThreshold]);

  // Cleanup throttle on unmount
  useEffect(() => {
    return () => {
      handleScroll.cancel();
      if (scrollingTimeoutRef.current) {
        clearTimeout(scrollingTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  // Calculate which items to render
  const { virtualItems, startIndex, endIndex, totalHeight } = useMemo(() => {
    const totalHeight = items.length * itemHeight;

    // Calculate visible range with overscan
    const visibleStartIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleEndIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    // Create virtual items with metadata
    const virtualItems = items
      .slice(visibleStartIndex, visibleEndIndex + 1)
      .map((item, index) => {
        const virtualIndex = visibleStartIndex + index;
        return {
          item,
          index: virtualIndex,
          offsetTop: virtualIndex * itemHeight,
        };
      });

    return {
      virtualItems,
      startIndex: visibleStartIndex,
      endIndex: visibleEndIndex,
      totalHeight,
    };
  }, [items, itemHeight, scrollTop, containerHeight, overscan]);

  // Helper functions to scroll to specific positions
  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = 'auto') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: Math.max(0, index * itemHeight),
        behavior,
      });
    }
  }, [itemHeight]);

  const scrollToTop = useCallback((behavior: ScrollBehavior = 'auto') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior });
    }
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: totalHeight,
        behavior,
      });
    }
  }, [totalHeight]);

  return {
    virtualItems,
    totalHeight,
    startIndex,
    endIndex,
    scrollContainerRef,
    isScrolling,
    onScroll: handleScroll,
    scrollToIndex,
    scrollToTop,
    scrollToBottom,
  };
}