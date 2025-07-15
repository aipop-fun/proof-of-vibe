/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/rules-of-hooks */
"use client";

import React, { useCallback, useState } from 'react';
import { SpotifyImage } from '~/components/SpotifyImage';
import { Button } from '~/components/ui/Button';
import { useFrame } from '~/components/providers/FrameProvider';
import { useRouter } from 'next/navigation';
import sdk from '@farcaster/miniapp-sdk';

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

    const [inviteSuccess, setInviteSuccess] = useState(false);
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

            setLocalFollowState(!newFollowState);
        } finally {
            setIsFollowLoading(false);
        }
    }, [onFollowToggle, isFollowLoading, localFollowState, user.fid]);


    const handleInvite = useCallback(async () => {
        if (isInviteLoading || inviteSuccess) return;


        setIsInviteLoading(true);

        try {
            if (onInviteToSpotify) {
                await onInviteToSpotify(user);
            } else {
                const message = `Hey @${user.username}, check out Timbra! 🎵 Connect your Spotify and share your music with friends on Farcaster.`;

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

            setInviteSuccess(true);
            setTimeout(() => {
                setInviteSuccess(false);
            }, 3000);

        } catch (error) {
            console.error('Error sending invitation:', error);
        } finally {
            setIsInviteLoading(false);
        }
    }, [onInviteToSpotify, isInviteLoading, inviteSuccess, user, isMiniApp]);


    const formatLastActive = useCallback((timestamp?: number): string => {
        if (!timestamp || timestamp <= 0) return 'Unknown';

        try {
            const now = Date.now();
            const diff = Math.floor((now - timestamp) / 1000);

            if (diff < 0) return 'Unknown';
            if (diff < 60) return `${diff}s ago`;
            if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
            if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
            if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
            return 'More than a month ago';
        } catch (error) {
            console.error('Error formatting last active time:', error);
            return 'Unknown';
        }
    }, []);


    const formatCount = useCallback((count?: number): string => {
        if (count === undefined || count === null) return '0';
        if (count < 1000) return count.toString();
        if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
        return `${(count / 1000000).toFixed(1)}M`;
    }, []);

    return (
        <div className={`bg-purple-900/20 backdrop-blur-sm rounded-2xl border border-purple-700/30 p-6 ${className}`}>
            <div className="flex items-start gap-4 mb-6">
                <div
                    className="relative w-24 h-24 rounded-full overflow-hidden cursor-pointer hover:opacity-90 transition-all duration-300 flex-shrink-0 ring-2 ring-purple-600/40 hover:ring-purple-500/60"

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
                        src={user.pfpUrl || '/api/placeholder/96/96'}
                        alt={`${user.displayName}'s profile picture`}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 right-1 w-6 h-6 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center border-2 border-purple-900 shadow-lg">
                        <span className="text-xs font-bold text-white">T</span>
                    </div>
                </div>


                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0 flex-1">
                            <h2
                                className="text-2xl font-bold text-white cursor-pointer hover:text-purple-300 transition-colors truncate mb-1"

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


                            <p
                                className="text-gray-400 text-sm truncate cursor-pointer hover:text-purple-400 transition-colors mb-1"
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
                            <p className="text-gray-500 text-xs">FID: {user.fid}</p>
                        </div>

                        <div className="flex gap-3 ml-4 flex-shrink-0">
                            {!isCurrentUser && (
                                <Button
                                    onClick={handleViewFarcasterProfile}
                                    className="w-14 h-14 bg-purple-800/30 text-purple-300 hover:bg-purple-700/40 border border-purple-600/40 hover:border-purple-500/60 transition-all duration-200 rounded-2xl flex items-center justify-center backdrop-blur-sm"
                                    title="View on Farcaster"
                                    aria-label="View Farcaster profile"
                                >
                                    <div className="text-center">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="mx-auto mb-1">
                                            <path d="M7.5 2h9v5.5l-2-2-2.5 2.5-2.5-2.5-2 2V2z" />
                                            <path d="M3 8v13h18V8l-2 2v9H5v-9l-2-2z" />
                                        </svg>
                                        <div className="text-xs font-medium">FC</div>
                                    </div>
                                </Button>
                            )}

                            {!user.hasSpotify && !isCurrentUser && (
                                <Button
                                    onClick={handleInvite}
                                    disabled={isInviteLoading || inviteSuccess}
                                    className={`h-14 px-6 transition-all duration-300 rounded-2xl font-medium backdrop-blur-sm border ${inviteSuccess
                                            ? 'bg-green-800/40 border-green-600/60 text-green-300 cursor-default'
                                            : isInviteLoading
                                                ? 'bg-green-800/30 border-green-600/50 text-green-400 cursor-wait'
                                                : 'bg-green-800/30 hover:bg-green-700/40 border-green-600/50 hover:border-green-500/70 text-green-300 hover:text-green-200 hover:scale-[1.02]'
                                        }`}
                                    aria-label="Invite to connect Spotify"
                                >
                                    {inviteSuccess ? (
                                        <span className="flex items-center">
                                            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Invited!
                                        </span>
                                    ) : isInviteLoading ? (
                                        <span className="flex items-center">
                                            <svg className="animate-spin mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Sending...

                                        </span>
                                    ) : (
                                        'Invite'
                                    )}
                                </Button>

                            )}


                            {!isCurrentUser && localFollowState !== undefined && (
                                <Button
                                    onClick={handleFollow}
                                    disabled={isFollowLoading}

                                    className={`h-14 px-6 font-medium rounded-2xl transition-all duration-300 disabled:cursor-not-allowed backdrop-blur-sm border ${localFollowState
                                            ? 'bg-gray-800/30 hover:bg-gray-700/40 text-gray-300 hover:text-gray-200 border-gray-600/40 hover:border-gray-500/60'
                                            : 'bg-blue-800/30 hover:bg-blue-700/40 text-blue-300 hover:text-blue-200 border-blue-600/50 hover:border-blue-500/70 hover:scale-[1.02]'
                                        } ${isFollowLoading ? 'opacity-70' : ''}`}

                                    aria-label={localFollowState ? 'Unfollow user' : 'Follow user'}
                                >
                                    {isFollowLoading ? (
                                        <span className="flex items-center">

                                            <svg className="animate-spin mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">

                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            {localFollowState ? 'Unfollowing...' : 'Following...'}
                                        </span>
                                    ) : (
                                        localFollowState ? 'Following' : 'Follow'

                                    )}
                                </Button>
                            )}
                        </div>
                    </div>



                    {user.bio && (
                        <p className="text-gray-300 text-sm mb-3 leading-relaxed break-words">
                            {user.bio}
                        </p>
                    )}


                    {user.lastActive && (
                        <p className="text-gray-500 text-sm mb-4">

                            Last active: {formatLastActive(user.lastActive)}
                        </p>
                    )}
                </div>
            </div>


            <div className="flex items-center justify-between pt-6 border-t border-purple-700/30">
                <div className="flex gap-8">
                    {user.followerCount !== undefined && (
                        <div className="text-center cursor-pointer hover:scale-105 transition-transform">
                            <div className="font-bold text-white text-2xl">
                                {formatCount(user.followerCount)}
                            </div>
                            <div className="text-gray-400 text-sm">Followers</div>
                        </div>
                    )}

                    {user.followingCount !== undefined && (
                        <div className="text-center cursor-pointer hover:scale-105 transition-transform">
                            <div className="font-bold text-white text-2xl">
                                {formatCount(user.followingCount)}
                            </div>
                            <div className="text-gray-400 text-sm">Following</div>
                        </div>
                    )}

                    <div className="text-center cursor-pointer hover:scale-105 transition-transform">
                        <div className={`font-bold text-2xl ${user.hasSpotify ? 'text-green-400' : 'text-gray-500'
                            }`}>
                            {user.hasSpotify ? '✓' : '✗'}
                        </div>
                        <div className="text-gray-400 text-sm">Spotify</div>
                    </div>
                </div>

                {user.verifiedAddresses && (
                    <div className="flex gap-3">
                        {user.verifiedAddresses.eth_addresses && user.verifiedAddresses.eth_addresses.length > 0 && (
                            <div className="bg-blue-800/25 text-blue-300 px-3 py-2 rounded-xl text-sm border border-blue-600/40 font-medium backdrop-blur-sm" title="Ethereum address verified">

                                ETH ✓
                            </div>
                        )}
                        {user.verifiedAddresses.sol_addresses && user.verifiedAddresses.sol_addresses.length > 0 && (

                            <div className="bg-purple-800/25 text-purple-300 px-3 py-2 rounded-xl text-sm border border-purple-600/40 font-medium backdrop-blur-sm" title="Solana address verified">

                                SOL ✓
                            </div>
                        )}
                    </div>
                )}
            </div>


            {!isCurrentUser && (user.isFollower || localFollowState) && (
                <div className="flex gap-3 mt-4 flex-wrap">
                    {user.isFollower && (
                        <span className="text-sm bg-green-800/25 text-green-300 px-4 py-2 rounded-full border border-green-600/40 font-medium backdrop-blur-sm">
                            Follows you
                        </span>
                    )}
                    {localFollowState && (
                        <span className="text-sm bg-blue-800/25 text-blue-300 px-4 py-2 rounded-full border border-blue-600/40 font-medium backdrop-blur-sm">
                            Following
                        </span>
                    )}
                    {user.isFollower && localFollowState && (
                        <span className="text-sm bg-purple-800/25 text-purple-300 px-4 py-2 rounded-full border border-purple-600/40 font-medium backdrop-blur-sm">
                            🤝 Mutual

                        </span>
                    )}
                </div>
            )}
        </div>
    );
};