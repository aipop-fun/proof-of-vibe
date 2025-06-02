/* eslint-disable  @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment, react/no-unescaped-entities, @typescript-eslint/no-unused-vars */
// @ts-nocheck

"use client";

import { FC, useEffect, useState } from 'react';
import Image from 'next/image';
import { useMusic } from "../lib/MusicContext";
import { NavigationHelper } from "~/lib/utils/navigation";
import { useFrame } from "./providers/FrameProvider";
import { useAuth } from "../lib/hooks/useAuth";

interface TrendingTrack {
  id: string;
  rank: number;
  title: string;
  artist: string;
  album?: string;
  coverArt?: string;
  duration?: string;
  spotifyUri?: string;
  popularity?: number;
  trendingScore: number;
  stats: {
    uniqueListeners: number;
    totalPlays: number;
    daysSinceLastHeard: number;
  };
  recentListeners: Array<{
    username?: string;
    displayName?: string;
    fid: number;
    profileImage?: string;
    listenedAt: string;
  }>;
}

interface FriendListeningItem {
  id: string;
  timestamp?: number | string;
  listened_at: string;
  fid?: number | string;
  username?: string;
  name?: string;
  displayName?: string;
  profileImage?: string;
  avatar?: string;
  pfp?: string;
  isMutual?: boolean;
  isFollower?: boolean;
  isFollowing?: boolean;
  track?: {
    title: string;
    artist: string;
    albumArt?: string;
    coverArt?: string;
    album?: string;
    type?: string;
    currentTime?: string;
    duration?: string;
  };
}

interface FriendsListeningProps {
  isLoading: boolean;
}

