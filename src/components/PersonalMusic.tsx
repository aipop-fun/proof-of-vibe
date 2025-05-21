/* eslint-disable  @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment, react/no-unescaped-entities */
// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "~/lib/stores/authStore";
import { SpotifyTopTracks } from "./SpotifyTopTracks";
import { SpotifyImage } from "./SpotifyImage";
import { Button } from "./ui/Button";
import { useFrame } from "./providers/FrameProvider";
import sdk from "@farcaster/frame-sdk";
import { formatDuration } from "~/lib/utils";

const POLLING_INTERVAL = 30000; // 30 seconds

export function PersonalMusic({ userId, fid }: { userId?: string; fid?: number }) {
    const [error, setError] = useState<string | null>(null);
    const { isMiniApp } = useFrame();

    // Access the auth store
    const {
        currentlyPlaying,
        loadingCurrentTrack,
        fetchCurrentlyPlaying,
        isAuthenticated,
        spotifyId,
        isExpired,
        accessToken,
        refreshTokenIfNeeded,
        fetchUserCurrentTrack
    } = useAuthStore();

    // Determine if we're showing personal data or another user's data
    const isPersonal = !userId && !fid;
    const trackData = isPersonal ? currentlyPlaying : null; // We'll fetch other user's track data separately

    // Fetch other user's data if userId or fid is provided
    useEffect(() => {
        if (!isPersonal && (userId || fid) && fetchUserCurrentTrack) {
            fetchUserCurrentTrack(userId || fid);
        }
    }, [userId, fid, isPersonal, fetchUserCurrentTrack]);

    // Fetch and poll personal data
    useEffect(() => {
        if (!isPersonal) return; // Skip if not showing personal data

        const fetchData = async () => {
            try {
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
        }, POLLING_INTERVAL);

        // Clean up on unmount
        return () => clearInterval(intervalId);
    }, [
        isPersonal,
        isAuthenticated,
        spotifyId,
        accessToken,
        isExpired,
        fetchCurrentlyPlaying,
        refreshTokenIfNeeded
    ]);

    // Calculate progress percentage
    const calculateProgress = useCallback((current?: number, total?: number): number => {
        if (!current || !total || total === 0) return 0;
        return (current / total) * 100;
    }, []);

    // Handle sharing currently playing track
    const handleShareCurrentlyPlaying = useCallback(() => {
        if (!trackData) return;

        // Create the share URL
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const shareUrl = `${baseUrl}/results?type=currently-playing`;
        const shareText = `🎵 I'm currently listening to ${trackData.title} by ${trackData.artist} on Timbra!`;

        // Share based on context
        if (isMiniApp && typeof sdk?.actions?.composeCast === 'function') {
            sdk.actions.composeCast({ text: shareText, embeds: [shareUrl] });
        } else {
            window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds=${encodeURIComponent(shareUrl)}`, '_blank');
        }
    }, [trackData, isMiniApp]);

    // Handle viewing results page
    const handleViewResults = useCallback(() => {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const resultsUrl = `${baseUrl}/results?type=top-tracks&timeRange=medium_term`;

        if (isMiniApp && typeof sdk?.actions?.openUrl === 'function') {
            sdk.actions.openUrl(resultsUrl);
        } else {
            window.open(resultsUrl, '_blank');
        }
    }, [isMiniApp]);

    // Check if we should render this component
    if (isPersonal && (!isAuthenticated || !spotifyId)) {
        return null;
    }

    return (
        <div className="p-4 bg-purple-800/20 rounded-lg mb-6">
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold">
                    {isPersonal ? "Your Music" : "User's Music"}
                </h2>
                {isPersonal && (
                    <Button
                        onClick={handleViewResults}
                        className="text-xs px-3 py-1 bg-purple-600 hover:bg-purple-700"
                    >
                        View Results
                    </Button>
                )}
            </div>

            {/* Error display */}
            {error && (
                <div className="mb-3 p-2 text-sm bg-red-900/30 text-red-200 rounded-md">
                    {error}
                </div>
            )}

            {loadingCurrentTrack && !trackData ? (
                <div className="animate-pulse">
                    <div className="h-16 bg-purple-700/30 rounded"></div>
                </div>
            ) : (
                <>
                    {/* Currently playing track */}
                    {trackData ? (
                        <div className="mb-4">
                            <div className="flex justify-between items-start">
                                <p className="text-sm text-green-400 mb-1">
                                    {trackData.isPlaying ? "Currently Playing" : "Last Played"}
                                </p>
                                {isPersonal && (
                                    <button
                                        onClick={handleShareCurrentlyPlaying}
                                        className="text-xs text-purple-400 hover:text-purple-300"
                                    >
                                        Share
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center">
                                <div className="relative w-16 h-16 mr-3 flex-shrink-0">
                                    <SpotifyImage
                                        src={trackData.coverArt || '/api/placeholder/60/60'}
                                        alt={trackData.title}
                                        className="rounded"
                                        fill
                                        sizes="64px"
                                        style={{ objectFit: 'cover' }}
                                    />
                                </div>
                                <div className="flex-grow min-w-0">
                                    <p className="font-medium truncate">{trackData.title}</p>
                                    <p className="text-sm text-gray-300 truncate">{trackData.artist}</p>
                                    {(trackData.currentTime || trackData.progressMs) && (
                                        <div className="flex items-center mt-1">
                                            <div className="w-full max-w-32 h-1 bg-gray-700 rounded-full mr-2">
                                                <div
                                                    className="h-1 bg-green-500 rounded-full"
                                                    style={{
                                                        width: `${calculateProgress(
                                                            trackData.progressMs || parseTimeToMs(trackData.currentTime),
                                                            trackData.durationMs || parseTimeToMs(trackData.duration)
                                                        )}%`
                                                    }}
                                                ></div>
                                            </div>
                                            <span className="text-xs text-gray-400">
                                                {trackData.currentTime || formatDuration(trackData.progressMs || 0)} / {trackData.duration || formatDuration(trackData.durationMs || 0)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 mb-3">
                            {isPersonal ? "Not playing anything at the moment" : "No music data available"}
                        </p>
                    )}

                    {/* Top tracks component - only show for personal view */}
                    {isPersonal && <SpotifyTopTracks />}
                </>
            )}
        </div>
    );
}

// Helper function to parse time format "m:ss" to milliseconds
function parseTimeToMs(timeString?: string): number {
    if (!timeString) return 0;

    const parts = timeString.split(':');
    if (parts.length !== 2) return 0;

    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);

    if (isNaN(minutes) || isNaN(seconds)) return 0;

    return (minutes * 60 + seconds) * 1000;
}