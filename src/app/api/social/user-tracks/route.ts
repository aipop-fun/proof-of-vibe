/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "~/lib/supabase";

// Zod schemas for type validation
const UserProfileSchema = z.object({
    spotify_id: z.string().nullable(),
});

const ListeningHistorySchema = z.object({
    spotify_track_id: z.string(),
    track_title: z.string(),
    track_artist: z.string(),
    track_album: z.string(),
    track_cover_art: z.string().url().optional(),
    track_popularity: z.number().optional(),
    listened_at: z.string(),
    is_playing: z.boolean().optional(),
});

const TrackSchema = z.object({
    id: z.string(),
    title: z.string(),
    artist: z.string(),
    album: z.string(),
    coverArt: z.string().url().optional(),
    popularity: z.number().optional(),
});

const RecentTrackSchema = TrackSchema.extend({
    timestamp: z.number(),
    isPlaying: z.boolean(),
});

// TypeScript types from Zod schemas
type UserProfile = z.infer<typeof UserProfileSchema>;
type ListeningHistory = z.infer<typeof ListeningHistorySchema>;
type Track = z.infer<typeof TrackSchema>;
type RecentTrack = z.infer<typeof RecentTrackSchema>;

interface TrackCount {
    count: number;
    track: Track;
}

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

        if (userError) {
            return NextResponse.json({
                error: 'User not found or Spotify not connected',
                hasSpotify: false
            }, { status: 404 });
        }

        // Validate user profile data
        const userValidation = UserProfileSchema.safeParse(user);
        if (!userValidation.success || !userValidation.data.spotify_id) {
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
        const processTopTracks = (data: unknown[]): Track[] => {
            if (!data || !Array.isArray(data)) return [];

            // Validate and filter the data
            const validatedData: ListeningHistory[] = [];
            data.forEach(entry => {
                const validation = ListeningHistorySchema.safeParse(entry);
                if (validation.success) {
                    validatedData.push(validation.data);
                } else {
                    console.warn('Invalid listening history entry:', validation.error);
                }
            });

            // Count track plays and get most recent data
            const trackCounts = new Map<string, TrackCount>();

            validatedData.forEach(entry => {
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
                trackCounts.get(trackId)!.count++;
            });

            // Sort by play count and return top 5
            return Array.from(trackCounts.values())
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .map(item => item.track);
        };

        // Process recent tracks
        const processRecentTracks = (data: unknown[]): RecentTrack[] => {
            if (!data || !Array.isArray(data)) return [];

            const validatedTracks: RecentTrack[] = [];
            data.forEach(entry => {
                const validation = ListeningHistorySchema.safeParse(entry);
                if (validation.success) {
                    const track = validation.data;
                    validatedTracks.push({
                        id: track.spotify_track_id,
                        title: track.track_title,
                        artist: track.track_artist,
                        album: track.track_album,
                        coverArt: track.track_cover_art,
                        popularity: track.track_popularity,
                        timestamp: new Date(track.listened_at).getTime(),
                        isPlaying: track.is_playing || false
                    });
                } else {
                    console.warn('Invalid recent track entry:', validation.error);
                }
            });

            return validatedTracks;
        };

        return NextResponse.json({
            hasSpotify: true,
            topTracks: {
                short_term: processTopTracks(weeklyData.data || []),
                medium_term: processTopTracks(monthlyData.data || []),
                long_term: processTopTracks(allTimeData.data || [])
            },
            recentTracks: processRecentTracks(recentData.data || [])
        });

    } catch (error) {
        console.error('Error fetching user tracks:', error);
        return NextResponse.json(
            { error: 'Failed to fetch user tracks' },
            { status: 500 }
        );
    }
}