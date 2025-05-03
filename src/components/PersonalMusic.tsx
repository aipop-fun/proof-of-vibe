/* eslint-disable  @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unused-vars */
// @ts-nocheck
"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { useMusic } from "./MusicContext";
import Image from "next/image";

export function PersonalMusic() {
    const { data: session } = useSession();
    const { personalCurrentTrack, personalTopTracks, loading } = useMusic();
    const [showTopTracks, setShowTopTracks] = useState(false);

    // If not signed in with Spotify or loading, show nothing
    if (!session?.user?.spotifyId || (!personalCurrentTrack && personalTopTracks.length === 0)) {
        return null;
    }

    return (
        <div className="p-4 bg-purple-800/20 rounded-lg mb-6">
            <h2 className="text-lg font-semibold mb-3">Your Music</h2>

            {loading.personal ? (
                <div className="animate-pulse space-y-3">
                    <div className="h-16 bg-purple-700/30 rounded"></div>
                    <div className="h-12 bg-purple-700/30 rounded"></div>
                </div>
            ) : (
                <>
                    {/* Currently playing track */}
                    {personalCurrentTrack ? (
                        <div className="mb-4">
                            <p className="text-sm text-green-400 mb-1">Currently Playing</p>
                            <div className="flex items-center">
                                {personalCurrentTrack.coverArt && (
                                    <div className="relative w-16 h-16 mr-3 flex-shrink-0">
                                        <Image
                                            src={personalCurrentTrack.coverArt}
                                            alt={personalCurrentTrack.title}
                                            className="rounded"
                                            fill
                                            sizes="64px"
                                            style={{ objectFit: 'cover' }}
                                        />
                                    </div>
                                )}
                                <div>
                                    <p className="font-medium">{personalCurrentTrack.title}</p>
                                    <p className="text-sm text-gray-300">{personalCurrentTrack.artist}</p>
                                    {personalCurrentTrack.currentTime && personalCurrentTrack.duration && (
                                        <div className="flex items-center mt-1">
                                            <div className="w-32 h-1 bg-gray-700 rounded-full mr-2">
                                                <div
                                                    className="h-1 bg-green-500 rounded-full"
                                                    style={{
                                                        width: `${calculateProgress(
                                                            personalCurrentTrack.currentTime,
                                                            personalCurrentTrack.duration
                                                        )}%`
                                                    }}
                                                ></div>
                                            </div>
                                            <span className="text-xs text-gray-400">
                                                {personalCurrentTrack.currentTime} / {personalCurrentTrack.duration}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 mb-3">Not currently playing anything</p>
                    )}

                    {/* Top tracks toggle */}
                    {personalTopTracks.length > 0 && (
                        <div>
                            <button
                                onClick={() => setShowTopTracks(!showTopTracks)}
                                className="text-sm text-purple-300 hover:text-purple-200 flex items-center"
                            >
                                <span>{showTopTracks ? 'Hide' : 'Show'} your top tracks</span>
                                <span className="ml-1">{showTopTracks ? '▲' : '▼'}</span>
                            </button>

                            {showTopTracks && (
                                <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-2">
                                    {personalTopTracks.slice(0, 10).map((track) => (
                                        <div key={track.id} className="flex items-center p-2 bg-purple-900/30 rounded">
                                            {track.coverArt && (
                                                <div className="relative w-10 h-10 mr-3 flex-shrink-0">
                                                    <Image
                                                        src={track.coverArt}
                                                        alt={track.title}
                                                        className="rounded"
                                                        fill
                                                        sizes="40px"
                                                        style={{ objectFit: 'cover' }}
                                                    />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="font-medium text-sm truncate">{track.title}</p>
                                                <p className="text-xs text-gray-300 truncate">{track.artist}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// Helper function to calculate progress percentage
function calculateProgress(current: string, total: string): number {
    try {
        // Convert mm:ss format to seconds
        const currentParts = current.split(':');
        const totalParts = total.split(':');

        const currentSeconds = parseInt(currentParts[0]) * 60 + parseInt(currentParts[1]);
        const totalSeconds = parseInt(totalParts[0]) * 60 + parseInt(totalParts[1]);

        if (isNaN(currentSeconds) || isNaN(totalSeconds) || totalSeconds === 0) {
            return 0;
        }

        return (currentSeconds / totalSeconds) * 100;
    } catch (error) {
        console.error('Error calculating progress:', error);
        return 0;
    }
}