// src/app/api/users/tracks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "~/lib/supabase";
import { getSpotifyApiClient } from "~/lib/spotify-api";

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const fidParam = searchParams.get("fid");
    
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
    
    // Look up user in database to get Spotify ID
    const { data: user, error: userError } = await supabase
      .from("user_profiles")
      .select("spotify_id, access_token")
      .eq("fid", fid)
      .single();
    
    if (userError || !user?.spotify_id || !user?.access_token) {
      return NextResponse.json(
        { error: "User not found or not connected to Spotify" },
        { status: 404 }
      );
    }
    
    // Initialize Spotify API client with the user's token
    const spotifyClient = getSpotifyApiClient(user.access_token);
    
    try {
      // Fetch user's top tracks from Spotify API
      const response = await spotifyClient.currentUser.topItems("tracks", "medium_term");
      
      // Format the response for our frontend
      const tracks = response.items.map(track => ({
        id: track.id,
        title: track.name,
        artist: track.artists.map(artist => artist.name).join(", "),
        album: track.album.name,
        coverArt: track.album.images[0]?.url,
        popularity: track.popularity,
        previewUrl: track.preview_url,
        href: track.external_urls.spotify
      }));
      
      return NextResponse.json({
        success: true,
        tracks
      });
    } catch (spotifyError) {
      console.error("Error fetching Spotify data:", spotifyError);
      
      return NextResponse.json(
        { 
          error: "Failed to fetch tracks from Spotify",
          details: spotifyError instanceof Error ? spotifyError.message : "Unknown error"
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in tracks endpoint:", error);
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
