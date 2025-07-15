"use client";

import { useState } from "react";
import { SpotifyImage } from "./SpotifyImage";
import sdk from "@farcaster/miniapp-sdk";
import { Button } from "./ui/Button";

interface CurrentTrack {
    id: string;
    title: string;
    artist: string;
    album?: string;
    coverArt?: string;
    timestamp?: number;
}

interface FarcasterUser {
    fid: number;
    username: string;
    displayName?: string;
    profileImage?: string;
    lastActive?: number;
    currentTrack?: CurrentTrack;
}

interface FarcasterUserCardProps {
    user: FarcasterUser;
}

export function FarcasterUserCard({ user }: FarcasterUserCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Format relative time
    const formatRelativeTime = (timestamp?: number): string => {
        if (!timestamp) return "Unknown";

        const now = Date.now();
        const diff = Math.floor((now - timestamp) / 1000); // difference in seconds

        if (diff < 60) return `${diff} sec ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
        return `${Math.floor(diff / 86400)} days ago`;
    };

    // Handle viewing the user's profile
    const handleViewProfile = () => {
        if (user.fid && typeof sdk?.actions?.viewProfile === 'function') {
            sdk.actions.viewProfile({ fid: user.fid });
        }
    };

    // Handle sharing the currently playing track
    const handleShareTrack = () => {
        if (!user.currentTrack) return;

        if (typeof sdk?.actions?.composeCast === 'function') {
            // Create base URL from environment or window location
            const baseUrl = process.env.NEXT_PUBLIC_URL ||
                (typeof window !== 'undefined' ? window.location.origin : '');

            // Share message with rich preview link
            sdk.actions.composeCast({
                text: `🎵 Check out "${user.currentTrack.title}" by ${user.currentTrack.artist} that ${user.displayName || user.username} is listening to on Timbra!`,
                embeds: [`${baseUrl}/share/${user.currentTrack.id}`]
            });
        }
    };

    return (
        <div className="bg-purple-900/30 p-4 rounded-lg">
            <div className="flex items-start">
                {/* User profile section */}
                <div
                    className="relative w-12 h-12 rounded-full cursor-pointer flex-shrink-0"
                    onClick={handleViewProfile}
                >
                    <SpotifyImage
                        src={user.profileImage || '/api/placeholder/48/48'}
                        alt={user.displayName || user.username}
                        className="rounded-full"
                        fill
                        sizes="48px"
                        style={{ objectFit: 'cover' }}
                    />
                </div>

                <div className="ml-3 flex-grow min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p
                                className="font-medium truncate cursor-pointer hover:underline"
                                onClick={handleViewProfile}
                            >
                                {user.displayName || user.username}
                            </p>
                            <p className="text-xs text-gray-400">@{user.username}</p>
                        </div>

                        <p className="text-xs text-gray-400 mt-1 sm:mt-0">
                            Active: {formatRelativeTime(user.lastActive)}
                        </p>
                    </div>

                    {/* Current track section */}
                    {user.currentTrack ? (
                        <div
                            className={`mt-3 flex items-center cursor-pointer`}
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            <div className="relative w-10 h-10 mr-3 flex-shrink-0">
                                <SpotifyImage
                                    src={user.currentTrack.coverArt || '/api/placeholder/40/40'}
                                    alt={user.currentTrack.album || user.currentTrack.title}
                                    className="rounded"
                                    fill
                                    sizes="40px"
                                    style={{ objectFit: 'cover' }}
                                />
                            </div>
                            <div className="min-w-0 flex-grow">
                                <p className="font-medium text-sm truncate">{user.currentTrack.title}</p>
                                <p className="text-xs text-gray-400 truncate">{user.currentTrack.artist}</p>
                                <p className="text-xs text-gray-500">
                                    Played: {formatRelativeTime(user.currentTrack.timestamp)}
                                </p>
                            </div>
                            <div className="ml-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsExpanded(!isExpanded);
                                    }}
                                    className="text-gray-400 hover:text-white p-1"
                                >
                                    {isExpanded ? '▲' : '▼'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="mt-3 text-sm text-gray-500 italic">Not currently listening to anything</p>
                    )}
                </div>
            </div>

            {/* Expanded track details section */}
            {isExpanded && user.currentTrack && (
                <div className="mt-3 pt-3 border-t border-purple-800/50">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm">
                                <span className="text-gray-400">Album:</span> {user.currentTrack.album || 'Unknown'}
                            </p>
                        </div>
                        <Button
                            onClick={handleShareTrack}
                            className="text-xs px-3 py-1 bg-purple-600 hover:bg-purple-700"
                        >
                            Share Track
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}