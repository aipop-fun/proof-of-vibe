
/* eslint-disable @typescript-eslint/ban-ts-comment*/
// @ts-nocheck
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";

/**
 * Creates and returns a Neynar API client instance
 * Uses environment variables for authentication
 */
export function getNeynarClient(): NeynarAPIClient {
  const apiKey = process.env.NEYNAR_API_KEY;

  if (!apiKey) {
    throw new Error("NEYNAR_API_KEY environment variable is not set");
  }

  const config = new Configuration({
    apiKey
  });

  return new NeynarAPIClient(config);
}

/**
 * Sends a notification through Neynar's notification system
 */
export async function sendNeynarFrameNotification({
  fid,
  title,
  body,
}: {
  fid: number;
  title: string;
  body: string;
}) {
  try {
    const client = getNeynarClient();

    // Verify that we have the required client ID
    const clientId = process.env.NEYNAR_CLIENT_ID;
    if (!clientId) {
      throw new Error("NEYNAR_CLIENT_ID environment variable is not set");
    }

    // Send notification via Neynar API
    const response = await client.publishNotification({
      clientId,
      fid,
      title,
      body
    });

    if (response && response.success) {
      return { state: "success" };
    } else {
      return {
        state: "error",
        error: "Failed to send notification"
      };
    }
  } catch (error) {
    // Check if this is a rate limit error
    if (error instanceof Error && error.message.includes("rate limit")) {
      return {
        state: "rate_limit",
        error: "Rate limited by Neynar API"
      };
    }

    return {
      state: "error",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}