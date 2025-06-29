/* eslint-disable react/no-unescaped-entities, react/display-name, @typescript-eslint/no-unused-vars
 */
"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { SpotifyImage } from "./SpotifyImage";
import { formatRelativeTime } from "~/lib/utils";
import sdk from "@farcaster/frame-sdk";
import { useFrame } from "./providers/FrameProvider";
import { usePerformance } from "~/lib/hooks/usePerformance";

export interface UserTrack {
    id: string;
    title: string;
    artist: string;
    album?: string;
    coverArt?: string;
    timestamp?: number;
    isPlaying?: boolean;
    spotifyUrl?: string;
}

interface UserMusicActivityProps {
    fid: number;
    username?: string;
    spotifyId?: string;
    className?: string;
}

export const UserMusicActivity = memo<UserMusicActivityProps>(({
    fid,
    username,
    spotifyId,
    className = ""
}) => {
    const [currentTrack, setCurrentTrack] = useState<UserTrack | null>(null);
    const [recentTracks, setRecentTracks] = useState<UserTrack[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { isMiniApp } = useFrame();

    
    useEffect(() => {
        const fetchUserMusic = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // In a real implementation, you would call your backend API
                // For now, we'll simulate the API call with mock data
                const response = await fetch(`/api/user-track?fid=${fid}`);

                if (!response.ok) {
                    // If user doesn't have Spotify connected or other error
                    // We'll still show the component but with a message
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to fetch music data');
                }

                const data = await response.json();

                if (data.track) {
                    setCurrentTrack({
                        id: data.track.id,
                        title: data.track.title,
                        artist: data.track.artist,
                        album: data.track.album,
                        coverArt: data.track.albumArt || data.track.coverArt,
                        timestamp: data.timestamp,
                        isPlaying: data.track.isPlaying,
                        spotifyUrl: data.track.spotifyUrl || createSpotifySearchUrl(data.track.title, data.track.artist)
                    });
                }

                // In a real implementation, you might also fetch recent tracks
                // For now, we'll generate mock data
                const mockRecentTracks = Array(3).fill(null).map((_, index) => ({
                    id: `track-${fid}-${index}`,
                    title: `Track ${index + 1}`,
                    artist: `Artist ${Math.floor(Math.random() * 5) + 1}`,
                    album: `Album ${Math.floor(Math.random() * 3) + 1}`,
                    coverArt: '/api/placeholder/40/40',
                    timestamp: Date.now() - (index + 1) * 3600000, // hours ago
                    isPlaying: index === 0 && Math.random() > 0.7
                }));

                setRecentTracks(mockRecentTracks);

            } catch (err) {
                console.error("Error fetching user music:", err);
                setError(err instanceof Error ? err.message : "Failed to fetch music data");

                // Clear data on error
                setCurrentTrack(null);
                setRecentTracks([]);
            } finally {
                setIsLoading(false);
            }
        };

        if (fid) {
            fetchUserMusic();
        }
    }, [fid]);

    // Open track in Spotify
    const openTrack = useCallback((track: UserTrack) => {
        const url = track.spotifyUrl || createSpotifySearchUrl(track.title, track.artist);

        if (isMiniApp && typeof sdk?.actions?.openUrl === 'function') {
            sdk.actions.openUrl(url);
        } else {
            window.open(url, '_blank');
        }
    }, [isMiniApp]);

    // If user doesn't have Spotify connected
    if (!spotifyId && !currentTrack && !isLoading) {
        return (
            <div className={`p-4 bg-purple-800/20 rounded-lg ${className}`}>
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium">Music Activity</h3>
                </div>
                <div className="text-center py-4">
                    <p className="text-gray-400 text-sm">
                        {username || `This user`} hasn't connected Spotify yet
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`p-4 bg-purple-800/20 rounded-lg ${className}`}>
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">Music Activity</h3>
            </div>

            {error && (
                <div className="mb-3 p-2 text-sm bg-red-900/30 text-red-200 rounded-md">
                    {error}
                </div>
            )}

            {isLoading ? (
                <div className="space-y-3 animate-pulse">
                    <div className="h-16 bg-purple-700/30 rounded"></div>
                    <div className="h-12 bg-purple-700/30 rounded"></div>
                    <div className="h-12 bg-purple-700/30 rounded"></div>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Currently playing or last played track */}
                    {currentTrack && (
                        <div
                            className="p-3 bg-purple-900/30 rounded-lg cursor-pointer hover:bg-purple-900/50"
                            onClick={() => openTrack(currentTrack)}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-sm text-green-400">
                                    {currentTrack.isPlaying ? "Currently Playing" : "Last Played"}
                                </p>
                                <span className="text-xs text-gray-400">
                                    {currentTrack.timestamp ? formatRelativeTime(currentTrack.timestamp) : ""}
                                </span>
                            </div>
                            <div className="flex items-center">
                                <div className="w-14 h-14 rounded overflow-hidden flex-shrink-0">
                                    <SpotifyImage
                                        src={currentTrack.coverArt || '/api/placeholder/56/56'}
                                        alt={currentTrack.album || currentTrack.title}
                                        width={56}
                                        height={56}
                                    />
                                </div>
                                <div className="ml-3 flex-grow min-w-0">
                                    <p className="font-medium truncate">{currentTrack.title}</p>
                                    <p className="text-sm text-gray-300 truncate">{currentTrack.artist}</p>
                                    {currentTrack.album && (
                                        <p className="text-xs text-gray-400 truncate">{currentTrack.album}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Recent tracks - showing if we have data and no current track */}
                    {!currentTrack && recentTracks.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm text-gray-300">Recent Tracks</h4>
                            {recentTracks.map(track => (
                                <div
                                    key={track.id}
                                    className="p-2 bg-purple-900/30 rounded flex items-center cursor-pointer hover:bg-purple-900/50"
                                    onClick={() => openTrack(track)}
                                >
                                    <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                                        <SpotifyImage
                                            src={track.coverArt || '/api/placeholder/40/40'}
                                            alt={track.title}
                                            width={40}
                                            height={40}
                                        />
                                    </div>
                                    <div className="ml-3 flex-grow min-w-0">
                                        <p className="font-medium text-sm truncate">{track.title}</p>
                                        <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        {track.timestamp ? formatRelativeTime(track.timestamp) : ""}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* No data available */}
                    {!currentTrack && recentTracks.length === 0 && (
                        <div className="text-center py-4">
                            <p className="text-gray-400 text-sm">
                                No recent music activity to display
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

// Helper function to create a Spotify search URL
function createSpotifySearchUrl(title: string, artist: string): string {
    const query = encodeURIComponent(`${title} ${artist}`);
    return `https://open.spotify.com/search/${query}`;
}