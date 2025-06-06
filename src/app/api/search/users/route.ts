/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment, */
// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '~/lib/supabase';
import { z } from 'zod';

const SearchParamsSchema = z.object({
    q: z.string().min(1, 'Query is required'),
    limit: z.coerce.number().min(1).max(50).default(20),
    hasSpotify: z.coerce.boolean().optional()
});

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        const parseResult = SearchParamsSchema.safeParse({
            q: searchParams.get('q'),
            limit: searchParams.get('limit'),
            hasSpotify: searchParams.get('hasSpotify')
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

        const { q: query, limit, hasSpotify } = parseResult.data;

        console.log('Search users API called with:', { query, limit, hasSpotify });

        const client = getNeynarClient();

        const isFidQuery = /^\d+$/.test(query.trim());

        let users: any[] = [];

        if (isFidQuery) {
            try {
                const fid = parseInt(query.trim());
                console.log('Searching by FID:', fid);

                const userResponse = await client.fetchBulkUsers({
                    fids: [fid]
                });

                if (userResponse.users && userResponse.users.length > 0) {
                    users = userResponse.users.map(normalizeNeynarUser);
                }
            } catch (fidError) {
                console.log('FID search failed, trying username search:', fidError);
            }
        }

        if (users.length === 0) {
            console.log('Searching by username/display name:', query);

            const searchResponse = await client.searchUser({
                q: query,
                limit: Math.min(limit, 50) // Neynar has max limit
            });

            if (searchResponse.result?.users) {
                users = searchResponse.result.users.map(normalizeNeynarUser);
            }
        }

        // Check Spotify status if we have users
        if (hasSpotify !== undefined && users.length > 0) {
            const fids = users.map(user => user.fid);

            try {
                const { data: spotifyUsers, error: spotifyError } = await supabase
                    .from('user_profiles')
                    .select('fid, spotify_id')
                    .in('fid', fids)
                    .not('spotify_id', 'is', null);

                if (!spotifyError && spotifyUsers) {
                    const spotifyFids = new Set(spotifyUsers.map(user => user.fid));

                    // Filter users based on Spotify connection status
                    users = users.filter(user => {
                        const hasSpotifyConnection = spotifyFids.has(user.fid);
                        return hasSpotify ? hasSpotifyConnection : !hasSpotifyConnection;
                    });

                    // Add hasSpotify property to user objects
                    users = users.map(user => ({
                        ...user,
                        hasSpotify: spotifyFids.has(user.fid)
                    }));
                }
            } catch (spotifyCheckError) {
                console.error('Error checking Spotify status:', spotifyCheckError);
            }
        } else if (users.length > 0) {
            const fids = users.map(user => user.fid);

            try {
                const { data: spotifyUsers } = await supabase
                    .from('user_profiles')
                    .select('fid, spotify_id')
                    .in('fid', fids)
                    .not('spotify_id', 'is', null);

                const spotifyFids = new Set(spotifyUsers?.map(user => user.fid) || []);

                users = users.map(user => ({
                    ...user,
                    hasSpotify: spotifyFids.has(user.fid)
                }));
            } catch (error) {
                console.error('Error adding Spotify status:', error);
                // Continue without Spotify status
                users = users.map(user => ({
                    ...user,
                    hasSpotify: false
                }));
            }
        }

        console.log('Search response:', {
            resultCount: users.length,
            query,
            hasSpotify
        });

        return NextResponse.json({
            users: users.slice(0, limit), // Ensure we don't exceed requested limit
            total: users.length,
            query,
            hasSpotify
        });

    } catch (error) {
        console.error('Search users API error:', error);

        const { state, error: errorMessage } = handleNeynarError(error);

        if (state === 'rate_limit') {
            return NextResponse.json(
                { error: 'Rate limited by Neynar API. Please try again later.' },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { error: errorMessage || 'Failed to search users' },
            { status: 500 }
        );
    }
}