// src/lib/types/social.ts
/**
 * Types for social feed and Farcaster related functionality
 */

// Farcaster user type for the social feed
export interface FarcasterSocialUser {
    fid: number;
    username: string;
    displayName?: string;
    profileImage?: string;
    lastActive?: number;
    isFollowing?: boolean;
    isFollower?: boolean;
    currentTrack?: SocialTrack;
}

// Social track type
export interface SocialTrack {
    id: string;
    title: string;
    artist: string;
    album?: string;
    coverArt?: string;
    timestamp?: number;
    duration?: string;
    currentTime?: string;
    popularity?: number;
}

// Social feed state interface
export interface SocialFeedState {
    followers: FarcasterSocialUser[];
    following: FarcasterSocialUser[];
    isLoadingFollowers: boolean;
    isLoadingFollowing: boolean;
    error: string | null;
    searchResults: FarcasterSocialUser[];
    isSearching: boolean;

    // Actions
    fetchFollowers: () => Promise<void>;
    fetchFollowing: () => Promise<void>;
    searchUsers: (query: string) => Promise<FarcasterSocialUser[]>;
    fetchUserTracks: (fid: number) => Promise<SocialTrack[] | null>;
    clearSocialData: () => void;
}

// Define a type for the search function parameters
export interface UserSearchParams {
    query: string;
    limit?: number;
    includeVerified?: boolean;
}

// Define response types for social data
export interface SearchUsersResponse {
    users: FarcasterSocialUser[];
    total: number;
    nextCursor?: string;
}

export interface GetFollowersResponse {
    followers: FarcasterSocialUser[];
    total: number;
    nextCursor?: string;
}

export interface GetFollowingResponse {
    following: FarcasterSocialUser[];
    total: number;
    nextCursor?: string;
}

// Extension of the auth store interface to include social functionality
export interface SocialAuthState {
    // Existing auth state
    isAuthenticated: boolean;
    fid: number | null;

    // Social state
    socialData: {
        followers: FarcasterSocialUser[];
        following: FarcasterSocialUser[];
        isLoadingFollowers: boolean;
        isLoadingFollowing: boolean;
    };

    // Social actions
    fetchFollowers: () => Promise<void>;
    fetchFollowing: () => Promise<void>;
    searchUsers: (params: UserSearchParams) => Promise<SearchUsersResponse>;
    fetchUserCurrentTrack: (fid: number) => Promise<SocialTrack | null>;
}