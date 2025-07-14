/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getNeynarClient, normalizeNeynarUser } from '~/lib/neynar';
import { supabase } from '~/lib/supabase';
import { z } from 'zod';

const BulkParamsSchema = z.object({
    fids: z.string().min(1, 'FIDs parameter is required'),
    includeSpotify: z
        .string()
        .optional()
        .transform(val => val === 'true' ? true : val === 'false' ? false : true)
});

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const parseResult = BulkParamsSchema.safeParse({
            fids: searchParams.get('fids'),
            includeSpotify: searchParams.get('includeSpotify')
        });

        if (!parseResult.success) {
            return NextResponse.json(
                { error: 'Invalid parameters', details: parseResult.error.errors },
                { status: 400 }
            );
        }

        const { fids: fidsParam, includeSpotify } = parseResult.data;

        
        const fidArray = fidsParam
            .split(',')
            .map(fid => parseInt(fid.trim()))
            .filter(fid => !isNaN(fid));

        if (fidArray.length === 0) {
            return NextResponse.json(
                { error: 'No valid FIDs provided' },
                { status: 400 }
            );
        }

        
        if (fidArray.length > 100) {
            return NextResponse.json(
                { error: 'Too many FIDs requested. Maximum is 100' },
                { status: 400 }
            );
        }

        console.log('Fetching bulk users for FIDs:', fidArray);

        const client = getNeynarClient();

        try {            
            const userResponse = await client.fetchBulkUsers({ fids: fidArray });

            if (!userResponse.users || userResponse.users.length === 0) {
                return NextResponse.json({
                    users: [],
                    total: 0,
                    message: 'No users found for the provided FIDs'
                });
            }

            
            let users = userResponse.users.map(normalizeNeynarUser);

            
            if (includeSpotify) {
                try {
                    const { data: spotifyUsers } = await supabase
                        .from('user_profiles')
                        .select('fid')
                        .in('fid', fidArray)
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

            console.log('Successfully fetched bulk users:', {
                requested: fidArray.length,
                found: users.length
            });

            return NextResponse.json({
                users,
                total: users.length,
                requested: fidArray.length
            });

        } catch (neynarError) {
            console.error('Neynar API error:', neynarError);
            
            const minimalUsers = fidArray.map(fid => ({
                fid,
                username: `user${fid}`,
                display_name: `User ${fid}`,
                pfp_url: null,
                bio: '',
                follower_count: 0,
                following_count: 0,
                verified_addresses: {
                    eth_addresses: [],
                    sol_addresses: []
                },
                hasSpotify: false
            }));

            return NextResponse.json({
                users: minimalUsers,
                total: minimalUsers.length,
                requested: fidArray.length,
                warning: 'Some or all users returned with minimal data due to API error'
            });
        }

    } catch (error) {
        console.error('Error in bulk users API:', error);

        return NextResponse.json(
            {
                error: 'Failed to fetch bulk users',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}