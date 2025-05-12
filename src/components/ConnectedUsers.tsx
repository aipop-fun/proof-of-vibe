/* eslint-disable @typescript-eslint/no-unused-vars*/

"use client";

import { useState, useEffect } from "react";
import { Button } from "~/components/ui/Button";
import { useAuthStore } from "~/lib/stores/authStore";
import { SpotifyImage } from "./SpotifyImage";
import { useFrame } from "./providers/FrameProvider";
import sdk from "@farcaster/frame-sdk";
import { getUsersWithSpotify } from "~/lib/supabase";

export function ConnectedUsers() {
    const [selectedUser, setSelectedUser] = useState<number | null>(null);
    const { isMiniApp } = useFrame();

    // Access the auth store
    const {
        connectedUsers,
        userTopTracks,
        isLoadingConnections,
        fetchConnectedUsers,
        fetchUserTopTracks,
        error
    } = useAuthStore();

    // Fetch connected users on component mount
    useEffect(() => {
        fetchConnectedUsers();
    }, [fetchConnectedUsers]);

    // Format relative time
    const formatRelativeTime = (timestamp: number): string => {
        const now = Date.now();
        const diff = Math.floor((now - timestamp) / 1000); // difference in seconds

        if (diff < 60) return `${diff} sec ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
        return `${Math.floor(diff / 3600)} hr ago`;
    };

    // View user profile on Farcaster
    const viewProfile = (fid: number): void => {
        if (fid && sdk?.actions?.viewProfile) {
            sdk.actions.viewProfile({ fid });
        }
    };

    // Load user's top tracks when selected
    const handleSelectUser = (fid: number) => {
        setSelectedUser(fid);

        // Fetch top tracks if not already loaded
        if (!userTopTracks[fid]) {
            fetchUserTopTracks(fid);
        }
    };



    if (isLoadingConnections) {
        return (
            <div className="bg-purple-800/20 p-4 rounded-lg">
                <h3 className="font-medium mb-3">🎧 Music Explorers</h3>
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-purple-800/30 p-3 rounded animate-pulse h-14"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (connectedUsers.length === 0) {
        return (
            <div className="bg-purple-800/20 p-4 rounded-lg">
                <h3 className="font-medium mb-3">Connected Users</h3>
                <p className="text-sm text-gray-400">No connected users found</p>
            </div>
        );
    }



    return (
        <div className="bg-purple-800/20 p-4 rounded-lg">
            <h3 className="font-medium mb-3">Connected Users</h3>

            {error && (
                <div className="bg-red-900/30 text-red-200 p-3 rounded mb-4 text-sm">
                    {error}
                </div>
            )}

            {selectedUser === null ? (
                <div className="space-y-2">
                    {connectedUsers.map((user) => (
                        <div
                            key={user.fid}
                            className="bg-purple-800/30 p-3 rounded flex items-center cursor-pointer hover:bg-purple-800/50"
                            onClick={() => handleSelectUser(user.fid)}
                        >
                            <div className="w-10 h-10 rounded-full bg-purple-700 flex items-center justify-center">
                                {user.username?.charAt(0) || "?"}
                            </div>
                            <div className="ml-3">
                                <p className="font-medium">{user.displayName || user.username}</p>
                                <p className="text-xs text-gray-400">
                                    Last active: {user.lastSeen ? formatRelativeTime(user.lastSeen) : 'Unknown'}
                                </p>
                            </div>
                            <div className="ml-auto">
                                <Button
                                    className="text-xs px-2 py-1 bg-purple-600 hover:bg-purple-700"
                                >
                                    View Vibes
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <Button
                            onClick={() => setSelectedUser(null)}
                            className="text-xs px-2 py-1 bg-transparent border border-purple-600 hover:bg-purple-900/30"
                        >
                            ← Back
                        </Button>

                        <Button
                            onClick={() => viewProfile(selectedUser)}
                            className="text-xs px-2 py-1 bg-purple-600 hover:bg-purple-700"
                        >
                            View Profile
                        </Button>
                    </div>

                    {/* User details */}
                    {connectedUsers.find(u => u.fid === selectedUser) && (
                        <div className="bg-purple-800/30 p-3 rounded mb-4">
                            <div className="flex items-center">
                                <div className="w-12 h-12 rounded-full bg-purple-700 flex items-center justify-center">
                                    {connectedUsers.find(u => u.fid === selectedUser)?.username?.charAt(0) || "?"}
                                </div>
                                <div className="ml-3">
                                    <p className="font-medium">{connectedUsers.find(u => u.fid === selectedUser)?.displayName || connectedUsers.find(u => u.fid === selectedUser)?.username}</p>
                                    <p className="text-xs text-gray-400">FID: {selectedUser}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Top tracks */}
                    <div>
                        <h4 className="font-medium mb-2">Top Tracks</h4>

                        {!userTopTracks[selectedUser] ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="bg-purple-800/30 p-2 rounded animate-pulse h-14"></div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                                <h4 className="font-medium mb-4">Top Tracks</h4>
                                {userTopTracks[selectedUser]?.map((track, index) => (
                                    <div key={track.id} className="flex items-center gap-3 p-2 hover:bg-purple-900/30 rounded">
                                        <span className="text-sm text-purple-400 w-4">{index + 1}.</span>
                                        <SpotifyImage
                                            src={track.coverArt || ''}
                                            alt={track.title}
                                            className="w-10 h-10 rounded"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{track.title}</p>
                                            <p className="text-xs text-purple-300 truncate">{track.artist}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {track.popularity && (
                                                <div className="text-xs bg-purple-900/50 px-2 py-1 rounded">
                                                    🔥 {track.popularity}%
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}