import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to refresh a Spotify access token
 * This uses the client credentials flow to refresh tokens
 */
export async function POST(request: NextRequest) {
    try {
        const { refreshToken } = await request.json();

        if (!refreshToken) {
            return NextResponse.json(
                { error: 'Refresh token is required' },
                { status: 400 }
            );
        }

        // Validate environment variables
        const clientId = process.env.SPOTIFY_CLIENT_ID;
        const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            console.error('Missing Spotify credentials');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        // Prepare the token refresh request
        const params = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        });

        // Create the Authorization header using client credentials
        const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        // Make the request to Spotify API
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${authHeader}`,
            },
            body: params.toString(),
            cache: 'no-store',
        });

        // Handle API response
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Error refreshing token:', errorData);

            return NextResponse.json(
                { error: errorData.error || 'Failed to refresh token' },
                { status: response.status }
            );
        }

        // Return the new tokens
        const tokens = await response.json();
        return NextResponse.json(tokens);

    } catch (error) {
        console.error('Token refresh error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}