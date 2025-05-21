/* eslint-disable  @typescript-eslint/no-unused-vars, react/no-unescaped-entities */

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

export interface UserTrackData {
    id: string;
    fid: number;
    spotifyId?: string;
    username?: string;
    displayName?: string;
    timestamp: number;
    track: {
        id: string;
        title: string;
        artist: string;
        album?: string;
        coverArt?: string;
        albumArt?: string;
        type?: string;
        isPlaying?: boolean;
        currentTime?: string;
        duration?: string;
    };
}

// Interface para resposta da API de vinculação de contas
interface LinkAccountsResponse {
    success: boolean;
    error?: string;
    user?: {
        id: string;
        fid: number;
        spotify_id: string;
        display_name?: string;
    };
}

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

    userTracks: Record<string, UserTrackData>; // keyed by fid or spotifyId
    loadingUserTracks: Record<string, boolean>;
    userTracksError: Record<string, string | null>;

    // Functions
    fetchUserCurrentTrack: (fidOrSpotifyId: number | string) => Promise<UserTrackData | null>;
    fetchConnectedUsers: () => Promise<void>;
    fetchUserTopTracks: (fid: number) => Promise<void>;
    setLinkedStatus: (status: boolean) => void;
    checkLinkedStatus: () => Promise<void>;
    setLinkingError: (error: string | null) => void;

    // Nova função para vincular contas
    linkAccounts: (fid: number, spotifyId: string) => Promise<LinkAccountsResponse>;

    setSpotifyAuth: (data: {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        tokenTimestamp: number;
        spotifyId: string;
        displayName?: string;
        email?: string;
        profileImage?: string;
    }) => void;

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
            userTracks: {},
            loadingUserTracks: {},
            userTracksError: {},

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

            fetchUserCurrentTrack: async (fidOrSpotifyId) => {
                const state = get();
                const key = String(fidOrSpotifyId);

                // Set loading state
                set(state => ({
                    loadingUserTracks: {
                        ...state.loadingUserTracks,
                        [key]: true
                    },
                    userTracksError: {
                        ...state.userTracksError,
                        [key]: null
                    }
                }));

                try {
                    // Determine parameter type
                    const isNumber = !isNaN(Number(fidOrSpotifyId));
                    const queryParam = isNumber ? `fid=${fidOrSpotifyId}` : `spotify_id=${fidOrSpotifyId}`;

                    // Add token if it's the current user
                    const currentUserFid = state.fid;
                    const currentUserSpotifyId = state.spotifyId;
                    let tokenParam = '';

                    if (
                        (isNumber && Number(fidOrSpotifyId) === currentUserFid) ||
                        (!isNumber && fidOrSpotifyId === currentUserSpotifyId)
                    ) {
                        tokenParam = `&token=${state.accessToken}`;
                    }

                    // Call the API
                    const response = await fetch(`/api/user-track?${queryParam}${tokenParam}`);

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to fetch user track');
                    }

                    const data = await response.json();

                    // Update state with the track data
                    const trackData: UserTrackData = {
                        id: data.id || `user-${key}`,
                        fid: data.fid || (isNumber ? Number(fidOrSpotifyId) : 0),
                        spotifyId: data.spotifyId,
                        username: data.username,
                        displayName: data.displayName,
                        timestamp: data.timestamp || Date.now(),
                        track: {
                            id: data.track.id,
                            title: data.track.title,
                            artist: data.track.artist,
                            album: data.track.album,
                            coverArt: data.track.coverArt || data.track.albumArt,
                            albumArt: data.track.albumArt,
                            type: data.track.type,
                            isPlaying: data.track.isPlaying,
                            currentTime: data.track.currentTime,
                            duration: data.track.duration
                        }
                    };

                    // Update store
                    set(state => ({
                        userTracks: {
                            ...state.userTracks,
                            [key]: trackData
                        },
                        loadingUserTracks: {
                            ...state.loadingUserTracks,
                            [key]: false
                        }
                    }));

                    return trackData;
                } catch (error) {
                    console.error(`Error fetching track for user ${fidOrSpotifyId}:`, error);

                    // Update error state
                    set(state => ({
                        loadingUserTracks: {
                            ...state.loadingUserTracks,
                            [key]: false
                        },
                        userTracksError: {
                            ...state.userTracksError,
                            [key]: error instanceof Error ? error.message : 'Failed to fetch track'
                        }
                    }));

                    return null;
                }
            },

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

            // Nova função para vincular contas Farcaster e Spotify
            linkAccounts: async (fid, spotifyId) => {
                try {
                    console.log(`Linking accounts for FID: ${fid} and Spotify ID: ${spotifyId}`);

                    // Fazer a chamada para a API de vinculação de contas
                    const response = await fetch("/api/auth/link-accounts", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ fid, spotifyId }),
                    });

                    const data = await response.json();

                    if (response.ok && data.success) {
                        // Atualizar o estado para mostrar que as contas estão vinculadas
                        set({ isLinked: true, linkingError: null });

                        return {
                            success: true,
                            user: data.user
                        };
                    } else {
                        // Se houver um erro na vinculação, atualizar o estado de erro
                        const errorMessage = data.error || "Failed to link accounts";
                        set({ linkingError: errorMessage });

                        return {
                            success: false,
                            error: errorMessage
                        };
                    }
                } catch (error) {
                    console.error("Error linking accounts:", error);
                    const errorMessage = error instanceof Error ? error.message : "Unknown error linking accounts";
                    set({ linkingError: errorMessage });

                    return {
                        success: false,
                        error: errorMessage
                    };
                }
            },

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
            setSpotifyAuth: (data) => {
                // Calcular o timestamp de expiração baseado no expiresIn
                const expiresAt = Math.floor((data.tokenTimestamp + (data.expiresIn * 1000)) / 1000);

                set({
                    accessToken: data.accessToken,
                    refreshToken: data.refreshToken,
                    expiresAt: expiresAt,
                    spotifyId: data.spotifyId,
                    spotifyUser: {
                        id: data.spotifyId,
                        name: data.displayName || data.spotifyId,
                        email: data.email,
                        image: data.profileImage,
                    },
                    isAuthenticated: true,
                });

                // Check if accounts are linked after setting Spotify auth
                const state = get();
                if (state.fid) {
                    get().checkLinkedStatus();
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