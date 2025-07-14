"use client";

import React, { useEffect, useState } from 'react';
import { Button } from "~/components/ui/Button";
import { useFrame } from "./providers/FrameProvider";
import { useAuthStore } from "~/lib/stores/authStore";


interface SpotifyReconnectHandlerProps {
    onReconnectClick?: () => void;
    variant?: 'inline' | 'modal' | 'page';
    showMessage?: boolean;
}

export function SpotifyReconnectHandler({ 
    onReconnectClick, 
    variant = 'inline',
    showMessage = true 
}: SpotifyReconnectHandlerProps) {
    const { isMiniApp, context } = useFrame();    
    const { 
        isAuthenticated, 
        spotifyId, 
        fid, 
        accessToken, 
        isExpired, 
        clearAuth,
        refreshTokenIfNeeded 
    } = useAuthStore();

    const [isReconnecting, setIsReconnecting] = useState(false);
    const [lastAttempt, setLastAttempt] = useState<number | null>(null);

    
    const needsReconnect = isAuthenticated && spotifyId && (!accessToken || isExpired());

    
    const getReconnectUrl = () => {
        const baseUrl = process.env.NEXT_PUBLIC_URL || window.location.origin;
        const params = new URLSearchParams({
            source: isMiniApp ? 'miniapp' : 'web',
            reconnect: 'true',
            ...(fid && { fid: fid.toString() })
        });
        return `${baseUrl}/api/auth/signin/spotify?${params.toString()}`;
    };

    
    const handleReconnect = async () => {
        setIsReconnecting(true);
        
        try {
            const tokenRefreshed = await refreshTokenIfNeeded();
            
            if (tokenRefreshed) {
                console.log('Token refreshed successfully, no reconnection needed');
                setIsReconnecting(false);
                return;
            }
            
            if (onReconnectClick) {
                onReconnectClick();
            } else {
                const reconnectUrl = getReconnectUrl();
                
                if (isMiniApp) {            
                    window.location.href = reconnectUrl;
                } else {            
                    window.location.href = reconnectUrl;
                }
            }
        } catch (error) {
            console.error('Error during reconnection:', error);
            
            clearAuth();
            const reconnectUrl = getReconnectUrl();
            window.location.href = reconnectUrl;
        } finally {
            setIsReconnecting(false);
            setLastAttempt(Date.now());
        }
    };

    
    useEffect(() => {
        if (needsReconnect && !lastAttempt && !isReconnecting) {    
            const timeoutId = setTimeout(() => {
                console.log('Auto-attempting Spotify reconnection...');
                handleReconnect();
            }, 2000);

            return () => clearTimeout(timeoutId);
        }
    }, [needsReconnect, lastAttempt, isReconnecting, handleReconnect]);

    
    if (!needsReconnect) {
        return null;
    }

    const reconnectMessage = showMessage ? (
        <div className="text-center mb-4">
            <p className="text-sm text-gray-300 mb-2">
                Your Spotify session has expired
            </p>
            <p className="text-xs text-gray-400">
                Please reconnect to continue using music features
            </p>
        </div>
    ) : null;

    const reconnectButton = (
        <Button
            onClick={handleReconnect}
            disabled={isReconnecting}
            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
        >
            {isReconnecting ? (
                <>
                    <span className="animate-spin">↻</span>
                    Reconnecting...
                </>
            ) : (
                <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.6 0-.359.24-.66.54-.78 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.242 1.021zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    Reconnect Spotify
                </>
            )}
        </Button>
    );

    
    switch (variant) {
        case 'modal':
            return (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full text-center">
                        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                <line x1="12" y1="9" x2="12" y2="13"/>
                                <line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold mb-2">Session Expired</h3>
                        {reconnectMessage}
                        {reconnectButton}
                    </div>
                </div>
            );

        case 'page':
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
                    <div className="w-20 h-20 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                    </div>
                    
                    <h1 className="text-2xl font-bold mb-4">Spotify Session Expired</h1>
                    {reconnectMessage}
                    
                    <div className="max-w-xs">
                        {reconnectButton}
                        
                        <div className="mt-6 text-xs text-gray-500">
                            <p>
                                {isMiniApp 
                                    ? "After reconnecting, return to the app to continue."
                                    : "You'll be redirected to Spotify to reauthorize the connection."
                                }
                            </p>
                        </div>
                    </div>
                </div>
            );

        case 'inline':
        default:
            return (
                <div className="bg-orange-900/30 border border-orange-600/50 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-400">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        <h3 className="font-medium text-orange-200">Session Expired</h3>
                    </div>
                    
                    {showMessage && (
                        <p className="text-sm text-orange-200 mb-4">
                            Your Spotify session has expired. Please reconnect to continue.
                        </p>
                    )}
                    
                    {reconnectButton}
                </div>
            );
    }
}