/* eslint-disable @typescript-eslint/no-explicit-any*/
import { NextRequest, NextResponse } from 'next/server';
import { validateToken, getCurrentlyPlaying, getTopTracks } from '~/lib/spotify-api-service';

export async function GET(request: NextRequest) {    
    const searchParams = request.nextUrl.searchParams;
    const endpoint = searchParams.get('endpoint');
    const token = searchParams.get('token');
    const timeRange = searchParams.get('time_range');

    if (!token) {
        return NextResponse.json(
            { error: 'Access token is required' },
            { status: 400 }
        );
    }

    try {        
        const isValid = await validateToken(token);

        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid or expired access token' },
                { status: 401 }
            );
        }

        
        let data;
        switch (endpoint) {
            case 'currently-playing':
                data = await getCurrentlyPlaying(token);
                break;
            case 'top-tracks':
                data = await getTopTracks(token, (timeRange as any) || 'medium_term');
                break;
            default:
                return NextResponse.json(
                    { error: 'Invalid endpoint. Available endpoints: currently-playing, top-tracks' },
                    { status: 400 }
                );
        }

        
        return NextResponse.json({
            success: true,
            endpoint,
            data
        });
    } catch (error) {
        console.error(`Error in Spotify debug endpoint (${endpoint}):`, error);
        return NextResponse.json(
            {
                error: 'Failed to execute Spotify API request',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}