/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
//@ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useProfile } from '@farcaster/auth-kit';
import { useUserStore } from '~/lib/stores/userStore';

// Declaring a global interface to avoid TypeScript errors
declare global {
    interface Window {
        FrameSDK?: any;
    }
}

export function useAuth() {
    const [isMiniApp, setIsMiniApp] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Use the official AuthKit useProfile hook for web context
    const { isAuthenticated: isAuthKitAuthenticated, profile } = useProfile();

    // Get user state and actions from our store
    const {
        farcaster,
        spotify,
        isAuthenticated,
        setFarcasterUser,
        setSpotifyUser,
        linkAccounts,
        logout,
        getDisplayName,
        getProfileImage
    } = useUserStore();

    // Check if we're in a Mini App environment
    useEffect(() => {
        async function checkEnvironment() {
            try {
                // We can determine if we're in a mini app by checking if we're in an iframe
                // or by checking for certain URL parameters
                const inIframe = window !== window.parent;
                const url = new URL(window.location.href);
                const hasFrameParam = url.searchParams.has('fc-frame');
                const isWarpcast = url.hostname.includes('warpcast.com');
                const miniAppParam = url.searchParams.get('miniApp') === 'true' ||
                    url.pathname.includes('/miniapp');

                // If any of these conditions are true, we're likely in a mini app
                const isMiniAppEnv = inIframe || hasFrameParam || isWarpcast || miniAppParam;

                setIsMiniApp(isMiniAppEnv);

                // If we're in a mini app, try to access the SDK context as confirmation
                if (isMiniAppEnv && window.FrameSDK) {
                    try {
                        const sdk = window.FrameSDK;
                        if (sdk && sdk.context) {
                            console.log("Successfully connected to Farcaster Mini App context");
                        }
                    } catch (error) {
                        console.error("Error accessing Mini App context:", error);
                        // If we can't access the context, we're probably not in a mini app
                        setIsMiniApp(false);
                    }
                }
            } catch (error) {
                console.error('Error checking Mini App environment:', error);
                setIsMiniApp(false);
            } finally {
                setIsLoading(false);
            }
        }

        // Check environment with a small delay to allow scripts to load
        const timer = setTimeout(checkEnvironment, 500);
        return () => clearTimeout(timer);
    }, []);

    // If we're in a Mini App, get user info from the context
    useEffect(() => {
        if (isMiniApp === true && window.FrameSDK) {
            const initMiniAppAuth = async () => {
                try {
                    // Get context from frame-sdk
                    const sdk = window.FrameSDK;
                    const context = await sdk.context;

                    if (context?.user) {
                        // Set Farcaster user from context
                        setFarcasterUser({
                            fid: context.user.fid,
                            username: context.user.username,
                            displayName: context.user.displayName,
                            pfpUrl: context.user.pfpUrl,
                        });

                        // If we have an FID, try to fetch linked Spotify account from our API
                        if (context.user.fid) {
                            try {
                                const response = await fetch(`/api/users/${context.user.fid}`);
                                if (response.ok) {
                                    const userData = await response.json();
                                    if (userData.spotify) {
                                        setSpotifyUser(userData.spotify, userData.spotifyToken, userData.spotifyRefreshToken, userData.spotifyExpiresIn);
                                    }
                                }
                            } catch (error) {
                                console.error('Error fetching user data:', error);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error initializing Mini App auth:', error);
                }
            };

            initMiniAppAuth();
        }
    }, [isMiniApp, setFarcasterUser, setSpotifyUser]);

    // For web environment, sync AuthKit profile with our store
    useEffect(() => {
        if (!isMiniApp && isAuthKitAuthenticated && profile) {
            // Set Farcaster user in our store from AuthKit profile
            setFarcasterUser({
                fid: profile.fid,
                username: profile.username,
                displayName: profile.displayName,
                pfpUrl: profile.pfpUrl,
            });

            // Fetch additional data from backend (like linked Spotify account)
            fetch(`/api/users/${profile.fid}`)
                .then(response => {
                    if (response.ok) return response.json();
                    throw new Error('Failed to fetch user data');
                })
                .then(userData => {
                    if (userData.spotify) {
                        setSpotifyUser(
                            userData.spotify,
                            userData.spotifyToken,
                            userData.spotifyRefreshToken,
                            userData.spotifyExpiresIn
                        );
                    }
                })
                .catch(error => {
                    console.error('Error fetching user data:', error);
                });
        }
    }, [isMiniApp, isAuthKitAuthenticated, profile, setFarcasterUser, setSpotifyUser]);

    // For web environment, handle Spotify auth
    const loginWithSpotify = useCallback(() => {
        if (isMiniApp) {
            console.error('Spotify login not supported in Mini App environment');
            return;
        }

        // Redirect to Spotify auth endpoint
        window.location.href = '/api/auth/signin/spotify';
    }, [isMiniApp]);

    // Expose a consistent API regardless of environment
    return {
        // State
        isLoading,
        isMiniApp,
        isAuthenticated: isAuthKitAuthenticated || isAuthenticated,
        user: {
            farcaster,
            spotify,
            displayName: getDisplayName(),
            profileImage: getProfileImage(),
        },

        // Actions
        loginWithSpotify: isMiniApp ? undefined : loginWithSpotify,
        logout: isMiniApp ? undefined : logout,

        // For linking accounts
        linkAccounts,
    };
}