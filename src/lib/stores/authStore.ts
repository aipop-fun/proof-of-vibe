/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
//@ts-nocheck

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { checkAccountsLinked } from '~/lib/services/accountLinking';

// Types for Spotify tracks
interface SpotifyTrack {
    currentTime?: string;
    id: string;
    title: string;
    artist: string;
    album?: string;
    coverArt?: string;
    duration?: string;
    popularity?: number;
    timeRange?: TimeRange;
}

type TimeRange = 'short_term' | 'medium_term' | 'long_term';

// Main auth store state interface
interface AuthState {
    // Auth state
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: number | null;
    spotifyId: string | null;
    spotifyUser: {
        id: string;
        name: string;
        email?: string;
        image?: string;
    } | null;
    isAuthenticated: boolean;
    fid: number | null;
    isLinked: boolean;
    linkingError: string | null;

    // Music data
    currentlyPlaying: SpotifyTrack | null;
    topTracks: Record<TimeRange, SpotifyTrack[]>;
    isLoadingTracks: Record<TimeRange, boolean>;
    loadingCurrentTrack: boolean;
    error: string | null;

    // Account linking actions
    setLinkedStatus: (status: boolean) => void;
    checkLinkedStatus: () => Promise<void>;
    setLinkingError: (error: string | null) => void;

    // Auth actions
    setSpotifyAuth: (data: {
        accessToken: string;
        refreshToken: string;
        expiresAt: number;
        spotifyId: string;
        user?: {
            id: string;
            name: string;
            email?: string;
            image?: string;
        };
    }) => Promise<void>;
    setFarcasterAuth: (data: { fid: number }) => Promise<void>;
    clearAuth: () => void;
    isExpired: () => boolean;

    // Music data actions
    fetchTopTracks: (timeRange: TimeRange) => Promise<void>;
    fetchCurrentlyPlaying: () => Promise<void>;
    clearMusicData: () => void;
    setError: (error: string | null) => void;
}

