/* eslint-disable  @typescript-eslint/no-unused-vars, react/no-unescaped-entities */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { checkAccountsLinked } from '~/lib/services/accountLinking';
import {
    getCurrentlyPlaying,
    getTopTracks,
    getUserProfile,
    validateToken,
    refreshAccessToken, 
    getRecentlyPlayedTracks
} from '~/lib/spotify-api-service';
import { listeningHistoryService } from '~/lib/services/listeningHistoryService';

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

interface FarcasterUser {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
    bio?: string;
    followerCount?: number;
    followingCount?: number;
    verifiedAddresses?: {
        eth_addresses: string[];
        sol_addresses: string[];
    };
}

interface SpotifyUser {
    id: string;
    display_name?: string;
    email?: string;
    external_urls?: {
        spotify: string;
    };
    images?: Array<{
        url: string;
        height: number;
        width: number;
    }>;
}


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


interface AuthState {
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
    userId: string | null;
    isLinked: boolean;
    linkingError: string | null;

    // User data (for compatibility)
    farcaster: FarcasterUser | null;
    spotify: SpotifyUser | null;
    authMethod: 'farcaster' | 'spotify' | 'both' | null;

    // Music data
    currentlyPlaying: SpotifyTrack | null;
    topTracks: Record<TimeRange, SpotifyTrack[]>;
    isLoadingTracks: Record<TimeRange, boolean>;
    loadingCurrentTrack: boolean;
    error: string | null;

    lastSavedTrack: string | null;
    autoSaveEnabled: boolean;

    isMiniApp: boolean | null;

    connectedUsers: {
        fid: number;
        spotifyId?: string;
        username?: string;
        displayName?: string;
        lastSeen?: number;
    }[];
    isLoadingConnections: boolean;
    userTopTracks: Record<number, SpotifyTrack[]>;

    userTracks: Record<string, UserTrackData>; 
    loadingUserTracks: Record<string, boolean>;
    userTracksError: Record<string, string | null>;

    recentTracks: SpotifyTrack[];
    loadingRecentTracks: boolean;
    lastFetchAttempt: number | null;
    retryCount: number;

    fetchRecentTracks: () => Promise<void>;
    resetRetryCount: () => void;
    
    fetchUserCurrentTrack: (fidOrSpotifyId: number | string) => Promise<UserTrackData | null>;
    fetchConnectedUsers: () => Promise<void>;
    fetchUserTopTracks: (fid: number) => Promise<void>;
    setLinkedStatus: (status: boolean) => void;
    checkLinkedStatus: () => Promise<void>;
    setLinkingError: (error: string | null) => void;
    
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

    setAuth: (authData: {
        isAuthenticated: boolean;
        spotifyId: string;
        accessToken: string;
        refreshToken: string;
        expiresAt: number;
        userId: string;
        fid: number;
    }) => void;
    setFarcasterAuth: (data: { fid: number }) => Promise<void>;
    setFarcasterUser: (user: FarcasterUser | null) => void;
    setSpotifyUser: (user: SpotifyUser | null, token?: string, refreshToken?: string, expiresIn?: number) => void;
    setMiniAppStatus: (isMiniApp: boolean) => void;
    clearAuth: () => void;
    isExpired: () => boolean;
    refreshTokenIfNeeded: () => Promise<boolean>;
    fetchTopTracks: (timeRange: TimeRange) => Promise<void>;
    fetchCurrentlyPlaying: () => Promise<void>;
    fetchSpotifyProfile: () => Promise<void>;
    clearMusicData: () => void;
    setError: (error: string | null) => void;
    toggleAutoSave: (enabled: boolean) => void;
    
    getDisplayName: () => string;
    getProfileImage: () => string | undefined;
}


