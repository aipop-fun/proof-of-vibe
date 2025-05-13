/* eslint-disable  @typescript-eslint/no-unused-vars, react/no-unescaped-entities */
"use client";

import React from "react";
import sdk from "@farcaster/frame-sdk";
import { useFrame } from "./providers/FrameProvider";

export function AddFrameButton() {
    const { isMiniApp, added, notificationDetails } = useFrame();

    const handleAddToWarpcast = async () => {
        if (typeof sdk?.actions?.openUrl === 'function') {
            // The URL should point to your app installation in Warpcast
            // Replace this with your actual mini app URL
            sdk.actions.openUrl("https://warpcast.com/~/apps/timbra");
        } else {
            // Fallback for non-mini app environments
            window.open("https://warpcast.com/~/apps/timbra", "_blank");
        }
    };

    // If already added and has notification details, don't show button
    if (added && notificationDetails) {
        return null;
    }

    return (
        <button
            onClick={handleAddToWarpcast}
            className={`p-1.5 rounded-full ${isMiniApp ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'
                }`}
            title="Add to Warpcast"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
                <path d="M12 13v8"></path>
                <path d="M8 17h8"></path>
            </svg>
        </button>
    );
}