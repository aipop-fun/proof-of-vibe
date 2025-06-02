/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect } from 'react';
import { useAuthStore } from '~/lib/stores/authStore';
import { NavigationHelper } from '~/lib/utils/navigation';
import sdk from "@farcaster/frame-sdk";

/**
 * Component to initialize authentication state across the app
 * Should be mounted at the root level to ensure consistent auth state
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
    const {
        setMiniAppStatus,
        setFarcasterUser,
        setSpotifyUser,
        isAuthenticated,
        fid,
        isMiniApp
    } = useAuthStore();

    // Initialize environment and auth on mount
    useEffect(() => {
        let isMounted = true;

        const initializeAuth = async () => {
            try {
                // 1. Detect environment
                const isMiniAppEnv = NavigationHelper.detectEnvironment();
                setMiniAppStatus(isMiniAppEnv);

                console.log('AuthInitializer: Environment detected', {
                    isMiniApp: isMiniAppEnv,
                    hasExistingAuth: isAuthenticated,
                    fid
                });

                // 2. Initialize based on environment
                if (isMiniAppEnv) {
                    await initializeMiniApp();
                } else {
                    await initializeWeb();
                }

                // 3. If we have FID but no detailed user data, fetch it
                if (fid && isMounted) {
                    await fetchUserData(fid);
                }

            } catch (error) {
                console.error('AuthInitializer: Error during initialization', error);
            }
        };

        // Initialize with a small delay to allow other components to mount
        const timer = setTimeout(initializeAuth, 100);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, []); // Only run once on mount

    // Initialize Mini App context
    const initializeMiniApp = async () => {
        try {
            // Wait for SDK to be ready
            if (typeof window !== 'undefined') {
                const context = await sdk.context;

                if (context?.user) {
                    console.log('AuthInitializer: Mini App context found', context.user);

                    setFarcasterUser({
                        fid: context.user.fid,
                        username: context.user.username,
                        displayName: context.user.displayName,
                        pfpUrl: context.user.pfpUrl,
                    });
                }
            }
        } catch (error) {
            console.error('AuthInitializer: Error accessing Mini App context', error);
        }
    };

    // Initialize Web environment
    const initializeWeb = async () => {
        try {
            // Check for auth tokens in URL params (after OAuth redirect)
            const urlParams = new URLSearchParams(window.location.search);
            const hasAuthParams = urlParams.has('code') || urlParams.has('access_token');

            if (hasAuthParams) {
                console.log('AuthInitializer: OAuth redirect detected, handling auth');
                // Let the auth flow handle this
                return;
            }

            // If we have persisted auth but no active session, validate it
            if (isAuthenticated && fid) {
                console.log('AuthInitializer: Validating persisted auth');
                // The auth store will handle token refresh automatically
            }
        } catch (error) {
            console.error('AuthInitializer: Error in web initialization', error);
        }
    };

    // Fetch user data from API
    const fetchUserData = async (userFid: number) => {
        try {
            console.log('AuthInitializer: Fetching user data for FID', userFid);

            const response = await fetch(`/api/users/${userFid}`, {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const userData = await response.json();
                console.log('AuthInitializer: User data fetched', userData);

                // Update Farcaster user if we got more details
                if (userData.farcaster) {
                    setFarcasterUser(userData.farcaster);
                }

                // Update Spotify user if linked
                if (userData.spotify) {
                    setSpotifyUser(
                        userData.spotify,
                        userData.spotifyToken,
                        userData.spotifyRefreshToken,
                        userData.spotifyExpiresIn
                    );
                }
            } else {
                console.log('AuthInitializer: User data not found or error', response.status);
            }
        } catch (error) {
            console.error('AuthInitializer: Error fetching user data', error);
        }
    };

    // Listen for auth state changes and handle accordingly
    useEffect(() => {
        if (isAuthenticated && isMiniApp !== null) {
            console.log('AuthInitializer: Auth state changed', {
                isAuthenticated,
                isMiniApp,
                fid
            });

            // In mini app, call ready to dismiss splash screen
            if (isMiniApp && typeof sdk?.actions?.ready === 'function') {
                sdk.actions.ready().catch(console.error);
            }
        }
    }, [isAuthenticated, isMiniApp, fid]);

    // Handle authentication errors by clearing state
    useEffect(() => {
        const handleAuthError = (event: StorageEvent) => {
            if (event.key === 'auth-error') {
                console.log('AuthInitializer: Auth error detected, clearing state');
                // Could implement auth error handling here
            }
        };

        window.addEventListener('storage', handleAuthError);
        return () => window.removeEventListener('storage', handleAuthError);
    }, []);

    return <>{children}</>;
}

// Hook to ensure auth is initialized before using auth data
export function useAuthReady() {
    const { isAuthenticated, isMiniApp } = useAuthStore();

    // Auth is "ready" when we've determined the environment
    const isReady = isMiniApp !== null;

    return {
        isReady,
        isAuthenticated,
        isMiniApp
    };
}