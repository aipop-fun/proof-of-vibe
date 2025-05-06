import { NextResponse } from 'next/server';

/**
 * Custom API route to handle /api/auth/providers requests
 * This provides information about available authentication providers
 * 
 * In a full NextAuth implementation, this route would dynamically
 * obtain provider information from the NextAuth configuration.
 * For now, we're hardcoding the providers to resolve the 500 error.
 */
export async function GET() {
    const baseUrl = process.env.NEXTAUTH_URL || '';

    // Return a structured response that mimics the NextAuth providers endpoint
    const providers: {
        spotify: {
            id: string;
            name: string;
            type: string;
            signinUrl: string;
            callbackUrl: string;
        };
        credentials?: {
            id: string;
            name: string;
            type: string;
            signinUrl: string;
            callbackUrl: string;
        };
    } = {
        spotify: {
            id: "spotify",
            name: "Spotify",
            type: "oauth",
            signinUrl: `${baseUrl}/api/auth/signin/spotify`,
            callbackUrl: `${baseUrl}/api/auth/callback/spotify`
        }
    };

    // If you're also using Farcaster with credentials provider
    if (process.env.ENABLE_FARCASTER === 'true') {
        providers.credentials = {
            id: "credentials",
            name: "Farcaster",
            type: "credentials",
            signinUrl: `${baseUrl}/api/auth/signin/credentials`,
            callbackUrl: `${baseUrl}/api/auth/callback/credentials`
        };
    }

    return NextResponse.json(providers);
}