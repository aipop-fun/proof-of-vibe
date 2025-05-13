/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
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

    // Get Neynar client
    const client = getNeynarClient();

    // Determine if query is a FID (number)
    const isFid = /^\d+$/.test(query);

    if (isFid) {
      // Try to fetch user by FID
      try {
        const response = await client.fetchBulkUsers({
          fids: [parseInt(query)]
        });

        if (response.users.length > 0) {
          const user = response.users[0];
          
          return NextResponse.json({
            users: [{
              fid: user.fid,
              username: user.username || `user${user.fid}`,
              displayName: user.display_name || user.username || `User ${user.fid}`,
              pfp: user.pfp_url || null,
              followerCount: user.follower_count,
              followingCount: user.following_count
            }],
            total: 1
          });
        }
      } catch (fidError) {
        console.error("Error searching by FID:", fidError);
        // Continue with username search if FID search fails
      }
    }

    // Search by username
    const response = await client.searchUser({
      q: query,
      limit
    });

    // Transform the response to our expected format
    const users = response.result.users.map(user => ({
      fid: user.fid,
      username: user.username || `user${user.fid}`,
      displayName: user.displayName || user.username || `User ${user.fid}`,
      pfp: user.pfp?.url || null,
      followerCount: user.followerCount,
      followingCount: user.followingCount,
      lastActive: user.timestamp ? new Date(user.timestamp).getTime() : undefined
    }));

    return NextResponse.json({
      users,
      total: users.length
    });

  } catch (error) {
    console.error("Error searching users:", error);
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}
