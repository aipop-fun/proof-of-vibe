/* eslint-disable  @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */

"use client";

import { useCallback, useState } from "react";
import { signIn, getCsrfToken } from "next-auth/react";
import sdk, { SignIn as SignInCore } from "@farcaster/frame-sdk";
import { Button } from "~/components/ui/Button";

export function SignInWithFarcaster() {
    const [signingIn, setSigningIn] = useState(false);
    const [signInFailure, setSignInFailure] = useState("");
    const [debugInfo, setDebugInfo] = useState(null);

    const getNonce = useCallback(async () => {
        try {
            const nonce = await getCsrfToken();
            if (!nonce) throw new Error("Unable to generate nonce");
            return nonce;
        } catch (error) {
            console.error("Error getting CSRF token:", error);
            setSignInFailure("Failed to get authentication token");
            throw error;
        }
    }, []);

    const handleSignIn = useCallback(async () => {
        try {
            setSigningIn(true);
            setSignInFailure("");
            setDebugInfo(null);

            const nonce = await getNonce();
            console.log("Got nonce:", nonce);

            // Check if SDK is properly initialized
            if (!sdk || !sdk.actions || typeof sdk.actions.signIn !== 'function') {
                setSignInFailure("Farcaster SDK not properly initialized");
                console.error("SDK not initialized correctly:", sdk);
                return;
            }

            // This is specifically addressing the "Cannot read properties of undefined (reading 'result')" error
            // Call signIn through a modified approach to handle the specific error you're encountering
            try {
                // Direct call, avoiding the destructuring that might be causing issues
                const signInResponse = await sdk.actions.signIn({ nonce });
                console.log("Raw sign-in response:", signInResponse);

                // Try to access data in different ways based on the response structure
                let message, signature;

                if (signInResponse && typeof signInResponse === 'object') {
                    // Try different property paths that might exist
                    if (signInResponse.message && signInResponse.signature) {
                        // Standard path
                        message = signInResponse.message;
                        signature = signInResponse.signature;
                        // @ts-expect-error
                    } else if (signInResponse.result && signInResponse.result.message && signInResponse.result.signature) {
                        // Nested result object path
                        // @ts-expect-error
                        message = signInResponse.result.message;
                        // @ts-expect-error
                        signature = signInResponse.result.signature;
                        // @ts-expect-error
                    } else if (signInResponse.data && signInResponse.data.message && signInResponse.data.signature) {
                        // Nested data object path
                        // @ts-expect-error
                        message = signInResponse.data.message;
                        // @ts-expect-error
                        signature = signInResponse.data.signature;
                    }
                }

                // Debug logging
                setDebugInfo({
                    // @ts-expect-error
                    rawResponse: signInResponse,
                    extractedMessage: message,
                    extractedSignature: signature,
                });

                // If we couldn't extract the needed data, throw an error
                if (!message || !signature) {
                    throw new Error("Could not extract message and signature from sign-in response");
                }

                // Proceed with NextAuth signIn using the extracted data
                const authResult = await signIn("credentials", {
                    message: message,
                    signature: signature,
                    redirect: false,
                });

                if (authResult?.error) {
                    setSignInFailure(`Authentication failed: ${authResult.error}`);
                }
            } catch (sdkError) {
                console.error("SDK signIn error:", sdkError);
                if (sdkError instanceof SignInCore.RejectedByUser) {
                    setSignInFailure("Sign-in rejected by user");
                } else {
                    // @ts-expect-error
                    setSignInFailure(`SDK Error: ${sdkError.message || "Unknown SDK error"}`);
                }
            }
        } catch (e) {
            console.error("General signin error:", e);
            // @ts-expect-error
            setSignInFailure(`Error: ${e.message || "Unknown error"}`);
        } finally {
            setSigningIn(false);
        }
    }, [getNonce]);

    // For debugging in development only
    const mockSignIn = useCallback(async () => {
        try {
            setSigningIn(true);
            // Simulate a successful sign-in with NextAuth directly
            await signIn("credentials", {
                message: "mock_message",
                signature: "mock_signature",
                redirect: false,
            });
        } catch (e) {
            console.error("Mock sign-in error:", e);
            setSignInFailure("Mock sign-in failed");
        } finally {
            setSigningIn(false);
        }
    }, []);

    return (
        <div className="flex flex-col items-center">
            <Button
                onClick={handleSignIn}
                disabled={signingIn}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full font-medium"
            >
                {signingIn ? "Signing in..." : "Sign in with Farcaster"}
            </Button>

            {process.env.NODE_ENV === 'development' && (
                <Button
                    onClick={mockSignIn}
                    disabled={signingIn}
                    className="mt-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-full font-medium text-sm"
                >
                    DEV: Mock Sign-in
                </Button>
            )}

            {signInFailure && (
                <p className="mt-4 text-red-400 text-sm">{signInFailure}</p>
            )}

            {debugInfo && process.env.NODE_ENV === 'development' && (
                <div className="mt-4 p-2 bg-gray-800 rounded-lg text-xs text-gray-300 font-mono">
                    <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
                </div>
            )}
        </div>
    );
}