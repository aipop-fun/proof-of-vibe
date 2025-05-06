"use client";

import { useEffect } from "react";
import { useAuthStore } from "~/lib/stores/authStore";
import { SpotifyTopTracks } from "./SpotifyTopTracks";
import Image from "next/image";

export function PersonalMusic() {
    // Use Zustand store for everything
    const { 
        currentlyPlaying, 
        loadingCurrentTrack,
        fetchCurrentlyPlaying,
        spotifyId,
        isAuthenticated,
        isExpired
    } = useAuthStore();

    // Fetch currently playing track on component mount
    useEffect(() => {
        if (isAuthenticated && spotifyId && !isExpired()) {
            fetchCurrentlyPlaying();
            
            // Set up polling for currently playing track (every 30 seconds)
            const intervalId = setInterval(() => {
                if (isAuthenticated && !isExpired()) {
                    fetchCurrentlyPlaying();
                }
            }, 30000);
            
            // Clean up interval on unmount
            return () => clearInterval(intervalId);
        }
    }, [isAuthenticated, spotifyId, fetchCurrentlyPlaying, isExpired]);

    // If not signed in with Spotify, show nothing
    if (!isAuthenticated || !spotifyId) {
        return null;
    }

    // Helper function to calculate progress percentage
    const calculateProgress = (current: string, total: string): number => {
        try {
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

    return (
        <div className="p-4 bg-purple-800/20 rounded-lg mb-6">
            <h2 className="text-lg font-semibold mb-3">Your Music</h2>

            {loadingCurrentTrack ? (
                <div className="animate-pulse">
                    <div className="h-16 bg-purple-700/30 rounded"></div>
                </div>
            ) : (
                <>
                    {/* Currently playing track */}
                    {currentlyPlaying ? (
                        <div className="mb-4">
                            <p className="text-sm text-green-400 mb-1">Currently Playing</p>
                            <div className="flex items-center">
                                {currentlyPlaying.coverArt && (
                                    <div className="relative w-16 h-16 mr-3 flex-shrink-0">
                                        <Image
                                            src={currentlyPlaying.coverArt}
                                            alt={currentlyPlaying.title}
                                            className="rounded"
                                            fill
                                            sizes="64px"
                                            style={{ objectFit: 'cover' }}
                                        />
                                    </div>
                                )}
                                <div>
                                    <p className="font-medium">{currentlyPlaying.title}</p>
                                    <p className="text-sm text-gray-300">{currentlyPlaying.artist}</p>
                                    {currentlyPlaying.currentTime && currentlyPlaying.duration && (
                                        <div className="flex items-center mt-1">
                                            <div className="w-32 h-1 bg-gray-700 rounded-full mr-2">
                                                <div
                                                    className="h-1 bg-green-500 rounded-full"
                                                    style={{
                                                        width: `${calculateProgress(
                                                            currentlyPlaying.currentTime,
                                                            currentlyPlaying.duration
                                                        )}%`
                                                    }}
                                                ></div>
                                            </div>
                                            <span className="text-xs text-gray-400">
                                                {currentlyPlaying.currentTime} / {currentlyPlaying.duration}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 mb-3">Not currently playing anything</p>
                    )}

                    {/* Top tracks section using the new component */}
                    <SpotifyTopTracks />
                </>
            )}
        </div>
    );
}