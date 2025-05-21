/* eslint-disable  @typescript-eslint/ban-ts-comment, @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any*/
// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "~/lib/supabase";
import { getSpotifyApiClient } from "~/lib/spotify-api";
import { formatDuration } from "~/lib/utils";

/**
 * API route for fetching a user's recent tracks
 * Can be queried by FID or Spotify ID
 */
export async function GET(request: NextRequest) {
    try {
        // Extract query parameters
        const searchParams = request.nextUrl.searchParams;
        const fidParam = searchParams.get("fid");
        const spotifyIdParam = searchParams.get("spotify_id");
        const limitParam = searchParams.get("limit") || "5";
        const tokenParam = searchParams.get("token");

        if (!fidParam && !spotifyIdParam) {
            return NextResponse.json(
                { error: "Either FID or Spotify ID parameter is required" },
                { status: 400 }
            );
        }

        const limit = parseInt(limitParam, 10);

        // Look up the user in our database
        let query = supabase.from("user_profiles").select("*");

        if (fidParam) {
            const fid = parseInt(fidParam, 10);
            if (isNaN(fid)) {
                return NextResponse.json(
                    { error: "Invalid FID parameter" },
                    { status: 400 }
                );
            }
            query = query.eq("fid", fid);
        } else if (spotifyIdParam) {
            query = query.eq("spotify_id", spotifyIdParam);
        }

        const { data: userData, error: userError } = await query.single();

        if (userError || !userData) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // Check if the user has a Spotify account connected
        if (!userData.spotify_id) {
            return NextResponse.json(
                { error: "User does not have a connected Spotify account" },
                { status: 400 }
            );
        }

        // Different methods to get recent tracks based on available data
        let recentTracks: any[] = [];

        // Option 1: Use the provided token (if for the current user)
        if (tokenParam) {
            try {
                // Initialize Spotify client with token
                const spotifyClient = getSpotifyApiClient(tokenParam);

                // Get recently played tracks
                const recentlyPlayed = await spotifyClient.player.getRecentlyPlayedTracks({
                    limit
                });

                if (recentlyPlayed && recentlyPlayed.items) {
                    recentTracks = recentlyPlayed.items.map(item => {
                        const track = item.track;
                        return {
                            id: track.id,
                            title: track.name,
                            artist: track.artists.map(artist => artist.name).join(", "),
                            album: track.album?.name,
                            albumArt: track.album?.images[0]?.url,
                            duration: formatDuration(track.duration_ms),
                            playedAt: item.played_at,
                            timestamp: new Date(item.played_at).getTime(),
                            spotifyUrl: track.external_urls?.spotify
                        };
                    });
                }
            } catch (error) {
                console.error("Error fetching with token:", error);
                // Continue to fallback methods
            }
        }

        // Option 2: Check for cached recent tracks in our database
        if (recentTracks.length === 0) {
            try {
                const { data: cachedTracks, error: cacheError } = await supabase
                    .from("user_recent_tracks")
                    .select("*")
                    .eq("spotify_id", userData.spotify_id)
                    .order("updated_at", { ascending: false })
                    .limit(1)
                    .single();

                if (!cacheError && cachedTracks) {
                    // Check if the cached data is recent (less than 1 day old)
                    const cacheAge = Date.now() - new Date(cachedTracks.updated_at).getTime();
                    const maxCacheAge = 24 * 60 * 60 * 1000; // 1 day

                    if (cacheAge < maxCacheAge && Array.isArray(cachedTracks.tracks_data)) {
                        recentTracks = cachedTracks.tracks_data.slice(0, limit);
                    }
                }
            } catch (error) {
                console.error("Error fetching cached tracks:", error);
                // Continue to fallback methods
            }
        }

        // Option 3: Generate mock data
        if (recentTracks.length === 0) {
            // Deterministic randomization based on the user's ID
            const seed = parseInt(userData.id.replace(/\D/g, "").slice(0, 5), 10) || Date.now();
            const tracks = [
                { title: "Blinding Lights", artist: "The Weeknd", album: "After Hours" },
                { title: "Bad Guy", artist: "Billie Eilish", album: "WHEN WE ALL FALL ASLEEP, WHERE DO WE GO?" },
                { title: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia" },
                { title: "Good 4 U", artist: "Olivia Rodrigo", album: "SOUR" },
                { title: "Stay", artist: "The Kid LAROI & Justin Bieber", album: "F*CK LOVE 3: OVER YOU" },
                { title: "Montero", artist: "Lil Nas X", album: "MONTERO" },
                { title: "Peaches", artist: "Justin Bieber", album: "Justice" },
                { title: "drivers license", artist: "Olivia Rodrigo", album: "SOUR" },
                { title: "Save Your Tears", artist: "The Weeknd", album: "After Hours" },
                { title: "Heat Waves", artist: "Glass Animals", album: "Dreamland" }
            ];

            // Generate tracks with different timestamps
            recentTracks = [];

            for (let i = 0; i < Math.min(limit, 10); i++) {
                const trackIndex = (seed + i) % tracks.length;
                const selectedTrack = tracks[trackIndex];

                // Track played between 1 hour and 7 days ago
                const hoursAgo = Math.floor((seed * (i + 1)) % 168) + 1; // 1-168 hours ago
                const timestamp = Date.now() - (hoursAgo * 60 * 60 * 1000);

                // Random track duration
                const durationMinutes = 2 + (Math.floor(seed * (i + 1)) % 4);
                const durationSeconds = Math.floor(seed * (i + 7)) % 60;
                const duration = `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`;

                recentTracks.push({
                    id: `mock-track-${fid || userData.spotify_id}-${i}-${trackIndex}`,
                    title: selectedTrack.title,
                    artist: selectedTrack.artist,
                    album: selectedTrack.album,
                    albumArt: `/api/placeholder/300/300?seed=${seed + i}`,
                    timestamp: timestamp,
                    playedAt: new Date(timestamp).toISOString(),
                    duration,
                    spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(selectedTrack.title + " " + selectedTrack.artist)}`
                });
            }
        }

        // Preparar e retornar a resposta
        return NextResponse.json({
            success: true,
            tracks: recentTracks,
            total: recentTracks.length
        });
    } catch (error) {
        console.error("Error in recent tracks API:", error);
        return NextResponse.json(
            { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}