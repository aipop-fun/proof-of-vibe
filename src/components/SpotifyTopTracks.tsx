/* eslint-disable react-hooks/exhaustive-deps, @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from 'react';
import { useAuthStore } from '~/lib/stores/authStore';
import { SpotifyImage } from './SpotifyImage';
import { useFrame } from './providers/FrameProvider';
import sdk from "@farcaster/frame-sdk";

type TimeRange = 'short_term' | 'medium_term' | 'long_term';

export function SpotifyTopTracks() {
    const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('medium_term');
    const [isExpanded, setIsExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { isMiniApp } = useFrame();

    // Access Zustand state
    const {
        topTracks,
        isLoadingTracks,
        fetchTopTracks,
        isAuthenticated,
        spotifyId,
        isExpired,
        accessToken
    } = useAuthStore();

    // Friendly labels for time periods
    const timeRangeLabels = {
        short_term: 'Last 4 Weeks',
        medium_term: 'Last 6 Months',
        long_term: 'All Time'
    };

    // Fetch top tracks when component mounts or dependencies change
    useEffect(() => {
        if (isAuthenticated && accessToken && !isExpired() &&
            topTracks[selectedTimeRange].length === 0 &&
            !isLoadingTracks[selectedTimeRange]) {
            fetchTopTracks(selectedTimeRange);
        }
    }, [selectedTimeRange, accessToken, isAuthenticated, isExpired, fetchTopTracks, topTracks, isLoadingTracks]);

    // Handler for changing the time period
    const handleTimeRangeChange = (timeRange: TimeRange) => {
        setSelectedTimeRange(timeRange);

        // Fetch data if not already loaded
        if (topTracks[timeRange].length === 0 && !isLoadingTracks[timeRange]) {
            fetchTopTracks(timeRange);
        }
    };

    // Toggle expanded view
    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    // Handler for refreshing
    const handleRefresh = () => {
        fetchTopTracks(selectedTimeRange);
    };

    // Handler for sharing top tracks
    const handleShareTopTracks = () => {
        if (topTracks[selectedTimeRange].length === 0) return;

        // Create the share URL
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const shareUrl = `${baseUrl}/results?type=top-tracks&timeRange=${selectedTimeRange}`;

        // Share message based on time range
        const timeRangeText = timeRangeLabels[selectedTimeRange];
        const shareMessage = `🎵 Check out my top tracks from ${timeRangeText} on Proof of Vibes!`;

        // Determine the appropriate sharing method based on context
        if (isMiniApp && typeof sdk?.actions?.composeCast === 'function') {
            // When in Farcaster mini app, use composeCast
            sdk.actions.composeCast({
                text: shareMessage,
                embeds: [shareUrl]
            });
        } else {
            // On web, open in a new tab
            window.open(shareUrl, '_blank');
        }
    };

    const tracksToShow = topTracks[selectedTimeRange] || [];

    return (
        <div className="mt-3">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-medium">Your Top Tracks</h3>
                <div className="flex space-x-2">
                    <button
                        onClick={handleShareTopTracks}
                        className="text-xs text-purple-400 hover:text-purple-300"
                        disabled={isLoadingTracks[selectedTimeRange] || tracksToShow.length === 0}
                    >
                        Share
                    </button>
                    <button
                        onClick={handleRefresh}
                        className="text-xs text-purple-400 hover:text-purple-300"
                        disabled={isLoadingTracks[selectedTimeRange]}
                    >
                        {isLoadingTracks[selectedTimeRange] ? 'Loading...' : 'Refresh'}
                    </button>
                    <button
                        onClick={toggleExpanded}
                        className="text-xs text-purple-400 hover:text-purple-300"
                    >
                        {isExpanded ? 'Show Less' : 'Show More'}
                    </button>
                </div>
            </div>

            {/* Time period selector */}
            <div className="flex space-x-2 mb-3 text-xs">
                {Object.entries(timeRangeLabels).map(([range, label]) => (
                    <button
                        key={range}
                        className={`px-2 py-1 rounded ${selectedTimeRange === range
                            ? 'bg-purple-700 text-white'
                            : 'bg-purple-900/50 text-gray-300 hover:bg-purple-800/50'
                            }`}
                        onClick={() => handleTimeRangeChange(range as TimeRange)}
                        disabled={isLoadingTracks[range as TimeRange]}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Error display */}
            {error && (
                <div className="mb-3 p-2 text-sm bg-red-900/30 text-red-200 rounded-md">
                    {error}
                </div>
            )}

            {/* Loading state */}
            {isLoadingTracks[selectedTimeRange] ? (
                <div className="animate-pulse space-y-2">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-14 bg-purple-800/20 rounded-md"></div>
                    ))}
                </div>
            ) : (
                /* Track list */
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {tracksToShow.length === 0 ? (
                        <div className="text-center text-gray-400 p-4">
                            <p>No tracks found for this period</p>
                            <button
                                onClick={() => fetchTopTracks(selectedTimeRange)}
                                className="mt-2 text-sm text-purple-400 hover:text-purple-300"
                            >
                                Try again
                            </button>
                        </div>
                    ) : (
                        tracksToShow.slice(0, isExpanded ? undefined : 5).map((track) => (
                            <div key={track.id} className="flex items-center p-2 bg-purple-900/30 rounded">
                                <div className="relative w-10 h-10 mr-3 flex-shrink-0">
                                    <SpotifyImage
                                        src={track.coverArt || '/api/placeholder/60/60'}
                                        alt={track.title}
                                        className="rounded"
                                        fill
                                        sizes="40px"
                                        style={{ objectFit: 'cover' }}
                                    />
                                </div>
                                <div className="min-w-0 flex-grow">
                                    <p className="font-medium text-sm truncate">{track.title}</p>
                                    <p className="text-xs text-gray-300 truncate">{track.artist}</p>
                                </div>
                                {track.popularity !== undefined && (
                                    <div className="text-xs text-gray-400 ml-2">
                                        {track.popularity}%
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}