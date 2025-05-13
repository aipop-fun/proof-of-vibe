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
    // Note: fetchUserFollowers uses an object parameter with fid, limit, cursor properties
    const response = await client.fetchUserFollowers({
      fid,
      limit,
      cursor
    });

    // Transform the response to our expected format
    const users = response.result.users.map(user => ({
      fid: user.fid,
      username: user.username || `user${user.fid}`,
      displayName: user.displayName || user.username || `User ${user.fid}`,
      pfp: user.pfp?.url || null,
      followerCount: user.followerCount,
      followingCount: user.followingCount,
      lastActive: user.timestamp ? new Date(user.timestamp).getTime() : undefined,
      isFollower: true
    }));

    // Check if cursor exists in response before trying to access it
    const nextCursor = response.result.next?.cursor || null;

    return NextResponse.json({
      users,
      nextCursor,
      total: response.result.count || users.length
    });

  } catch (error) {
    console.error("Error fetching followers:", error);
    return NextResponse.json(
      { error: "Failed to fetch followers", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}