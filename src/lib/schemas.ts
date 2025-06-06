import { z } from 'zod';

// Base Schemas
export const FidSchema = z.number().positive();
export const TimestampSchema = z.number().positive();
export const UrlSchema = z.string().url().optional();

// User Schemas
export const FarcasterUserSchema = z.object({
    fid: FidSchema,
    username: z.string().min(1),
    displayName: z.string().optional(),
    pfpUrl: UrlSchema,
    bio: z.string().optional(),
    isFollowing: z.boolean().optional(),
    isFollower: z.boolean().optional(),
    followerCount: z.number().optional(),
    followingCount: z.number().optional(),
    lastActive: TimestampSchema.optional(),
    verifiedAddresses: z.object({
        eth_addresses: z.array(z.string()),
        sol_addresses: z.array(z.string()),
    }).optional(),
});

export const SpotifyUserSchema = z.object({
    id: z.string(),
    display_name: z.string().optional(),
    email: z.string().email().optional(),
    images: z.array(z.object({
        url: z.string().url(),
        height: z.number().optional(),
        width: z.number().optional(),
    })).optional(),
});

// Track Schemas
export const TrackSchema = z.object({
    id: z.string(),
    title: z.string(),
    artist: z.string(),
    album: z.string().optional(),
    coverArt: UrlSchema,
    uri: z.string().optional(),
    popularity: z.number().min(0).max(100).optional(),
    duration: z.string().optional(),
    durationMs: z.number().optional(),
    currentTime: z.string().optional(),
    progressMs: z.number().optional(),
    isPlaying: z.boolean().optional(),
    timestamp: TimestampSchema.optional(),
});

export const TimeRangeSchema = z.enum(['short_term', 'medium_term', 'long_term']);

// Auth Schemas
export const AuthMethodSchema = z.enum(['spotify', 'farcaster', 'frame-v2']);

export const AuthStateSchema = z.object({
    isAuthenticated: z.boolean(),
    isLinked: z.boolean(),
    method: AuthMethodSchema.optional(),
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    expiresAt: TimestampSchema.optional(),
    user: z.object({
        fid: FidSchema.optional(),
        spotifyId: z.string().optional(),
        farcaster: FarcasterUserSchema.optional(),
        spotify: SpotifyUserSchema.optional(),
    }),
});

// API Response Schemas
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) => z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
});

// Component Props Schemas
export const UserCardPropsSchema = z.object({
    user: FarcasterUserSchema.extend({
        hasSpotify: z.boolean().optional(),
        currentTrack: TrackSchema.optional(),
    }),
    onClick: z.function().optional(),
    onInvite: z.function().optional(),
});

// Infer types from schemas
export type FarcasterUser = z.infer<typeof FarcasterUserSchema>;
export type SpotifyUser = z.infer<typeof SpotifyUserSchema>;
export type Track = z.infer<typeof TrackSchema>;
export type TimeRange = z.infer<typeof TimeRangeSchema>;
export type AuthState = z.infer<typeof AuthStateSchema>;
export type UserCardProps = z.infer<typeof UserCardPropsSchema>;