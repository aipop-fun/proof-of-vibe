/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React, { useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '~/lib/stores/authStore';
import { useFrame } from '~/components/providers/FrameProvider';
import sdk from '@farcaster/miniapp-sdk';

export function UserProfile() {
    const {
        isLoading,
        user,
        fid: currentFid,
        isAuthenticated,
        //isLinked
    } = useAuthStore();
    const { isMiniApp } = useFrame();
    const router = useRouter();

    // Handle navigation to Timbra profile page with error handling
    const handleProfileClick = useCallback(async () => {
        if (!currentFid) {
            console.warn('No FID available for navigation');
            return;
        }

        try {
            const profileUrl = `/profile/${currentFid}`;

            if (isMiniApp && typeof sdk?.actions?.openUrl === 'function') {
                // For mini app, open the profile URL within the app
                const baseUrl = process.env.NEXT_PUBLIC_URL || window.location.origin;
                await sdk.actions.openUrl(`${baseUrl}${profileUrl}`);
            } else {
                // For web, use router navigation
                router.push(profileUrl);
            }
        } catch (error) {
            console.error('Failed to navigate to profile:', error);
            // Fallback: try direct router navigation
            router.push(`/profile/${currentFid}`);
        }
    }, [currentFid, isMiniApp, router]);

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center gap-2 animate-pulse" role="status" aria-label="Loading profile">
                <div className="w-10 h-10 bg-purple-700/30 rounded-full"></div>
                <div className="h-4 w-24 bg-purple-700/30 rounded"></div>
            </div>
        );
    }

    // Not logged in state
    if (!isAuthenticated) {
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
                <span className="bg-blue-800/50 px-1 rounded" title="Farcaster connected">
                    Farcaster ✓
                </span>
            )}
            {user.spotify && (
                <span className="bg-green-800/50 px-1 rounded" title="Spotify connected">
                    Spotify ✓
                </span>
            )}
            {currentFid && (
                <span className="text-gray-500" title="Farcaster ID">
                    FID: {currentFid}
                </span>
            )}
        </div>
    );

    // Profile image component with error handling
    const profileImage = user.profileImage ? (
        <div className="relative w-10 h-10 cursor-pointer hover:opacity-80 transition-opacity">
            <Image
                src={user.profileImage}
                alt={`${user.displayName || "User"}'s profile picture`}
                fill
                className="rounded-full object-cover"
                sizes="40px"
                priority
                onClick={handleProfileClick}
                onError={(e) => {
                    console.warn('Profile image failed to load:', user.profileImage);
                    e.currentTarget.style.display = 'none';
                }}
            />
            {/* Timbra profile indicator */}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center border border-purple-900">
                <span className="text-xs font-bold text-white">T</span>
            </div>
        </div>
    ) : (
        // Fallback avatar with first letter and Timbra indicator
        <div
            className="relative w-10 h-10 rounded-full bg-purple-700 flex items-center justify-center cursor-pointer hover:bg-purple-600 transition-colors"
            onClick={handleProfileClick}
            title="View your Timbra profile"
        >
            <span className="text-white font-medium">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() :
                    user.farcaster?.username ? user.farcaster.username.charAt(0).toUpperCase() :
                        '?'}
            </span>
            {/* Timbra profile indicator */}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center border border-purple-900">
                <span className="text-xs font-bold text-white">T</span>
            </div>
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
    const isClickable = !!currentFid;

    return (
        <div
            className={`flex items-center gap-3 rounded-lg p-2 transition-colors ${isClickable
                    ? 'cursor-pointer hover:bg-purple-800/20'
                    : 'opacity-75'
                }`}
            onClick={isClickable ? handleProfileClick : undefined}
            title={isClickable ? "View your Timbra profile" : undefined}
            role={isClickable ? "button" : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onKeyDown={isClickable ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleProfileClick();
                }
            } : undefined}
        >
            {profileImage}

            <div className="flex-grow min-w-0">
                <div className="font-medium truncate">
                    {user.displayName || user.farcaster?.username || 'User'}
                </div>
                {usernameDisplay}
                {connectionStatus}
            </div>

            {/* Navigation arrow icon - only show if clickable */}
            {isClickable && (
                <div className="text-gray-400 opacity-50 transition-opacity group-hover:opacity-75">
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
                        aria-hidden="true"
                    >
                        <path d="m9 18 6-6-6-6" />
                    </svg>
                </div>
            )}
        </div>
    );
}