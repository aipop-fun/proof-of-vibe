/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any*/
// @ts-nocheck
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";

// Environment variables
const API_KEY = process.env.NEYNAR_API_KEY;
const CLIENT_ID = process.env.NEYNAR_CLIENT_ID;
const BASE_URL = process.env.NEYNAR_BASE_URL || "https://api.neynar.com/v2";

/**
 * Creates and returns a Neynar API client instance
 */
export function getNeynarClient(): NeynarAPIClient {
  if (!API_KEY) {
    throw new Error("NEYNAR_API_KEY environment variable is not set");
  }

  const config = new Configuration({ apiKey: API_KEY });
  return new NeynarAPIClient(config);
}

/**
 * Common error handler for Neynar API requests
 */
export const handleNeynarError = (error: unknown): { state: string; error: string } => {
  // Safe error checking without instanceof
  if (error && typeof error === 'object' && 'message' in error) {
    const errorMessage = (error as { message: string }).message;

    // Check if this is a rate limit error
    if (errorMessage.includes("rate limit") || errorMessage.includes("429")) {
      return {
        state: "rate_limit",
        error: "Rate limited by Neynar API"
      };
    }

    return {
      state: "error",
      error: errorMessage
    };
  }

  return {
    state: "error",
    error: typeof error === 'string' ? error : "Unknown error"
  };
};

/**
 * Make a Neynar API request with proper error handling
 */
export const fetchNeynarApi = async (
  endpoint: string,
  options: RequestInit = {},
  revalidate: number = 300
): Promise<any> => {
  try {
    if (!API_KEY) {
      throw new Error("NEYNAR_API_KEY environment variable is not set");
    }

    const url = `${BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'X-API-KEY': API_KEY,
        ...options.headers,
      },
      next: {
        revalidate,
      },
    });

    if (!response.ok) {
      throw new Error(`Neynar API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Neynar API request failed:`, error);
    throw error;
  }
};

/**
 * Normalize user data from different Neynar API responses
 */
export const normalizeNeynarUser = (user: any): any => ({
  fid: user.fid,
  username: user.username,
  display_name: user.display_name || user.displayName,
  pfp_url: user.pfp_url || user.pfpUrl,
  bio: user.profile?.bio?.text || user.bio,
  follower_count: user.follower_count || user.followerCount,
  following_count: user.following_count || user.followingCount,
  verified_addresses: user.verified_addresses || user.verifiedAddresses,
  custody_address: user.custody_address || user.custodyAddress,
});

/**
 * Search for users by query
 */
export const searchUsers = async (query: string): Promise<any[]> => {
  try {
    // Check if query is a FID (numeric)
    const isFid = /^\d+$/.test(query.trim());

    if (isFid) {
      // Direct FID lookup
      const fid = parseInt(query.trim());
      const data = await fetchNeynarApi(`/farcaster/user/by-fid?fid=${fid}`);
      return [normalizeNeynarUser(data.user)];
    }

    // Search for users by name/username
    const data = await fetchNeynarApi(
      `/farcaster/user/search?q=${encodeURIComponent(query)}&limit=20`
    );

    // Normalize the search results
    return (data.result?.users || []).map(normalizeNeynarUser);
  } catch (error) {
    console.error('Error searching users:', error);

    // Safe error checking
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = (error as { message: string }).message;
      if (errorMessage.includes('404')) {
        return [];
      }
    }

    throw error;
  }
};

/**
 * Sends a notification through Neynar's notification system
 */
export async function sendNeynarFrameNotification({
  fid,
  title,
  body,
}: {
  fid: number;
  title: string;
  body: string;
}) {
  try {
    const client = getNeynarClient();

    if (!CLIENT_ID) {
      throw new Error("NEYNAR_CLIENT_ID environment variable is not set");
    }

    // Send notification via Neynar API
    const response = await client.publishNotification({
      clientId: CLIENT_ID,
      fid,
      title,
      body
    });

    return response && response.success
      ? { state: "success" }
      : { state: "error", error: "Failed to send notification" };
  } catch (error) {
    return handleNeynarError(error);
  }
}