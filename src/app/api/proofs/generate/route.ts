// src/app/api/proofs/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createVerifiableData, storeProof } from "~/lib/tlsnotary";
import { getSpotifyApiClient } from "~/lib/spotify-api";

/**
 * API endpoint to generate TLSNotary proofs for Spotify data
 * This endpoint handles creating verifiable proofs for a user's Spotify data
 */
export async function POST(request: NextRequest) {
    try {
        // Parse request
        const body = await request.json();
        const { userId, fid, spotifyId, endpoint, accessToken } = body;

        // Validate required parameters
        if (!userId || !endpoint || !accessToken) {
            return NextResponse.json(
                { success: false, error: "Missing required parameters" },
                { status: 400 }
            );
        }

        // Initialize Spotify API client with the provided token
        const spotifyClient = getSpotifyApiClient(accessToken);

        try {
            // Fetch data from Spotify based on the requested endpoint
            let responseData;
            switch (endpoint) {
                case "currently-playing":
                    responseData = await spotifyClient.player.getCurrentlyPlayingTrack();
                    break;
                case "top-tracks/short_term":
                    responseData = await spotifyClient.currentUser.topItems('tracks', 'short_term');
                    break;
                case "top-tracks/medium_term":
                    responseData = await spotifyClient.currentUser.topItems('tracks', 'medium_term');
                    break;
                case "top-tracks/long_term":
                    responseData = await spotifyClient.currentUser.topItems('tracks', 'long_term');
                    break;
                default:
                    return NextResponse.json(
                        { success: false, error: "Unsupported endpoint" },
                        { status: 400 }
                    );
            }

            // Generate verifiable data with proof
            const verifiableData = await createVerifiableData(
                userId,
                fid,
                spotifyId,
                endpoint,
                responseData
            );

            // Store the proof for later validation
            const proof = JSON.parse(verifiableData.proof);
            await storeProof(proof);

            // Return the verifiable data
            return NextResponse.json({
                success: true,
                data: verifiableData
            });
        } catch (spotifyError) {
            console.error("Error fetching Spotify data:", spotifyError);
            return NextResponse.json(
                {
                    success: false,
                    error: "Failed to fetch Spotify data",
                    details: spotifyError instanceof Error ? spotifyError.message : "Unknown error"
                },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error("Error in proof generation endpoint:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}