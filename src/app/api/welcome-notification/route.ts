// src/app/api/welcome-notification/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sendFrameNotification } from "~/lib/notifs";
import { sendNeynarFrameNotification } from "~/lib/neynar";
import { getUserNotificationDetails } from "~/lib/kv";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fid } = body;

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

    // Create a unique ID for this notification (using timestamp to avoid duplicates)
    //const notificationId = `welcome-${fid}-${Date.now()}`;

    // Send the welcome notification
    const result = await sendNotification({
      fid,
      title: "Welcome to Proof of Vibes!",
      body: "Connect your Spotify to share your music with friends on Farcaster.",
    
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
      message: "Welcome notification sent successfully" 
    });
  } catch (error) {
    console.error("Error sending welcome notification:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}