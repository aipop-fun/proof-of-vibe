/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { SpotifyApi, IAuthStrategy, AccessToken } from "@spotify/web-api-ts-sdk";

/**
 * Custom authentication strategy that works with a provided access token
 */
class TokenAuthStrategy implements IAuthStrategy {
    private token: string;

    constructor(token: string) {
        this.token = token;
    }

    /**
     * Get the access token
     */
    public async getAccessToken(): Promise<AccessToken> {
        return {
            access_token: this.token,
            token_type: "Bearer",
            expires_in: 3600, // Assume token is valid for an hour
            refresh_token: "",
        };
    }

    /**
     * Get the existing token or create a new one
     */
    public getOrCreateAccessToken(): Promise<AccessToken> {
        return this.getAccessToken();
    }

    /**
     * Remove the access token (not needed for this implementation)
     */
    public removeAccessToken(): void {
        // Not needed for this implementation
    }

    /**
     * Set configuration (not needed for this implementation)
     */
    public setConfiguration(): void {
        // Not needed for this implementation
    }
}

/**
 * Create a Spotify API client with a provided access token
 */
export function getSpotifyApiClient(accessToken: string): SpotifyApi {
    return new SpotifyApi(
        new TokenAuthStrategy(accessToken),
        {
            beforeRequest: (url, options) => {
                // Log API requests in development
                if (process.env.NODE_ENV === 'development') {
                    console.debug(`Making Spotify API request to: ${url}`);
                }
            },
            afterRequest: (url, options, response) => {
                // Log API responses in development
                if (process.env.NODE_ENV === 'development') {
                    console.debug(`Spotify API response status: ${response.status}`);
                }
            },
        }
    );
}

/**
 * Format track data from Spotify API for use in the application
 */
export function formatTrackData(item: any) {
    return {
        id: item.id,
        title: item.name,
        artist: item.artists.map((artist: any) => artist.name).join(', '),
        album: item.album?.name,
        coverArt: item.album?.images[0]?.url,
        duration: formatDuration(item.duration_ms),
        popularity: item.popularity
    };
}

/**
 * Format milliseconds to mm:ss format
 */
export function formatDuration(ms: number): string {
    if (!ms) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}