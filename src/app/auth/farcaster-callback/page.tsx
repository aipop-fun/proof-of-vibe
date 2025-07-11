/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '~/lib/stores/authStore';
import { signIn } from 'next-auth/react';

export default function FarcasterCallback() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isProcessing, setIsProcessing] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Access the auth store
    const { setFarcasterAuth } = useAuthStore();

    useEffect(() => {
        async function processAuthData() {
            try {
                // Extract parameters from URL
                const fidParam = searchParams.get('fid');
                const username = searchParams.get('username');
                const displayName = searchParams.get('display_name');
                const message = searchParams.get('message');
                const signature = searchParams.get('signature');

                if (!fidParam || !message || !signature) {
                    throw new Error('Missing required authentication parameters');
                }

                const fid = parseInt(fidParam, 10);
                if (isNaN(fid)) {
                    throw new Error('Invalid FID format');
                }

                // Fetch user profile if we don't have displayName or username
                let userDisplayName = displayName;
                let userUsername = username;

                if (!userDisplayName || !userUsername) {
                    try {
                        const response = await fetch(`/api/neynar/search?query=${fid}`);
                        if (response.ok) {
                            const data = await response.json();
                            if (data.users && data.users.length > 0) {
                                const userData = data.users[0];
                                userDisplayName = userData.displayName || displayName;
                                userUsername = userData.username || username;
                            }
                        }
                    } catch (fetchError) {
                        console.error("Error fetching user profile:", fetchError);
                        // Continue with authentication even if profile fetch fails
                    }
                }

                // Save Farcaster auth data in the store
                setFarcasterAuth({
                    fid,
                    username: userUsername,
                    displayName: userDisplayName
                });

                // Complete NextAuth authentication
                const authResult = await signIn("credentials", {
                    message,
                    signature,
                    redirect: false,
                });

                if (authResult?.error) {
                    throw new Error(authResult.error);
                }

                // Redirect to dashboard
                router.push('/');
            } catch (error) {
                console.error('Error processing authentication:', error);
                setError(error instanceof Error ? error.message : 'Authentication failed');
                setIsProcessing(false);
            }
        }

        processAuthData();
    }, [searchParams, router, setFarcasterAuth]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-purple-900 to-black text-white p-4">
            <div className="max-w-md w-full bg-black/50 p-8 rounded-xl shadow-lg backdrop-blur text-center">
                {isProcessing ? (
                    <>
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-6"></div>
                        <h1 className="text-xl font-bold mb-2">Completing Sign In</h1>
                        <p className="text-gray-300">Please wait while we complete the authentication process...</p>
                    </>
                ) : error ? (
                    <>
                        <div className="w-12 h-12 bg-red-600/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold mb-2">Authentication Error</h1>
                        <p className="text-red-400 mb-4">{error}</p>
                        <button
                            onClick={() => router.push('/auth/signin')}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"
                        >
                            Return to Sign In
                        </button>
                    </>
                ) : (
                    <>
                        <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold mb-2">Successfully Signed In!</h1>
                        <p className="text-gray-300 mb-4">You have successfully signed in with Farcaster.</p>
                        <button
                            onClick={() => router.push('/')}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"
                        >
                            Continue to Dashboard
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}