// src/app/api/auth/link-accounts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '~/auth';
import { linkAccounts } from '~/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Get current session
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    
    // Extract FID and Spotify ID from request or session
    const fid = body.fid || session.user.fid;
    const spotifyId = body.spotifyId || session.user.spotifyId;
    
    // Validate that we have both IDs
    if (!fid) {
      return NextResponse.json(
        { success: false, error: 'No Farcaster ID provided' },
        { status: 400 }
      );
    }
    
    if (!spotifyId) {
      return NextResponse.json(
        { success: false, error: 'No Spotify ID provided' },
        { status: 400 }
      );
    }
    
    // Link accounts in Supabase
    const linkedUser = await linkAccounts(fid, spotifyId);
    
    return NextResponse.json({
      success: true,
      user: {
        id: linkedUser.id,
        fid: linkedUser.fid,
        spotifyId: linkedUser.spotify_id,
        displayName: linkedUser.display_name,
      },
    });
    
  } catch (error) {
    console.error('Error linking accounts:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to link accounts' },
      { status: 500 }
    );
  }
}
