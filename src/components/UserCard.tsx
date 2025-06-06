/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unused-expressions,  @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use client";

import React from 'react';
import { z } from 'zod';
import { SpotifyImage } from './SpotifyImage';
import { Button } from './ui/Button';
import { useNavigation, useTimeFormatter, useValidation } from '~/lib/hooks/useCommon';
import { FarcasterUserSchema, TrackSchema } from '~/lib/schemas';

// Component-specific schema
const UserCardPropsSchema = z.object({
    user: FarcasterUserSchema.extend({
        hasSpotify: z.boolean().optional(),
        currentTrack: TrackSchema.optional(),
    }),
    variant: z.enum(['compact', 'detailed', 'mini']).default('detailed'),
    showActions: z.boolean().default(true),
    onUserClick: z.function().optional(),
    onTrackClick: z.function().optional(),
    onInvite: z.function().optional(),
    className: z.string().optional(),
});

type UserCardProps = z.infer<typeof UserCardPropsSchema>;

export const UserCard: React.FC<UserCardProps> = (props) => {
    const { validateAndParse } = useValidation();
    const { viewProfile, openSpotify, composeCast } = useNavigation();
    const { formatRelativeTime } = useTimeFormatter();

    // Validate props
    const validatedProps = validateAndParse(UserCardPropsSchema, props);
    if (!validatedProps) return null;

    const { user, variant, showActions, onUserClick, onTrackClick, onInvite, className = '' } = validatedProps;

    const handleUserClick = () => {
        onUserClick ? onUserClick() : viewProfile(user.fid);
    };

    const handleTrackClick = () => {
        if (user.currentTrack) {
            onTrackClick ? onTrackClick() : openSpotify(user.currentTrack.uri, `${user.currentTrack.title} ${user.currentTrack.artist}`);
        }
    };

    const handleInvite = () => {
        if (onInvite) {
            onInvite();
        } else {
            const message = `Hey @${user.username}, check out Timbra! Connect your Spotify and share your music.`;
            const url = process.env.NEXT_PUBLIC_URL || 'https://timbra.app';
            composeCast(message, [url]);
        }
    };

    const getRelationshipBadge = () => {
        if (user.isFollowing && user.isFollower) return { text: 'Mutual', color: 'bg-purple-600/20 text-purple-400' };
        if (user.isFollowing) return { text: 'Following', color: 'bg-blue-600/20 text-blue-400' };
        if (user.isFollower) return { text: 'Follower', color: 'bg-green-600/20 text-green-400' };
        return null;
    };

    const renderUserInfo = () => (
        <div className="flex-1 min-w-0">
            <p className="font-medium cursor-pointer hover:underline truncate" onClick={handleUserClick}>
                {user.displayName || user.username}
            </p>
            <p className="text-sm text-gray-400 truncate">@{user.username}</p>
            {variant === 'detailed' && user.lastActive && (
                <p className="text-xs text-gray-500">{formatRelativeTime(user.lastActive)}</p>
            )}
        </div>
    );

    const renderCurrentTrack = () => {
        if (!user.currentTrack) return null;

        return (
            <div className="mt-3 p-2 bg-purple-900/30 rounded cursor-pointer hover:bg-purple-800/30" onClick={handleTrackClick}>
                <div className="flex items-center gap-2">
                    <SpotifyImage
                        src={user.currentTrack.coverArt || '/api/placeholder/32/32'}
                        alt={user.currentTrack.title}
                        width={32}
                        height={32}
                        className="rounded"
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.currentTrack.title}</p>
                        <p className="text-xs text-gray-400 truncate">{user.currentTrack.artist}</p>
                    </div>
                    {user.currentTrack.isPlaying && (
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    )}
                </div>
            </div>
        );
    };

    const renderActions = () => {
        if (!showActions) return null;

        return (
            <div className="flex items-center gap-2">
                {user.hasSpotify ? (
                    <div className="text-green-500 text-xs">♫</div>
                ) : (
                    <Button onClick={handleInvite} className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700">
                        Invite
                    </Button>
                )}
            </div>
        );
    };

    const baseClasses = "bg-purple-800/30 rounded-lg transition-colors hover:bg-purple-700/30";
    const variantClasses = {
        compact: "p-2",
        detailed: "p-4",
        mini: "p-1"
    };

    return (
        <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
            <div className="flex items-start gap-3">
                <div className="cursor-pointer" onClick={handleUserClick}>
                    <SpotifyImage
                        src={user.pfpUrl || '/api/placeholder/48/48'}
                        alt={user.displayName || user.username}
                        width={variant === 'mini' ? 32 : 48}
                        height={variant === 'mini' ? 32 : 48}
                        className="rounded-full"
                    />
                </div>

                {renderUserInfo()}
                {renderActions()}
            </div>

            {variant === 'detailed' && (
                <>
                    {/* Relationship badge */}
                    {(() => {
                        const badge = getRelationshipBadge();
                        return badge ? (
                            <div className="mt-2">
                                <span className={`text-xs px-2 py-1 rounded ${badge.color}`}>
                                    {badge.text}
                                </span>
                            </div>
                        ) : null;
                    })()}

                    {/* Current track */}
                    {renderCurrentTrack()}
                </>
            )}
        </div>
    );
};