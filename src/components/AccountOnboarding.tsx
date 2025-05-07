/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react/no-unescaped-entities */
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAuthStore } from "~/lib/stores/authStore";
import { Button } from "~/components/ui/Button";
import { SignInWithFarcaster } from "~/components/SignInWithFarcaster";
import { useAccountLinking } from "~/hooks/useAccountLinking";

/**
 * Step-by-step onboarding flow for connecting Spotify and Farcaster accounts
 */
export function AccountOnboarding() {
    const { data: session } = useSession();
    const [showOnboarding, setShowOnboarding] = useState(false);

    // Get auth state from Zustand store
    const {
        spotifyId,
        fid,
        isAuthenticated,
        isLinked
    } = useAuthStore();

    // Use the account linking hook
    const {
        linkAccounts,
        isLinking,
        error,
        success
    } = useAccountLinking();

    // Determine if we should show onboarding
    useEffect(() => {
        // Only show onboarding if authenticated but not fully set up
        if (isAuthenticated && !isLinked) {
            setShowOnboarding(true);
        } else {
            setShowOnboarding(false);
        }
    }, [isAuthenticated, isLinked]);

    // Calculate current step
    const getCurrentStep = () => {
        if (!spotifyId && !fid) return 0; // No accounts connected
        if (spotifyId && !fid) return 1; // Only Spotify connected
        if (!spotifyId && fid) return 2; // Only Farcaster connected
        if (spotifyId && fid && !isLinked) return 3; // Both connected but not linked
        return 4; // All done
    };

    const currentStep = getCurrentStep();

    // Don't show anything if we don't need to
    if (!showOnboarding) {
        return null;
    }

    return (
        <div className="p-6 rounded-lg bg-gradient-to-br from-purple-900/50 to-indigo-900/50 mb-6">
            <h2 className="text-xl font-bold mb-4">Set Up Your Account</h2>
            <p className="text-gray-300 mb-6">
                Connect your Spotify and Farcaster accounts to share your music with the Farcaster community.
            </p>

            <div className="space-y-6">
                {/* Step 1: Connect Spotify */}
                <div className={`${currentStep >= 1 ? 'opacity-100' : 'opacity-50'}`}>
                    <div className="flex items-center mb-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${spotifyId ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'
                            }`}>
                            {spotifyId ? '✓' : '1'}
                        </div>
                        <h3 className="font-semibold">Connect Spotify</h3>
                    </div>

                    {!spotifyId && currentStep === 0 && (
                        <div className="ml-9 mt-2">
                            <Button
                                onClick={() => window.location.href = '/api/auth/signin/spotify'}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                Connect Spotify
                            </Button>
                        </div>
                    )}

                    {spotifyId && (
                        <p className="ml-9 text-sm text-green-400">
                            ✓ Spotify successfully connected
                        </p>
                    )}
                </div>

                {/* Step 2: Connect Farcaster */}
                <div className={`${currentStep >= 1 ? 'opacity-100' : 'opacity-50'}`}>
                    <div className="flex items-center mb-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${fid ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'
                            }`}>
                            {fid ? '✓' : '2'}
                        </div>
                        <h3 className="font-semibold">Connect Farcaster</h3>
                    </div>

                    {!fid && (currentStep === 1 || currentStep === 2) && (
                        <div className="ml-9 mt-2">
                            <SignInWithFarcaster />
                        </div>
                    )}

                    {fid && (
                        <p className="ml-9 text-sm text-green-400">
                            ✓ Farcaster successfully connected
                        </p>
                    )}
                </div>

                {/* Step 3: Link Accounts */}
                <div className={`${currentStep >= 3 ? 'opacity-100' : 'opacity-50'}`}>
                    <div className="flex items-center mb-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${isLinked ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'
                            }`}>
                            {isLinked ? '✓' : '3'}
                        </div>
                        <h3 className="font-semibold">Link Your Accounts</h3>
                    </div>

                    {currentStep === 3 && (
                        <div className="ml-9 mt-2">
                            {error && (
                                <div className="bg-red-900/30 text-red-200 p-3 rounded mb-3 text-sm">
                                    {error}
                                </div>
                            )}

                            {success ? (
                                <p className="text-sm text-green-400">
                                    ✓ Accounts successfully linked
                                </p>
                            ) : (
                                <Button
                                    onClick={linkAccounts}
                                    disabled={isLinking}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    {isLinking ? "Linking Accounts..." : "Link Accounts"}
                                </Button>
                            )}
                        </div>
                    )}

                    {isLinked && (
                        <p className="ml-9 text-sm text-green-400">
                            ✓ Accounts successfully linked
                        </p>
                    )}
                </div>
            </div>

            {/* Success State */}
            {isLinked && (
                <div className="mt-6 p-4 bg-green-900/20 rounded-lg">
                    <p className="text-green-400 font-medium">
                        🎉 All set! Your Spotify and Farcaster accounts are now connected.
                    </p>
                    <p className="text-sm text-gray-300 mt-2">
                        You can now share your music with friends and discover what they're listening to.
                    </p>
                </div>
            )}
        </div>
    );
}