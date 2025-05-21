import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Define the user types
interface FarcasterUser {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
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

interface UserState {
    // User data
    farcaster: FarcasterUser | null;
    spotify: SpotifyUser | null;

    // Access tokens
    spotifyToken: string | null;
    spotifyRefreshToken: string | null;
    spotifyExpiresAt: number | null;

    // Auth state
    isAuthenticated: boolean;
    authMethod: 'farcaster' | 'spotify' | 'both' | null;

    // Actions
    setFarcasterUser: (user: FarcasterUser | null) => void;
    setSpotifyUser: (user: SpotifyUser | null, token?: string, refreshToken?: string, expiresIn?: number) => void;
    linkAccounts: (farcasterUser: FarcasterUser, spotifyUser: SpotifyUser, spotifyToken?: string, refreshToken?: string, expiresIn?: number) => void;
    logout: () => void;

    // Derived values
    getDisplayName: () => string;
    getProfileImage: () => string | undefined;
}

// Create the store
export const useUserStore = create<UserState>()(
    persist(
        (set, get) => ({
            // Initial state
            farcaster: null,
            spotify: null,
            spotifyToken: null,
            spotifyRefreshToken: null,
            spotifyExpiresAt: null,
            isAuthenticated: false,
            authMethod: null,

            // Actions
            setFarcasterUser: (user) => set((state) => ({
                farcaster: user,
                isAuthenticated: !!user || !!state.spotify,
                authMethod: user
                    ? (state.spotify ? 'both' : 'farcaster')
                    : (state.spotify ? 'spotify' : null),
            })),

            setSpotifyUser: (user, token, refreshToken, expiresIn) => set((state) => {
                // Calculate expiration timestamp if we have expiresIn
                const spotifyExpiresAt = expiresIn
                    ? Date.now() + expiresIn * 1000
                    : state.spotifyExpiresAt;

                return {
                    spotify: user,
                    // Only update tokens if provided
                    spotifyToken: token !== undefined ? token : state.spotifyToken,
                    spotifyRefreshToken: refreshToken !== undefined ? refreshToken : state.spotifyRefreshToken,
                    spotifyExpiresAt,
                    isAuthenticated: !!user || !!state.farcaster,
                    authMethod: user
                        ? (state.farcaster ? 'both' : 'spotify')
                        : (state.farcaster ? 'farcaster' : null),
                };
            }),

            linkAccounts: (farcasterUser, spotifyUser, spotifyToken, refreshToken, expiresIn) => {
                // Calculate expiration timestamp if we have expiresIn
                const spotifyExpiresAt = expiresIn
                    ? Date.now() + expiresIn * 1000
                    : null;

                set({
                    farcaster: farcasterUser,
                    spotify: spotifyUser,
                    spotifyToken: spotifyToken || null,
                    spotifyRefreshToken: refreshToken || null,
                    spotifyExpiresAt,
                    isAuthenticated: true,
                    authMethod: 'both',
                });

                // If we have FID and Spotify ID, call the API to link accounts on the server
                if (farcasterUser?.fid && spotifyUser?.id) {
                    fetch('/api/auth/link-accounts', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            fid: farcasterUser.fid,
                            spotifyId: spotifyUser.id,
                        }),
                    }).catch(error => {
                        console.error('Error linking accounts:', error);
                    });
                }
            },

            logout: () => set({
                farcaster: null,
                spotify: null,
                spotifyToken: null,
                spotifyRefreshToken: null,
                spotifyExpiresAt: null,
                isAuthenticated: false,
                authMethod: null,
            }),

            // Derived values
            getDisplayName: () => {
                const state = get();

                // Prioritize Farcaster username
                if (state.farcaster?.username) {
                    return state.farcaster.username;
                }

                // Fall back to Farcaster display name
                if (state.farcaster?.displayName) {
                    return state.farcaster.displayName;
                }

                // Fall back to Spotify display name
                if (state.spotify?.display_name) {
                    return state.spotify.display_name;
                }

                // Final fallback
                return 'User';
            },

            getProfileImage: () => {
                const state = get();

                // Prioritize Farcaster profile image
                if (state.farcaster?.pfpUrl) {
                    return state.farcaster.pfpUrl;
                }

                // Fall back to Spotify profile image
                if (state.spotify?.images && state.spotify.images.length > 0) {
                    return state.spotify.images[0].url;
                }

                // No image available
                return undefined;
            },
        }),
        {
            name: 'timbra-user-store',
            // Only persist non-sensitive data
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated,
                authMethod: state.authMethod,
                farcaster: state.farcaster,
                spotify: {
                    id: state.spotify?.id,
                    display_name: state.spotify?.display_name,
                    images: state.spotify?.images,
                },
            }),
        }
    )
);