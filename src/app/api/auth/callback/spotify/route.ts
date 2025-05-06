// src/app/api/auth/callback/spotify/route.ts
import { NextRequest, NextResponse } from 'next/server';

/**
 * Custom API route to handle Spotify OAuth callback
 * This processes the authorization code and redirects to the home page
 */
export async function GET(request: NextRequest) {
    try {
        // Get the authorization code and state from the query parameters
        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get('code');

        // Check if there's an error
        const error = searchParams.get('error');
        if (error) {
            // Redirect to the error page with the error message
            return NextResponse.redirect(
                new URL(`/auth/error?error=${encodeURIComponent(error)}`, request.url)
            );
        }

        // If there's no code, redirect to the error page
        if (!code) {
            return NextResponse.redirect(
                new URL('/auth/error?error=MissingAuthorizationCode', request.url)
            );
        }

        // Get credentials from environment variables
        const clientId = process.env.SPOTIFY_CLIENT_ID;
        const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return NextResponse.redirect(
                new URL('/auth/error?error=MissingCredentials', request.url)
            );
        }

        // Get the redirect URI
        const baseUrl = process.env.NEXTAUTH_URL || '';
        const redirectUri = `${baseUrl}/api/auth/callback/spotify`;

        // Exchange the authorization code for an access token
        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri
            })
        });

        // If the token request failed, redirect to the error page
        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json().catch(() => ({}));
            console.error('Error exchanging code for token:', errorData);
            return NextResponse.redirect(
                new URL('/auth/error?error=TokenExchangeFailed', request.url)
            );
        }

        // Get the token data
        const tokenData = await tokenResponse.json();

        // Get the user's profile
        const profileResponse = await fetch('https://api.spotify.com/v1/me', {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`
            }
        });

        // If the profile request failed, redirect to the error page
        if (!profileResponse.ok) {
            console.error('Error fetching profile:', await profileResponse.text());
            return NextResponse.redirect(
                new URL('/auth/error?error=ProfileFetchFailed', request.url)
            );
        }

        // Get the profile data
        const profileData = await profileResponse.json();

        // Create URL with auth data to be processed client-side
        const authParams = new URLSearchParams({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_in: tokenData.expires_in.toString(),
            spotify_id: profileData.id,
            display_name: profileData.display_name || '',
            email: profileData.email || '',
            image: profileData.images?.[0]?.url || '',
            auth_success: 'true'
        });

        // Redirect to a special auth handler page that will save the data to Zustand
        return NextResponse.redirect(new URL(`/auth/handle-auth?${authParams.toString()}`, request.url));
    } catch (error) {
        console.error('Error in Spotify callback:', error);
        return NextResponse.redirect(
            new URL('/auth/error?error=CallbackError', request.url)
        );
    }
}