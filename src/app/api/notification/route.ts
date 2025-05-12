// src/app/api/notification/route.ts
import { NextRequest, NextResponse } from "next/server";
import { NotificationService, NotificationType } from "~/lib/services/notificationService";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { fid, type, data } = body;

        // Validate required parameters
        if (!fid || typeof fid !== 'number') {
            return NextResponse.json(
                { success: false, error: "Invalid or missing FID" },
                { status: 400 }
            );
        }

        if (!type || !Object.values(NotificationTypeEnum).includes(type as NotificationTypeEnum)) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid or missing notification type",
                    validTypes: Object.values(NotificationTypeEnum)
                },
                { status: 400 }
            );
        }

        // Send the notification
        const result = await NotificationService.sendNotification({
            fid,
            type: type as NotificationType,
            data
        });

        // Return appropriate response based on result
        if (!result.success) {
            const statusCode =
                result.error === "Rate limited" ? 429 :
                    result.error === "User has not enabled notifications" ||
                        result.error === "No notification token available for this user" ? 404 :
                        500;

            return NextResponse.json(
                { success: false, error: result.error, details: result.details },
                { status: statusCode }
            );
        }

        return NextResponse.json({
            success: true,
            message: result.message,
            details: result.details
        });
    } catch (error) {
        console.error("Error in notification handler:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}

// Enum for valid notification types (must match NotificationType)
enum NotificationTypeEnum {
    WELCOME = 'welcome',
    TRENDING_ARTIST = 'trending_artist',
    FRIEND_LISTENING = 'friend_listening',
    VIBE_MATCH = 'vibe_match',
    WEEKLY_RECAP = 'weekly_recap'
}