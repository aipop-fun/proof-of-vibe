import { NextRequest, NextResponse } from "next/server";
import { getNeynarClient } from "~/lib/neynar";
import { cache } from "~/lib/cache";

// Define types for better type safety
interface NeynarUser {
  fid: number;
  username?: string;
  displayName?: string;
  display_name?: string;
  pfpUrl?: string;
  pfp_url?: string;
  avatar?: string;
  bio?: string;
  followerCount?: number;
  followers?: number;
  followingCount?: number;
  following?: number;
  verifiedAddresses?: {
    eth_addresses: string[];
    sol_addresses: string[];
  };
  lastActiveTimestamp?: number;
  lastActive?: number;
}

interface ApiResponse {
  users: ResponseUser[];
  error?: string;
  cached?: boolean;
}

interface ResponseUser {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string | null;
  bio: string;
  followerCount: number;
  followingCount: number;
  verifiedAddresses: {
    eth_addresses: string[];
    sol_addresses: string[];
  };
  lastActiveTimestamp: number | null;
}

/**
 * API route for searching Farcaster users through Neynar
 */
export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Validate query parameter
    if (!query?.trim()) {
      return NextResponse.json<ApiResponse>(
        { error: 'Query parameter is required', users: [] },
        { status: 400 }
      );
    }

    // Normalize query and create cache key
    const normalizedQuery = query.trim().toLowerCase();
    const cacheKey = `neynar_search:${normalizedQuery}:${limit}`;

    // Check cache first
    const cachedResults = await cache.get<ResponseUser[]>(cacheKey);
    if (cachedResults) {
      return NextResponse.json<ApiResponse>(
        { users: cachedResults, cached: true },
        {
          status: 200,
          headers: { 'Cache-Control': 'max-age=300, s-maxage=600, stale-while-revalidate=86400' }
        }
      );
    }

    // Get API key
    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) {
      throw new Error('NEYNAR_API_KEY not configured');
    }

    // Determine search strategy based on query type
    const isFid = /^\d+$/.test(normalizedQuery);
    let users: ResponseUser[] = [];

    if (isFid) {
      // Search by FID
      const fid = parseInt(normalizedQuery, 10);
      const response = await fetch(`https://api.neynar.com/v2/farcaster/user?fid=${fid}`, {
        headers: { 'accept': 'application/json', 'api_key': apiKey }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.result?.user) {
          users = [mapNeynarUserToResponse(data.result.user)];
        }
      }
    } else {
      // Search by username/display name
      const client = getNeynarClient();
      const searchResult = await client.searchUser({ q: normalizedQuery, limit });

      if (searchResult.result?.users) {
        users = searchResult.result.users.map(mapNeynarUserToResponse);
      }
    }

    // Cache results
    await cache.set(cacheKey, users, 300);

    return NextResponse.json<ApiResponse>(
      { users },
      { headers: { 'Cache-Control': 'max-age=300, s-maxage=600, stale-while-revalidate=86400' } }
    );
  } catch (error) {
    // Handle rate limits
    if (error instanceof Error && error.message.includes('rate limit')) {
      return NextResponse.json<ApiResponse>(
        { error: 'Rate limit exceeded, please try again later', users: [] },
        { status: 429 }
      );
    }

    // Handle general errors
    return NextResponse.json<ApiResponse>(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred', users: [] },
      { status: 500 }
    );
  }
}

/**
 * Maps Neynar user to a consistent response format
 */
function mapNeynarUserToResponse(user: NeynarUser): ResponseUser {
  return {
    fid: user.fid,
    username: user.username || `user${user.fid}`,
    displayName: user.displayName || user.display_name || user.username || `User ${user.fid}`,
    pfpUrl: user.pfpUrl || user.pfp_url || user.avatar || null,
    bio: user.bio || '',
    followerCount: user.followerCount || user.followers || 0,
    followingCount: user.followingCount || user.following || 0,
    verifiedAddresses: user.verifiedAddresses || { eth_addresses: [], sol_addresses: [] },
    lastActiveTimestamp: user.lastActiveTimestamp || user.lastActive || null
  };
}