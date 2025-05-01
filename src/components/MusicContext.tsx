/* eslint-disable  @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode
} from "react";
import { mockFriendData } from "../app/data/mockData";

// Define types for the music data and context
export interface TrackData {
    name: ReactNode;
    username: ReactNode;
    timestamp(timestamp: any): ReactNode;
    track: any;
    fid(fid: any): void;
    id: string;
    title: string;
    artist: string;
    album: string;
    coverArt: string;
    platform?: string;
}

export interface LoadingState {
    friends: boolean;
    weekly: boolean;
}

export interface MusicContextType {
    friendsListening: TrackData[];
    topWeeklyTracks: TrackData[];
    loading: LoadingState;
    error: string | null;
    connectSpotify: () => Promise<void>;
    refreshData: () => void;
}

// Create a default context value
const defaultContextValue: MusicContextType = {
    friendsListening: [],
    topWeeklyTracks: [],
    loading: { friends: true, weekly: true },
    error: null,
    connectSpotify: async () => { },
    refreshData: () => { }
};

// Create context with explicit type and default value
const MusicContext = createContext<MusicContextType>(defaultContextValue);

// Provider component with explicit children type
export function MusicProvider({ children }: { children: ReactNode }) {
    const [friendsListening, setFriendsListening] = useState<TrackData[]>([]);
    const [topWeeklyTracks, setTopWeeklyTracks] = useState<TrackData[]>([]);
    const [loadingState, setLoadingState] = useState<LoadingState>({
        friends: true,
        weekly: true,
    });
    const [error, setError] = useState<string | null>(null);

    // Fetch data when component mounts
    useEffect(() => {
        const fetchData = async () => {
            try {
                // For MVP, use mock data
                // In production, this would be a real API call to the backend that handles TLSNotary proofs
                setTimeout(() => {
                    // @ts-expect-error
                    setFriendsListening(mockFriendData.currentlyListening);
                    setLoadingState(prev => ({ ...prev, friends: false }));
                }, 1000);

                setTimeout(() => {
                    // @ts-expect-error
                    setTopWeeklyTracks(mockFriendData.topWeeklyTracks);
                    setLoadingState(prev => ({ ...prev, weekly: false }));
                }, 1500);
            } catch (err) {
                console.error("Error fetching music data:", err);
                setError(err instanceof Error ? err.message : "Failed to load music data");
                setLoadingState({ friends: false, weekly: false });
            }
        };

        fetchData();
    }, []);

    // Function to connect Spotify (would be implemented with real auth flow)
    const connectSpotify = async () => {
        alert("In the full version, this would connect to Spotify with TLSNotary");
        // This is where the TLSNotary flow would begin
    };

    // Function to refresh data
    const refreshData = () => {
        setLoadingState({ friends: true, weekly: true });
        setTimeout(() => {
            // Shuffle the arrays to simulate new data
            // @ts-expect-error
            setFriendsListening([...mockFriendData.currentlyListening].sort(() => Math.random() - 0.5));
            // @ts-expect-error
            setTopWeeklyTracks([...mockFriendData.topWeeklyTracks].sort(() => Math.random() - 0.5));
            setLoadingState({ friends: false, weekly: false });
        }, 1000);
    };

    // Provide context value
    const contextValue: MusicContextType = {
        friendsListening,
        topWeeklyTracks,
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

// Custom hook for using the music context with type safety
export const useMusic = (): MusicContextType => {
    const context = useContext(MusicContext);

    // Throw an error if the hook is used outside of a provider
    if (context === undefined) {
        throw new Error('useMusic must be used within a MusicProvider');
    }

    return context;
};