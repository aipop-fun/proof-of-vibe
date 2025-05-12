/* eslint-disable react/no-unescaped-entities,  @typescript-eslint/no-unused-vars */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "~/lib/stores/authStore";
import { ProofGenerator } from "~/components/ProofGenerator";
import { Button } from "~/components/ui/Button";
import { useFrame } from "~/components/providers/FrameProvider";

export default function GenerateProofPage() {
    const router = useRouter();
    const { isAuthenticated, isExpired } = useAuthStore();
    const { isMiniApp, context } = useFrame();
    const [isLoading, setIsLoading] = useState(true);

    // Check if user is authenticated
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1000);

        if (!isLoading && !isAuthenticated) {
            router.push('/auth/signin');
        }

        return () => clearTimeout(timer);
    }, [isLoading, isAuthenticated, router]);

    // If loading, show loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-b from-purple-900 to-black text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Timbra</h1>
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
                    <h1 className="text-2xl font-bold">Generate Proof</h1>
                    <Button
                        onClick={() => router.push('/')}
                        className="text-sm px-3 py-1 bg-transparent border border-purple-600 hover:bg-purple-900/30"
                    >
                        Back
                    </Button>
                </div>

                <div className="mb-6 bg-purple-800/30 rounded-lg p-4">
                    <h2 className="font-semibold mb-2">What is TLSNotary?</h2>
                    <p className="text-sm text-gray-300">
                        TLSNotary allows you to generate cryptographic proofs of your Spotify data
                        that can be verified by others without revealing your authentication credentials.
                        These proofs confirm the authenticity of your music listening data
                        while preserving your privacy.
                    </p>
                </div>

                <div className="space-y-6">
                    <ProofGenerator
                        endpoint="currently-playing"
                        label="Currently Playing"
                        description="Generate a proof of the track you're currently listening to on Spotify."
                    />

                    <ProofGenerator
                        endpoint="top-tracks/short_term"
                        label="Top Tracks (Recent)"
                        description="Generate a proof of your top tracks from the last 4 weeks."
                    />

                    <ProofGenerator
                        endpoint="top-tracks/medium_term"
                        label="Top Tracks (6 Months)"
                        description="Generate a proof of your top tracks from the last 6 months."
                    />

                    <ProofGenerator
                        endpoint="top-tracks/long_term"
                        label="Top Tracks (All Time)"
                        description="Generate a proof of your all-time top tracks."
                    />
                </div>

                <div className="mt-8 bg-purple-800/30 rounded-lg p-4">
                    <h3 className="font-medium mb-2">How to Share</h3>
                    <p className="text-sm text-gray-300">
                        After generating a proof, you can share it on Farcaster to let others verify your music data.
                        The proof includes a unique ID that others can use to validate your data's authenticity.
                    </p>

                    <div className="mt-4">
                        <Button
                            onClick={() => router.push('/verify-proof')}
                            className="bg-purple-600 hover:bg-purple-700 w-full"
                        >
                            Go to Verification Page
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}