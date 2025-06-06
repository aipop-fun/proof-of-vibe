/* eslint-disable @typescript-eslint/no-unused-vars, react/no-unescaped-entities,  @typescript-eslint/no-explicit-any,  @typescript-eslint/ban-ts-comment  */
// @ts-nocheck
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocialFeedStore, TimeRange } from '~/lib/stores/socialFeedStore';
import { useAuthStore } from '~/lib/stores/authStore';
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
    const {
        fid: currentUserFid,
        isAuthenticated,
        isLinked,
        farcaster,
        spotify,
        spotifyId,
        accessToken,
        fetchTopTracks,
        topTracks,
        isLoadingTracks,
        fetchCurrentlyPlaying,
        currentlyPlaying,
        refreshTokenIfNeeded,
        getDisplayName,
        getProfileImage,
        error: authError
    } = useAuthStore();

    const [activeTimeRange, setActiveTimeRange] = useState<TimeRange>('short_term');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCurrentUser, setIsCurrentUser] = useState(false);

    const profile = userProfiles[fid];

    // Check if this is the current user's profile
    useEffect(() => {
        setIsCurrentUser(isAuthenticated && currentUserFid === fid);
    }, [isAuthenticated, currentUserFid, fid]);

    // Check if user has Spotify
    const hasSpotify = !!(spotify?.id || spotifyId || accessToken);

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
                
                if (isCurrentUser && isAuthenticated) {
                    console.log('Loading own profile data...');


                    if (hasSpotify) {
                        await refreshTokenIfNeeded();
                        
                        await Promise.all([
                            fetchTopTracks('short_term'),
                            fetchTopTracks('medium_term'),
                            fetchTopTracks('long_term'),
                            fetchCurrentlyPlaying()
                        ]);
                    }
                } else {
                    console.log('Loading other user profile...');
                    const result = await fetchUserProfile(fid);
                    if (!result) {
                        setError('User not found or profile unavailable');
                    }
                }
            } catch (err) {
                console.error('Error loading profile:', err);
                setError('Failed to load user profile');
            } finally {
                setIsLoading(false);
            }
        };
        
        if (isCurrentUser !== undefined) {
            loadProfile();
        }
    }, [
        fid,
        fetchUserProfile,
        isCurrentUser,
        isAuthenticated,
        fetchTopTracks,
        fetchCurrentlyPlaying,
        refreshTokenIfNeeded,
        hasSpotify
    ]);

    const handleBackClick = () => {
        router.back();
    };

    const handleSpotifyClick = (track: any) => {
        try {
            let spotifyUrl = '';

            if (track.uri) {
                spotifyUrl = track.uri.replace('spotify:', 'https://open.spotify.com/');
            } else if (track.external_urls?.spotify) {
                spotifyUrl = track.external_urls.spotify;
            } else {                
                const title = track.title || track.name || '';
                const artist = track.artist || (track.artists ? track.artists.map((a: any) => a.name).join(' ') : '');
                spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(`${title} ${artist}`)}`;
            }

            window.open(spotifyUrl, '_blank', 'noopener,noreferrer');
        } catch (error) {
            console.error('Error opening Spotify track:', error);
        }
    };

    const handleConnectSpotify = () => {
        router.push('/auth/spotify');
    };
    
    const getUserData = () => {
        if (isCurrentUser && isAuthenticated) {
            const userData = {
                fid: currentUserFid!,
                username: farcaster?.username || 'user',
                displayName: farcaster?.displayName || getDisplayName() || 'User',
                pfpUrl: getProfileImage() || farcaster?.pfpUrl,
                hasSpotify: hasSpotify,
                bio: farcaster?.bio,
                followerCount: farcaster?.followerCount,
                followingCount: farcaster?.followingCount,
                verifiedAddresses: farcaster?.verifiedAddresses
            };
            
            return {
                ...userData,
                user: userData 
            };
        }
        return profile?.user;
    };
    
    const getTracksData = () => {
        if (isCurrentUser) {
            const formatTracks = (tracks: any[]) => {
                if (!tracks) return [];
                return tracks.map(track => ({
                    id: track.id,
                    title: track.title || track.name,
                    artist: track.artist || (track.artists ? track.artists.map((a: any) => a.name).join(', ') : ''),
                    album: track.album || track.album?.name,
                    coverArt: track.coverArt || track.album?.images?.[0]?.url,
                    uri: track.uri,
                    popularity: track.popularity,
                    duration: track.duration_ms ? `${Math.floor(track.duration_ms / 60000)}:${Math.floor((track.duration_ms % 60000) / 1000).toString().padStart(2, '0')}` : undefined
                }));
            };

            const formatCurrentTrack = (track: any) => {
                if (!track) return null;
                return {
                    id: track.id,
                    title: track.title || track.name,
                    artist: track.artist || (track.artists ? track.artists.map((a: any) => a.name).join(', ') : ''),
                    album: track.album || track.album?.name,
                    coverArt: track.coverArt || track.album?.images?.[0]?.url,
                    uri: track.uri,
                    isPlaying: track.isPlaying,
                    timestamp: Date.now()
                };
            };

            return {
                topTracks: {
                    short_term: formatTracks(topTracks.short_term || []),
                    medium_term: formatTracks(topTracks.medium_term || []),
                    long_term: formatTracks(topTracks.long_term || [])
                },
                recentTracks: currentlyPlaying ? [formatCurrentTrack(currentlyPlaying)] : [],
                isLoading: isLoadingTracks.short_term || isLoadingTracks.medium_term || isLoadingTracks.long_term
            };
        }
        
        return {
            topTracks: profile?.topTracks || {
                short_term: [],
                medium_term: [],
                long_term: []
            },
            recentTracks: profile?.recentTracks || [],
            isLoading: profile?.isLoading || false
        };
    };

    const userData = getUserData();
    const tracksData = getTracksData();

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
                    <h1 className="text-xl font-bold">
                        {isCurrentUser ? 'Your Profile' : 'Profile'}
                    </h1>
                </div>

                {/* Profile Content */}
                {isLoading || tracksData.isLoading ? (
                    <ProfileSkeleton />
                ) : userData ? (
                    <div className="space-y-6">
                        {/* Profile Header */}
                        <ProfileHeader
                            user={userData}
                            isCurrentUser={isCurrentUser}
                        />

                        {/* Spotify Connection Status */}
                        {!userData.hasSpotify ? (
                            <div className="bg-orange-900/30 border border-orange-600/50 rounded-lg p-4 text-center">
                                <div className="mb-4">
                                    <div className="w-16 h-16 bg-orange-600/30 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-orange-400">
                                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.6 0-.359.24-.66.54-.78 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.242 1.021zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-medium text-orange-200 mb-2">
                                        {isCurrentUser ? 'Connect Your Spotify' : 'No Spotify Connected'}
                                    </h3>
                                    <p className="text-orange-200 mb-4">
                                        {isCurrentUser
                                            ? "Connect your Spotify account to see your top tracks and share your music taste with friends."
                                            : "This user hasn't connected their Spotify account yet."
                                        }
                                    </p>
                                </div>

                                {isCurrentUser && (
                                    <Button
                                        onClick={handleConnectSpotify}
                                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
                                    >
                                        Connect Spotify Account
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <>
                                {/* Time Range Selector */}
                                <div className="bg-purple-800/20 rounded-lg p-4">
                                    <h3 className="font-medium mb-3">
                                        {isCurrentUser ? 'Your Top Tracks' : 'Top Tracks'}
                                    </h3>
                                    <div className="flex space-x-2 overflow-x-auto">
                                        {[
                                            { key: 'short_term', label: 'Last 4 Weeks' },
                                            { key: 'medium_term', label: 'Last 6 Months' },
                                            { key: 'long_term', label: 'All Time' }
                                        ].map(({ key, label }) => (
                                            <button
                                                key={key}
                                                onClick={() => setActiveTimeRange(key as TimeRange)}
                                                className={`px-3 py-1 text-sm rounded transition-colors whitespace-nowrap ${activeTimeRange === key
                                                        ? 'bg-purple-600 text-white'
                                                        : 'bg-purple-900/50 text-gray-300 hover:bg-purple-800/50'
                                                    }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                <TopTracksSection
                                    tracks={tracksData.topTracks[activeTimeRange] || []}
                                    timeRange={activeTimeRange}
                                    onTrackClick={handleSpotifyClick}
                                    onTimeRangeChange={setActiveTimeRange}
                                    isLoading={tracksData.isLoading}
                                />
                                
                                {tracksData.recentTracks.length > 0 && (
                                    <RecentTracksSection
                                        tracks={tracksData.recentTracks}
                                        onTrackClick={handleSpotifyClick}
                                    />
                                )}
                                
                                {!tracksData.isLoading &&
                                    (!tracksData.topTracks[activeTimeRange] || tracksData.topTracks[activeTimeRange].length === 0) &&
                                    tracksData.recentTracks.length === 0 && (
                                        <div className="bg-purple-800/20 rounded-lg p-6 text-center">
                                            <div className="w-16 h-16 bg-purple-700/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M9 18V5l12-2v13" />
                                                    <circle cx="6" cy="18" r="3" />
                                                    <circle cx="18" cy="16" r="3" />
                                                </svg>
                                            </div>
                                            <h3 className="font-medium mb-2">No Music Data</h3>
                                            <p className="text-gray-400 text-sm">
                                                {isCurrentUser
                                                    ? "Start listening to music on Spotify to see your top tracks here!"
                                                    : "This user doesn't have any music data to display yet."
                                                }
                                            </p>
                                        </div>
                                    )}
                            </>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-800/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        </div>
                        <h3 className="font-medium mb-2">Profile Not Found</h3>
                        <p className="text-gray-400">This user profile could not be loaded.</p>
                    </div>
                )}
            </div>
        </div>
    );
}


