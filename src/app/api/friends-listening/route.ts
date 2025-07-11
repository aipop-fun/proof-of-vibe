// src/app/api/friends-listening/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const fid = searchParams.get('fid');

        if (!fid) {
            return NextResponse.json({ error: 'FID is required' }, { status: 400 });
        }

        // 1. Get user's followers/following from Neynar
        const neynarResponse = await fetch(
            `https://api.neynar.com/v2/farcaster/followers?fid=${fid}&limit=50`,
            {
                headers: {
                    'api_key': process.env.NEYNAR_API_KEY!,
                    'accept': 'application/json'
                }
            }
        );

        if (!neynarResponse.ok) {
            throw new Error('Failed to fetch followers');
        }

        const { users } = await neynarResponse.json();

        // 2. Check which users have Spotify connected and get their current activity
        const activities = [];

        for (const user of users.slice(0, 10)) { // Limit to first 10 for performance
            try {
                // Check if user has Spotify activity
                const activityResponse = await fetch(
                    `${process.env.NEXT_PUBLIC_URL}/api/user-activity?fid=${user.fid}`
                );

                if (activityResponse.ok) {
                    const activityData = await activityResponse.json();
                    if (activityData.track) {
                        activities.push({
                            id: `${user.fid}-${Date.now()}`,
                            fid: user.fid,
                            username: user.username,
                            displayName: user.display_name,
                            profileImage: user.pfp_url,
                            track: activityData.track,
                            timestamp: activityData.timestamp || Date.now()
                        });
                    }
                }
            } catch (error) {
                console.error(`Error fetching activity for user ${user.fid}:`, error);
            }
        }

        return NextResponse.json({ activities });
    } catch (error) {
        console.error('Error in friends-listening endpoint:', error);
        return NextResponse.json(
            { error: 'Failed to fetch friends activity' },
            { status: 500 }
        );
    }
}