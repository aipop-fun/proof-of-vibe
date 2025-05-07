import { NextRequest, NextResponse } from 'next/server';
import { linkAccounts, AccountLinkingError } from '~/lib/services/accountLinking';

/**
 * API endpoint to link Farcaster and Spotify accounts
 * This creates an association between a user's Farcaster ID (FID) and Spotify ID


 */


export async function linkAccounts(
  fid: number,
  spotifyId: string
): Promise<AccountLinkingResponse> {
  try {
    // Validate credentials first
    const validation = await validateLinkingCredentials(fid, spotifyId);

    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    console.log('Credentials validated, proceeding with account linking');
    console.log('Creating or updating user with:', { fid, spotifyId });

    // Try to create or update user with both IDs
    const linkedUser = await createOrUpdateUser({
      fid,
      spotifyId
      // displayName is omitted
    });

    if (!linkedUser) {
      console.error('createOrUpdateUser returned null or undefined');
      return {
        success: false,
        error: 'Failed to create or update user record'
      };
    }

    console.log('User successfully linked:', linkedUser);

    // Format the response
    return {
      success: true,
      user: {
        id: linkedUser.id,
        fid: linkedUser.fid || 0,
        spotifyId: linkedUser.spotify_id || '',
        displayName: linkedUser.display_name,
        isLinked: !!(linkedUser.fid && linkedUser.spotify_id)
      }
    };
  } catch (error) {
    // More detailed error logging
    console.error('Error linking accounts - full error:', error);

    // If it's a Supabase error, extract more information
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('Supabase error code:', error.code);
      console.error('Supabase error message:', error.message);
      console.error('Supabase error details:', error.details);

      return {
        success: false,
        error: `Database error: ${error.message || 'Unknown database error'}`
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error linking accounts'
    };
  }
}
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Extract FID and Spotify ID directly from request
    const { fid, spotifyId } = body;

    // Log the linking attempt for debugging
    console.log('Attempting to link accounts:', { fid, spotifyId });

    // Validate that we have both IDs
    if (!fid || !Number.isInteger(parseInt(String(fid)))) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing Farcaster ID provided' },
        { status: 400 }
      );
    }

    if (!spotifyId || typeof spotifyId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing Spotify ID provided' },
        { status: 400 }
      );
    }

    // Call the account linking service
    const result = await linkAccounts(parseInt(String(fid)), spotifyId);

    // Handle different error cases with appropriate status codes
    if (!result.success) {
      const status =
        result.error === AccountLinkingError.FID_ALREADY_LINKED ||
          result.error === AccountLinkingError.SPOTIFY_ALREADY_LINKED
          ? 409  // Conflict
          : result.error === AccountLinkingError.MISSING_CREDENTIALS
            ? 400 // Bad Request
            : 500; // Internal Server Error

      return NextResponse.json({ success: false, error: result.error }, { status });
    }

    // Return success response with linked user details
    return NextResponse.json({
      success: true,
      user: result.user
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