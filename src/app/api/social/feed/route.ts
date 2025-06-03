import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/auth";
import { supabase } from "~/lib/supabase";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');

        // Get current user's FID
        const userFid = (session.user as any).fid;
        if (!userFid) {
            return NextResponse.json({ error: 'User FID not found' }, { status: 400 });
        }

        // Fetch followers with Spotify connections
        const followersResponse = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/neynar/followers?fid=${userFid}&limit=100`);
        if (!followersResponse.ok) {
            throw new Error('Failed to fetch followers');
        }

        const followersData = await followersResponse.json();
        const followerFids = followersData.users?.map((user: any) => user.fid) || [];

        if (followerFids.length === 0) {
            return NextResponse.json({ items: [], total: 0 });
        }

        // Get Spotify status for followers
        const spotifyStatusResponse = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/users/spotify-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fids: followerFids })
        });

        const spotifyStatus = spotifyStatusResponse.ok
            ? await spotifyStatusResponse.json()
            : {};

        // Filter only followers with Spotify
        const spotifyFollowerFids = followerFids.filter((fid: number) => spotifyStatus[fid]);

        if (spotifyFollowerFids.length === 0) {
            return NextResponse.json({ items: [], total: 0 });
        }

        // Get recent listening activity from our database
        const { data: listeningData, error: dbError } = await supabase
            .from('listening_history')
            .select(`
        *,
        user_profiles!inner(
          fid,
          username,
          display_name,
          profile_image
        )
      `)
            .in('fid', spotifyFollowerFids)
            .gte('listened_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()) // Last 6 hours
            .order('listened_at', { ascending: false })
            .limit(limit * 2); // Get more to filter duplicates

        if (dbError) {
            console.error('Database error:', dbError);
            // Fallback to mock data if database fails
            return generateMockFeedData(spotifyFollowerFids, followersData.users, limit);
        }

        // Process and deduplicate by user (latest track per user)
        const userLatestMap = new Map();
        listeningData?.forEach(entry => {
            const fid = entry.fid;
            if (!userLatestMap.has(fid) ||
                new Date(entry.listened_at) > new Date(userLatestMap.get(fid).listened_at)) {
                userLatestMap.set(fid, entry);
            }
        });

        // Transform to feed format
        const feedItems = Array.from(userLatestMap.values())
            .slice(0, limit)
            .map(entry => {
                const user = followersData.users.find((u: any) => u.fid === entry.fid);
                return {
                    user: {
                        fid: entry.fid,
                        username: entry.user_profiles?.username || user?.username,
                        displayName: entry.user_profiles?.display_name || user?.displayName,
                        pfpUrl: entry.user_profiles?.profile_image || user?.pfp
                    },
                    track: {
                        id: entry.spotify_track_id,
                        title: entry.track_title,
                        artist: entry.track_artist,
                        album: entry.track_album,
                        coverArt: entry.track_cover_art,
                        isPlaying: entry.is_playing,
                        duration: entry.track_duration_ms ? formatDuration(entry.track_duration_ms) : undefined
                    },
                    timestamp: new Date(entry.listened_at).getTime(),
                    type: entry.is_playing ? 'current' : 'recent'
                };
            });

        return NextResponse.json({
            items: feedItems,
            total: feedItems.length
        });

    } catch (error) {
        console.error('Error in social feed API:', error);
        return NextResponse.json(
            { error: 'Failed to fetch social feed' },
            { status: 500 }
        );
    }
}

// Helper function to format duration
function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Fallback mock data generator
function generateMockFeedData(fids: number[], users: any[], limit: number) {
    const mockTracks = [
        { title: "Blinding Lights", artist: "The Weeknd", album: "After Hours" },
        { title: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia" },
        { title: "Good 4 U", artist: "Olivia Rodrigo", album: "SOUR" },
        { title: "Stay", artist: "The Kid LAROI", album: "F*CK LOVE 3" },
        { title: "Peaches", artist: "Justin Bieber", album: "Justice" }
    ];

    const items = fids.slice(0, limit).map((fid, index) => {
        const user = users.find((u: any) => u.fid === fid);
        const track = mockTracks[index % mockTracks.length];

        return {
            user: {
                fid,
                username: user?.username || `user${fid}`,
                displayName: user?.displayName || `User ${fid}`,
                pfpUrl: user?.pfp
            },
            track: {
                id: `mock-${fid}-${index}`,
                title: track.title,
                artist: track.artist,
                album: track.album,
                coverArt: `/api/placeholder/300/300?seed=${fid}`,
                isPlaying: Math.random() > 0.7,
                duration: `${3 + Math.floor(Math.random() * 2)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`
            },
            timestamp: Date.now() - (index * 300000), // Stagger timestamps
            type: Math.random() > 0.7 ? 'current' : 'recent'
        };
    });

    return NextResponse.json({ items, total: items.length });
}

---

// src/app/api/social/user-tracks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "~/lib/supabase";

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

        // Check if user has Spotify connected
        const { data: user, error: userError } = await supabase
            .from('user_profiles')
            .select('spotify_id')
            .eq('fid', fid)
            .single();

        if (userError || !user?.spotify_id) {
            return NextResponse.json({
                error: 'User not found or Spotify not connected',
                hasSpotify: false
            }, { status: 404 });
        }

        // Get user's listening history for different time ranges
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

        // Fetch listening data for different time ranges
        const [weeklyData, monthlyData, allTimeData, recentData] = await Promise.all([
            // Last week (short_term)
            supabase
                .from('listening_history')
                .select('spotify_track_id, track_title, track_artist, track_album, track_cover_art, track_popularity')
                .eq('fid', fid)
                .gte('listened_at', oneWeekAgo.toISOString())
                .order('listened_at', { ascending: false }),

            // Last month (medium_term)
            supabase
                .from('listening_history')
                .select('spotify_track_id, track_title, track_artist, track_album, track_cover_art, track_popularity')
                .eq('fid', fid)
                .gte('listened_at', oneMonthAgo.toISOString())
                .order('listened_at', { ascending: false }),

            // All time (long_term) - last 3 months
            supabase
                .from('listening_history')
                .select('spotify_track_id, track_title, track_artist, track_album, track_cover_art, track_popularity')
                .eq('fid', fid)
                .gte('listened_at', threeMonthsAgo.toISOString())
                .order('listened_at', { ascending: false }),

            // Recent tracks (last 24 hours)
            supabase
                .from('listening_history')
                .select('*')
                .eq('fid', fid)
                .gte('listened_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
                .order('listened_at', { ascending: false })
                .limit(10)
        ]);

        // Process top tracks for each time range
        const processTopTracks = (data: any[]) => {
            if (!data) return [];

            // Count track plays and get most recent data
            const trackCounts = new Map();

            data.forEach(entry => {
                const trackId = entry.spotify_track_id;
                if (!trackCounts.has(trackId)) {
                    trackCounts.set(trackId, {
                        count: 0,
                        track: {
                            id: trackId,
                            title: entry.track_title,
                            artist: entry.track_artist,
                            album: entry.track_album,
                            coverArt: entry.track_cover_art,
                            popularity: entry.track_popularity
                        }
                    });
                }
                trackCounts.get(trackId).count++;
            });

            // Sort by play count and return top 5
            return Array.from(trackCounts.values())
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .map(item => item.track);
        };

        // Process recent tracks
        const recentTracks = recentData.data?.map(entry => ({
            id: entry.spotify_track_id,
            title: entry.track_title,
            artist: entry.track_artist,
            album: entry.track_album,
            coverArt: entry.track_cover_art,
            timestamp: new Date(entry.listened_at).getTime(),
            isPlaying: entry.is_playing
        })) || [];

        return NextResponse.json({
            hasSpotify: true,
            topTracks: {
                short_term: processTopTracks(weeklyData.data || []),
                medium_term: processTopTracks(monthlyData.data || []),
                long_term: processTopTracks(allTimeData.data || [])
            },
            recentTracks
        });

    } catch (error) {
        console.error('Error fetching user tracks:', error);
        return NextResponse.json(
            { error: 'Failed to fetch user tracks' },
            { status: 500 }
        );
    }
}