/* eslint-disable  @typescript-eslint/no-unused-vars */
import { create } from 'zustand';
import {
    getCurrentlyPlaying,
    getTopTracks,
    validateToken,
    refreshAccessToken
} from '~/lib/spotify-api-service';

// Types for Spotify tracks
export interface SpotifyTrack {
    id: string;
    title: string;
    artist: string;
    album?: string;
    coverArt?: string;
    duration?: string;
    currentTime?: string;
    popularity?: number;
    uri?: string;
    progressMs?: number;
    durationMs?: number;
    isPlaying?: boolean;
}

export type TimeRange = 'short_term' | 'medium_term' | 'long_term';

interface SpotifyDataState {
    // Auth state
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: number | null;

    // Music data
    currentlyPlaying: SpotifyTrack | null;
    topTracks: Record<TimeRange, SpotifyTrack[]>;
    isLoadingTracks: Record<TimeRange, boolean>;
    loadingCurrentTrack: boolean;
    error: string | null;

    // Functions
    setSpotifyTokens: (tokens: {
        accessToken: string;
        refreshToken: string;
        expiresAt: number;
    }) => void;
    clearSpotifyData: () => void;
    isTokenExpired: () => boolean;
    refreshTokenIfNeeded: () => Promise<boolean>;
    fetchTopTracks: (timeRange: TimeRange) => Promise<void>;
    fetchCurrentlyPlaying: () => Promise<void>;
    setError: (error: string | null) => void;
}

export const useSpotifyDataStore = create<SpotifyDataState>((set, get) => ({
    // Initial auth state
    accessToken: null,
    refreshToken: null,
    expiresAt: null,

    // Initial music data state
    currentlyPlaying: null,
    topTracks: {
        short_term: [],
        medium_term: [],
        long_term: [],
    },
    isLoadingTracks: {
        short_term: false,
        medium_term: false,
        long_term: false,
    },
    loadingCurrentTrack: false,
    error: null,

    // Set Spotify tokens
    setSpotifyTokens: (tokens) => {
        set({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt,
            error: null,
        });
    },

    // Clear all Spotify data
    clearSpotifyData: () => {
        set({
            currentlyPlaying: null,
            topTracks: {
                short_term: [],
                medium_term: [],
                long_term: [],
            },
            error: null,
        });
    },

    // Check if token is expired
    isTokenExpired: () => {
        const state = get();
        if (!state.expiresAt) return true;
        // Add 5 minute buffer
        return Date.now() > (state.expiresAt * 1000) - (5 * 60 * 1000);
    },

    // Refresh token if needed
    refreshTokenIfNeeded: async () => {
        const state = get();

        // If no refresh token, can't refresh
        if (!state.refreshToken) {
            return false;
        }

        // If token is still valid, no need to refresh
        if (state.accessToken && !state.isTokenExpired()) {
            return true;
        }

        try {
            // Attempt to refresh the token
            const { accessToken, refreshToken, expiresAt } = await refreshAccessToken(state.refreshToken);

            set({
                accessToken,
                refreshToken: refreshToken || state.refreshToken,
                expiresAt,
                error: null,
            });

            return true;
        } catch (error) {
            console.error('Failed to refresh token:', error);
            set({
                error: "Your Spotify session has expired. Please sign in again.",
                accessToken: null,
            });

            return false;
        }
    },

    // Fetch top tracks from Spotify
    fetchTopTracks: async (timeRange) => {
        const state = get();
        const tokenValid = await state.refreshTokenIfNeeded();

        if (!tokenValid || !state.accessToken) {
            set({ error: "Authentication required to fetch top tracks" });
            return;
        }

        // Set loading state
        set(state => ({
            isLoadingTracks: {
                ...state.isLoadingTracks,
                [timeRange]: true
            },
            error: null
        }));

        try {
            // Fetch tracks from Spotify API
            const tracks = await getTopTracks(state.accessToken, timeRange);

            // Update store
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
                error: error instanceof Error ? error.message : "Failed to load top tracks",
                isLoadingTracks: {
                    ...state.isLoadingTracks,
                    [timeRange]: false
                }
            }));
        }
    },

    // Fetch currently playing track from Spotify
    fetchCurrentlyPlaying: async () => {
        const state = get();
        const tokenValid = await state.refreshTokenIfNeeded();

        if (!tokenValid || !state.accessToken) {
            set({ error: "Authentication required to fetch current track" });
            return;
        }

        set({ loadingCurrentTrack: true, error: null });

        try {
            const track = await getCurrentlyPlaying(state.accessToken);
            set({
                currentlyPlaying: track,
                loadingCurrentTrack: false
            });
        } catch (error) {
            console.error("Error fetching currently playing track:", error);
            set({
                error: error instanceof Error ? error.message : "Failed to fetch current track",
                loadingCurrentTrack: false
            });
        }
    },

    // Set error message
    setError: (error) => set({ error }),
}));