/* eslint-disable @typescript-eslint/no-unused-vars */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk';

// Types for user data returned from Neynar
export interface NeynarUser {
  fid: number;
  username: string;
  displayName?: string;
  pfp?: string;  // profile picture
  followerCount?: number;
  followingCount?: number;
  lastActive?: number;
  isFollowing?: boolean;
  isFollower?: boolean;
  hasSpotify?: boolean;  // This would need to be determined separately
}

// Types for response data from Neynar API calls
export interface NeynarFollowersResponse {
  users: NeynarUser[];
  nextCursor?: string;
  total: number;
}

export interface NeynarFollowingResponse {
  users: NeynarUser[];
  nextCursor?: string;
  total: number;
}

export interface NeynarSearchResponse {
  users: NeynarUser[];
  total: number;
}

// Helper functions for Neynar API
const getNeynarClientForBrowser = () => {
  const apiKey = process.env.NEXT_PUBLIC_NEYNAR_API_KEY;
  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_NEYNAR_API_KEY is not configured');
  }

  // For browser use, we would typically call our own backend API
  // that has the Neynar client instantiated on the server
  return null;
};

// Main store state interface
interface NeynarState {
  // State
  followers: NeynarUser[];
  following: NeynarUser[];
  userInfo: Record<number, NeynarUser>;
  isLoadingFollowers: boolean;
  isLoadingFollowing: boolean;
  isSearching: boolean;
  error: string | null;
  hasFetchedFollowers: boolean;
  hasFetchedFollowing: boolean;
  followersNextCursor: string | null;
  followingNextCursor: string | null;
  
  // Helper method to get cached user
  getUserInfo: (fid: number) => NeynarUser | null;

  // API Actions
  fetchFollowers: (fid: number, limit?: number) => Promise<NeynarFollowersResponse | null>;
  fetchMoreFollowers: (fid: number, limit?: number) => Promise<NeynarFollowersResponse | null>;
  fetchFollowing: (fid: number, limit?: number) => Promise<NeynarFollowingResponse | null>;
  fetchMoreFollowing: (fid: number, limit?: number) => Promise<NeynarFollowingResponse | null>;
  searchUsers: (query: string, limit?: number) => Promise<NeynarSearchResponse | null>;
  getUserSpotifyStatus: (fids: number[]) => Promise<Record<number, boolean>>;
  clearError: () => void;
  resetState: () => void;
}

