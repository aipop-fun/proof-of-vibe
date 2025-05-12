// src/components/ProofGenerator.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "~/components/ui/Button";
import { useAuthStore } from "~/lib/stores/authStore";
import { VerifiableSpotifyData } from "~/lib/tlsnotary";
import { useFrame } from "./providers/FrameProvider";
import sdk from "@farcaster/frame-sdk";

interface ProofGeneratorProps {
    endpoint: string;
    label: string;
    description: string;
    className?: string;
}

export function ProofGenerator({
    endpoint,
    label,
    description,
    className = "",
}: ProofGeneratorProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedProof, setGeneratedProof] = useState<VerifiableSpotifyData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { isMiniApp } = useFrame();

    // Access auth store
    const {
        accessToken,
        spotifyId,
        fid,
        isAuthenticated,
        isExpired,
    } = useAuthStore();

    // Reset error when dependencies change
    useEffect(() => {
        setError(null);
    }, [endpoint, accessToken, spotifyId, fid]);

    const generateProof = async () => {
        // Validate requirements
        if (!isAuthenticated) {
            setError("You must be authenticated to generate a proof");
            return;
        }

        if (isExpired()) {
            setError("Your session has expired. Please sign in again.");
            return;
        }

        if (!accessToken) {
            setError("No access token available");
            return;
        }

        try {
            setIsGenerating(true);
            setError(null);

            // Create a unique user ID
            const userId = `${fid || ""}:${spotifyId || ""}:${Date.now()}`;

            // Call the API to generate the proof
            const response = await fetch("/api/proofs/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    userId,
                    fid,
                    spotifyId,
                    endpoint,
                    accessToken,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Failed to generate proof");
            }

            // Store the generated proof
            setGeneratedProof(data.data);
        } catch (error) {
            console.error("Error generating proof:", error);
            setError(error instanceof Error ? error.message : "Unknown error");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleShare = () => {
        if (!generatedProof) return;

        // Create the verification URL
        const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
        const verifyUrl = `${baseUrl}/verify-proof/${generatedProof.proofId}`;

        // Create a share message
        const shareMessage = `🎵 I've generated a cryptographic proof of my Spotify ${endpoint} data using Proof of Vibes! Verify it here:`;

        // Share via Farcaster when in mini app
        if (isMiniApp && typeof sdk?.actions?.composeCast === "function") {
            sdk.actions.composeCast({
                text: shareMessage,
                embeds: [verifyUrl],
            });
        } else {
            // For regular web, open compose URL
            const encodedMessage = encodeURIComponent(shareMessage);
            const encodedUrl = encodeURIComponent(verifyUrl);
            window.open(
                `https://warpcast.com/~/compose?text=${encodedMessage}&embeds=${encodedUrl}`,
                "_blank"
            );
        }
    };

    return (
        <div className={`bg-purple-800/20 rounded-lg p-4 ${className}`}>
            <h3 className="font-medium mb-2">{label}</h3>
            <p className="text-sm text-gray-300 mb-4">{description}</p>

            {error && (
                <div className="bg-red-900/30 text-red-200 p-3 rounded mb-4 text-sm">
                    {error}
                </div>
            )}

            {generatedProof ? (
                <div className="space-y-4">
                    <div className="bg-green-900/30 p-3 rounded text-sm">
                        <p className="font-medium text-green-400">✓ Proof generated successfully!</p>
                        <p className="text-gray-300 mt-1">
                            Proof ID: {generatedProof.proofId}
                        </p>
                        <p className="text-gray-300">
                            Generated: {new Date(generatedProof.timestamp).toLocaleString()}
                        </p>
                    </div>

                    <div className="flex space-x-2">
                        <Button
                            onClick={handleShare}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            Share on Farcaster
                        </Button>
                        <Button
                            onClick={() => setGeneratedProof(null)}
                            className="bg-transparent border border-purple-600 hover:bg-purple-900/40"
                        >
                            Generate New Proof
                        </Button>
                    </div>
                </div>
            ) : (
                <Button
                    onClick={generateProof}
                    disabled={isGenerating || !isAuthenticated || isExpired()}
                    className="bg-purple-600 hover:bg-purple-700"
                >
                    {isGenerating ? "Generating..." : "Generate Proof"}
                </Button>
            )}
        </div>
    );
}