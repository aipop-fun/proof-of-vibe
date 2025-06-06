/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export interface SocialUser {
    fid: number;
    username: string;
    displayName: string;
    pfpUrl?: string;
    isFollowing?: boolean;
    isFollower?: boolean;
    hasSpotify?: boolean;
    lastActive?: number;
    followerCount?: number;
    followingCount?: number;
}

export interface UserTrack {
    id: string;
    title: string;
    artist: string;
    album?: string;
    coverArt?: string;
    popularity?: number;
    uri?: string;
    timestamp?: number;
    isPlaying?: boolean;
    currentTime?: string;
    duration?: string;
}

export interface SocialFeedItem {
    user: SocialUser;
    track: UserTrack;
    timestamp: number;
    type: 'current' | 'recent';
}

export interface UserProfile {
    user: SocialUser;
    topTracks: {
        short_term: UserTrack[];  // This week
        medium_term: UserTrack[]; // This month
        long_term: UserTrack[];   // All time
    };
    recentTracks: UserTrack[];
    isLoading: boolean;
    lastUpdated?: number;
}

export type TimeRange = 'short_term' | 'medium_term' | 'long_term';

interface SocialFeedState {
    // Feed data
    feedItems: SocialFeedItem[];
    followers: SocialUser[];
    following: SocialUser[];

    // Search
    searchResults: SocialUser[];
    searchQuery: string;

    // User profiles cache
    userProfiles: Record<number, UserProfile>;

    // Loading states
    isLoadingFeed: boolean;
    isLoadingFollowers: boolean;
    isLoadingFollowing: boolean;
    isSearching: boolean;

    // Error states
    error: string | null;

    // Cache timestamps
    lastFeedUpdate: number;
    lastFollowersUpdate: number;
    lastFollowingUpdate: number;

