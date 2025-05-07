/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
//@ts-nocheck

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useAuthStore } from '~/lib/stores/authStore';
import { AccountLinkingError } from '~/lib/services/accountLinking';

interface LinkAccountsResponse {
    success: boolean;
    error?: string;
    user?: {
        id: string;
        fid: number;
        spotifyId: string;
        displayName?: string;
        isLinked: boolean;
    };
}

interface UseAccountLinking {
    // State
    isLinking: boolean;
    error: string | null;
    success: boolean;

    // Actions
    linkAccounts: () => Promise<boolean>;
    clearError: () => void;

    // Helper methods
    getErrorMessage: (error: string) => string;
}

/**
 * Hook to handle account linking functionality
 * This provides a reusable way to link Farcaster and Spotify accounts
 */
export function useAccountLinking(): UseAccountLinking {
    const { data: session, update } = useSession();
    const [isLinking, setIsLinking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Get Zustand store values and actions
    const {
        spotifyId,
        fid,
        setLinkedStatus,
        isLinked
    } = useAuthStore();

    /**
     * Helper to convert error codes into user-friendly messages
     */
    const getErrorMessage = useCallback((error: string): string => {
        switch (error) {
            case AccountLinkingError.FID_ALREADY_LINKED:
                return "Your Farcaster account is already linked to a different Spotify account";
            case AccountLinkingError.SPOTIFY_ALREADY_LINKED:
                return "Your Spotify account is already linked to a different Farcaster account";
            case AccountLinkingError.MISSING_CREDENTIALS:
                return "Missing Farcaster ID or Spotify ID";
            case AccountLinkingError.DATABASE_ERROR:
                return "Database error occurred while linking accounts";
            default:
                return error;
        }
    }, []);

    /**
     * Clear any current error
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    /**
     * Link the user's Farcaster and Spotify accounts
     */
    const linkAccounts = useCallback(async (): Promise<boolean> => {
        // If already linked, don't proceed
        if (isLinked) {
            setSuccess(true);
            return true;
        }

        // Get FID and Spotify ID from session or store
        const userFid = session?.user?.fid || fid;
        const userSpotifyId = session?.user?.spotifyId || spotifyId;

        if (!userFid || !userSpotifyId) {
            const errorMessage = "Missing Farcaster ID or Spotify ID. Please connect both accounts first.";
            setError(errorMessage);
            return false;
        }

        try {
            setIsLinking(true);
            setError(null);
            setSuccess(false);

            // Call API to link accounts
            const response = await fetch('/api/auth/link-accounts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fid: userFid,
                    spotifyId: userSpotifyId,
                }),
            });

            const data = await response.json() as LinkAccountsResponse;

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to link accounts');
            }

            // Update auth store
            setLinkedStatus(true);
            setSuccess(true);

            // Update session if available
            if (session) {
                await update({
                    ...session,
                    user: {
                        ...session.user,
                        isLinked: true,
                    },
                });
            }

            return true;
        } catch (error) {
            console.error('Error linking accounts:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to link accounts';
            setError(getErrorMessage(errorMessage));
            return false;
        } finally {
            setIsLinking(false);
        }
    }, [session, update, fid, spotifyId, isLinked, setLinkedStatus, getErrorMessage]);

    return {
        isLinking,
        error,
        success,
        linkAccounts,
        clearError,
        getErrorMessage
    };
}