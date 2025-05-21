/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react/no-unescaped-entities   */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import sdk from "@farcaster/frame-sdk";
import { useFrame } from "./providers/FrameProvider";
import { SpotifyImage } from "./SpotifyImage";
import { Button } from "./ui/Button";
import { formatRelativeTime } from "~/lib/utils";
import { useAuthStore } from "~/lib/stores/authStore";

interface ProfileIntegrationProps {
    fid: number;
    username?: string;
    displayName?: string;
}

/**
 * Component specifically designed to be embedded in a Farcaster user profile
 * Shows a compact view of the user's music activity and a button to view more
 */
export function FarcasterProfileIntegration({
    fid,
    username,
    displayName
}: ProfileIntegrationProps) {
    const [hasSpotify, setHasSpotify] = useState<boolean | null>(null);
    const [currentTrack, setCurrentTrack] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { isMiniApp } = useFrame();
    const router = useRouter();

    // Access Zustand store
    const { fetchUserCurrentTrack, userTracks } = useAuthStore();

    // Fetch user's Spotify status and current track
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                setIsLoading(true);

                // Check if user has Spotify connected
                const statusResponse = await fetch('/api/users/spotify-status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fids: [fid] })
                });

                if (statusResponse.ok) {
                    const statusData = await statusResponse.json();
                    const spotifyConnected = !!statusData[fid];
                    setHasSpotify(spotifyConnected);

                    // Only fetch track if Spotify is connected
                    if (spotifyConnected) {
                        // Use our Zustand store method to fetch and cache the track
                        const trackData = await fetchUserCurrentTrack(fid);
                        setCurrentTrack(trackData?.track || null);
                    }
                } else {
                    setHasSpotify(false);
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
                setHasSpotify(false);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, [fid, fetchUserCurrentTrack]);

    // View full music profile
    const viewMusicProfile = () => {
        if (isMiniApp && typeof sdk?.actions?.openUrl === 'function') {
            const baseUrl = process.env.NEXT_PUBLIC_URL || window.location.origin;
            sdk.actions.openUrl(`${baseUrl}/user/${fid}/music`);
        } else {
            router.push(`/user/${fid}/music`);
        }
    };

    // Open track in Spotify
    const openTrack = () => {
        if (!currentTrack) return;

        const spotifyUrl = currentTrack.spotifyUrl ||
            `https://open.spotify.com/search/${encodeURIComponent(`${currentTrack.title} ${currentTrack.artist}`)}`;

        if (isMiniApp && typeof sdk?.actions?.openUrl === 'function') {
            sdk.actions.openUrl(spotifyUrl);
        } else {
            window.open(spotifyUrl, '_blank');
        }
    };

    if (isLoading) {
        return (
            <div className="p-3 bg-purple-800/20 rounded-lg animate-pulse">
                <div className="h-16 bg-purple-700/30 rounded"></div>
            </div>
        );
    }

    if (hasSpotify === false) {
        return (
            <div className="p-3 bg-purple-800/20 rounded-lg">
                <p className="text-sm text-center text-gray-400 my-2">
                    {displayName || username || `This user`} hasn't connected Spotify yet
                </p>
                <div className="flex justify-center">
                    <Button
                        onClick={viewMusicProfile}
                        className="text-xs px-3 py-1 bg-purple-600 hover:bg-purple-700"
                    >
                        View Music Profile
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-3 bg-purple-800/20 rounded-lg">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Music Activity</h3>
                <Button
                    onClick={viewMusicProfile}
                    className="text-xs px-2 py-0.5 bg-purple-600 hover:bg-purple-700"
                >
                    View More
                </Button>
            </div>

            {currentTrack ? (
                <div
                    className="flex items-center cursor-pointer hover:bg-purple-900/50 p-2 rounded-lg transition-colors"
                    onClick={openTrack}
                >
                    <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                        <SpotifyImage
                            src={currentTrack.coverArt || currentTrack.albumArt || '/api/placeholder/48/48'}
                            alt={currentTrack.title}
                            width={48}
                            height={48}
                        />
                    </div>
                    <div className="ml-3 flex-grow min-w-0">
                        <p className="font-medium text-sm truncate">{currentTrack.title}</p>
                        <p className="text-xs text-gray-400 truncate">{currentTrack.artist}</p>
                        <div className="flex items-center mt-1">
                            <span className="text-xs text-green-400 mr-2">
                                {currentTrack.isPlaying ? "Now Playing" : "Last Played"}
                            </span>
                            {!currentTrack.isPlaying && (
                                <span className="text-xs text-gray-500">
                                    {formatRelativeTime(Date.now() - Math.floor(Math.random() * 3600000))}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <p className="text-sm text-center text-gray-400 my-2">
                    No recent music activity to display
                </p>
            )}
        </div>
    );
}