/* eslint-disable  @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useState } from "react";
import { useFrame } from "~/components/providers/FrameProvider";
import { useSession } from "next-auth/react";
import { Dashboard } from "~/components/Dashboard";
import { MusicProvider } from "~/components/MusicContext";
import { Button } from "~/components/ui/Button";
import { useRouter } from "next/navigation";
import { useAuthStore } from "~/lib/stores/authStore";

export default function App() {
  const { isSDKLoaded, context } = useFrame();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // Use our Zustand auth store
  const { isAuthenticated, isExpired, accessToken } = useAuthStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Debug logging
  useEffect(() => {
    console.log("Auth status:", {
      zustandAuth: isAuthenticated,
      nextAuthStatus: status,
      expired: isExpired() ? "yes" : "no",
      hasAccessToken: !!accessToken
    });
  }, [isAuthenticated, status, isExpired, accessToken]);

  // Redirect to sign-in page if not authenticated via Zustand
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
          <h1 className="text-2xl font-bold mb-4">Proof of Vibes</h1>
          <p className="animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated via Zustand, show a button to go to sign-in page
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-purple-900 to-black text-white px-4">
        <div className="text-center max-w-md w-full">
          <h1 className="text-3xl font-bold mb-6">Proof of Vibes</h1>
          <p className="mb-8">Connect your Spotify and Farcaster accounts to share your music with friends on Farcaster.</p>
          <Button
            onClick={() => router.push('/auth/signin')}
            className="w-full bg-purple-600 hover:bg-purple-700 py-3"
          >
            Get Started
          </Button>
        </div>
      </div>
    );
  }

  // If authenticated, show the dashboard
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
      </MusicProvider>
    </div>
  );
}