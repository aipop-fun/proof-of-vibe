/* eslint-disable  @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import { useMemo } from 'react';
import { useUserStore } from '../stores/userStore';
import { useFarcasterData } from './useFarcasterData';

interface UserDisplayInfo {
    displayName: string;
    handle: string | null;
    profileImage: string | undefined;
    bio?: string;
    fid?: number;
    spotifyId?: string;
    stats?: {
        followers: number;
        following: number;
    };
}

export function useUserDisplay(): UserDisplayInfo {
    const { farcaster, spotify } = useUserStore();
    const { farcasterUser } = useFarcasterData(farcaster?.fid);

    return useMemo(() => {
        // Use the fetched data if available, otherwise fall back to store data
        const currentFarcaster = farcasterUser || farcaster;

        // Priority order for display name:
        // 1. Farcaster display name
        // 2. Farcaster username
        // 3. Spotify display name
        // 4. Default to "User"
        let displayName = "User";
        if (currentFarcaster?.displayName) {
            displayName = currentFarcaster.displayName;
        } else if (currentFarcaster?.username) {
            displayName = currentFarcaster.username;
        } else if (spotify?.display_name) {
            displayName = spotify.display_name;
        } else if (spotify?.name) {
            displayName = spotify.name;
        }

        // Handle (username with @)
        const handle = currentFarcaster?.username ? `@${currentFarcaster.username}` : null;

        // Profile image priority: Farcaster -> Spotify
        let profileImage: string | undefined;
        if (currentFarcaster?.pfpUrl) {
            profileImage = currentFarcaster.pfpUrl;
        } else if (spotify?.images && spotify.images.length > 0) {
            profileImage = spotify.images[0].url;
        }

        return {
            displayName,
            handle,
            profileImage,
            bio: currentFarcaster?.bio,
            fid: currentFarcaster?.fid,
            spotifyId: spotify?.id,
            stats: currentFarcaster ? {
                followers: currentFarcaster.followerCount || 0,
                following: currentFarcaster.followingCount || 0,
            } : undefined,
        };
    }, [farcasterUser, farcaster, spotify]);
}

// Hook for formatting any Farcaster user display info
export function useFarcasterUserDisplay(user: any) {
    return useMemo(() => {
        if (!user) return null;

        return {
            displayName: user.displayName || user.username || `User ${user.fid}`,
            handle: user.username ? `@${user.username}` : null,
            fullHandle: user.username ? `@${user.username}` : `fid:${user.fid}`,
            profileImage: user.pfpUrl,
            bio: user.bio,
            stats: {
                followers: user.followerCount || 0,
                following: user.followingCount || 0,
            },
            verifiedAddresses: user.verifiedAddresses || { eth_addresses: [], sol_addresses: [] },
        };
    }, [user]);
}