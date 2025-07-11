import { NextRequest, NextResponse } from "next/server";
import { supabase } from "~/lib/supabase";
//import { auth } from "~/auth";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const fidParam = searchParams.get('fid');

        if (!fidParam) {
            return NextResponse.json({ error: 'FID is required' }, { status: 400 });
        }

        const fid = parseInt(fidParam);
        if (isNaN(fid)) {
            return NextResponse.json({ error: 'Invalid FID' }, { status: 400 });
        }

        // Get session to check if this is the current user
       // const session = await auth();

        // Look up user in database
        const { data: userProfile, error: userError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('fid', fid)
            .single();

        if (userError || !userProfile) {
            return NextResponse.json({
                error: 'User not found',
                hasSpotify: false
            }, { status: 404 });
        }

        // Check if user has Spotify connected
        if (!userProfile.spotify_id) {
            return NextResponse.json({
                error: 'User does not have Spotify connected',
                hasSpotify: false
            }, { status: 200 });
        }

        // Try to get current activity from various sources
        let currentTrack = null;
        let timestamp = Date.now();

        // Method 1: Check for real-time Spotify data (if available and recent)
        const { data: realtimeData, error: realtimeError } = await supabase
            .from('user_current_tracks')
            .select('*')
            .eq('fid', fid)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

        if (!realtimeError && realtimeData) {
            // Check if data is recent (less than 5 minutes old)
            const dataAge = Date.now() - new Date(realtimeData.updated_at).getTime();
            if (dataAge < 5 * 60 * 1000) { // 5 minutes
                currentTrack = {
                    id: realtimeData.track_id,
                    title: realtimeData.track_name,
                    artist: realtimeData.artist_name,
                    album: realtimeData.album_name,
                    coverArt: realtimeData.album_image_url,
                    isPlaying: realtimeData.is_playing,
                    uri: realtimeData.spotify_uri
                };
                timestamp = new Date(realtimeData.updated_at).getTime();
            }
        }

        // Method 2: Fallback to recent listening history
        if (!currentTrack) {
            const { data: historyData, error: historyError } = await supabase
                .from('listening_history')
                .select('*')
                .eq('fid', fid)
                .order('listened_at', { ascending: false })
                .limit(1)
                .single();

            if (!historyError && historyData) {
                currentTrack = {
                    id: historyData.spotify_track_id,
                    title: historyData.track_title,
                    artist: historyData.track_artist,
                    album: historyData.track_album,
                    coverArt: historyData.track_cover_art,
                    isPlaying: false,
                    uri: `spotify:track:${historyData.spotify_track_id}`
                };
                timestamp = new Date(historyData.listened_at).getTime();
            }
        }

        // Method 3: Generate demo data for development/testing
        if (!currentTrack && process.env.NODE_ENV === 'development') {
            // Generate deterministic demo data based on FID
            const demoTracks = [
                {
                    id: 'demo1',
                    title: 'Blinding Lights',
                    artist: 'The Weeknd',
                    album: 'After Hours',
                    coverArt: '/api/placeholder/300/300',
                    isPlaying: Math.random() > 0.5,
                    uri: 'spotify:track:0VjIjW4GlUla7X8inOCbID'
                },
                {
                    id: 'demo2',
                    title: 'Levitating',
                    artist: 'Dua Lipa',
                    album: 'Future Nostalgia',
                    coverArt: '/api/placeholder/300/300',
                    isPlaying: Math.random() > 0.5,
                    uri: 'spotify:track:463CkQjx2Zk1yXoBuierM9'
                },
                {
                    id: 'demo3',
                    title: 'Good 4 U',
                    artist: 'Olivia Rodrigo',
                    album: 'SOUR',
                    coverArt: '/api/placeholder/300/300',
                    isPlaying: Math.random() > 0.5,
                    uri: 'spotify:track:4ZtFanR9U6ndgddUvNcjcG'
                }
            ];

            const selectedTrack = demoTracks[fid % demoTracks.length];
            currentTrack = selectedTrack;
            timestamp = Date.now() - Math.floor(Math.random() * 3600000); // Random time within last hour
        }

        if (currentTrack) {
            return NextResponse.json({
                id: `${fid}-${timestamp}`,
                fid: fid,
                username: userProfile.username,
                displayName: userProfile.display_name,
                spotifyId: userProfile.spotify_id,
                timestamp: timestamp,
                track: currentTrack
            });
        }

        // No track data available
        return NextResponse.json({
            error: 'No current track data available',
            hasSpotify: true
        }, { status: 404 });

    } catch (error) {
        console.error('Error in user-activity API:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}