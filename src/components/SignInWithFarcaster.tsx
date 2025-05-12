/* eslint-disable   @typescript-eslint/no-unused-vars,  @typescript-eslint/ban-ts-comment, prefer-const */
// @ts-nocheck
// src/components/SignInWithFarcaster.tsx
"use client";

import { useCallback, useState, useEffect } from "react";
import { signIn as nextAuthSignIn, getCsrfToken } from "next-auth/react";
import sdk, { SignIn as SignInCore } from "@farcaster/frame-sdk";
import { Button } from "~/components/ui/Button";
import { useAuthStore } from "~/lib/stores/authStore";
import { useRouter } from "next/navigation";

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
    const router = useRouter();

    // Access the authentication store
    const { setFarcasterAuth } = useAuthStore();

    // Verify SDK availability and detect environment after component mount
    useEffect(() => {
        const checkSDK = async () => {
            try {
                const sdkAvailable = typeof sdk !== 'undefined' &&
                    typeof sdk.actions !== 'undefined' &&
                    typeof sdk.actions.signIn === 'function';

                // Detect if running as a mini app inside Farcaster
                const isFarcasterMiniApp = window.parent !== window ||
                    !!window.location.href.match(/fc-frame=|warpcast\.com/i);

                setIsSDKReady(sdkAvailable);
                setIsMiniApp(isFarcasterMiniApp);

                // If we're in a mini app and SDK is available, try to get user context
                if (sdkAvailable && isFarcasterMiniApp) {
                    try {
                        const context = await sdk.context;
                        if (context?.user?.fid) {
                            // Auto-authenticate if we have user FID from context
                            setFarcasterAuth({ fid: context.user.fid });

                            // Notify frame we're ready
                            try {
                                await sdk.actions.ready();
                            } catch (readyError) {
                                console.error("Error calling ready:", readyError);
                            }
                        }
                    } catch (contextError) {
                        console.error("Error accessing Farcaster context:", contextError);
                    }
                }
            } catch (error) {
                console.error("Error checking SDK availability:", error);
            }
        };

        checkSDK();
    }, [setFarcasterAuth]);

    /**
     * Retrieves a CSRF token for authentication security
     */
    const getNonce = useCallback(async () => {
        try {
            const nonce = await getCsrfToken();
            if (!nonce) {
                throw new Error("Failed to generate authentication token");
            }
            return nonce;
        } catch (error) {
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

            // Ensure SDK is available before proceeding
            if (!isSDKReady) {
                setSignInFailure("Farcaster login is not available at the moment");
                setSigningIn(false);
                return;
            }

            // Check if we're in a mini app and have context
            if (isMiniApp) {
                try {
                    const farcasterContext = await sdk.context;
                    if (farcasterContext?.user?.fid) {
                        // We have FID directly from context
                        setFarcasterAuth({ fid: farcasterContext.user.fid });
                        router.push('/');
                        setSigningIn(false);
                        return;
                    }
                } catch (contextError) {
                    console.error("Failed to access Farcaster context:", contextError);
                    // Continue with normal flow if context access fails
                }
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

                // Store authentication data
                setFarcasterAuth({ fid });

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
                if (error instanceof SignInCore.RejectedByUser) {
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
    }, [getNonce, isSDKReady, isMiniApp, setFarcasterAuth, router]);

    return (
        <div className="flex flex-col items-center">
            <Button
                onClick={handleSignIn}
                disabled={signingIn || !isSDKReady}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full font-medium w-full"
            >
                {signingIn
                    ? "Signing in..."
                    : !isSDKReady
                        ? "Initializing..."
                        : "Sign in with Farcaster"}
            </Button>

            {signInFailure && (
                <p className="mt-4 text-red-400 text-sm">{signInFailure}</p>
            )}
        </div>
    );
}