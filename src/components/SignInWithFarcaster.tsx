/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/ban-ts-comment */
"use client";

import { useCallback, useState, useEffect } from "react";
import { signIn as nextAuthSignIn, getCsrfToken } from "next-auth/react";
import sdk from "@farcaster/frame-sdk";
import { Button } from "~/components/ui/Button";
import { useAuthStore } from "~/lib/stores/authStore";
import { useRouter } from "next/navigation";

export function SignInWithFarcaster() {
    const [signingIn, setSigningIn] = useState(false);
    const [signInError, setSignInError] = useState<string | null>(null);
    const router = useRouter();
    const { setFarcasterAuth } = useAuthStore();

    // Main authentication handler
    const handleSignIn = useCallback(async () => {
        try {
            setSigningIn(true);
            setSignInError(null);

            // Check SDK availability
            if (!sdk?.actions?.signIn) {
                throw new Error("Farcaster authentication unavailable");
            }

            // Try silent authentication in mini app context
            try {
                const isMiniApp = await sdk.isInMiniApp();
                if (isMiniApp) {
                    const context = await sdk.context;
                    if (context?.user?.fid) {
                        setFarcasterAuth({
                            fid: context.user.fid,
                            username: context.user.username,
                            displayName: context.user.displayName,
                            pfpUrl: context.user.pfpUrl
                        });
                        await sdk.actions.ready();
                        router.push('/');
                        return;
                    }
                }
            } catch (contextError) {
                console.warn("Mini app context unavailable, falling back to normal flow");
            }

            // Regular authentication flow
            const nonce = await getCsrfToken() || crypto.randomUUID();
            const { message, signature } = await sdk.actions.signIn({ nonce });

            // Validate response
            if (typeof message !== 'string' || typeof signature !== 'string') {
                throw new Error("Invalid authentication response");
            }

            // Parse message payload
            let messagePayload;
            try {
                messagePayload = JSON.parse(message);
            } catch (e) {
                throw new Error("Failed to parse authentication message");
            }

            // Store auth data
            setFarcasterAuth({
                fid: messagePayload.fid,
                username: messagePayload.username,
                displayName: messagePayload.displayName,
                pfpUrl: messagePayload.pfpUrl
            });

            // Complete NextAuth flow
            const result = await nextAuthSignIn("credentials", {
                message,
                signature,
                redirect: false,
            });

            if (result?.error) throw new Error(result.error);
            router.push('/');

        } catch (error) {
            setSignInError(
                error instanceof Error ? error.message : "Authentication failed"
            );
        } finally {
            setSigningIn(false);
        }
    }, [setFarcasterAuth, router]);

    return (
        <div className="flex flex-col items-center gap-4">
            <Button
                onClick={handleSignIn}
                disabled={signingIn}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full font-medium"
                data-testid="farcaster-signin-button"
            >
                {signingIn ? "Signing in..." : "Sign in with Farcaster"}
            </Button>

            {signInError && (
                <p className="text-red-400 text-sm max-w-xs text-center">
                    {signInError}
                </p>
            )}
        </div>
    );
}