    // Actions
    fetchSocialFeed: () => Promise<void>;
    fetchFollowers: (fid: number) => Promise<void>;
    fetchFollowing: (fid: number) => Promise<void>;
    searchUsers: (query: string) => Promise<void>;
    fetchUserProfile: (fid: number) => Promise<UserProfile | null>;
    getUserTopTracks: (fid: number, timeRange: TimeRange) => Promise<UserTrack[]>;
    clearSearch: () => void;
    clearError: () => void;
    invalidateCache: () => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const FEED_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for feed (more frequent)

export const useSocialFeedStore = create<SocialFeedState>()(
    persist(
        (set, get) => ({
            // Initial state
            feedItems: [],
            followers: [],
            following: [],
            searchResults: [],
            searchQuery: '',
            userProfiles: {},
            isLoadingFeed: false,
            isLoadingFollowers: false,
            isLoadingFollowing: false,
            isSearching: false,
            error: null,
            lastFeedUpdate: 0,
            lastFollowersUpdate: 0,
            lastFollowingUpdate: 0,

            // Fetch social feed with users' current tracks
            fetchSocialFeed: async () => {
                const state = get();

                // Check cache
                if (Date.now() - state.lastFeedUpdate < FEED_CACHE_DURATION && state.feedItems.length > 0) {
                    return;
                }

                set({ isLoadingFeed: true, error: null });

                try {
                    // Get current user's followers who have Spotify connected
                    const followersResponse = await fetch('/api/social/feed', {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                    });

                    if (!followersResponse.ok) {
                        throw new Error('Failed to fetch social feed');
                    }

                    const feedData = await followersResponse.json();

                    // Transform API response to our format
                    const feedItems: SocialFeedItem[] = feedData.items?.map((item: any) => ({
                        user: {
                            fid: item.user.fid,
                            username: item.user.username,
                            displayName: item.user.displayName || item.user.username,
                            pfpUrl: item.user.pfpUrl,
                            hasSpotify: true,
                            lastActive: Date.now() - (Math.random() * 3600000) // Mock last active
                        },
                        track: {
                            id: item.track.id,
                            title: item.track.title,
                            artist: item.track.artist,
                            album: item.track.album,
                            coverArt: item.track.coverArt,
                            timestamp: item.timestamp,
                            isPlaying: item.track.isPlaying,
                            currentTime: item.track.currentTime,
                            duration: item.track.duration
                        },
                        timestamp: item.timestamp,
                        type: item.track.isPlaying ? 'current' : 'recent'
                    })) || [];

                    set({
                        feedItems,
                        isLoadingFeed: false,
                        lastFeedUpdate: Date.now()
                    });

                } catch (error) {
                    console.error('Error fetching social feed:', error);
                    set({
                        error: error instanceof Error ? error.message : 'Failed to load social feed',
                        isLoadingFeed: false
                    });
                }
            },

            // Fetch user's followers
            fetchFollowers: async (fid: number) => {
                const state = get();

                // Check cache
                if (Date.now() - state.lastFollowersUpdate < CACHE_DURATION && state.followers.length > 0) {
                    return;
                }

                set({ isLoadingFollowers: true, error: null });

                try {
                    const response = await fetch(`/api/neynar/followers?fid=${fid}&limit=100`);

                    if (!response.ok) {
                        throw new Error('Failed to fetch followers');
                    }

                    const data = await response.json();

                    // Get Spotify status for followers
                    const fids = data.users?.map((user: any) => user.fid) || [];
                    const spotifyStatusResponse = await fetch('/api/users/spotify-status', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fids })
                    });

                    const spotifyStatus = spotifyStatusResponse.ok
                        ? await spotifyStatusResponse.json()
                        : {};

                    const followers: SocialUser[] = data.users?.map((user: any) => ({
                        fid: user.fid,
                        username: user.username,
                        displayName: user.displayName || user.username,
                        pfpUrl: user.pfp,
                        isFollower: true,
                        hasSpotify: Boolean(spotifyStatus[user.fid]),
                        followerCount: user.followerCount,
                        followingCount: user.followingCount,
                        lastActive: user.lastActive
                    })) || [];

                    set({
                        followers,
                        isLoadingFollowers: false,
                        lastFollowersUpdate: Date.now()
                    });

                } catch (error) {
                    console.error('Error fetching followers:', error);
                    set({
                        error: error instanceof Error ? error.message : 'Failed to load followers',
                        isLoadingFollowers: false
                    });
                }
            },

            // Fetch user's following
            fetchFollowing: async (fid: number) => {
                const state = get();

                // Check cache
                if (Date.now() - state.lastFollowingUpdate < CACHE_DURATION && state.following.length > 0) {
                    return;
                }

                set({ isLoadingFollowing: true, error: null });

                try {
                    const response = await fetch(`/api/neynar/following?fid=${fid}&limit=100`);

                    if (!response.ok) {
                        throw new Error('Failed to fetch following');
                    }

                    const data = await response.json();

                    // Get Spotify status for following
                    const fids = data.users?.map((user: any) => user.fid) || [];
                    const spotifyStatusResponse = await fetch('/api/users/spotify-status', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fids })
                    });

                    const spotifyStatus = spotifyStatusResponse.ok
                        ? await spotifyStatusResponse.json()
                        : {};

                    const following: SocialUser[] = data.users?.map((user: any) => ({
                        fid: user.fid,
                        username: user.username,
                        displayName: user.displayName || user.username,
                        pfpUrl: user.pfp,
                        isFollowing: true,
                        hasSpotify: Boolean(spotifyStatus[user.fid]),
                        followerCount: user.followerCount,
                        followingCount: user.followingCount,
                        lastActive: user.lastActive
                    })) || [];

