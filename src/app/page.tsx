/* eslint-disable @typescript-eslint/no-unused-vars, react/no-unescaped-entities */
"use client";

import { useEffect, useState } from "react";
import { useFrame } from "~/components/providers/FrameProvider";
import { useSession } from "next-auth/react";
import { Dashboard } from "~/components/Dashboard";
import { MusicProvider } from "~/components/MusicContext";
import { Button } from "~/components/ui/Button";
import { useRouter } from "next/navigation";
import { useAuthStore } from "~/lib/stores/authStore";
import { sdk } from '@farcaster/miniapp-sdk';

export default function App() {
  const { isSDKLoaded, context } = useFrame();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  
  const { isAuthenticated, isExpired, accessToken, isLinked } = useAuthStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  
  useEffect(() => {
    const initMiniApp = async () => {
      try {
        const isMiniApp = await sdk.isInMiniApp();
        if (isMiniApp) {
          await sdk.actions.ready();
          console.log("Mini App is ready");
        }
      } catch (error) {
        console.error("Error initializing Mini App:", error);
      }
    };

    if (!isLoading) {
      initMiniApp();
    }
  }, [isLoading]);

  
  useEffect(() => {
    console.log("Auth status:", {
      zustandAuth: isAuthenticated,
      nextAuthStatus: status,
      expired: isExpired() ? "yes" : "no",
      hasAccessToken: !!accessToken
    });
  }, [isAuthenticated, status, isExpired, accessToken]);

  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log("Not authenticated via Zustand, redirecting to sign-in");
      router.push('/auth/signin');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isSDKLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-purple-900 to-black text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 animate-pulse">Timbra</h1>
          <p className="animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-purple-900 to-black text-white px-4">
        <div className="text-center max-w-md w-full">
          <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-300 bg-clip-text text-transparent">
            Timbra
          </h1>
          <p className="mb-8 text-purple-100">Connect your Spotify and Farcaster to share your musical vibes.</p>
          <div className="mb-8 bg-purple-800/30 p-6 rounded-2xl border border-purple-700/50">
            <h2 className="text-xl font-semibold mb-2 text-purple-50">Authentic Music Verification</h2>
            <p className="mb-4 text-sm text-purple-200">
              Timbra uses TLSNotary to create verifiable proofs of your Spotify activity.
              Explore and validate others' music taste without compromising privacy.
            </p>
            <Button
              onClick={() => router.push('/verify-proof')}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 
                        shadow-lg hover:shadow-purple-500/30 transition-all duration-300 rounded-xl py-5 text-md"
            >
              🎵 Explore Proofs
            </Button>
          </div>

          <Button
            onClick={() => router.push('/auth/signin')}
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 
                      shadow-xl hover:shadow-purple-500/30 transition-transform duration-300 rounded-xl py-5 text-md
                      transform hover:scale-105"
          >
            Get Started →
          </Button>
        </div>
      </div>
    );
  }

  
  return (
    <div
      className="flex flex-col min-h-screen bg-gradient-to-b from-purple-900 to-black text-white"
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      }}
    >
      <MusicProvider>
        <Dashboard />
        {isAuthenticated && isLinked && (
          <div className="fixed bottom-20 right-4 animate-bounce">
            <Button
              onClick={() => router.push('/generate-proof')}
              className="rounded-full h-14 w-14 flex items-center justify-center 
                        bg-gradient-to-br from-purple-500 to-pink-500 shadow-2xl hover:shadow-purple-500/40
                        transition-transform duration-200 hover:scale-110"
              title="Generate Proof"
            >
              <span className="text-xl">✨</span>
            </Button>
          </div>
        )}
      </MusicProvider>
    </div>
  );
}