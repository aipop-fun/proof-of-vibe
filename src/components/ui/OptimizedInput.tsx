"use client";

import React, { memo, useCallback } from 'react';
import { Input } from './input';
import { usePerformance } from '~/lib/hooks/usePerformance';

interface OptimizedInputProps extends React.ComponentProps<"input"> {
    onDebouncedChange?: (value: string) => void;
    debounceMs?: number;
}

export const OptimizedInput = memo<OptimizedInputProps>(({
    onDebouncedChange,
    debounceMs = 300,
    onChange,
    ...props
}) => {
    const { useDebounce } = usePerformance();

    const debouncedChange = useDebounce((value: string) => {
        onDebouncedChange?.(value);
    }, debounceMs);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onChange?.(e);
        debouncedChange(e.target.value);
    }, [onChange, debouncedChange]);

    return <Input {...props} onChange={handleChange} />;
});

OptimizedInput.displayName = 'OptimizedInput';