// src/app/api/webhook/route.ts
import {
  ParseWebhookEvent,
  parseWebhookEvent,
  verifyAppKeyWithNeynar,
} from "@farcaster/frame-node";
import { NextRequest } from "next/server";
import {
  deleteUserNotificationDetails,
  setUserNotificationDetails,
} from "~/lib/kv";
import { sendFrameNotification } from "~/lib/notifs";

/**
 * Webhook handler for Farcaster Mini App events
 * This processes events like frame_added, frame_removed, notifications_enabled, and notifications_disabled
 */
export async function POST(request: NextRequest) {
  // Parse the request body
  const requestJson = await request.json();

  // Verify the event is legitimate and extract the data
  let data;
  try {
    data = await parseWebhookEvent(requestJson, verifyAppKeyWithNeynar);
  } catch (e: unknown) {
    const error = e as ParseWebhookEvent.ErrorType;

    switch (error.name) {
      case "VerifyJsonFarcasterSignature.InvalidDataError":
      case "VerifyJsonFarcasterSignature.InvalidEventDataError":
        // The request data is invalid
        return Response.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      case "VerifyJsonFarcasterSignature.InvalidAppKeyError":
        // The app key is invalid
        return Response.json(
          { success: false, error: error.message },
          { status: 401 }
        );
      case "VerifyJsonFarcasterSignature.VerifyAppKeyError":
        // Internal error verifying the app key (caller may want to try again)
        return Response.json(
          { success: false, error: error.message },
          { status: 500 }
        );
    }
  }

  // Extract the FID and event from the verified data
  const fid = data.fid;
  const event = data.event;

  // Process different event types
  switch (event.event) {
    case "frame_added":
      // The user has added the Mini App
      if (event.notificationDetails) {
        // Store the notification details for this user
        await setUserNotificationDetails(fid, event.notificationDetails);

        // Send a welcome notification
        await sendFrameNotification({
          fid,
          title: "Welcome to Proof of Vibes!",
          body: "Your music journey just got more social. Connect Spotify to get started.",
        });
      } else {
        // If no notification details, make sure we don't have any stored
        await deleteUserNotificationDetails(fid);
      }
      break;

    case "frame_removed":
      // The user has removed the Mini App - clean up notification details
      await deleteUserNotificationDetails(fid);
      break;

    case "notifications_enabled":
      // The user has enabled notifications
      await setUserNotificationDetails(fid, event.notificationDetails);

      // Send a confirmation notification
      await sendFrameNotification({
        fid,
        title: "Notifications Enabled",
        body: "You'll now receive updates when friends share music or interact with yours!",
      });
      break;

    case "notifications_disabled":
      // The user has disabled notifications - clean up notification details
      await deleteUserNotificationDetails(fid);
      break;
  }

  // Return success response
  return Response.json({ success: true });
}