/* eslint-disable @typescript-eslint/no-unused-vars, react/no-unescaped-entities,  @typescript-eslint/no-explicit-any  */
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocialFeedStore, TimeRange } from '~/lib/stores/socialFeedStore';
import { useFrame } from '~/components/providers/FrameProvider';
import { Button } from '~/components/ui/Button';
import { ProfileHeader } from '~/components/profile/ProfileHeader';
import { TopTracksSection } from '~/components/profile/TopTracksSection';
import { RecentTracksSection } from '~/components/profile/RecentTracksSection';

export default function ProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { isMiniApp, context } = useFrame();

    const fid = parseInt(params?.fid as string);
    const { userProfiles, fetchUserProfile } = useSocialFeedStore();

    const [activeTimeRange, setActiveTimeRange] = useState<TimeRange>('short_term');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const profile = userProfiles[fid];

    useEffect(() => {
        if (isNaN(fid)) {
            setError('Invalid user ID');
            setIsLoading(false);
            return;
        }

        const loadProfile = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const result = await fetchUserProfile(fid);
                if (!result) {
                    setError('User not found or profile unavailable');
                }
            } catch (err) {
                setError('Failed to load user profile');
            } finally {
                setIsLoading(false);
            }
        };

        loadProfile();
    }, [fid, fetchUserProfile]);

    const handleBackClick = () => {
        router.back();
    };

    const handleSpotifyClick = (track: any) => {
        if (track.uri) {
            const spotifyUrl = track.uri.replace('spotify:', 'https://open.spotify.com/');
            window.open(spotifyUrl, '_blank');
        } else {
            const searchUrl = `https://open.spotify.com/search/${encodeURIComponent(`${track.title} ${track.artist}`)}`;
            window.open(searchUrl, '_blank');
        }
    };

    if (error) {
        return (
            <div
                className="flex flex-col min-h-screen bg-gradient-to-b from-purple-900 to-black text-white"
                style={isMiniApp ? {
                    paddingTop: context?.client.safeAreaInsets?.top ?? 0,
                    paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
                    paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
                    paddingRight: context?.client.safeAreaInsets?.right ?? 0,
                } : {}}
            >
                <div className="container mx-auto max-w-md p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <Button
                            onClick={handleBackClick}
                            className="text-sm px-3 py-1 bg-transparent border border-purple-600 hover:bg-purple-900/30"
                        >
                            ← Back
                        </Button>
                        <h1 className="text-xl font-bold">User Profile</h1>
                    </div>

                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-red-800/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" y1="9" x2="9" y2="15" />
                                <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-medium mb-2">Profile Not Available</h2>
                        <p className="text-gray-400 mb-4">{error}</p>
                        <Button onClick={handleBackClick} className="bg-purple-600 hover:bg-purple-700">
                            Go Back
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="flex flex-col min-h-screen bg-gradient-to-b from-purple-900 to-black text-white"
            style={isMiniApp ? {
                paddingTop: context?.client.safeAreaInsets?.top ?? 0,
                paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
                paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
                paddingRight: context?.client.safeAreaInsets?.right ?? 0,
            } : {}}
        >
            <div className="container mx-auto max-w-md p-6">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <Button
                        onClick={handleBackClick}
                        className="text-sm px-3 py-1 bg-transparent border border-purple-600 hover:bg-purple-900/30"
                    >
                        ← Back
                    </Button>
                    <h1 className="text-xl font-bold">Profile</h1>
                </div>

                {/* Profile Content */}
                {isLoading || profile?.isLoading ? (
                    <ProfileSkeleton />
                ) : profile ? (
                    <div className="space-y-6">
                        {/* Profile Header */}
                        <ProfileHeader user={profile.user} />

                        {/* Spotify Connection Status */}
                        {!profile.user.hasSpotify ? (
                            <div className="bg-orange-900/30 border border-orange-600/50 rounded-lg p-4 text-center">
                                <p className="text-orange-200">
                                    This user hasn't connected their Spotify account yet.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Time Range Selector */}
                                <div className="bg-purple-800/20 rounded-lg p-4">
                                    <h3 className="font-medium mb-3">Top Tracks</h3>
                                    <div className="flex space-x-2">
                                        {[
                                            { key: 'short_term', label: 'This Week' },
                                            { key: 'medium_term', label: 'This Month' },
                                            { key: 'long_term', label: 'All Time' }
                                        ].map(({ key, label }) => (
                                            <button
                                                key={key}
                                                onClick={() => setActiveTimeRange(key as TimeRange)}
                                                className={`px-3 py-1 text-sm rounded transition-colors ${activeTimeRange === key
                                                        ? 'bg-purple-600 text-white'
                                                        : 'bg-purple-900/50 text-gray-300 hover:bg-purple-800/50'
                                                    }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Top Tracks */}
                                <TopTracksSection
                                    tracks={profile.topTracks[activeTimeRange]}
                                    timeRange={activeTimeRange}
                                    onTrackClick={handleSpotifyClick}
                                />

                                {/* Recent Tracks */}
                                {profile.recentTracks.length > 0 && (
                                    <RecentTracksSection
                                        tracks={profile.recentTracks}
                                        onTrackClick={handleSpotifyClick}
                                    />
                                )}
                            </>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-gray-400">Profile not found</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Loading skeleton
const ProfileSkeleton: React.FC = () => (
    <div className="space-y-6 animate-pulse">
        {/* Profile header skeleton */}
        <div className="bg-purple-800/20 rounded-lg p-6">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-purple-700/30 rounded-full" />
                <div className="flex-1">
                    <div className="h-6 bg-purple-700/30 rounded w-32 mb-2" />
                    <div className="h-4 bg-purple-700/20 rounded w-24" />
                </div>
            </div>
            <div className="flex gap-4">
                <div className="text-center">
                    <div className="h-6 bg-purple-700/30 rounded w-12 mb-1" />
                    <div className="h-3 bg-purple-700/20 rounded w-16" />
                </div>
                <div className="text-center">
                    <div className="h-6 bg-purple-700/30 rounded w-12 mb-1" />
                    <div className="h-3 bg-purple-700/20 rounded w-16" />
                </div>
            </div>
        </div>

        {/* Top tracks skeleton */}
        <div className="bg-purple-800/20 rounded-lg p-4">
            <div className="h-5 bg-purple-700/30 rounded w-24 mb-4" />
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className="w-8 text-center">
                            <div className="h-4 bg-purple-700/20 rounded w-4" />
                        </div>
                        <div className="w-10 h-10 bg-purple-700/30 rounded" />
                        <div className="flex-1">
                            <div className="h-4 bg-purple-700/30 rounded w-24 mb-1" />
                            <div className="h-3 bg-purple-700/20 rounded w-20" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);
