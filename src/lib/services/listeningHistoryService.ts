/* eslint-disable  @typescript-eslint/no-explicit-any*/

import { supabase } from '~/lib/supabase';
import { SpotifyTrack } from '~/stores/spotifyDataStore';

export interface ListeningHistoryEntry {
    id: string;
    user_id: string;
    fid: number;
    spotify_track_id: string;
    track_title: string;
    track_artist: string;
    track_album?: string;
    track_cover_art?: string;
    track_duration_ms?: number;
    track_progress_ms?: number;
    track_uri?: string;
    track_popularity?: number;
    is_playing: boolean;
    listened_at: string;
    created_at: string;
    updated_at: string;
}

export interface FriendListeningData {
    id: string;
    fid: number;
    username?: string;
    displayName?: string;
    profileImage?: string;
    track: {
        title: string;
        artist: string;
        album?: string;
        coverArt?: string;
        duration?: string;
        currentTime?: string;
        type?: string;
    };
    timestamp: string;
    listened_at: string;
}

class ListeningHistoryService {
    /**
     * Salva uma track no histórico de audição
     */
    async saveListeningHistory(
        userId: string,
        fid: number,
        track: SpotifyTrack
    ): Promise<ListeningHistoryEntry | null> {
        try {
            // Verificar se já existe uma entrada muito recente para evitar spam
            const recentThreshold = new Date(Date.now() - 60000); // 1 minuto atrás

            const { data: recentEntry } = await supabase
                .from('listening_history')
                .select('id, listened_at')
                .eq('user_id', userId)
                .eq('spotify_track_id', track.id)
                .gte('listened_at', recentThreshold.toISOString())
                .order('listened_at', { ascending: false })
                .limit(1)
                .single();

            // Se já tem uma entrada recente da mesma track, apenas atualiza
            if (recentEntry) {
                const { data: updatedEntry, error } = await supabase
                    .from('listening_history')
                    .update({
                        track_progress_ms: track.progressMs,
                        is_playing: track.isPlaying || false,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', recentEntry.id)
                    .select()
                    .single();

                if (error) {
                    console.error('Error updating listening history:', error);
                    return null;
                }

                return updatedEntry;
            }

            // Criar nova entrada no histórico
            const { data: newEntry, error } = await supabase
                .from('listening_history')
                .insert({
                    user_id: userId,
                    fid,
                    spotify_track_id: track.id,
                    track_title: track.title,
                    track_artist: track.artist,
                    track_album: track.album,
                    track_cover_art: track.coverArt,
                    track_duration_ms: track.durationMs,
                    track_progress_ms: track.progressMs,
                    track_uri: track.uri,
                    track_popularity: track.popularity,
                    is_playing: track.isPlaying || false,
                    listened_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                console.error('Error saving listening history:', error);
                return null;
            }

            return newEntry;

        } catch (error) {
            console.error('Error in saveListeningHistory:', error);
            return null;
        }
    }

    /**
     * Busca o histórico de audição de um usuário
     */
    async getUserListeningHistory(
        userId: string,
        limit: number = 50
    ): Promise<ListeningHistoryEntry[]> {
        try {
            const { data, error } = await supabase
                .from('listening_history')
                .select('*')
                .eq('user_id', userId)
                .order('listened_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('Error fetching listening history:', error);
                return [];
            }

            return data || [];

        } catch (error) {
            console.error('Error in getUserListeningHistory:', error);
            return [];
        }
    }

    /**
     * Busca o que os amigos estão ouvindo recentemente
     */
    async getFriendsRecentListening(
        friendFids: number[],
        limit: number = 20
    ): Promise<FriendListeningData[]> {
        try {
            if (friendFids.length === 0) {
                return [];
            }

            // Buscar o histórico mais recente dos amigos (últimas 24 horas)
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

            const { data: historyEntries, error } = await supabase
                .from('listening_history')
                .select(`
                    *,
                    users!inner(
                        fid,
                        username,
                        display_name,
                        profile_image
                    )
                `)
                .in('fid', friendFids)
                .gte('listened_at', yesterday.toISOString())
                .order('listened_at', { ascending: false })
                .limit(limit * 2); // Buscar mais para filtrar duplicatas

            if (error) {
                console.error('Error fetching friends listening history:', error);
                return [];
            }

            if (!historyEntries || historyEntries.length === 0) {
                return [];
            }

            // Agrupar por usuário e pegar apenas a entrada mais recente de cada um
            const userLatestMap = new Map<number, any>();

            historyEntries.forEach(entry => {
                const fid = entry.fid;
                const currentLatest = userLatestMap.get(fid);

                if (!currentLatest || new Date(entry.listened_at) > new Date(currentLatest.listened_at)) {
                    userLatestMap.set(fid, entry);
                }
            });

            // Converter para o formato esperado
            const friendsListening: FriendListeningData[] = Array.from(userLatestMap.values())
                .map(entry => ({
                    id: entry.id,
                    fid: entry.fid,
                    username: entry.users?.username,
                    displayName: entry.users?.display_name,
                    profileImage: entry.users?.profile_image,
                    track: {
                        title: entry.track_title,
                        artist: entry.track_artist,
                        album: entry.track_album,
                        coverArt: entry.track_cover_art,
                        duration: entry.track_duration_ms ? this.formatDuration(entry.track_duration_ms) : undefined,
                        currentTime: entry.track_progress_ms ? this.formatDuration(entry.track_progress_ms) : undefined,
                        type: 'song'
                    },
                    timestamp: entry.listened_at,
                    listened_at: entry.listened_at
                }))
                .sort((a, b) => new Date(b.listened_at).getTime() - new Date(a.listened_at).getTime())
                .slice(0, limit);

            return friendsListening;

        } catch (error) {
            console.error('Error in getFriendsRecentListening:', error);
            return [];
        }
    }

    /**
     * Formatar duração de milissegundos para string
     */
    private formatDuration(ms: number): string {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Limpar histórico antigo do usuário
     */
    async cleanupOldHistory(userId: string, daysToKeep: number = 30): Promise<boolean> {
        try {
            const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

            const { error } = await supabase
                .from('listening_history')
                .delete()
                .eq('user_id', userId)
                .lt('listened_at', cutoffDate.toISOString());

            if (error) {
                console.error('Error cleaning up old history:', error);
                return false;
            }

            return true;

        } catch (error) {
            console.error('Error in cleanupOldHistory:', error);
            return false;
        }
    }

    /**
     * Buscar estatísticas de audição do usuário
     */
    async getUserListeningStats(userId: string, days: number = 7) {
        try {
            const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

            const { data, error } = await supabase
                .from('listening_history')
                .select('track_title, track_artist, listened_at')
                .eq('user_id', userId)
                .gte('listened_at', startDate.toISOString());

            if (error) {
                console.error('Error fetching listening stats:', error);
                return null;
            }

            const totalTracks = data?.length || 0;
            const uniqueTracks = new Set(data?.map(entry => `${entry.track_title}-${entry.track_artist}`)).size;
            const uniqueArtists = new Set(data?.map(entry => entry.track_artist)).size;

            return {
                totalTracks,
                uniqueTracks,
                uniqueArtists,
                averageTracksPerDay: Math.round((totalTracks / days) * 10) / 10
            };

        } catch (error) {
            console.error('Error in getUserListeningStats:', error);
            return null;
        }
    }
}

export const listeningHistoryService = new ListeningHistoryService();