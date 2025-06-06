/* eslint-disable @typescript-eslint/no-explicit-any,  @typescript-eslint/no-unused-vars, react/no-unescaped-entities, @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "~/components/ui/Button";
import { useAuthStore } from "~/lib/stores/authStore";
import { SpotifyImage } from "./SpotifyImage";
import { useFrame } from "./providers/FrameProvider";
import { SearchBar } from "./SearchBar";
import sdk from "@farcaster/frame-sdk";

// Tipos corrigidos para maior compatibilidade
interface NeynarUser {
  fid: number;
  username?: string;
  displayName?: string;
  display_name?: string;
  pfp?: string;
  pfpUrl?: string;
  pfp_url?: string;
  lastActive?: number;
  timestamp?: number;
  followerCount?: number;
  follower_count?: number;
  followingCount?: number;
  following_count?: number;
  isFollower?: boolean;
  isFollowing?: boolean;
  hasSpotify?: boolean;
  bio?: string;
}

export function ConnectedUsers() {
  // Estados do componente
  const [filteredUsers, setFilteredUsers] = useState<NeynarUser[]>([]);
  const [allUsers, setAllUsers] = useState<NeynarUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [userTracks, setUserTracks] = useState<any[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const { isMiniApp } = useFrame();
  const { isAuthenticated, fid } = useAuthStore();

  // Normalizar dados do usuário para compatibilidade
  const normalizeUser = useCallback((user: any): NeynarUser => ({
    fid: user.fid,
    username: user.username,
    displayName: user.displayName || user.display_name || user.username,
    pfp: user.pfp || user.pfpUrl || user.pfp_url,
    pfpUrl: user.pfpUrl || user.pfp_url || user.pfp,
    lastActive: user.lastActive || user.timestamp,
    followerCount: user.followerCount || user.follower_count,
    followingCount: user.followingCount || user.following_count,
    isFollower: user.isFollower,
    isFollowing: user.isFollowing,
    hasSpotify: user.hasSpotify || false,
    bio: user.bio || user.profile?.bio?.text
  }), []);

  // Buscar seguidores e seguindo
  const fetchConnections = useCallback(async () => {
    if (!isAuthenticated || !fid) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Fetching connections for FID:', fid);

      // Buscar seguidores e seguindo em paralelo
      const [followersResponse, followingResponse] = await Promise.allSettled([
        fetch(`/api/neynar/followers?fid=${fid}&limit=100`),
        fetch(`/api/neynar/following?fid=${fid}&limit=100`)
      ]);

      let followers: NeynarUser[] = [];
      let following: NeynarUser[] = [];

      // Processar seguidores
      if (followersResponse.status === 'fulfilled' && followersResponse.value.ok) {
        const followersData = await followersResponse.value.json();
        console.log('Followers data:', followersData);

        if (followersData.users && Array.isArray(followersData.users)) {
          followers = followersData.users.map((user: any) => ({
            ...normalizeUser(user),
            isFollower: true
          }));
        }
      } else {
        console.warn('Failed to fetch followers:', followersResponse);
      }

      // Processar seguindo
      if (followingResponse.status === 'fulfilled' && followingResponse.value.ok) {
        const followingData = await followingResponse.value.json();
        console.log('Following data:', followingData);

        if (followingData.users && Array.isArray(followingData.users)) {
          following = followingData.users.map((user: any) => ({
            ...normalizeUser(user),
            isFollowing: true
          }));
        }
      } else {
        console.warn('Failed to fetch following:', followingResponse);
      }

      // Combinar e deduplificar usuários
      const userMap = new Map<number, NeynarUser>();

      // Adicionar seguidores
      followers.forEach(user => {
        userMap.set(user.fid, user);
      });

      // Adicionar seguindo e marcar como mútuo se necessário
      following.forEach(user => {
        if (userMap.has(user.fid)) {
          const existingUser = userMap.get(user.fid)!;
          userMap.set(user.fid, {
            ...existingUser,
            isFollowing: true,
            isFollower: existingUser.isFollower || false
          });
        } else {
          userMap.set(user.fid, user);
        }
      });

      const combinedUsers = Array.from(userMap.values());
      console.log('Combined users:', combinedUsers.length);

      // Buscar status do Spotify para todos os usuários
      if (combinedUsers.length > 0) {
        try {
          const spotifyResponse = await fetch('/api/users/spotify-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fids: combinedUsers.map(user => user.fid)
            })
          });

          if (spotifyResponse.ok) {
            const spotifyData = await spotifyResponse.json();
            console.log('Spotify status data:', spotifyData);

            // Atualizar usuários com status do Spotify
            combinedUsers.forEach(user => {
              user.hasSpotify = Boolean(spotifyData[user.fid]);
            });
          }
        } catch (spotifyError) {
          console.warn('Failed to fetch Spotify status:', spotifyError);
        }
      }

      setAllUsers(combinedUsers);
      setFilteredUsers(combinedUsers);

    } catch (err) {
      console.error('Error fetching connections:', err);
      setError(err instanceof Error ? err.message : 'Failed to load connections');
    } finally {
      setIsLoading(false);
    }
  }, [fid, isAuthenticated, normalizeUser]);

  // Buscar usuários via API de busca
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setFilteredUsers(allUsers);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      console.log('Searching users with query:', query);

      const response = await fetch(
        `/api/neynar/search?query=${encodeURIComponent(query)}&limit=30`
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('Search results:', data);

      if (data.users && Array.isArray(data.users)) {
        const searchResults = data.users.map(normalizeUser);

        // Buscar status do Spotify para resultados da busca
        if (searchResults.length > 0) {
          try {
            const spotifyResponse = await fetch('/api/users/spotify-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fids: searchResults.map(user => user.fid)
              })
            });

            if (spotifyResponse.ok) {
              const spotifyData = await spotifyResponse.json();
              searchResults.forEach(user => {
                user.hasSpotify = Boolean(spotifyData[user.fid]);
              });
            }
          } catch (spotifyError) {
            console.warn('Failed to fetch Spotify status for search results:', spotifyError);
          }
        }

        setFilteredUsers(searchResults);
      } else {
        // Se não há resultados da API, filtrar localmente
        const localResults = allUsers.filter(user => {
          const displayName = user.displayName?.toLowerCase() || '';
          const username = user.username?.toLowerCase() || '';
          const fidStr = user.fid.toString();
          const queryLower = query.toLowerCase();

          return displayName.includes(queryLower) ||
            username.includes(queryLower) ||
            fidStr.includes(query);
        });

        setFilteredUsers(localResults);
      }

    } catch (err) {
      console.error('Search error:', err);

      // Fallback para busca local em caso de erro
      const localResults = allUsers.filter(user => {
        const displayName = user.displayName?.toLowerCase() || '';
        const username = user.username?.toLowerCase() || '';
        const fidStr = user.fid.toString();
        const queryLower = query.toLowerCase();

        return displayName.includes(queryLower) ||
          username.includes(queryLower) ||
          fidStr.includes(query);
      });

      setFilteredUsers(localResults);

      if (localResults.length === 0) {
        setError('Search failed. Please try again.');
      }
    } finally {
      setIsSearching(false);
    }
  }, [allUsers, normalizeUser]);

  // Manipular busca com debounce
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    await searchUsers(query);
  }, [searchUsers]);

  // Função para formatar tempo relativo
  const formatRelativeTime = useCallback((timestamp?: number): string => {
    if (!timestamp) return "Unknown";

    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 1000);

    if (diff < 60) return `${diff} sec ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  }, []);

  // Visualizar perfil do usuário
  const viewProfile = useCallback((userFid: number): void => {
    if (userFid && sdk?.actions?.viewProfile) {
      sdk.actions.viewProfile({ fid: userFid });
    }
  }, []);

  // Enviar convite para usuário
  const sendInvite = useCallback((user: NeynarUser): void => {
    if (!user.username) return;

    const message = `Hey @${user.username}, check out Timbra! Connect your Spotify and share your music with friends on Farcaster. ${process.env.NEXT_PUBLIC_URL || "https://timbra.app"}`;

    if (isMiniApp && typeof sdk?.actions?.composeCast === 'function') {
      sdk.actions.composeCast({ text: message });
    } else {
      const encodedMessage = encodeURIComponent(message);
      window.open(`https://warpcast.com/~/compose?text=${encodedMessage}`, '_blank');
    }
  }, [isMiniApp]);

  // Buscar tracks do usuário
  const fetchUserTracks = useCallback(async (userFid: number) => {
    setLoadingTracks(true);
    setUserTracks([]);

    try {
      const response = await fetch(`/api/user-track?fid=${userFid}`);

      if (response.ok) {
        const data = await response.json();

        if (data.track) {
          setUserTracks([data.track]);
        } else {
          setUserTracks([]);
        }
      } else {
        console.warn('Failed to fetch user tracks:', response.status);
        setUserTracks([]);
      }
    } catch (error) {
      console.error(`Error fetching tracks for user ${userFid}:`, error);
      setUserTracks([]);
    } finally {
      setLoadingTracks(false);
    }
  }, []);

  // Visualizar vibes do usuário
  const viewVibes = useCallback((user: NeynarUser): void => {
    if (selectedUser === user.fid) {
      setSelectedUser(null);
      return;
    }

    setSelectedUser(user.fid);
    if (user.hasSpotify) {
      fetchUserTracks(user.fid);
    }
  }, [selectedUser, fetchUserTracks]);

  // Efeito para buscar conexões iniciais
  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Loading state
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

  return (
    <div className="bg-purple-800/20 p-4 rounded-lg">
      <h3 className="font-medium mb-3">Friends ({filteredUsers.length})</h3>

      {/* Exibir erro se houver */}
      {error && (
        <div className="bg-red-900/30 text-red-200 p-3 rounded mb-4 text-sm">
          {error}
          <button
            onClick={() => {
              setError(null);
              fetchConnections();
            }}
            className="ml-2 text-xs underline hover:text-red-100"
          >
            Try again
          </button>
        </div>
      )}

      {/* Barra de busca */}
      <SearchBar
        onSearch={handleSearch}
        placeholder="Search friends..."
        className="mb-4"
        isLoading={isSearching}
      />

      {/* Lista de usuários */}
      {filteredUsers.length === 0 && !isLoading ? (
        <div className="text-center text-gray-400 p-4">
          {searchQuery ? (
            <>
              <p>No users found matching "{searchQuery}"</p>
              <button
                onClick={() => handleSearch('')}
                className="text-purple-400 hover:text-purple-300 text-sm mt-2"
              >
                Clear search
              </button>
            </>
          ) : (
            <p>No friends found. Try connecting with more people on Farcaster!</p>
          )}
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {filteredUsers.map((user) => (
            <div
              key={user.fid}
              className="bg-purple-800/30 p-3 rounded-lg"
            >
              <div className="flex items-center">
                {/* Avatar */}
                <div
                  className="w-12 h-12 rounded-full bg-purple-700 flex-shrink-0 cursor-pointer overflow-hidden"
                  onClick={() => viewProfile(user.fid)}
                >
                  <SpotifyImage
                    src={user.pfp || user.pfpUrl || '/api/placeholder/48/48'}
                    alt={user.displayName || user.username || 'User'}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Informações do usuário */}
                <div className="ml-3 flex-grow">
                  <div className="flex justify-between items-start">
                    <div>
                      <p
                        className="font-medium cursor-pointer hover:underline"
                        onClick={() => viewProfile(user.fid)}
                      >
                        {user.displayName || user.username || `User ${user.fid}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        @{user.username || `fid:${user.fid}`}
                      </p>

                      {/* Badges de relacionamento */}
                      <div className="flex gap-1 mt-1">
                        {user.isFollower && user.isFollowing && (
                          <span className="text-xs bg-purple-600/30 text-purple-300 px-1 rounded">
                            Mutual
                          </span>
                        )}
                        {user.isFollowing && !user.isFollower && (
                          <span className="text-xs bg-blue-600/30 text-blue-300 px-1 rounded">
                            Following
                          </span>
                        )}
                        {user.isFollower && !user.isFollowing && (
                          <span className="text-xs bg-green-600/30 text-green-300 px-1 rounded">
                            Follower
                          </span>
                        )}
                        {user.hasSpotify && (
                          <span className="text-xs bg-green-700/30 text-green-400 px-1 rounded">
                            🎵 Spotify
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-gray-400">
                      {formatRelativeTime(user.lastActive)}
                    </p>
                  </div>
                </div>

                {/* Botões de ação */}
                <div className="ml-2">
                  {user.hasSpotify ? (
                    <Button
                      onClick={() => viewVibes(user)}
                      className="text-xs px-2 py-1 bg-purple-600 hover:bg-purple-700"
                    >
                      {selectedUser === user.fid ? 'Hide' : 'View Vibes'}
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

              {/* Seção expandida com tracks */}
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
                      <div className="flex items-center bg-purple-900/30 p-2 rounded">
                        <div className="w-10 h-10 bg-purple-700/50 rounded mr-3"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-purple-700/50 rounded w-3/4 mb-1"></div>
                          <div className="h-3 bg-purple-700/50 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ) : userTracks.length > 0 ? (
                    <div className="space-y-2">
                      {userTracks.map((track, index) => (
                        <div key={index} className="flex items-center bg-purple-900/30 p-2 rounded">
                          <SpotifyImage
                            src={track.coverArt || track.albumArt || '/api/placeholder/40/40'}
                            alt={track.title}
                            width={40}
                            height={40}
                            className="rounded mr-3"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{track.title}</p>
                            <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                          </div>
                          {track.isPlaying && (
                            <div className="text-xs text-green-400">
                              ▶ Playing
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-400 py-4">
                      No current music activity
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Botão de refresh */}
      <div className="mt-4 text-center">
        <Button
          onClick={fetchConnections}
          className="text-xs px-3 py-1 bg-transparent border border-purple-600 hover:bg-purple-900/30"
          disabled={isLoading}
        >
          {isLoading ? "Refreshing..." : "Refresh Friends"}
        </Button>
      </div>

      {/* Debug info em desenvolvimento */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-2 bg-gray-900/50 rounded text-xs text-gray-400">
          <p>Debug: {allUsers.length} total users, {filteredUsers.length} filtered</p>
          <p>Search: "{searchQuery}", FID: {fid}</p>
        </div>
      )}
    </div>
  );
}