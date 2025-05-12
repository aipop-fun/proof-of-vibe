
import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import { formatDuration } from './utils';

/**
 * Custom authentication strategy that uses a provided access token
 */
class TokenAuthStrategy {
    private accessToken: string;

    constructor(accessToken: string) {
        this.accessToken = accessToken;
    }

    public async getOrCreateAccessToken() {
        return {
            access_token: this.accessToken,
            token_type: "Bearer",
            expires_in: 3600, // Assume an hour of validity
            refresh_token: "", // Not needed for this strategy
        };
    }

    public async getAccessToken() {
        return this.getOrCreateAccessToken();
    }

    public removeAccessToken() {
        // No-op for this implementation
    }
}

/**
 * Initializes a Spotify API client with the provided access token
 */
export function initSpotifyClient(accessToken: string): SpotifyApi {
    if (!accessToken) {
        throw new Error("Access token is required to initialize Spotify client");
    }

    return SpotifyApi.withAccessToken(accessToken);
}

/**
 * Get the user's currently playing track
 */
export async function getCurrentlyPlaying(accessToken: string) {
    try {
        const spotify = initSpotifyClient(accessToken);
        const response = await spotify.player.getCurrentlyPlayingTrack();

        // No track currently playing
        if (!response || !response.item || !response.is_playing) {
            return null;
        }

        // Format the track data
        const track = response.item;
        return {
            id: track.id,
            title: track.name,
            artist: track.artists.map(artist => artist.name).join(', '),
            album: track.album.name,
            coverArt: track.album.images[0]?.url,
            duration: formatDuration(track.duration_ms),
            currentTime: formatDuration(response.progress_ms || 0),
            type: track.type,
            uri: track.uri,
            isPlaying: response.is_playing,
            progressMs: response.progress_ms,
            durationMs: track.duration_ms
        };
    } catch (error) {
        console.error('Error fetching currently playing track:', error);
        throw error;
    }
}

/**
 * Get the user's top tracks for a specific time range
 */
export async function getTopTracks(accessToken: string, timeRange = 'medium_term') {
    try {
        const spotify = initSpotifyClient(accessToken);
        const response = await spotify.currentUser.topItems('tracks', timeRange as any, 50);

        return response.items.map(track => ({
            id: track.id,
            title: track.name,
            artist: track.artists.map(artist => artist.name).join(', '),
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
 * Get the user's Spotify profile information
 */
export async function getUserProfile(accessToken: string) {
    try {
        const spotify = initSpotifyClient(accessToken);
        return await spotify.currentUser.profile();
    } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
    }
}

/**
 * Check if the access token is valid by making a simple API request
 */
export async function validateToken(accessToken: string): Promise<boolean> {
    try {
        const spotify = initSpotifyClient(accessToken);
        await spotify.currentUser.profile();
        return true;
    } catch (error) {
        console.error('Token validation failed:', error);
        return false;
    }
}

/**
 * Refresh an expired access token
 * This requires a server-side implementation with client credentials
 */
export async function refreshAccessToken(refreshToken: string) {
    try {
        const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
            throw new Error('Failed to refresh token');
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