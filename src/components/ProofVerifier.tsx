/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Button } from "~/components/ui/Button";
import { VerifiableSpotifyData } from "~/lib/tlsnotary";

interface ProofVerifierProps {
    initialProofData?: VerifiableSpotifyData;
    className?: string;
}

export function ProofVerifier({
    initialProofData,
    className = "",
}: ProofVerifierProps) {
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState<{
        valid: boolean;
        message: string;
        metadata?: any;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [proofData, setProofData] = useState<VerifiableSpotifyData | undefined>(
        initialProofData
    );

    const handleVerify = async () => {
        if (!proofData) {
            setError("No proof data to verify");
            return;
        }

        try {
            setIsVerifying(true);
            setError(null);

            // Call the API to verify the proof
            const response = await fetch("/api/proofs/validate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    verifiableData: proofData,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Failed to verify proof");
            }

            // Store the verification result
            setVerificationResult({
                valid: data.valid,
                message: data.message,
                metadata: data.metadata,
            });
        } catch (error) {
            console.error("Error verifying proof:", error);
            setError(error instanceof Error ? error.message : "Unknown error");
        } finally {
            setIsVerifying(false);
        }
    };

    // Handle file upload for proof data
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result;
                if (typeof content !== "string") return;

                const parsedData = JSON.parse(content) as VerifiableSpotifyData;
                setProofData(parsedData);
                setVerificationResult(null);
                setError(null);
            } catch (error) {
                setError("Invalid proof file format");
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className={`bg-purple-800/20 rounded-lg p-4 ${className}`}>
            <h3 className="font-medium mb-2">Verify Spotify Data Proof</h3>
            <p className="text-sm text-gray-300 mb-4">
                Verify the authenticity of a Spotify data proof using TLSNotary
            </p>

            {error && (
                <div className="bg-red-900/30 text-red-200 p-3 rounded mb-4 text-sm">
                    {error}
                </div>
            )}

            {!proofData ? (
                <div className="space-y-4">
                    <p className="text-sm">
                        Upload a proof file to verify its authenticity
                    </p>
                    <input
                        type="file"
                        accept=".json"
                        onChange={handleFileUpload}
                        className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                    />
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="bg-purple-900/30 p-3 rounded text-sm">
                        <p className="font-medium">Proof Details</p>
                        <p className="text-gray-300">
                            ID: {proofData.proofId}
                        </p>
                        <p className="text-gray-300">
                            Generated: {new Date(proofData.timestamp).toLocaleString()}
                        </p>
                        <p className="text-gray-300">
                            Endpoint: {proofData.endpoint}
                        </p>
                        {proofData.fid && (
                            <p className="text-gray-300">
                                Farcaster ID: {proofData.fid}
                            </p>
                        )}
                    </div>

                    {verificationResult ? (
                        <div
                            className={`p-3 rounded text-sm ${verificationResult.valid
                                    ? "bg-green-900/30 text-green-400"
                                    : "bg-red-900/30 text-red-200"
                                }`}
                        >
                            <p className="font-medium">
                                {verificationResult.valid ? "✓ Verification Successful" : "✗ Verification Failed"}
                            </p>
                            <p className="text-gray-300 mt-1">{verificationResult.message}</p>

                            {verificationResult.valid && verificationResult.metadata && (
                                <div className="mt-2">
                                    <p className="text-gray-300">
                                        Verified at: {new Date().toLocaleString()}
                                    </p>
                                    <p className="text-gray-300">
                                        Original timestamp: {verificationResult.metadata.timestamp}
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Button
                            onClick={handleVerify}
                            disabled={isVerifying}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            {isVerifying ? "Verifying..." : "Verify Proof"}
                        </Button>
                    )}

                    {verificationResult && (
                        <Button
                            onClick={() => {
                                setProofData(undefined);
                                setVerificationResult(null);
                            }}
                            className="bg-transparent border border-purple-600 hover:bg-purple-900/40"
                        >
                            Verify Another Proof
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}