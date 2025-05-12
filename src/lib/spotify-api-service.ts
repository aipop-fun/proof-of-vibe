/* eslint-disable   @typescript-eslint/no-unused-vars, @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
// @ts-nocheck

import { SpotifyTrack, TimeRange } from './stores/spotifyDataStore';

/**
 * Formata a duração em milissegundos para o formato mm:ss
 */
export function formatDuration(ms: number): string {
    if (!ms) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Obtém o token de acesso via refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}> {
    try {
        const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to refresh token');
        }

        const data = await response.json();

        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token || refreshToken,
            expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
        };
    } catch (error) {
        console.error('Error refreshing token:', error);
        throw error;
    }
}

/**
 * Valida se o token de acesso está ativo
 */
export async function validateToken(accessToken: string): Promise<boolean> {
    try {
        const response = await fetch('https://api.spotify.com/v1/me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        return response.ok;
    } catch (error) {
        console.error('Token validation error:', error);
        return false;
    }
}

/**
 * Obtém a faixa em reprodução atualmente
 */
export async function getCurrentlyPlaying(accessToken: string): Promise<SpotifyTrack | null> {
    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        // Se não houver nada tocando (204 No Content)
        if (response.status === 204) {
            return null;
        }

        // Se houver um erro na requisição
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error (${response.status}): ${errorText}`);
        }

        const data = await response.json();

        // Se não houver dados ou o item for nulo
        if (!data || !data.item) {
            return null;
        }

        // Formatar os dados da faixa
        const track = data.item;
        return {
            id: track.id,
            title: track.name,
            artist: track.artists.map((artist: any) => artist.name).join(', '),
            album: track.album.name,
            coverArt: track.album.images[0]?.url,
            duration: formatDuration(track.duration_ms),
            currentTime: formatDuration(data.progress_ms || 0),
            type: track.type,
            uri: track.uri,
            isPlaying: data.is_playing,
            progressMs: data.progress_ms,
            durationMs: track.duration_ms
        };
    } catch (error) {
        console.error('Error fetching currently playing:', error);
        throw error;
    }
}

/**
 * Obtém as top tracks do usuário para um período específico
 */
export async function getTopTracks(accessToken: string, timeRange: TimeRange = 'medium_term'): Promise<SpotifyTrack[]> {
    try {
        const response = await fetch(
            `https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=50`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error (${response.status}): ${errorText}`);
        }

        const data = await response.json();

        // Formatar cada faixa retornada
        return data.items.map((track: any) => ({
            id: track.id,
            title: track.name,
            artist: track.artists.map((artist: any) => artist.name).join(', '),
            album: track.album.name,
            coverArt: track.album.images[0]?.url,
            duration: formatDuration(track.duration_ms),
            popularity: track.popularity,
            uri: track.uri,
            durationMs: track.duration_ms
        }));
    } catch (error) {
        console.error(`Error fetching top tracks (${timeRange}):`, error);
        throw error;
    }
}

/**
 * Obtém o perfil do usuário do Spotify
 */
export async function getUserProfile(accessToken: string): Promise<any> {
    try {
        const response = await fetch('https://api.spotify.com/v1/me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error (${response.status}): ${errorText}`);
        }

        return response.json();
    } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
    }
}