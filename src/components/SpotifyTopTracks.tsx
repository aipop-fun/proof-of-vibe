"use client";

import { useState, useEffect } from 'react';
import { useAuthStore } from '~/lib/stores/authStore';
import Image from 'next/image';

type TimeRange = 'short_term' | 'medium_term' | 'long_term';

// Component for displaying a user's top tracks from Spotify
export function SpotifyTopTracks() {
    // Access Zustand store
    const { 
        topTracks, 
        isLoadingTracks, 
        fetchTopTracks, 
        isAuthenticated, 
        spotifyId,
        isExpired,
        error
    } = useAuthStore();
    
    // Track selected time range locally
    const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('medium_term');
    
    // Toggle for showing more tracks
    const [isExpanded, setIsExpanded] = useState(false);

    // User-friendly labels for time ranges
    const timeRangeLabels = {
        short_term: 'Last 4 Weeks',
        medium_term: 'Last 6 Months',
        long_term: 'All Time'
    };

    // Fetch top tracks for the selected time range on component mount and when dependencies change
    useEffect(() => {
        if (isAuthenticated && spotifyId && !isExpired() && topTracks[selectedTimeRange].length === 0) {
            fetchTopTracks(selectedTimeRange);
        }
    }, [isAuthenticated, spotifyId, selectedTimeRange, fetchTopTracks, isExpired, topTracks]);

    // Handler for changing time range
    const handleTimeRangeChange = (timeRange: TimeRange) => {
        setSelectedTimeRange(timeRange);
        
        // Only fetch if we don't already have data for this time range
        if (topTracks[timeRange].length === 0 && !isLoadingTracks[timeRange]) {
            fetchTopTracks(timeRange);
        }
    };

    // Toggle expanded view
    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    // Handle refresh data
    const handleRefresh = () => {
        fetchTopTracks(selectedTimeRange);
    };

    // If not authenticated with Spotify, don't show anything
    if (!isAuthenticated || !spotifyId) {
        return null;
    }

    // If loading, show a loading skeleton
    if (isLoadingTracks[selectedTimeRange]) {
        return (
            <div className="mt-3 space-y-2">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-medium">Your Top Tracks</h3>
                </div>
                
                <div className="flex space-x-2 mb-3 text-xs">
                    {Object.entries(timeRangeLabels).map(([range]) => (
                        <div
                            key={range}
                            className={`px-2 py-1 rounded ${
                                selectedTimeRange === range 
                                    ? 'bg-purple-700 text-white' 
                                    : 'bg-purple-900/50 text-gray-300'
                            }`}
                        >
                            {timeRangeLabels[range as TimeRange]}
                        </div>
                    ))}
                </div>
                
                {/* Loading skeleton */}
                <div className="animate-pulse space-y-2">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-14 bg-purple-800/20 rounded-md"></div>
                    ))}
                </div>
            </div>
        );
    }

    const tracksToShow = topTracks[selectedTimeRange] || [];

    // If no tracks available
    if (tracksToShow.length === 0) {
        return (
            <div className="mt-3">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-medium">Your Top Tracks</h3>
                </div>
                
                <div className="flex space-x-2 mb-3 text-xs">
                    {Object.entries(timeRangeLabels).map(([range, label]) => (
                        <button
                            key={range}
                            className={`px-2 py-1 rounded ${
                                selectedTimeRange === range 
                                    ? 'bg-purple-700 text-white' 
                                    : 'bg-purple-900/50 text-gray-300 hover:bg-purple-800/50'
                            }`}
                            onClick={() => handleTimeRangeChange(range as TimeRange)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                
                <div className="text-center text-gray-400 p-4 bg-purple-900/20 rounded-md">
                    <p>No top tracks available for this time period</p>
                    <button 
                        onClick={handleRefresh}
                        className="mt-2 text-sm text-purple-400 hover:text-purple-300"
                    >
                        Refresh data
                    </button>
                </div>
            </div>
        );
    }

    // Display tracks
    return (
        <div className="mt-3">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-medium">Your Top Tracks</h3>
                <div className="flex space-x-2">
                    <button 
                        onClick={handleRefresh}
                        className="text-xs text-purple-400 hover:text-purple-300"
                    >
                        Refresh
                    </button>
                    <button 
                        onClick={toggleExpanded} 
                        className="text-xs text-purple-400 hover:text-purple-300"
                    >
                        {isExpanded ? 'Show Less' : 'Show More'}
                    </button>
                </div>
            </div>
            
            {/* Time range selector */}
            <div className="flex space-x-2 mb-3 text-xs">
                {Object.entries(timeRangeLabels).map(([range, label]) => (
                    <button
                        key={range}
                        className={`px-2 py-1 rounded ${
                            selectedTimeRange === range 
                                ? 'bg-purple-700 text-white' 
                                : 'bg-purple-900/50 text-gray-300 hover:bg-purple-800/50'
                        }`}
                        onClick={() => handleTimeRangeChange(range as TimeRange)}
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
            
            {/* Tracks list */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {tracksToShow.slice(0, isExpanded ? undefined : 5).map((track) => (
                    <div key={track.id} className="flex items-center p-2 bg-purple-900/30 rounded">
                        {track.coverArt && (
                            <div className="relative w-10 h-10 mr-3 flex-shrink-0">
                                <Image
                                    src={track.coverArt}
                                    alt={track.title}
                                    className="rounded"
                                    fill
                                    sizes="40px"
                                    style={{ objectFit: 'cover' }}
                                />
                            </div>
                        )}
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
                ))}
            </div>
        </div>
    );
}