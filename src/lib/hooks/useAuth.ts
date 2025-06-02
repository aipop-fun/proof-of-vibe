/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment, react-hooks/exhaustive-deps */
//@ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useProfile } from '@farcaster/auth-kit';
import { useAuthStore } from '~/lib/stores/authStore';
import sdk from "@farcaster/frame-sdk";

// Declaring a global interface to avoid TypeScript errors
declare global {
    interface Window {
        FrameSDK?: any;
    }
}

export function useAuth() {
    const [isLoading, setIsLoading] = useState(true);

    // Use the official AuthKit useProfile hook for web context
    const { isAuthenticated: isAuthKitAuthenticated, profile } = useProfile();

    // Get unified auth state and actions from our store
    const {
        // State
        farcaster,
        spotify,
        isAuthenticated,
        isMiniApp,
        authMethod,
        isLinked,
        fid,
        spotifyId,
        userId,
        accessToken,

        // Actions
        setFarcasterUser,
        setSpotifyUser,
        setMiniAppStatus,
        linkAccounts: linkAccountsStore,
        clearAuth,
        getDisplayName,
        getProfileImage,

        // Music actions
        fetchCurrentlyPlaying,
        currentlyPlaying
    } = useAuthStore();

    // Detect Mini App environment and initialize
    useEffect(() => {
        async function initializeAuth() {
            try {
                // Check for Mini App environment
                const inIframe = window !== window.parent;
                const url = new URL(window.location.href);
                const hasFrameParam = url.searchParams.has('fc-frame');
                const isWarpcast = url.hostname.includes('warpcast.com');
                const miniAppParam = url.searchParams.get('miniApp') === 'true' ||
                    url.pathname.includes('/miniapp');

                const isMiniAppEnv = inIframe || hasFrameParam || isWarpcast || miniAppParam;

                // Update store with environment status
                setMiniAppStatus(isMiniAppEnv);

                console.log('Environment detected:', {
                    isMiniApp: isMiniAppEnv,
                    inIframe,
                    hasFrameParam,
                    isWarpcast,
                    miniAppParam
                });

                // Initialize based on environment
                if (isMiniAppEnv) {
                    await initMiniAppAuth();
                } else {
                    await initWebAuth();
                }

            } catch (error) {
                console.error('Error initializing auth:', error);
            } finally {
                setIsLoading(false);
            }
        }

        initializeAuth();
    }, [setMiniAppStatus, setFarcasterUser, setSpotifyUser]);

    // Initialize Mini App authentication
    const initMiniAppAuth = async () => {
        try {
            // Try to access Farcaster Frame SDK
            if (typeof window !== 'undefined' && window.parent !== window) {
                // We're in an iframe, try to get context from parent
                const context = await sdk.context;

                if (context?.user) {
                    console.log('Mini App context found:', context.user);

                    // Set Farcaster user from context
                    setFarcasterUser({
                        fid: context.user.fid,
                        username: context.user.username,
                        displayName: context.user.displayName,
                        pfpUrl: context.user.pfpUrl,
                    });

                    // Try to fetch linked Spotify account from our API
                    if (context.user.fid) {
                        await fetchUserData(context.user.fid);
                    }
                } else {
                    console.log('No Mini App context available');
                }
            }
        } catch (error) {
            console.error('Error initializing Mini App auth:', error);
        }
    };

    // Initialize Web authentication
    const initWebAuth = async () => {
        try {
            // Check if we have persisted auth state
            if (isAuthenticated && fid) {
                // We have persisted auth, try to refresh user data
                await fetchUserData(fid);
            }

            // Sync with AuthKit if available
            if (isAuthKitAuthenticated && profile) {
                console.log('AuthKit profile found:', profile);

                setFarcasterUser({
                    fid: profile.fid,
                    username: profile.username,
                    displayName: profile.displayName,
                    pfpUrl: profile.pfpUrl,
                });

                // Fetch additional data from backend
                await fetchUserData(profile.fid);
            }
        } catch (error) {
            console.error('Error initializing web auth:', error);
        }
    };

    // Fetch user data from API
    const fetchUserData = async (userFid: number) => {
        try {
            const response = await fetch(`/api/users/${userFid}`);
            if (response.ok) {
                const userData = await response.json();

                if (userData.spotify) {
                    setSpotifyUser(
                        userData.spotify,
                        userData.spotifyToken,
                        userData.spotifyRefreshToken,
                        userData.spotifyExpiresIn
                    );
                }

                // Update userId if we got it from the API
                if (userData.id && !userId) {
                    // We need to update the userId in the store
                    // This could be done through a separate action
                    console.log('User ID from API:', userData.id);
                }
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    // Navigation helper that respects the environment
    const navigate = useCallback((url: string, external: boolean = false) => {
        if (isMiniApp) {
            if (external && typeof sdk?.actions?.openUrl === 'function') {
                // External links in mini app
                sdk.actions.openUrl(url);
            } else {
                // Internal navigation in mini app - use same window
                window.location.href = url;
            }
        } else {
            if (external) {
                // External links in web - open new tab
                window.open(url, '_blank');
            } else {
                // Internal navigation in web
                window.location.href = url;
            }
        }
    }, [isMiniApp]);

    // Spotify login that respects environment
    const loginWithSpotify = useCallback(() => {
        if (isMiniApp) {
            // In mini app, open Spotify auth in same window
            const spotifyAuthUrl = `/api/auth/signin/spotify?source=miniapp&fid=${fid}`;
            navigate(spotifyAuthUrl, false);
        } else {
            // In web, redirect normally
            window.location.href = '/api/auth/signin/spotify';
        }
    }, [isMiniApp, fid, navigate]);

    // Logout that works in all environments
    const logout = useCallback(() => {
        clearAuth();
        if (!isMiniApp) {
            // Only redirect in web environment
            window.location.href = '/';
        }
    }, [clearAuth, isMiniApp]);

    // Auto-fetch music data if authenticated
    useEffect(() => {
        if (isAuthenticated && spotifyId && accessToken && !currentlyPlaying) {
            // Initial fetch of currently playing
            fetchCurrentlyPlaying().catch(console.error);
        }
    }, [isAuthenticated, spotifyId, accessToken, currentlyPlaying, fetchCurrentlyPlaying]);

    // Expose a consistent API regardless of environment
    return {
        // State
        isLoading,
        isMiniApp,
        isAuthenticated: isAuthKitAuthenticated || isAuthenticated,
        isLinked,
        authMethod,

        // User data
        user: {
            farcaster,
            spotify,
            fid,
            spotifyId,
            userId,
            displayName: getDisplayName(),
            profileImage: getProfileImage(),
        },

        // Actions
        loginWithSpotify,
        logout: isMiniApp ? undefined : logout,
        navigate,

        // For linking accounts - use the store function directly
        linkAccounts: linkAccountsStore,

        // Music data
        currentlyPlaying,
    };
}