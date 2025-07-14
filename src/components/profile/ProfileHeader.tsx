/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/rules-of-hooks */
"use client";

import React, { useCallback, useState } from 'react';
import { SpotifyImage } from '~/components/SpotifyImage';
import { Button } from '~/components/ui/Button';
import { useFrame } from '~/components/providers/FrameProvider';
import { useRouter } from 'next/navigation';
import sdk from '@farcaster/frame-sdk';

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
    bio?: string;
    verifiedAddresses?: {
        eth_addresses: string[];
        sol_addresses: string[];
    };
}

interface ProfileHeaderProps {
    user: SocialUser;
    onFollowToggle?: (fid: number, isFollowing: boolean) => Promise<boolean>;
    onInviteToSpotify?: (user: SocialUser) => Promise<void>;
    className?: string;
    isCurrentUser?: boolean;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
    user,
    onFollowToggle,
    onInviteToSpotify,
    className = "",
    isCurrentUser = false
}) => {
    const { isMiniApp, context } = useFrame();
    const router = useRouter();
    const [isFollowLoading, setIsFollowLoading] = useState(false);
    const [isInviteLoading, setIsInviteLoading] = useState(false);
    const [localFollowState, setLocalFollowState] = useState(user.isFollowing);

    
    if (!user || !user.fid || !user.username) {
        console.error('ProfileHeader: Invalid user data provided', user);
        return (
            <div className={`bg-red-900/30 border border-red-600/50 rounded-lg p-4 ${className}`}>
                <p className="text-red-200 text-sm">Error: Invalid user profile data</p>
            </div>
        );
    }

    
    const handleViewTimbraProfile = useCallback(() => {
        try {
            const timbraProfileUrl = `/profile/${user.fid}`;    
            router.push(timbraProfileUrl);
        } catch (error) {
            console.error('Failed to navigate to Timbra profile:', error);            
            router.push(`/profile/${user.fid}`);
        }
    }, [user.fid, router]);

    
    const handleViewFarcasterProfile = useCallback(async () => {
        try {
            if (isMiniApp && typeof sdk?.actions?.viewProfile === 'function') {
                await sdk.actions.viewProfile({ fid: user.fid });
            } else {
                const farcasterUrl = `https://warpcast.com/~/profiles/${user.fid}`;
                window.open(farcasterUrl, '_blank', 'noopener,noreferrer');
            }
        } catch (error) {
            console.error('Failed to navigate to Farcaster profile:', error);
            // Fallback to web URL
            const farcasterUrl = `https://warpcast.com/~/profiles/${user.fid}`;
            window.open(farcasterUrl, '_blank', 'noopener,noreferrer');
        }
    }, [user.fid, isMiniApp]);

    
    const handleFollow = useCallback(async () => {
        if (!onFollowToggle || isFollowLoading) return;

        setIsFollowLoading(true);
        const newFollowState = !localFollowState;

        
        setLocalFollowState(newFollowState);

        try {
            const success = await onFollowToggle(user.fid, newFollowState);
            if (!success) {
        
                setLocalFollowState(!newFollowState);
                console.error('Follow action failed');
            }
        } catch (error) {
            console.error('Error during follow action:', error);
            // Revert on error
            setLocalFollowState(!newFollowState);
        } finally {
            setIsFollowLoading(false);
        }
    }, [onFollowToggle, isFollowLoading, localFollowState, user.fid]);

    // Handle Spotify invitation with proper error handling
    const handleInvite = useCallback(async () => {
        if (isInviteLoading) return;

        setIsInviteLoading(true);

        try {
            if (onInviteToSpotify) {
                await onInviteToSpotify(user);
            } else {
                // Default invitation behavior
                const message = `Hey @${user.username}, check out Timbra! Connect your Spotify and share your music with friends on Farcaster.`;
                const url = process.env.NEXT_PUBLIC_URL || "https://timbra.app";

                if (isMiniApp && typeof sdk?.actions?.composeCast === 'function') {
                    await sdk.actions.composeCast({
                        text: message,
                        embeds: [url]
                    });
                } else {
                    const composeUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(message)}&embeds=${encodeURIComponent(url)}`;
                    window.open(composeUrl, '_blank', 'noopener,noreferrer');
                }
            }
        } catch (error) {
            console.error('Error sending invitation:', error);
            // Could show a toast notification here in a real app
        } finally {
            setIsInviteLoading(false);
        }
    }, [onInviteToSpotify, isInviteLoading, user, isMiniApp]);

    // Format last active timestamp with proper error handling
    const formatLastActive = useCallback((timestamp?: number): string => {
        if (!timestamp || timestamp <= 0) return 'Unknown';

        try {
            const now = Date.now();
            const diff = Math.floor((now - timestamp) / 1000);

            if (diff < 0) return 'Unknown'; // Future timestamp
            if (diff < 60) return `${diff}s ago`;
            if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
            if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
            if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`; // 30 days
            return 'More than a month ago';
        } catch (error) {
            console.error('Error formatting last active time:', error);
            return 'Unknown';
        }
    }, []);

    // Format follower/following counts
    const formatCount = useCallback((count?: number): string => {
        if (count === undefined || count === null) return '0';
        if (count < 1000) return count.toString();
        if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
        return `${(count / 1000000).toFixed(1)}M`;
    }, []);

    return (
        <div className={`bg-purple-800/20 rounded-lg p-6 ${className}`}>
            {/* Main profile section */}
            <div className="flex items-start gap-4 mb-4">
                {/* ✅ Profile image - Navigate to Timbra profile */}
                <div
                    className="relative w-20 h-20 rounded-full overflow-hidden cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0 ring-2 ring-purple-600/30 hover:ring-purple-500/50"
                    onClick={handleViewTimbraProfile}
                    title="View Timbra profile"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleViewTimbraProfile();
                        }
                    }}
                >
                    <SpotifyImage
                        src={user.pfpUrl || '/api/placeholder/80/80'}
                        alt={`${user.displayName}'s profile picture`}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                    />
                    {/* Timbra indicator overlay */}
                    <div className="absolute bottom-0 right-0 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center border-2 border-purple-900">
                        <span className="text-xs font-bold text-white">T</span>
                    </div>
                </div>

                {/* User info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                        <div className="min-w-0 flex-1">
                            {/* ✅ Display name - Navigate to Timbra profile */}
                            <h2
                                className="text-xl font-bold text-white cursor-pointer hover:underline truncate"
                                onClick={handleViewTimbraProfile}
                                title="View Timbra profile"
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleViewTimbraProfile();
                                    }
                                }}
                            >
                                {user.displayName}
                                {isCurrentUser && (
                                    <span className="ml-2 text-sm text-purple-400 font-normal">(You)</span>
                                )}
                            </h2>

                            {/* ✅ Username - Navigate to Timbra profile */}
                            <p
                                className="text-gray-300 text-sm truncate cursor-pointer hover:underline transition-colors hover:text-purple-400"
                                onClick={handleViewTimbraProfile}
                                title="View Timbra profile"
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleViewTimbraProfile();
                                    }
                                }}
                            >
                                @{user.username}
                            </p>
                            <p className="text-gray-400 text-xs">FID: {user.fid}</p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 ml-4 flex-shrink-0">
                            {/* ✅ Botão específico para Farcaster profile */}
                            {!isCurrentUser && (
                                <Button
                                    onClick={handleViewFarcasterProfile}
                                    className="text-xs px-2 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-600/50 transition-colors"
                                    title="View on Farcaster"
                                    aria-label="View Farcaster profile"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="mr-1">
                                        <path d="M7.5 2h9v5.5l-2-2-2.5 2.5-2.5-2.5-2 2V2z" />
                                        <path d="M3 8v13h18V8l-2 2v9H5v-9l-2-2z" />
                                    </svg>
                                    FC
                                </Button>
                            )}

                            {/* Spotify status indicator */}
                            {user.hasSpotify ? (
                                <div className="flex items-center text-green-500" title="Spotify connected">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.6 0-.359.24-.66.54-.78 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.242 1.021zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                                    </svg>
                                </div>
                            ) : !isCurrentUser ? (
                                <Button
                                    onClick={handleInvite}
                                    disabled={isInviteLoading}
                                    className="text-xs px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    aria-label="Invite to connect Spotify"
                                >
                                    {isInviteLoading ? (
                                        <span className="flex items-center">
                                            <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Inviting...
                                        </span>
                                    ) : (
                                        'Invite'
                                    )}
                                </Button>
                            ) : null}

                            {/* Follow/Unfollow button */}
                            {!isCurrentUser && localFollowState !== undefined && (
                                <Button
                                    onClick={handleFollow}
                                    disabled={isFollowLoading}
                                    className={`text-xs px-3 py-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${localFollowState
                                        ? 'bg-gray-600 hover:bg-gray-700 text-gray-200'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                        }`}
                                    aria-label={localFollowState ? 'Unfollow user' : 'Follow user'}
                                >
                                    {isFollowLoading ? (
                                        <span className="flex items-center">
                                            <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            {localFollowState ? 'Unfollowing...' : 'Following...'}
                                        </span>
                                    ) : (
                                        localFollowState ? 'Unfollow' : 'Follow'
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Bio */}
                    {user.bio && (
                        <p className="text-gray-300 text-sm mb-3 leading-relaxed break-words">
                            {user.bio}
                        </p>
                    )}

                    {/* Last active */}
                    {user.lastActive && (
                        <p className="text-gray-400 text-xs mb-3">
                            Last active: {formatLastActive(user.lastActive)}
                        </p>
                    )}
                </div>
            </div>

            {/* Stats section */}
            <div className="flex items-center justify-between pt-4 border-t border-purple-700/50">
                <div className="flex gap-6">
                    {/* Follower count */}
                    {user.followerCount !== undefined && (
                        <div className="text-center">
                            <div className="font-bold text-white text-lg">
                                {formatCount(user.followerCount)}
                            </div>
                            <div className="text-gray-400 text-xs">Followers</div>
                        </div>
                    )}

                    {/* Following count */}
                    {user.followingCount !== undefined && (
                        <div className="text-center">
                            <div className="font-bold text-white text-lg">
                                {formatCount(user.followingCount)}
                            </div>
                            <div className="text-gray-400 text-xs">Following</div>
                        </div>
                    )}

                    {/* Spotify status */}
                    <div className="text-center">
                        <div className={`font-bold text-lg ${user.hasSpotify ? 'text-green-400' : 'text-gray-400'}`}>
                            {user.hasSpotify ? '✓' : '✗'}
                        </div>
                        <div className="text-gray-400 text-xs">Spotify</div>
                    </div>
                </div>

                {/* Verification badges */}
                {user.verifiedAddresses && (
                    <div className="flex gap-2">
                        {user.verifiedAddresses.eth_addresses && user.verifiedAddresses.eth_addresses.length > 0 && (
                            <div className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded text-xs" title="Ethereum address verified">
                                ETH ✓
                            </div>
                        )}
                        {user.verifiedAddresses.sol_addresses && user.verifiedAddresses.sol_addresses.length > 0 && (
                            <div className="bg-purple-600/20 text-purple-400 px-2 py-1 rounded text-xs" title="Solana address verified">
                                SOL ✓
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Relationship status */}
            {!isCurrentUser && (user.isFollower || localFollowState) && (
                <div className="flex gap-2 mt-3">
                    {user.isFollower && (
                        <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded">
                            Follows you
                        </span>
                    )}
                    {localFollowState && (
                        <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded">
                            Following
                        </span>
                    )}
                    {user.isFollower && localFollowState && (
                        <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-1 rounded">
                            Mutual
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};