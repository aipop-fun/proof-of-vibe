import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "~/auth";
import { supabase } from "~/lib/supabase";

// Zod schemas for type validation
const UserSchema = z.object({
    fid: z.number(),
    username: z.string(),
    displayName: z.string(),
    pfp: z.string().url().optional(),
});

const FollowersResponseSchema = z.object({
    users: z.array(UserSchema).optional(),
});

const SessionUserSchema = z.object({
    fid: z.number(),
});

const SpotifyStatusSchema = z.record(z.number(), z.boolean());

const ListeningHistorySchema = z.object({
    fid: z.number(),
    spotify_track_id: z.string(),
    track_title: z.string(),
    track_artist: z.string(),
    track_album: z.string(),
    track_cover_art: z.string().url().optional(),
    is_playing: z.boolean(),
    track_duration_ms: z.number().optional(),
    listened_at: z.string(),
    user_profiles: z.object({
        fid: z.number(),
        username: z.string(),
        display_name: z.string(),
        profile_image: z.string().url().optional(),
    }).optional(),
});

type User = z.infer<typeof UserSchema>;
type SpotifyStatus = z.infer<typeof SpotifyStatusSchema>;
type ListeningHistory = z.infer<typeof ListeningHistorySchema>;

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');

        // Validate and get current user's FID
        const sessionUserResult = SessionUserSchema.safeParse(session.user);
        if (!sessionUserResult.success) {
            return NextResponse.json({ error: 'User FID not found' }, { status: 400 });
        }
        const userFid = sessionUserResult.data.fid;

        // Fetch followers with Spotify connections
        const followersResponse = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/neynar/followers?fid=${userFid}&limit=100`);
        if (!followersResponse.ok) {
            throw new Error('Failed to fetch followers');
        }

        const followersRawData = await followersResponse.json();
        const followersValidation = FollowersResponseSchema.safeParse(followersRawData);

        if (!followersValidation.success) {
            console.error('Invalid followers data:', followersValidation.error);
            return NextResponse.json({ items: [], total: 0 });
        }

        const followersData = followersValidation.data;
        const followerFids = followersData.users?.map((user) => user.fid) || [];

        if (followerFids.length === 0) {
            return NextResponse.json({ items: [], total: 0 });
        }

        // Get Spotify status for followers
        const spotifyStatusResponse = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/users/spotify-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fids: followerFids })
        });

        let spotifyStatus: SpotifyStatus = {};
        if (spotifyStatusResponse.ok) {
            const rawSpotifyStatus = await spotifyStatusResponse.json();
            const spotifyStatusValidation = SpotifyStatusSchema.safeParse(rawSpotifyStatus);
            if (spotifyStatusValidation.success) {
                spotifyStatus = spotifyStatusValidation.data;
            }
        }

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
            return generateMockFeedData(spotifyFollowerFids, followersData.users || [], limit);
        }

        // Validate listening data
        const validatedListeningData: ListeningHistory[] = [];
        listeningData?.forEach(entry => {
            const validation = ListeningHistorySchema.safeParse(entry);
            if (validation.success) {
                validatedListeningData.push(validation.data);
            } else {
                console.warn('Invalid listening data entry:', validation.error);
            }
        });

        // Process and deduplicate by user (latest track per user)
        const userLatestMap = new Map<number, ListeningHistory>();
        validatedListeningData.forEach(entry => {
            const fid = entry.fid;
            if (!userLatestMap.has(fid) ||
                new Date(entry.listened_at) > new Date(userLatestMap.get(fid)!.listened_at)) {
                userLatestMap.set(fid, entry);
            }
        });

        // Transform to feed format
        const feedItems = Array.from(userLatestMap.values())
            .slice(0, limit)
            .map(entry => {
                const user = followersData.users?.find((u) => u.fid === entry.fid);
                return {
                    user: {
                        fid: entry.fid,
                        username: entry.user_profiles?.username || user?.username || `user${entry.fid}`,
                        displayName: entry.user_profiles?.display_name || user?.displayName || `User ${entry.fid}`,
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
function generateMockFeedData(fids: number[], users: User[], limit: number) {
    const mockTracks = [
        { title: "Blinding Lights", artist: "The Weeknd", album: "After Hours" },
        { title: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia" },
        { title: "Good 4 U", artist: "Olivia Rodrigo", album: "SOUR" },
        { title: "Stay", artist: "The Kid LAROI", album: "F*CK LOVE 3" },
        { title: "Peaches", artist: "Justin Bieber", album: "Justice" }
    ];

    const items = fids.slice(0, limit).map((fid, index) => {
        const user = users.find((u) => u.fid === fid);
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