/* eslint-disable  @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */

"use client";

import { useCallback, useState } from "react";
import { signIn, getCsrfToken } from "next-auth/react";
import sdk, { SignIn as SignInCore } from "@farcaster/frame-sdk";
import { Button } from "~/components/ui/Button";

export function SignInWithFarcaster() {
    const [signingIn, setSigningIn] = useState(false);
    const [signInFailure, setSignInFailure] = useState("");
    const [isSDKReady, setIsSDKReady] = useState(false);

    // Check if the SDK is available
    useState(() => {
        // Use a small delay to ensure SDK is properly initialized
        const timer = setTimeout(() => {
            const sdkAvailable = !!(sdk && typeof sdk.actions?.signIn === 'function');
            setIsSDKReady(sdkAvailable);
            if (!sdkAvailable) {
                console.warn("Farcaster SDK not available or not properly initialized");
            }
        }, 1000);

        return () => clearTimeout(timer);
    });

    const getNonce = useCallback(async () => {
        try {
            const nonce = await getCsrfToken();
            if (!nonce) {
                console.error("Failed to get CSRF token for authentication");
                throw new Error("Unable to generate authentication token");
            }
            return nonce;
        } catch (error) {
            console.error("Error getting CSRF token:", error);
            throw error;
        }
    }, []);

    const handleSignIn = useCallback(async () => {
        try {
            setSigningIn(true);
            setSignInFailure("");

            // Verify SDK is available
            if (!isSDKReady) {
                setSignInFailure("Farcaster login is not available at the moment. Please try again later.");
                console.error("SDK not properly initialized for sign-in attempt");
                return;
            }

            console.log("Starting Farcaster sign-in process");
            const nonce = await getNonce();
            console.log("Got authentication nonce, proceeding with sign-in");

            // Try to sign in with Farcaster
            const result = await sdk.actions.signIn({ nonce });
            console.log("Sign-in response received:", result);

            if (!result || !result.message || !result.signature) {
                throw new Error("Invalid response from Farcaster sign-in");
            }

            // Complete the authentication with NextAuth
            const authResult = await signIn("credentials", {
                message: result.message,
                signature: result.signature,
                redirect: false,
            });

            if (authResult?.error) {
                console.error("NextAuth sign-in failed:", authResult.error);
                setSignInFailure(`Authentication failed: ${authResult.error}`);
            } else {
                console.log("Sign-in successful");
            }
        } catch (error) {
            console.error("Sign-in error:", error);

            // Handle specific error types
            if (error instanceof SignInCore.RejectedByUser) {
                setSignInFailure("Sign-in was rejected");
            } else if (error instanceof Error) {
                setSignInFailure(`Error: ${error.message}`);
            } else {
                setSignInFailure("An unknown error occurred during sign-in");
            }
        } finally {
            setSigningIn(false);
        }
    }, [getNonce, isSDKReady]);

    return (
        <div className="flex flex-col items-center">
            <Button
                onClick={handleSignIn}
                disabled={signingIn || !isSDKReady}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full font-medium"
            >
                {signingIn
                    ? "Signing in..."
                    : !isSDKReady
                        ? "Farcaster Login Initializing..."
                        : "Sign in with Farcaster"}
            </Button>

            {signInFailure && (
                <p className="mt-4 text-red-400 text-sm">{signInFailure}</p>
            )}
        </div>
    );
}