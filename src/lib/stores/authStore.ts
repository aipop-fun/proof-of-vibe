import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { checkAccountsLinked } from '~/lib/services/accountLinking';
import {
    getCurrentlyPlaying,
    getTopTracks,
    getUserProfile,
    validateToken,
    refreshAccessToken
} from '~/lib/spotify-api-service';

// Types for Spotify tracks
interface SpotifyTrack {
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

    connectedUsers: {
        fid: number;
        spotifyId?: string;
        username?: string;
        displayName?: string;
        lastSeen?: number;
    }[];
    isLoadingConnections: boolean;
    userTopTracks: Record<number, SpotifyTrack[]>;

    // Functions
    fetchConnectedUsers: () => Promise<void>;
    fetchUserTopTracks: (fid: number) => Promise<void>;
    setLinkedStatus: (status: boolean) => void;
    checkLinkedStatus: () => Promise<void>;
    setLinkingError: (error: string | null) => void;
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
    refreshTokenIfNeeded: () => Promise<boolean>;
    fetchTopTracks: (timeRange: TimeRange) => Promise<void>;
    fetchCurrentlyPlaying: () => Promise<void>;
    fetchSpotifyProfile: () => Promise<void>;
    clearMusicData: () => void;
    setError: (error: string | null) => void;
}

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
                short_term: [], // Last 4 weeks
                medium_term: [], // Last 6 months
                long_term: [], // All time
            },
            isLoadingTracks: {
                short_term: false,
                medium_term: false,
                long_term: false,
            },
            loadingCurrentTrack: false,
            error: null,

            // Connected users state
            connectedUsers: [],
            isLoadingConnections: false,
            userTopTracks: {},

            // Functions for fetching data from backend/API
            fetchConnectedUsers: async () => {
                const state = get();
                if (!state.isAuthenticated || !state.fid) {
                    return;
                }

                set({ isLoadingConnections: true });

                try {
                    // In a real app, this would be an API call to get connected users
                    // For now, we'll simulate with mock data
                    const mockConnectedUsers = [
                        {
                            fid: 1245,
                            username: "0xWave",
                            displayName: "0xWave",
                            lastSeen: Date.now() - 3 * 60 * 1000
                        },
                        {
                            fid: 5678,
                            username: "cryptokate",
                            displayName: "Crypto Kate",
                            lastSeen: Date.now() - 15 * 60 * 1000
                        },
                        {
                            fid: 9012,
                            username: "web3builder",
                            displayName: "Web3 Builder",
                            lastSeen: Date.now() - 1 * 60 * 1000
                        }
                    ];

                    setTimeout(() => {
                        set({
                            connectedUsers: mockConnectedUsers,
                            isLoadingConnections: false
                        });
                    }, 1000);
                } catch (error) {
                    console.error("Error fetching connected users:", error);
                    set({
                        error: "Failed to load connected users",
                        isLoadingConnections: false
                    });
                }
            },

            fetchUserTopTracks: async (fid) => {
                const state = get();
                if (!state.isAuthenticated) {
                    return;
                }

                try {
                    // This would be a real API call in production
                    const mockTracks = Array(5).fill(null).map((_, index) => ({
                        id: `user-${fid}-track-${index}`,
                        title: `Track ${index + 1} for User ${fid}`,
                        artist: `Artist ${Math.floor(Math.random() * 10)}`,
                        album: `Album ${Math.floor(Math.random() * 5)}`,
                        coverArt: '/api/placeholder/60/60',
                        popularity: Math.floor(Math.random() * 100),
                    }));

                    set(state => ({
                        userTopTracks: {
                            ...state.userTopTracks,
                            [fid]: mockTracks
                        }
                    }));
                } catch (error) {
                    console.error(`Error fetching top tracks for user ${fid}:`, error);
                    set({
                        error: `Failed to load top tracks for user ${fid}`
                    });
                }
            },

            // Account linking functions
            setLinkedStatus: (status) => set({ isLinked: status }),
            setLinkingError: (error) => set({ linkingError: error }),

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

            // Authentication functions
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
                set({
                    fid: data.fid,
                    isAuthenticated: true,
                });

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
                    currentlyPlaying: null,
                    topTracks: {
                        short_term: [],
                        medium_term: [],
                        long_term: [],
                    },
                });
            },

            isExpired: () => {
                const state = get();
                if (!state.expiresAt) return true;
                // Add 5 minute buffer
                return Date.now() > (state.expiresAt * 1000) - (5 * 60 * 1000);
            },

            refreshTokenIfNeeded: async () => {
                const state = get();

                // If not authenticated or no refresh token, can't refresh
                if (!state.refreshToken) {
                    return false;
                }

                // If token is still valid, no need to refresh
                if (state.accessToken && !state.isExpired()) {
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

            // Spotify API functions
            fetchSpotifyProfile: async () => {
                const state = get();
                const tokenValid = await state.refreshTokenIfNeeded();

                if (!tokenValid || !state.accessToken) {
                    return;
                }

                try {
                    const profile = await getUserProfile(state.accessToken);

                    set({
                        spotifyUser: {
                            id: profile.id,
                            name: profile.display_name || profile.id,
                            email: profile.email,
                            image: profile.images?.[0]?.url,
                        },
                        spotifyId: profile.id,
                    });

                    return profile;
                } catch (error) {
                    console.error('Failed to fetch Spotify profile:', error);
                    set({ error: "Failed to load your Spotify profile" });
                    return null;
                }
            },

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

            setError: (error) => set({ error }),
        }),
        {
            name: 'spotify-auth-storage',
            // Only persist essential auth data, not tokens or music data
            partialize: (state) => ({
                spotifyId: state.spotifyId,
                fid: state.fid,
                isLinked: state.isLinked,
            }),
        }
    )
);