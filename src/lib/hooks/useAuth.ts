"use client";

import { useCallback, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useAuthStore } from '~/lib/stores/authStore';
import { useNavigation, useValidation } from './useCommon';
import { z } from 'zod';

const AuthHookSchema = z.object({
    autoRefresh: z.boolean().default(true),
    miniAppAutoAuth: z.boolean().default(true),
});

type AuthHookProps = Partial<z.infer<typeof AuthHookSchema>>;

export const useAuth = (options: AuthHookProps = {}) => {
    const { validateAndParse } = useValidation();
    const { navigate } = useNavigation();
    const { status } = useSession();

    const validatedOptions = validateAndParse(AuthHookSchema, options) ?? { autoRefresh: true, miniAppAutoAuth: true };

    const {
        isAuthenticated,
        isLinked,
        farcaster,
        spotify,
        spotifyUser,
        fid,
        spotifyId,
        accessToken,
        linkAccounts,
        clearAuth,
        refreshTokenIfNeeded,
        getDisplayName,
        getProfileImage,
    } = useAuthStore();

    // Create a computed user object from available data
    const user = isAuthenticated ? {
        fid,
        spotifyId,
        displayName: getDisplayName(),
        profileImage: getProfileImage(),
        farcaster,
        spotify,
        spotifyUser,
    } : null;

    // Auto-refresh tokens
    useEffect(() => {
        if (!validatedOptions.autoRefresh || !isAuthenticated || !accessToken) return;

        const refreshInterval = setInterval(async () => {
            try {
                await refreshTokenIfNeeded();
            } catch (error) {
                console.error('Token refresh failed:', error);
            }
        }, 5 * 60 * 1000); // 5 minutes

        return () => clearInterval(refreshInterval);
    }, [validatedOptions.autoRefresh, isAuthenticated, accessToken, refreshTokenIfNeeded]);

    const login = useCallback(async (provider: 'spotify' | 'farcaster', options?: { redirect?: boolean }) => {
        try {
            const shouldRedirect = options?.redirect ?? false;

            if (shouldRedirect) {
                // When redirect is true, signIn doesn't return a result
                await signIn(provider, {
                    redirect: true,
                    callbackUrl: window.location.origin
                });
                return { success: true };
            } else {
                // When redirect is false, signIn returns a SignInResponse
                const result = await signIn(provider, {
                    redirect: false,
                    callbackUrl: window.location.origin
                });

                if (result?.error) {
                    throw new Error(result.error);
                }

                return { success: true };
            }
        } catch (error) {
            console.error(`${provider} login failed:`, error);
            return { success: false, error: error instanceof Error ? error.message : 'Login failed' };
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            clearAuth();
            await signOut({ redirect: false });
            navigate('/auth/signin', false);
            return { success: true };
        } catch (error) {
            console.error('Logout failed:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Logout failed' };
        }
    }, [clearAuth, navigate]);

    const link = useCallback(async (fid: number, spotifyId: string) => {
        try {
            const result = await linkAccounts(fid, spotifyId);
            return result;
        } catch (error) {
            console.error('Account linking failed:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Linking failed' };
        }
    }, [linkAccounts]);

    return {
        // State
        isAuthenticated,
        isLinked,
        user,
        isLoading: status === 'loading',

        // Actions
        login,
        logout,
        link,
        refreshToken: refreshTokenIfNeeded,

        // Utilities
        navigate,
    };
};