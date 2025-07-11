/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
 */

//@ts-nocheck
import { supabase, getUserByFid, getUserBySpotifyId } from './supabase';

// Tipos para as tracks
export interface SpotifyTrackData {
    id: string;
    title: string;
    artist: string;
    album?: string;
    albumArt?: string;
    coverArt?: string;
    isPlaying?: boolean;
    currentTime?: string;
    duration?: string;
    progressMs?: number;
    durationMs?: number;
    type?: string;
    spotifyUrl?: string;
    timestamp?: number;
}

export type TimeRange = 'short_term' | 'medium_term' | 'long_term';

// Função para atualizar ou inserir a track atual do usuário
export async function updateCurrentTrack(
    fidOrSpotifyId: number | string,
    trackData: SpotifyTrackData
) {
    try {
        // Buscar o usuário pelo FID ou Spotify ID
        let user;
        if (typeof fidOrSpotifyId === 'number') {
            user = await getUserByFid(fidOrSpotifyId);
        } else {
            user = await getUserBySpotifyId(fidOrSpotifyId);
        }

        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        // Verificar se já existe um registro atual para esse usuário
        const { data: existingTrack, error: queryError } = await supabase
            .from('user_current_tracks')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (queryError && queryError.code !== 'PGRST116') { // PGRST116 significa que não encontrou resultados
            console.error('Erro ao verificar track atual:', queryError);
            throw queryError;
        }

        if (existingTrack) {
            // Atualizar registro existente
            const { data, error } = await supabase
                .from('user_current_tracks')
                .update({
                    track_data: trackData,
                    is_playing: trackData.isPlaying || false,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingTrack.id)
                .select()
                .single();

            if (error) {
                console.error('Erro ao atualizar track atual:', error);
                throw error;
            }

            return data;
        } else {
            // Inserir novo registro
            const { data, error } = await supabase
                .from('user_current_tracks')
                .insert({
                    user_id: user.id,
                    spotify_id: user.spotify_id!,
                    fid: user.fid,
                    track_data: trackData,
                    is_playing: trackData.isPlaying || false
                })
                .select()
                .single();

            if (error) {
                console.error('Erro ao inserir track atual:', error);
                throw error;
            }

            return data;
        }
    } catch (error) {
        console.error('Erro em updateCurrentTrack:', error);
        throw error;
    }
}

// Função para obter a track atual de um usuário
export async function getCurrentTrack(fidOrSpotifyId: number | string): Promise<SpotifyTrackData | null> {
    try {
        // Buscar o usuário pelo FID ou Spotify ID
        let user;
        if (typeof fidOrSpotifyId === 'number') {
            user = await getUserByFid(fidOrSpotifyId);
        } else {
            user = await getUserBySpotifyId(fidOrSpotifyId);
        }

        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        // Buscar a track atual do usuário
        const { data, error } = await supabase
            .from('user_current_tracks')
            .select('track_data, is_playing, updated_at')
            .eq('user_id', user.id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') { // Não encontrou resultados
                return null;
            }
            console.error('Erro ao obter track atual:', error);
            throw error;
        }

        // Verificar se os dados estão atualizados (menos de 30 minutos)
        const updatedAt = new Date(data.updated_at);
        const now = new Date();
        const diffMinutes = (now.getTime() - updatedAt.getTime()) / (1000 * 60);

        if (diffMinutes > 30 && data.is_playing) {
            // Se passou mais de 30 minutos e estava tocando, assumir que não está mais tocando
            return {
                ...data.track_data,
                isPlaying: false
            };
        }

        return data.track_data;
    } catch (error) {
        console.error('Erro em getCurrentTrack:', error);
        return null;
    }
}

