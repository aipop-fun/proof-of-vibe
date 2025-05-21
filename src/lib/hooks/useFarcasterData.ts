/* eslint-disable @typescript-eslint/ban-ts-comment*/
// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { useUserStore } from '../stores/userStore';

interface FarcasterUserData {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
    bio?: string;
    followerCount?: number;
    followingCount?: number;
    verifiedAddresses?: {
        eth_addresses: string[];
        sol_addresses: string[];
    };
    custodyAddress?: string;
}

interface UseFarcasterDataReturn {
    farcasterUser: FarcasterUserData | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    handle: string | null;
}

export function useFarcasterData(fid?: number): UseFarcasterDataReturn {
    const [farcasterUser, setFarcasterUser] = useState<FarcasterUserData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { updateFarcasterUser } = useUserStore();

    const fetchFarcasterData = useCallback(async (targetFid: number) => {
        if (!targetFid) return null;

        setIsLoading(true);
        setError(null);

        try {
            // First try the direct user endpoint
            const userResponse = await fetch(`/api/neynar/user?fid=${targetFid}`);

            if (userResponse.ok) {
                const userData = await userResponse.json();
                if (userData.user) {
                    const user: FarcasterUserData = {
                        fid: userData.user.fid,
                        username: userData.user.username,
                        displayName: userData.user.display_name,
                        pfpUrl: userData.user.pfp_url,
                        bio: userData.user.profile?.bio?.text,
                        followerCount: userData.user.follower_count,
                        followingCount: userData.user.following_count,
                        verifiedAddresses: userData.user.verified_addresses,
                        custodyAddress: userData.user.custody_address,
                    };
                    return user;
                }
            }

            // Fallback to search endpoint
            const searchResponse = await fetch(`/api/neynar/search?query=${targetFid}`);
            if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                if (searchData.users && searchData.users.length > 0) {
                    const userData = searchData.users[0];
                    const user: FarcasterUserData = {
                        fid: userData.fid || targetFid,
                        username: userData.username,
                        displayName: userData.displayName || userData.display_name,
                        pfpUrl: userData.pfpUrl || userData.pfp_url,
                        bio: userData.bio,
                        followerCount: userData.followerCount || userData.follower_count,
                        followingCount: userData.followingCount || userData.following_count,
                        verifiedAddresses: userData.verifiedAddresses,
                        custodyAddress: userData.custodyAddress,
                    };
                    return user;
                }
            }

            throw new Error('User not found');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user data';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const refetch = useCallback(async () => {
        if (!fid) return;

        try {
            const userData = await fetchFarcasterData(fid);
            if (userData) {
                setFarcasterUser(userData);
                // Update the store if this is the current user
                const currentStoreFid = useUserStore.getState().farcaster?.fid;
                if (currentStoreFid === fid) {
                    updateFarcasterUser(userData);
                }
            }
        } catch (error) {
            console.error('Error refetching Farcaster data:', error);
        }
    }, [fid, fetchFarcasterData, updateFarcasterUser]);

    // Initial fetch
    useEffect(() => {
        if (fid && !farcasterUser) {
            refetch();
        }
    }, [fid, farcasterUser, refetch]);

    // Get handle from username
    const handle = farcasterUser?.username ? `@${farcasterUser.username}` : null;

    return {
        farcasterUser,
        isLoading,
        error,
        refetch,
        handle,
    };
}

// Hook specifically for the current authenticated user
export function useCurrentFarcasterUser(): UseFarcasterDataReturn {
    const { farcaster } = useUserStore();
    const fid = farcaster?.fid;

    return useFarcasterData(fid);
}