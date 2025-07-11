// src/app/api/users/spotify-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "~/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { fids } = await request.json();

    if (!Array.isArray(fids) || fids.length === 0) {
      return NextResponse.json(
        { error: "Invalid or empty fids array" },
        { status: 400 }
      );
    }

    // Limit batch size for performance
    const maxBatchSize = 100;
    const limitedFids = fids.slice(0, maxBatchSize);

    // Query Supabase for users with both fid and spotify_id
    const { data, error } = await supabase
      .from("user_profiles")
      .select("fid, spotify_id")
      .in("fid", limitedFids)
      .not("spotify_id", "is", null);

    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    // Create a map of fid to Spotify connection status
    const spotifyStatus: Record<number, boolean> = {};
    
    // Initialize all requested FIDs as false (not connected)
    limitedFids.forEach(fid => {
      spotifyStatus[fid] = false;
    });
    
    // Update the ones that are connected
    data.forEach(user => {
      if (user.fid && user.spotify_id) {
        spotifyStatus[user.fid] = true;
      }
    });

    return NextResponse.json(spotifyStatus);

  } catch (error) {
    console.error("Error checking Spotify status:", error);
    return NextResponse.json(
      { error: "Failed to check Spotify status" },
      { status: 500 }
    );
  }
}
