/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react/no-unescaped-entities   */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import sdk from "@farcaster/miniapp-sdk";
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
    const [error, setError] = useState<string | null>(null);

    const { isMiniApp } = useFrame();
    const router = useRouter();
    
    const { fetchUserCurrentTrack, userTracks } = useAuthStore();

    const viewMusicProfile = useCallback(() => {
        try {
            const profileUrl = `/profile/${fid}`;
            
            router.push(profileUrl);
        } catch (error) {
            console.error('Failed to navigate to music profile:', error);            
            router.push(`/profile/${fid}`);
        }
    }, [fid, router]);

    

    const openTrack = useCallback(async () => {
        if (!currentTrack) return;

        try {
            let spotifyUrl = '';
            if (currentTrack.uri) {
                spotifyUrl = currentTrack.uri.replace('spotify:', 'https://open.spotify.com/');
            } else if (currentTrack.spotifyUrl) {
                spotifyUrl = currentTrack.spotifyUrl;
            } else {
                spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(`${currentTrack.title} ${currentTrack.artist}`)}`;
            }

            if (isMiniApp && typeof sdk?.actions?.openUrl === 'function') {
                await sdk.actions.openUrl(spotifyUrl);
            } else {
                window.open(spotifyUrl, '_blank', 'noopener,noreferrer');
            }
        } catch (error) {
            console.error('Failed to open track in Spotify:', error);
        }
    }, [currentTrack, isMiniApp]);


    useEffect(() => {
        const fetchUserData = async () => {
            if (!fid) {
                setError('Invalid user ID');
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                setError(null);


                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);

                const statusResponse = await fetch('/api/users/spotify-status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fids: [fid] }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!statusResponse.ok) {
                    throw new Error(`HTTP ${statusResponse.status}: Failed to check Spotify status`);
                }

                const statusData = await statusResponse.json();
                const spotifyConnected = !!statusData[fid];
                setHasSpotify(spotifyConnected);


                
                if (spotifyConnected) {
                    try {                        

                        const trackData = await fetchUserCurrentTrack(fid);
                        setCurrentTrack(trackData?.track || null);
                    } catch (trackError) {
                        console.warn('Failed to fetch current track:', trackError);

                        setCurrentTrack(null);
                    }
                }
            } catch (err) {
                console.error("Error fetching user data:", err);

                if (err instanceof Error) {
                    if (err.name === 'AbortError') {
                        setError('Request timed out');
                    } else {
                        setError('Failed to load user data');
                    }
                } else {
                    setError('An unexpected error occurred');
                }
                setHasSpotify(false);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, [fid, fetchUserCurrentTrack]);


    if (isLoading) {
        return (
            <div className="p-3 bg-purple-800/20 rounded-lg animate-pulse" role="status" aria-label="Loading music profile">
                <div className="h-16 bg-purple-700/30 rounded"></div>
            </div>
        );
    }


    if (error) {
        return (
            <div className="p-3 bg-red-800/20 border border-red-600/50 rounded-lg" role="alert">
                <p className="text-sm text-center text-red-400 my-2">
                    {error}
                </p>
                <div className="flex justify-center">
                    <Button
                        onClick={viewMusicProfile}
                        className="text-xs px-3 py-1 bg-purple-600 hover:bg-purple-700"
                    >
                        View Profile
                    </Button>
                </div>
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
                        aria-label={`View ${displayName || username || 'user'}'s Timbra profile`}
                    >
                        View Timbra Profile
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
                    className="text-xs px-2 py-0.5 bg-purple-600 hover:bg-purple-700 transition-colors"
                    aria-label={`View ${displayName || username || 'user'}'s full music profile`}
                >
                    View More
                </Button>
            </div>

            {currentTrack ? (
                <div
                    className="flex items-center cursor-pointer hover:bg-purple-900/50 p-2 rounded-lg transition-colors group"
                    onClick={openTrack}
                    role="button"
                    tabIndex={0}
                    title={`Play "${currentTrack.title}" by ${currentTrack.artist} on Spotify`}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openTrack();
                        }
                    }}
                >
                    <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 relative">
                        <SpotifyImage
                            src={currentTrack.coverArt || currentTrack.albumArt || '/api/placeholder/48/48'}
                            alt={`${currentTrack.album || currentTrack.title} album cover`}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                        />
                        {/* Play overlay on hover */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                    </div>

                    <div className="ml-3 flex-grow min-w-0">
                        <p className="font-medium text-sm truncate">{currentTrack.title}</p>
                        <p className="text-xs text-gray-400 truncate">{currentTrack.artist}</p>
                        <div className="flex items-center mt-1">
                            {currentTrack.isPlaying ? (
                                <div className="flex items-center">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                                    <span className="text-xs text-green-400">Now Playing</span>
                                </div>
                            ) : (
                                <span className="text-xs text-gray-500">
                                    Last played {formatRelativeTime(currentTrack.timestamp || Date.now() - Math.floor(Math.random() * 3600000))}
                                </span>
                            )}


                            <svg width="12" height="12" viewBox="0 0 24 24" fill="#1db954" className="ml-2 opacity-60">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.6 0-.359.24-.66.54-.78 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.242 1.021zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-2">
                    <p className="text-sm text-gray-400 mb-2">
                        No recent music activity to display
                    </p>
                    <Button
                        onClick={viewMusicProfile}
                        className="text-xs px-3 py-1 bg-purple-600 hover:bg-purple-700"
                        aria-label={`View ${displayName || username || 'user'}'s full music profile`}
                    >
                        View Full Profile
                    </Button>
                </div>
            )}
        </div>
    );
}