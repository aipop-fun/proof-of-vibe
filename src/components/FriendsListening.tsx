/* eslint-disable  @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment, react/no-unescaped-entities */
// @ts-nocheck

"use client";

import { FC, useEffect, useState } from 'react';
import { useMusic } from "../lib/MusicContext";
import sdk from "@farcaster/frame-sdk";
import { useFrame } from "./providers/FrameProvider";

// Define a more flexible interface that can handle different data structures
interface FriendListeningItem {
  id: string;
  timestamp?: number | string;
  [key: string]: any;
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

// Define props interface
interface FriendsListeningProps {
  isLoading: boolean;
}

export const FriendsListening: FC<FriendsListeningProps> = ({ isLoading: propIsLoading }) => {
  const { friendsListening, isLoading: contextIsLoading, refreshFriendsListening } = useMusic();
  const [refreshing, setRefreshing] = useState(false);
  const { isMiniApp } = useFrame();

  // Combinamos o estado de carregamento das props e do contexto
  const isLoading = propIsLoading || contextIsLoading || refreshing;

  // Pull-to-refresh funcionalidade
  useEffect(() => {
    const handleRefresh = async () => {
      if (refreshing) return;

      setRefreshing(true);
      await refreshFriendsListening();
      setTimeout(() => setRefreshing(false), 500); // Delay para feedback visual
    };

    // Se estamos no MiniApp, podemos escutar eventos de pull-to-refresh
    if (isMiniApp && typeof sdk?.events?.onPullToRefresh === 'function') {
      sdk.events.onPullToRefresh(handleRefresh);
    }

    return () => {
      // Limpar listener quando componente desmontar
      if (isMiniApp && typeof sdk?.events?.offPullToRefresh === 'function') {
        sdk.events.offPullToRefresh(handleRefresh);
      }
    };
  }, [isMiniApp, refreshFriendsListening, refreshing]);

  const formatTimestamp = (timestamp: number | string | undefined): string => {
    if (timestamp == null) return 'Just now';

    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // difference in seconds

    if (diff < 60) return `${diff} sec ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  const viewProfile = (fid?: number | string): void => {
    if (fid && typeof sdk?.actions?.viewProfile === 'function') {
      sdk.actions.viewProfile({ fid: Number(fid) });
    }
  };

  const getProfileName = (friend: FriendListeningItem): string => {
    return (
      friend.name ||
      friend.displayName ||
      friend.username ||
      'Unknown Listener'
    );
  };

  const getProfileImage = (friend: FriendListeningItem): string => {
    return (
      friend.profileImage ||
      friend.avatar ||
      friend.pfp ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(getProfileName(friend))}&background=8B5CF6&color=fff`
    );
  };

  const getTrackImage = (track?: FriendListeningItem['track']): string => {
    return (
      track?.albumArt ||
      track?.coverArt ||
      '/default-album-art.png'
    );
  };

  // Função para abrir o Spotify quando clicar na música
  const openInSpotify = (track?: FriendListeningItem['track']) => {
    if (!track) return;

    // Simulação - em produção você teria o href real para a faixa no Spotify
    const spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(`${track.title} ${track.artist}`)}`;

    if (isMiniApp && typeof sdk?.actions?.openUrl === 'function') {
      sdk.actions.openUrl(spotifyUrl);
    } else {
      window.open(spotifyUrl, '_blank');
    }
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
        <div className="w-16 h-16 bg-purple-800/30 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </div>
        <p className="text-gray-400 mb-2">No friends are currently listening</p>
        <p className="text-gray-500 text-sm text-center">
          Connect with more friends on Farcaster<br />to see what they're listening to
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {friendsListening.map((friend) => (
        <div key={friend.id} className="bg-purple-800/30 p-4 rounded-lg flex">
          <div
            className="w-12 h-12 rounded-full bg-purple-700 cursor-pointer flex-shrink-0 overflow-hidden"
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
                  onClick={() => viewProfile(friend.fid)}
                >
                  {getProfileName(friend)}
                </p>
                {friend.username && (
                  <p className="text-xs text-gray-400">@{friend.username}</p>
                )}
              </div>
              <span className="text-xs text-gray-400">
                {formatTimestamp(friend.timestamp)}
              </span>
            </div>

            {friend.track && (
              <div className="mt-2 flex items-center">
                <div
                  className="w-10 h-10 bg-gray-800 rounded mr-2 flex-shrink-0 cursor-pointer"
                  onClick={() => openInSpotify(friend.track)}
                >
                  <img
                    src={getTrackImage(friend.track)}
                    alt={friend.track.album || friend.track.title}
                    className="w-10 h-10 rounded"
                  />
                </div>
                <div className="flex-grow">
                  <p
                    className="text-sm font-medium truncate cursor-pointer hover:underline"
                    onClick={() => openInSpotify(friend.track)}
                  >
                    {friend.track.title}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{friend.track.artist}</p>
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

      {/* Botão para carregar mais */}
      {friendsListening.length >= 5 && (
        <div className="flex justify-center mt-4">
          <button
            onClick={refreshFriendsListening}
            className="px-4 py-2 text-sm bg-purple-800/50 hover:bg-purple-700/50 rounded-full"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      )}
    </div>
  );
};