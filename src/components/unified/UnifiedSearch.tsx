/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use client";

import React, { useState, useCallback } from 'react';
import { z } from 'zod';
import { SearchBar } from '../SearchBar';
import { UserCard } from '../UserCard';
import { MusicBase } from '../music/MusicBase';
import { LoadingState } from '../ui/LoadingStates';
import { useNavigation, useValidation } from '~/lib/hooks/useCommon';
import { FarcasterUserSchema, TrackSchema } from '~/lib/schemas';
import { usePerformance } from '~/lib/hooks/usePerformance';

const UnifiedSearchPropsSchema = z.object({
    searchTypes: z.array(z.enum(['users', 'tracks', 'both'])).default(['both']),
    placeholder: z.string().default('Search users and music...'),
    maxResults: z.number().default(20),
    enableFilters: z.boolean().default(true),
    onResultSelect: z.function().optional(),
    className: z.string().optional(),
});

type SearchResult = {
    users: z.infer<typeof FarcasterUserSchema>[];
    tracks: z.infer<typeof TrackSchema>[];
    total: number;
    hasMore: boolean;
};

type UnifiedSearchProps = z.infer<typeof UnifiedSearchPropsSchema>;

export const UnifiedSearch: React.FC<UnifiedSearchProps> = (props) => {
    const { validateAndParse } = useValidation();
    const { viewProfile, openSpotify } = useNavigation();

    // All hooks must be called before any conditional logic
    const [results, setResults] = useState<SearchResult | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'users' | 'tracks'>('all');
    const [filters, setFilters] = useState({
        hasSpotify: false,
        verified: false,
        timeRange: 'all' as const,
    });
    const { useDebounce } = usePerformance();

    const debouncedPerformSearch = useDebounce(performSearch, 300);

    const handleUserSelect = useCallback((user: z.infer<typeof FarcasterUserSchema>) => {
        const validatedProps = validateAndParse(UnifiedSearchPropsSchema, props);
        if (!validatedProps) return;

        if (validatedProps.onResultSelect) {
            validatedProps.onResultSelect({ type: 'user', data: user });
        } else {
            viewProfile(user.fid);
        }
    }, [props, viewProfile, validateAndParse]);

    const handleTrackSelect = useCallback((track: z.infer<typeof TrackSchema>) => {
        const validatedProps = validateAndParse(UnifiedSearchPropsSchema, props);
        if (!validatedProps) return;

        if (validatedProps.onResultSelect) {
            validatedProps.onResultSelect({ type: 'track', data: track });
        } else {
            openSpotify(track.uri, `${track.title} ${track.artist}`);
        }
    }, [props, openSpotify, validateAndParse]);

    // Now validate props after all hooks are called
    const validatedProps = validateAndParse(UnifiedSearchPropsSchema, props);
    if (!validatedProps) return null;

    const { searchTypes, placeholder, maxResults, enableFilters, className = '' } = validatedProps;

    const filteredResults = results ? {
        users: activeTab === 'tracks' ? [] :
            filters.verified ? results.users.filter(u => u.verifiedAddresses?.eth_addresses.length || u.verifiedAddresses?.sol_addresses.length) :
                results.users,
        tracks: activeTab === 'users' ? [] : results.tracks,
    } : null;

    const renderFilters = () => {
        if (!enableFilters) return null;

        return (
            <div className="flex gap-2 mb-4 text-xs">
                <button
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-1 rounded ${activeTab === 'all' ? 'bg-purple-600' : 'bg-purple-900/50'}`}
                >
                    All
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-3 py-1 rounded ${activeTab === 'users' ? 'bg-purple-600' : 'bg-purple-900/50'}`}
                >
                    Users ({results?.users.length || 0})
                </button>
                <button
                    onClick={() => setActiveTab('tracks')}
                    className={`px-3 py-1 rounded ${activeTab === 'tracks' ? 'bg-purple-600' : 'bg-purple-900/50'}`}
                >
                    Tracks ({results?.tracks.length || 0})
                </button>

                <div className="ml-auto flex gap-2">
                    <button
                        onClick={() => setFilters(prev => ({ ...prev, hasSpotify: !prev.hasSpotify }))}
                        className={`px-2 py-1 rounded text-xs ${filters.hasSpotify ? 'bg-green-600' : 'bg-gray-600'}`}
                    >
                        Spotify Only
                    </button>
                    <button
                        onClick={() => setFilters(prev => ({ ...prev, verified: !prev.verified }))}
                        className={`px-2 py-1 rounded text-xs ${filters.verified ? 'bg-blue-600' : 'bg-gray-600'}`}
                    >
                        Verified
                    </button>
                </div>
            </div>
        );
    };

    const renderResults = () => {
        if (isSearching) {
            return <LoadingState variant="user" count={3} message="Searching..." />;
        }

        if (!filteredResults || filteredResults.users.length === 0 && filteredResults.tracks.length === 0) {
            return (
                <div className="text-center py-8 text-gray-400">
                    {results ? 'No results found' : 'Start typing to search'}
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {filteredResults.users.length > 0 && (
                    <div>
                        {activeTab === 'all' && <h3 className="font-medium mb-2">Users</h3>}
                        <div className="space-y-2">
                            {filteredResults.users.map(user => (
                                <UserCard
                                    key={user.fid}
                                    user={user}
                                    variant="compact"
                                    onUserClick={() => handleUserSelect(user)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {filteredResults.tracks.length > 0 && (
                    <div>
                        {activeTab === 'all' && <h3 className="font-medium mb-2">Tracks</h3>}
                        <MusicBase
                            tracks={filteredResults.tracks}
                            title=""
                            variant="compact"
                            onTrackClick={handleTrackSelect}
                        />
                    </div>
                )}

                {results?.hasMore && (
                    <div className="text-center text-xs text-gray-400">
                        Showing first {maxResults} results. Try a more specific search.
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={`space-y-4 ${className}`}>
            <SearchBar
                onSearch={debouncedPerformSearch} 
                placeholder={placeholder}
                isLoading={isSearching}
            />

            {renderFilters()}
            {renderResults()}
        </div>
    );
};