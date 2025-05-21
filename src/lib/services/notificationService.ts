/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment*/
// @ts-nocheck
import { sendFrameNotification } from "../notifs";
import { sendNeynarFrameNotification } from "../neynar";
import { getUserNotificationDetails } from "../kv";

// Types for notifications
export type NotificationType =
    | 'welcome'
    | 'trending_artist'
    | 'friend_listening'
    | 'vibe_match'
    | 'weekly_recap';

export interface NotificationRequest {
    fid: number;
    type: NotificationType;
    data?: Record<string, any>;
}

export interface NotificationResult {
    success: boolean;
    message?: string;
    error?: string;
    details?: any;
}

/**
 * Service for sending various types of notifications to users
 */
export class NotificationService {
    /**
     * Send a notification based on the specified type and data
     */
    static async sendNotification(request: NotificationRequest): Promise<NotificationResult> {
        const { fid, type, data = {} } = request;

        try {
            // Validate FID
            if (!fid || typeof fid !== 'number') {
                return {
                    success: false,
                    error: "Invalid or missing FID"
                };
            }

            // Determine notification content based on type
            const { title, body, targetUrl } = this.getNotificationContent(type, data);

            // Create a unique notification ID
            const notificationId = `${type}-${fid}-${Date.now()}`;

            // Determine which notification method to use based on environment
            const neynarEnabled = process.env.NEYNAR_API_KEY && process.env.NEYNAR_CLIENT_ID;
            const sendNotification = neynarEnabled ? sendNeynarFrameNotification : sendFrameNotification;

            // For non-Neynar scenario, verify notification details exist
            if (!neynarEnabled) {
                const notificationDetails = await getUserNotificationDetails(fid);
                if (!notificationDetails) {
                    return {
                        success: false,
                        error: "User has not enabled notifications"
                    };
                }
            }

            // Send the notification
            const result = await sendNotification({
                fid,
                title,
                body,                                
            });

            // Process the result
            if (result.state === "error") {
                return {
                    success: false,
                    error: "Failed to send notification",
                    details: result.error
                };
            } else if (result.state === "rate_limit") {
                return {
                    success: false,
                    error: "Rate limited"
                };
            } else if (result.state === "no_token") {
                return {
                    success: false,
                    error: "No notification token available for this user"
                };
            }

            return {
                success: true,
                message: `${type} notification sent successfully`,
                details: data
            };

        } catch (error) {
            console.error(`Error sending ${type} notification:`, error);
            return {
                success: false,
                error: "Internal server error",
                details: error instanceof Error ? error.message : undefined
            };
        }
    }

    /**
     * Get notification content based on type and data
     */
    private static getNotificationContent(type: NotificationType, data: Record<string, any>): {
        title: string;
        body: string;
        targetUrl?: string;
    } {
        const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://proof-of-vibes.app';

        switch (type) {
            case 'welcome':
                return {
                    title: "Welcome to Timbra!",
                    body: "Connect your Spotify to share your music with friends on Farcaster.",
                    targetUrl: baseUrl
                };

            case 'trending_artist':
                const { artist = 'Taylor Swift', genre = 'Pop' } = data;
                return {
                    title: `${artist} is trending!`,
                    body: `${artist} is trending in ${genre} today. Check out who's listening!`,
                    targetUrl: `${baseUrl}/trending`
                };

            case 'friend_listening':
                const { friendName = 'A friend', trackTitle = 'a song', artist: trackArtist = 'an artist' } = data;
                return {
                    title: `${friendName} is listening to ${trackTitle}`,
                    body: `${friendName} is vibing to ${trackTitle} by ${trackArtist} right now.`,
                    targetUrl: `${baseUrl}/results?type=friend-listening&friendFid=${data.friendFid || ''}`
                };

            case 'vibe_match':
                const { matchName = 'a Farcaster user', matchPercentage = 85 } = data;
                return {
                    title: "New Vibe Match Found!",
                    body: `You and ${matchName} have a ${matchPercentage}% music taste match. Check it out!`,
                    targetUrl: `${baseUrl}/results?type=vibe-match`
                };

            case 'weekly_recap':
                return {
                    title: "Your Weekly Music Recap",
                    body: "Your weekly music report is ready. See what you've been listening to!",
                    targetUrl: `${baseUrl}/results?type=top-tracks&timeRange=short_term`
                };

            default:
                return {
                    title: "Timbra",
                    body: "Check out what's happening with your music vibes!",
                    targetUrl: baseUrl
                };
        }
    }
}