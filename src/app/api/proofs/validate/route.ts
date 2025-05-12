import { NextRequest, NextResponse } from "next/server";
import { validateVerifiableData } from "~/lib/tlsnotary";

/**
 * API endpoint to validate TLSNotary proofs
 * This validates the authenticity of Spotify data proofs
 */
export async function POST(request: NextRequest) {
    try {
        // Parse request
        const body = await request.json();
        const { verifiableData } = body;

        // Validate required parameters
        if (!verifiableData) {
            return NextResponse.json(
                { success: false, error: "Missing verifiable data" },
                { status: 400 }
            );
        }

        // Validate the provided data
        const isValid = validateVerifiableData(verifiableData);

        if (isValid) {
            return NextResponse.json({
                success: true,
                valid: true,
                message: "Data verification successful",
                metadata: {
                    proofId: verifiableData.proofId,
                    timestamp: new Date(verifiableData.timestamp).toISOString(),
                    endpoint: verifiableData.endpoint,
                    userId: verifiableData.userId,
                    fid: verifiableData.fid,
                    spotifyId: verifiableData.spotifyId
                }
            });
        } else {
            return NextResponse.json({
                success: true,
                valid: false,
                message: "Data verification failed"
            });
        }
    } catch (error) {
        console.error("Error in proof validation endpoint:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * API endpoint to fetch and validate a proof by ID
 */
export async function GET(request: NextRequest) {
    try {
        // Get the proof ID from the URL or query parameters
        const { searchParams } = new URL(request.url);
        const proofId = searchParams.get('proofId');

        if (!proofId) {
            return NextResponse.json(
                { success: false, error: "Missing proof ID" },
                { status: 400 }
            );
        }

        // In a real implementation, this would retrieve the proof from a database
        // For now, we'll return a not found response
        return NextResponse.json(
            { success: false, error: "Proof not found" },
            { status: 404 }
        );
    } catch (error) {
        console.error("Error in proof validation endpoint:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}