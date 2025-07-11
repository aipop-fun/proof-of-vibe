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
    if (!ms || ms <= 0) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Enhanced error handling for Spotify API responses
 */
function handleSpotifyError(response: Response, data?: any): Error {
    let errorMessage = `Spotify API Error (${response.status})`;

    if (data?.error) {
        errorMessage += `: ${data.error.message || data.error}`;

        // Add specific error context
        switch (response.status) {
            case 401:
                errorMessage = 'UNAUTHORIZED: Spotify token expired or invalid';
                break;
            case 403:
                errorMessage = 'FORBIDDEN: Spotify Premium required or insufficient permissions';
                break;
            case 429:
                errorMessage = 'RATE_LIMITED: Too many requests to Spotify API';
                break;
            case 502:
            case 503:
                errorMessage = 'SPOTIFY_DOWN: Spotify service temporarily unavailable';
                break;
            case 404:
                errorMessage = 'NOT_FOUND: Requested resource not found';
                break;
            default:
                if (response.status >= 500) {
                    errorMessage = 'SPOTIFY_DOWN: Spotify server error';
                }
        }
    }

    return new Error(errorMessage);
}

/**
 * Make authenticated request to Spotify API with enhanced error handling
 */
async function makeSpotifyRequest(url: string, accessToken: string): Promise<any> {
    console.log(`Making Spotify API request to: ${url.replace('https://api.spotify.com/v1', '')}`);

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        console.log(`Spotify API response: ${response.status} ${response.statusText}`);

        // Handle 204 No Content (common for currently playing when nothing is playing)
        if (response.status === 204) {
            console.log('Spotify API returned 204 No Content');
            return null;
        }

        // Try to parse response body
        let data = null;
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
            try {
                data = await response.json();
            } catch (parseError) {
                console.error('Failed to parse Spotify API response as JSON:', parseError);
                if (!response.ok) {
                    throw handleSpotifyError(response);
                }
            }
        }

        // Handle error responses
        if (!response.ok) {
            console.error('Spotify API error response:', { status: response.status, data });
            throw handleSpotifyError(response, data);
        }

        return data;
    } catch (error) {
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error('NETWORK_ERROR: Failed to connect to Spotify API');
        }
        throw error;
    }
}

/**
 * Get access token via refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}> {
    console.log('Refreshing Spotify access token...');

    try {
        const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Token refresh failed:', errorData);
            throw new Error(errorData.error || 'Failed to refresh token');
        }

        const data = await response.json();
        console.log('Token refreshed successfully');

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
        console.log('Validating Spotify access token...');
        const response = await fetch('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        const isValid = response.ok;
        console.log(`Token validation result: ${isValid ? 'valid' : 'invalid'}`);
        return isValid;
    } catch (error) {
        console.error('Token validation error:', error);
        return false;
    }
}

/**
 * Get the currently playing track
 */
export async function getCurrentlyPlaying(accessToken: string): Promise<SpotifyTrack | null> {
    console.log('Fetching currently playing track...');

    try {
        const data = await makeSpotifyRequest(
            'https://api.spotify.com/v1/me/player/currently-playing',
            accessToken
        );

        // No data means nothing is currently playing
        if (!data || !data.item) {
            console.log('No track currently playing');
            return null;
        }

        // Format the track data
        const track = data.item;
        const formattedTrack: SpotifyTrack = {
            id: track.id,
            title: track.name,
            artist: track.artists.map((artist: any) => artist.name).join(', '),
            album: track.album?.name,
            coverArt: track.album?.images?.[0]?.url,
            duration: formatDuration(track.duration_ms),
            currentTime: formatDuration(data.progress_ms || 0),
            type: track.type,
            uri: track.uri,
            isPlaying: data.is_playing,
            progressMs: data.progress_ms,
            durationMs: track.duration_ms
        };

        console.log(`Currently playing: ${formattedTrack.title} by ${formattedTrack.artist}`);
        return formattedTrack;
    } catch (error) {
        console.error('Error fetching currently playing:', error);
        throw error;
    }
}

/**
 * Get the user's top tracks for a specific time range
 */
export async function getTopTracks(accessToken: string, timeRange: TimeRange = 'medium_term'): Promise<SpotifyTrack[]> {
    console.log(`Fetching top tracks for time range: ${timeRange}`);

    try {
        const data = await makeSpotifyRequest(
            `https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=50`,
            accessToken
        );

        if (!data || !data.items) {
            console.log('No top tracks data received');
            return [];
        }

        // Format each track in the response
        const tracks = data.items.map((track: any) => ({
            id: track.id,
            title: track.name,
            artist: track.artists.map((artist: any) => artist.name).join(', '),
            album: track.album?.name,
            coverArt: track.album?.images?.[0]?.url,
            duration: formatDuration(track.duration_ms),
            popularity: track.popularity,
            uri: track.uri,
            durationMs: track.duration_ms
        }));

        console.log(`Fetched ${tracks.length} top tracks for ${timeRange}`);
        return tracks;
    } catch (error) {
        console.error(`Error fetching top tracks (${timeRange}):`, error);
        throw error;
    }
}

/**
 * Get the user's Spotify profile
 */
export async function getUserProfile(accessToken: string): Promise<any> {
    console.log('Fetching Spotify user profile...');

    try {
        const data = await makeSpotifyRequest(
            'https://api.spotify.com/v1/me',
            accessToken
        );

        if (data) {
            console.log(`Fetched profile for user: ${data.display_name || data.id}`);
        }

        return data;
    } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
    }
}

/**
 * Get the user's recently played tracks
 */
export async function getRecentlyPlayedTracks(accessToken: string): Promise<SpotifyTrack[] | null> {
    console.log('Fetching recently played tracks...');

    try {
        const data = await makeSpotifyRequest(
            'https://api.spotify.com/v1/me/player/recently-played?limit=20',
            accessToken
        );

        if (!data || !data.items) {
            console.log('No recently played tracks found');
            return [];
        }

        const tracks = data.items.map((item: any) => ({
            id: item.track.id,
            title: item.track.name,
            artist: item.track.artists.map((artist: any) => artist.name).join(', '),
            album: item.track.album?.name,
            coverArt: item.track.album?.images?.[0]?.url,
            duration: formatDuration(item.track.duration_ms),
            uri: item.track.uri,
            durationMs: item.track.duration_ms,
            played_at: item.played_at,
        }));

        console.log(`Fetched ${tracks.length} recently played tracks`);
        return tracks;
    } catch (error) {
        console.error('Error fetching recent tracks:', error);
        throw error;
    }
}

/**
 * Check if user has an active Spotify session
 */
export async function checkSpotifyPlaybackState(accessToken: string): Promise<{
    hasActiveDevice: boolean;
    isPlaying: boolean;
    deviceName?: string;
}> {
    console.log('Checking Spotify playback state...');

    try {
        const data = await makeSpotifyRequest(
            'https://api.spotify.com/v1/me/player',
            accessToken
        );

        if (!data) {
            return { hasActiveDevice: false, isPlaying: false };
        }

        return {
            hasActiveDevice: !!data.device,
            isPlaying: data.is_playing || false,
            deviceName: data.device?.name
        };
    } catch (error) {
        console.error('Error checking playback state:', error);
        return { hasActiveDevice: false, isPlaying: false };
    }
}