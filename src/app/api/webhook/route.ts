// src/app/api/webhook/route.ts (updated)
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
import { NotificationService } from "~/lib/services/notificationService";

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

  console.log(`Received event ${event.event} for FID ${fid}`);

  // Process different event types
  switch (event.event) {
    case "frame_added":
      // The user has added the Mini App
      if (event.notificationDetails) {
        // Store the notification details for this user
        await setUserNotificationDetails(fid, event.notificationDetails);

        // Send a welcome notification
        // Allow some time for the notification details to be stored and processed
        setTimeout(async () => {
          try {
            await NotificationService.sendNotification({
              fid,
              type: 'welcome',
              data: {}
            });
            console.log(`Welcome notification sent to FID ${fid}`);
          } catch (error) {
            console.error(`Error sending welcome notification to FID ${fid}:`, error);
          }
        }, 2000);
      } else {
        // If no notification details, make sure we don't have any stored
        await deleteUserNotificationDetails(fid);
      }
      break;

    case "frame_removed":
      // The user has removed the Mini App - clean up notification details
      await deleteUserNotificationDetails(fid);
      console.log(`User FID ${fid} removed the frame`);
      break;

    case "notifications_enabled":
      // The user has enabled notifications
      if (event.notificationDetails) {
        await setUserNotificationDetails(fid, event.notificationDetails);

        // Send a confirmation notification
        setTimeout(async () => {
          try {
            await NotificationService.sendNotification({
              fid,
              type: 'welcome',
              data: {
                reEnabled: true
              }
            });
            console.log(`Notifications re-enabled notification sent to FID ${fid}`);
          } catch (error) {
            console.error(`Error sending notification re-enabled notification to FID ${fid}:`, error);
          }
        }, 2000);
      }
      break;

    case "notifications_disabled":
      // The user has disabled notifications - clean up notification details
      await deleteUserNotificationDetails(fid);
      console.log(`User FID ${fid} disabled notifications`);
      break;
  }

  // Return success response
  return Response.json({
    success: true,
    event: event.event,
    fid
  });
}