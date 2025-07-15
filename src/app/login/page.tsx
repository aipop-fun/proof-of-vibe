/* eslint-disable react/no-unescaped-entities, @typescript-eslint/ban-ts-comment */
'use client';

import { useEffect, useState } from 'react';
import { SignInButton } from '@farcaster/auth-kit';
import { sdk } from '@farcaster/miniapp-sdk';
import { useRouter } from 'next/navigation';
import { useUserStore } from '~/lib/stores/userStore';

export default function LoginPage() {
    const [isMiniApp, setIsMiniApp] = useState<boolean | null>(null);
    const { isAuthenticated } = useUserStore();
    const router = useRouter();

    useEffect(() => {
        async function initPage() {
            try {
                const miniAppResult = await sdk.isInMiniApp();
                setIsMiniApp(miniAppResult);
                
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

    
    if (isMiniApp === null) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    
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