// Função para atualizar as tracks recentes do usuário
export async function updateRecentTracks(
    fidOrSpotifyId: number | string,
    tracksData: SpotifyTrackData[]
) {
    try {
        // Buscar o usuário pelo FID ou Spotify ID
        let user;
        if (typeof fidOrSpotifyId === 'number') {
            user = await getUserByFid(fidOrSpotifyId);
        } else {
            user = await getUserBySpotifyId(fidOrSpotifyId);
        }

        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        // Verificar se já existe um registro de tracks recentes para esse usuário
        const { data: existingTracks, error: queryError } = await supabase
            .from('user_recent_tracks')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (queryError && queryError.code !== 'PGRST116') {
            console.error('Erro ao verificar tracks recentes:', queryError);
            throw queryError;
        }

        if (existingTracks) {
            // Atualizar registro existente
            const { data, error } = await supabase
                .from('user_recent_tracks')
                .update({
                    tracks_data: tracksData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingTracks.id)
                .select()
                .single();

            if (error) {
                console.error('Erro ao atualizar tracks recentes:', error);
                throw error;
            }

            return data;
        } else {
            // Inserir novo registro
            const { data, error } = await supabase
                .from('user_recent_tracks')
                .insert({
                    user_id: user.id,
                    spotify_id: user.spotify_id!,
                    fid: user.fid,
                    tracks_data: tracksData
                })
                .select()
                .single();

            if (error) {
                console.error('Erro ao inserir tracks recentes:', error);
                throw error;
            }

            return data;
        }
    } catch (error) {
        console.error('Erro em updateRecentTracks:', error);
        throw error;
    }
}

// Função para obter as tracks recentes de um usuário
export async function getRecentTracks(
    fidOrSpotifyId: number | string,
    limit: number = 10
): Promise<SpotifyTrackData[]> {
    try {
        // Buscar o usuário pelo FID ou Spotify ID
        let user;
        if (typeof fidOrSpotifyId === 'number') {
            user = await getUserByFid(fidOrSpotifyId);
        } else {
            user = await getUserBySpotifyId(fidOrSpotifyId);
        }

        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        // Buscar as tracks recentes do usuário
        const { data, error } = await supabase
            .from('user_recent_tracks')
            .select('tracks_data, updated_at')
            .eq('user_id', user.id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') { // Não encontrou resultados
                return [];
            }
            console.error('Erro ao obter tracks recentes:', error);
            throw error;
        }

        // Verificar se os dados estão atualizados (menos de 1 dia)
        const updatedAt = new Date(data.updated_at);
        const now = new Date();
        const diffHours = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);

        if (diffHours > 24) {
            console.warn('Dados de tracks recentes estão desatualizados');
        }

        // Retornar até o limite especificado
        return Array.isArray(data.tracks_data) ? data.tracks_data.slice(0, limit) : [];
    } catch (error) {
        console.error('Erro em getRecentTracks:', error);
        return [];
    }
}

// Função para atualizar as top tracks do usuário
export async function updateTopTracks(
    fidOrSpotifyId: number | string,
    timeRange: TimeRange,
    tracksData: SpotifyTrackData[]
) {
    try {
        // Buscar o usuário pelo FID ou Spotify ID
        let user;
        if (typeof fidOrSpotifyId === 'number') {
            user = await getUserByFid(fidOrSpotifyId);
        } else {
            user = await getUserBySpotifyId(fidOrSpotifyId);
        }

        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        // Verificar se já existe um registro de top tracks para esse usuário e time range
        const { data: existingTracks, error: queryError } = await supabase
            .from('user_top_tracks')
            .select('id')
            .eq('user_id', user.id)
            .eq('time_range', timeRange)
            .single();

        if (queryError && queryError.code !== 'PGRST116') {
            console.error('Erro ao verificar top tracks:', queryError);
            throw queryError;
        }

        if (existingTracks) {
            // Atualizar registro existente
            const { data, error } = await supabase
                .from('user_top_tracks')
                .update({
                    tracks_data: tracksData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingTracks.id)
                .select()
                .single();

            if (error) {
                console.error('Erro ao atualizar top tracks:', error);
                throw error;
            }

            return data;
        } else {
            // Inserir novo registro
            const { data, error } = await supabase
                .from('user_top_tracks')
                .insert({
                    user_id: user.id,
                    spotify_id: user.spotify_id!,
                    fid: user.fid,
                    time_range: timeRange,
                    tracks_data: tracksData
                })
                .select()
                .single();

            if (error) {
                console.error('Erro ao inserir top tracks:', error);
                throw error;
            }

            return data;
        }
    } catch (error) {
        console.error('Erro em updateTopTracks:', error);
        throw error;
    }
}

// Função para obter as top tracks de um usuário
export async function getTopTracks(
    fidOrSpotifyId: number | string,
    timeRange: TimeRange,
    limit: number = 50
): Promise<SpotifyTrackData[]> {
    try {
        // Buscar o usuário pelo FID ou Spotify ID
        let user;
        if (typeof fidOrSpotifyId === 'number') {
            user = await getUserByFid(fidOrSpotifyId);
        } else {
            user = await getUserBySpotifyId(fidOrSpotifyId);
        }

        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        // Buscar as top tracks do usuário para o time range específico
        const { data, error } = await supabase
            .from('user_top_tracks')
            .select('tracks_data, updated_at')
            .eq('user_id', user.id)
            .eq('time_range', timeRange)
            .single();

        if (error) {
            if (error.code === 'PGRST116') { // Não encontrou resultados
                return [];
            }
            console.error('Erro ao obter top tracks:', error);
            throw error;
        }

        // Verificar se os dados estão atualizados (menos de 7 dias)
        const updatedAt = new Date(data.updated_at);
        const now = new Date();
        const diffDays = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);

        if (diffDays > 7) {
            console.warn('Dados de top tracks estão desatualizados');
        }

        // Retornar até o limite especificado
        return Array.isArray(data.tracks_data) ? data.tracks_data.slice(0, limit) : [];
    } catch (error) {
        console.error('Erro em getTopTracks:', error);
        return [];
    }
}

// Interface para os dados da prova TLSNotary
export interface TLSNotaryProof {
    id: string;
    userId: string;
    fid?: number;
    spotifyId?: string;
    endpoint: string;
    responseHash: string;
    timestamp: number;
    proofData: any;
}

