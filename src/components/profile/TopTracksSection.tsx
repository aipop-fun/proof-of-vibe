/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from 'react';
import { SpotifyImage } from '~/components/SpotifyImage';
import { Button } from '~/components/ui/Button';
import { useFrame } from '~/components/providers/FrameProvider';
import sdk from '@farcaster/frame-sdk';

export interface UserTrack {
    id: string;
    title: string;
    artist: string;
    album?: string;
    coverArt?: string;
    popularity?: number;
    uri?: string;
    duration?: string;
    currentTime?: string;
    isPlaying?: boolean;
    timestamp?: number;
}

export type TimeRange = 'short_term' | 'medium_term' | 'long_term';

interface TopTracksSectionProps {
    tracks: UserTrack[];
    timeRange: TimeRange;
    onTrackClick: (track: UserTrack) => void;
    onTimeRangeChange?: (timeRange: TimeRange) => void;
    onShare?: (tracks: UserTrack[], timeRange: TimeRange) => void;
    isLoading?: boolean;
    className?: string;
}

export const TopTracksSection: React.FC<TopTracksSectionProps> = ({
    tracks,
    timeRange,
    onTrackClick,
    onTimeRangeChange,
    onShare,
    isLoading = false,
    className = ""
}) => {
    const [showAll, setShowAll] = useState(false);
    const { isMiniApp } = useFrame();

    const getTimeRangeLabel = (range: TimeRange) => {
        switch (range) {
            case 'short_term': return 'Last 4 Weeks';
            case 'medium_term': return 'Last 6 Months';
            case 'long_term': return 'All Time';
            default: return 'Top Tracks';
        }
    };

    const handleTrackClick = (track: UserTrack) => {
        onTrackClick(track);
    };

    const handleOpenInSpotify = (track: UserTrack, e: React.MouseEvent) => {
        e.stopPropagation();

        let spotifyUrl = '';
        if (track.uri) {
            spotifyUrl = track.uri.replace('spotify:', 'https://open.spotify.com/');
        } else {
            spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(`${track.title} ${track.artist}`)}`;
        }

        if (isMiniApp && typeof sdk?.actions?.openUrl === 'function') {
            sdk.actions.openUrl(spotifyUrl);
        } else {
            window.open(spotifyUrl, '_blank');
        }
    };

    const handleShare = () => {
        if (onShare) {
            onShare(tracks, timeRange);
        } else {
            // Default share behavior
            const trackList = tracks.slice(0, 5).map((track, index) =>
                `${index + 1}. ${track.title} by ${track.artist}`
            ).join('\n');

            const message = `🎵 My top tracks (${getTimeRangeLabel(timeRange)}):\n\n${trackList}\n\nCheck out Timbra to see what I'm listening to!`;
            const url = process.env.NEXT_PUBLIC_URL || "https://timbra.app";

            if (isMiniApp && typeof sdk?.actions?.composeCast === 'function') {
                sdk.actions.composeCast({
                    text: message,
                    embeds: [url]
                });
            } else {
                window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent(message)}&embeds=${encodeURIComponent(url)}`, '_blank');
            }
        }
    };

    const tracksToShow = showAll ? tracks : tracks.slice(0, 5);

    if (isLoading) {
        return (
            <div className={`bg-purple-800/20 rounded-lg p-4 ${className}`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium">Top Tracks</h3>
                </div>
                <div className="space-y-3">
                    {Array(5).fill(0).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded animate-pulse">
                            <div className="w-8 text-center font-medium text-gray-400">
                                {i + 1}
                            </div>
                            <div className="w-10 h-10 bg-purple-700/50 rounded"></div>
                            <div className="flex-1 min-w-0">
                                <div className="h-4 bg-purple-700/50 rounded w-3/4 mb-1"></div>
                                <div className="h-3 bg-purple-700/30 rounded w-1/2"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (tracks.length === 0) {
        return (
            <div className={`bg-purple-800/20 rounded-lg p-6 text-center ${className}`}>
                <div className="w-12 h-12 bg-purple-700/30 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18V5l12-2v13" />
                        <circle cx="6" cy="18" r="3" />
                        <circle cx="18" cy="16" r="3" />
                    </svg>
                </div>
                <h3 className="font-medium mb-1">No tracks yet</h3>
                <p className="text-sm text-gray-400">
                    No top tracks available for {getTimeRangeLabel(timeRange).toLowerCase()}.
                </p>
            </div>
        );
    }

    return (
        <div className={`bg-purple-800/20 rounded-lg p-4 ${className}`}>
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Top Tracks - {getTimeRangeLabel(timeRange)}</h3>
                <div className="flex gap-2">
                    <Button
                        onClick={handleShare}
                        className="text-xs px-3 py-1 bg-purple-600 hover:bg-purple-700"
                    >
                        Share
                    </Button>
                </div>
            </div>

            {/* Time range selector */}
            {onTimeRangeChange && (
                <div className="flex gap-2 mb-4 overflow-x-auto">
                    {(['short_term', 'medium_term', 'long_term'] as TimeRange[]).map((range) => (
                        <button
                            key={range}
                            onClick={() => onTimeRangeChange(range)}
                            className={`px-3 py-1 rounded text-xs whitespace-nowrap ${timeRange === range
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-purple-900/30 text-gray-300 hover:bg-purple-800/30'
                                }`}
                        >
                            {getTimeRangeLabel(range)}
                        </button>
                    ))}
                </div>
            )}

            {/* Tracks list */}
            <div className="space-y-3">
                {tracksToShow.map((track, index) => (
                    <div
                        key={track.id}
                        onClick={() => handleTrackClick(track)}
                        className="flex items-center gap-3 p-2 rounded hover:bg-purple-700/20 transition-colors cursor-pointer group"
                    >
                        {/* Rank */}
                        <div className="w-8 text-center font-medium text-gray-400">
                            {index + 1}
                        </div>

                        {/* Album Art */}
                        <div className="relative">
                            <SpotifyImage
                                src={track.coverArt || '/api/placeholder/40/40'}
                                alt={track.album || track.title}
                                width={40}
                                height={40}
                                className="w-10 h-10 rounded object-cover"
                            />
                            {/* Play overlay on hover */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            </div>
                        </div>

                        {/* Track Info */}
                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-white truncate">{track.title}</div>
                            <div className="text-sm text-gray-300 truncate">{track.artist}</div>
                            {track.album && (
                                <div className="text-xs text-gray-400 truncate">{track.album}</div>
                            )}
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center gap-2">
                            {track.popularity !== undefined && (
                                <div className="text-xs text-gray-400 bg-purple-700/30 px-2 py-1 rounded-full">
                                    {track.popularity}%
                                </div>
                            )}

                            {track.duration && (
                                <div className="text-xs text-gray-400">
                                    {track.duration}
                                </div>
                            )}

                            {/* Spotify link */}
                            <button
                                onClick={(e) => handleOpenInSpotify(track, e)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-green-500 hover:text-green-400"
                                title="Open in Spotify"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.6 0-.359.24-.66.54-.78 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.242 1.021zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Show more/less button */}
            {tracks.length > 5 && (
                <div className="mt-4 text-center">
                    <button
                        onClick={() => setShowAll(!showAll)}
                        className="text-sm text-purple-400 hover:text-purple-300 font-medium"
                    >
                        {showAll ? `Show Less (${tracks.length} total)` : `Show All ${tracks.length} Tracks`}
                    </button>
                </div>
            )}

            {/* Track count summary */}
            <div className="mt-4 pt-3 border-t border-purple-700/50 text-center">
                <p className="text-xs text-gray-400">
                    Showing {Math.min(tracksToShow.length, tracks.length)} of {tracks.length} tracks
                </p>
            </div>
        </div>
    );
};