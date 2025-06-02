/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unused-vars*/
// @ts-nocheck

"use client";

import { useEffect } from 'react';
import { useAuthStore } from '~/lib/stores/authStore';
import { ProofGenerator } from '~/components/ProofGenerator';
import { LoadingState } from '~/components/LoadingState';
import Image from 'next/image';

// Track type definition - Updated to match store
interface Track {
  id: string;
  title: string; // Changed from 'name' to 'title'
  artist: string; // Changed from 'artists' array to 'artist' string
  album?: string;
  coverArt?: string; // Changed from nested album.images to direct coverArt
  popularity?: number;
  uri?: string;
  duration?: string;
  currentTime?: string;
  progressMs?: number;
  durationMs?: number;
  isPlaying?: boolean;
  played_at?: string;
}

// Recent track type for recently played items
interface RecentTrack {
  track: Track;
  played_at: string;
}

export function MusicVibes() {
  const {
    topTracks,
    currentlyPlaying,
    isAuthenticated,
    spotifyId,
    fetchTopTracks,
    fetchCurrentlyPlaying,
    refreshTokenIfNeeded,
    isLoadingTracks,
    loadingCurrentTrack,
    error
  } = useAuthStore();

  // Fetch music data when component mounts
  useEffect(() => {
    const loadMusicData = async () => {
      if (isAuthenticated && spotifyId) {
        try {
          const tokenValid = await refreshTokenIfNeeded();
          if (tokenValid) {
            // Fetch top tracks for medium term (6 months)
            await fetchTopTracks('medium_term');
            // Fetch currently playing track
            await fetchCurrentlyPlaying();
          }
        } catch (error) {
          console.error('Error loading music data:', error);
        }
      }
    };

    loadMusicData();
  }, [isAuthenticated, spotifyId, fetchTopTracks, fetchCurrentlyPlaying, refreshTokenIfNeeded]);

  // Show loading state if we're loading and have no data
  if ((isLoadingTracks.medium_term || loadingCurrentTrack) &&
    topTracks.medium_term.length === 0 && !currentlyPlaying) {
    return <LoadingState />;
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-red-900/30 text-red-200 p-4 rounded-lg mb-6">
        <h3 className="font-bold mb-2">Error Loading Music Data</h3>
        <p>{error}</p>
        <button
          onClick={async () => {
            const tokenValid = await refreshTokenIfNeeded();
            if (tokenValid) {
              await fetchTopTracks('medium_term');
              await fetchCurrentlyPlaying();
            }
          }}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Show message if not authenticated
  if (!isAuthenticated || !spotifyId) {
    return (
      <div className="bg-purple-900/30 text-purple-200 p-4 rounded-lg mb-6">
        <h3 className="font-bold mb-2">Connect Your Spotify</h3>
        <p>Connect your Spotify account to see your music data and generate proofs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Currently Playing Section */}
      {currentlyPlaying && (
        <section>
          <h2 className="text-xl font-bold mb-4">Currently Playing</h2>
          <div className="bg-purple-900/20 rounded-lg p-4 flex items-center gap-3">
            {currentlyPlaying.coverArt && (
              <div className="relative w-16 h-16">
                <Image
                  src={currentlyPlaying.coverArt}
                  alt={currentlyPlaying.album || "Album cover"}
                  width={64}
                  height={64}
                  className="rounded"
                />
              </div>
            )}
            <div className="flex-grow">
              <h3 className="font-medium">{currentlyPlaying.title}</h3>
              <p className="text-sm text-gray-300">{currentlyPlaying.artist}</p>
              {currentlyPlaying.album && (
                <p className="text-xs text-gray-400">{currentlyPlaying.album}</p>
              )}
              {currentlyPlaying.isPlaying && (
                <p className="text-xs text-green-400 flex items-center mt-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                  Now Playing
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Top Tracks Section */}
      <section>
        <h2 className="text-xl font-bold mb-4">Your Top Tracks (Last 6 Months)</h2>

        {topTracks.medium_term.length === 0 ? (
          <div className="bg-purple-900/20 rounded-lg p-6 text-center">
            <p className="text-gray-300">No top tracks found</p>
            <p className="text-sm text-gray-400 mt-2">
              Make sure you have enough listening history on Spotify
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {topTracks.medium_term.slice(0, 6).map((track, index) => (
                <div key={track.id} className="bg-purple-900/20 rounded-lg p-4 flex items-center gap-3">
                  <div className="text-sm font-bold text-purple-400 w-6 text-center">
                    {index + 1}
                  </div>
                  {track.coverArt && (
                    <div className="relative w-12 h-12">
                      <Image
                        src={track.coverArt}
                        alt={track.album || "Album cover"}
                        width={48}
                        height={48}
                        className="rounded"
                      />
                    </div>
                  )}
                  <div className="flex-grow min-w-0">
                    <h3 className="font-medium truncate">{track.title}</h3>
                    <p className="text-sm text-gray-300 truncate">{track.artist}</p>
                    {track.popularity && (
                      <p className="text-xs text-gray-400">
                        Popularity: {track.popularity}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <ProofGenerator
              endpoint="top-tracks"
              label="Generate Top Tracks Proof"
              description="Create a cryptographic proof of your Spotify top tracks that you can share with others"
              className="mt-6"
            />
          </>
        )}
      </section>

      {/* Recently Played Section - Note: This might need API endpoint implementation */}
      <section>
        <h2 className="text-xl font-bold mb-4">Recently Played</h2>

        <div className="bg-purple-900/20 rounded-lg p-6 text-center">
          <p className="text-gray-300">Recently played tracks coming soon</p>
          <p className="text-sm text-gray-400 mt-2">
            This feature will show your recent listening history
          </p>
        </div>

        {/* Placeholder for recently played proof generator */}
        {/* <ProofGenerator
          endpoint="recently-played"
          label="Generate Recent Plays Proof" 
          description="Create a cryptographic proof of your Spotify listening history that you can share with others"
          className="mt-6"
        /> */}
      </section>
    </div>
  );
}