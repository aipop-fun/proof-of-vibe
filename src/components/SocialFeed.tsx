/* eslint-disable   @typescript-eslint/no-unused-vars, @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { SearchBar } from "./SearchBar";
import { FarcasterUserCard } from "./FarcasterUserCard";
import { useAuthStore } from "~/lib/stores/authStore";
import { useFrame } from "./providers/FrameProvider";
import { Button } from "./ui/Button";
import sdk from "@farcaster/miniapp-sdk";
import {
    FarcasterSocialUser,
    SocialTrack
} from "~/lib/types/social";
import {
    getFollowers,
    searchUsers,
    simulateCurrentTrack
} from "~/lib/neynar-social-api";

export function SocialFeed() {
    const [followers, setFollowers] = useState<FarcasterSocialUser[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<FarcasterSocialUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const { isMiniApp, context, added, addFrame } = useFrame();

    // Access auth store
    const { isAuthenticated, fid, isLinked } = useAuthStore();

    // Fetch followers when component mounts
    useEffect(() => {
        if (!isAuthenticated || !fid) {
            setIsLoading(false);
            return;
        }

        const fetchFollowerData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // Get followers from Neynar API
                const response = await getFollowers(fid, 50);

                // For each follower, simulate a current track (in a real app, this would come from Spotify)
                const followersWithTracks = response.followers.map(follower => {
                    const currentTrack = simulateCurrentTrack(follower.fid);
                    return {
                        ...follower,
                        currentTrack
                    };
                });

                setFollowers(followersWithTracks);
                setFilteredUsers(followersWithTracks);
            } catch (err) {
                console.error("Error fetching followers:", err);
                setError(err instanceof Error ? err.message : "Failed to load followers. Please check your API key configuration.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchFollowerData();
    }, [isAuthenticated, fid]);

    // Handle search
    const handleSearch = async (query: string) => {
        setSearchQuery(query);

        if (!query.trim()) {
            setFilteredUsers(followers);
            return;
        }

        // If we're searching for something specific, use the API
        if (query.length >= 2) {
            setIsSearching(true);

            try {
                const results = await searchUsers({ query, limit: 20 });

                // Add simulated current tracks to search results
                const resultsWithTracks = results.users.map(user => {
                    const currentTrack = simulateCurrentTrack(user.fid);
                    return {
                        ...user,
                        currentTrack
                    };
                });

                setFilteredUsers(resultsWithTracks);
            } catch (err) {
                console.error("Error searching users:", err);
                // If search fails, fall back to local filtering
                const filtered = followers.filter(user => {
                    const fidMatch = user.fid.toString() === query.trim();
                    const usernameMatch = user.username.toLowerCase().includes(query.toLowerCase());
                    const displayNameMatch = user.displayName?.toLowerCase().includes(query.toLowerCase());

                    return fidMatch || usernameMatch || displayNameMatch;
                });

                setFilteredUsers(filtered);
            } finally {
                setIsSearching(false);
            }
        } else {
            // For short queries, just filter the already loaded followers
            const filtered = followers.filter(user => {
                const fidMatch = user.fid.toString() === query.trim();
                const usernameMatch = user.username.toLowerCase().includes(query.toLowerCase());
                const displayNameMatch = user.displayName?.toLowerCase().includes(query.toLowerCase());

                return fidMatch || usernameMatch || displayNameMatch;
            });

            setFilteredUsers(filtered);
        }
    };

    // Handle app favoriting
    const handleAddApp = async () => {
        if (added) return;

        try {
            await addFrame();
        } catch (error) {
            console.error("Error adding frame:", error);
        }
    };

    // Handle sharing the mini app
    const handleShare = () => {
        if (isMiniApp && typeof sdk?.actions?.composeCast === 'function') {
            sdk.actions.composeCast({
                text: "🎵 Check out Timbra! Connect your Spotify and share your music taste with friends on Farcaster.",
                embeds: [process.env.NEXT_PUBLIC_URL || window.location.origin]
            });
        } else {
            window.open("https://warpcast.com/~/compose?text=Check%20out%20Timbra!%20Connect%20your%20Spotify%20and%20share%20your%20music%20taste%20with%20friends%20on%20Farcaster.%20%F0%9F%8E%B5", "_blank");
        }
    };

    if (!isAuthenticated || !isLinked) {
        return (
            <div className="bg-purple-800/20 p-4 rounded-lg mb-4">
                <h2 className="font-medium mb-2">Social Feed</h2>
                <p className="text-sm text-gray-300 mb-4">
                    Connect your Farcaster and Spotify accounts to see what your friends are listening to.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-purple-800/20 p-4 rounded-lg mb-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-medium">Farcaster Music Feed</h2>
                <div className="flex space-x-2">
                    {isMiniApp && !added && (
                        <Button
                            onClick={handleAddApp}
                            className="text-xs px-3 py-1 bg-purple-600 hover:bg-purple-700"
                        >
                            Add App
                        </Button>
                    )}
                    <Button
                        onClick={handleShare}
                        className="text-xs px-3 py-1 bg-transparent border border-purple-600 hover:bg-purple-900/30"
                    >
                        Share
                    </Button>
                </div>
            </div>

            <SearchBar onSearch={handleSearch} placeholder="Search Farcaster users..." />

            {error && (
                <div className="bg-red-900/30 text-red-200 p-3 rounded mb-4 text-sm">
                    {error}
                </div>
            )}

            <div className="mt-4">
                {isLoading || isSearching ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="animate-pulse bg-purple-800/30 p-4 rounded-lg h-24"></div>
                        ))}
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="text-center text-gray-400 p-4">
                        {searchQuery ? "No users found matching your search" : "No followers found"}
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                        {filteredUsers.map((user) => (
                            <FarcasterUserCard key={user.fid} user={user} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}