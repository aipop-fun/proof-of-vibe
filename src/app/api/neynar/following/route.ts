/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getNeynarClient } from "~/lib/neynar";

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const fidParam = searchParams.get("fid");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const cursor = searchParams.get("cursor") || undefined;

    if (!fidParam) {
      return NextResponse.json(
        { error: "FID parameter is required" },
        { status: 400 }
      );
    }

    const fid = parseInt(fidParam, 10);
    if (isNaN(fid)) {
      return NextResponse.json(
        { error: "Invalid FID parameter" },
        { status: 400 }
      );
    }

    // Get API key for direct API call
    const apiKey = process.env.NEYNAR_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "NEYNAR_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Use the correct URL format for the following endpoint
    let url = `https://api.neynar.com/v2/farcaster/following?fid=${fid}&limit=${limit}`;
    if (cursor) {
      url += `&cursor=${encodeURIComponent(cursor)}`;
    }

    // Make the request
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api_key': apiKey
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Neynar API error:', response.status, errorText);
      return NextResponse.json(
        { error: `Neynar API returned ${response.status}` },
        { status: response.status }
      );
    }

    // Parse the JSON response
    const data = await response.json();

    // Check if data has the right structure
    if (!data || !data.users || !Array.isArray(data.users)) {
      console.error('Unexpected API response structure:', JSON.stringify(data, null, 2));
      return NextResponse.json(
        { error: "Unexpected API response structure" },
        { status: 500 }
      );
    }

    // Transform user data based on the observed structure where each element
    // in users array has 'object' and 'user' properties (similar to followers)
    const transformedUsers = data.users.map(item => {
      const user = item.user;
      return {
        fid: user.fid,
        username: user.username || `user${user.fid}`,
        displayName: user.display_name || user.username || `User ${user.fid}`,
        pfp: user.pfp_url || null,
        followerCount: user.follower_count,
        followingCount: user.following_count,
        lastActive: user.last_active_ts ? new Date(user.last_active_ts).getTime() : undefined,
        isFollowing: true
      };
    });

    // Get next cursor from the correct location
    const nextCursor = data.next?.cursor || null;

    // Return the processed data
    return NextResponse.json({
      users: transformedUsers,
      nextCursor,
      total: transformedUsers.length
    });

  } catch (error) {
    console.error("Error fetching following:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch following",
        details: error.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}