/* eslint-disable  @typescript-eslint/no-unused-vars, react/no-unescaped-entities */
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "~/components/ui/Button";
import { useFrame } from "./providers/FrameProvider";
import { useAuth } from "~/lib/hooks/useAuth";
import { useSpotifyReconnect } from "~/lib/hooks/useSpotifyReconnect";
import QRCode from 'react-qr-code';

interface SpotifyConnectProps {
    onBack: () => void;
    isReconnecting?: boolean;
}

export function SpotifyConnect({ onBack, isReconnecting = false }: SpotifyConnectProps) {
    const { isMiniApp, context } = useFrame();
    const { user, navigate } = useAuth();
    const { generateReconnectUrl } = useSpotifyReconnect();
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    
    const spotifyAuthUrl = isReconnecting
        ? generateReconnectUrl()
        : `${process.env.NEXT_PUBLIC_URL || window.location.origin}/api/auth/signin/spotify?source=${isMiniApp ? 'miniapp' : 'web'}&fid=${user?.fid || ''}`;


    const handleConnectSpotify = React.useCallback(() => {
        setIsLoading(true);
        setErrorMessage(null);

        try {
            navigate(spotifyAuthUrl, false); 
        } catch (error) {
            console.error('Error connecting to Spotify:', error);
            setErrorMessage('Failed to connect to Spotify. Please try again.');
            setIsLoading(false);
        }
    }, [navigate, spotifyAuthUrl]);

    
    useEffect(() => {
        if (isReconnecting && !isLoading) {
            const timer = setTimeout(() => {
                handleConnectSpotify();
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [isReconnecting, isLoading, handleConnectSpotify]);

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
            
            <div className="mb-6">
                <div className={`w-16 h-16 ${isReconnecting ? 'bg-orange-600' : 'bg-green-600'} rounded-full flex items-center justify-center mx-auto mb-3`}>
                    {isReconnecting ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9" />
                            <path d="M16 12l-4-4-4 4" />
                            <path d="M12 16V8" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.6 0-.359.24-.66.54-.78 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.242 1.021zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                        </svg>
                    )}
                </div>
                <h1 className="text-2xl font-bold">
                    {isReconnecting ? 'Reconnect Spotify' : 'Connect Spotify'}
                </h1>
                <p className="text-gray-400 mt-2">
                    {isReconnecting
                        ? "Your Spotify session has expired. Please reconnect to continue using music features."
                        : "Link your Spotify account to share your music with Farcaster friends."
                    }
                </p>
            </div>

            
            {isReconnecting && (
                <div className="mb-6 p-4 bg-orange-900/30 border border-orange-600/50 rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-400">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span className="text-orange-200 font-medium">Session Expired</span>
                    </div>
                    <p className="text-sm text-orange-200">
                        You'll be redirected to Spotify to reauthorize the connection in a moment...
                    </p>
                </div>
            )}

            
            {isMiniApp ? (
                <div className="mb-6">
                    <p className="text-sm text-blue-400 mb-4">
                        🔗 You're in a Farcaster app! Click below to {isReconnecting ? 'reconnect' : 'connect'}.
                    </p>
                </div>
            ) : (
                <>
            
                    <div className="bg-white p-4 rounded-lg mb-6">
                        <QRCode
                            size={200}
                            value={spotifyAuthUrl}
                            viewBox={`0 0 200 200`}
                        />
                    </div>

                    
                    <div className="mb-6">
                        <p className="text-sm text-gray-300 mb-2">
                            Scan this code with your camera or click the button below to {isReconnecting ? 'reconnect' : 'connect'}.
                        </p>
                    </div>
                </>
            )}

            
            {errorMessage && (
                <div className="text-red-400 text-sm mb-4 p-3 bg-red-900/30 rounded-lg">
                    {errorMessage}
                </div>
            )}

            
            <div className="flex flex-col w-full max-w-xs gap-3">
                <Button
                    onClick={handleConnectSpotify}
                    className={`w-full ${isReconnecting ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'} text-white py-3 rounded-lg flex items-center justify-center gap-2`}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <span className="animate-spin mr-2">↻</span>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.6 0-.359.24-.66.54-.78 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.242 1.021zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                        </svg>
                    )}
                    {isLoading
                        ? (isReconnecting ? "Reconnecting..." : "Connecting...")
                        : (isReconnecting ? "Reconnect Spotify" : "Connect Spotify")
                    }
                </Button>

                {!isReconnecting && (
                    <button
                        onClick={onBack}
                        className="text-gray-400 hover:text-white text-sm py-2"
                    >
                        Skip for now
                    </button>
                )}
            </div>

            
            <div className="mt-8 text-xs text-gray-500 max-w-xs">
                <p>
                    By {isReconnecting ? 'reconnecting' : 'connecting'}, you're allowing Timbra to access your Spotify listening data.
                    We only use this to show what you're playing to your friends.
                </p>

                {isMiniApp && (
                    <p className="mt-2 text-blue-400">
                        Note: After {isReconnecting ? 'reconnecting' : 'connecting'}, you may need to refresh the app to see your music.
                    </p>
                )}
            </div>
        </div>
    );
}