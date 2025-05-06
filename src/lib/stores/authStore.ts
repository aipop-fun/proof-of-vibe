/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps,  @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unused-vars */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SpotifyTrack {
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
                    // For development, we'll use mock data
                    // In production, this would be a real API call
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API latency

                    // Create mock data that's different for each time range
                    const timeRangeLabels = {
                        short_term: 'Weekly',
                        medium_term: 'Monthly',
                        long_term: 'All Time'
                    };

                    const tracks = Array(10).fill(null).map((_, index) => ({
                        id: `${timeRange}-track-${index}`,
                        title: `${timeRangeLabels[timeRange]} Top ${index + 1}`,
                        artist: `Artist ${index % 3 + 1}`,
                        album: `Album ${Math.floor(index / 3) + 1}`,
                        coverArt: '/api/placeholder/60/60',
                        duration: `${Math.floor(Math.random() * 4) + 2}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
                        popularity: Math.floor(Math.random() * 100),
                        timeRange
                    }));

                    // In production code, you would make the Spotify API call:
                    /*
                    const response = await fetch(`https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=50`, {
                        headers: {
                            'Authorization': `Bearer ${state.accessToken}`
                        }
                    });
                    
                    if (!response.ok) {
                        throw new Error(`Failed to fetch top tracks: ${response.statusText}`);
                    }
                    
                    const data = await response.json();
                    const tracks = data.items.map(item => ({
                        id: item.id,
                        title: item.name,
                        artist: item.artists.map(artist => artist.name).join(', '),
                        album: item.album.name,
                        coverArt: item.album.images[0]?.url,
                        duration: formatDuration(item.duration_ms),
                        popularity: item.popularity,
                        timeRange
                    }));
                    */

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
                    // For development, we'll use mock data
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API latency

                    // Mock current track
                    const currentTrack = {
                        id: 'current-track-id',
                        title: 'Currently Playing Track',
                        artist: 'Current Artist',
                        album: 'Current Album',
                        coverArt: '/api/placeholder/60/60',
                        duration: '3:45',
                        currentTime: '1:30',
                    };

                    // In production code, you would make the Spotify API call:
                    /*
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
                        artist: data.item.artists.map(artist => artist.name).join(', '),
                        album: data.item.album.name,
                        coverArt: data.item.album.images[0]?.url,
                        duration: formatDuration(data.item.duration_ms),
                        currentTime: formatDuration(data.progress_ms),
                    };
                    */

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
            // Only store necessary fields, exclude sensitive tokens from localStorage
            partialize: (state) => ({
                spotifyId: state.spotifyId,
                spotifyUser: state.spotifyUser,
                isAuthenticated: state.isAuthenticated,
                fid: state.fid,
            }),
        }
    )
);