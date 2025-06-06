/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
        const { searchParams } = new URL(request.url);
        const testQuery = searchParams.get('q') || 'dwr';
        
        if (!NEYNAR_API_KEY) {
            return NextResponse.json({
                error: 'NEYNAR_API_KEY not configured',
                configured: false,
                apiKey: 'NOT_SET'
            });
        }
        
        try {
            const testResponse = await fetch(
                `https://api.neynar.com/v2/farcaster/user/search?q=${encodeURIComponent(testQuery)}&limit=1`,
                {
                    headers: {
                        'accept': 'application/json',
                        'x-api-key': NEYNAR_API_KEY,
                    },                    
                }
            );

            const responseText = await testResponse.text();
            let responseData;

            try {
                responseData = JSON.parse(responseText);
            } catch (parseError) {
                responseData = { raw: responseText };
            }

            return NextResponse.json({
                configured: true,
                apiKey: `${NEYNAR_API_KEY.substring(0, 8)}...`,
                testQuery,
                testResponse: {
                    status: testResponse.status,
                    statusText: testResponse.statusText,
                    headers: Object.fromEntries(testResponse.headers.entries()),
                    data: responseData
                },
                success: testResponse.ok
            });

        } catch (fetchError) {
            return NextResponse.json({
                configured: true,
                apiKey: `${NEYNAR_API_KEY.substring(0, 8)}...`,
                testQuery,
                error: 'Failed to test Neynar API',
                details: fetchError instanceof Error ? fetchError.message : String(fetchError),
                success: false
            });
        }

    } catch (error) {
        return NextResponse.json({
            error: 'Debug endpoint error',
            details: error instanceof Error ? error.message : String(error),
            success: false
        });
    }
}