/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { FC, useEffect, useState } from 'react';
import { useAuthStore } from "~/lib/stores/authStore";
import { SpotifyImage } from "./SpotifyImage";
import { formatRelativeTime } from "~/lib/utils";

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
  };
  timestamp: number;
}

export const FriendsListening: FC<{ isLoading: boolean }> = ({ isLoading: propIsLoading }) => {
  const [friendsActivity, setFriendsActivity] = useState<FriendActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { fid, isAuthenticated, isLinked } = useAuthStore();

  // Fetch friends listening activity function
  const fetchFriendsActivity = async () => {
    if (!isAuthenticated || !isLinked || !fid) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch from your API endpoint
      const response = await fetch(`/api/friends-listening?fid=${fid}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setFriendsActivity(data.activities || []);
    } catch (err) {
      console.error('Error fetching friends activity:', err);
      setError(err instanceof Error ? err.message : 'Failed to load friends activity');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchFriendsActivity();
  }, [fid, isAuthenticated, isLinked]);

  // Refresh function
  const handleRefresh = async () => {
    await fetchFriendsActivity();
  };

  if (isLoading || propIsLoading) {
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
          onClick={handleRefresh}
          className="text-sm text-purple-400 hover:text-purple-300"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (friendsActivity.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-16 h-16 bg-purple-800/30 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="2" />
            <path d="M20.09 14.25c-2.06-.05-2.06-.8-2.06-.8s2.06-.75 2.06-.8V12c0-.25-.25-.5-.5-.5s-.5.25-.5.5v.45s-2.06.75-2.06.8 2.06.75 2.06.8V20" />
          </svg>
        </div>
        <p className="text-gray-400 mb-2">No friends are listening to music right now</p>
        <p className="text-gray-500 text-sm text-center mb-4">
          Connect with more friends who use Spotify to see their activity
        </p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-full"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {friendsActivity.map((activity) => (
        <div key={activity.id} className="bg-purple-800/30 p-4 rounded-lg">
          <div className="flex">
            {/* Profile image */}
            <div className="w-12 h-12 rounded-full bg-purple-700 cursor-pointer flex-shrink-0 overflow-hidden relative">
              <SpotifyImage
                src={activity.profileImage || '/api/placeholder/48/48'}
                alt={activity.displayName || activity.username}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>

            {/* User and track info */}
            <div className="ml-3 flex-grow min-w-0">
              {/* User info header */}
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <p className="font-medium cursor-pointer hover:underline truncate">
                    {activity.displayName || activity.username}
                  </p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                  {formatRelativeTime(activity.timestamp)}
                </span>
              </div>

              {/* Username */}
              <p className="text-xs text-gray-400 mb-2">@{activity.username}</p>

              {/* Track details */}
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-800 rounded mr-3 flex-shrink-0 cursor-pointer relative">
                  <SpotifyImage
                    src={activity.track.coverArt || '/api/placeholder/40/40'}
                    alt={activity.track.album || activity.track.title}
                    width={40}
                    height={40}
                    className="rounded object-cover"
                  />
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-sm font-medium truncate cursor-pointer hover:underline">
                    {activity.track.title}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {activity.track.artist}
                  </p>
                  <div className="flex items-center mt-1 space-x-2">
                    {activity.track.isPlaying && (
                      <span className="text-xs text-green-400">
                        Now Playing
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Manual refresh button */}
      <div className="flex justify-center mt-6">
        <button
          onClick={handleRefresh}
          className="px-4 py-2 text-sm bg-purple-800/50 hover:bg-purple-700/50 rounded-full"
        >
          Refresh
        </button>
      </div>
    </div>
  );
};