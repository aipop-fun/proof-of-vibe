/* eslint-disable  @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '~/lib/stores/authStore';
import { SpotifyImage } from './SpotifyImage';
import { useFrame } from './providers/FrameProvider';
import sdk from "@farcaster/frame-sdk";
import { TrackListSkeleton } from './SkeletonLoader';
import { TimeRange } from '~/stores/spotifyDataStore';

export function SpotifyTopTracks() {
    const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('medium_term');
    const [isExpanded, setIsExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { isMiniApp } = useFrame();

    const {
        topTracks,
        isLoadingTracks,
        fetchTopTracks,
        isAuthenticated,
        spotifyId,
        accessToken,
        refreshTokenIfNeeded
    } = useAuthStore();

    const timeRangeLabels: Record<TimeRange, string> = {
        short_term: 'Últimas 4 Semanas',
        medium_term: 'Últimos 6 Meses',
        long_term: 'Todo o Tempo'
    };

    
    const loadTopTracksData = useCallback(async (timeRange: TimeRange, forceRefresh = false) => {
        setError(null);
        try {
            const tokenValid = await refreshTokenIfNeeded();    
            const shouldFetch = forceRefresh || (topTracks[timeRange].length === 0 && !isLoadingTracks[timeRange]);

            if (tokenValid && accessToken && shouldFetch) {
                console.log(`A carregar faixas principais para ${timeRange} (Forçado: ${forceRefresh})...`);
                await fetchTopTracks(timeRange);
            }
        } catch (err) {
            console.error(`Erro ao carregar faixas principais (${timeRange}):`, err);
            setError(err instanceof Error ? err.message : "Falha ao carregar as faixas principais");
        }
    }, [accessToken, fetchTopTracks, isLoadingTracks, refreshTokenIfNeeded, topTracks]);

    useEffect(() => {
        if (isAuthenticated && spotifyId) {
            loadTopTracksData(selectedTimeRange);
        }
    }, [isAuthenticated, loadTopTracksData, selectedTimeRange, spotifyId]);

    const handleTimeRangeChange = (timeRange: TimeRange) => {
        setSelectedTimeRange(timeRange);
        loadTopTracksData(timeRange);
    };

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };
    
    const handleRefresh = async () => {
        if (isLoadingTracks[selectedTimeRange]) return;        
        await loadTopTracksData(selectedTimeRange, true);
    };

    const handleShareTopTracks = () => {
        if (topTracks[selectedTimeRange].length === 0) return;
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const shareUrl = `${baseUrl}/results?type=top-tracks&timeRange=${selectedTimeRange}`;
        const timeRangeText = timeRangeLabels[selectedTimeRange];
        const shareMessage = `🎵 Vê as minhas faixas favoritas de "${timeRangeText}" no Timbra!`;

        if (isMiniApp && typeof sdk?.actions?.composeCast === 'function') {
            sdk.actions.composeCast({ text: shareMessage, embeds: [shareUrl] });
        } else {
            window.open(shareUrl, '_blank');
        }
    };

    const tracksToShow = topTracks[selectedTimeRange] || [];

    return (
        <div className="mt-3">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-medium">As Suas Faixas Favoritas</h3>
                <div className="flex space-x-2">
                    <button
                        onClick={handleShareTopTracks}
                        className="text-xs text-purple-400 hover:text-purple-300"
                        disabled={isLoadingTracks[selectedTimeRange] || tracksToShow.length === 0}
                    >
                        Partilhar
                    </button>
                    <button
                        onClick={handleRefresh}
                        className="text-xs text-purple-400 hover:text-purple-300"
                        disabled={isLoadingTracks[selectedTimeRange]}
                    >
                        {isLoadingTracks[selectedTimeRange] ? 'A carregar...' : 'Atualizar'}
                    </button>
                    <button
                        onClick={toggleExpanded}
                        className="text-xs text-purple-400 hover:text-purple-300"
                    >
                        {isExpanded ? 'Mostrar Menos' : 'Mostrar Mais'}
                    </button>
                </div>
            </div>

            <div className="flex space-x-2 mb-3 text-xs">
                {Object.entries(timeRangeLabels).map(([range, label]) => (
                    <button
                        key={range}
                        className={`px-2 py-1 rounded ${selectedTimeRange === range
                            ? 'bg-purple-700 text-white'
                            : 'bg-purple-900/50 text-gray-300 hover:bg-purple-800/50'
                            }`}
                        onClick={() => handleTimeRangeChange(range as TimeRange)}
                        disabled={isLoadingTracks[range as TimeRange]}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {error && (
                <div className="mb-3 p-2 text-sm bg-red-900/30 text-red-200 rounded-md">
                    {error}
                </div>
            )}

            {isLoadingTracks[selectedTimeRange] ? (
                <TrackListSkeleton count={4} />
            ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {tracksToShow.length === 0 ? (
                        <div className="text-center text-gray-400 p-4">
                            <p>Nenhuma faixa encontrada para este período</p>
                            <button
                                onClick={handleRefresh}
                                className="mt-2 text-sm text-purple-400 hover:text-purple-300"
                            >
                                Tentar novamente
                            </button>
                        </div>
                    ) : (
                        tracksToShow.slice(0, isExpanded ? undefined : 5).map((track) => (
                            <div key={track.id} className="flex items-center p-2 bg-purple-900/30 rounded">
                                <div className="relative w-10 h-10 mr-3 flex-shrink-0">
                                    <SpotifyImage
                                        src={track.coverArt || '/api/placeholder/40/40'}
                                        alt={track.title}
                                        className="rounded"
                                        width={40}
                                        height={40}
                                        style={{ objectFit: 'cover' }}
                                    />
                                </div>
                                <div className="min-w-0 flex-grow">
                                    <p className="font-medium text-sm truncate">{track.title}</p>
                                    <p className="text-xs text-gray-300 truncate">{track.artist}</p>
                                </div>
                                {track.popularity !== undefined && (
                                    <div className="text-xs text-gray-400 ml-2">
                                        {track.popularity}%
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}