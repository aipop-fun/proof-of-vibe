/* eslint-disable @typescript-eslint/no-explicit-any*/
/* eslint-disable @typescript-eslint/ban-ts-comment*/
// @ts-nocheck
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { immer } from 'zustand/middleware/immer';

// Types
export interface User {
  fid?: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  spotifyId?: string;
  spotifyDisplayName?: string;
  spotifyEmail?: string;
  spotifyImages?: Array<{ url: string; height: number; width: number; }>;
}

export interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  user: User | null;
  authMethod: 'farcaster' | 'spotify' | 'both' | null;
}

export interface MusicState {
  currentTrack: any | null;
  topTracks: Record<string, any>[];
  recentlyPlayed: Record<string, any>[];
  loading: boolean;
  error: string | null;
  lastUpdated: number;
}

export interface SocialState {
  followers: Record<string, any>[];
  following: Record<string, any>[];
  connections: User[];
  feed: Record<string, any>[];
  loading: boolean;
  error: string | null;
  lastUpdated: number;
}

export interface AdminState {
  isAdmin: boolean;
  showDebugPanel: boolean;
  debugData: any;
}

export interface RootState {
  auth: AuthState;
  music: MusicState;
  social: SocialState;
  admin: AdminState;
}

// Initial state
const initialState: RootState = {
  auth: {
    isAuthenticated: false,
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    user: null,
    authMethod: null,
  },
  music: {
    currentTrack: null,
    topTracks: [],
    recentlyPlayed: [],
    loading: false,
    error: null,
    lastUpdated: 0,
  },
  social: {
    followers: [],
    following: [],
    connections: [],
    feed: [],
    loading: false,
    error: null,
    lastUpdated: 0,
  },
  admin: {
    isAdmin: false,
    showDebugPanel: false,
    debugData: null,
  }
};

// Cache duration in milliseconds
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Store creation
export const useStore = create<
  RootState & {
    // Auth actions
    login: (params: { 
      accessToken: string; 
      refreshToken: string; 
      expiresIn: number; 
      user: User; 
      method: 'farcaster' | 'spotify';
    }) => void;
    logout: () => void;
    updateUser: (user: Partial<User>) => void;
    linkAccounts: (farcasterUser: Partial<User>, spotifyUser: Partial<User>) => void;
    refreshAuth: (accessToken: string, expiresIn: number) => void;
    
    // Music actions
    setCurrentTrack: (track: any) => void;
    setTopTracks: (tracks: any[]) => void;
    setRecentlyPlayed: (tracks: any[]) => void;
    fetchMusicData: () => Promise<void>;
    
    // Social actions
    setFollowers: (followers: any[]) => void;
    setFollowing: (following: any[]) => void;
    updateFeed: (items: any[]) => void;
    connectUser: (user: User) => void;
    
    // Admin actions
    setAdmin: (isAdmin: boolean) => void;
    toggleDebugPanel: () => void;
    setDebugData: (data: any) => void;
    
    // Utilities
    isMusicStale: () => boolean;
    isSocialStale: () => boolean;
    resetState: () => void;
  }
