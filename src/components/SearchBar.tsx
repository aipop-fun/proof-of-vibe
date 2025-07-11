"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "./ui/input";

interface SearchBarProps {
    onSearch: (query: string) => void;
    placeholder?: string;
    initialValue?: string;
    className?: string;
    debounceMs?: number;
    minQueryLength?: number;
    isLoading?: boolean;
}

/**
 * SearchBar - An optimized search input component with debounce
 * 
 * @param onSearch - Callback function when search is performed
 * @param placeholder - Placeholder text for the input
 * @param initialValue - Initial search query
 * @param className - Additional CSS classes
 * @param debounceMs - Debounce delay in milliseconds
 * @param minQueryLength - Minimum query length to trigger search
 * @param isLoading - Loading state to display indicator
 */
export function SearchBar({
    onSearch,
    placeholder = "Search...",
    initialValue = "",
    className = "",
    debounceMs = 300,
    minQueryLength = 0,
    isLoading = false
}: SearchBarProps) {
    const [searchQuery, setSearchQuery] = useState<string>(initialValue);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const prevQuery = useRef<string>(initialValue);

    // Memoize the search query execution to improve performance
    const executeSearch = useCallback((query: string) => {
        // Skip search if query is shorter than minimum length (unless it's empty)
        if (query.length > 0 && query.length < minQueryLength) return;

        // Avoid duplicate searches
        if (query === prevQuery.current) return;

        // Execute search callback
        onSearch(query);
        prevQuery.current = query;
    }, [onSearch, minQueryLength]);

    // Debounce effect
    useEffect(() => {
        // Clear existing timeout if any
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        // Skip debounce for empty queries to clear results immediately
        if (searchQuery === "") {
            executeSearch("");
            return;
        }

        // Debounce search to avoid excessive processing
        searchTimeout.current = setTimeout(() => {
            executeSearch(searchQuery);
        }, debounceMs);

        // Cleanup on unmount or when dependencies change
        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
        };
    }, [searchQuery, executeSearch, debounceMs]);

    // Reset function that clears input and triggers search
    const handleReset = useCallback(() => {
        setSearchQuery("");
        prevQuery.current = "";
        executeSearch("");

        // Focus input after clearing
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [executeSearch]);

    // Handle input change
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    }, []);

    // Handle form submission
    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();

        // Clear any pending debounce
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
            searchTimeout.current = null;
        }

        // Execute search immediately
        executeSearch(searchQuery);

        // Remove focus from input
        if (inputRef.current) {
            inputRef.current.blur();
        }
    }, [searchQuery, executeSearch]);

    return (
        <form onSubmit={handleSubmit} className={`relative ${className}`}>
            <Input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={handleChange}
                placeholder={placeholder}
                className={`w-full bg-purple-900/30 border-purple-700/50 text-gray-200 placeholder-gray-400 ${isLoading ? 'pr-16' : 'pr-12'}`}
                aria-label={placeholder}
                disabled={isLoading}
            />

            {/* Show clear button when there's text */}
            {searchQuery && (
                <button
                    type="button"
                    onClick={handleReset}
                    className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 focus:outline-none focus:text-white p-1"
                    aria-label="Clear search"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            )}

            {/* Search button or loading spinner */}
            <button
                type="submit"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 focus:outline-none focus:text-white p-1"
                aria-label="Search"
                disabled={isLoading}
            >
                {isLoading ? (
                    <div className="animate-spin h-4 w-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M12 6v2"></path>
                        </svg>
                    </div>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                )}
            </button>
        </form>
    );
}