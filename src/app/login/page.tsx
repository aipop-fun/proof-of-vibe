/* eslint-disable react/no-unescaped-entities, @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { SignInButton } from '@farcaster/auth-kit';
import  isInMiniApp  from '@farcaster/frame-sdk';
import { useRouter } from 'next/navigation';
import { useUserStore } from '~/lib/stores/userStore';

export default function LoginPage() {
    const [isMiniApp, setIsMiniApp] = useState<boolean | null>(null);
    const { isAuthenticated } = useUserStore();
    const router = useRouter();

    // Check environment and redirect if already authenticated
    useEffect(() => {
        async function initPage() {
            try {
                // Check if in mini app
                const miniAppResult = await isInMiniApp();
                setIsMiniApp(miniAppResult);

                // If authenticated, redirect to home page
                if (isAuthenticated) {
                    router.push('/');
                }
            } catch (error) {
                console.error('Error initializing login page:', error);
                setIsMiniApp(false);
            }
        }

        initPage();
    }, [isAuthenticated, router]);

    // If loading environment check, show loading state
    if (isMiniApp === null) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    // If in mini app, show information message
    if (isMiniApp) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
                <h1 className="text-2xl font-bold mb-4">Already Signed In</h1>
                <p className="mb-4">
                    In Farcaster Mini App mode, you're automatically signed in with your Farcaster account.
                </p>
                <button
                    onClick={() => router.push('/')}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full font-medium"
                >
                    Go to Home
                </button>
            </div>
        );
    }

    // Regular web experience with SignInButton from auth-kit
    return (
        <div className="flex flex-col items-center justify-center h-screen p-4">
            <h1 className="text-2xl font-bold mb-6">Sign in to Timbra</h1>

            <div className="mb-8">
                <SignInButton />
            </div>

            <div className="mb-4">
                <p className="text-center text-gray-600 mb-4">- or -</p>
                <button
                    onClick={() => router.push('/spotify-login')}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full font-medium"
                >
                    Sign in with Spotify
                </button>
            </div>

            <p className="text-sm text-gray-500 max-w-md text-center mt-6">
                Connect your Farcaster and Spotify accounts to share your music with friends on Farcaster.
            </p>
        </div>
    );
}