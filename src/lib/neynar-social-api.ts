/* eslint-disable   @typescript-eslint/no-unused-vars, @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import {
    FarcasterSocialUser,
    SocialTrack,
    UserSearchParams,
    SearchUsersResponse,
    GetFollowersResponse,
    GetFollowingResponse
} from './types/social';
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";

/**
 * Utility functions for interacting with Farcaster social APIs via Neynar
 */

// Initialize the Neynar client
const getNeynarClient = () => {
    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) {
        throw new Error('NEYNAR_API_KEY not configured');
    }
    const config = new Configuration({ apiKey });
    return new NeynarAPIClient(config);
};

/**
 * Get followers for a specific FID
 */
export async function getFollowers(fid: number, limit: number = 20, cursor: string = ""): Promise<GetFollowersResponse> {
    try {
        const client = getNeynarClient();
        const response = await client.fetchUserFollowers({
            fid,
            limit,
            cursor
        });

        // Map the Neynar response to our internal format
        const followers: FarcasterSocialUser[] = response.result.users.map(user => ({
            fid: user.fid,
            username: user.username || `user${user.fid}`,
            displayName: user.displayName || user.username || `User ${user.fid}`,
            profileImage: user.pfp?.url || null,
            lastActive: user.timestamp ? new Date(user.timestamp).getTime() : undefined,
            isFollower: true
        }));

        return {
            followers,
            total: response.result.count,
            nextCursor: response.result.next?.cursor || null
        };
    } catch (error) {
        console.error("Error fetching followers:", error);
        throw error;
    }
}

/**
 * Get following for a specific FID
 */
export async function getFollowing(fid: number, limit: number = 20, cursor: string = ""): Promise<GetFollowingResponse> {
    try {
        const client = getNeynarClient();
        const response = await client.fetchUserFollowing(fid, {
            limit,
            cursor
        });

        // Map the Neynar response to our internal format
        const following: FarcasterSocialUser[] = response.result.users.map(user => ({
            fid: user.fid,
            username: user.username || `user${user.fid}`,
            displayName: user.displayName || user.username || `User ${user.fid}`,
            profileImage: user.pfp?.url || null,
            lastActive: user.timestamp ? new Date(user.timestamp).getTime() : undefined,
            isFollowing: true
        }));

        return {
            following,
            total: response.result.count,
            nextCursor: response.result.next?.cursor || null
        };
    } catch (error) {
        console.error("Error fetching following:", error);
        throw error;
    }
}

/**
 * Fetch all followers with pagination handling
 */
export async function fetchAllFollowers(fid: number): Promise<FarcasterSocialUser[]> {
    let cursor: string | null = "";
    let users: FarcasterSocialUser[] = [];
    const limit = 150;

    try {
        do {
            const result = await getFollowers(fid, limit, cursor);
            users = users.concat(result.followers);
            cursor = result.nextCursor;
        } while (cursor !== "" && cursor !== null);

        return users;
    } catch (error) {
        console.error("Error fetching all followers:", error);
        throw error;
    }
}

/**
 * Fetch all following with pagination handling
 */
export async function fetchAllFollowing(fid: number): Promise<FarcasterSocialUser[]> {
    let cursor: string | null = "";
    let users: FarcasterSocialUser[] = [];
    const limit = 150;

    try {
        do {
            const result = await getFollowing(fid, limit, cursor);
            users = users.concat(result.following);
            cursor = result.nextCursor;
        } while (cursor !== "" && cursor !== null);

        return users;
    } catch (error) {
        console.error("Error fetching all following:", error);
        throw error;
    }
}

/**
 * Search for users by username, display name, or FID
 */
