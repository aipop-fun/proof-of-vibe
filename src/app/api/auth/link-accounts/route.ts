/* eslint-disable @typescript-eslint/ban-ts-comment*/

// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~/auth';
import { linkAccounts } from '~/lib/supabase';

/**
 * API endpoint to link Farcaster and Spotify accounts
 * This creates an association between a user's Farcaster ID (FID) and Spotify ID
 */
export async function POST(request: NextRequest) {
  try {
    // Get current session using the auth function
    const session = await auth();

    if (!session || !session.user) {
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

    // Log the linking attempt for debugging
    console.log('Attempting to link accounts:', { fid, spotifyId });

    // Validate that we have both IDs
    if (!Number.isInteger(fid)) {
      return NextResponse.json(
        { success: false, error: 'No Farcaster ID provided' },
        { status: 400 }
      );
    }

    if (typeof spotifyId !== 'string' || !spotifyId.startsWith('spotify:user:')) {
      return NextResponse.json(
        { success: false, error: 'No Spotify ID provided' },
        { status: 400 }
      );
    }


    const existingFidUser = await getUserByFid(fid);
    const existingSpotifyUser = await getUserBySpotifyId(spotifyId);

    if (existingFidUser && existingFidUser.spotify_id && existingFidUser.spotify_id !== spotifyId) {
      return NextResponse.json(
        { success: false, error: 'FID already linked to another Spotify account' },
        { status: 409 }
      );
    }

    if (existingSpotifyUser && existingSpotifyUser.fid && existingSpotifyUser.fid !== fid) {
      return NextResponse.json(
        { success: false, error: 'Spotify account already linked to another FID' },
        { status: 409 }
      );
    }

    // atomic 
    /*
    const linkedUser = await supabase.rpc('link_accounts', {
      p_fid: fid,
      p_spotify_id: spotifyId
    }); */

    // Link accounts in database
    const linkedUser = await linkAccounts(fid, spotifyId);

    // Return success response with linked user details
    return NextResponse.json({
      success: true,
      user: {
        id: linkedUser.id,
        fid: linkedUser.fid,
        spotifyId: linkedUser.spotify_id,
        displayName: linkedUser.display_name,
        isLinked: true,
      },
    });

  } catch (error) {
    console.error('Error linking accounts:', error);

    // Return meaningful error response
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to link accounts'
      },
      { status: 500 }
    );
  }
}