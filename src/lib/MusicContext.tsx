/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps, @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuthStore } from './stores/authStore';

// Tipos para nossa API de música
export interface TrackInfo {
    id: string;
    title: string;
    artist: string;
    album?: string;
    albumArt?: string;
    coverArt?: string;
    type?: string;
    currentTime?: string;
    duration?: string;
    isPlaying?: boolean;
}

export interface FriendListening {
    id: string;
    fid: number;
    username?: string;
    displayName?: string;
    name?: string; // Alternativa para displayName
    profileImage?: string;
    avatar?: string; // Alternativa para profileImage
    spotifyId: string;
    timestamp: number;
    track?: TrackInfo;
}

interface MusicContextType {
    currentTrack: TrackInfo | null;
    topTracks: TrackInfo[];
    friendsListening: FriendListening[];
    musicFeed: FriendListening[];
    refreshFriendsListening: () => Promise<void>;
    refreshMusicFeed: () => Promise<void>;
    isLoading: boolean;
    error: string | null;
}

const defaultContext: MusicContextType = {
    currentTrack: null,
    topTracks: [],
    friendsListening: [],
    musicFeed: [],
    refreshFriendsListening: async () => { },
    refreshMusicFeed: async () => { },
    isLoading: false,
    error: null
};

const MusicContext = createContext<MusicContextType>(defaultContext);

export const MusicProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentTrack, setCurrentTrack] = useState<TrackInfo | null>(null);
    const [topTracks, setTopTracks] = useState<TrackInfo[]>([]);
    const [friendsListening, setFriendsListening] = useState<FriendListening[]>([]);
    const [musicFeed, setMusicFeed] = useState<FriendListening[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Pegar dados da autenticação do Zustand
    const { fid, spotifyId, accessToken, refreshToken } = useAuthStore();

    // Buscar amigos que estão ouvindo
    const refreshFriendsListening = async () => {
        if (!fid) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/friends-listening?fid=${fid}&limit=20`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch friends listening');
            }

            const data = await response.json();

            if (data.friends && Array.isArray(data.friends)) {
                setFriendsListening(data.friends);
            }
        } catch (err) {
            console.error('Error fetching friends listening:', err);
            setError(err.message || 'Failed to fetch friends listening');
        } finally {
            setIsLoading(false);
        }
    };

    // Buscar feed de música de todos os usuários
    const refreshMusicFeed = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/music-feed?limit=20');

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch music feed');
            }

            const data = await response.json();

            if (data.items && Array.isArray(data.items)) {
                setMusicFeed(data.items);
            }
        } catch (err) {
            console.error('Error fetching music feed:', err);
            setError(err.message || 'Failed to fetch music feed');
        } finally {
            setIsLoading(false);
        }
    };

    // Buscar dados iniciais quando o componente montar e quando fid mudar
    useEffect(() => {
        if (fid) {
            refreshFriendsListening();
        }

        // Sempre buscar o feed de música geral, mesmo sem fid
        refreshMusicFeed();
    }, [fid]);

    // Auto-atualização periódica (a cada 60 segundos)
    useEffect(() => {
        const interval = setInterval(() => {
            if (fid) {
                refreshFriendsListening();
            }
            refreshMusicFeed();
        }, 60000); // 1 minuto

        return () => clearInterval(interval);
    }, [fid]);

    const value = {
        currentTrack,
        topTracks,
        friendsListening,
        musicFeed,
        refreshFriendsListening,
        refreshMusicFeed,
        isLoading,
        error
    };

    return (
        <MusicContext.Provider value={value}>
            {children}
        </MusicContext.Provider>
    );
};

// Hook personalizado para utilizar o contexto
export const useMusic = () => useContext(MusicContext);