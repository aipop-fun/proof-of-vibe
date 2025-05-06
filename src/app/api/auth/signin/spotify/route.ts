
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Custom API route to handle Spotify sign-in requests
 * This supports both GET and POST requests for compatibility
 */
export async function GET(request: NextRequest) {
    return handleSpotifySignIn(request);
}

export async function POST(request: NextRequest) {
    return handleSpotifySignIn(request);
}

/**
 * Common handler function for both GET and POST requests
 */
async function handleSpotifySignIn(request: NextRequest) {
    try {
        // Get client ID from environment with robust error handling
        const clientId = process.env.SPOTIFY_CLIENT_ID;
        const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

        // Check if credentials are missing or placeholder values
        if (!clientId || clientId === '[SET]' || clientId.includes('$')) {
            console.error('Invalid or missing SPOTIFY_CLIENT_ID:', clientId);
            return NextResponse.redirect(
                new URL('/auth/error?error=MissingOrInvalidClientId', request.url)
            );
        }

        if (!clientSecret || clientSecret === '[SET]' || clientSecret.includes('$')) {
            console.error('Invalid or missing SPOTIFY_CLIENT_SECRET');
            return NextResponse.redirect(
                new URL('/auth/error?error=MissingOrInvalidClientSecret', request.url)
            );
        }

        // Get the redirect URI with validation
        const baseUrl = process.env.NEXTAUTH_URL;
        if (!baseUrl) {
            console.error('Missing NEXTAUTH_URL environment variable');
            return NextResponse.redirect(
                new URL('/auth/error?error=MissingNextAuthUrl', request.url)
            );
        }

        const redirectUri = `${baseUrl}/api/auth/callback/spotify`;

        // Log the environment and configuration for debugging
        console.log('Auth Configuration:', {
            clientIdPrefix: clientId.substring(0, 4) + '...',
            clientSecretPrefix: clientSecret.substring(0, 4) + '...',
            baseUrl,
            redirectUri
        });

        // Define the required scopes
        const scopes = [
            'user-read-email',
            'user-read-private',
            'user-read-currently-playing',
            'user-top-read'
        ].join(' ');

        // Generate a state parameter for security
        const state = crypto.randomUUID();

        // Build the authorization URL
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: clientId,
            scope: scopes,
            redirect_uri: redirectUri,
            state: state
        });

        const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

        // Set state cookie for verification
        const response = NextResponse.redirect(authUrl);
        response.cookies.set({
            name: 'spotify-auth-state',
            value: state,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 10 // 10 minutes
        });

        return response;
    } catch (error) {
        console.error('Error in Spotify sign-in:', error);
        return NextResponse.redirect(
            new URL('/auth/error?error=SignInError', request.url)
        );
    }
}