const ProfileSkeleton: React.FC = () => (
    <div className="space-y-6 animate-pulse">

        <div className="bg-purple-800/20 rounded-lg p-6">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-20 h-20 bg-purple-700/30 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="h-6 bg-purple-700/30 rounded w-32 mb-2" />
                    <div className="h-4 bg-purple-700/20 rounded w-24 mb-2" />
                    <div className="h-3 bg-purple-700/20 rounded w-16" />
                </div>
            </div>
            <div className="flex gap-6 pt-4 border-t border-purple-700/50">
                <div className="text-center">
                    <div className="h-6 bg-purple-700/30 rounded w-12 mb-1" />
                    <div className="h-3 bg-purple-700/20 rounded w-16" />
                </div>
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

        
        <div className="bg-purple-800/20 rounded-lg p-4">
            <div className="h-5 bg-purple-700/30 rounded w-24 mb-3" />
            <div className="flex space-x-2">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-8 bg-purple-700/30 rounded w-20" />
                ))}
            </div>
        </div>
        
        <div className="bg-purple-800/20 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
                <div className="h-5 bg-purple-700/30 rounded w-24" />
                <div className="h-8 bg-purple-700/30 rounded w-16" />
            </div>
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded">
                        <div className="w-8 text-center">
                            <div className="h-4 bg-purple-700/20 rounded w-4 mx-auto" />
                        </div>
                        <div className="w-10 h-10 bg-purple-700/30 rounded" />
                        <div className="flex-1 min-w-0">
                            <div className="h-4 bg-purple-700/30 rounded w-3/4 mb-1" />
                            <div className="h-3 bg-purple-700/20 rounded w-1/2" />
                        </div>
                        <div className="w-4 h-4 bg-purple-700/20 rounded" />
                    </div>
                ))}
            </div>
        </div>
    </div>
);