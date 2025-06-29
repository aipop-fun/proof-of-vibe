/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
// @ts-nocheck


export type TimeRange = 'short_term' | 'medium_term' | 'long_term';


export interface SpotifyTrack {
    id: string;
    title: string;
    artist: string;
    album?: string;
    coverArt?: string;
    duration?: string;
    currentTime?: string;
    popularity?: number;
    uri?: string;
    progressMs?: number;
    durationMs?: number;
    isPlaying?: boolean;
    type?: string;
}

/**
 * Format duration in milliseconds to mm:ss format
 */
export function formatDuration(ms: number): string {
    if (!ms) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Get access token via refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}> {
    try {
        const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
 * Validate if the access token is active
 */
export async function validateToken(accessToken: string): Promise<boolean> {
    try {
        const response = await fetch('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        return response.ok;
    } catch (error) {
        console.error('Token validation error:', error);
        return false;
    }
}

/**
 * Get the currently playing track
 */
export async function getCurrentlyPlaying(accessToken: string): Promise<SpotifyTrack | null> {
    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        // If nothing is playing (204 No Content)
        if (response.status === 204) return null;

        // If there is an error in the request
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error (${response.status}): ${errorText}`);
        }

        const data = await response.json();

        // If there is no data or the item is null
        if (!data || !data.item) return null;

        // Format the track data
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
 * Get the user's top tracks for a specific time range
 */
export async function getTopTracks(accessToken: string, timeRange: TimeRange = 'medium_term'): Promise<SpotifyTrack[]> {
    try {
        const url = `https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=50`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error (${response.status}): ${errorText}`);
        }

        const data = await response.json();

        // Format each track in the response
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
 * Get the user's Spotify profile
 */
export async function getUserProfile(accessToken: string): Promise<any> {
    try {
        const response = await fetch('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` },
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


export async function getRecentlyPlayedTracks(accessToken: string): Promise<SpotifyTrack[] | null> {
    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=10', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
        });

        if (response.status === 204) return [];

        if (!response.ok) {
            throw new Error(`API Error (${response.status})`);
        }

        const data = await response.json();

        if (!data.items) return [];

        return data.items.map((item: any) => ({
            id: item.track.id,
            title: item.track.name,
            artist: item.track.artists.map((artist: any) => artist.name).join(', '),
            album: item.track.album.name,
            coverArt: item.track.album.images[0]?.url,
            duration: formatDuration(item.track.duration_ms),
            uri: item.track.uri,
            spotifyUrl: item.track.external_urls?.spotify,
            played_at: item.played_at,
        }));
    } catch (error) {
        console.error('Error fetching recent tracks:', error);
        throw error;
    }
}