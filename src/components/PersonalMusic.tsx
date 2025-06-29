/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/rules-of-hooks, react-hooks/exhaustive-deps */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "~/lib/stores/authStore";
import { SpotifyTopTracks } from "./SpotifyTopTracks";
import { SpotifyImage } from "./SpotifyImage";
import { usePerformance } from "~/lib/hooks/usePerformance";

const POLLING_INTERVAL = 60000; 

export function PersonalMusic() {
    const { useDebounce } = usePerformance();
    const [error, setError] = useState<string | null>(null);

    const {
        currentlyPlaying,
        loadingCurrentTrack,
        fetchCurrentlyPlaying,
        isAuthenticated,
        spotifyId,
        accessToken,
        refreshTokenIfNeeded
    } = useAuthStore();

    
    useEffect(() => {
        if (!isAuthenticated || !spotifyId) return;

        const debouncedFetchData = useDebounce(async () => {
            try {
                setError(null);
                const tokenValid = await refreshTokenIfNeeded();
                if (tokenValid && accessToken) {
                    await fetchCurrentlyPlaying();
                }
            } catch (err) {
                console.error("Error fetching currently playing track:", err);
                setError(err instanceof Error ? err.message : "Failed to fetch music data");
            }
        }, 500);

        
        debouncedFetchData();
        
        const intervalId = setInterval(() => {
            if (isAuthenticated && spotifyId && accessToken) {
                debouncedFetchData();
            }
        }, POLLING_INTERVAL);
        
        return () => clearInterval(intervalId);
    }, [isAuthenticated, spotifyId, accessToken, fetchCurrentlyPlaying, refreshTokenIfNeeded]);

    if (!isAuthenticated || !spotifyId) {
        return null;
    }

    return (
        <div className="p-4 bg-purple-800/20 rounded-lg mb-6">
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold">Your Music</h2>
            </div>

            {/* Error display */}
            {error && (
                <div className="mb-3 p-2 text-sm bg-red-900/30 text-red-200 rounded-md">
                    {error}
                </div>
            )}

            {loadingCurrentTrack && !currentlyPlaying ? (
                <div className="animate-pulse">
                    <div className="h-16 bg-purple-700/30 rounded"></div>
                </div>
            ) : (
                <>
                    {/* Currently playing track */}
                    {currentlyPlaying ? (
                        <div className="mb-4">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-sm text-green-400">
                                    {currentlyPlaying.isPlaying ? "Currently Playing" : "Last Played"}
                                </p>
                            </div>
                            <div className="flex items-center">
                                <div className="relative w-16 h-16 mr-3 flex-shrink-0">
                                    <SpotifyImage
                                        src={currentlyPlaying.coverArt || '/api/placeholder/60/60'}
                                        alt={currentlyPlaying.title}
                                        className="rounded"
                                        width={64}
                                        height={64}
                                        style={{ objectFit: 'cover' }}
                                    />
                                </div>
                                <div className="flex-grow min-w-0">
                                    <p className="font-medium truncate" title={currentlyPlaying.title}>
                                        {currentlyPlaying.title}
                                    </p>
                                    <p className="text-sm text-gray-300 truncate" title={currentlyPlaying.artist}>
                                        {currentlyPlaying.artist}
                                    </p>
                                    {currentlyPlaying.album && (
                                        <p className="text-xs text-gray-400 truncate" title={currentlyPlaying.album}>
                                            {currentlyPlaying.album}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-purple-800/30 rounded-full flex items-center justify-center mb-4 mx-auto">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="2" />
                                    <path d="M20.09 14.25c-2.06-.05-2.06-.8-2.06-.8s2.06-.75 2.06-.8V12c0-.25-.25-.5-.5-.5s-.5.25-.5.5v.45s-2.06.75-2.06.8 2.06.75 2.06.8V20" />
                                </svg>
                            </div>
                            <p className="text-sm text-gray-400">
                                Not playing anything at the moment
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                Start playing music on Spotify to see it here
                            </p>
                        </div>
                    )}

                    {/* Top tracks component */}
                    <SpotifyTopTracks />
                </>
            )}
        </div>
    );
}