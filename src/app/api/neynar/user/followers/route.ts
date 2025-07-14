/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getNeynarClient, normalizeNeynarUser } from '~/lib/neynar';
import { supabase } from '~/lib/supabase';
import { z } from 'zod';

const FollowersParamsSchema = z.object({
    fid: z.coerce.number().min(1, 'Valid FID is required'),
    limit: z.coerce.number().min(1).max(100).default(20),
    cursor: z.string().optional(),
    includeSpotify: z
        .string()
        .optional()
        .transform(val => val === 'true'),
    sortType: z.enum(['desc_chron', 'asc_chron']).default('desc_chron')
});

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const parseResult = FollowersParamsSchema.safeParse({
            fid: searchParams.get('fid'),
            limit: searchParams.get('limit'),
            cursor: searchParams.get('cursor'),
            includeSpotify: searchParams.get('includeSpotify'),
            sortType: searchParams.get('sortType')
        });

        if (!parseResult.success) {
            return NextResponse.json(
                { error: 'Invalid parameters', details: parseResult.error.errors },
                { status: 400 }
            );
        }

        const { fid, limit, cursor, includeSpotify, sortType } = parseResult.data;

        console.log('Fetching followers list for FID:', fid, { limit, cursor, includeSpotify, sortType });

        const client = getNeynarClient();

        try {
            // Fetch followers list from Neynar
            const followersParams: any = {
                fid,
                limit,
                sort_type: sortType
            };
            if (cursor) {
                followersParams.cursor = cursor;
            }

            const followersResponse = await client.fetchUserFollowers(followersParams);

            if (!followersResponse.users) {
                return NextResponse.json({
                    users: [],
                    total: 0,
                    nextCursor: null,
                    fid,
                    sortType
                });
            }

            // Normalize user data
            let users = followersResponse.users.map(normalizeNeynarUser);

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

            console.log('Successfully fetched followers list:', {
                fid,
                count: users.length,
                sortType,
                hasNextCursor: !!followersResponse.next?.cursor
            });

            return NextResponse.json({
                users,
                total: users.length,
                nextCursor: followersResponse.next?.cursor || null,
                fid,
                sortType,
                pagination: {
                    limit,
                    cursor,
                    hasMore: !!followersResponse.next?.cursor
                }
            });

        } catch (neynarError) {
            console.error('Neynar API error for followers:', neynarError);

            return NextResponse.json(
                {
                    error: 'Failed to fetch followers list',
                    details: neynarError instanceof Error ? neynarError.message : 'Unknown error',
                    fid
                },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Error in followers API:', error);

        return NextResponse.json(
            {
                error: 'Failed to fetch followers list',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}