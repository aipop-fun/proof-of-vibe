/* eslint-disable  @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '~/lib/stores/authStore';
import { SpotifyImage } from './SpotifyImage';
import { useFrame } from './providers/FrameProvider';
import sdk from "@farcaster/frame-sdk";
import { TrackListSkeleton } from './SkeletonLoader';
import { TimeRange } from '~/lib/stores/authStore';

export function SpotifyTopTracks() {
    const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('medium_term');
    const [isExpanded, setIsExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const { isMiniApp } = useFrame();

    const {
        topTracks,
        isLoadingTracks,
        fetchTopTracks,
        isAuthenticated,
        spotifyId,
        accessToken,
        refreshTokenIfNeeded,
        isExpired
    } = useAuthStore();

    const timeRangeLabels: Record<TimeRange, string> = {
        short_term: 'Últimas 4 Semanas',
        medium_term: 'Últimos 6 Meses',
        long_term: 'Todo o Tempo'
    };


    const loadTopTracksData = useCallback(async (timeRange: TimeRange, forceRefresh = false) => {
        if (!isAuthenticated || !spotifyId || !accessToken) {
            console.log('Missing auth data for top tracks:', {
                isAuthenticated,
                spotifyId: !!spotifyId,
                accessToken: !!accessToken
            });
            return;
        }


        const hasData = topTracks[timeRange] && topTracks[timeRange].length > 0;
        if (hasData && !forceRefresh && !isLoadingTracks[timeRange]) {
            console.log(`Top tracks for ${timeRange} already loaded`);
            return;
        }

        setError(null);
        try {
            console.log(`Loading top tracks for ${timeRange} (Force: ${forceRefresh})...`);

            const tokenValid = await refreshTokenIfNeeded();
            if (!tokenValid) {
                throw new Error('Failed to refresh Spotify token');
            }

            await fetchTopTracks(timeRange);
            console.log(`Successfully loaded ${topTracks[timeRange]?.length || 0} tracks for ${timeRange}`);

        } catch (err) {
            console.error(`Error loading top tracks (${timeRange}):`, err);
            setError(err instanceof Error ? err.message : "Failed to load top tracks");
        }
    }, [isAuthenticated, spotifyId, accessToken, topTracks, isLoadingTracks, fetchTopTracks, refreshTokenIfNeeded]);

    
    useEffect(() => {
        if (isAuthenticated && spotifyId && accessToken && !isInitialized) {
            console.log('Initializing top tracks...');
            loadTopTracksData(selectedTimeRange).then(() => {
                setIsInitialized(true);
            });
        }
    }, [isAuthenticated, spotifyId, accessToken, selectedTimeRange, isInitialized, loadTopTracksData]);


    const handleTimeRangeChange = useCallback((timeRange: TimeRange) => {
        console.log(`Changing time range to: ${timeRange}`);
        setSelectedTimeRange(timeRange);


        const hasData = topTracks[timeRange] && topTracks[timeRange].length > 0;
        if (!hasData && !isLoadingTracks[timeRange]) {
            loadTopTracksData(timeRange);
        }
    }, [topTracks, isLoadingTracks, loadTopTracksData]);

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    const handleRefresh = async () => {
        if (isLoadingTracks[selectedTimeRange]) return;

        console.log(`Manually refreshing ${selectedTimeRange} tracks`);
        setError(null);
        await loadTopTracksData(selectedTimeRange, true);
    };

    const handleShareTopTracks = () => {
        const tracksToShow = topTracks[selectedTimeRange] || [];
        if (tracksToShow.length === 0) return;

        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const shareUrl = `${baseUrl}/results?type=top-tracks&timeRange=${selectedTimeRange}`;
        const timeRangeText = timeRangeLabels[selectedTimeRange];
        const shareMessage = `🎵 Check out my top tracks from "${timeRangeText}" on Timbra!`;

        if (isMiniApp && typeof sdk?.actions?.composeCast === 'function') {
            sdk.actions.composeCast({ text: shareMessage, embeds: [shareUrl] });
        } else {
            window.open(shareUrl, '_blank');
        }
    };


    if (!isAuthenticated || !spotifyId) {
        return null;
    }


    if (!accessToken || isExpired()) {
        return (
            <div className="mt-3 p-3 bg-red-900/30 border border-red-600/50 rounded">
                <p className="text-red-200 text-sm">
                    Spotify session expired. Please reconnect your account.
                </p>
            </div>
        );
    }

    const tracksToShow = topTracks[selectedTimeRange] || [];
    const isLoading = isLoadingTracks[selectedTimeRange];
    const hasData = tracksToShow.length > 0;

    return (
        <div className="mt-3">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-medium">Your Top Tracks</h3>
                <div className="flex space-x-2 text-xs">
                    <button
                        onClick={handleShareTopTracks}
                        className="text-purple-400 hover:text-purple-300"
                        disabled={isLoading || !hasData}
                        title={!hasData ? "No tracks to share" : "Share your top tracks"}
                    >
                        Share
                    </button>
                    <button
                        onClick={handleRefresh}
                        className="text-purple-400 hover:text-purple-300"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Loading...' : 'Refresh'}
                    </button>
                    {hasData && (
                        <button
                            onClick={toggleExpanded}
                            className="text-purple-400 hover:text-purple-300"
                        >
                            {isExpanded ? 'Show Less' : 'Show More'}
                        </button>
                    )}
                </div>
            </div>


            <div className="flex space-x-2 mb-3 text-xs overflow-x-auto">
                {Object.entries(timeRangeLabels).map(([range, label]) => (
                    <button
                        key={range}
                        className={`px-3 py-1 rounded whitespace-nowrap transition-colors ${selectedTimeRange === range
                                ? 'bg-purple-700 text-white'
                                : 'bg-purple-900/50 text-gray-300 hover:bg-purple-800/50'
                            }`}
                        onClick={() => handleTimeRangeChange(range as TimeRange)}
                        disabled={isLoadingTracks[range as TimeRange]}
                    >
                        {isLoadingTracks[range as TimeRange] ? 'Loading...' : label}
                    </button>
                ))}
            </div>

            
            {error && (
                <div className="mb-3 p-2 text-sm bg-red-900/30 text-red-200 rounded-md">
                    {error}
                    <button
                        onClick={() => {
                            setError(null);
                            handleRefresh();
                        }}
                        className="ml-2 text-red-300 hover:text-red-200 underline"
                    >
                        Try again
                    </button>
                </div>
            )}

            
            {isLoading ? (
                <TrackListSkeleton count={5} />
            ) : hasData ? (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {tracksToShow.slice(0, isExpanded ? undefined : 5).map((track, index) => (
                        <div
                            key={track.id}
                            className="flex items-center p-2 bg-purple-900/30 rounded hover:bg-purple-900/50 transition-colors"
                        >
                            <div className="w-6 text-center text-xs text-gray-400 mr-2">
                                {index + 1}
                            </div>
                            <div className="relative w-10 h-10 mr-3 flex-shrink-0">
                                <SpotifyImage
                                    src={track.coverArt || '/api/placeholder/40/40'}
                                    alt={track.title}
                                    className="rounded"
                                    width={40}
                                    height={40}
                                    style={{ objectFit: 'cover' }}
                                />
                            </div>
                            <div className="min-w-0 flex-grow">
                                <p className="font-medium text-sm truncate" title={track.title}>
                                    {track.title}
                                </p>
                                <p className="text-xs text-gray-300 truncate" title={track.artist}>
                                    {track.artist}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                {track.popularity !== undefined && (
                                    <span>{track.popularity}%</span>
                                )}
                                {track.uri && (
                                    <button
                                        onClick={() => track.uri && window.open(track.uri.replace('spotify:', 'https://open.spotify.com/'), '_blank')}
                                        className="text-green-400 hover:text-green-300"
                                        title="Open in Spotify"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.6 0-.359.24-.66.54-.78 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.242 1.021zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center text-gray-400 p-6">
                    <div className="w-12 h-12 bg-purple-800/30 rounded-full flex items-center justify-center mb-3 mx-auto">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 18V5l12-2v13" />
                            <circle cx="6" cy="18" r="3" />
                            <circle cx="18" cy="16" r="3" />
                        </svg>
                    </div>
                    <p className="text-sm mb-2">No tracks found for this period</p>
                    <p className="text-xs text-gray-500 mb-3">
                        Start listening to music on Spotify to build your top tracks
                    </p>
                    <button
                        onClick={handleRefresh}
                        className="text-sm text-purple-400 hover:text-purple-300"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Loading...' : 'Try again'}
                    </button>
                </div>
            )}
        </div>
    );
}