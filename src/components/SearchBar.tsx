"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "./ui/input";

interface SearchBarProps {
    onSearch: (query: string) => void;
    placeholder?: string;
    initialValue?: string;
    className?: string;
}

export function SearchBar({
    onSearch,
    placeholder = "Search...",
    initialValue = "",
    className = ""
}: SearchBarProps) {
    const [searchQuery, setSearchQuery] = useState<string>(initialValue);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // Clear existing timeout if any
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        // Debounce search to avoid excessive processing
        searchTimeout.current = setTimeout(() => {
            onSearch(searchQuery);
        }, 300);

        // Cleanup on unmount
        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
        };
    }, [searchQuery, onSearch]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch(searchQuery);
    };

    const handleReset = () => {
        setSearchQuery("");
        onSearch("");
    };

    return (
        <form onSubmit={handleSubmit} className={`relative ${className}`}>
            <Input
                type="text"
                value={searchQuery}
                onChange={handleChange}
                placeholder={placeholder}
                className="w-full bg-purple-900/30 border-purple-700/50 text-gray-200 placeholder-gray-400"
            />
            {searchQuery && (
                <button
                    type="button"
                    onClick={handleReset}
                    className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                    ✕
                </button>
            )}
            <button
                type="submit"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
            >
                🔍
            </button>
        </form>
    );
}