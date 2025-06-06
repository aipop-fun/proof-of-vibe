/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react/no-unescaped-entities, @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { Button } from "~/components/ui/Button";
import { SignInWithFarcaster } from "~/components/SignInWithFarcaster";
import { useAuth } from "~/lib/hooks/useAuth";

/**
 * Step-by-step onboarding flow for connecting Spotify and Farcaster accounts
 * Now using the unified auth store
 */
export function AccountOnboarding() {
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [isLinking, setIsLinking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Get auth state from unified hook
    const {
        isAuthenticated,
        isLinked,
        authMethod,
        user,
        isMiniApp,
        loginWithSpotify,
        linkAccounts,
        navigate
    } = useAuth();

    // Determine if we should show onboarding
    useEffect(() => {
        // Show onboarding if authenticated but not fully set up
        if (isAuthenticated && !isLinked) {
            setShowOnboarding(true);
        } else {
            setShowOnboarding(false);
        }
    }, [isAuthenticated, isLinked]);

    // Calculate current step
    const getCurrentStep = () => {
        if (!user.spotifyId && !user.fid) return 0; // No accounts connected
        if (user.spotifyId && !user.fid) return 1; // Only Spotify connected
        if (!user.spotifyId && user.fid) return 2; // Only Farcaster connected
        if (user.spotifyId && user.fid && !isLinked) return 3; // Both connected but not linked
        return 4; // All done
    };

    const currentStep = getCurrentStep();

    // Handle linking accounts
    const handleLinkAccounts = async () => {
        if (!user.fid || !user.spotifyId) {
            setError('Both accounts must be connected first');
            return;
        }

        setIsLinking(true);
        setError(null);

        try {
            // Use the correct linkAccounts signature: (fid: number, spotifyId: string)
            const result = await linkAccounts(user.fid, user.spotifyId);

            if (result.success) {
                setSuccess(true);
            } else {
                setError(result.error || 'Failed to link accounts');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to link accounts');
        } finally {
            setIsLinking(false);
        }
    };

    // Handle Spotify connection
    const handleConnectSpotify = () => {
        if (loginWithSpotify) {
            loginWithSpotify();
        } else {
            // In mini app, navigate to connection page
            navigate('/connect-spotify', false);
        }
    };

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

            {/* Environment indicator */}
            {isMiniApp && (
                <div className="mb-4 p-3 bg-blue-900/30 text-blue-200 rounded-lg text-sm">
                    🔗 You're using Timbra in a Farcaster app
                </div>
            )}

            <div className="space-y-6">
                {/* Step 1: Connect Spotify */}
                <div className={`${currentStep >= 1 ? 'opacity-100' : 'opacity-50'}`}>
                    <div className="flex items-center mb-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${user.spotifyId ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'
                            }`}>
                            {user.spotifyId ? '✓' : '1'}
                        </div>
                        <h3 className="font-semibold">Connect Spotify</h3>
                    </div>

                    {!user.spotifyId && currentStep === 0 && (
                        <div className="ml-9 mt-2">
                            <Button
                                onClick={handleConnectSpotify}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                Connect Spotify
                            </Button>
                        </div>
                    )}

                    {user.spotifyId && (
                        <p className="ml-9 text-sm text-green-400">
                            ✓ Spotify successfully connected as {user.spotify?.display_name || user.spotifyId}
                        </p>
                    )}
                </div>

                {/* Step 2: Connect Farcaster */}
                <div className={`${currentStep >= 1 ? 'opacity-100' : 'opacity-50'}`}>
                    <div className="flex items-center mb-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${user.fid ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'
                            }`}>
                            {user.fid ? '✓' : '2'}
                        </div>
                        <h3 className="font-semibold">Connect Farcaster</h3>
                    </div>

                    {!user.fid && (currentStep === 1 || currentStep === 2) && !isMiniApp && (
                        <div className="ml-9 mt-2">
                            <SignInWithFarcaster />
                        </div>
                    )}

                    {!user.fid && isMiniApp && (
                        <div className="ml-9 mt-2">
                            <p className="text-sm text-blue-400">
                                ✓ Farcaster connection is automatic in the app
                            </p>
                        </div>
                    )}

                    {user.fid && (
                        <p className="ml-9 text-sm text-green-400">
                            ✓ Farcaster successfully connected as {user.farcaster?.username || `FID: ${user.fid}`}
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
                                    onClick={handleLinkAccounts}
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

                    {isMiniApp && (
                        <p className="text-sm text-blue-400 mt-2">
                            Start playing music on Spotify to share it with your Farcaster friends!
                        </p>
                    )}
                </div>
            )}

            {/* Debug info (only in development) */}
            {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 p-3 bg-gray-900/50 rounded text-xs text-gray-400">
                    <p>Debug: Step {currentStep}, Auth: {authMethod}, Linked: {isLinked ? 'Yes' : 'No'}</p>
                    <p>FID: {user.fid || 'None'}, Spotify: {user.spotifyId || 'None'}</p>
                    <p>Environment: {isMiniApp ? 'Mini App' : 'Web'}</p>
                </div>
            )}
        </div>
    );
}