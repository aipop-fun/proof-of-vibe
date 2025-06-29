/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/rules-of-hooks  */

"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { z } from 'zod';
import { SearchBar } from '../SearchBar';
import { UserCard } from '../UserCard';
import { MusicBase } from '../music/MusicBase';
import { LoadingState } from '../ui/LoadingStates';
import { useNavigation, useValidation } from '~/lib/hooks/useCommon';
import { FarcasterUserSchema, TrackSchema } from '~/lib/schemas';

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

    // All state declarations first
    const [results, setResults] = useState<SearchResult | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'users' | 'tracks'>('all');
    const [filters, setFilters] = useState({
        hasSpotify: false,
        verified: false,
        timeRange: 'all' as const,
    });

    // Validate props early
    const validatedProps = useMemo(() =>
        validateAndParse(UnifiedSearchPropsSchema, props),
        [props, validateAndParse]
    );

    // FIXED: Define performSearch function properly with all dependencies
    const performSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            setResults(null);
            return;
        }

        if (!validatedProps) {
            console.error('Invalid props for UnifiedSearch');
            return;
        }

        setIsSearching(true);

        try {
            const { searchTypes = ['both'], maxResults } = validatedProps;
            
            const searchUsers = searchTypes.includes('users') || searchTypes.includes('both');
            const searchTracks = searchTypes.includes('tracks') || searchTypes.includes('both');

            const [usersResponse, tracksResponse] = await Promise.allSettled([
                searchUsers ?
                    fetch(`/api/search/users?q=${encodeURIComponent(query)}&limit=${maxResults}&hasSpotify=${filters.hasSpotify}`)
                        .then(r => r.json())
                    : Promise.resolve({ users: [] }),
                searchTracks ?
                    fetch(`/api/search/tracks?q=${encodeURIComponent(query)}&limit=${maxResults}`)
                        .then(r => r.json())
                    : Promise.resolve({ tracks: [] })
            ]);

            const users = usersResponse.status === 'fulfilled' ? usersResponse.value.users || [] : [];
            const tracks = tracksResponse.status === 'fulfilled' ? tracksResponse.value.tracks || [] : [];

            const searchResult: SearchResult = {
                users: validateAndParse(z.array(FarcasterUserSchema), users) || [],
                tracks: validateAndParse(z.array(TrackSchema), tracks) || [],
                total: users.length + tracks.length,
                hasMore: users.length === maxResults || tracks.length === maxResults,
            };

            setResults(searchResult);
        } catch (error) {
            console.error('Search error:', error);
            setResults({ users: [], tracks: [], total: 0, hasMore: false });
        } finally {
            setIsSearching(false);
        }
    }, [validatedProps, filters, validateAndParse]); 

    const handleUserSelect = useCallback((user: z.infer<typeof FarcasterUserSchema>) => {
        if (!validatedProps) return;

        if (validatedProps.onResultSelect) {
            validatedProps.onResultSelect({ type: 'user', data: user });
        } else {
            viewProfile(user.fid);
        }
    }, [validatedProps, viewProfile]);

    const handleTrackSelect = useCallback((track: z.infer<typeof TrackSchema>) => {
        if (!validatedProps) return;

        if (validatedProps.onResultSelect) {
            validatedProps.onResultSelect({ type: 'track', data: track });
        } else {
            openSpotify(track.uri, `${track.title} ${track.artist}`);
        }
    }, [validatedProps, openSpotify]);
    
    if (!validatedProps) {
        console.error('UnifiedSearch: Invalid props provided');
        return null;
    }

    const { searchTypes, placeholder, maxResults, enableFilters, className = '' } = validatedProps;

    const filteredResults = useMemo(() => {
        if (!results) return null;

        return {
            users: activeTab === 'tracks' ? [] :
                filters.verified ?
                    results.users.filter(u =>
                        u.verifiedAddresses?.eth_addresses?.length ||
                        u.verifiedAddresses?.sol_addresses?.length
                    ) :
                    results.users,
            tracks: activeTab === 'users' ? [] : results.tracks,
            total: results.total,
            hasMore: results.hasMore
        };
    }, [results, activeTab, filters.verified]);

    const renderFilters = () => {
        if (!enableFilters) return null;

        return (
            <div className="flex gap-2 mb-4">
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-3 py-1 text-xs rounded ${activeTab === 'all' ? 'bg-purple-600' : 'bg-gray-600'}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-3 py-1 text-xs rounded ${activeTab === 'users' ? 'bg-purple-600' : 'bg-gray-600'}`}
                    >
                        Users
                    </button>
                    <button
                        onClick={() => setActiveTab('tracks')}
                        className={`px-3 py-1 text-xs rounded ${activeTab === 'tracks' ? 'bg-purple-600' : 'bg-gray-600'}`}
                    >
                        Tracks
                    </button>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilters(prev => ({ ...prev, hasSpotify: !prev.hasSpotify }))}
                        className={`px-3 py-1 text-xs rounded ${filters.hasSpotify ? 'bg-blue-600' : 'bg-gray-600'}`}
                    >
                        Has Spotify
                    </button>
                    <button
                        onClick={() => setFilters(prev => ({ ...prev, verified: !prev.verified }))}
                        className={`px-3 py-1 text-xs rounded ${filters.verified ? 'bg-blue-600' : 'bg-gray-600'}`}
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

        if (!filteredResults || (filteredResults.users.length === 0 && filteredResults.tracks.length === 0)) {
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
                                    onUserClick={() => handleUserSelect(user)} showActions={false}                                />
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
                            onTrackClick={(...args) => {
                                const track = args[0] as z.infer<typeof TrackSchema>;
                                handleTrackSelect(track);
                            } } showProgress={false}                        />
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
                onSearch={performSearch}
                placeholder={placeholder}
                isLoading={isSearching}
                debounceMs={300}
                minQueryLength={2}
            />

            {renderFilters()}
            {renderResults()}
        </div>
    );
};