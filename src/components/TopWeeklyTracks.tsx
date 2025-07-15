/* eslint-disable  @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
"use client";

import { FC, useState } from "react";
import Image from "next/image";
import { useMusic } from "./MusicContext";
import sdk from "@farcaster/miniapp-sdk";

// Define a flexible interface for tracks
interface WeeklyTrack {
  id: string;
  title: string;
  artist: string;
  [key: string]: any;
  albumArt?: string;
  coverArt?: string;
  listenerCount?: number;
  listeners?: Array<{
    fid?: number | string;
    name?: string;
    username?: string;
    [key: string]: any;
  }>;
}

// Props interface
interface TopWeeklyTracksProps {
  isLoading: boolean;
}

export const TopWeeklyTracks: FC<TopWeeklyTracksProps> = ({ isLoading }) => {
  const { topWeeklyTracks } = useMusic();
  const [expandedTrack, setExpandedTrack] = useState<string | null>(null);

  const toggleExpanded = (trackId: string) => {
    setExpandedTrack(expandedTrack === trackId ? null : trackId);
  };

  const viewProfile = (fid?: number | string): void => {
    if (fid) {
      sdk.actions.viewProfile({ fid: Number(fid) });
    }
  };

  const getTrackImage = (track: WeeklyTrack): string => {
    return (
      track.albumArt ||
      track.coverArt ||
      '/default-album-art.png'
    );
  };
  // @ts-expect-error
  const getListenerName = (listener: WeeklyTrack['listeners'][number]): string => {
    return (
      listener.name ||
      listener.username ||
      'Anonymous Listener'
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-purple-800/30 p-4 rounded-lg animate-pulse h-20"></div>
        ))}
      </div>
    );
  }

  if (topWeeklyTracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-gray-400">No weekly top tracks available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {topWeeklyTracks.map((track) => (
        <div key={track.id} className="bg-purple-800/30 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gray-800 rounded flex-shrink-0 relative">
              <Image
                src={getTrackImage(track)}
                alt={track.title}
                fill
                className="rounded object-cover"
                sizes="(max-width: 768px) 48px, 48px"
              />
            </div>

            <div className="ml-3 flex-grow">
              <p className="font-medium">{track.title}</p>
              <p className="text-sm text-gray-400">{track.artist}</p>
            </div>

            <div className="flex-shrink-0 text-right">
              <p className="font-medium text-green-400">
                

            {
// @ts-ignore
track.listenerCount ?? 0}
              </p>
              <p className="text-xs text-gray-400">listeners</p>
            </div>
          </div>

          <div className="mt-2">
            {
              // @ts-ignore
track.listeners && track.listeners.length > 0 && (
              <button
                className="text-xs text-purple-400 hover:text-purple-300"
                onClick={() => toggleExpanded(track.id)}
              >
                {expandedTrack === track.id ? "Hide listeners" : "Show listeners"}
              </button>
            )}

            {
              // @ts-ignore
    expandedTrack === track.id && track.listeners && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {
                    // @ts-ignore
track.listeners.map((listener, i) => (
                  <div
                    key={i}
                    className="text-xs bg-purple-900/50 px-2 py-1 rounded cursor-pointer hover:bg-purple-900"
                    onClick={() => viewProfile(listener.fid)}
                  >
                    {getListenerName(listener)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};