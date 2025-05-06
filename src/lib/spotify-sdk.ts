/* eslint-disable  @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unused-vars,@typescript-eslint/ban-ts-comment */

"use client";

import { SpotifyApi, IAuthStrategy, AccessToken } from "@spotify/web-api-ts-sdk";
import { getSession } from "next-auth/react";

/**
 * Custom authentication strategy that works with NextAuth sessions
 * to provide Spotify API tokens.
 */
class NextAuthStrategy implements IAuthStrategy {
    /**
     * Get the access token from the NextAuth session
     */
    public async getAccessToken(): Promise<AccessToken> {
        try {
            const session = await getSession();

            // @ts-ignore
            if (!session?.accessToken) {
                console.error("No Spotify access token available in session");
                throw new Error("No Spotify access token available");
            }

            console.log("Retrieved access token from session");

            return {
                // @ts-ignore
                access_token: session.accessToken,
                token_type: "Bearer",
                // @ts-ignore
                expires_in: session.expiresAt
                    // @ts-ignore
                    ? Math.floor((session.expiresAt * 1000 - Date.now()) / 1000)
                    : 0,
                // @ts-ignorev
                refresh_token: session.refreshToken || "",
            };
        } catch (error) {
            console.error("Error getting access token:", error);
            throw error;
        }
    }

    /**
     * Get the existing token or create a new one
     */
    public getOrCreateAccessToken(): Promise<AccessToken> {
        return this.getAccessToken();
    }

    /**
     * Remove the access token (not needed for NextAuth implementation)
     */
    public removeAccessToken(): void {
        // Not needed with NextAuth as session management handles this
        console.debug("removeAccessToken called - handled by NextAuth");
    }

    /**
     * Set configuration (not needed for NextAuth implementation)
     */
    public setConfiguration(): void {
        // Not needed with NextAuth
        console.debug("setConfiguration called - handled by NextAuth");
    }
}

/**
 * Create an instance of the Spotify SDK with logging for debugging
 */
const spotifyApi = new SpotifyApi(
    new NextAuthStrategy(),
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

            // Handle rate limiting or authentication issues
            if (response.status === 401) {
                console.warn("Unauthorized Spotify API request - token may need refreshing");
            } else if (response.status === 429) {
                console.warn("Rate limited by Spotify API");
            }
        },
    }
);

/**
 * Helper function to safely make Spotify API calls with error handling
 * @param apiCall - The Spotify API function to call
 * @returns The result of the API call or null if there was an error
 */
export async function callSpotifyAPI<T>(
    apiCall: () => Promise<T>
): Promise<T | null> {
    try {
        return await apiCall();
    } catch (error) {
        // Handle Spotify API errors gracefully
        if (error instanceof Error) {
            console.error(`Spotify API error: ${error.message}`);

            // Check for specific error types
            if (error.message.includes("access token")) {
                console.warn("Spotify access token issue - try refreshing the page");
            } else if (error.message.includes("rate limit")) {
                console.warn("Spotify API rate limit reached - try again shortly");
            }
        } else {
            console.error("Unknown Spotify API error:", error);
        }

        return null;
    }
}

export default spotifyApi;