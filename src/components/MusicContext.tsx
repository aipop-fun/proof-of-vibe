/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps,  @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode
} from "react";
import { useSession, signIn } from "next-auth/react";
import spotifyApi, { callSpotifyAPI } from "~/lib/spotify-sdk";
import { mockFriendData } from "../app/data/mockData";

// Type definitions for music data and context
export interface TrackData {
    type: string;
    id: string;
    title: string;
    artist: string;
    album?: string;
    coverArt?: string;
    duration?: string;
    currentTime?: string;
    platform?: string;
    listenerCount?: number;
    listeners?: Array<{
        fid?: number | string;
        name?: string;
        username?: string;
    }>;
}

export interface FriendListeningData {
    id: string;
    fid?: number;
    name?: string;
    username?: string;
    profileImage?: string;
    track?: TrackData;
    timestamp?: string;
}

export interface LoadingState {
    friends: boolean;
    weekly: boolean;
    personal: boolean;
}

export interface MusicContextType {
    friendsListening: FriendListeningData[];
    topWeeklyTracks: TrackData[];
    personalCurrentTrack: TrackData | null;
    personalTopTracks: TrackData[];
    loading: LoadingState;
    error: string | null;
    connectSpotify: () => Promise<void>;
    refreshData: () => void;
}

// Default context value
const defaultContextValue: MusicContextType = {
    friendsListening: [],
    topWeeklyTracks: [],
    personalCurrentTrack: null,
    personalTopTracks: [],
    loading: { friends: true, weekly: true, personal: true },
    error: null,
    connectSpotify: async () => { },
    refreshData: () => { }
};

// Create context with explicit type and default value
const MusicContext = createContext<MusicContextType>(defaultContextValue);

