/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/ban-ts-comment, prefer-const, react/no-unescaped-entities */
// @ts-nocheck

"use client";

import { useCallback, useState, useEffect } from "react";
import { signIn as nextAuthSignIn, getCsrfToken } from "next-auth/react";
import { sdk, isInMiniApp } from "@farcaster/frame-sdk";
import { Button } from "~/components/ui/Button";
import { useAuthStore } from "~/lib/stores/authStore";
import { useRouter } from "next/navigation";
import QRCode from 'react-qr-code';

/**
 * SignInWithFarcaster component
 * Handles the authentication flow with Farcaster using the Frame SDK
 * Works in both regular web context and Farcaster mini app context
 */
export function SignInWithFarcaster() {
    const [signingIn, setSigningIn] = useState(false);
    const [signInFailure, setSignInFailure] = useState<string | null>(null);
    const [isSDKReady, setIsSDKReady] = useState(false);
    const [isMiniApp, setIsMiniApp] = useState(false);
    const [showQRCode, setShowQRCode] = useState(false);
    const [qrValue, setQrValue] = useState('');
    const router = useRouter();

    // Access the authentication store
    const { setFarcasterAuth } = useAuthStore();

    // Generate state parameter for security (prevent CSRF)
    const generateStateParam = () => {
        return Math.random().toString(36).substring(2, 15);
    };

    // Construct login URL for QR code
    const getLoginUrl = useCallback(() => {
        const baseURL = process.env.NEXT_PUBLIC_URL || window.location.origin;
        const state = generateStateParam();

        // Store state in sessionStorage for verification in callback
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('farcaster_auth_state', state);
        }

        // Create the callback URL with state parameter
        const callbackUrl = `${baseURL}/auth/handle-auth`;

        // Create the SIWF URL with proper parameters
        return `https://warpcast.com/~/sign-in-with-farcaster?${new URLSearchParams({
            uri: callbackUrl,
            state: state
        })}`;
    }, []);

    // Verify SDK availability and detect environment after component mount
    useEffect(() => {
        const checkEnvironment = async () => {
            try {
                // Check if we're in a Mini App environment
                const miniAppCheck = await isInMiniApp();
                setIsMiniApp(miniAppCheck);

                // Check if SDK is available and has signIn method
                const sdkAvailable = typeof sdk !== 'undefined' &&
                    typeof sdk.actions !== 'undefined' &&
                    typeof sdk.actions.signIn === 'function';

                setIsSDKReady(sdkAvailable);

                // Auto-authenticate if we're in a mini app and SDK is available
                if (sdkAvailable && miniAppCheck) {
                    try {
                        const context = await sdk.context;
                        if (context?.user?.fid) {
                            // Fetch user data before authenticating
                            const userData = await fetchUserProfile(context.user.fid);

                            // Set auth information
                            setFarcasterAuth({
                                fid: context.user.fid,
                                username: userData?.username,
                                displayName: userData?.displayName
                            });

                            // Notify frame we're ready
                            try {
                                await sdk.actions.ready();
                                router.push('/');
                            } catch (readyError) {
                                console.error("Error calling ready:", readyError);
                            }
                        }
                    } catch (contextError) {
                        console.error("Error accessing Farcaster context:", contextError);
                    }
                }

                // Prepare QR code URL for non-mini app environments
                if (!miniAppCheck) {
                    setQrValue(getLoginUrl());
                }
            } catch (error) {
                console.error("Error checking environment:", error);
            }
        };

        checkEnvironment();
    }, [setFarcasterAuth, getLoginUrl, router]);

    /**
     * Function to fetch the user's Farcaster profile
     */
    const fetchUserProfile = async (fid) => {
        try {
            const response = await fetch(`/api/neynar/search?query=${fid}`);
            if (!response.ok) {
                throw new Error("Failed to fetch user profile");
            }

            const data = await response.json();
            if (data.users && data.users.length > 0) {
                return data.users[0];
            }
            return null;
        } catch (error) {
            console.error("Error fetching user profile:", error);
            return null;
        }
    };

    /**
     * Retrieves a CSRF token for authentication security
     */
    const getNonce = useCallback(async () => {
        try {
            // First try to use the NextAuth getCsrfToken function
            let nonce = await getCsrfToken();

            // If that fails, try our custom CSRF API route
            if (!nonce) {
                const response = await fetch('/api/auth/csrf');
                if (!response.ok) {
                    throw new Error("Failed to fetch CSRF token");
                }
                const data = await response.json();
                nonce = data.csrfToken;
            }

            if (!nonce) {
                throw new Error("Failed to generate authentication token");
            }

            return nonce;
        } catch (error) {
            console.error("Error getting CSRF token:", error);
            throw new Error("Error obtaining authentication token");
        }
    }, []);

    /**
     * Handles the Farcaster sign-in process
     */
    const handleSignIn = useCallback(async () => {
        try {
            setSigningIn(true);
            setSignInFailure(null);

            // If not in mini app, show QR code instead of direct login
            if (!isMiniApp) {
                setShowQRCode(true);
                setSigningIn(false);
                return;
            }

            // Ensure SDK is available before proceeding
            if (!isSDKReady) {
                setSignInFailure("Farcaster login is not available at the moment");
                setSigningIn(false);
                return;
            }

            // Check if we're in a mini app and have context
            try {
                const farcasterContext = await sdk.context;
                if (farcasterContext?.user?.fid) {
                    // Fetch user data
                    const userData = await fetchUserProfile(farcasterContext.user.fid);

                    // We have FID directly from context
                    setFarcasterAuth({
                        fid: farcasterContext.user.fid,
                        username: userData?.username,
                        displayName: userData?.displayName
                    });

                    router.push('/');
                    setSigningIn(false);
                    return;
                }
            } catch (contextError) {
                console.error("Failed to access Farcaster context:", contextError);
                // Continue with normal flow if context access fails
            }

            // Obtain security token
            const nonce = await getNonce();

            try {
                // Attempt authentication with Farcaster
                const result = await sdk.actions.signIn({
                    nonce,
                    // Enable auth address authentication for better UX
                    acceptAuthAddress: true
                });

                if (!result || typeof result !== 'object') {
                    throw new Error("Invalid authentication response");
                }

                // Extract user identifier from response
                let fid = 0;
                let messageData = result.message;

                // Handle various response formats
                if (typeof messageData === 'string') {
                    // Parse JSON if the response appears to be in JSON format
                    if (messageData.startsWith('{')) {
                        try {
                            const parsedMessage = JSON.parse(messageData);
                            fid = parsedMessage.fid ||
                                (parsedMessage.message && parsedMessage.message.fid) || 0;
                        } catch {
                            // If JSON parsing fails, attempt to extract FID using regex
                            const fidMatch = messageData.match(/fid[:=]\s*(\d+)/i);
                            if (fidMatch && fidMatch[1]) {
                                fid = parseInt(fidMatch[1], 10);
                            }
                        }
                    } else {
                        // Direct regex extraction for non-JSON formatted strings
                        const fidMatch = messageData.match(/fid[:=]\s*(\d+)/i);
                        if (fidMatch && fidMatch[1]) {
                            fid = parseInt(fidMatch[1], 10);
                        }
                    }
                } else if (typeof messageData === 'object' && messageData !== null) {
                    // Direct extraction when response is already an object
                    fid = messageData.fid ||
                        (messageData.message && messageData.message.fid) || 0;
                }

                // Validate that a user identifier was obtained
                if (!fid) {
                    throw new Error("Could not identify your Farcaster account");
                }

                // Fetch user data to get username/displayName
                const userData = await fetchUserProfile(fid);

                // Store authentication data
                setFarcasterAuth({
                    fid,
                    username: userData?.username,
                    displayName: userData?.displayName
                });

                // Complete authentication with NextAuth for session management
                const authResult = await nextAuthSignIn("credentials", {
                    message: result.message,
                    signature: result.signature,
                    redirect: false,
                });

                if (authResult?.error) {
                    throw new Error(authResult.error);
                }

                // Navigate to main application on successful authentication
                router.push('/');
            } catch (error) {
                // Handle specific error types with appropriate user messaging
                if (error.name === "RejectedByUser") {
                    setSignInFailure("Authentication rejected by user");
                } else if (error.message?.includes("Cannot read properties of undefined")) {
                    setSignInFailure("Communication error with Farcaster. Please try again in a compatible browser.");
                } else {
                    setSignInFailure(error.message || "Authentication failed");
                }
            }
        } catch (error) {
            setSignInFailure(error instanceof Error ? error.message : "Login error");
        } finally {
            setSigningIn(false);
        }
    }, [getNonce, isSDKReady, isMiniApp, setFarcasterAuth, router, fetchUserProfile]);

    return (
        <div className="flex flex-col items-center">
            {showQRCode ? (
                <div className="flex flex-col items-center">
                    <div className="bg-white p-4 rounded-lg mb-4">
                        <QRCode
                            size={240}
                            value={qrValue}
                            viewBox="0 0 240 240"
                        />
                    </div>
                    <p className="text-center text-gray-300 mb-4">
                        Scan this QR code with your phone's camera<br />
                        or the Warpcast app to sign in.
                    </p>
                    <Button
                        onClick={() => setShowQRCode(false)}
                        className="text-sm bg-transparent hover:bg-purple-800 border border-purple-600 text-white px-4 py-2 rounded-full mt-2"
                    >
                        Go Back
                    </Button>
                </div>
            ) : (
                <>
                    <Button
                        onClick={handleSignIn}
                        disabled={signingIn}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full font-medium w-full"
                    >
                        {signingIn
                            ? "Signing in..."
                            : "Sign in with Farcaster"}
                    </Button>

                    {signInFailure && (
                        <p className="mt-4 text-red-400 text-sm">{signInFailure}</p>
                    )}
                </>
            )}
        </div>
    );
}