// Interface para os dados verificáveis do Spotify
export interface VerifiableSpotifyData {
    userId: string;
    fid?: number;
    spotifyId?: string;
    proofId: string;
    timestamp: number;
    endpoint: string;
    data: any;
    proof: string;
}

// Função para armazenar uma prova TLSNotary
export async function storeProof(proof: TLSNotaryProof): Promise<string | null> {
    try {
        // Buscar o usuário pelo FID ou Spotify ID
        let user;
        if (proof.fid) {
            user = await getUserByFid(proof.fid);
        } else if (proof.spotifyId) {
            user = await getUserBySpotifyId(proof.spotifyId);
        } else {
            throw new Error('FID ou Spotify ID são necessários');
        }

        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        // Inserir a prova
        const { data, error } = await supabase
            .from('tlsnotary_proofs')
            .insert({
                proof_id: proof.id,
                user_id: user.id,
                spotify_id: user.spotify_id!,
                fid: user.fid,
                endpoint: proof.endpoint,
                proof_data: proof.proofData,
                response_hash: proof.responseHash,
                timestamp: proof.timestamp
            })
            .select('proof_id')
            .single();

        if (error) {
            console.error('Erro ao armazenar prova:', error);
            throw error;
        }

        return data.proof_id;
    } catch (error) {
        console.error('Erro em storeProof:', error);
        return null;
    }
}

// Função para armazenar dados verificáveis do Spotify
export async function storeVerifiableData(
    verifiableData: VerifiableSpotifyData
): Promise<string | null> {
    try {
        // Buscar o usuário pelo FID ou Spotify ID
        let user;
        if (verifiableData.fid) {
            user = await getUserByFid(verifiableData.fid);
        } else if (verifiableData.spotifyId) {
            user = await getUserBySpotifyId(verifiableData.spotifyId);
        } else {
            throw new Error('FID ou Spotify ID são necessários');
        }

        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        // Verificar se a prova existe
        const { data: proofExists, error: proofQueryError } = await supabase
            .from('tlsnotary_proofs')
            .select('proof_id')
            .eq('proof_id', verifiableData.proofId)
            .single();

        if (proofQueryError) {
            console.error('Erro ao verificar prova existente:', proofQueryError);
            throw new Error('Prova não encontrada');
        }

        // Inserir os dados verificáveis
        const { data, error } = await supabase
            .from('verifiable_spotify_data')
            .insert({
                proof_id: verifiableData.proofId,
                user_id: user.id,
                spotify_id: user.spotify_id!,
                fid: user.fid,
                endpoint: verifiableData.endpoint,
                data: verifiableData.data,
                timestamp: verifiableData.timestamp
            })
            .select('id')
            .single();

        if (error) {
            console.error('Erro ao armazenar dados verificáveis:', error);
            throw error;
        }

        return data.id;
    } catch (error) {
        console.error('Erro em storeVerifiableData:', error);
        return null;
    }
}

// Função para obter dados verificáveis por ID de prova
export async function getVerifiableDataByProofId(
    proofId: string
): Promise<VerifiableSpotifyData | null> {
    try {
        // Buscar os dados verificáveis
        const { data, error } = await supabase
            .from('verifiable_spotify_data')
            .select(`
        id,
        proof_id,
        user_id,
        spotify_id,
        fid,
        endpoint,
        data,
        timestamp,
        tlsnotary_proofs(proof_data)
      `)
            .eq('proof_id', proofId)
            .single();

        if (error) {
            console.error('Erro ao obter dados verificáveis:', error);
            throw error;
        }

        return {
            userId: data.user_id,
            fid: data.fid,
            spotifyId: data.spotify_id,
            proofId: data.proof_id,
            timestamp: data.timestamp,
            endpoint: data.endpoint,
            data: data.data,
            proof: JSON.stringify(data.tlsnotary_proofs.proof_data)
        };
    } catch (error) {
        console.error('Erro em getVerifiableDataByProofId:', error);
        return null;
    }
}

// Função para obter provas por usuário
export async function getProofsByUser(
    fidOrSpotifyId: number | string
): Promise<TLSNotaryProof[]> {
    try {
        // Buscar o usuário pelo FID ou Spotify ID
        let user;
        if (typeof fidOrSpotifyId === 'number') {
            user = await getUserByFid(fidOrSpotifyId);
        } else {
            user = await getUserBySpotifyId(fidOrSpotifyId);
        }

        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        // Buscar as provas do usuário
        const { data, error } = await supabase
            .from('tlsnotary_proofs')
            .select('*')
            .eq('user_id', user.id)
            .order('timestamp', { ascending: false });

        if (error) {
            console.error('Erro ao obter provas do usuário:', error);
            throw error;
        }

        return data.map(item => ({
            id: item.proof_id,
            userId: item.user_id,
            fid: item.fid,
            spotifyId: item.spotify_id,
            endpoint: item.endpoint,
            responseHash: item.response_hash,
            timestamp: item.timestamp,
            proofData: item.proof_data
        }));
    } catch (error) {
        console.error('Erro em getProofsByUser:', error);
        return [];
    }
}