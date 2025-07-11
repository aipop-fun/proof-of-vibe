/* eslint-disable react-hooks/exhaustive-deps, @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
"use client";

import { FC, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from "~/lib/stores/authStore";
import { useFrame } from "~/components/providers/FrameProvider";
import { SpotifyImage } from "./SpotifyImage";
import { formatRelativeTime } from "~/lib/utils";
import sdk from "@farcaster/frame-sdk";

interface FriendActivity {
  id: string;
  fid: number;
  username: string;
  displayName?: string;
  profileImage?: string;
  track: {
    title: string;
    artist: string;
    album?: string;
    coverArt?: string;
    isPlaying: boolean;
    uri?: string;
  };
  timestamp: number;
}

interface FriendsListeningProps {
  isLoading?: boolean;
  onProfileClick?: (fid: number) => void;
  onTrackClick?: (track: FriendActivity['track']) => void;
}

export const FriendsListening: FC<FriendsListeningProps> = ({
  isLoading: propIsLoading = false,
  onProfileClick,
  onTrackClick
}) => {
  const [friendsActivity, setFriendsActivity] = useState<FriendActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const { fid, isAuthenticated, isLinked } = useAuthStore();
  const { isMiniApp } = useFrame();
  const router = useRouter();

  // Navigate to Timbra profile
  const handleProfileClick = useCallback(async (targetFid: number, username: string) => {
    try {
      if (onProfileClick) {
        onProfileClick(targetFid);
        return;
      }

      const profileUrl = `/profile/${targetFid}`;

      if (isMiniApp && typeof sdk?.actions?.openUrl === 'function') {
        const baseUrl = process.env.NEXT_PUBLIC_URL || window.location.origin;
        await sdk.actions.openUrl(`${baseUrl}${profileUrl}`);
      } else {
        router.push(profileUrl);
      }
    } catch (error) {
      console.error('Failed to navigate to profile:', error);
      // Fallback: try direct navigation
      router.push(`/profile/${targetFid}`);
    }
  }, [onProfileClick, isMiniApp, router]);

  // Handle track click to open in Spotify
  const handleTrackClick = useCallback(async (track: FriendActivity['track']) => {
    try {
      if (onTrackClick) {
        onTrackClick(track);
        return;
      }

      let spotifyUrl = '';
      if (track.uri) {
        spotifyUrl = track.uri.replace('spotify:', 'https://open.spotify.com/');
      } else {
        spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(`${track.title} ${track.artist}`)}`;
      }

      if (isMiniApp && typeof sdk?.actions?.openUrl === 'function') {
        await sdk.actions.openUrl(spotifyUrl);
      } else {
        window.open(spotifyUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Failed to open track in Spotify:', error);
    }
  }, [onTrackClick, isMiniApp]);

  // Fetch friends listening activity function
  const fetchFriendsActivity = useCallback(async () => {
    if (!isAuthenticated || !isLinked || !fid) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch(`/api/friends-listening?fid=${fid}`, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Validate response data
      if (!data || !Array.isArray(data.activities)) {
        throw new Error('Invalid response format');
      }

      // Filter and validate activity items
      const validActivities = data.activities.filter((activity: any) =>
        activity &&
        activity.fid &&
        activity.username &&
        activity.track &&
        activity.track.title &&
        activity.track.artist
      );

      setFriendsActivity(validActivities);
      setRefreshCount(prev => prev + 1);
    } catch (err) {
      console.error('Error fetching friends activity:', err);

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Request timed out. Please try again.');
        } else {
          setError(err.message || 'Failed to load friends activity');
        }
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  }, [fid, isAuthenticated, isLinked]);

  // Initial fetch on mount and when dependencies change
  useEffect(() => {
    fetchFriendsActivity();
  }, [fetchFriendsActivity]);

  // Auto-refresh every 30 seconds if there's activity
  useEffect(() => {
    if (!isAuthenticated || !isLinked || friendsActivity.length === 0) return;

    const interval = setInterval(() => {
      fetchFriendsActivity();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchFriendsActivity, isAuthenticated, isLinked, friendsActivity.length]);

  // Refresh function with debouncing
  const handleRefresh = useCallback(async () => {
    if (isLoading) return;
    await fetchFriendsActivity();
  }, [fetchFriendsActivity, isLoading]);

  // Loading state
  if (isLoading || propIsLoading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading friends activity">
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
      <div className="flex flex-col items-center justify-center h-64" role="alert">
        <div className="w-16 h-16 bg-red-800/30 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <p className="text-red-400 mb-2 text-center max-w-md">{error}</p>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="text-sm text-purple-400 hover:text-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Retry loading friends activity"
        >
          {isLoading ? 'Retrying...' : 'Try Again'}
        </button>
      </div>
    );
  }

  // Empty state
  if (friendsActivity.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-16 h-16 bg-purple-800/30 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        <p className="text-gray-400 mb-2 text-center">No friends are listening to music right now</p>
        <p className="text-gray-500 text-sm text-center mb-4 max-w-md">
          Connect with more friends who use Spotify to see their activity
        </p>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Refresh friends activity"
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Activity list */}
      {friendsActivity.map((activity) => (
        <div key={activity.id} className="bg-purple-800/30 p-4 rounded-lg hover:bg-purple-800/40 transition-colors">
          <div className="flex">
            {/* Profile image - Click to view Timbra profile */}
            <div
              className="w-12 h-12 rounded-full bg-purple-700 cursor-pointer flex-shrink-0 overflow-hidden relative hover:ring-2 hover:ring-purple-500/50 transition-all"
              onClick={() => handleProfileClick(activity.fid, activity.username)}
              title={`View ${activity.displayName || activity.username}'s Timbra profile`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleProfileClick(activity.fid, activity.username);
                }
              }}
            >
              <SpotifyImage
                src={activity.profileImage || '/api/placeholder/48/48'}
                alt={`${activity.displayName || activity.username}'s profile picture`}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
              {/* Timbra indicator */}
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center border border-purple-900">
                <span className="text-xs font-bold text-white">T</span>
              </div>
            </div>

            {/* User and track info */}
            <div className="ml-3 flex-grow min-w-0">
              {/* User info header */}
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <p
                    className="font-medium cursor-pointer hover:underline truncate transition-colors hover:text-purple-300"
                    onClick={() => handleProfileClick(activity.fid, activity.username)}
                    title={`View ${activity.displayName || activity.username}'s profile`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleProfileClick(activity.fid, activity.username);
                      }
                    }}
                  >
                    {activity.displayName || activity.username}
                  </p>
                  {/* Now playing indicator */}
                  {activity.track.isPlaying && (
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-400 ml-1">Live</span>
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                  {formatRelativeTime(activity.timestamp)}
                </span>
              </div>

              {/* Username */}
              <p className="text-xs text-gray-400 mb-2">@{activity.username}</p>

              {/* Track details */}
              <div className="flex items-center">
                <div
                  className="w-10 h-10 bg-gray-800 rounded mr-3 flex-shrink-0 cursor-pointer relative overflow-hidden hover:scale-105 transition-transform"
                  onClick={() => handleTrackClick(activity.track)}
                  title={`Play "${activity.track.title}" on Spotify`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleTrackClick(activity.track);
                    }
                  }}
                >
                  <SpotifyImage
                    src={activity.track.coverArt || '/api/placeholder/40/40'}
                    alt={`${activity.track.album || activity.track.title} album cover`}
                    width={40}
                    height={40}
                    className="rounded object-cover w-full h-full"
                  />
                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>

                <div className="flex-grow min-w-0">
                  <p
                    className="text-sm font-medium truncate cursor-pointer hover:underline transition-colors hover:text-green-400"
                    onClick={() => handleTrackClick(activity.track)}
                    title={`Play "${activity.track.title}" on Spotify`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleTrackClick(activity.track);
                      }
                    }}
                  >
                    {activity.track.title}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {activity.track.artist}
                  </p>
                  <div className="flex items-center mt-1 space-x-2">
                    {activity.track.isPlaying ? (
                      <span className="text-xs text-green-400 flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                        Now Playing
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">
                        Recently played
                      </span>
                    )}

                    {/* Spotify icon */}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#1db954" className="opacity-60">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.6 0-.359.24-.66.54-.78 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.242 1.021zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Manual refresh button and stats */}
      <div className="flex justify-between items-center mt-6 pt-4 border-t border-purple-700/50">
        <div className="text-xs text-gray-400">
          {friendsActivity.length} friend{friendsActivity.length !== 1 ? 's' : ''} listening
          {refreshCount > 0 && (
            <span className="ml-2">• Updated {refreshCount} time{refreshCount !== 1 ? 's' : ''}</span>
          )}
        </div>

        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="px-4 py-2 text-sm bg-purple-800/50 hover:bg-purple-700/50 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Refresh friends activity"
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Refreshing...
            </span>
          ) : (
            'Refresh'
          )}
        </button>
      </div>
    </div>
  );
};