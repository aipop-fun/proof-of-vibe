/* eslint-disable  react/no-unescaped-entities, @typescript-eslint/no-unused-vars  */
"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/Button";
import { SignInWithFarcaster } from "~/components/SignInWithFarcaster";

export default function SignIn() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // Redirect if already authenticated
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);
  
  const handleSpotifySignIn = async () => {
    setIsLoading(true);
    await signIn("spotify", { callbackUrl: "/" });
  };
  
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-purple-900 to-black text-white">
        <div className="p-8 max-w-md w-full bg-purple-800/20 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-center mb-6">Loading...</h1>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-purple-900 to-black text-white">
      <div className="p-8 max-w-md w-full bg-purple-800/20 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-6">Sign In to Proof of Vibes</h1>
        
        <div className="space-y-4">
          <div>
            <Button
              onClick={handleSpotifySignIn}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center"
            >
              <SpotifyIcon className="w-5 h-5 mr-2" />
              Sign in with Spotify
            </Button>
            <p className="text-xs text-center mt-2 text-gray-300">
              We recommend signing in with Spotify first
            </p>
          </div>
          
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-600"></div>
            <span className="flex-shrink mx-3 text-gray-400">or</span>
            <div className="flex-grow border-t border-gray-600"></div>
          </div>
          
          <div>
            <SignInWithFarcaster />
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-300">
            By signing in, you'll be able to link your Spotify and Farcaster accounts to share your music with friends.
          </p>
        </div>
      </div>
    </div>
  );
}

// Spotify icon component
function SpotifyIcon({ className = "" }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.5 17.3c-.2.3-.6.5-1 .5-.2 0-.4-.1-.6-.2-2.1-1.3-4.8-1.5-7.9-.9-.4.1-.8-.1-.9-.5-.1-.4.1-.8.5-.9 3.5-.8 6.5-.5 9 1 .4.2.5.7.2 1zm1.5-3.2c-.3.4-.8.6-1.2.6-.3 0-.5-.1-.7-.2-2.4-1.5-6-1.9-8.8-1-.4.1-.9-.1-1-.5-.1-.4.1-.9.5-1 3.2-1 7.2-.5 10 1.2.4.3.6.8.3 1.2v-.3zm.1-3.3c-2.9-1.7-7.6-1.9-10.3-1-.4.1-1-.1-1.1-.6-.1-.5.1-1 .6-1.1 3.1-1 8.3-.8 11.6 1.2.5.3.7.9.4 1.4-.3.4-.9.6-1.4.4l.2-.3z"/>
    </svg>
  );
}
