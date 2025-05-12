// src/components/PersonalMusic.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "~/lib/stores/authStore";
import { SpotifyTopTracks } from "./SpotifyTopTracks";
import { SpotifyImage } from "./SpotifyImage";
import { Button } from "./ui/Button";
import { useFrame } from "./providers/FrameProvider";
import sdk from "@farcaster/frame-sdk";

export function PersonalMusic() {
    const [error, setError] = useState<string | null>(null);
    const { isMiniApp } = useFrame();
    const pollingInterval = 30000; // 30 seconds

    // Access the auth store
    const {
        currentlyPlaying,
        loadingCurrentTrack,
        fetchCurrentlyPlaying,
        isAuthenticated,
        spotifyId,
        isExpired,
        accessToken,
        refreshTokenIfNeeded
    } = useAuthStore();

    // Fetch data when component mounts and set up polling
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Check if token is valid and refresh if needed
                const tokenValid = await refreshTokenIfNeeded();

                if (tokenValid && accessToken) {
                    await fetchCurrentlyPlaying();
                }
            } catch (err) {
                console.error("Error fetching currently playing track:", err);
                setError(err instanceof Error ? err.message : "Failed to fetch music data");
            }
        };

        // Initial fetch
        if (isAuthenticated && spotifyId) {
            fetchData();
        }

        // Set up polling interval
        const intervalId = setInterval(() => {
            if (isAuthenticated && spotifyId && !isExpired()) {
                fetchData();
            }
        }, pollingInterval);

        // Clean up on unmount
        return () => clearInterval(intervalId);
    }, [isAuthenticated, spotifyId, accessToken, isExpired, fetchCurrentlyPlaying, refreshTokenIfNeeded]);

    // Calculate progress percentage for progress bar
    const calculateProgress = (current?: string, total?: string): number => {
        try {
            if (!current || !total) return 0;

            // Convert mm:ss format to seconds
            const currentParts = current.split(':');
            const totalParts = total.split(':');

            const currentSeconds = parseInt(currentParts[0]) * 60 + parseInt(currentParts[1]);
            const totalSeconds = parseInt(totalParts[0]) * 60 + parseInt(totalParts[1]);

            if (isNaN(currentSeconds) || isNaN(totalSeconds) || totalSeconds === 0) {
                return 0;
            }

            return (currentSeconds / totalSeconds) * 100;
        } catch (error) {
            console.error('Error calculating progress:', error);
            return 0;
        }
    };

    // Alternative progress calculation using raw milliseconds when available
    const calculateProgressFromMs = (current?: number, total?: number): number => {
        if (!current || !total || total === 0) return 0;
        return (current / total) * 100;
    };

    // Handle sharing currently playing track
    const handleShareCurrentlyPlaying = () => {
        if (!currentlyPlaying) return;

        // Create the share URL
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const shareUrl = `${baseUrl}/results?type=currently-playing`;

        // Determine the appropriate sharing method based on context
        if (isMiniApp && typeof sdk?.actions?.composeCast === 'function') {
            // When in Farcaster mini app, use composeCast
            sdk.actions.composeCast({
                text: `🎵 I'm currently listening to ${currentlyPlaying.title} by ${currentlyPlaying.artist} on Timbra!`,
                embeds: [shareUrl]
            });
        } else {
            // On web, open in a new tab
            window.open(shareUrl, '_blank');
        }
    };

    // Handle viewing results page
    const handleViewResults = () => {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const resultsUrl = `${baseUrl}/results?type=top-tracks&timeRange=medium_term`;

        if (isMiniApp && typeof sdk?.actions?.openUrl === 'function') {
            sdk.actions.openUrl(resultsUrl);
        } else {
            window.open(resultsUrl, '_blank');
        }
    };

    // If not authenticated with Spotify, don't show anything
    if (!isAuthenticated || !spotifyId) {
        return null;
    }

    return (
        <div className="p-4 bg-purple-800/20 rounded-lg mb-6">
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold">Your Music</h2>
                <Button
                    onClick={handleViewResults}
                    className="text-xs px-3 py-1 bg-purple-600 hover:bg-purple-700"
                >
                    View Results
                </Button>
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
                            <div className="flex justify-between items-start">
                                <p className="text-sm text-green-400 mb-1">Currently Playing</p>
                                <button
                                    onClick={handleShareCurrentlyPlaying}
                                    className="text-xs text-purple-400 hover:text-purple-300"
                                >
                                    Share
                                </button>
                            </div>
                            <div className="flex items-center">
                                <div className="relative w-16 h-16 mr-3 flex-shrink-0">
                                    <SpotifyImage
                                        src={currentlyPlaying.coverArt || '/api/placeholder/60/60'}
                                        alt={currentlyPlaying.title}
                                        className="rounded"
                                        fill
                                        sizes="64px"
                                        style={{ objectFit: 'cover' }}
                                    />
                                </div>
                                <div className="flex-grow min-w-0">
                                    <p className="font-medium truncate">{currentlyPlaying.title}</p>
                                    <p className="text-sm text-gray-300 truncate">{currentlyPlaying.artist}</p>
                                    <div className="flex items-center mt-1">
                                        <div className="w-full max-w-32 h-1 bg-gray-700 rounded-full mr-2">
                                            <div
                                                className="h-1 bg-green-500 rounded-full"
                                                style={{
                                                    width: `${currentlyPlaying.progressMs && currentlyPlaying.durationMs
                                                            ? calculateProgressFromMs(currentlyPlaying.progressMs, currentlyPlaying.durationMs)
                                                            : calculateProgress(currentlyPlaying.currentTime, currentlyPlaying.duration)
                                                        }%`
                                                }}
                                            ></div>
                                        </div>
                                        <span className="text-xs text-gray-400">
                                            {currentlyPlaying.currentTime} / {currentlyPlaying.duration}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 mb-3">Not playing anything at the moment</p>
                    )}

                    {/* Top tracks component */}
                    <SpotifyTopTracks />
                </>
            )}
        </div>
    );
}