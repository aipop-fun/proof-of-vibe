
import { NextRequest, NextResponse } from "next/server";
import { sendFrameNotification } from "~/lib/notifs";
import { sendNeynarFrameNotification } from "~/lib/neynar";
import { getUserNotificationDetails } from "~/lib/kv";


const trendingArtists = [
    { name: "Taylor Swift", genre: "Pop" },
    { name: "Kendrick Lamar", genre: "Hip Hop" },
    { name: "Billie Eilish", genre: "Pop" },
    { name: "Bad Bunny", genre: "Reggaeton" },
    { name: "The Weeknd", genre: "R&B" }
];

export async function POST(request: NextRequest) {
    try {
        const requestBody = await request.json();
        const { fid } = requestBody;

        if (!fid || typeof fid !== 'number') {
            return NextResponse.json(
                { success: false, error: "Invalid or missing FID" },
                { status: 400 }
            );
        }

        // Determine which notification method to use based on environment
        const neynarEnabled = process.env.NEYNAR_API_KEY && process.env.NEYNAR_CLIENT_ID;
        const sendNotification = neynarEnabled ? sendNeynarFrameNotification : sendFrameNotification;

        // For non-Neynar scenario, we need to get notification details from storage
        let notificationDetails = null;
        if (!neynarEnabled) {
            notificationDetails = await getUserNotificationDetails(fid);
            if (!notificationDetails) {
                return NextResponse.json(
                    { success: false, error: "User has not enabled notifications" },
                    { status: 404 }
                );
            }
        }

        // Select a random trending artist
        const randomArtist = trendingArtists[Math.floor(Math.random() * trendingArtists.length)];

        // Create a unique ID for this notification
        //const notificationId = `trending-artist-${fid}-${Date.now()}`;

        // Build the notification title and body
        const title = `${randomArtist.name} is trending!`;
        const body = `${randomArtist.name} is trending in ${randomArtist.genre} today. Check out who's listening!`;

        // Send the trending artist notification
        const result = await sendNotification({
            fid,
            title,
            body
        });

        if (result.state === "error") {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 500 }
            );
        } else if (result.state === "rate_limit") {
            return NextResponse.json(
                { success: false, error: "Rate limited" },
                { status: 429 }
            );
        } else if (result.state === "no_token") {
            return NextResponse.json(
                { success: false, error: "No notification token available for this user" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Trending artist notification sent successfully",
            artist: randomArtist.name
        });
    } catch (error) {
        console.error("Error sending artist notification:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}