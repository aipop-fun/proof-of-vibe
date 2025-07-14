/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getNeynarClient, normalizeNeynarUser } from '~/lib/neynar';
import { supabase } from '~/lib/supabase';
import { z } from 'zod';

const FollowingParamsSchema = z.object({
    fid: z.coerce.number().min(1, 'Valid FID is required'),
    limit: z.coerce.number().min(1).max(100).default(20),
    cursor: z.string().optional(),
    includeSpotify: z
        .string()
        .optional()
        .transform(val => val === 'true')
});

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const parseResult = FollowingParamsSchema.safeParse({
            fid: searchParams.get('fid'),
            limit: searchParams.get('limit'),
            cursor: searchParams.get('cursor'),
            includeSpotify: searchParams.get('includeSpotify')
        });

        if (!parseResult.success) {
            return NextResponse.json(
                { error: 'Invalid parameters', details: parseResult.error.errors },
                { status: 400 }
            );
        }

        const { fid, limit, cursor, includeSpotify } = parseResult.data;

        console.log('Fetching following list for FID:', fid, { limit, cursor, includeSpotify });

        const client = getNeynarClient();

        try {
            // Fetch following list from Neynar
            const followingParams: any = { fid, limit };
            if (cursor) {
                followingParams.cursor = cursor;
            }

            const followingResponse = await client.fetchUserFollowing(followingParams);

            if (!followingResponse.users) {
                return NextResponse.json({
                    users: [],
                    total: 0,
                    nextCursor: null,
                    fid
                });
            }

            // Normalize user data
            let users = followingResponse.users.map(normalizeNeynarUser);

            // Add Spotify information if requested
            if (includeSpotify && users.length > 0) {
                try {
                    const userFids = users.map(user => user.fid);
                    const { data: spotifyUsers } = await supabase
                        .from('user_profiles')
                        .select('fid')
                        .in('fid', userFids)
                        .not('spotify_id', 'is', null);

                    const spotifyFids = new Set(spotifyUsers?.map(user => user.fid) || []);

                    users = users.map(user => ({
                        ...user,
                        hasSpotify: spotifyFids.has(user.fid)
                    }));
                } catch (spotifyError) {
                    console.error('Error fetching Spotify data:', spotifyError);
                    users = users.map(user => ({
                        ...user,
                        hasSpotify: false
                    }));
                }
            }

            console.log('Successfully fetched following list:', {
                fid,
                count: users.length,
                hasNextCursor: !!followingResponse.next?.cursor
            });

            return NextResponse.json({
                users,
                total: users.length,
                nextCursor: followingResponse.next?.cursor || null,
                fid,
                pagination: {
                    limit,
                    cursor,
                    hasMore: !!followingResponse.next?.cursor
                }
            });

        } catch (neynarError) {
            console.error('Neynar API error for following:', neynarError);

            return NextResponse.json(
                {
                    error: 'Failed to fetch following list',
                    details: neynarError instanceof Error ? neynarError.message : 'Unknown error',
                    fid
                },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Error in following API:', error);

        return NextResponse.json(
            {
                error: 'Failed to fetch following list',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}