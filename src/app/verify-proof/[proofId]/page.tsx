/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "~/components/ui/Button";
import { ProofVerifier } from "~/components/ProofVerifier";
import { useFrame } from "~/components/providers/FrameProvider";
import { VerifiableSpotifyData } from "~/lib/tlsnotary";

export default function VerifyProofByIdPage() {
    const router = useRouter();
    const params = useParams();
    const { isMiniApp, context } = useFrame();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [proofData, setProofData] = useState<VerifiableSpotifyData | null>(null);

    // Get the proof ID from URL parameters
    const proofId = params?.proofId as string;

    // Fetch proof data on component mount
    useEffect(() => {
        const fetchProofData = async () => {
            try {
                if (!proofId) {
                    setError("Invalid proof ID");
                    setIsLoading(false);
                    return;
                }

                // Call API to fetch proof data by ID
                const response = await fetch(`/api/proofs/validate?proofId=${proofId}`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Failed to fetch proof data");
                }

                if (data.success && data.proof) {
                    setProofData(data.proof);
                } else {
                    setError("Proof not found");
                }
            } catch (error) {
                console.error("Error fetching proof data:", error);
                setError(error instanceof Error ? error.message : "Unknown error");
            } finally {
                setIsLoading(false);
            }
        };

        fetchProofData();
    }, [proofId]);

    // If loading, show loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-b from-purple-900 to-black text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Timbra</h1>
                    <p className="animate-pulse">Loading proof data...</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="flex flex-col min-h-screen bg-gradient-to-b from-purple-900 to-black text-white"
            style={isMiniApp ? {
                paddingTop: context?.client.safeAreaInsets?.top ?? 0,
                paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
                paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
                paddingRight: context?.client.safeAreaInsets?.right ?? 0,
            } : {}}
        >
            <div className="container mx-auto max-w-md p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Verify Proof</h1>
                    <Button
                        onClick={() => router.push('/verify-proof')}
                        className="text-sm px-3 py-1 bg-transparent border border-purple-600 hover:bg-purple-900/30"
                    >
                        Back
                    </Button>
                </div>

                {error ? (
                    <div className="bg-red-900/30 text-red-200 p-4 rounded-lg mb-6">
                        <h2 className="font-semibold mb-2">Error</h2>
                        <p>{error}</p>
                        <Button
                            onClick={() => router.push('/verify-proof')}
                            className="mt-4 bg-red-700 hover:bg-red-800"
                        >
                            Try Another Proof
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-purple-800/30 rounded-lg p-4">
                            <h2 className="font-semibold mb-2">Verifying Proof: {proofId}</h2>
                            <p className="text-sm text-gray-300">
                                You're verifying a specific proof of Spotify data. The verification process
                                will check the cryptographic signature to ensure the data is authentic.
                            </p>
                        </div>

                        {proofData && <ProofVerifier initialProofData={proofData} />}

                        <div className="mt-4">
                            <Button
                                onClick={() => router.push('/generate-proof')}
                                className="bg-purple-600 hover:bg-purple-700 w-full"
                            >
                                Generate Your Own Proof
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}