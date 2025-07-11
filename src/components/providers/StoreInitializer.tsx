"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useStore } from "~/lib/stores/rootStore";

interface UserData {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  fid?: number;
  spotifyId?: string;
  name?: string;
  email?: string;
  image?: string;
}

export function StoreInitializer({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';
  
  // Store actions
  const {
    auth,
    login,
    logout,
    fetchMusicData,
    isMusicStale,
    setAdmin
  } = useStore();
  
  // Initialize store with session data
  useEffect(() => {
    if (isLoading) return;
    
    if (session?.user) {
      // Extract user data from session
      const user = session.user as UserData;
      
      // Check if session has token
      if (user.accessToken) {
        login({
          accessToken: user.accessToken,
          refreshToken: user.refreshToken || '',
          expiresIn: user.expiresIn || 3600,
          user: {
            fid: user.fid,
            spotifyId: user.spotifyId,
            username: user.name,
            displayName: user.name,
            spotifyEmail: user.email,
            pfpUrl: user.image
          },
          method: user.spotifyId ? 'spotify' : 'farcaster'
        });
        
        // Check if user is admin
        const adminUsers = process.env.NEXT_PUBLIC_ADMIN_USERS?.split(',') || [];
        const isUserAdmin = adminUsers.includes(user.email || '') || 
                            (user.fid && adminUsers.includes(user.fid.toString()));
        
        if (isUserAdmin) {
          setAdmin(true);
        }
      }
    } else if (auth.isAuthenticated) {
      // Logout if session is gone
      logout();
    }
  }, [session, isLoading, login, logout, auth.isAuthenticated, setAdmin]);
  
  // Auto-fetch music data when authenticated
  useEffect(() => {
    if (!isLoading && auth.isAuthenticated && isMusicStale()) {
      fetchMusicData();
    }
  }, [isLoading, auth.isAuthenticated, isMusicStale, fetchMusicData]);
  
  return <>{children}</>;
}