export const FriendsListening: FC<FriendsListeningProps> = ({ isLoading: propIsLoading }) => {
  const { friendsListening, isLoading: contextIsLoading, refreshFriendsListening } = useMusic();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trendingTracks, setTrendingTracks] = useState<TrendingTrack[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [showTrending, setShowTrending] = useState(false);
  const { isMiniApp } = useFrame();
  const { navigate } = useAuth(); // Use the unified navigation from useAuth

  const isLoading = propIsLoading || contextIsLoading || refreshing;

  // Fetch trending tracks when no friends are listening
  useEffect(() => {
    if (friendsListening.length === 0 && !isLoading && !showTrending) {
      fetchTrendingTracks();
    }
  }, [friendsListening.length, isLoading, showTrending]);

  // Fetch trending tracks
  const fetchTrendingTracks = async () => {
    setLoadingTrending(true);
    setError(null);

    try {
      const response = await fetch('/api/trending-tracks?limit=8&days=28&min_listeners=1');

      if (!response.ok) {
        // Try to get error details from response
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.details || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.details || data.error);
      }

      // Check if we have tracks or if it's an empty response
      if (!data.tracks || data.tracks.length === 0) {
        console.log('No trending tracks available:', data.metadata?.message);
        setTrendingTracks([]);
        setShowTrending(true);
        return;
      }

      setTrendingTracks(data.tracks);
      setShowTrending(true);
      console.log(`Loaded ${data.tracks.length} trending tracks`);
    } catch (err) {
      console.error('Error fetching trending tracks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trending tracks');
      // Don't set showTrending to true if there's an error
    } finally {
      setLoadingTrending(false);
    }
  };

  // Pull to refresh functionality
  useEffect(() => {
    if (!isMiniApp) return;

    const handleRefresh = async () => {
      if (refreshing) return;

      setRefreshing(true);
      setError(null);

      try {
        await refreshFriendsListening();
        if (showTrending) {
          await fetchTrendingTracks();
        }
      } catch (err) {
        setError('Failed to refresh data');
        console.error('Error refreshing:', err);
      } finally {
        setTimeout(() => setRefreshing(false), 500);
      }
    };

    // Use the NavigationHelper's SDK access
    if (NavigationHelper.hasNativeFeatures()) {
      // SDK events would be handled here if available
    }

    return () => {
      // Cleanup if needed
    };
  }, [isMiniApp, refreshFriendsListening, refreshing, showTrending]);

  // Format timestamp for display
  const formatTimestamp = (timestamp: number | string | undefined): string => {
    if (timestamp == null) return 'Just now';

    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return `${Math.floor(diff / 604800)}w ago`;
  };

  // View profile using unified navigation
  const viewProfile = (fid?: number | string): void => {
    if (!fid) {
      console.warn('No FID provided for profile navigation');
      return;
    }

    const profileUrl = `/profile/${fid}`;
    navigate(profileUrl, false);
  };

  // Get profile name with fallback
  const getProfileName = (friend: FriendListeningItem): string => {
    return (
      friend.displayName ||
      friend.name ||
      friend.username ||
      'Unknown Listener'
    );
  };

  // Get profile image with fallback
  const getProfileImage = (friend: FriendListeningItem): string => {
    return (
      friend.profileImage ||
      friend.avatar ||
      friend.pfp ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(getProfileName(friend))}&background=8B5CF6&color=fff`
    );
  };

  // Get track image with fallback
  const getTrackImage = (track?: FriendListeningItem['track'] | { coverArt?: string }): string => {
    return (
      track?.coverArt ||
      '/api/placeholder/60/60'
    );
  };

  // Open track in Spotify using NavigationHelper
  const openInSpotify = (track?: FriendListeningItem['track'], spotifyUri?: string) => {
    if (spotifyUri) {
      NavigationHelper.openSpotify(spotifyUri);
    } else if (track) {
      NavigationHelper.openSpotify(undefined, undefined, `${track.title} ${track.artist}`);
    }
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    if (refreshing) return;

    setRefreshing(true);
    setError(null);

    try {
      await refreshFriendsListening();
      if (showTrending) {
        await fetchTrendingTracks();
      }
    } catch (err) {
      setError('Failed to refresh data');
      console.error('Error refreshing:', err);
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  // Get relationship badge
  const getRelationshipBadge = (friend: FriendListeningItem) => {
    if (friend.isMutual) {
      return <span className="text-xs bg-purple-600 text-white px-1 rounded">Mutual</span>;
    }
    if (friend.isFollowing) {
      return <span className="text-xs bg-blue-600 text-white px-1 rounded">Following</span>;
    }
    if (friend.isFollower) {
      return <span className="text-xs bg-green-600 text-white px-1 rounded">Follower</span>;
    }
    return null;
  };

  // Loading state
  if (isLoading && !showTrending) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-purple-800/30 p-4 rounded-lg animate-pulse">
            <div className="flex">
              <div className="w-12 h-12 bg-purple-700/50 rounded-full flex-shrink-0"></div>
              <div className="ml-3 flex-grow">
                <div className="h-4 bg-purple-700/50 rounded w-24 mb-2"></div>
                <div className="h-3 bg-purple-700/30 rounded w-16 mb-2"></div>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-purple-700/50 rounded mr-2"></div>
                  <div className="flex-grow">
                    <div className="h-3 bg-purple-700/50 rounded w-32 mb-1"></div>
                    <div className="h-3 bg-purple-700/30 rounded w-20"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-16 h-16 bg-red-800/30 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <p className="text-red-400 mb-2">{error}</p>
        <button
          onClick={handleManualRefresh}
          className="text-sm text-purple-400 hover:text-purple-300"
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Try Again'}
        </button>
      </div>
    );
  }

  // Show friends listening if we have data
  if (friendsListening.length > 0) {
    return (
      <div className="space-y-4">
        {friendsListening.map((friend) => (
          <div key={friend.id} className="bg-purple-800/30 p-4 rounded-lg">
            <div className="flex">
              {/* Profile image - now clickable with hover effects */}
              <div
                className="w-12 h-12 rounded-full bg-purple-700 cursor-pointer flex-shrink-0 overflow-hidden relative hover:opacity-80 transition-opacity"
                onClick={() => viewProfile(friend.fid)}
                title={`View ${getProfileName(friend)}'s profile`}
              >
                <Image
                  src={getProfileImage(friend)}
                  alt={getProfileName(friend)}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>

              {/* User and track info */}
              <div className="ml-3 flex-grow min-w-0">
                {/* User info header */}
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    <p
                      className="font-medium cursor-pointer hover:underline truncate transition-colors hover:text-purple-300"
                      onClick={() => viewProfile(friend.fid)}
                      title={`View ${getProfileName(friend)}'s profile`}
                    >
                      {getProfileName(friend)}
                    </p>
                    {getRelationshipBadge(friend)}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                    {formatTimestamp(friend.listened_at)}
                  </span>
                </div>

                {/* Username - also clickable */}
                {friend.username && (
                  <p
                    className="text-xs text-gray-400 mb-2 cursor-pointer hover:text-gray-300 transition-colors"
                    onClick={() => viewProfile(friend.fid)}
                    title={`View ${getProfileName(friend)}'s profile`}
                  >
                    @{friend.username}
                  </p>
                )}

                {/* Track details */}
                {friend.track && (
                  <div className="flex items-center">
                    <div
                      className="w-10 h-10 bg-gray-800 rounded mr-3 flex-shrink-0 cursor-pointer relative hover:opacity-80 transition-opacity"
                      onClick={() => openInSpotify(friend.track)}
                      title={`Open ${friend.track.title} in Spotify`}
                    >
                      <Image
                        src={getTrackImage(friend.track)}
                        alt={friend.track.album || friend.track.title}
                        fill
                        sizes="40px"
                        className="rounded object-cover"
                      />
                    </div>
                    <div className="flex-grow min-w-0">
                      <p
                        className="text-sm font-medium truncate cursor-pointer hover:underline transition-colors hover:text-green-300"
                        onClick={() => openInSpotify(friend.track)}
                        title={`Open ${friend.track.title} in Spotify`}
                      >
                        {friend.track.title}
                      </p>
                      <p
                        className="text-xs text-gray-400 truncate hover:text-gray-300 transition-colors"
                        title={friend.track.artist}
                      >
                        {friend.track.artist}
                      </p>
                      {/* Track metadata */}
                      <div className="flex items-center mt-1 space-x-2">
                        {friend.track.type && (
                          <span className="text-xs text-green-400">
                            {friend.track.type === "podcast" ? "PODCAST" : "SONG"}
                          </span>
                        )}
                        {friend.track.currentTime && friend.track.duration && (
                          <span className="text-xs text-gray-400">
                            {friend.track.currentTime} / {friend.track.duration}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Manual refresh button */}
        <div className="flex justify-center mt-6">
          <button
            onClick={handleManualRefresh}
            className="px-4 py-2 text-sm bg-purple-800/50 hover:bg-purple-700/50 rounded-full transition-colors"
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
    );
  }

  // Show trending tracks when no friends are listening
  if (showTrending && trendingTracks.length > 0) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">🔥 Trending on Timbra</h3>
            <p className="text-sm text-gray-400">Most played tracks in the last 4 weeks</p>
          </div>
          <button
            onClick={handleManualRefresh}
            className="text-xs text-purple-400 hover:text-purple-300"
            disabled={refreshing || loadingTrending}
          >
            {refreshing || loadingTrending ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Trending tracks list */}
        {trendingTracks.map((track) => (
          <div key={track.id} className="bg-purple-800/30 p-4 rounded-lg">
            <div className="flex items-center">
              {/* Rank */}
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-white text-sm font-bold">#{track.rank}</span>
              </div>

              {/* Track image */}
              <div
                className="w-12 h-12 bg-gray-800 rounded mr-3 flex-shrink-0 cursor-pointer relative hover:opacity-80 transition-opacity"
                onClick={() => openInSpotify(undefined, track.spotifyUri)}
                title={`Open ${track.title} in Spotify`}
              >
                <Image
                  src={getTrackImage({ coverArt: track.coverArt })}
                  alt={track.album || track.title}
                  fill
                  sizes="48px"
                  className="rounded object-cover"
                />
              </div>

              {/* Track details */}
              <div className="flex-grow min-w-0">
                <p
                  className="font-medium truncate cursor-pointer hover:underline transition-colors hover:text-green-300"
                  onClick={() => openInSpotify(undefined, track.spotifyUri)}
                  title={`Open ${track.title} in Spotify`}
                >
                  {track.title}
                </p>
                <p className="text-sm text-gray-300 truncate" title={track.artist}>
                  {track.artist}
                </p>

                {/* Stats */}
                <div className="flex items-center mt-1 space-x-3">
                  <span className="text-xs text-green-400">
                    {track.stats.uniqueListeners} listeners
                  </span>
                  <span className="text-xs text-blue-400">
                    {track.stats.totalPlays} plays
                  </span>
                  {track.duration && (
                    <span className="text-xs text-gray-400">
                      {track.duration}
                    </span>
                  )}
                </div>
              </div>

              {/* Recent listeners avatars - all clickable */}
              <div className="flex -space-x-2 ml-2">
                {track.recentListeners.slice(0, 3).map((listener, index) => (
                  <div
                    key={listener.fid}
                    className="w-8 h-8 rounded-full bg-purple-700 border-2 border-purple-800 cursor-pointer overflow-hidden relative hover:opacity-80 transition-opacity"
                    onClick={() => viewProfile(listener.fid)}
                    title={`View ${listener.displayName || listener.username || `FID: ${listener.fid}`}'s profile`}
                  >
                    <Image
                      src={listener.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(listener.displayName || listener.username || 'User')}&background=8B5CF6&color=fff`}
                      alt={listener.displayName || listener.username || 'User'}
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  </div>
                ))}
                {track.stats.uniqueListeners > 3 && (
                  <div className="w-8 h-8 rounded-full bg-gray-700 border-2 border-purple-800 flex items-center justify-center">
                    <span className="text-xs text-gray-300">+{track.stats.uniqueListeners - 3}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Show more trending button */}
        <div className="flex justify-center mt-6">
          <button
            onClick={() => {
              // Could implement pagination or show more tracks
              setShowTrending(false);
              setTimeout(() => fetchTrendingTracks(), 100);
            }}
            className="px-4 py-2 text-sm bg-orange-600/50 hover:bg-orange-500/50 rounded-full transition-colors"
            disabled={loadingTrending}
          >
            {loadingTrending ? 'Loading...' : 'Refresh Trending'}
          </button>
        </div>
      </div>
    );
  }

  // Loading trending state
  if (loadingTrending) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">🔥 Trending on Timbra</h3>
            <p className="text-sm text-gray-400">Loading trending tracks...</p>
          </div>
        </div>

        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-purple-800/30 p-4 rounded-lg animate-pulse">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-orange-500/50 rounded-full mr-3 flex-shrink-0"></div>
              <div className="w-12 h-12 bg-purple-700/50 rounded mr-3 flex-shrink-0"></div>
              <div className="flex-grow">
                <div className="h-4 bg-purple-700/50 rounded w-32 mb-2"></div>
                <div className="h-3 bg-purple-700/30 rounded w-24 mb-2"></div>
                <div className="flex space-x-3">
                  <div className="h-3 bg-green-400/30 rounded w-16"></div>
                  <div className="h-3 bg-blue-400/30 rounded w-12"></div>
                </div>
              </div>
              <div className="flex -space-x-2">
                <div className="w-8 h-8 bg-purple-700/50 rounded-full"></div>
                <div className="w-8 h-8 bg-purple-700/50 rounded-full"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state - no friends and no trending yet
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <div className="w-16 h-16 bg-purple-800/30 rounded-full flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      </div>
      <p className="text-gray-400 mb-2">No recent listening activity</p>
      <p className="text-gray-500 text-sm text-center mb-4">
        Your friends haven't listened to music recently<br />
        Connect with more friends to see their music activity
      </p>
      <div className="space-y-2">
        <button
          onClick={fetchTrendingTracks}
          className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 rounded-full transition-colors"
          disabled={loadingTrending}
        >
          {loadingTrending ? 'Loading...' : '🔥 Show Trending Tracks'}
        </button>
        <button
          onClick={handleManualRefresh}
          className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-full transition-colors"
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
    </div>
  );
};