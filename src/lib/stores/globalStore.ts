/* eslint-disable @typescript-eslint/no-explicit-any*/
/* eslint-disable @typescript-eslint/ban-ts-comment*/
// @ts-nocheck

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { immer } from 'zustand/middleware/immer';

/**
 * Generic interface for states with loading capability
 */
interface LoadableState {
    loading: boolean;
    error: string | null;
}

/**
 * Authentication state interface
 */
interface AuthState {
    accessToken: string | null;
    refreshToken: string | null;
    fid: number | null;
    spotifyId: string | null;
    isLinked: boolean;
}

/**
 * Music-related state interface
 */
interface MusicState extends LoadableState {
    currentTrack: Record<string, any> | null;
    topTracks: Record<string, any>[];
    lastUpdated: number;
}

/**
 * Social networking state interface
 */
interface SocialState extends LoadableState {
    followers: Record<string, any>[];
    following: Record<string, any>[];
    lastUpdated: number;
}

/**
 * Comprehensive global state interface with all slices and actions
 */
interface GlobalState {
    auth: AuthState;
    music: MusicState;
    social: SocialState;

    // Generic action type for updating any state slice
    updateSlice: <K extends keyof Omit<GlobalState, 'updateSlice' | 'resetState'>>(
        slice: K,
        newState: Partial<GlobalState[K]>
    ) => void;

    // Full state reset action
    resetState: () => void;
}

/**
 * Initial state values mapped by slice key
 */
const initialState = {
    auth: {
        accessToken: null,
        refreshToken: null,
        fid: null,
        spotifyId: null,
        isLinked: false
    },
    music: {
        currentTrack: null,
        topTracks: [],
        loading: false,
        error: null,
        lastUpdated: 0
    },
    social: {
        followers: [],
        following: [],
        loading: false,
        error: null,
        lastUpdated: 0
    }
};

// Cache expiration time (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

/**
 * Persistent global store with optimized memory footprint and immer integration
 */
export const useGlobalStore = create<GlobalState>()(
    persist(
        immer((set) => ({
            // Initial state values
            ...initialState,

            // Generic slice updater that works with immer for immutable updates
            updateSlice: (slice, newState) =>
                set((state) => {
                    // Deep merge the new state with current state
                    Object.assign(state[slice], newState);
                    
                    // Add timestamp for cacheable slices
                    if ((slice === 'music' || slice === 'social') && !('loading' in newState)) {
                        state[slice].lastUpdated = Date.now();
                    }
                }),

            // Comprehensive state reset
            resetState: () => set(initialState)
        })),
        {
            name: 'timbra-store',
            storage: createJSONStorage(() => sessionStorage),
            // Selective persistence to minimize storage usage
            partialize: (state) => ({
                auth: state.auth
            })
        }
    )
);

/**
 * Specialized selectors with shallow comparison to prevent unnecessary re-renders
 */
export const useAuth = () => useGlobalStore((state) => state.auth, shallow);

export const useMusic = () => useGlobalStore((state) => ({
    ...state.music,
    // Include functions to check cache validity
    isStale: () => (Date.now() - state.music.lastUpdated) > CACHE_EXPIRATION,
}), shallow);

export const useSocial = () => useGlobalStore((state) => ({
    ...state.social,
    // Include functions to check cache validity
    isStale: () => (Date.now() - state.social.lastUpdated) > CACHE_EXPIRATION,
}), shallow);

/**
 * Action creators for semantic state updates with optimistic updates
 */
export const authActions = {
    setCredentials: (tokens: Pick<AuthState, 'accessToken' | 'refreshToken'>) =>
        useGlobalStore.getState().updateSlice('auth', tokens),

    linkAccount: (spotifyId: string, fid: number) =>
        useGlobalStore.getState().updateSlice('auth', { spotifyId, fid, isLinked: true }),

    logout: () => useGlobalStore.getState().resetState()
};

export const musicActions = {
    setCurrentTrack: (track: Record<string, any>) =>
        useGlobalStore.getState().updateSlice('music', { currentTrack: track }),

    setTopTracks: (tracks: Record<string, any>[]) =>
        useGlobalStore.getState().updateSlice('music', { topTracks: tracks }),

    setLoading: (loading: boolean) =>
        useGlobalStore.getState().updateSlice('music', { loading, error: loading ? null : useGlobalStore.getState().music.error }),

    setError: (error: string | null) =>
        useGlobalStore.getState().updateSlice('music', { error, loading: false }),
        
    // Optimistic update helpers
    optimisticUpdate: (update: Partial<MusicState>, callback: () => Promise<any>) => {
        // Store current state for potential rollback
        const prevState = { ...useGlobalStore.getState().music };
        
        // Apply optimistic update
        useGlobalStore.getState().updateSlice('music', update);
        
        // Execute actual operation
        return callback().catch(err => {
            // Rollback on failure
            useGlobalStore.getState().updateSlice('music', prevState);
            console.error('Optimistic update failed:', err);
            throw err;
        });
    }
};

export const socialActions = {
    setFollowers: (followers: Record<string, any>[]) =>
        useGlobalStore.getState().updateSlice('social', { followers }),

    setFollowing: (following: Record<string, any>[]) =>
        useGlobalStore.getState().updateSlice('social', { following }),

    setLoading: (loading: boolean) =>
        useGlobalStore.getState().updateSlice('social', { loading, error: loading ? null : useGlobalStore.getState().social.error }),
        
    setError: (error: string | null) =>
        useGlobalStore.getState().updateSlice('social', { error, loading: false }),
        
    // Optimistic update helpers
    optimisticUpdate: (update: Partial<SocialState>, callback: () => Promise<any>) => {
        // Store current state for potential rollback
        const prevState = { ...useGlobalStore.getState().social };
        
        // Apply optimistic update
        useGlobalStore.getState().updateSlice('social', update);
        
        // Execute actual operation
        return callback().catch(err => {
            // Rollback on failure
            useGlobalStore.getState().updateSlice('social', prevState);
            console.error('Optimistic update failed:', err);
            throw err;
        });
    }
};