"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '~/lib/stores/authStore';
import { useFrame } from '~/components/providers/FrameProvider';

export interface SpotifyReconnectState {
    needsReconnect: boolean;
    isReconnecting: boolean;
    lastAttempt: number | null;
    attemptCount: number;
}

export interface SpotifyReconnectActions {
    checkAndRefresh: () => Promise<boolean>;
    handleReconnect: () => void;
    resetReconnectState: () => void;
    generateReconnectUrl: () => string;
}

export function useSpotifyReconnect(): SpotifyReconnectState & SpotifyReconnectActions {
    const { isMiniApp } = useFrame();
    const {
        isAuthenticated,
        spotifyId,
        accessToken,
        refreshToken,
        fid,
        isExpired,
        refreshTokenIfNeeded,
        clearAuth
    } = useAuthStore();

    const [isReconnecting, setIsReconnecting] = useState(false);
    const [lastAttempt, setLastAttempt] = useState<number | null>(null);
    const [attemptCount, setAttemptCount] = useState(0);

    
    const needsReconnect = Boolean(isAuthenticated && spotifyId && (!accessToken || isExpired()));

    
    const generateReconnectUrl = useCallback(() => {
        const baseUrl = process.env.NEXT_PUBLIC_URL || window.location.origin;
        const params = new URLSearchParams({
            source: isMiniApp ? 'miniapp' : 'web',
            reconnect: 'true',
            ...(fid && { fid: fid.toString() })
        });
        return `${baseUrl}/api/auth/signin/spotify?${params.toString()}`;
    }, [isMiniApp, fid]);

    
    const checkAndRefresh = useCallback(async (): Promise<boolean> => {
        if (!needsReconnect) {
            return true; 
        }

        if (!refreshToken) {
            console.log('No refresh token available, full reconnection needed');
            return false;
        }

        try {
            console.log('Attempting to refresh Spotify token...');
            setIsReconnecting(true);

            const success = await refreshTokenIfNeeded();

            if (success) {
                console.log('Token refreshed successfully');
                setLastAttempt(Date.now());
                setAttemptCount(0);
                return true;
            } else {
                console.log('Token refresh failed');
                setAttemptCount(prev => prev + 1);
                return false;
            }
        } catch (error) {
            console.error('Error during token refresh:', error);
            setAttemptCount(prev => prev + 1);
            return false;
        } finally {
            setIsReconnecting(false);
        }
    }, [needsReconnect, refreshToken, refreshTokenIfNeeded]);

    
    const handleReconnect = useCallback(() => {
        console.log('Initiating Spotify reconnection...');
        setIsReconnecting(true);
        setLastAttempt(Date.now());
        setAttemptCount(prev => prev + 1);

        try {
            const reconnectUrl = generateReconnectUrl();

            
            clearAuth();

            
            window.location.href = reconnectUrl;
        } catch (error) {
            console.error('Error initiating reconnection:', error);
            setIsReconnecting(false);
            
            window.location.href = '/';
        }
    }, [generateReconnectUrl, clearAuth]);

    
    const resetReconnectState = useCallback(() => {
        setIsReconnecting(false);
        setLastAttempt(null);
        setAttemptCount(0);
    }, []);

    
    useEffect(() => {
        if (needsReconnect && !lastAttempt && !isReconnecting && attemptCount === 0) {    
            const timeoutId = setTimeout(() => {
                console.log('Auto-attempting token refresh...');
                checkAndRefresh().then(success => {
                    if (!success) {
                        console.log('Auto-refresh failed, user intervention required');
                    }
                });
            }, 1000);

            return () => clearTimeout(timeoutId);
        }
    }, [needsReconnect, lastAttempt, isReconnecting, attemptCount, checkAndRefresh]);

    
    useEffect(() => {
        if (!isAuthenticated) {
            resetReconnectState();
        }
    }, [isAuthenticated, resetReconnectState]);

    return {
        needsReconnect,
        isReconnecting,
        lastAttempt,
        attemptCount,
        checkAndRefresh,
        handleReconnect,
        resetReconnectState,
        generateReconnectUrl
    };
}