// Helper function to format duration
const formatDuration = (ms: number): string => {
    if (!ms) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Create store with persistence
export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            // Initial auth state
            accessToken: null,
            refreshToken: null,
            expiresAt: null,
            spotifyId: null,
            spotifyUser: null,
            isAuthenticated: false,
            fid: null,
            isLinked: false,
            linkingError: null,

            // Initial music data state
            currentlyPlaying: null,
            topTracks: {
                short_term: [], // Weekly (approximately last 4 weeks)
                medium_term: [], // Monthly (approximately last 6 months)
                long_term: [], // Yearly (calculated from several years of data)
            },
            isLoadingTracks: {
                short_term: false,
                medium_term: false,
                long_term: false,
            },
            loadingCurrentTrack: false,
            error: null,

            // Account linking actions
            setLinkedStatus: (status) => set({ isLinked: status }),

            setLinkingError: (error) => set({ linkingError: error }),

            // Check if accounts are linked in the database
            checkLinkedStatus: async () => {
                const state = get();
                if (!state.fid && !state.spotifyId) return;

                try {
                    const isLinked = await checkAccountsLinked(state.fid || undefined, state.spotifyId || undefined);
                    set({ isLinked });
                } catch (error) {
                    console.error('Error checking linked status:', error);
                }
            },

            // Auth actions
            setSpotifyAuth: async (data) => {
                set({
                    accessToken: data.accessToken,
                    refreshToken: data.refreshToken,
                    expiresAt: data.expiresAt,
                    spotifyId: data.spotifyId,
                    spotifyUser: data.user || null,
                    isAuthenticated: true,
                });

                // Check if accounts are linked after setting Spotify auth
                const state = get();
                if (state.fid) {
                    await get().checkLinkedStatus();
                }
            },

            setFarcasterAuth: async (data) => {
                set((state) => ({
                    fid: data.fid,
                    isAuthenticated: true,
                }));

                // Check if accounts are linked after setting Farcaster auth
                const state = get();
                if (state.spotifyId) {
                    await get().checkLinkedStatus();
                }
            },

            clearAuth: () => {
                set({
                    accessToken: null,
                    refreshToken: null,
                    expiresAt: null,
                    spotifyId: null,
                    spotifyUser: null,
                    isAuthenticated: false,
                    fid: null,
                    isLinked: false,
                });
            },

            isExpired: () => {
                const state = get();
                if (!state.expiresAt) return true;
                // Add 5 minute buffer
                return Date.now() > (state.expiresAt * 1000) - (5 * 60 * 1000);
            },

            // Music data actions
            fetchTopTracks: async (timeRange) => {
                const state = get();

                // Check authentication
                if (!state.accessToken || state.isExpired()) {
                    set({ error: "Authentication required to fetch top tracks" });
                    return;
                }

                // Set loading state for specific time range
                set(state => ({
                    isLoadingTracks: {
                        ...state.isLoadingTracks,
                        [timeRange]: true
                    },
                    error: null
                }));

                try {
                    // API call to Spotify
                    const response = await fetch(`https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=50`, {
                        headers: {
                            'Authorization': `Bearer ${state.accessToken}`
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`Failed to fetch top tracks: ${response.statusText}`);
                    }

                    const data = await response.json();
                    const tracks = data.items.map((item: any) => ({
                        id: item.id,
                        title: item.name,
                        artist: item.artists.map((artist: any) => artist.name).join(', '),
                        album: item.album.name,
                        coverArt: item.album.images[0]?.url || '/api/placeholder/60/60',
                        duration: formatDuration(item.duration_ms),
                        popularity: item.popularity,
                        timeRange
                    }));

                    // Update store with fetched tracks
                    set(state => ({
                        topTracks: {
                            ...state.topTracks,
                            [timeRange]: tracks
                        },
                        isLoadingTracks: {
                            ...state.isLoadingTracks,
                            [timeRange]: false
                        }
                    }));

                } catch (error) {
                    console.error(`Error fetching ${timeRange} top tracks:`, error);
                    set(state => ({
                        error: error instanceof Error ? error.message : "Unknown error fetching top tracks",
                        isLoadingTracks: {
                            ...state.isLoadingTracks,
                            [timeRange]: false
                        }
                    }));
                }
            },

            fetchCurrentlyPlaying: async () => {
                const state = get();

                // Check authentication
                if (!state.accessToken || state.isExpired()) {
                    set({ error: "Authentication required to fetch current track" });
                    return;
                }

                set({ loadingCurrentTrack: true, error: null });

                try {
                    // API call to Spotify
                    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
                        headers: {
                            'Authorization': `Bearer ${state.accessToken}`
                        }
                    });

                    // No content means nothing is playing
                    if (response.status === 204) {
                        set({ currentlyPlaying: null, loadingCurrentTrack: false });
                        return;
                    }

                    if (!response.ok) {
                        throw new Error(`Failed to fetch currently playing: ${response.statusText}`);
                    }

                    const data = await response.json();

                    // Only process if actually playing (not paused)
                    if (!data.is_playing) {
                        set({ currentlyPlaying: null, loadingCurrentTrack: false });
                        return;
                    }

                    const currentTrack = {
                        id: data.item.id,
                        title: data.item.name,
                        artist: data.item.artists.map((artist: any) => artist.name).join(', '),
                        album: data.item.album.name,
                        coverArt: data.item.album.images[0]?.url || '/api/placeholder/60/60',
                        duration: formatDuration(data.item.duration_ms),
                        currentTime: formatDuration(data.progress_ms)
                    };

                    set({ currentlyPlaying: currentTrack, loadingCurrentTrack: false });

                } catch (error) {
                    console.error("Error fetching currently playing track:", error);
                    set({
                        error: error instanceof Error ? error.message : "Unknown error fetching current track",
                        loadingCurrentTrack: false
                    });
                }
            },

            clearMusicData: () => {
                set({
                    currentlyPlaying: null,
                    topTracks: {
                        short_term: [],
                        medium_term: [],
                        long_term: []
                    },
                    error: null
                });
            },

            setError: (error) => {
                set({ error });
            }
        }),
        {
            name: 'spotify-auth-storage',
            // Only store necessary fields, exclude sensitive tokens and music data from localStorage
            partialize: (state) => ({
                spotifyId: state.spotifyId,
                spotifyUser: state.spotifyUser,
                isAuthenticated: state.isAuthenticated,
                fid: state.fid,
                isLinked: state.isLinked
            }),
        }
    )
);