>(persist(
  immer((set, get) => ({
    ...initialState,
    
    // Auth actions
    login: ({ accessToken, refreshToken, expiresIn, user, method }) => set(state => {
      const existingMethod = state.auth.authMethod;
      const newMethod = existingMethod === 'farcaster' && method === 'spotify' ? 'both' :
                        existingMethod === 'spotify' && method === 'farcaster' ? 'both' :
                        method;
      
      // Merge user data if already authenticated with another method
      const mergedUser = state.auth.user 
        ? { ...state.auth.user, ...user } 
        : user;
      
      state.auth = {
        isAuthenticated: true,
        accessToken,
        refreshToken,
        expiresAt: Date.now() + expiresIn * 1000,
        user: mergedUser,
        authMethod: newMethod,
      };
    }),
    
    logout: () => set(state => {
      state.auth = initialState.auth;
      state.music = initialState.music;
      state.social = initialState.social;
    }),
    
    updateUser: (userData) => set(state => {
      if (state.auth.user) {
        state.auth.user = { ...state.auth.user, ...userData };
      }
    }),
    
    linkAccounts: (farcasterUser, spotifyUser) => set(state => {
      state.auth.user = { 
        ...state.auth.user,
        ...farcasterUser,
        ...spotifyUser,
      };
      state.auth.authMethod = 'both';
      
      // Optional: Call API to persist linking on server
      if (farcasterUser.fid && spotifyUser.spotifyId) {
        fetch('/api/auth/link-accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fid: farcasterUser.fid,
            spotifyId: spotifyUser.spotifyId,
          }),
        }).catch(err => console.error('Error linking accounts:', err));
      }
    }),
    
    refreshAuth: (accessToken, expiresIn) => set(state => {
      state.auth.accessToken = accessToken;
      state.auth.expiresAt = Date.now() + expiresIn * 1000;
    }),
    
    // Music actions
    setCurrentTrack: (track) => set(state => {
      state.music.currentTrack = track;
      state.music.lastUpdated = Date.now();
    }),
    
    setTopTracks: (tracks) => set(state => {
      state.music.topTracks = tracks;
      state.music.lastUpdated = Date.now();
    }),
    
    setRecentlyPlayed: (tracks) => set(state => {
      state.music.recentlyPlayed = tracks;
      state.music.lastUpdated = Date.now();
    }),
    
    fetchMusicData: async () => {
      const { auth, isMusicStale } = get();
      
      // Skip if not authenticated or has valid cache
      if (!auth.isAuthenticated || !auth.accessToken || (!isMusicStale() && get().music.topTracks.length > 0)) {
        return;
      }
      
      try {
        set(state => { state.music.loading = true; state.music.error = null; });
        
        // Parallel data fetching
        const [topTracksResponse, recentResponse] = await Promise.all([
          fetch('/api/users/tracks?timeRange=short_term', {
            headers: { Authorization: `Bearer ${auth.accessToken}` }
          }),
          fetch('/api/users/recently-played', {
            headers: { Authorization: `Bearer ${auth.accessToken}` }
          })
        ]);
        
        // Process responses
        if (topTracksResponse.ok) {
          const topData = await topTracksResponse.json();
          set(state => { state.music.topTracks = topData.items || []; });
        }
        
        if (recentResponse.ok) {
          const recentData = await recentResponse.json();
          set(state => { state.music.recentlyPlayed = recentData.items || []; });
        }
        
        set(state => { 
          state.music.loading = false;
          state.music.lastUpdated = Date.now();
        });
      } catch (error) {
        console.error('Error fetching music data:', error);
        set(state => { 
          state.music.loading = false;
          state.music.error = error instanceof Error ? error.message : 'Unknown error';
        });
      }
    },
    
    // Social actions
    setFollowers: (followers) => set(state => {
      state.social.followers = followers;
      state.social.lastUpdated = Date.now();
    }),
    
    setFollowing: (following) => set(state => {
      state.social.following = following;
      state.social.lastUpdated = Date.now();
    }),
    
    updateFeed: (items) => set(state => {
      state.social.feed = items;
      state.social.lastUpdated = Date.now();
    }),
    
    connectUser: (user) => set(state => {
      // Check if user already exists
      if (!state.social.connections.some(u => 
        (u.fid && user.fid && u.fid === user.fid) || 
        (u.spotifyId && user.spotifyId && u.spotifyId === user.spotifyId)
      )) {
        state.social.connections.push(user);
      }
    }),
    
    // Admin actions
    setAdmin: (isAdmin) => set(state => {
      state.admin.isAdmin = isAdmin;
    }),
    
    toggleDebugPanel: () => set(state => {
      state.admin.showDebugPanel = !state.admin.showDebugPanel;
    }),
    
    setDebugData: (data) => set(state => {
      state.admin.debugData = data;
    }),
    
    // Utilities
    isMusicStale: () => {
      const { music } = get();
      return Date.now() - music.lastUpdated > CACHE_DURATION;
    },
    
    isSocialStale: () => {
      const { social } = get();
      return Date.now() - social.lastUpdated > CACHE_DURATION;
    },
    
    resetState: () => set(initialState),
  })),
  {
    name: 'timbra-root-store',
    storage: createJSONStorage(() => sessionStorage),
    partialize: (state) => ({
      auth: {
        isAuthenticated: state.auth.isAuthenticated,
        accessToken: state.auth.accessToken,
        refreshToken: state.auth.refreshToken,
        expiresAt: state.auth.expiresAt,
        user: state.auth.user,
        authMethod: state.auth.authMethod,
      },
      admin: {
        isAdmin: state.admin.isAdmin,
      }
    }),
  }
));

// Selector hooks with shallow comparison to prevent unnecessary re-renders
export const useAuth = () => useStore(
  state => ({
    ...state.auth,
    isExpired: () => state.auth.expiresAt ? Date.now() > state.auth.expiresAt : true,
    getDisplayName: () => {
      const user = state.auth.user;
      return user?.displayName || user?.username || user?.spotifyDisplayName || 'User';
    },
    getProfileImage: () => {
      const user = state.auth.user;
      return user?.pfpUrl || (user?.spotifyImages && user.spotifyImages.length > 0 ? user.spotifyImages[0].url : undefined);
    }
  }),
  shallow
);

export const useMusic = () => useStore(
  state => ({
    ...state.music,
    isStale: state.isMusicStale,
    fetchData: state.fetchMusicData,
  }),
  shallow
);

export const useSocial = () => useStore(
  state => ({
    ...state.social,
    isStale: state.isSocialStale,
  }),
  shallow
);

export const useAdmin = () => useStore(
  state => ({
    ...state.admin,
    toggle: state.toggleDebugPanel,
    setData: state.setDebugData,
  }),
  shallow
);