/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps,  @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unused-vars */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
}

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