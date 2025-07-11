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

/**
 * Utility functions for interacting with Farcaster social APIs
 * In a real implementation, these would call Neynar or other Farcaster API services
 */

// Mock data factory for demonstration purposes
const generateMockUsers = (count: number, startFid: number = 100): FarcasterSocialUser[] => {
    const users: FarcasterSocialUser[] = [];

    for (let i = 0; i < count; i++) {
        const fid = startFid + i;
        const user: FarcasterSocialUser = {
            fid,
            username: `user${fid}`,
            displayName: `User ${fid}`,
            profileImage: '/api/placeholder/100/100',
            lastActive: Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000),
            isFollowing: Math.random() > 0.5,
            isFollower: Math.random() > 0.5,
            currentTrack: Math.random() > 0.3 ? {
                id: `track-${fid}`,
                title: `Song Title ${fid % 10}`,
                artist: `Artist ${fid % 5}`,
                album: `Album ${fid % 3}`,
                coverArt: '/api/placeholder/60/60',
                timestamp: Date.now() - Math.floor(Math.random() * 60 * 60 * 1000)
            } : undefined
        };

        users.push(user);
    }

    return users;
};

/**
 * Get followers for a specific FID
 */
export async function getFollowers(fid: number, limit: number = 20): Promise<GetFollowersResponse> {
    // For demonstration, using mock data
    // In a real app, this would call Neynar or another service

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const followers = generateMockUsers(limit);

    return {
        followers,
        total: 120 // Mock total
    };
}

/**
 * Get following for a specific FID
 */
export async function getFollowing(fid: number, limit: number = 20): Promise<GetFollowingResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const following = generateMockUsers(limit, 200);

    return {
        following,
        total: 85 // Mock total
    };
}

/**
 * Search for users by username, display name, or FID
 */
export async function searchUsers(params: UserSearchParams): Promise<SearchUsersResponse> {
    const { query, limit = 10, includeVerified = true } = params;

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate some mock users for the search results
    const mockUsers = generateMockUsers(limit, 300);

    // Filter mock results based on the query
    // In a real implementation, this filtering would be done server-side
    const filteredUsers = mockUsers.filter(user => {
        const fidMatch = user.fid.toString() === query.trim();
        const usernameMatch = user.username.toLowerCase().includes(query.toLowerCase());
        const displayNameMatch = user.displayName?.toLowerCase().includes(query.toLowerCase());

        return fidMatch || usernameMatch || displayNameMatch;
    });

    return {
        users: filteredUsers,
        total: filteredUsers.length
    };
}

/**
 * Get a user's current track
 */
export async function getUserCurrentTrack(fid: number): Promise<SocialTrack | null> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400));

    // 70% chance to have a current track
    if (Math.random() > 0.3) {
        return {
            id: `track-${fid}-current`,
            title: `Current Song ${fid % 10}`,
            artist: `Current Artist ${fid % 5}`,
            album: `Current Album ${fid % 3}`,
            coverArt: '/api/placeholder/60/60',
            timestamp: Date.now() - Math.floor(Math.random() * 30 * 60 * 1000), // Within the last 30 min
            duration: `${3 + Math.floor(Math.random() * 5)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
            currentTime: `${Math.floor(Math.random() * 3)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`
        };
    }

    return null;
}

/**
 * Get a user's recently played tracks
 */
export async function getUserRecentTracks(fid: number, limit: number = 5): Promise<SocialTrack[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));

    const tracks: SocialTrack[] = [];

    for (let i = 0; i < limit; i++) {
        tracks.push({
            id: `track-${fid}-recent-${i}`,
            title: `Recent Song ${i}`,
            artist: `Recent Artist ${i % 5}`,
            album: `Recent Album ${i % 3}`,
            coverArt: '/api/placeholder/60/60',
            timestamp: Date.now() - ((i + 1) * Math.floor(Math.random() * 60 * 60 * 1000)),
            duration: `${3 + Math.floor(Math.random() * 5)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`
        });
    }

    return tracks;
}

/**
 * Get a user's profile
 */
export async function getUserProfile(fid: number): Promise<FarcasterSocialUser | null> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
        fid,
        username: `user${fid}`,
        displayName: `User ${fid}`,
        profileImage: '/api/placeholder/100/100',
        lastActive: Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000),
        isFollowing: Math.random() > 0.5,
        isFollower: Math.random() > 0.5,
        currentTrack: await getUserCurrentTrack(fid)
    };
}