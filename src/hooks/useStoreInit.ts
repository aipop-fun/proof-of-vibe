"use client";

import { useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useStore } from '~/lib/stores/rootStore';

interface SessionUser {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  fid?: number;
  spotifyId?: string;
  name?: string;
  email?: string;
  image?: string;
}

/**
 * Hook to initialize and sync the Zustand store with session data
 * and handle auto-fetching of music and social data
 */
export default function useStoreInit() {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';
  
  // Store actions
  const {
    auth,
    login,
    logout,
    fetchMusicData,
    isMusicStale
  } = useStore();
  
  // Sync session with store
  const syncSession = useCallback(() => {
    if (isLoading) return;
    
    if (session?.user) {
      // Extract user data from session
      const {
        accessToken,
        refreshToken,
        expiresAt,
        fid,
        spotifyId,
        name,
        email,
        image
      } = session.user as SessionUser;
      
      // Determine auth method
      const method = spotifyId ? 'spotify' : 'farcaster';
      
      // Calculate expires in (seconds)
      const now = Date.now();
      const expiresIn = expiresAt ? Math.floor((expiresAt - now) / 1000) : 3600;
      
      if (accessToken) {
        login({
          accessToken,
          refreshToken: refreshToken || '',
          expiresIn,
          user: {
            fid: fid,
            spotifyId: spotifyId,
            username: name,
            displayName: name,
            spotifyEmail: email,
            pfpUrl: image
          },
          method
        });
      }
    } else if (auth.isAuthenticated) {
      // Logout if session is gone but store still thinks we're authenticated
      logout();
    }
  }, [session, isLoading, login, logout, auth.isAuthenticated]);
  
  // Initialize store with session data when session loads or changes
  useEffect(() => {
    syncSession();
  }, [syncSession]);
  
  // Auto-fetch music data when stale and authenticated
  useEffect(() => {
    if (auth.isAuthenticated && isMusicStale()) {
      fetchMusicData();
    }
    
    // Set up refresh interval for music data
    const refreshInterval = setInterval(() => {
      if (auth.isAuthenticated && isMusicStale()) {
        fetchMusicData();
      }
    }, 60000); // Refresh every minute if stale
    
    return () => clearInterval(refreshInterval);
  }, [auth.isAuthenticated, isMusicStale, fetchMusicData]);
  
  return {
    initialized: !isLoading,
    isAuthenticated: auth.isAuthenticated
  };
}