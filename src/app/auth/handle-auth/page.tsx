/* eslint-disable  @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '~/lib/stores/authStore';
import { signIn as nextAuthSignIn } from "next-auth/react";
import sdk from "@farcaster/frame-sdk";

export default function HandleAuth() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isProcessing, setIsProcessing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFromMiniApp, setIsFromMiniApp] = useState(false);
    const [authType, setAuthType] = useState<'spotify' | 'farcaster' | null>(null);
    const [sourceFid, setSourceFid] = useState<string | null>(null);

    // Access Zustand store for saving data
    const {
        setSpotifyAuth,
        setFarcasterAuth,
        linkAccounts,
        fid
    } = useAuthStore();

    useEffect(() => {
        async function processAuthData() {
            try {
                // Determine authentication type by checking URL parameters
                const accessToken = searchParams.get('access_token');
                const farcasterFid = searchParams.get('fid');
                const message = searchParams.get('message');
                const signature = searchParams.get('signature');
                const state = searchParams.get('state');

                // Check if we came from mini app
                const source = searchParams.get('source');
                const paramFid = searchParams.get('fid');

                if (source === 'miniapp') {
                    setIsFromMiniApp(true);
                    if (paramFid) {
                        setSourceFid(paramFid);
                    }
                }

                // Determine authentication type
                if (accessToken) {
                    // Spotify authentication
                    setAuthType('spotify');
                    await handleSpotifyAuth();
                } else if (farcasterFid || (message && signature)) {
                    // Farcaster authentication
                    setAuthType('farcaster');
                    await handleFarcasterAuth();
                } else {
                    throw new Error('Unknown authentication type or missing parameters');
                }
            } catch (err) {
                console.error('Error processing auth data:', err);
                setError(err instanceof Error ? err.message : 'Failed to process authentication data');
            } finally {
                setIsProcessing(false);
            }
        }

        processAuthData();
    }, []);

    // Handle Spotify authentication
    async function handleSpotifyAuth() {
        try {
            // Extract Spotify authentication parameters
            const accessToken = searchParams.get('access_token');
            const refreshToken = searchParams.get('refresh_token');
            const expiresIn = searchParams.get('expires_in');
            const spotifyId = searchParams.get('spotify_id');
            const displayName = searchParams.get('display_name');
            const email = searchParams.get('email');
            const image = searchParams.get('image');
            const authSuccess = searchParams.get('auth_success');

            // Verify authentication was successful
            if (authSuccess !== 'true' || !accessToken || !refreshToken || !spotifyId) {
                throw new Error('Spotify authentication failed or incomplete data received');
            }

            // Save Spotify data to Zustand store
            setSpotifyAuth({
                accessToken,
                refreshToken,
                expiresIn: expiresIn ? parseInt(expiresIn) : 3600,
                tokenTimestamp: Date.now(),
                spotifyId,
                displayName: displayName || '',
                email: email || '',
                profileImage: image || '',
            });

            // Calculate which FID to use for linking accounts
            const fidToUse = sourceFid || fid;

            // Link accounts if we have a FID
            if (fidToUse && spotifyId) {
                console.log(`Linking accounts for FID: ${fidToUse} and Spotify ID: ${spotifyId}`);

                // Call API to link accounts
                const linkResult = await linkAccounts(Number(fidToUse), spotifyId);

                if (!linkResult.success) {
                    console.warn("Account linking warning:", linkResult.error);
                    // We continue even if linking fails - we can try again later
                }
            }

            // Decide where to redirect
            if (isFromMiniApp) {
                // Return to the app in Warpcast after a small delay
                setTimeout(() => {
                    window.location.href = 'https://warpcast.com/~/apps/timbra';
                }, 1500);
            } else {
                // Redirect to dashboard
                router.push('/');
            }
        } catch (err) {
            throw err;
        }
    }

    // Handle Farcaster authentication
    async function handleFarcasterAuth() {
        try {
            // Extract Farcaster authentication parameters
            const fidParam = searchParams.get('fid');
            const username = searchParams.get('username');
            const displayName = searchParams.get('display_name');
            const status = searchParams.get('status');
            const state = searchParams.get('state');
            const message = searchParams.get('message');
            const signature = searchParams.get('signature');

            // Verify state parameter to prevent CSRF attacks
            const storedState = sessionStorage.getItem("farcaster_auth_state");

            if (state && storedState && state !== storedState) {
                throw new Error("Invalid authentication state. Please try again.");
            }

            // Clear state from storage once used
            if (state && storedState) {
                sessionStorage.removeItem("farcaster_auth_state");
            }

            // Check if Farcaster authentication has status parameter and was successful
            if (status && status !== "success") {
                throw new Error("Farcaster authentication failed. Please try again.");
            }

            // We need a FID to proceed
            if (!fidParam) {
                throw new Error("Could not identify your Farcaster account");
            }

            const fid = parseInt(fidParam, 10);

            // Fetch additional user data if needed
            let userData = {
                username: username || "",
                displayName: displayName || ""
            };

            if (!username || !displayName) {
                try {
                    const response = await fetch(`/api/neynar/search?query=${fid}`);
                    const data = await response.json();
                    if (data.users && data.users.length > 0) {
                        userData = {
                            username: data.users[0].username || "",
                            displayName: data.users[0].displayName || data.users[0].username || ""
                        };
                    }
                } catch (error) {
                    console.error("Error fetching additional user data:", error);
                }
            }

            // Store Farcaster auth info in Zustand store
            setFarcasterAuth({
                fid,
                username: userData.username,
                displayName: userData.displayName
            });

            // Complete authentication with NextAuth if message and signature are provided
            if (message && signature) {
                try {
                    const authResult = await nextAuthSignIn("credentials", {
                        message,
                        signature,
                        redirect: false
                    });

                    if (authResult?.error) {
                        console.warn("NextAuth warning:", authResult.error);
                        // Continue even if NextAuth has an issue
                    }
                } catch (error) {
                    console.error("NextAuth error:", error);
                    // Continue even if NextAuth fails, as we have the FID
                }
            }

            // Decide where to redirect
            if (isFromMiniApp) {
                // Return to the app in Warpcast after a short delay
                setTimeout(() => {
                    window.location.href = 'https://warpcast.com/~/apps/timbra';
                }, 1500);
            } else {
                // Redirect to home page
                router.push('/');
            }
        } catch (err) {
            throw err;
        }
    }

    // UI for success message based on auth type
    const renderSuccessMessage = () => {
        if (authType === 'spotify') {
            return (
                <>
                    <h1 className="text-xl font-bold mb-2">Successfully Connected!</h1>
                    <p className="text-gray-300 mb-2">Your Spotify account has been linked.</p>
                </>
            );
        } else {
            return (
                <>
                    <h1 className="text-xl font-bold mb-2">Successfully Signed In!</h1>
                    <p className="text-gray-300 mb-2">You've been authenticated with Farcaster.</p>
                </>
            );
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-gradient-to-b from-purple-900 to-black text-white">
            <div className="max-w-md w-full bg-black/50 p-8 rounded-xl shadow-lg backdrop-blur text-center">
                {isProcessing ? (
                    <>
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-6"></div>
                        <h1 className="text-xl font-bold mb-2">Processing Your Authentication</h1>
                        <p className="text-gray-300">Please wait while we finish setting up your account...</p>
                    </>
                ) : error ? (
                    <>
                        <div className="w-12 h-12 bg-red-600/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold mb-2">Authentication Error</h1>
                        <p className="text-red-400 mb-4">{error}</p>
                        <button
                            onClick={() => router.push('/')}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"
                        >
                            Return to Dashboard
                        </button>
                    </>
                ) : (
                    <>
                        <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        {renderSuccessMessage()}
                        {isFromMiniApp ? (
                            <p className="text-green-400">Returning to Warpcast...</p>
                        ) : (
                            <button
                                onClick={() => router.push('/')}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg mt-4"
                            >
                                Continue to Dashboard
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}