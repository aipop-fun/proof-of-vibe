/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "~/lib/stores/authStore";
import { SpotifyTopTracks } from "./SpotifyTopTracks";
import { SpotifyImage } from "./SpotifyImage";
import { SpotifyReconnectHandler } from "./SpotifyReconnectHandler";

const POLLING_INTERVAL = 30000; 

export function PersonalMusic() {
    const [error, setError] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    const {
        currentlyPlaying,
        loadingCurrentTrack,
        fetchCurrentlyPlaying,
        isAuthenticated,
        spotifyId,
        accessToken,
        refreshTokenIfNeeded,
        isExpired,
        error: authError
    } = useAuthStore();

    
    const needsReconnect = isAuthenticated && spotifyId && (!accessToken || isExpired());

    
    const initializeData = useCallback(async () => {
        if (!isAuthenticated || !spotifyId || !accessToken || needsReconnect) {
            console.log('Cannot initialize - missing credentials or needs reconnect:', {
                isAuthenticated,
                spotifyId: !!spotifyId,
                accessToken: !!accessToken,
                needsReconnect
            });
            return;
        }

        try {
            setError(null);
            console.log('Initializing music data...');
            
            const tokenValid = await refreshTokenIfNeeded();
            if (!tokenValid) {
                console.log('Token refresh failed, will show reconnect UI');
                return;
            }
            
            await fetchCurrentlyPlaying();
            setIsInitialized(true);

        } catch (err) {
            console.error("Error initializing music data:", err);


            const errorMessage = err instanceof Error ? err.message : String(err);
            if (errorMessage.includes('UNAUTHORIZED') || errorMessage.includes('401')) {
                console.log('Authentication error detected, will show reconnect UI');
                return; 
            }

            setError(errorMessage);
        }
    }, [isAuthenticated, spotifyId, accessToken, needsReconnect, fetchCurrentlyPlaying, refreshTokenIfNeeded]);

    
    const pollCurrentlyPlaying = useCallback(async () => {
        if (!isAuthenticated || !spotifyId || !accessToken || loadingCurrentTrack || needsReconnect) {
            return;
        }

        try {
            const tokenValid = await refreshTokenIfNeeded();
            if (tokenValid) {
                await fetchCurrentlyPlaying();
            }
        } catch (err) {
            console.error("Error polling currently playing track:", err);

            
            const errorMessage = err instanceof Error ? err.message : String(err);
            if (errorMessage.includes('UNAUTHORIZED') || errorMessage.includes('401')) {
                console.log('Authentication error during polling, stopping polling');
                return; 
            }
        }
    }, [isAuthenticated, spotifyId, accessToken, loadingCurrentTrack, needsReconnect, fetchCurrentlyPlaying, refreshTokenIfNeeded]);

    
    useEffect(() => {
        if (isAuthenticated && spotifyId && accessToken && !isInitialized && !needsReconnect) {
            initializeData();
        }
    }, [isAuthenticated, spotifyId, accessToken, isInitialized, needsReconnect, initializeData]);

    
    useEffect(() => {
        if (!isInitialized || !isAuthenticated || !spotifyId || !accessToken || needsReconnect) {
            return;
        }

        const intervalId = setInterval(pollCurrentlyPlaying, POLLING_INTERVAL);

        return () => clearInterval(intervalId);
    }, [isInitialized, isAuthenticated, spotifyId, accessToken, needsReconnect, pollCurrentlyPlaying]);

    
    const handleRefresh = useCallback(async () => {
        if (loadingCurrentTrack || needsReconnect) return;

        setError(null);
        try {
            await initializeData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to refresh");
        }
    }, [loadingCurrentTrack, needsReconnect, initializeData]);

    
    if (!isAuthenticated || !spotifyId) {
        return null;
    }

    
    if (needsReconnect) {
        return (
            <div className="p-4 bg-purple-800/20 rounded-lg mb-6">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-semibold">Your Music</h2>
                </div>
                <SpotifyReconnectHandler variant="inline" />
            </div>
        );
    }

    return (
        <div className="p-4 bg-purple-800/20 rounded-lg mb-6">
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold">Your Music</h2>
                <button
                    onClick={handleRefresh}
                    className="text-sm text-purple-400 hover:text-purple-300"
                    disabled={loadingCurrentTrack}
                >
                    {loadingCurrentTrack ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            
            {(error || authError) && (
                <div className="mb-3 p-2 text-sm bg-red-900/30 text-red-200 rounded-md">
                    {error || authError}
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

            
            {(loadingCurrentTrack && !currentlyPlaying && !isInitialized) ? (
                <div className="animate-pulse">
                    <div className="h-16 bg-purple-700/30 rounded mb-4"></div>
                    <div className="space-y-2">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-12 bg-purple-700/20 rounded"></div>
                        ))}
                    </div>
                </div>
            ) : (
                <>

                    {currentlyPlaying ? (
                        <div className="mb-4">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-sm text-green-400 flex items-center gap-1">
                                    {currentlyPlaying.isPlaying ? (
                                        <>
                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                            Currently Playing
                                        </>
                                    ) : (
                                        "Last Played"
                                    )}
                                </p>
                                {currentlyPlaying.progressMs && currentlyPlaying.durationMs && (
                                    <p className="text-xs text-gray-400">
                                        {currentlyPlaying.currentTime} / {currentlyPlaying.duration}
                                    </p>
                                )}
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
                                {currentlyPlaying.uri && (
                                    <button
                                        onClick={() => {
                                            if (currentlyPlaying.uri) {
                                                window.open(currentlyPlaying.uri.replace('spotify:', 'https://open.spotify.com/'), '_blank');
                                            }
                                        }}
                                        className="text-green-400 hover:text-green-300 ml-2"
                                        title="Open in Spotify"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.6 0-.359.24-.66.54-.78 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.242 1.021zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : isInitialized ? (
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
                            <button
                                onClick={handleRefresh}
                                className="mt-3 text-sm text-purple-400 hover:text-purple-300"
                            >
                                Check again
                            </button>
                        </div>
                    ) : null}
                    
                    <SpotifyTopTracks />
                </>
            )}
        </div>
    );
}