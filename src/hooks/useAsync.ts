/* eslint-disable  @typescript-eslint/no-explicit-any, prefer-const,  react-hooks/exhaustive-deps*/

import { useState, useCallback, useRef, useEffect } from 'react';
import { debounce, throttle } from 'lodash';

type AsyncStatus = 'idle' | 'pending' | 'success' | 'error';
type AsyncConfig = {
  delay?: number;
  useDebounce?: boolean;
  useThrottle?: boolean;
  abortPrevious?: boolean;
  initialData?: any;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
};

/**
 * Enhanced hook for handling async operations with debounce/throttle capabilities
 * and support for cancellation
 */
export function useAsync<T, Args extends any[] = any[]>(
  asyncFunction: (...args: Args) => Promise<T>,
  config: AsyncConfig = {}
) {
  const {
    delay = 300,
    useDebounce = false,
    useThrottle = false,
    abortPrevious = true,
    initialData = null,
    onSuccess,
    onError,
  } = config;

  // State management
  const [status, setStatus] = useState<AsyncStatus>('idle');
  const [data, setData] = useState<T | null>(initialData);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMounted = useRef(true);

  // Make sure components don't update if they're unmounted
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Core execute function
  const executeCore = useCallback(async (...args: Args) => {
    // Abort previous request if needed
    if (abortPrevious && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setStatus('pending');
      setError(null);

      // Add abort signal to the last argument if it's an object
      let adjustedArgs = [...args] as Args;
      const lastArg = args[args.length - 1];
      
      if (typeof lastArg === 'object' && lastArg !== null) {
        adjustedArgs[args.length - 1] = {
          ...lastArg,
          signal: abortController.signal,
        };
      }

      const result = await asyncFunction(...adjustedArgs);
      
      if (isMounted.current && !abortController.signal.aborted) {
        setData(result);
        setStatus('success');
        if (onSuccess) onSuccess(result);
      }
      
      return result;
    } catch (error) {
      if (isMounted.current && !abortController.signal.aborted) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        setError(errorObj);
        setStatus('error');
        if (onError) onError(errorObj);
      }
      throw error;
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [asyncFunction, abortPrevious, onSuccess, onError]);

  // Apply debounce or throttle if needed
  const execute = useCallback(
    (() => {
      if (useDebounce) {
        return debounce(executeCore, delay);
      }
      if (useThrottle) {
        return throttle(executeCore, delay);
      }
      return executeCore;
    })(),
    [executeCore, useDebounce, useThrottle, delay]
  );

  // Clean up debounced/throttled functions
  useEffect(() => {
    return () => {
      if (useDebounce || useThrottle) {
        (execute as any).cancel?.();
      }
    };
  }, [execute, useDebounce, useThrottle]);

  // Method to reset the state to initial
  const reset = useCallback(() => {
    setStatus('idle');
    setData(initialData);
    setError(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, [initialData]);

  // Method to manually abort current request
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setStatus('idle');
    }
  }, []);

  return {
    execute,
    abort,
    reset,
    status,
    data,
    error,
    isIdle: status === 'idle',
    isLoading: status === 'pending',
    isSuccess: status === 'success',
    isError: status === 'error',
  };
}