export async function searchUsers(params: UserSearchParams): Promise<SearchUsersResponse> {
    const { query, limit = 10 } = params;

    try {
        const client = getNeynarClient();

        // If query is a number, try to search by FID
        if (/^\d+$/.test(query)) {
            try {
                const response = await client.fetchBulkUsers({
                    fids: [parseInt(query)]
                });

                if (response.users.length > 0) {
                    const users: FarcasterSocialUser[] = response.users.map(user => ({
                        fid: user.fid,
                        username: user.username || `user${user.fid}`,
                        displayName: user.display_name || user.username || `User ${user.fid}`,
                        profileImage: user.pfp_url || null,
                        lastActive: Date.now(), // We don't have this info from this endpoint
                        followerCount: user.follower_count,
                        followingCount: user.following_count
                    }));

                    return {
                        users,
                        total: users.length
                    };
                }
            } catch (fidError) {
                console.error("Error searching by FID:", fidError);
                // Continue with username search if FID search fails
            }
        }

        // Search by username
        try {
            const response = await client.searchUser({
                q: query,
                limit
            });

            const users: FarcasterSocialUser[] = response.result.users.map(user => ({
                fid: user.fid,
                username: user.username || `user${user.fid}`,
                displayName: user.displayName || user.username || `User ${user.fid}`,
                profileImage: user.pfp?.url || null,
                lastActive: user.timestamp ? new Date(user.timestamp).getTime() : undefined,
                followerCount: user.followerCount,
                followingCount: user.followingCount
            }));

            return {
                users,
                total: users.length
            };
        } catch (usernameError) {
            console.error("Error searching by username:", usernameError);
            throw usernameError;
        }
    } catch (error) {
        console.error("Error searching users:", error);
        throw error;
    }
}

/**
 * Get a user's profile
 */
export async function getUserProfile(fid: number): Promise<FarcasterSocialUser | null> {
    try {
        const client = getNeynarClient();
        const response = await client.fetchBulkUsers({
            fids: [fid]
        });

        if (response.users.length === 0) {
            return null;
        }

        const user = response.users[0];

        return {
            fid: user.fid,
            username: user.username || `user${user.fid}`,
            displayName: user.display_name || user.username || `User ${user.fid}`,
            profileImage: user.pfp_url || null,
            followerCount: user.follower_count,
            followingCount: user.following_count,
            // Current track would need to be fetched from Spotify API integration
            currentTrack: null
        };
    } catch (error) {
        console.error("Error fetching user profile:", error);
        throw error;
    }
}

/**
 * Find mutual followers between two users
 */
export async function findMutualFollowers(fid1: number, fid2: number): Promise<FarcasterSocialUser[]> {
    try {
        const [user1Followers, user2Followers] = await Promise.all([
            fetchAllFollowers(fid1),
            fetchAllFollowers(fid2)
        ]);

        // Find the intersection of followers
        const mutualFollowers = user1Followers.filter(follower1 =>
            user2Followers.some(follower2 => follower2.fid === follower1.fid)
        );

        return mutualFollowers;
    } catch (error) {
        console.error("Error finding mutual followers:", error);
        throw error;
    }
}

/**
 * Find people a user follows that follow another user
 */
export async function findMutualConnections(userFid: number, targetFid: number): Promise<FarcasterSocialUser[]> {
    try {
        const [userFollowing, targetFollowers] = await Promise.all([
            fetchAllFollowing(userFid),
            fetchAllFollowers(targetFid)
        ]);

        // Find people userFid follows that also follow targetFid
        const mutualConnections = userFollowing.filter(following =>
            targetFollowers.some(follower => follower.fid === following.fid)
        );

        return mutualConnections;
    } catch (error) {
        console.error("Error finding mutual connections:", error);
        throw error;
    }
}

/**
 * Helper function to simulate Spotify integration for the demo
 * In a real implementation, this would call a Spotify API to get the user's current track
 */
export function simulateCurrentTrack(fid: number): SocialTrack | null {
    // In a real implementation, this would be an actual API call to get music data
    // For demo purposes, we'll randomize whether a user has a current track
    if (Math.random() > 0.3) {
        const trackId = `track-${fid}-${Math.floor(Math.random() * 1000)}`;
        const artistNames = ['Taylor Swift', 'Drake', 'Bad Bunny', 'The Weeknd', 'Olivia Rodrigo', 'Kendrick Lamar'];
        const trackTitles = ['Midnight', 'Summer', 'Flowers', 'Blinding Lights', 'Cruel Summer', 'Dynamite'];
        const albumNames = ['Midnights', 'Views', 'Un Verano Sin Ti', 'After Hours', 'GUTS', 'DAMN.'];

        return {
            id: trackId,
            title: trackTitles[Math.floor(Math.random() * trackTitles.length)],
            artist: artistNames[Math.floor(Math.random() * artistNames.length)],
            album: albumNames[Math.floor(Math.random() * albumNames.length)],
            coverArt: '/api/placeholder/60/60',
            timestamp: Date.now() - Math.floor(Math.random() * 30 * 60 * 1000),
            duration: `${3 + Math.floor(Math.random() * 2)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`
        };
    }

    return null;
}