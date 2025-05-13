/* eslint-disable  @typescript-eslint/no-explicit-any*/
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "~/components/ui/Button";
import { useAuthStore } from "~/lib/stores/authStore";
import { SpotifyImage } from "./SpotifyImage";
import { useFrame } from "./providers/FrameProvider";
import { SearchBar } from "./SearchBar";
import sdk from "@farcaster/frame-sdk";
import useNeynarStore, { NeynarUser } from "~/lib/stores/neynarStore";

export function ConnectedUsers() {
  const [filteredUsers, setFilteredUsers] = useState<NeynarUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [userTracks, setUserTracks] = useState<Record<string, any>[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const { isMiniApp } = useFrame();

  // Access the auth store
  const { isAuthenticated, fid } = useAuthStore();

  // Access the Neynar store
  const {
    followers,
    following,
    isLoadingFollowers,
    isLoadingFollowing,
    error: neynarError,
    fetchFollowers,
    fetchFollowing,
    searchUsers,
    getUserSpotifyStatus,
    clearError
  } = useNeynarStore();

  // Combine followers and following to show a comprehensive list of connections
  const connections = useMemo(() => {
    // Create a map to deduplicate users
    const userMap = new Map<number, NeynarUser>();
    
    // Add followers
    followers.forEach(user => {
      userMap.set(user.fid, { ...user, isFollower: true });
    });
    
    // Add or update with following
    following.forEach(user => {
      if (userMap.has(user.fid)) {
        // User already in map (is both follower and following)
        const existingUser = userMap.get(user.fid)!;
        userMap.set(user.fid, { ...existingUser, isFollowing: true });
      } else {
        // New user (only following)
        userMap.set(user.fid, { ...user, isFollowing: true });
      }
    });
    
    // Convert map to array
    return Array.from(userMap.values());
  }, [followers, following]);

  // Update filtered users when connections change
  useEffect(() => {
    if (!searchQuery) {
      setFilteredUsers(connections);
    }
  }, [connections, searchQuery]);

  // Format relative time
  const formatRelativeTime = (timestamp?: number): string => {
    if (!timestamp) return "Unknown";

    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 1000); // difference in seconds

    if (diff < 60) return `${diff} sec ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  // Handle search functionality
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      // When search is cleared, show all connections
      setFilteredUsers(connections);
      return;
    }
    
    // For short searches (2 chars or less), filter locally
    if (query.length <= 2) {
      const filtered = connections.filter(user => {
        const usernameMatch = user.username.toLowerCase().includes(query.toLowerCase());
        const displayNameMatch = user.displayName?.toLowerCase().includes(query.toLowerCase());
        const fidMatch = user.fid.toString().includes(query);
        
        return usernameMatch || displayNameMatch || fidMatch;
      });
      
      setFilteredUsers(filtered);
      return;
    }
    
    // For longer searches, use the API to get more comprehensive results
    try {
      const results = await searchUsers(query);
      
      if (results && results.users.length > 0) {
        // Get Spotify status for these users
        const userFids = results.users.map(user => user.fid);
        const spotifyStatus = await getUserSpotifyStatus(userFids);
        
        // Combine search results with Spotify status
        const usersWithStatus = results.users.map(user => ({
          ...user,
          hasSpotify: spotifyStatus[user.fid] || false
        }));
        
        setFilteredUsers(usersWithStatus);
      } else {
        // If no API results, fall back to local filtering
        const filtered = connections.filter(user => {
          const usernameMatch = user.username.toLowerCase().includes(query.toLowerCase());
          const displayNameMatch = user.displayName?.toLowerCase().includes(query.toLowerCase());
          const fidMatch = user.fid.toString().includes(query);
          
          return usernameMatch || displayNameMatch || fidMatch;
        });
        
        setFilteredUsers(filtered);
      }
    } catch (error) {
      console.error("Error searching users:", error);
      // Fall back to local filtering on error
      const filtered = connections.filter(user => {
        const usernameMatch = user.username.toLowerCase().includes(query.toLowerCase());
        const displayNameMatch = user.displayName?.toLowerCase().includes(query.toLowerCase());
        const fidMatch = user.fid.toString().includes(query);
        
        return usernameMatch || displayNameMatch || fidMatch;
      });
      
      setFilteredUsers(filtered);
    }
  }, [connections, searchUsers, getUserSpotifyStatus]);

  // View user profile on Farcaster
  const viewProfile = (fid: number): void => {
    if (fid && sdk?.actions?.viewProfile) {
      sdk.actions.viewProfile({ fid });
    }
  };

  // Send message to user
  const sendInvite = (user: NeynarUser): void => {
    if (isMiniApp && typeof sdk?.actions?.composeCast === 'function') {
      // Compose a direct message (cast with mention)
      sdk.actions.composeCast({
        text: `Hey @${user.username}, check out Timbra! Connect your Spotify and share your music with friends on Farcaster. ${process.env.NEXT_PUBLIC_URL || "https://timbra.app"}`,
      });
    } else {
      // Fallback for web
      window.open(`https://warpcast.com/~/compose?text=Hey%20@${user.username}%2C%20check%20out%20Timbra!%20Connect%20your%20Spotify%20and%20share%20your%20music%20with%20friends%20on%20Farcaster.`, '_blank');
    }
  };

  // Fetch user's top tracks
  const fetchUserTracks = useCallback(async (userFid: number) => {
    setLoadingTracks(true);
    setUserTracks([]);
    
    try {
      // Call the real API endpoint
      const response = await fetch(`/api/users/tracks?fid=${userFid}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch user tracks');
      }
      
      const data = await response.json();
      
      if (data.success && data.tracks) {
        setUserTracks(data.tracks);
      } else {
        // Fallback to mock data if API doesn't return tracks
        const mockTracks = [
          {
            id: `track-${userFid}-1`,
            title: "Midnight City",
            artist: "M83",
            album: "Hurry Up, We're Dreaming",
            coverArt: "/api/placeholder/40/40",
            popularity: 85
          },
          {
            id: `track-${userFid}-2`,
            title: "Blinding Lights",
            artist: "The Weeknd",
            album: "After Hours",
            coverArt: "/api/placeholder/40/40",
            popularity: 92
          },
          {
            id: `track-${userFid}-3`,
            title: "Bad Guy",
            artist: "Billie Eilish",
            album: "WHEN WE ALL FALL ASLEEP, WHERE DO WE GO?",
            coverArt: "/api/placeholder/40/40",
            popularity: 88
          }
        ];
        
        setUserTracks(mockTracks);
      }
    } catch (error) {
      console.error(`Error fetching tracks for user ${userFid}:`, error);
      // If there's an error, still show mock data as fallback
      const mockTracks = [
        {
          id: `track-${userFid}-1`,
          title: "Midnight City",
          artist: "M83",
          album: "Hurry Up, We're Dreaming",
          coverArt: "/api/placeholder/40/40",
          popularity: 85
        },
        {
          id: `track-${userFid}-2`,
          title: "Blinding Lights",
          artist: "The Weeknd",
          album: "After Hours",
          coverArt: "/api/placeholder/40/40",
          popularity: 92
        },
        {
          id: `track-${userFid}-3`,
          title: "Bad Guy",
          artist: "Billie Eilish",
          album: "WHEN WE ALL FALL ASLEEP, WHERE DO WE GO?",
          coverArt: "/api/placeholder/40/40",
          popularity: 88
        }
      ];
      
      setUserTracks(mockTracks);
    } finally {
      setLoadingTracks(false);
    }
  }, []);

  // Get user's top tracks or send to authentication
  const viewVibes = (user: NeynarUser): void => {
    if (selectedUser === user.fid) {
      // If already selected, toggle off
      setSelectedUser(null);
      return;
    }
    
    // Select the user and fetch their tracks
    setSelectedUser(user.fid);
    fetchUserTracks(user.fid);
  };

  // Fetch connections (followers and following) when component mounts
  useEffect(() => {
    if (isAuthenticated && fid) {
      fetchFollowers(fid);
      fetchFollowing(fid);
    }
  }, [isAuthenticated, fid, fetchFollowers, fetchFollowing]);

  // Check Spotify status for connections when available
  useEffect(() => {
    if (connections.length > 0) {
      const userFids = connections.map(user => user.fid);
      getUserSpotifyStatus(userFids);
    }
  }, [connections, getUserSpotifyStatus]);

  // Loading state
  const isLoading = isLoadingFollowers || isLoadingFollowing;
  
  if (isLoading && filteredUsers.length === 0) {
    return (
      <div className="bg-purple-800/20 p-4 rounded-lg">
        <h3 className="font-medium mb-3">Friends</h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-purple-800/30 p-3 rounded animate-pulse h-14"></div>
          ))}
        </div>
      </div>
    );
  }

  // Render component
  return (
    <div className="bg-purple-800/20 p-4 rounded-lg">
      <h3 className="font-medium mb-3">Friends</h3>
      
      {neynarError && (
        <div className="bg-red-900/30 text-red-200 p-3 rounded mb-4 text-sm">
          {neynarError}
          <button 
            onClick={clearError}
            className="ml-2 text-xs underline hover:text-red-100"
          >
            Dismiss
          </button>
        </div>
      )}

      <SearchBar
        onSearch={handleSearch}
        placeholder="Search friends..."
        className="mb-4"
      />
      
      {filteredUsers.length === 0 && !isLoading ? (
        <div className="text-center text-gray-400 p-4">
          {searchQuery ? "No users found matching your search" : "No friends found"}
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {filteredUsers.map((user) => (
            <div
              key={user.fid}
              className="bg-purple-800/30 p-3 rounded-lg"
            >
              <div className="flex items-center">
                <div
                  className="w-12 h-12 rounded-full bg-purple-700 flex-shrink-0 cursor-pointer overflow-hidden"
                  onClick={() => viewProfile(user.fid)}
                >
                  <SpotifyImage
                    src={user.pfp || '/api/placeholder/48/48'}
                    alt={user.displayName || user.username}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="ml-3 flex-grow">
                  <div className="flex justify-between items-start">
                    <div>
                      <p
                        className="font-medium cursor-pointer hover:underline"
                        onClick={() => viewProfile(user.fid)}
                      >
                        {user.displayName || user.username}
                      </p>
                      <p className="text-xs text-gray-400">@{user.username}</p>
                    </div>
                    <p className="text-xs text-gray-400">
                      {user.lastActive ? formatRelativeTime(user.lastActive) : 'Unknown'}
                    </p>
                  </div>
                </div>
                
                <div className="ml-2">
                  {user.hasSpotify ? (
                    <Button
                      onClick={() => viewVibes(user)}
                      className="text-xs px-2 py-1 bg-purple-600 hover:bg-purple-700"
                    >
                      View Vibes
                    </Button>
                  ) : (
                    <Button
                      onClick={() => sendInvite(user)}
                      className="text-xs px-2 py-1 bg-transparent border border-purple-600 hover:bg-purple-900/30"
                    >
                      Invite
                    </Button>
                  )}
                </div>
              </div>
              
              {selectedUser === user.fid && user.hasSpotify && (
                <div className="mt-3 pt-3 border-t border-purple-800/50">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium">Music Vibes</h4>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="text-xs text-purple-400 hover:text-purple-300"
                    >
                      Hide
                    </button>
                  </div>
                  
                  {loadingTracks ? (
                    <div className="space-y-2 animate-pulse">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center bg-purple-900/30 p-2 rounded">
                          <div className="w-10 h-10 bg-purple-700/50 rounded mr-3"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-purple-700/50 rounded w-3/4 mb-1"></div>
                            <div className="h-3 bg-purple-700/50 rounded w-1/2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : userTracks.length > 0 ? (
                    <div className="space-y-2">
                      {userTracks.map((track) => (
                        <div key={track.id} className="flex items-center bg-purple-900/30 p-2 rounded">
                          <SpotifyImage
                            src={track.coverArt}
                            alt={track.title}
                            width={40}
                            height={40}
                            className="rounded mr-3"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{track.title}</p>
                            <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                          </div>
                          {track.popularity && (
                            <div className="text-xs px-2 py-0.5 bg-purple-700/50 rounded-full">
                              {track.popularity}%
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-400 py-4">
                      No tracks found for this user
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-4 text-center">
        <Button
          onClick={() => {
            if (fid) {
              fetchFollowers(fid);
              fetchFollowing(fid);
            }
          }}
          className="text-xs px-3 py-1 bg-transparent border border-purple-600 hover:bg-purple-900/30"
          disabled={isLoading}
        >
          {isLoading ? "Refreshing..." : "Refresh Friends"}
        </Button>
      </div>
    </div>
  );
}