const useNeynarStore = create<NeynarState>()(
  persist(
    (set, get) => ({
      // Initial state
      followers: [],
      following: [],
      userInfo: {},
      isLoadingFollowers: false,
      isLoadingFollowing: false,
      isSearching: false,
      error: null,
      hasFetchedFollowers: false,
      hasFetchedFollowing: false,
      followersNextCursor: null,
      followingNextCursor: null,

      // Helper method to get cached user info
      getUserInfo: (fid: number) => {
        return get().userInfo[fid] || null;
      },

      // API Actions
      fetchFollowers: async (fid: number, limit = 50) => {
        if (!fid) {
          set({ error: 'Invalid FID provided' });
          return null;
        }

        set({ isLoadingFollowers: true, error: null });

        try {
          // In a real implementation, we would call our backend API
          // which would use the Neynar SDK to fetch followers
          const response = await fetch(`/api/neynar/followers?fid=${fid}&limit=${limit}`);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch followers: ${response.statusText}`);
          }
          
          const data = await response.json() as NeynarFollowersResponse;
          
          // Update user info cache
          const userInfoUpdates: Record<number, NeynarUser> = {};
          data.users.forEach(user => {
            userInfoUpdates[user.fid] = { ...user, isFollower: true };
          });
          
          set(state => ({
            followers: data.users,
            userInfo: { ...state.userInfo, ...userInfoUpdates },
            isLoadingFollowers: false,
            hasFetchedFollowers: true,
            followersNextCursor: data.nextCursor || null
          }));
          
          return data;
        } catch (error) {
          console.error('Error fetching followers:', error);
          set({ 
            isLoadingFollowers: false,
            error: error instanceof Error ? error.message : 'Failed to load followers'
          });
          return null;
        }
      },

      fetchMoreFollowers: async (fid: number, limit = 50) => {
        const { followersNextCursor, isLoadingFollowers } = get();
        
        if (isLoadingFollowers || !followersNextCursor) {
          return null;
        }
        
        set({ isLoadingFollowers: true, error: null });
        
        try {
          const response = await fetch(`/api/neynar/followers?fid=${fid}&limit=${limit}&cursor=${followersNextCursor}`);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch more followers: ${response.statusText}`);
          }
          
          const data = await response.json() as NeynarFollowersResponse;
          
          // Update user info cache
          const userInfoUpdates: Record<number, NeynarUser> = {};
          data.users.forEach(user => {
            userInfoUpdates[user.fid] = { ...user, isFollower: true };
          });
          
          set(state => ({
            followers: [...state.followers, ...data.users],
            userInfo: { ...state.userInfo, ...userInfoUpdates },
            isLoadingFollowers: false,
            followersNextCursor: data.nextCursor || null
          }));
          
          return data;
        } catch (error) {
          console.error('Error fetching more followers:', error);
          set({ 
            isLoadingFollowers: false,
            error: error instanceof Error ? error.message : 'Failed to load more followers'
          });
          return null;
        }
      },

      fetchFollowing: async (fid: number, limit = 50) => {
        if (!fid) {
          set({ error: 'Invalid FID provided' });
          return null;
        }

        set({ isLoadingFollowing: true, error: null });

        try {
          const response = await fetch(`/api/neynar/following?fid=${fid}&limit=${limit}`);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch following: ${response.statusText}`);
          }
          
          const data = await response.json() as NeynarFollowingResponse;
          
          // Update user info cache
          const userInfoUpdates: Record<number, NeynarUser> = {};
          data.users.forEach(user => {
            userInfoUpdates[user.fid] = { ...user, isFollowing: true };
          });
          
          set(state => ({
            following: data.users,
            userInfo: { ...state.userInfo, ...userInfoUpdates },
            isLoadingFollowing: false,
            hasFetchedFollowing: true,
            followingNextCursor: data.nextCursor || null
          }));
          
          return data;
        } catch (error) {
          console.error('Error fetching following:', error);
          set({ 
            isLoadingFollowing: false,
            error: error instanceof Error ? error.message : 'Failed to load following'
          });
          return null;
        }
      },

      fetchMoreFollowing: async (fid: number, limit = 50) => {
        const { followingNextCursor, isLoadingFollowing } = get();
        
        if (isLoadingFollowing || !followingNextCursor) {
          return null;
        }
        
        set({ isLoadingFollowing: true, error: null });
        
        try {
          const response = await fetch(`/api/neynar/following?fid=${fid}&limit=${limit}&cursor=${followingNextCursor}`);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch more following: ${response.statusText}`);
          }
          
          const data = await response.json() as NeynarFollowingResponse;
          
          // Update user info cache
          const userInfoUpdates: Record<number, NeynarUser> = {};
          data.users.forEach(user => {
            userInfoUpdates[user.fid] = { ...user, isFollowing: true };
          });
          
          set(state => ({
            following: [...state.following, ...data.users],
            userInfo: { ...state.userInfo, ...userInfoUpdates },
            isLoadingFollowing: false,
            followingNextCursor: data.nextCursor || null
          }));
          
          return data;
        } catch (error) {
          console.error('Error fetching more following:', error);
          set({ 
            isLoadingFollowing: false,
            error: error instanceof Error ? error.message : 'Failed to load more following'
          });
          return null;
        }
      },

      searchUsers: async (query: string, limit = 20) => {
        if (!query || query.length < 2) {
          return null;
        }
        
        set({ isSearching: true, error: null });
        
        try {
          const response = await fetch(`/api/neynar/search?query=${encodeURIComponent(query)}&limit=${limit}`);
          
          if (!response.ok) {
            throw new Error(`Failed to search users: ${response.statusText}`);
          }
          
          const data = await response.json() as NeynarSearchResponse;
          
          // Update user info cache
          const userInfoUpdates: Record<number, NeynarUser> = {};
          data.users.forEach(user => {
            userInfoUpdates[user.fid] = user;
          });
          
          set(state => ({
            userInfo: { ...state.userInfo, ...userInfoUpdates },
            isSearching: false
          }));
          
          return data;
        } catch (error) {
          console.error('Error searching users:', error);
          set({ 
            isSearching: false,
            error: error instanceof Error ? error.message : 'Failed to search users'
          });
          return null;
        }
      },

      // This would need a backend endpoint to check user connections
      getUserSpotifyStatus: async (fids: number[]) => {
        if (!fids.length) {
          return {};
        }
        
        try {
          const response = await fetch('/api/users/spotify-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fids })
          });
          
          if (!response.ok) {
            throw new Error(`Failed to get Spotify status: ${response.statusText}`);
          }
          
          const data = await response.json() as Record<number, boolean>;
          
          // Update user info with Spotify status
          const updatedUserInfo: Record<number, NeynarUser> = {};
          Object.entries(data).forEach(([fidStr, hasSpotify]) => {
            const fid = parseInt(fidStr);
            const existingUser = get().userInfo[fid];
            if (existingUser) {
              updatedUserInfo[fid] = { ...existingUser, hasSpotify };
            }
          });
          
          set(state => ({
            userInfo: { ...state.userInfo, ...updatedUserInfo }
          }));
          
          return data;
        } catch (error) {
          console.error('Error getting Spotify status:', error);
          return {};
        }
      },

      clearError: () => set({ error: null }),
      
      resetState: () => set({
        followers: [],
        following: [],
        isLoadingFollowers: false,
        isLoadingFollowing: false,
        error: null,
        hasFetchedFollowers: false,
        hasFetchedFollowing: false,
        followersNextCursor: null,
        followingNextCursor: null
      })
    }),
    {
      name: 'neynar-store',
      partialize: (state) => ({
        // Only persist the user info cache to avoid refetching
        userInfo: state.userInfo
      })
    }
  )
);

export default useNeynarStore;
