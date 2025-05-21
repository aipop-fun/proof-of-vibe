/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '~/lib/stores/authStore';

export interface UserMusicData {
    currentTrack: {
        id: string;
        title: string;
        artist: string;
        album?: string;
        coverArt?: string;
        isPlaying?: boolean;
        timestamp?: number;
        spotifyUrl?: string;
    } | null;
    recentTracks: Array<{
        id: string;
        title: string;
        artist: string;
        album?: string;
        coverArt?: string;
        timestamp?: number;
        spotifyUrl?: string;
    }>;
    hasSpotify: boolean;
    isLoading: boolean;
    error: string | null;
}

/**
 * Custom hook for fetching and managing user music data
 * @param fidOrSpotifyId - The user's Farcaster ID or Spotify ID
 * @param options - Optional configuration settings
 */
export function useUserMusic(
    fidOrSpotifyId: number | string,
    options: {
        includeRecentTracks?: boolean;
        pollingInterval?: number | false;
    } = {}
): UserMusicData & {
    refreshData: () => Promise<void>;
    openTrackInSpotify: (trackId: string) => void;
} {
    const [data, setData] = useState<UserMusicData>({
        currentTrack: null,
        recentTracks: [],
        hasSpotify: false,
        isLoading: true,
        error: null
    });

    // Default options
    const {
        includeRecentTracks = false,
        pollingInterval = false
    } = options;

    // Get methods from our auth store
    const {
        fetchUserCurrentTrack,
        userTracks,
        loadingUserTracks,
        userTracksError
    } = useAuthStore();

    // Convert to string key for store lookups
    const key = String(fidOrSpotifyId);

    // Fetch user data
    const fetchData = useCallback(async () => {
        try {
            setData(prev => ({ ...prev, isLoading: true, error: null }));

            // Check if user has Spotify connected
            const statusResponse = await fetch('/api/users/spotify-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fids: typeof fidOrSpotifyId === 'number' ? [fidOrSpotifyId] : []
                })
            });

            let hasSpotify = false;

            if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                hasSpotify = typeof fidOrSpotifyId === 'number'
                    ? !!statusData[fidOrSpotifyId]
                    : true; // If Spotify ID, then they have Spotify
            }

            // If user has Spotify, fetch current track
            let currentTrack = null;
            let recentTracks: any[] = [];

            if (hasSpotify) {
                // Fetch current track using our store method
                const trackData = await fetchUserCurrentTrack(fidOrSpotifyId);

                if (trackData?.track) {
                    currentTrack = {
                        id: trackData.track.id,
                        title: trackData.track.title,
                        artist: trackData.track.artist,
                        album: trackData.track.album,
                        coverArt: trackData.track.coverArt || trackData.track.albumArt,
                        isPlaying: trackData.track.isPlaying,
                        timestamp: trackData.timestamp,
                        spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(
                            `${trackData.track.title} ${trackData.track.artist}`
                        )}`
                    };
                }

                // Fetch recent tracks if requested
                if (includeRecentTracks) {
                    try {
                        const recentResponse = await fetch(
                            `/api/user-tracks/recent?${typeof fidOrSpotifyId === 'number'
                                ? `fid=${fidOrSpotifyId}`
                                : `spotify_id=${fidOrSpotifyId}`
                            }&limit=5`
                        );

                        if (recentResponse.ok) {
                            const recentData = await recentResponse.json();
                            recentTracks = recentData.tracks || [];
                        }
                    } catch (recentError) {
                        console.error("Error fetching recent tracks:", recentError);
                        // Continue with empty recent tracks
                    }
                }
            }

            // Update state with all the data
            setData({
                currentTrack,
                recentTracks,
                hasSpotify,
                isLoading: false,
                error: null
            });
        } catch (error) {
            console.error("Error in useUserMusic:", error);
            setData(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : "Failed to fetch music data"
            }));
        }
    }, [fidOrSpotifyId, fetchUserCurrentTrack, includeRecentTracks]);

    // Initial data fetch
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Set up polling if requested
    useEffect(() => {
        if (!pollingInterval) return;

        const intervalId = setInterval(fetchData, pollingInterval);
        return () => clearInterval(intervalId);
    }, [fetchData, pollingInterval]);

    // Open track in Spotify
    const openTrackInSpotify = useCallback((trackId: string) => {
        // Find the track in current or recent tracks
        const track = trackId === data.currentTrack?.id
            ? data.currentTrack
            : data.recentTracks.find(t => t.id === trackId);

        if (!track) return;

        const url = track.spotifyUrl || `https://open.spotify.com/search/${encodeURIComponent(
            `${track.title} ${track.artist}`
        )}`;

        window.open(url, '_blank');
    }, [data.currentTrack, data.recentTracks]);

    return {
        ...data,
        refreshData: fetchData,
        openTrackInSpotify
    };
}