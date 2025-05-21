/* eslint-disable @typescript-eslint/ban-ts-comment*/
// @ts-nocheck


"use client";

import { useEffect } from 'react';
import { useMusic, useStore } from '~/lib/stores/rootStore';
import { ProofGenerator } from '~/components/ProofGenerator';
import { LoadingState } from '~/components/LoadingState';
import Image from 'next/image';

// Track type definition
interface Track {
  id: string;
  name: string;
  artists?: Array<{ name: string }>;
  album?: {
    name: string;
    images?: Array<{ url: string }>;
  };
  track?: {
    id: string;
    name: string;
    artists?: Array<{ name: string }>;
    album?: {
      name: string;
      images?: Array<{ url: string }>;
    };
  };
  played_at?: string;
}

export function MusicVibes() {
  const { topTracks, recentlyPlayed, loading, error, isStale } = useMusic();
  const { fetchMusicData } = useStore();
  
  // Fetch music data if stale
  useEffect(() => {
    if (isStale()) {
      fetchMusicData();
    }
  }, [isStale, fetchMusicData]);
  
  if (loading && (!topTracks.length || !recentlyPlayed.length)) {
    return <LoadingState />;
  }
  
  if (error) {
    return (
      <div className="bg-red-900/30 text-red-200 p-4 rounded-lg mb-6">
        <h3 className="font-bold mb-2">Error Loading Music Data</h3>
        <p>{error}</p>
        <button 
          onClick={fetchMusicData}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* Top Tracks Section */}
      <section>
        <h2 className="text-xl font-bold mb-4">Your Top Tracks</h2>
        
        <div className="grid gap-4 md:grid-cols-2">
          {(topTracks as Track[]).slice(0, 4).map((track) => (
            <div key={track.id} className="bg-purple-900/20 rounded-lg p-4 flex items-center gap-3">
              {track.album?.images?.[0]?.url && (
                <div className="relative w-16 h-16">
                  <Image 
                    src={track.album.images[0].url} 
                    alt={track.album.name || "Album cover"}
                    width={64}
                    height={64}
                    className="rounded"
                  />
                </div>
              )}
              <div>
                <h3 className="font-medium">{track.name}</h3>
                <p className="text-sm text-gray-300">
                  {track.artists?.map((a) => a.name).join(', ')}
                </p>
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
      </section>
      
      {/* Recently Played Section */}
      <section>
        <h2 className="text-xl font-bold mb-4">Recently Played</h2>
        
        <div className="grid gap-4 md:grid-cols-2">
          {(recentlyPlayed as Track[]).slice(0, 4).map((item) => (
            <div key={item.track?.id || item.id} className="bg-purple-900/20 rounded-lg p-4 flex items-center gap-3">
              {(item.track?.album?.images?.[0]?.url || item.album?.images?.[0]?.url) && (
                <div className="relative w-16 h-16">
                  <Image 
                    src={item.track?.album?.images?.[0]?.url || item.album?.images?.[0]?.url || ""}
                    alt={(item.track?.album?.name || item.album?.name || "Album cover")}
                    width={64}
                    height={64}
                    className="rounded"
                  />
                </div>
              )}
              <div>
                <h3 className="font-medium">{item.track?.name || item.name}</h3>
                <p className="text-sm text-gray-300">
                  {(item.track?.artists || item.artists)?.map((a) => a.name).join(', ')}
                </p>
                {item.played_at && (
                  <p className="text-xs text-gray-400">
                    {new Date(item.played_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <ProofGenerator
          endpoint="recently-played"
          label="Generate Recent Plays Proof" 
          description="Create a cryptographic proof of your Spotify listening history that you can share with others"
          className="mt-6"
        />
      </section>
    </div>
  );
}