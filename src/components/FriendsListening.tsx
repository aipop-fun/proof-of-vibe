/* eslint-disable  @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */

"use client";

import { FC } from 'react';
import { useMusic } from "./MusicContext";
import sdk from "@farcaster/frame-sdk";

// Define a more flexible interface that can handle different data structures
interface FriendListeningItem {
  id: string;
  [key: string]: any;
  track?: {
    title: string;
    artist: string;
    albumArt?: string;
    coverArt?: string;
    album?: string;
    type?: 'song' | 'podcast';
    currentTime?: string;
    duration?: string;
  };
}

// Define props interface
interface FriendsListeningProps {
  isLoading: boolean;
}

export const FriendsListening: FC<FriendsListeningProps> = ({ isLoading }) => {
  const { friendsListening } = useMusic();

  const formatTimestamp = (timestamp: number | string | undefined): string => {
    if (timestamp == null) return 'Just now';

    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // difference in seconds

    if (diff < 60) return `${diff} sec ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    return `${Math.floor(diff / 3600)} hr ago`;
  };

  const viewProfile = (fid?: number | string): void => {
    if (fid) {
      sdk.actions.viewProfile({ fid: Number(fid) });
    }
  };

  const getProfileName = (friend: FriendListeningItem): string => {
    return (
      friend.name ||
      friend.username ||
      friend.displayName ||
      'Unknown Listener'
    );
  };

  const getProfileImage = (friend: FriendListeningItem): string => {
    return (
      friend.profileImage ||
      friend.profilePic ||
      friend.avatar ||
      '/default-avatar.png'
    );
  };

  const getTrackImage = (track?: FriendListeningItem['track']): string => {
    return (
      track?.albumArt ||
      track?.coverArt ||
      '/default-album-art.png'
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-purple-800/30 p-4 rounded-lg animate-pulse h-24"></div>
        ))}
      </div>
    );
  }

  if (friendsListening.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-gray-400">No friends are currently listening</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {friendsListening.map((friend) => (
        <div key={friend.id} className="bg-purple-800/30 p-4 rounded-lg flex">
          <div
            className="w-12 h-12 rounded-full bg-purple-700 cursor-pointer flex-shrink-0"
            // @ts-expect-error
            onClick={() => viewProfile(friend.fid)}
          >
            <img
              src={getProfileImage(friend)}
              alt={getProfileName(friend)}
              className="w-12 h-12 rounded-full object-cover"
            />
          </div>

          <div className="ml-3 flex-grow">
            <div className="flex justify-between items-start">
              <div>
                <p
                  className="font-medium cursor-pointer hover:underline"
                  // @ts-expect-error
                  onClick={() => viewProfile(friend.fid)}
                >
                  {getProfileName(friend)}
                </p>
                {friend.username && (
                  <p className="text-xs text-gray-400">@{friend.username}</p>
                )}
              </div>
              <span className="text-xs text-gray-400">
                {
                  // @ts-expect-error
                formatTimestamp(friend.timestamp)}
              </span>
            </div>

            {friend.track && (
              <div className="mt-2 flex items-center">
                <div className="w-10 h-10 bg-gray-800 rounded mr-2 flex-shrink-0">
                  <img
                    src={getTrackImage(friend.track)}
                    alt={friend.track.album || friend.track.title}
                    className="w-10 h-10 rounded"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">{friend.track.title}</p>
                  <p className="text-xs text-gray-400">{friend.track.artist}</p>
                  <div className="flex items-center mt-1">
                    {friend.track.type && (
                      <span className="text-xs text-green-400 mr-2">
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
      ))}
    </div>
  );
};