export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({

            userTracks: {},
            loadingUserTracks: {},
            userTracksError: {},

            accessToken: null,
            refreshToken: null,
            expiresAt: null,
            spotifyId: null,
            spotifyUser: null,
            isAuthenticated: false,
            userId: null,
            fid: null,
            isLinked: false,
            linkingError: null,

            // User data
            farcaster: null,
            spotify: null,
            authMethod: null,

            lastSavedTrack: null,
            autoSaveEnabled: true,

            isMiniApp: null,

            // Initial music data state
            currentlyPlaying: null,
            recentTracks: [],
            topTracks: {
                short_term: [],
                medium_term: [],
                long_term: [],
            },
            loadingRecentTracks: false,
            lastFetchAttempt: null,
            retryCount: 0,
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

            setAuth: (authData) => {
                set({
                    isAuthenticated: authData.isAuthenticated,
                    spotifyId: authData.spotifyId,
                    accessToken: authData.accessToken,
                    refreshToken: authData.refreshToken,
                    expiresAt: authData.expiresAt,
                    userId: authData.userId,
                    fid: authData.fid,
                    error: null,
                });
            },

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

            // Set Farcaster user
            setFarcasterUser: (user) => set((state) => {
                const isLinked = !!(user && state.spotify);
                return {
                    farcaster: user,
                    fid: user?.fid || null,
                    isAuthenticated: !!user || !!state.spotify,
                    authMethod: user
                        ? (state.spotify ? 'both' : 'farcaster')
                        : (state.spotify ? 'spotify' : null),
                    isLinked,
                };
            }),

            refreshTokenIfNeeded: async () => {
                const state = get();

                
                if (!state.refreshToken) {
                    console.log('No refresh token available');
                    return false;
                }

                
                if (state.accessToken && !state.isExpired()) {
                    return true;
                }

                console.log('Token expired, attempting refresh...');

                try {
                    const { accessToken, refreshToken, expiresAt } = await refreshAccessToken(state.refreshToken);

                    set({
                        accessToken,
                        refreshToken: refreshToken || state.refreshToken,
                        expiresAt,
                        error: null,
                        retryCount: 0,
                    });

                    console.log('Token refreshed successfully');
                    return true;
                } catch (error) {
                    console.error('Failed to refresh token:', error);

                    
                    const errorMessage = error instanceof Error ? error.message : '';
                    if (errorMessage.includes('401') || errorMessage.includes('403')) {
                        set({
                            error: "Your Spotify session has expired. Please sign in again.",
                            accessToken: null,
                            refreshToken: null,
                            isAuthenticated: false,
                        });
                    } else {
                        set({ error: "Connection error. Retrying..." });
                    }

                    return false;
                }
            },


            fetchCurrentlyPlaying: async () => {
                const state = get();
                
                const tokenValid = await state.refreshTokenIfNeeded();
                if (!tokenValid || !state.accessToken) {
                    set({
                        error: "Authentication required to fetch current track",
                        loadingCurrentTrack: false
                    });
                    return;
                }

                set({
                    loadingCurrentTrack: true,
                    error: null,
                    lastFetchAttempt: Date.now()
                });

                try {
                    const track = await getCurrentlyPlaying(state.accessToken);

                    set({
                        currentlyPlaying: track,
                        loadingCurrentTrack: false,
                        retryCount: 0, 
                    });
                    
                    if (track && state.autoSaveEnabled && state.userId && state.fid) {
                        const shouldSave = (
                            state.lastSavedTrack !== track.id ||
                            (track.isPlaying && track.progressMs && track.progressMs > 30000)
                        );

                        if (shouldSave) {
                            try {
                                await listeningHistoryService.saveListeningHistory(
                                    state.userId,
                                    state.fid,
                                    track
                                );
                                set({ lastSavedTrack: track.id });
                                console.log('Track saved to listening history:', track.title);
                            } catch (saveError) {
                                console.error('Error saving track to history:', saveError);
                            }
                        }
                    }
                } catch (error) {
                    console.error("Error fetching currently playing track:", error);
                    
                    const newRetryCount = state.retryCount + 1;
                    
                    let errorMessage = "Failed to fetch current track";
                    if (error instanceof Error) {
                        const msg = error.message;
                        if (msg.includes('UNAUTHORIZED')) {
                            errorMessage = "Session expired. Please reconnect Spotify.";
                        } else if (msg.includes('FORBIDDEN')) {
                            errorMessage = "Spotify Premium required for some features.";
                        } else if (msg.includes('RATE_LIMITED')) {
                            errorMessage = "Too many requests. Please wait a moment.";
                        } else if (msg.includes('SPOTIFY_DOWN')) {
                            errorMessage = "Spotify is temporarily unavailable.";
                        } else if (msg.includes('NETWORK_ERROR')) {
                            errorMessage = "Check your internet connection.";
                        } else {
                            errorMessage = msg;
                        }
                    }

                    set({
                        error: errorMessage,
                        loadingCurrentTrack: false,
                        retryCount: newRetryCount,
                    });
                }
            },
            
            setSpotifyUser: (user, token, refreshToken, expiresIn) => set((state) => {
                const spotifyExpiresAt = expiresIn
                    ? Date.now() + expiresIn * 1000
                    : state.expiresAt;

                const isLinked = !!(user && state.farcaster);

                return {
                    spotify: user,
                    spotifyId: user?.id || null,
                    accessToken: token !== undefined ? token : state.accessToken,
                    refreshToken: refreshToken !== undefined ? refreshToken : state.refreshToken,
                    expiresAt: spotifyExpiresAt,
                    isAuthenticated: !!user || !!state.farcaster,
                    authMethod: user
                        ? (state.farcaster ? 'both' : 'spotify')
                        : (state.farcaster ? 'farcaster' : null),
                    isLinked,
                };
            }),

            fetchRecentTracks: async () => {
                const state = get();
                const tokenValid = await state.refreshTokenIfNeeded();

                if (!tokenValid || !state.accessToken) {
                    return;
                }

                set({ loadingRecentTracks: true });

                try {
                    // Importar função se não existir ainda
                    const tracks = await getRecentlyPlayedTracks(state.accessToken);

                    set({
                        recentTracks: tracks || [],
                        loadingRecentTracks: false,
                    });
                } catch (error) {
                    console.error("Error fetching recent tracks:", error);
                    set({
                        loadingRecentTracks: false,
                    });
                }
            },

            resetRetryCount: () => {
                set({ retryCount: 0, error: null });
            },

            
            setMiniAppStatus: (isMiniApp) => set({ isMiniApp }),

            linkAccounts: async (fid, spotifyId) => {
                try {
                    console.log(`Linking accounts for FID: ${fid} and Spotify ID: ${spotifyId}`);

            
                    const response = await fetch("/api/auth/link-accounts", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ fid, spotifyId }),
                    });

                    const data = await response.json();

                    if (response.ok && data.success) {
                        
                        set({ isLinked: true, linkingError: null });

                        return {
                            success: true,
                            user: data.user
                        };
                    } else {
                        
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

            setSpotifyAuth: (data) => {                
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
                    farcaster: null,
                    spotify: null,
                    authMethod: null,
                    currentlyPlaying: null,
                    recentTracks: [],
                    topTracks: {
                        short_term: [],
                        medium_term: [],
                        long_term: [],
                    },
                    retryCount: 0, 
                    lastFetchAttempt: null, 
                    error: null, 
                });
            },

            isExpired: () => {
                const state = get();
                if (!state.expiresAt) return true;                
                return Date.now() > (state.expiresAt * 1000) - (5 * 60 * 1000);
            },


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
            toggleAutoSave: (enabled) => set({ autoSaveEnabled: enabled }),

            getDisplayName: () => {
                const state = get();

                if (state.farcaster?.username) {
                    return state.farcaster.username;
                }

                if (state.farcaster?.displayName) {
                    return state.farcaster.displayName;
                }

                if (state.spotify?.display_name) {
                    return state.spotify.display_name;
                }

                return 'User';
            },

            

            getProfileImage: () => {
                const state = get();

                if (state.farcaster?.pfpUrl) {
                    return state.farcaster.pfpUrl;
                }

                if (state.spotify?.images && state.spotify.images.length > 0) {
                    return state.spotify.images[0].url;
                }

                return undefined;
            },
        }),
        {
            name: 'spotify-auth-storage',
            // Only persist essential auth data, not tokens or music data
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated,
                authMethod: state.authMethod,
                farcaster: state.farcaster,
                spotify: state.spotify ? {
                    id: state.spotify.id,
                    display_name: state.spotify.display_name,
                    images: state.spotify.images,
                } : null,
                spotifyId: state.spotifyId,
                fid: state.fid,
                userId: state.userId,
                isLinked: state.isLinked,
                autoSaveEnabled: state.autoSaveEnabled,
                isMiniApp: state.isMiniApp,
            }),
        }
    )
);