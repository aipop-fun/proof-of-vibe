import React from 'react';
import Image from 'next/image';
import { useAuth } from '../lib/hooks/useAuth';

export function UserProfile() {
    const { isLoading, user, isMiniApp } = useAuth();

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center gap-2 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
            </div>
        );
    }

    // Not logged in state
    if (!user.farcaster && !user.spotify) {
        return <div>Not logged in</div>;
    }

    // Connection status indicators
    const connectionStatus = !isMiniApp && (
        <div className="text-xs text-gray-400">
            {user.farcaster && 'Farcaster ✓'}
            {user.farcaster && user.spotify && ' • '}
            {user.spotify && 'Spotify ✓'}
        </div>
    );

    // Profile image component
    const profileImage = user.profileImage && (
        <div className="relative w-10 h-10">
            <Image
                src={user.profileImage}
                alt={user.displayName || "Profile"}
                fill
                className="rounded-full object-cover"
                sizes="40px"
                priority
            />
        </div>
    );

    // Username display (only shown if different from display name)
    const usernameDisplay = user.farcaster?.username &&
        user.farcaster.username !== user.displayName && (
            <div className="text-sm text-gray-500">
                @{user.farcaster.username}
            </div>
        );

    return (
        <div className="flex items-center gap-3">
            {profileImage}
            <div>
                <div className="font-medium">{user.displayName}</div>
                {usernameDisplay}
                {connectionStatus}
            </div>
        </div>
    );
}