/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react/no-unescaped-entities
 */
"use client";

import { useState, useEffect } from "react";
import { UserMusicActivity } from "./UserMusicActivity";
import { ProofVerifier } from "./ProofVerifier";
import { Button } from "./ui/Button";
import { useRouter } from "next/navigation";
import { useFrame } from "./providers/FrameProvider";
import sdk from "@farcaster/frame-sdk";

interface UserMusicProfileProps {
  fid: number;
  username?: string;
  displayName?: string;
  spotifyId?: string;
}

export function UserMusicProfile({
  fid,
  username,
  displayName,
  spotifyId
}: UserMusicProfileProps) {
  const [hasSpotify, setHasSpotify] = useState<boolean>(!!spotifyId);
  const [viewMode, setViewMode] = useState<'activity' | 'proofs'>('activity');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { isMiniApp } = useFrame();

  // Check if user has Spotify connected if not provided
  useEffect(() => {
    const checkSpotifyStatus = async () => {
      if (spotifyId) {
        setHasSpotify(true);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // Call our API to check if the user has Spotify connected
        const response = await fetch('/api/users/spotify-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ fids: [fid] })
        });

        if (response.ok) {
          const data = await response.json();
          setHasSpotify(!!data[fid]);
        } else {
          setHasSpotify(false);
        }
      } catch (error) {
        console.error('Error checking Spotify status:', error);
        setHasSpotify(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSpotifyStatus();
  }, [fid, spotifyId]);

  // Handle sending invite to connect Spotify
  const handleInvite = () => {
    if (!username) return;

    const message = `Hey @${username}, check out Timbra! Connect your Spotify and share your music with friends on Farcaster.`;
    const url = process.env.NEXT_PUBLIC_URL || "https://timbra.app";

    if (isMiniApp && typeof sdk?.actions?.composeCast === 'function') {
      sdk.actions.composeCast({
        text: message,
        embeds: [url]
      });
    } else {
      window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent(message)}&embeds=${encodeURIComponent(url)}`, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-purple-800/20 rounded-lg animate-pulse">
        <div className="h-48 bg-purple-700/30 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Music profile header */}
      <div className="p-4 bg-purple-800/20 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Music Profile</h2>
          
          {!hasSpotify && (
            <Button 
              onClick={handleInvite}
              className="text-xs px-3 py-1 bg-green-600 hover:bg-green-700"
            >
              Invite to Connect
            </Button>
          )}
        </div>

        {hasSpotify ? (
          <>
            <div className="flex justify-center space-x-4 mb-4">
              <button
                onClick={() => setViewMode('activity')}
                className={`px-4 py-2 rounded-lg text-sm ${
                  viewMode === 'activity' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-purple-900/30 text-gray-300 hover:bg-purple-800/30'
                }`}
              >
                Current Activity
              </button>
              <button
                onClick={() => setViewMode('proofs')}
                className={`px-4 py-2 rounded-lg text-sm ${
                  viewMode === 'proofs' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-purple-900/30 text-gray-300 hover:bg-purple-800/30'
                }`}
              >
                Verified Proofs
              </button>
            </div>

            {/* Content based on view mode */}
            {viewMode === 'activity' ? (
              <UserMusicActivity 
                fid={fid} 
                username={username} 
                spotifyId={spotifyId} 
              />
            ) : (
              <div>
                <div className="bg-purple-900/30 p-4 rounded-lg">
                  <h3 className="text-sm font-medium mb-2">TLSNotary Verified Proofs</h3>
                  
                  <p className="text-sm text-gray-300 mb-4">
                    View cryptographically verified music data from {displayName || username || `FID: ${fid}`}.
                    These proofs ensure the authenticity of the user's music listening history.
                  </p>
                  
                  {/* We would list available proofs here */}
                  <div className="text-center py-6">
                    <p className="text-gray-400 mb-4">No verified proofs available yet</p>
                    <Button
                      onClick={() => router.push('/generate-proof')}
                      className="text-xs px-3 py-1 bg-purple-600 hover:bg-purple-700"
                    >
                      Generate Your Own Proof
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-400 mb-1">
              {displayName || username || `This user`} hasn't connected Spotify yet
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Send them an invitation to connect and share their music taste
            </p>
            <Button
              onClick={handleInvite}
              className="bg-green-600 hover:bg-green-700"
            >
              Invite to Connect Spotify
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}