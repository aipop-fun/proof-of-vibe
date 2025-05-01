"use client";

import { useEffect, useState } from "react";
import { useFrame } from "~/components/providers/FrameProvider";
import { useSession } from "next-auth/react";
import { SignInWithFarcaster } from "~/components/SignInWithFarcaster";
import { Dashboard } from "~/components/Dashboard";
import { MusicProvider } from "~/components/MusicContext";
import { Session } from "next-auth";

export default function App() {
  const { isSDKLoaded, context } = useFrame();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {    
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

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

      {status === "authenticated" ? (
        <div className="flex flex-col items-center justify-center flex-grow px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">Proof of Vibes</h1>
          <p className="text-center mb-8">Connect your Farcaster account to see what your friends are listening to</p>
          <SignInWithFarcaster />
        </div>
      ) : (
        <MusicProvider>
          <Dashboard session={session as unknown as Session} />
        </MusicProvider>
      )}
    </div>
  );
}