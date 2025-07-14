/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getNeynarClient, normalizeNeynarUser } from '~/lib/neynar';
import { supabase } from '~/lib/supabase';
import { z } from 'zod';

const BestFriendsParamsSchema = z.object({
    fid: z.coerce.number().min(1, 'Valid FID is required'),
    limit: z.coerce.number().min(1).max(50).default(20),
    includeSpotify: z
        .string()
        .optional()
        .transform(val => val === 'true')
});

// Helper function to get current user FID from request
function getCurrentUserFid(request: NextRequest): number | null {
    const headerFid = request.headers.get('x-current-user-fid');
    if (headerFid) return parseInt(headerFid);

    const queryFid = request.nextUrl.searchParams.get('currentUserFid');
    if (queryFid) return parseInt(queryFid);

    return null;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const parseResult = BestFriendsParamsSchema.safeParse({
            fid: searchParams.get('fid'),
            limit: searchParams.get('limit'),
            includeSpotify: searchParams.get('includeSpotify')
        });

        if (!parseResult.success) {
            return NextResponse.json(
                { error: 'Invalid parameters', details: parseResult.error.errors },
                { status: 400 }
            );
        }

        const { fid, limit, includeSpotify } = parseResult.data;
        const currentUserFid = getCurrentUserFid(request);

        console.log('Fetching best friends for FID:', fid, { limit, includeSpotify, currentUserFid });

        const client = getNeynarClient();

        try {
            // Fetch best friends from Neynar
            const bestFriendsResponse = await client.fetchBestFriends({ fid });

            if (!bestFriendsResponse.users) {
                return NextResponse.json({
                    users: [],
                    total: 0,
                    fid,
                    message: 'No best friends found'
                });
            }

            // Normalize user data and apply limit
            let users = bestFriendsResponse.users
                .slice(0, limit)
                .map(normalizeNeynarUser);

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

            // Add relationship info if current user is available
            if (currentUserFid && currentUserFid !== fid) {
                users = users.map(user => ({
                    ...user,
                    isMutualBestFriend: true, // All users in best friends are mutual by definition
                    isCurrentUser: user.fid === currentUserFid
                }));
            }

            console.log('Successfully fetched best friends:', {
                fid,
                count: users.length,
                totalAvailable: bestFriendsResponse.users.length
            });

            return NextResponse.json({
                users,
                total: users.length,
                totalAvailable: bestFriendsResponse.users.length,
                fid,
                metadata: {
                    description: 'Best friends are users who follow each other and have high engagement',
                    isMutual: true,
                    limit
                }
            });

        } catch (neynarError) {
            console.error('Neynar API error for best friends:', neynarError);

            return NextResponse.json(
                {
                    error: 'Failed to fetch best friends',
                    details: neynarError instanceof Error ? neynarError.message : 'Unknown error',
                    fid
                },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Error in best friends API:', error);

        return NextResponse.json(
            {
                error: 'Failed to fetch best friends',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}