// Helper function to format duration from ms to mm:ss
const formatDuration = (ms: number): string => {
    if (!ms) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Provider component with explicit children type
export function MusicProvider({ children }: { children: ReactNode }) {
    const { data: session, status } = useSession();
    const [friendsListening, setFriendsListening] = useState<FriendListeningData[]>([]);
    const [topWeeklyTracks, setTopWeeklyTracks] = useState<TrackData[]>([]);
    const [personalCurrentTrack, setPersonalCurrentTrack] = useState<TrackData | null>(null);
    const [personalTopTracks, setPersonalTopTracks] = useState<TrackData[]>([]);
    const [loadingState, setLoadingState] = useState<LoadingState>({
        friends: true,
        weekly: true,
        personal: true,
    });
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    // Load personal Spotify data when authenticated
    useEffect(() => {
        const loadPersonalSpotifyData = async () => {
            if (status !== 'authenticated' || !session?.user?.spotifyId) {
                setLoadingState(prev => ({ ...prev, personal: false }));
                return;
            }

            setLoadingState(prev => ({ ...prev, personal: true }));
            setError(null);

            try {
                // Check for session error
                if (session.error === "RefreshAccessTokenError") {
                    throw new Error("Failed to refresh access token. Please sign in again.");
                }

                // Get currently playing track
                const currentlyPlaying = await callSpotifyAPI(async () => {
                    try {
                        return await spotifyApi.player.getCurrentlyPlayingTrack();
                    } catch (err) {
                        console.error("Error fetching currently playing track:", err);
                        return null;
                    }
                });

                // Format currently playing track data if available
                if (currentlyPlaying && currentlyPlaying.item && 'name' in currentlyPlaying.item) {
                    setPersonalCurrentTrack({
                        type: 'track',
                        id: currentlyPlaying.item.id,
                        title: currentlyPlaying.item.name,
                        artist: currentlyPlaying.item.artists.map(a => a.name).join(', '),
                        album: currentlyPlaying.item.album?.name,
                        coverArt: currentlyPlaying.item.album?.images[0]?.url,
                        currentTime: formatDuration(currentlyPlaying.progress_ms ?? 0),
                        duration: formatDuration(currentlyPlaying.item.duration_ms),
                    });
                } else {
                    setPersonalCurrentTrack(null);
                }

                // Get top tracks
                const topTracksResponse = await callSpotifyAPI(async () => {
                    try {
                        return await spotifyApi.currentUser.topItems('tracks', 'medium_term', 50);
                    } catch (err) {
                        console.error("Error fetching top tracks:", err);
                        throw err;
                    }
                });

                // Format top tracks data if available
                if (topTracksResponse && topTracksResponse.items) {
                    const formattedTopTracks = topTracksResponse.items.map(track => ({
                        id: track.id,
                        title: track.name,
                        artist: track.artists.map(a => a.name).join(', '),
                        album: track.album?.name,
                        coverArt: track.album?.images[0]?.url,
                        duration: formatDuration(track.duration_ms),
                        type: 'track'
                    }));

                    setPersonalTopTracks(formattedTopTracks);
                }

                // Reset retry count on success
                setRetryCount(0);
            } catch (err) {
                console.error("Error fetching Spotify data:", err);

                // Handle specific error types
                if (err instanceof Error) {
                    if (err.message.includes("access token")) {
                        setError("Spotify authentication error. Please try signing in again.");
                    } else if (err.message.includes("rate limit")) {
                        setError("Spotify API rate limit reached. Please try again later.");
                    } else {
                        setError(`Failed to load Spotify data: ${err.message}`);
                    }
                } else {
                    setError("An unknown error occurred while loading Spotify data");
                }

                // Implement exponential backoff for retries (max 3 attempts)
                if (retryCount < 3) {
                    const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
                    console.log(`Retrying Spotify data fetch in ${retryDelay}ms (attempt ${retryCount + 1}/3)`);

                    setTimeout(() => {
                        setRetryCount(prev => prev + 1);
                    }, retryDelay);
                }
            } finally {
                setLoadingState(prev => ({ ...prev, personal: false }));
            }
        };

        loadPersonalSpotifyData();
    }, [session, status, retryCount]);

    // Load mock friend data (would be real data in production)
    useEffect(() => {
        const fetchFriendData = async () => {
            try {
                // Use timeout to simulate network request
                setTimeout(() => {
                    setFriendsListening(mockFriendData.currentlyListening);
                    setLoadingState(prev => ({ ...prev, friends: false }));
                }, 1000);

                setTimeout(() => {
                    setTopWeeklyTracks(mockFriendData.topWeeklyTracks);
                    setLoadingState(prev => ({ ...prev, weekly: false }));
                }, 1500);
            } catch (err) {
                console.error("Error fetching music data:", err);

                if (err instanceof Error) {
                    setError(`Failed to load friend music data: ${err.message}`);
                } else {
                    setError("An unknown error occurred while loading friend music data");
                }

                setLoadingState({ friends: false, weekly: false, personal: false });
            }
        };

        fetchFriendData();
    }, []);

    // Function to connect Spotify
    const connectSpotify = async () => {
        try {
            await signIn('spotify', { callbackUrl: '/' });
        } catch (error) {
            console.error("Error connecting to Spotify:", error);
            setError("Failed to connect to Spotify. Please try again.");
        }
    };

    // Function to refresh data
    const refreshData = () => {
        setLoadingState({ friends: true, weekly: true, personal: true });
        setError(null);

        // Refresh mock friend data
        setTimeout(() => {
            // Shuffle data to simulate an update
            setFriendsListening([...mockFriendData.currentlyListening].sort(() => Math.random() - 0.5));
            setTopWeeklyTracks([...mockFriendData.topWeeklyTracks].sort(() => Math.random() - 0.5));
            setLoadingState(prev => ({ ...prev, friends: false, weekly: false }));
        }, 1000);

        // Refresh personal Spotify data
        if (session?.user?.spotifyId) {
            setLoadingState(prev => ({ ...prev, personal: true }));

            // Get current track
            callSpotifyAPI(async () => {
                try {
                    const currentTrack = await spotifyApi.player.getCurrentlyPlayingTrack();

                    if (currentTrack && currentTrack.item && 'name' in currentTrack.item) {
                        setPersonalCurrentTrack({
                            id: currentTrack.item.id,
                            title: currentTrack.item.name,
                            artist: currentTrack.item.artists.map(a => a.name).join(', '),
                            album: currentTrack.item.album?.name,
                            coverArt: currentTrack.item.album?.images[0]?.url,
                            currentTime: formatDuration(currentTrack.progress_ms ?? 0),
                            duration: formatDuration(currentTrack.item.duration_ms),
                            type: 'track'
                        });
                    } else {
                        setPersonalCurrentTrack(null);
                    }

                    // Get top tracks
                    const topTracks = await spotifyApi.currentUser.topItems('tracks', 'medium_term', 50);

                    if (topTracks && topTracks.items) {
                        const formattedTopTracks = topTracks.items.map(track => ({
                            id: track.id,
                            title: track.name,
                            artist: track.artists.map(a => a.name).join(', '),
                            album: track.album?.name,
                            coverArt: track.album?.images[0]?.url,
                            duration: formatDuration(track.duration_ms),
                            type: 'track'
                        }));

                        setPersonalTopTracks(formattedTopTracks);
                    }
                } catch (error) {
                    console.error('Error refreshing Spotify data:', error);

                    if (error instanceof Error) {
                        setError(`Failed to refresh Spotify data: ${error.message}`);
                    } else {
                        setError("An unknown error occurred while refreshing Spotify data");
                    }
                } finally {
                    setLoadingState(prev => ({ ...prev, personal: false }));
                }
            });
        } else {
            setLoadingState(prev => ({ ...prev, personal: false }));
        }
    };

    // Provide context value
    const contextValue: MusicContextType = {
        friendsListening,
        topWeeklyTracks,
        personalCurrentTrack,
        personalTopTracks,
        loading: loadingState,
        error,
        connectSpotify,
        refreshData
    };

    return (
        <MusicContext.Provider value={contextValue}>
            {children}
        </MusicContext.Provider>
    );
}

// Custom hook to use the music context with type safety
export const useMusic = (): MusicContextType => {
    const context = useContext(MusicContext);

    // Throw error if hook is used outside of a provider
    if (context === undefined) {
        throw new Error('useMusic must be used within a MusicProvider');
    }

    return context;
};