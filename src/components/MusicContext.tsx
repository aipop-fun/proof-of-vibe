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
import spotifyApi from "~/lib/spotify-sdk";
import { mockFriendData } from "../app/data/mockData";

// Definições de tipos para os dados de música e contexto
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

// Criar um valor de contexto padrão
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

// Criar contexto com tipo explícito e valor padrão
const MusicContext = createContext<MusicContextType>(defaultContextValue);

// Componente Provider com tipo de children explícito
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

    // Carregar dados pessoais do Spotify se conectado
    useEffect(() => {
        const loadPersonalSpotifyData = async () => {
            if (status !== 'authenticated' || !session?.user?.spotifyId) {
                setLoadingState(prev => ({ ...prev, personal: false }));
                return;
            }

            setLoadingState(prev => ({ ...prev, personal: true }));

            try {
                // Verificar se há erro de token
                if (session.error === "RefreshAccessTokenError") {
                    throw new Error("Failed to refresh access token. Please sign in again.");
                }

                // Obter faixa atualmente em reprodução usando o SDK
                try {
                    const currentlyPlaying = await spotifyApi.player.getCurrentlyPlayingTrack();

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
                } catch (err) {
                    console.error("Error fetching currently playing track:", err);
                    setPersonalCurrentTrack(null);
                }

                // Obter top tracks usando o SDK
                const topTracksResponse = await spotifyApi.currentUser.topItems('tracks', 'medium_term', 50);

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
            } catch (err) {
                console.error("Error fetching Spotify data:", err);
                setError(err instanceof Error ? err.message : "Failed to load Spotify data");
            } finally {
                setLoadingState(prev => ({ ...prev, personal: false }));
            }
        };

        loadPersonalSpotifyData();
    }, [session, status]);

    // Carregar dados de amigos
    useEffect(() => {
        const fetchFriendData = async () => {
            try {
                // Para o MVP, use dados simulados
                // Em produção, isso buscaria dados do Supabase ou outro backend
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
                setError(err instanceof Error ? err.message : "Failed to load music data");
                setLoadingState({ friends: false, weekly: false, personal: false });
            }
        };

        fetchFriendData();
    }, []);

    // Função auxiliar para formatar duração de ms para mm:ss
    const formatDuration = (ms: number): string => {
        if (!ms) return '0:00';
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Função para conectar Spotify
    const connectSpotify = async () => {
        await signIn('spotify', { callbackUrl: '/' });
    };

    // Função para atualizar dados
    const refreshData = () => {
        setLoadingState({ friends: true, weekly: true, personal: true });

        // Atualizar dados simulados de amigos
        setTimeout(() => {
            // Embaralhar os dados para simular atualização
            setFriendsListening([...mockFriendData.currentlyListening].sort(() => Math.random() - 0.5));
            setTopWeeklyTracks([...mockFriendData.topWeeklyTracks].sort(() => Math.random() - 0.5));
            setLoadingState(prev => ({ ...prev, friends: false, weekly: false }));
        }, 1000);

        // Atualizar dados pessoais do Spotify se conectado
        if (session?.user?.spotifyId) {
            try {
                // Obter faixa atual
                spotifyApi.player.getCurrentlyPlayingTrack().then(currentTrack => {
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
                }).catch(error => {
                    console.error('Error refreshing current track:', error);
                });

                // Obter top tracks
                spotifyApi.currentUser.topItems('tracks', 'medium_term', 50).then(topTracks => {
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
                }).catch(error => {
                    console.error('Error refreshing top tracks:', error);
                }).finally(() => {
                    setLoadingState(prev => ({ ...prev, personal: false }));
                });
            } catch (error) {
                console.error('Error refreshing Spotify data:', error);
                setLoadingState(prev => ({ ...prev, personal: false }));
            }
        } else {
            setLoadingState(prev => ({ ...prev, personal: false }));
        }
    };

    // Fornecer valor do contexto
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

// Hook personalizado para usar o contexto de música com segurança de tipo
export const useMusic = (): MusicContextType => {
    const context = useContext(MusicContext);

    // Lançar um erro se o hook for usado fora de um provider
    if (context === undefined) {
        throw new Error('useMusic must be used within a MusicProvider');
    }

    return context;
};