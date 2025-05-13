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

    // Get Neynar client
    const client = getNeynarClient();

    // Fetch followers using Neynar SDK
    const result = await client.fetchUserFollowers({
      fid,
      limit,
      cursor
    });

    // The actual structure is different - each item in the 'users' array has a 'user' property
    // that contains the actual user data
    const transformedUsers = result.users.map(item => {
      const user = item.user;
      return {
        fid: user.fid,
        username: user.username || `user${user.fid}`,
        displayName: user.display_name || user.username || `User ${user.fid}`,
        pfp: user.pfp_url || null,
        followerCount: user.follower_count,
        followingCount: user.following_count,
        lastActive: user.last_active_ts ? new Date(user.last_active_ts).getTime() : undefined,
        isFollower: true
      };
    });

    return NextResponse.json({
      users: transformedUsers,
      nextCursor: result.next?.cursor || null,
      total: transformedUsers.length
    });

  } catch (error) {
    console.error("Error fetching followers:", error);
    return NextResponse.json(
      { error: "Failed to fetch followers" },
      { status: 500 }
    );
  }
}