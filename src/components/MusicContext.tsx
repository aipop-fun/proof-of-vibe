/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps,  @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unused-vars */
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
import { mockFriendData } from "../app/data/mockData";
import { useAuthStore } from "~/lib/stores/authStore";

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
    const { data: session } = useSession();
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

    // Get auth state from Zustand
    const {
        accessToken,
        spotifyId,
        isAuthenticated,
        isExpired
    } = useAuthStore();

    // Load personal Spotify data when authenticated
    useEffect(() => {
        const loadPersonalSpotifyData = async () => {
            // Check if authenticated with Spotify via Zustand
            if (!isAuthenticated || !spotifyId || !accessToken) {
                setLoadingState(prev => ({ ...prev, personal: false }));
                return;
            }

            // Check if token is expired
            if (isExpired()) {
                setError("Spotify session expired. Please sign in again.");
                setLoadingState(prev => ({ ...prev, personal: false }));
                return;
            }

            setLoadingState(prev => ({ ...prev, personal: true }));
            setError(null);

            try {
                // For development, let's simulate spotify data for now
                // In production, you'd make real API calls here using the token
                setTimeout(() => {
                    // Simulate a current track
                    setPersonalCurrentTrack({
                        type: 'track',
                        id: 'fake-track-id',
                        title: 'Simulation',
                        artist: 'Development Mode',
                        album: 'Testing Album',
                        coverArt: '/api/placeholder/60/60',
                        currentTime: '1:45',
                        duration: '3:30',
                    });

                    // Simulate top tracks
                    const fakeTopTracks = Array(10).fill(null).map((_, index) => ({
                        id: `fake-top-${index}`,
                        title: `Top Track ${index + 1}`,
                        artist: `Artist ${index % 3 + 1}`,
                        album: `Album ${Math.floor(index / 3) + 1}`,
                        coverArt: '/api/placeholder/60/60',
                        duration: `${Math.floor(Math.random() * 4) + 2}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
                        type: 'track'
                    }));

                    setPersonalTopTracks(fakeTopTracks);
                    setLoadingState(prev => ({ ...prev, personal: false }));
                }, 1500);

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

                setLoadingState(prev => ({ ...prev, personal: false }));
            }
        };

        loadPersonalSpotifyData();
    }, [accessToken, spotifyId, isAuthenticated, isExpired, retryCount]);

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
            // Redirect to Spotify auth flow
            window.location.href = '/api/auth/signin/spotify';
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

        // Refresh personal data
        if (isAuthenticated && accessToken && !isExpired()) {
            // Set a timeout to simulate API call
            setTimeout(() => {
                // Update current track with slight changes
                if (personalCurrentTrack) {
                    const newTime = Math.min(
                        parseFloat(personalCurrentTrack.currentTime.replace(':', '.')) + 0.3,
                        parseFloat(personalCurrentTrack.duration.replace(':', '.'))
                    );
                    const minutes = Math.floor(newTime);
                    const seconds = Math.floor((newTime - minutes) * 100);

                    setPersonalCurrentTrack({
                        ...personalCurrentTrack,
                        currentTime: `${minutes}:${seconds.toString().padStart(2, '0')}`
                    });
                }

                setLoadingState(prev => ({ ...prev, personal: false }));
            }, 1500);
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