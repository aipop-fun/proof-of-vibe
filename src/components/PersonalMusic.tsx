/* eslint-disable  @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "~/lib/stores/authStore";
import { SpotifyTopTracks } from "./SpotifyTopTracks";
import { SpotifyImage } from "./SpotifyImage";

interface CurrentTrack {
    id: string;
    title: string;
    artist: string;
    album?: string;
    coverArt?: string;
    duration: string;
    currentTime: string;
}

export function PersonalMusic() {
    const [error, setError] = useState<string | null>(null);

    // Acesso ao Zustand store
    const {
        currentlyPlaying,
        loadingCurrentTrack,
        fetchCurrentlyPlaying,
        isAuthenticated,
        spotifyId,
        isExpired,
        accessToken
    } = useAuthStore();

    // Buscar dados quando o componente montar
    useEffect(() => {
        if (isAuthenticated && accessToken && !isExpired()) {
            // Busca inicial
            fetchCurrentlyPlaying();

            // Configurar polling a cada 30 segundos
            const intervalId = setInterval(() => {
                if (isAuthenticated && !isExpired()) {
                    fetchCurrentlyPlaying();
                }
            }, 30000);

            // Limpeza ao desmontar
            return () => clearInterval(intervalId);
        }
    }, [accessToken, isAuthenticated, isExpired, fetchCurrentlyPlaying]);

    // Função auxiliar para calcular a porcentagem de progresso
    const calculateProgress = (current: string, total: string): number => {
        try {
            // Converter formato mm:ss para segundos
            const currentParts = current.split(':');
            const totalParts = total.split(':');

            const currentSeconds = parseInt(currentParts[0]) * 60 + parseInt(currentParts[1]);
            const totalSeconds = parseInt(totalParts[0]) * 60 + parseInt(totalParts[1]);

            if (isNaN(currentSeconds) || isNaN(totalSeconds) || totalSeconds === 0) {
                return 0;
            }

            return (currentSeconds / totalSeconds) * 100;
        } catch (error) {
            console.error('Erro ao calcular progresso:', error);
            return 0;
        }
    };

    // Se não estiver autenticado com Spotify, não mostrar nada
    if (!isAuthenticated || !spotifyId) {
        return null;
    }

    return (
        <div className="p-4 bg-purple-800/20 rounded-lg mb-6">
            <h2 className="text-lg font-semibold mb-3">Your Music</h2>

            {/* Exibição de erro */}
            {error && (
                <div className="mb-3 p-2 text-sm bg-red-900/30 text-red-200 rounded-md">
                    {error}
                </div>
            )}

            {loadingCurrentTrack && !currentlyPlaying ? (
                <div className="animate-pulse">
                    <div className="h-16 bg-purple-700/30 rounded"></div>
                </div>
            ) : (
                <>
                    {/* Faixa atual */}
                    {currentlyPlaying ? (
                        <div className="mb-4">
                            <p className="text-sm text-green-400 mb-1">Currently Playing</p>
                            <div className="flex items-center">
                                <div className="relative w-16 h-16 mr-3 flex-shrink-0">
                                    <SpotifyImage
                                        src={currentlyPlaying.coverArt || '/api/placeholder/60/60'}
                                        alt={currentlyPlaying.title}
                                        className="rounded"
                                        fill
                                        sizes="64px"
                                        style={{ objectFit: 'cover' }}
                                    />
                                </div>
                                <div>
                                    <p className="font-medium">{currentlyPlaying.title}</p>
                                    <p className="text-sm text-gray-300">{currentlyPlaying.artist}</p>
                                    <div className="flex items-center mt-1">
                                        <div className="w-32 h-1 bg-gray-700 rounded-full mr-2">
                                            <div
                                                className="h-1 bg-green-500 rounded-full"
                                                style={{
                                                    width: `${calculateProgress(
                                                        currentlyPlaying.currentTime ?? '0:00',
                                                        currentlyPlaying.duration ?? '0:00'
                                                    )}%`
                                                }}
                                            ></div>
                                        </div>
                                        <span className="text-xs text-gray-400">
                                            {currentlyPlaying.currentTime} / {currentlyPlaying.duration}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 mb-3">Não está tocando nada no momento</p>
                    )}

                    {/* Componente de faixas principais */}
                    <SpotifyTopTracks />
                </>
            )}
        </div>
    );
}