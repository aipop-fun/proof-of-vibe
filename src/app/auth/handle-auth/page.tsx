"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "~/lib/stores/authStore";

export default function HandleAuth() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setSpotifyAuth } = useAuthStore();

    useEffect(() => {
        const authSuccess = searchParams?.get("auth_success");

        if (authSuccess === "true") {
            const accessToken = searchParams?.get("access_token") || "";
            const refreshToken = searchParams?.get("refresh_token") || "";
            const expiresInStr = searchParams?.get("expires_in") || "3600";
            const expiresIn = parseInt(expiresInStr, 10);
            const spotifyId = searchParams?.get("spotify_id") || "";
            const displayName = searchParams?.get("display_name") || "";
            const email = searchParams?.get("email") || "";
            const image = searchParams?.get("image") || "";

            // Calculate expiration timestamp
            const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

            // Save auth data to Zustand store
            setSpotifyAuth({
                accessToken,
                refreshToken,
                expiresAt,
                spotifyId,
                user: {
                    id: spotifyId,
                    name: displayName,
                    email,
                    image,
                },
            });

            console.log("Spotify authentication successful!");

            // Redirect to the home page
            router.push("/");
        } else {
            console.error("Authentication failed");
            router.push("/auth/error?error=AuthenticationFailed");
        }
    }, [searchParams, router, setSpotifyAuth]);

    return (
        <div className="flex items-center justify-center h-screen bg-gradient-to-b from-purple-900 to-black text-white">
            <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">Processing Authentication</h1>
                <p className="animate-pulse">Please wait...</p>
            </div>
        </div>
    );
}