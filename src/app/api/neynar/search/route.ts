/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// src/app/api/neynar/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getNeynarClient } from "~/lib/neynar";

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query");
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 }
      );
    }

    // Get Neynar API key for direct API calls
    const apiKey = process.env.NEYNAR_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "NEYNAR_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Determine if query is a FID (number)
    const isFid = /^\d+$/.test(query);

    if (isFid) {
      // Try to fetch user by FID using direct API call
      try {
        const fid = parseInt(query, 10);

        const response = await fetch(`https://api.neynar.com/v2/farcaster/user?fid=${fid}`, {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'api_key': apiKey
          }
        });

        if (!response.ok) {
          throw new Error(`Neynar API returned ${response.status}`);
        }

        const data = await response.json();

        if (data.result && data.result.user) {
          const user = data.result.user;

          return NextResponse.json({
            users: [{
              fid: user.fid,
              username: user.username || `user${user.fid}`,
              displayName: user.display_name || user.username || `User ${user.fid}`,
              pfp: user.pfp_url || null,
              followerCount: user.follower_count || 0,
              followingCount: user.following_count || 0
            }],
            total: 1
          });
        } else {
          // No user found with this FID, return empty result
          return NextResponse.json({
            users: [],
            total: 0
          });
        }
      } catch (fidError) {
        console.error("Error searching by FID:", fidError);
        // Continue with username search if FID search fails
      }
    }

    // Search by username using direct API call
    try {
      const searchUrl = `https://api.neynar.com/v2/farcaster/user/search?q=${encodeURIComponent(query)}&limit=${limit}`;

      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'api_key': apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Neynar API returned ${response.status}`);
      }

      const data = await response.json();

      // Check if we have users in the result
      if (!data.result || !data.result.users || !Array.isArray(data.result.users)) {
        console.error('Unexpected API response structure:', data);
        return NextResponse.json({
          users: [],
          total: 0
        });
      }

      // Transform the response to our expected format
      const users = data.result.users.map(user => ({
        fid: user.fid,
        username: user.username || `user${user.fid}`,
        displayName: user.display_name || user.username || `User ${user.fid}`,
        pfp: user.pfp_url || null,
        followerCount: user.follower_count || 0,
        followingCount: user.following_count || 0,
        lastActive: user.last_active_ts ? new Date(user.last_active_ts).getTime() : undefined
      }));

      return NextResponse.json({
        users,
        total: users.length
      });

    } catch (searchError) {
      console.error("Error searching users by name:", searchError);
      return NextResponse.json(
        { error: "Failed to search users by name", details: searchError.message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error searching users:", error);
    return NextResponse.json(
      { error: "Failed to search users", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}