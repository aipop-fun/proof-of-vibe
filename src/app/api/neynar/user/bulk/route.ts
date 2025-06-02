import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const fids = searchParams.get('fids');

        if (!fids) {
            return NextResponse.json(
                { error: 'FIDs parameter is required' },
                { status: 400 }
            );
        }

        const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

        if (!NEYNAR_API_KEY) {
            console.error('NEYNAR_API_KEY not found in environment variables');
            return NextResponse.json(
                { error: 'Neynar API key not configured' },
                { status: 500 }
            );
        }

        // Convert comma-separated FIDs to array if needed
        const fidArray = fids.split(',').map(fid => parseInt(fid.trim()));

        // Call Neynar API to fetch bulk users
        const neynarResponse = await fetch(
            `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fidArray.join(',')}`,
            {
                headers: {
                    'accept': 'application/json',
                    'x-api-key': NEYNAR_API_KEY,
                },
            }
        );

        if (!neynarResponse.ok) {
            const errorText = await neynarResponse.text();
            console.error('Neynar API error:', neynarResponse.status, errorText);
            return NextResponse.json(
                {
                    error: 'Failed to fetch user data from Neynar',
                    details: errorText
                },
                { status: neynarResponse.status }
            );
        }

        const userData = await neynarResponse.json();

        // Return the user data
        return NextResponse.json(userData);

    } catch (error) {
        console.error('Error in Neynar user bulk API:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}