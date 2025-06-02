/* eslint-disable  @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment, react/no-unescaped-entities, @typescript-eslint/no-unused-vars */
// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "~/lib/stores/authStore";
import { SpotifyTopTracks } from "./SpotifyTopTracks";
import { SpotifyImage } from "./SpotifyImage";
import { Button } from "./ui/Button";
import { useFrame } from "./providers/FrameProvider";
import sdk from "@farcaster/frame-sdk";
import { NavigationHelper } from "~/lib/utils/navigation";
import { formatDuration } from "~/lib/utils";

const POLLING_INTERVAL = 30000; // 30 seconds

export function PersonalMusic({ userId, fid }: { userId?: string; fid?: number }) {
    const [error, setError] = useState<string | null>(null);
    const [isSharing, setIsSharing] = useState(false);
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
        fetchUserCurrentTrack,
        userId: currentUserId
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

    // Handle sharing currently playing track with new Supabase system
    const handleShareCurrentlyPlaying = useCallback(async () => {
        if (!trackData || !currentUserId || isSharing) return;

        setIsSharing(true);
        setError(null);

        try {
            // Call the new share API to create a shareable URL
            const response = await fetch('/api/share/track', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    spotifyTrackId: trackData.id,
                    userId: currentUserId,
                    trackTitle: trackData.title,
                    trackArtist: trackData.artist,
                    trackAlbum: trackData.album,
                    trackCoverArt: trackData.coverArt,
                    trackDurationMs: trackData.durationMs,
                    trackUri: trackData.uri,
                    trackPopularity: trackData.popularity
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to create share URL: ${response.status}`);
            }

            const shareData = await response.json();

            if (shareData.error) {
                throw new Error(shareData.error);
            }

            // Share based on context
            if (isMiniApp && typeof sdk?.actions?.composeCast === 'function') {
                await sdk.actions.composeCast({
                    text: shareData.shareMessage,
                    embeds: [shareData.shareUrl]
                });
            } else {
                // Fallback to Warpcast web
                const warpcastUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareData.shareMessage)}&embeds=${encodeURIComponent(shareData.shareUrl)}`;
                window.open(warpcastUrl, '_blank');
            }

            console.log('Track shared successfully:', shareData.shareUrl);

        } catch (err) {
            console.error('Error sharing track:', err);
            setError(err instanceof Error ? err.message : 'Failed to share track');
        } finally {
            setIsSharing(false);
        }
    }, [trackData, currentUserId, isMiniApp, isSharing]);

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

    // Handle opening track in Spotify
    const handleOpenInSpotify = useCallback(() => {
        if (!trackData) return;

        let spotifyUrl = '';

        if (trackData.uri) {
            spotifyUrl = trackData.uri.replace('spotify:', 'https://open.spotify.com/');
        } else {
            // Fallback to search
            spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(`${trackData.title} ${trackData.artist}`)}`;
        }

        if (isMiniApp && typeof sdk?.actions?.openUrl === 'function') {
            sdk.actions.openUrl(spotifyUrl);
        } else {
            window.open(spotifyUrl, '_blank');
        }
    }, [trackData, isMiniApp]);

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
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-sm text-green-400">
                                    {trackData.isPlaying ? "Currently Playing" : "Last Played"}
                                </p>
                                {isPersonal && (
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={handleOpenInSpotify}
                                            className="text-xs text-green-400 hover:text-green-300"
                                            title="Open in Spotify"
                                        >
                                            Spotify
                                        </button>
                                        <button
                                            onClick={handleShareCurrentlyPlaying}
                                            disabled={isSharing}
                                            className="text-xs text-purple-400 hover:text-purple-300 disabled:opacity-50"
                                        >
                                            {isSharing ? 'Sharing...' : 'Share'}
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center">
                                <div className="relative w-16 h-16 mr-3 flex-shrink-0">
                                    <SpotifyImage
                                        src={trackData.coverArt || '/api/placeholder/60/60'}
                                        alt={trackData.title}
                                        className="rounded cursor-pointer"
                                        fill
                                        sizes="64px"
                                        style={{ objectFit: 'cover' }}
                                        onClick={handleOpenInSpotify}
                                    />
                                    {/* Spotify overlay icon */}
                                    <div className="absolute bottom-1 right-1">
                                        <div className="bg-green-500 rounded-full p-1">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.6 0-.359.24-.66.54-.78 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.242 1.021zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-grow min-w-0">
                                    <p
                                        className="font-medium truncate cursor-pointer hover:underline"
                                        onClick={handleOpenInSpotify}
                                        title={trackData.title}
                                    >
                                        {trackData.title}
                                    </p>
                                    <p
                                        className="text-sm text-gray-300 truncate cursor-pointer hover:underline"
                                        onClick={handleOpenInSpotify}
                                        title={trackData.artist}
                                    >
                                        {trackData.artist}
                                    </p>
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
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-purple-800/30 rounded-full flex items-center justify-center mb-4 mx-auto">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="2" />
                                    <path d="M20.09 14.25c-2.06-.05-2.06-.8-2.06-.8s2.06-.75 2.06-.8V12c0-.25-.25-.5-.5-.5s-.5.25-.5.5v.45s-2.06.75-2.06.8 2.06.75 2.06.8V20" />
                                    <path d="M20.09 9.75c-2.06-.05-2.06-.8-2.06-.8s2.06-.75 2.06-.8V8c0-.25-.25-.5-.5-.5s-.5.25-.5.5v.45s-2.06.75-2.06.8 2.06.75 2.06.8V16" />
                                </svg>
                            </div>
                            <p className="text-sm text-gray-400">
                                {isPersonal ? "Not playing anything at the moment" : "No music data available"}
                            </p>
                            {isPersonal && (
                                <p className="text-xs text-gray-500 mt-1">
                                    Start playing music on Spotify to see it here
                                </p>
                            )}
                        </div>
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