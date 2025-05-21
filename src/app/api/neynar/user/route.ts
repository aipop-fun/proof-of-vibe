import { NextRequest, NextResponse } from 'next/server';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const NEYNAR_BASE_URL = 'https://api.neynar.com/v2';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');
    const username = searchParams.get('username');

    if (!fid && !username) {
      return NextResponse.json(
        { error: 'FID or username is required' },
        { status: 400 }
      );
    }

    if (!NEYNAR_API_KEY) {
      return NextResponse.json(
        { error: 'Neynar API key not configured' },
        { status: 500 }
      );
    }

    // Build the API URL
    let apiUrl: string;
    if (fid) {
      apiUrl = `${NEYNAR_BASE_URL}/farcaster/user/by-fid?fid=${fid}`;
    } else {
      apiUrl = `${NEYNAR_BASE_URL}/farcaster/user/by-username?username=${username}`;
    }

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'X-API-KEY': NEYNAR_API_KEY,
      },
      next: {
        revalidate: 300, // Cache for 5 minutes
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      throw new Error(`Neynar API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Normalize the response structure
    const normalizedData = {
      user: {
        fid: data.user?.fid,
        username: data.user?.username,
        display_name: data.user?.display_name,
        pfp_url: data.user?.pfp_url,
        profile: {
          bio: {
            text: data.user?.profile?.bio?.text,
          },
        },
        follower_count: data.user?.follower_count,
        following_count: data.user?.following_count,
        verified_addresses: data.user?.verified_addresses,
        custody_address: data.user?.custody_address,
        viewer_context: data.user?.viewer_context,
      },
    };

    return NextResponse.json(normalizedData);
  } catch (error) {
    console.error('Error fetching user from Neynar:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    );
  }
}