/* eslint-disable react/no-unescaped-entities */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/Button";
import { ProofVerifier } from "~/components/ProofVerifier";
import { useFrame } from "~/components/providers/FrameProvider";

export default function VerifyProofPage() {
    const router = useRouter();
    const { isMiniApp, context } = useFrame();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    // If loading, show loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-b from-purple-900 to-black text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Proof of Vibes</h1>
                    <p className="animate-pulse">Loading...</p>
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
                        onClick={() => router.push('/')}
                        className="text-sm px-3 py-1 bg-transparent border border-purple-600 hover:bg-purple-900/30"
                    >
                        Back
                    </Button>
                </div>

                <div className="mb-6 bg-purple-800/30 rounded-lg p-4">
                    <h2 className="font-semibold mb-2">Verify Spotify Data Proofs</h2>
                    <p className="text-sm text-gray-300">
                        This page allows you to verify the authenticity of Spotify data proofs
                        generated with TLSNotary. Upload a proof file or enter a proof ID to
                        verify that the data hasn't been tampered with.
                    </p>
                </div>

                <ProofVerifier className="mb-6" />

                <div className="mt-8 bg-purple-800/30 rounded-lg p-4">
                    <h3 className="font-medium mb-2">How Verification Works</h3>
                    <p className="text-sm text-gray-300">
                        TLSNotary verification checks that the proof was cryptographically generated
                        for authentic Spotify API data and hasn't been modified. The verification
                        process doesn't reveal any sensitive authentication information.
                    </p>

                    <div className="mt-4">
                        <Button
                            onClick={() => router.push('/generate-proof')}
                            className="bg-purple-600 hover:bg-purple-700 w-full"
                        >
                            Generate Your Own Proof
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}