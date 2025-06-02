import React from 'react';
import Image from 'next/image';
import { useAuth } from '../lib/hooks/useAuth';

export function UserProfile() {
    const { isLoading, user, isMiniApp, navigate } = useAuth();

    // Handle navigation to profile page
    const handleProfileClick = () => {
        if (!user?.fid) {
            console.warn('No FID available for navigation');
            return;
        }

        const profileUrl = `/profile/${user.fid}`;

        // Use the navigate function from useAuth which handles both miniapp and web
        navigate(profileUrl, false);
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center gap-2 animate-pulse">
                <div className="w-10 h-10 bg-purple-700/30 rounded-full"></div>
                <div className="h-4 w-24 bg-purple-700/30 rounded"></div>
            </div>
        );
    }

    // Not logged in state
    if (!user.farcaster && !user.spotify) {
        return (
            <div className="text-sm text-gray-400">
                Not logged in
            </div>
        );
    }

    // Connection status indicators
    const connectionStatus = !isMiniApp && (
        <div className="text-xs text-gray-400 flex flex-wrap gap-2">
            {user.farcaster && (
                <span className="bg-blue-800/50 px-1 rounded">
                    Farcaster ✓
                </span>
            )}
            {user.spotify && (
                <span className="bg-green-800/50 px-1 rounded">
                    Spotify ✓
                </span>
            )}
            {user.fid && (
                <span className="text-gray-500">
                    FID: {user.fid}
                </span>
            )}
        </div>
    );

    // Profile image component
    const profileImage = user.profileImage ? (
        <div className="relative w-10 h-10 cursor-pointer hover:opacity-80 transition-opacity">
            <Image
                src={user.profileImage}
                alt={user.displayName || "Profile"}
                fill
                className="rounded-full object-cover"
                sizes="40px"
                priority
                onClick={handleProfileClick}
            />
        </div>
    ) : (
        // Fallback avatar with first letter
        <div
            className="w-10 h-10 rounded-full bg-purple-700 flex items-center justify-center cursor-pointer hover:bg-purple-600 transition-colors"
            onClick={handleProfileClick}
        >
            <span className="text-white font-medium">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() :
                    user.farcaster?.username ? user.farcaster.username.charAt(0).toUpperCase() :
                        '?'}
            </span>
        </div>
    );

    // Username display (only shown if different from display name)
    const usernameDisplay = user.farcaster?.username &&
        user.farcaster.username !== user.displayName && (
            <div className="text-sm text-gray-400">
                @{user.farcaster.username}
            </div>
        );

    // Only show click functionality if we have an FID
    const isClickable = !!user.fid;

    return (
        <div
            className={`flex items-center gap-3 rounded-lg p-2 transition-colors ${isClickable
                    ? 'cursor-pointer hover:bg-purple-800/20'
                    : 'opacity-75'
                }`}
            onClick={isClickable ? handleProfileClick : undefined}
            title={isClickable ? "View your profile" : undefined}
        >
            {profileImage}
            <div className="flex-grow min-w-0">
                <div className="font-medium truncate">
                    {user.displayName || user.farcaster?.username || 'User'}
                </div>
                {usernameDisplay}
                {connectionStatus}
            </div>

            {/* Optional: Add a small arrow icon to indicate it's clickable */}
            {isClickable && (
                <div className="text-gray-400 opacity-50">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="m9 18 6-6-6-6" />
                    </svg>
                </div>
            )}
        </div>
    );
}