                    set({
                        following,
                        isLoadingFollowing: false,
                        lastFollowingUpdate: Date.now()
                    });

                } catch (error) {
                    console.error('Error fetching following:', error);
                    set({
                        error: error instanceof Error ? error.message : 'Failed to load following',
                        isLoadingFollowing: false
                    });
                }
            },

            // Search users by handle or FID
            searchUsers: async (query: string) => {
                if (!query.trim()) {
                    set({ searchResults: [], searchQuery: '' });
                    return;
                }

                set({ isSearching: true, searchQuery: query, error: null });

                try {
                    const response = await fetch(`/api/neynar/search?query=${encodeURIComponent(query)}&limit=20`);

                    if (!response.ok) {
                        throw new Error('Search failed');
                    }

                    const data = await response.json();

                    // Get Spotify status for search results
                    const fids = data.users?.map((user: any) => user.fid) || [];
                    const spotifyStatusResponse = await fetch('/api/users/spotify-status', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fids })
                    });

                    const spotifyStatus = spotifyStatusResponse.ok
                        ? await spotifyStatusResponse.json()
                        : {};

                    const searchResults: SocialUser[] = data.users?.map((user: any) => ({
                        fid: user.fid,
                        username: user.username,
                        displayName: user.displayName || user.username,
                        pfpUrl: user.pfpUrl,
                        hasSpotify: Boolean(spotifyStatus[user.fid]),
                        followerCount: user.followerCount,
                        followingCount: user.followingCount,
                        lastActive: user.lastActiveTimestamp
                    })) || [];

                    set({
                        searchResults,
                        isSearching: false
                    });

                } catch (error) {
                    console.error('Error searching users:', error);
                    set({
                        error: error instanceof Error ? error.message : 'Search failed',
                        isSearching: false
                    });
                }
            },

            // Fetch detailed user profile with top tracks
            fetchUserProfile: async (fid: number) => {
                const state = get();

                // Check cache
                const cached = state.userProfiles[fid];
                if (cached && Date.now() - (cached.lastUpdated || 0) < CACHE_DURATION) {
                    return cached;
                }

                // Set loading state for this user
                set(state => ({
                    userProfiles: {
                        ...state.userProfiles,
                        [fid]: {
                            ...state.userProfiles[fid],
                            isLoading: true
                        }
                    }
                }));

                try {
                    // Fetch user info and top tracks in parallel
                    const [userResponse, tracksResponse] = await Promise.all([
                        fetch(`/api/neynar/user?fid=${fid}`),
                        fetch(`/api/social/user-tracks?fid=${fid}`)
                    ]);

                    if (!userResponse.ok) {
                        throw new Error('Failed to fetch user profile');
                    }

                    const userData = await userResponse.json();
                    const tracksData = tracksResponse.ok ? await tracksResponse.json() : null;

                    const userProfile: UserProfile = {
                        user: {
                            fid: userData.user.fid,
                            username: userData.user.username,
                            displayName: userData.user.display_name || userData.user.username,
                            pfpUrl: userData.user.pfp_url,
                            hasSpotify: Boolean(tracksData),
                            followerCount: userData.user.follower_count,
                            followingCount: userData.user.following_count
                        },
                        topTracks: {
                            short_term: tracksData?.topTracks?.short_term || [],
                            medium_term: tracksData?.topTracks?.medium_term || [],
                            long_term: tracksData?.topTracks?.long_term || []
                        },
                        recentTracks: tracksData?.recentTracks || [],
                        isLoading: false,
                        lastUpdated: Date.now()
                    };

                    set(state => ({
                        userProfiles: {
                            ...state.userProfiles,
                            [fid]: userProfile
                        }
                    }));

                    return userProfile;

                } catch (error) {
                    console.error('Error fetching user profile:', error);

                    // Set error state for this user
                    set(state => ({
                        userProfiles: {
                            ...state.userProfiles,
                            [fid]: {
                                ...state.userProfiles[fid],
                                isLoading: false
                            }
                        }
                    }));

                    return null;
                }
            },

            // Get user's top tracks for specific time range
            getUserTopTracks: async (fid: number, timeRange: TimeRange) => {
                const profile = await get().fetchUserProfile(fid);
                return profile?.topTracks[timeRange] || [];
            },

            // Clear search results
            clearSearch: () => {
                set({ searchResults: [], searchQuery: '' });
            },

            // Clear error
            clearError: () => {
                set({ error: null });
            },

            // Invalidate all caches
            invalidateCache: () => {
                set({
                    lastFeedUpdate: 0,
                    lastFollowersUpdate: 0,
                    lastFollowingUpdate: 0,
                    userProfiles: {}
                });
            }
        }),
        {
            name: 'social-feed-store',
            // Only persist non-sensitive data
            partialize: (state) => ({
                userProfiles: Object.fromEntries(
                    Object.entries(state.userProfiles).map(([fid, profile]) => [
                        fid,
                        {
                            ...profile,
                            isLoading: false // Reset loading state on hydration
                        }
                    ])
                )
            })
        }
    )
);