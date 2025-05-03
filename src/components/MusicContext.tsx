/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps,  @typescript-eslint/ban-ts-comment */
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
import { getCurrentlyPlaying, getTopTracks, refreshSpotifyToken } from "~/lib/spotify";

// Define types for the music data and context
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

// Create a default context value
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

    // Helper function to check if token is expired and refresh if needed
    const getValidAccessToken = async () => {
        if (!session?.user?.accessToken) {
            return null;
        }

        // Check if token is expired
        const now = Math.floor(Date.now() / 1000);
        const isExpired = session.user.expiresAt && session.user.expiresAt < now;

        if (isExpired && session.user.refreshToken) {
            try {
                // Refresh the token
                const refreshedTokens = await refreshSpotifyToken(session.user.refreshToken);
                
                // Here we'd ideally update the session with the new token
                // This is a simplified version - in a real app, you'd need to update the NextAuth session
                return refreshedTokens.access_token;
            } catch (error) {
                console.error('Error refreshing token:', error);
                return null;
            }
        }

        return session.user.accessToken;
    };

    // Load personal Spotify data if connected
    useEffect(() => {
        const loadPersonalSpotifyData = async () => {
            if (status !== 'authenticated' || !session?.user?.spotifyId) {
                setLoadingState(prev => ({ ...prev, personal: false }));
                return;
            }

            setLoadingState(prev => ({ ...prev, personal: true }));
            
            try {
                const accessToken = await getValidAccessToken();
                
                if (!accessToken) {
                    throw new Error('No valid access token');
                }

                // Fetch currently playing track
                const currentTrack = await getCurrentlyPlaying(accessToken);
                
                if (currentTrack && currentTrack.item) {
                    setPersonalCurrentTrack({
                        type: 'track',
                        id: currentTrack.item.id,
                        title: currentTrack.item.name,
                        artist: currentTrack.item.artists.map((a: any) => a.name).join(', '),
                        album: currentTrack.item.album?.name,
                        coverArt: currentTrack.item.album?.images[0]?.url,
                        currentTime: formatDuration(currentTrack.progress_ms),
                        duration: formatDuration(currentTrack.item.duration_ms),
                    });
                } else {
                    setPersonalCurrentTrack(null);
                }

                // Fetch top tracks
                const topTracksData = await getTopTracks(accessToken);
                
                if (topTracksData && topTracksData.items) {
                    const formattedTopTracks = topTracksData.items.map((track: any) => ({
                        id: track.id,
                        title: track.name,
                        artist: track.artists.map((a: any) => a.name).join(', '),
                        album: track.album?.name,
                        coverArt: track.album?.images[0]?.url,
                        duration: formatDuration(track.duration_ms),
                    }));
                    
                    setPersonalTopTracks(formattedTopTracks);
                }
            } catch (err) {
                console.error("Error fetching Spotify data:", err);
                setError(err instanceof Error ? err.message : "Failed to load Spotify data");
            } finally {
                setLoadingState(prev => ({ ...prev, personal: false }));
            }
        };

        loadPersonalSpotifyData();
    }, [session, status]);

    // Fetch friend data
    useEffect(() => {
        const fetchFriendData = async () => {
            try {
                // For MVP, use mock data
                // In production, this would fetch data from Supabase or other backend
                setTimeout(() => {
                    // @ts-ignore
                    setFriendsListening(mockFriendData.currentlyListening);
                    setLoadingState(prev => ({ ...prev, friends: false }));
                }, 1000);

                setTimeout(() => {
                    // @ts-ignore
                    setTopWeeklyTracks(mockFriendData.topWeeklyTracks);
                    setLoadingState(prev => ({ ...prev, weekly: false }));
                }, 1500);
            } catch (err) {
                console.error("Error fetching music data:", err);
                setError(err instanceof Error ? err.message : "Failed to load music data");
                setLoadingState({ friends: false, weekly: false, personal: false });
            }
        };

        fetchFriendData();
    }, []);

    // Helper function to format duration from ms to mm:ss
    const formatDuration = (ms: number): string => {
        if (!ms) return '0:00';
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Function to connect Spotify 
    const connectSpotify = async () => {
        await signIn('spotify', { callbackUrl: '/' });
    };

    // Function to refresh data
    const refreshData = () => {
        setLoadingState({ friends: true, weekly: true, personal: true });
        
        // Refresh mock friend data
        setTimeout(() => {
            // @ts-ignore
            setFriendsListening([...mockFriendData.currentlyListening].sort(() => Math.random() - 0.5));
            // @ts-ignore
             setTopWeeklyTracks([...mockFriendData.topWeeklyTracks].sort(() => Math.random() - 0.5));
            setLoadingState(prev => ({ ...prev, friends: false, weekly: false }));
        }, 1000);
        
        // Refresh personal Spotify data if connected
        if (session?.user?.spotifyId) {
            getValidAccessToken().then(accessToken => {
                if (accessToken) {
                    Promise.all([
                        getCurrentlyPlaying(accessToken),
                        getTopTracks(accessToken)
                    ]).then(([currentTrack, topTracks]) => {
                        // Update current track
                        if (currentTrack && currentTrack.item) {
                            // @ts-ignore
        setPersonalCurrentTrack({

                                id: currentTrack.item.id,
                                title: currentTrack.item.name,
                                artist: currentTrack.item.artists.map((a: any) => a.name).join(', '),
                                album: currentTrack.item.album?.name,
                                coverArt: currentTrack.item.album?.images[0]?.url,
                                currentTime: formatDuration(currentTrack.progress_ms),
                                duration: formatDuration(currentTrack.item.duration_ms),
                            });
                        } else {
                            setPersonalCurrentTrack(null);
                        }
                        
                        // Update top tracks
                        if (topTracks && topTracks.items) {
                            const formattedTopTracks = topTracks.items.map((track: any) => ({
                                id: track.id,
                                title: track.name,
                                artist: track.artists.map((a: any) => a.name).join(', '),
                                album: track.album?.name,
                                coverArt: track.album?.images[0]?.url,
                                duration: formatDuration(track.duration_ms),
                            }));
                            
                            setPersonalTopTracks(formattedTopTracks);
                        }
                        
                        setLoadingState(prev => ({ ...prev, personal: false }));
                    }).catch(error => {
                        console.error('Error refreshing Spotify data:', error);
                        setLoadingState(prev => ({ ...prev, personal: false }));
                    });
                } else {
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

// Custom hook for using the music context with type safety
export const useMusic = (): MusicContextType => {
    const context = useContext(MusicContext);

    // Throw an error if the hook is used outside of a provider
    if (context === undefined) {
        throw new Error('useMusic must be used within a MusicProvider');
    }

    return context;
};
