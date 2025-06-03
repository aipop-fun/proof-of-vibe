/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from 'react';
import { SpotifyImage } from '~/components/SpotifyImage';
import { Button } from '~/components/ui/Button';
import { useFrame } from '~/components/providers/FrameProvider';
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
    onFollowToggle?: (fid: number, isFollowing: boolean) => void;
    onInviteToSpotify?: (user: SocialUser) => void;
    className?: string;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
    user,
    onFollowToggle,
    onInviteToSpotify,
    className = ""
}) => {
    const { isMiniApp } = useFrame();

    const handleViewProfile = () => {
        if (isMiniApp && typeof sdk?.actions?.viewProfile === 'function') {
            sdk.actions.viewProfile({ fid: user.fid });
        } else {
            // Fallback to Warpcast web
            window.open(`https://warpcast.com/~/profiles/${user.fid}`, '_blank');
        }
    };

    const handleFollow = () => {
        // In a real implementation, this would call your backend API
        // For now, we'll just call the callback
        if (onFollowToggle) {
            onFollowToggle(user.fid, !user.isFollowing);
        }
    };

    const handleInvite = () => {
        if (onInviteToSpotify) {
            onInviteToSpotify(user);
        } else {
            // Default invitation behavior
            const message = `Hey @${user.username}, check out Timbra! Connect your Spotify and share your music with friends on Farcaster.`;
            const url = process.env.NEXT_PUBLIC_URL || "https://timbra.app";

            if (isMiniApp && typeof sdk?.actions?.composeCast === 'function') {
                sdk.actions.composeCast({
                    text: message,
                    embeds: [url]
                });
            } else {
                window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent(message)}&embeds=${encodeURIComponent(url)}`, '_blank');
            }
        }
    };

    const formatLastActive = (timestamp?: number) => {
        if (!timestamp) return 'Unknown';

        const now = Date.now();
        const diff = Math.floor((now - timestamp) / 1000);

        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    return (
        <div className={`bg-purple-800/20 rounded-lg p-6 ${className}`}>
            {/* Main profile section */}
            <div className="flex items-start gap-4 mb-4">
                {/* Profile image */}
                <div
                    className="relative w-20 h-20 rounded-full overflow-hidden cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                    onClick={handleViewProfile}
                >
                    <SpotifyImage
                        src={user.pfpUrl || '/api/placeholder/80/80'}
                        alt={user.displayName}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* User info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                        <div className="min-w-0 flex-1">
                            <h2
                                className="text-xl font-bold text-white cursor-pointer hover:underline truncate"
                                onClick={handleViewProfile}
                            >
                                {user.displayName}
                            </h2>
                            <p className="text-gray-300 text-sm truncate">@{user.username}</p>
                            <p className="text-gray-400 text-xs">FID: {user.fid}</p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 ml-4 flex-shrink-0">
                            {user.hasSpotify ? (
                                <div className="text-green-500 flex items-center">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.6 0-.359.24-.66.54-.78 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.242 1.021zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                                    </svg>
                                </div>
                            ) : (
                                <Button
                                    onClick={handleInvite}
                                    className="text-xs px-3 py-1 bg-green-600 hover:bg-green-700"
                                >
                                    Invite
                                </Button>
                            )}

                            {user.isFollowing !== undefined && (
                                <Button
                                    onClick={handleFollow}
                                    className={`text-xs px-3 py-1 ${user.isFollowing
                                            ? 'bg-gray-600 hover:bg-gray-700'
                                            : 'bg-blue-600 hover:bg-blue-700'
                                        }`}
                                >
                                    {user.isFollowing ? 'Unfollow' : 'Follow'}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Bio */}
                    {user.bio && (
                        <p className="text-gray-300 text-sm mb-3 leading-relaxed">
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
                    {user.followerCount !== undefined && (
                        <div className="text-center">
                            <div className="font-bold text-white text-lg">
                                {user.followerCount.toLocaleString()}
                            </div>
                            <div className="text-gray-400 text-xs">Followers</div>
                        </div>
                    )}

                    {user.followingCount !== undefined && (
                        <div className="text-center">
                            <div className="font-bold text-white text-lg">
                                {user.followingCount.toLocaleString()}
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
                        {user.verifiedAddresses.eth_addresses.length > 0 && (
                            <div className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded text-xs">
                                ETH Verified
                            </div>
                        )}
                        {user.verifiedAddresses.sol_addresses.length > 0 && (
                            <div className="bg-purple-600/20 text-purple-400 px-2 py-1 rounded text-xs">
                                SOL Verified
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Relationship status */}
            <div className="flex gap-2 mt-3">
                {user.isFollower && (
                    <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded">
                        Follows you
                    </span>
                )}
                {user.isFollowing && (
                    <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded">
                        Following
                    </span>
                )}
                {user.isFollower && user.isFollowing && (
                    <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-1 rounded">
                        Mutual
                    </span>
                )}
            </div>
        </div>
    );
};