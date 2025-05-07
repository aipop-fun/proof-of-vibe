/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
//@ts-nocheck

"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAuthStore } from "~/lib/stores/authStore";

/**
 * Component to display the connection status between Spotify and Farcaster
 */
export function AccountStatus() {
    const { data: session } = useSession();
    const {
        spotifyId,
        fid,
        isLinked,
        checkLinkedStatus
    } = useAuthStore();

    // Check linked status when the component mounts
    useEffect(() => {
        if ((spotifyId || session?.user?.spotifyId) && (fid || session?.user?.fid)) {
            checkLinkedStatus();
        }
    }, [spotifyId, fid, session, checkLinkedStatus]);

    // Don't show anything if user doesn't have at least one account connected
    if (!spotifyId && !fid && !session?.user?.spotifyId && !session?.user?.fid) {
        return null;
    }

    // Get the display details
    const hasFarcaster = !!(fid || session?.user?.fid);
    const hasSpotify = !!(spotifyId || session?.user?.spotifyId);

    return (
        <div className="mb-4 p-3 rounded-lg bg-purple-900/30">
            <h3 className="text-sm font-semibold mb-2">Account Status</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${hasFarcaster ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                    <span>Farcaster</span>
                </div>
                <div className="text-right">
                    {hasFarcaster ? (
                        <span className="text-green-400">Connected</span>
                    ) : (
                        <span className="text-gray-400">Not Connected</span>
                    )}
                </div>

                <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${hasSpotify ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                    <span>Spotify</span>
                </div>
                <div className="text-right">
                    {hasSpotify ? (
                        <span className="text-green-400">Connected</span>
                    ) : (
                        <span className="text-gray-400">Not Connected</span>
                    )}
                </div>

                {hasFarcaster && hasSpotify && (
                    <>
                        <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${isLinked ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                            <span>Accounts Linked</span>
                        </div>
                        <div className="text-right">
                            {isLinked ? (
                                <span className="text-green-400">Yes</span>
                            ) : (
                                <span className="text-yellow-400">No</span>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}