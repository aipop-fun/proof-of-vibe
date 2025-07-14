/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '~/lib/supabase';
import { z } from 'zod';
import { getNeynarClient, normalizeNeynarUser } from '~/lib/neynar';



async function searchNeynarUsersDirectly(query: string, limit: number) {
  const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
  if (!NEYNAR_API_KEY) {
    throw new Error('NEYNAR_API_KEY is not configured on the server.');
  }


  const url = `https://api.neynar.com/v2/farcaster/user/search?q=${encodeURIComponent(query)}&limit=${limit}`;
  const response = await fetch(url, {
    headers: {
      'accept': 'application/json',
      'api_key': NEYNAR_API_KEY,
    },
  });

  if (!response.ok) {

    const errorData = await response.json().catch(() => ({
      message: `API error with status ${response.status}`
    }));
    console.error('Direct Neynar API call failed:', {
      status: response.status,
      data: errorData
    });
    const error = new Error(`Neynar API Error: ${response.status} ${response.statusText}`);
    (error as any).response = { data: errorData, status: response.status };
    throw error;
  }

  return response.json();
}

const SearchParamsSchema = z.object({
  q: z.string().min(1, 'Query parameter is required'),

  limit: z.coerce.number().min(1).max(50).default(20),
  hasSpotify: z
    .string()
    .optional()
    .transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
  includeFollowingData: z
    .string()
    .optional()
    .transform(val => val === 'true')
});


function getCurrentUserFid(request: NextRequest): number | null {
  const headerFid = request.headers.get('x-current-user-fid');
  if (headerFid) return parseInt(headerFid);

  const queryFid = request.nextUrl.searchParams.get('currentUserFid');
  if (queryFid) return parseInt(queryFid);

  return null;
}


async function enrichWithFollowingData(client: any, users: any[], currentUserFid: number) {
  if (!currentUserFid || users.length === 0) return users;

  try {    
    const followingResponse = await client.fetchUserFollowing({
      fid: currentUserFid,
      limit: 200
    });

    const followingFids = new Set(
      followingResponse.users?.map((user: any) => user.fid) || []
    );

    return users.map(user => ({
      ...user,
      isFollowing: followingFids.has(user.fid),
      isCurrentUser: user.fid === currentUserFid
    }));
  } catch (error) {
    console.error('Error enriching with following data:', error);
    return users.map(user => ({
      ...user,
      isFollowing: false,
      isCurrentUser: user.fid === currentUserFid
    }));
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parseResult = SearchParamsSchema.safeParse({
      q: searchParams.get('q'),
      limit: searchParams.get('limit'),
      hasSpotify: searchParams.get('hasSpotify'),
      includeFollowingData: searchParams.get('includeFollowingData')
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parseResult.error.errors },
        { status: 400 }
      );
    }


    const { q: query, limit, hasSpotify, includeFollowingData } = parseResult.data;
    const currentUserFid = getCurrentUserFid(request);

    console.log('User search API called with:', {
      query,
      limit,
      hasSpotify,
      includeFollowingData,
      currentUserFid
    });

    const client = getNeynarClient();
    const isFidQuery = /^\d+$/.test(query.trim());
    let users: any[] = [];

    // Try FID search first if query is numeric
    if (isFidQuery) {
      try {
        const fid = parseInt(query.trim());
        const userResponse = await client.fetchBulkUsers({ fids: [fid] });
        if (userResponse.users?.length > 0) {
          users = userResponse.users.map(normalizeNeynarUser);
          console.log('Found user by FID:', fid);
        }
      } catch (fidError) {
        console.log('FID search failed, trying username search:', fidError);
      }
    }

    
    if (users.length === 0) {
      try {
        const searchResponse = await searchNeynarUsersDirectly(query, Math.min(limit * 2, 50));
        users = searchResponse.result?.users?.map(normalizeNeynarUser) || [];
        console.log('Found users by search:', users.length);
      } catch (searchError) {
        console.error('Search failed:', searchError);
        return NextResponse.json(
          {
            error: 'Search failed',
            details: searchError instanceof Error ? searchError.message : 'Unknown error'
          },
          { status: 500 }
        );
      }
    }

    
    if (users.length > 0) {
      try {
        const fids = users.map(user => user.fid);
        const { data: spotifyUsers } = await supabase
          .from('user_profiles')
          .select('fid')
          .in('fid', fids)
          .not('spotify_id', 'is', null);

        const spotifyFids = new Set(spotifyUsers?.map(user => user.fid) || []);
        users = users.map(user => ({
          ...user,
          hasSpotify: spotifyFids.has(user.fid)
        }));
    
        if (typeof hasSpotify === 'boolean') {
          users = users.filter(user => user.hasSpotify === hasSpotify);
        }
      } catch (spotifyError) {
        console.error('Error fetching Spotify data:', spotifyError);        
        users = users.map(user => ({
          ...user,
          hasSpotify: false
        }));
      }
    }

    
    if (includeFollowingData && currentUserFid && users.length > 0) {
      users = await enrichWithFollowingData(client, users, currentUserFid);
    }

    
    const finalUsers = users.slice(0, limit);

    console.log('Search completed:', {
      query,
      totalFound: users.length,
      returned: finalUsers.length,
      hasSpotifyFilter: hasSpotify
    });

    return NextResponse.json({
      users: finalUsers,
      total: finalUsers.length,
      totalFound: users.length,
      query,
      filters: {
        hasSpotify,
        includeFollowingData
      }
    });

  } catch (error: any) {
    console.error('Error in user search API:', error);

    const status = error?.response?.status || 500;
    let errorMessage = 'Failed to search users';


    if (error?.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    if (status === 429) {
      errorMessage = 'Neynar API rate limit reached. Please try again later.';
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error?.response?.data || {},
        query: request.nextUrl.searchParams.get('q') || ''
      },
      { status }
    );
  }
}