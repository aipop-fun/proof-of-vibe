/* eslint-disable  @typescript-eslint/no-unused-vars, react/no-unescaped-entities */
"use client";

import React, { useState } from 'react';
import { Button } from "~/components/ui/Button";
import { useFrame } from "./providers/FrameProvider";
import { useAuth } from "~/lib/hooks/useAuth";
import QRCode from 'react-qr-code';

export function SpotifyConnect({ onBack }: { onBack: () => void }) {
    const { isMiniApp, context } = useFrame();
    const { user, navigate } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Generate Spotify auth URL
    const spotifyAuthUrl = `${process.env.NEXT_PUBLIC_URL || window.location.origin}/api/auth/signin/spotify?source=${isMiniApp ? 'miniapp' : 'web'}&fid=${user.fid || ''}`;

    const handleConnectSpotify = () => {
        setIsLoading(true);
        setErrorMessage(null);

        try {
            // Use the navigate helper from useAuth that respects the environment
            navigate(spotifyAuthUrl, false); // false = internal navigation (same window in miniapp)
        } catch (error) {
            console.error('Error connecting to Spotify:', error);
            setErrorMessage('Failed to connect to Spotify. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <div
            className="flex flex-col items-center justify-center min-h-screen px-4 py-6 text-center"
            style={isMiniApp ? {
                paddingTop: context?.client.safeAreaInsets?.top ?? 0,
                paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
                paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
                paddingRight: context?.client.safeAreaInsets?.right ?? 0,
            } : {}}
        >
            {/* Logo e título */}
            <div className="mb-6">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.6 0-.359.24-.66.54-.78 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.242 1.021zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold">Connect Spotify</h1>
                <p className="text-gray-400 mt-2">
                    Link your Spotify account to share your music with Farcaster friends.
                </p>
            </div>

            {/* Environment-specific instructions */}
            {isMiniApp ? (
                <div className="mb-6">
                    <p className="text-sm text-blue-400 mb-4">
                        🔗 You're in a Farcaster app! Click below to connect.
                    </p>
                </div>
            ) : (
                <>
                    {/* QR Code for web users */}
                    <div className="bg-white p-4 rounded-lg mb-6">
                        <QRCode
                            size={200}
                            value={spotifyAuthUrl}
                            viewBox={`0 0 200 200`}
                        />
                    </div>

                    {/* Instructions for web */}
                    <div className="mb-6">
                        <p className="text-sm text-gray-300 mb-2">
                            Scan this code with your camera or click the button below to connect.
                        </p>
                    </div>
                </>
            )}

            {/* Error message */}
            {errorMessage && (
                <div className="text-red-400 text-sm mb-4 p-3 bg-red-900/30 rounded-lg">
                    {errorMessage}
                </div>
            )}

            {/* Connect button */}
            <div className="flex flex-col w-full max-w-xs gap-3">
                <Button
                    onClick={handleConnectSpotify}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg flex items-center justify-center gap-2"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <span className="animate-spin mr-2">↻</span>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.6 0-.359.24-.66.54-.78 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.242 1.021zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                        </svg>
                    )}
                    {isLoading ? "Connecting..." : "Connect Spotify"}
                </Button>

                <button
                    onClick={onBack}
                    className="text-gray-400 hover:text-white text-sm py-2"
                >
                    Skip for now
                </button>
            </div>

            {/* Privacy info */}
            <div className="mt-8 text-xs text-gray-500 max-w-xs">
                <p>
                    By connecting, you're allowing Timbra to access your Spotify listening data.
                    We only use this to show what you're playing to your friends.
                </p>

                {isMiniApp && (
                    <p className="mt-2 text-blue-400">
                        Note: After connecting, you may need to refresh the app to see your music.
                    </p>
                )}
            </div>
        </div>
    );
}