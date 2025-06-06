/* eslint-disable @typescript-eslint/no-explicit-any */
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

        console.log('Search users fallback API called with:', { query, limit, hasSpotify });

        const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

        if (!NEYNAR_API_KEY) {
            return NextResponse.json(
                { error: 'Neynar API key not configured' },
                { status: 500 }
            );
        }

        let users = [];

        // Check if query is a FID (numeric)
        const isFidQuery = /^\d+$/.test(query.trim());

        if (isFidQuery) {
            try {
                const fid = parseInt(query.trim());
                console.log('Searching by FID:', fid);

                const response = await fetch(
                    `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
                    {
                        headers: {
                            'accept': 'application/json',
                            'x-api-key': NEYNAR_API_KEY,
                        },
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    if (data.users && data.users.length > 0) {
                        users = data.users.map((user: any) => ({
                            fid: user.fid,
                            username: user.username,
                            display_name: user.display_name,
                            pfp_url: user.pfp_url,
                            bio: user.profile?.bio?.text,
                            follower_count: user.follower_count,
                            following_count: user.following_count,
                            verified_addresses: user.verified_addresses,
                            custody_address: user.custody_address,
                        }));
                    }
                }
            } catch (fidError) {
                console.log('FID search failed, trying username search:', fidError);
            }
        }

        // If no results from FID search, search by username
        if (users.length === 0) {
            console.log('Searching by username/display name:', query);

            try {
                const response = await fetch(
                    `https://api.neynar.com/v2/farcaster/user/search?q=${encodeURIComponent(query)}&limit=${Math.min(limit, 10)}`,
                    {
                        headers: {
                            'accept': 'application/json',
                            'x-api-key': NEYNAR_API_KEY,
                        },
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    if (data.result?.users) {
                        users = data.result.users.map((user: any) => ({
                            fid: user.fid,
                            username: user.username,
                            display_name: user.display_name,
                            pfp_url: user.pfp_url,
                            bio: user.profile?.bio?.text,
                            follower_count: user.follower_count,
                            following_count: user.following_count,
                            verified_addresses: user.verified_addresses,
                            custody_address: user.custody_address,
                        }));
                    }
                } else {
                    const errorText = await response.text();
                    console.error('Neynar API error:', response.status, errorText);
                    throw new Error(`Neynar API error: ${response.status}`);
                }
            } catch (searchError) {
                console.error('Username search failed:', searchError);
                throw searchError;
            }
        }

        // Check Spotify status if needed
        if (users.length > 0) {
            const fids = users.map((user: any) => user.fid);

            try {
                const { data: spotifyUsers, error: spotifyError } = await supabase
                    .from('user_profiles')
                    .select('fid, spotify_id')
                    .in('fid', fids)
                    .not('spotify_id', 'is', null);

                if (!spotifyError && spotifyUsers) {
                    const spotifyFids = new Set(spotifyUsers.map(user => user.fid));

                    // Add hasSpotify property to all users
                    users = users.map((user: any) => ({
                        ...user,
                        hasSpotify: spotifyFids.has(user.fid)
                    }));

                    // Apply hasSpotify filter if specified
                    if (hasSpotify !== undefined) {
                        users = users.filter((user: any) =>
                            hasSpotify ? user.hasSpotify : !user.hasSpotify
                        );
                    }
                } else {
                    // Add default hasSpotify property if query failed
                    users = users.map((user: any) => ({
                        ...user,
                        hasSpotify: false
                    }));
                }
            } catch (spotifyCheckError) {
                console.error('Error checking Spotify status:', spotifyCheckError);
                users = users.map((user: any) => ({
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
            users: users.slice(0, limit),
            total: users.length,
            query,
            hasSpotify
        });

    } catch (error) {
        console.error('Search users fallback API error:', error);

        if (error instanceof Error && error.message.includes('rate limit')) {
            return NextResponse.json(
                { error: 'Rate limited by Neynar API. Please try again later.' },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to search users', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}