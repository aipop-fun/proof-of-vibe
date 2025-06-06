/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getNeynarClient } from "~/lib/neynar";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fidParam = searchParams.get('fid');
    const limit = parseInt(searchParams.get('limit') || '50');
    const cursor = searchParams.get('cursor') || '';

    if (!fidParam) {
      return NextResponse.json(
        { error: 'FID parameter is required' },
        { status: 400 }
      );
    }

    const fid = parseInt(fidParam);
    if (isNaN(fid)) {
      return NextResponse.json(
        { error: 'Invalid FID parameter' },
        { status: 400 }
      );
    }

    console.log('Fetching followers for FID:', fid);

    const client = getNeynarClient();

    const response = await client.fetchUserFollowers({
      fid,
      limit: Math.min(limit, 150), // Limite máximo do Neynar
      cursor: cursor || undefined
    });

    console.log('Followers response:', {
      userCount: response.result?.users?.length || 0,
      fid
    });

    if (!response.result?.users) {
      return NextResponse.json({
        users: [],
        total: 0,
        nextCursor: null
      });
    }

    // Normalizar usuários
    const users = response.result.users.map(normalizeNeynarUser);

    return NextResponse.json({
      users,
      total: response.result.count || users.length,
      nextCursor: response.result.next?.cursor || null
    });

  } catch (error) {
    console.error('Followers API error:', error);

    const { state, error: errorMessage } = handleNeynarError(error);

    if (state === 'rate_limit') {
      return NextResponse.json(
        { error: 'Rate limited. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to fetch followers' },
      { status: 500 }
    );
  }
}
