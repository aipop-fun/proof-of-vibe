/* eslint-disable react-hooks/exhaustive-deps, @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

interface SpotifyAuthState {
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
    fid?: number | null;

    // Music data
    currentlyPlaying: SpotifyTrack | null;
    topTracks: Record<TimeRange, SpotifyTrack[]>;
    isLoadingTracks: Record<TimeRange, boolean>;
    loadingCurrentTrack: boolean;

    error: string | null;

    // Actions
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
    }) => void;
    setFarcasterAuth: (data: { fid: number }) => void;
    clearAuth: () => void;
    isExpired: () => boolean;

    fetchTopTracks: (timeRange: TimeRange) => Promise<void>;
    fetchCurrentlyPlaying: () => Promise<void>;
    clearMusicData: () => void;
    setError: (error: string | null) => void;
}

const formatDuration = (ms: number): string => {
    if (!ms) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Create store with persistence
export const useAuthStore = create<SpotifyAuthState>()(
    persist(
        (set, get) => ({
            accessToken: null,
            refreshToken: null,
            expiresAt: null,
            spotifyId: null,
            spotifyUser: null,
            isAuthenticated: false,
            fid: null,

            // Music data
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

            setSpotifyAuth: (data) => {
                set({
                    accessToken: data.accessToken,
                    refreshToken: data.refreshToken,
                    expiresAt: data.expiresAt,
                    spotifyId: data.spotifyId,
                    spotifyUser: data.user || null,
                    isAuthenticated: true,
                });
            },

            setFarcasterAuth: (data) => {
                set((state) => ({
                    fid: data.fid,
                    isAuthenticated: true,
                }));
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
                });
            },

            isExpired: () => {
                const state = get();
                if (!state.expiresAt) return true;
                // Add 5 minute buffer
                return Date.now() > (state.expiresAt * 1000) - (5 * 60 * 1000);
            },

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
                    // Real API call to Spotify
                    const response = await fetch(`https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=50`, {
                        headers: {
                            'Authorization': `Bearer ${state.accessToken}`
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`Failed to fetch top tracks: ${response.statusText}`);
                    }

                    const data = await response.json();
                    const tracks = data.items.map((item: { id: any; name: any; artists: { name: any; }[]; album: { name: any; images: { url: any; }[]; }; duration_ms: number; popularity: any; }) => ({
                        id: item.id,
                        title: item.name,
                        artist: item.artists.map((artist: { name: any; }) => artist.name).join(', '),
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
                    // Real API call to Spotify
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
                        artist: data.item.artists.map((artist: { name: any; }) => artist.name).join(', '),
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
            }),
        }
    )
);