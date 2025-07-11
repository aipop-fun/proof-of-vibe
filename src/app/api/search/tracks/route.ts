/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~/auth';
import { getSpotifyApiClient } from '~/lib/spotify-api';
import { z } from 'zod';

// Schema for request validation
const SearchParamsSchema = z.object({
    q: z.string().min(1, 'Query parameter is required'),
    limit: z.coerce.number().min(1).max(50).default(20),
    offset: z.coerce.number().min(0).default(0)
});

export async function GET(request: NextRequest) {
    try {
        // Get search parameters and validate
        const { searchParams } = new URL(request.url);

        const parseResult = SearchParamsSchema.safeParse({
            q: searchParams.get('q'),
            limit: searchParams.get('limit'),
            offset: searchParams.get('offset')
        });

        if (!parseResult.success) {
            return NextResponse.json(
                {
                    error: 'Invalid parameters',
                    details: parseResult.error.errors
                },
                { status: 400 }
            );
        }

        const { q: query, limit, offset } = parseResult.data;

        console.log('Spotify tracks search API called with:', { query, limit, offset });

        // Get user session
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Get Authorization header for token
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json(
                { error: 'Spotify access token required in Authorization header' },
                { status: 401 }
            );
        }

        // Create Spotify API client
        const spotifyClient = getSpotifyApiClient(token);

        try {
            // Search for tracks using the Spotify API
            // Ensure limit is within Spotify's accepted range
            const spotifyLimit = Math.min(Math.max(limit, 1), 50) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40 | 41 | 42 | 43 | 44 | 45 | 46 | 47 | 48 | 49 | 50;

            const searchResults = await spotifyClient.search(
                query.trim(),
                ['track'],
                'US', // Market - você pode tornar isso configurável
                spotifyLimit,
                offset
            );

            // Format the tracks data
            const tracks = searchResults.tracks.items.map((track: any) => ({
                id: track.id,
                title: track.name,
                artist: track.artists.map((artist: any) => artist.name).join(', '),
                album: track.album.name,
                coverArt: track.album.images[0]?.url || null,
                duration: formatDuration(track.duration_ms),
                durationMs: track.duration_ms,
                popularity: track.popularity,
                uri: track.uri,
                spotifyUrl: track.external_urls.spotify,
                previewUrl: track.preview_url,
                explicit: track.explicit,
                releaseDate: track.album.release_date,
                // Additional metadata that might be useful
                albumId: track.album.id,
                artistIds: track.artists.map((artist: any) => artist.id),
                trackNumber: track.track_number,
                discNumber: track.disc_number,
            }));

            // Return results with pagination info
            return NextResponse.json({
                tracks,
                pagination: {
                    total: searchResults.tracks.total,
                    limit,
                    offset,
                    hasMore: offset + limit < searchResults.tracks.total,
                    nextOffset: offset + limit < searchResults.tracks.total ? offset + limit : null,
                },
                query: query.trim(),
            });

        } catch (spotifyError) {
            console.error('Spotify API error:', spotifyError);

            // Handle specific Spotify API errors
            if (spotifyError instanceof Error) {
                // Token expired or invalid
                if (spotifyError.message.includes('401') || spotifyError.message.includes('Unauthorized')) {
                    return NextResponse.json(
                        { error: 'Spotify token expired or invalid' },
                        { status: 401 }
                    );
                }

                // Rate limit exceeded
                if (spotifyError.message.includes('429') || spotifyError.message.includes('Too Many Requests')) {
                    return NextResponse.json(
                        { error: 'Rate limit exceeded. Please try again later.' },
                        { status: 429 }
                    );
                }

                // Bad request (invalid query, etc.)
                if (spotifyError.message.includes('400')) {
                    return NextResponse.json(
                        { error: 'Invalid search query' },
                        { status: 400 }
                    );
                }
            }

            // Generic error response
            return NextResponse.json(
                { error: 'Failed to search tracks' },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Spotify tracks search error:', error);
        return NextResponse.json(
            { error: 'Failed to search tracks' },
            { status: 500 }
        );
    }
}

/**
 * Format milliseconds to mm:ss format
 */
function formatDuration(ms: number): string {
    if (!ms) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}