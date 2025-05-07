/* eslint-disable react/no-unescaped-entities,  @typescript-eslint/no-unused-vars, @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "~/components/ui/Button";
import { SignInWithFarcaster } from "~/components/SignInWithFarcaster";
import { useAuthStore } from "~/lib/stores/authStore";
import sdk from "@farcaster/frame-sdk";

interface LinkAccountsResponse {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    fid: number;
    spotifyId: string;
    displayName?: string;
    isLinked: boolean;
  };
}

export function AccountLinking() {
  const { data: session, status, update } = useSession();
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isMiniApp, setIsMiniApp] = useState(false);

  // Use Zustand store
  const { spotifyId, fid, isAuthenticated, setLinkedStatus } = useAuthStore();

  // Check if running in Farcaster mini app
  useEffect(() => {
    const checkEnvironment = () => {
      const isFarcasterMiniApp = window.parent !== window ||
        !!window.location.href.match(/fc-frame=|warpcast\.com/i);
      setIsMiniApp(isFarcasterMiniApp);
    };

    checkEnvironment();
  }, []);

  // Check if user has both accounts but they're not linked
  const needsLinking = (
    (session?.user?.fid || fid) &&
    (session?.user?.spotifyId || spotifyId) &&
    !session?.user?.isLinked
  );

  // Check if user has only one type of account
  const hasOnlyFarcaster = (session?.user?.fid || fid) &&
    !(session?.user?.spotifyId || spotifyId);

  const hasOnlySpotify = (session?.user?.spotifyId || spotifyId) &&
    !(session?.user?.fid || fid);

  // Function to link accounts
  const handleLinkAccounts = async () => {
    // Get FID and Spotify ID from session or Zustand store
    const userFid = session?.user?.fid || fid;
    const userSpotifyId = session?.user?.spotifyId || spotifyId;

    if (!userFid || !userSpotifyId) {
      setLinkError("Missing Farcaster ID or Spotify ID");
      return;
    }

    try {
      setIsLinking(true);
      setLinkError(null);

      // Call API to link accounts
      const response = await fetch('/api/auth/link-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fid: userFid,
          spotifyId: userSpotifyId,
        }),
      });

      const data = await response.json() as LinkAccountsResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to link accounts');
      }

      // Update session to reflect linked accounts
      if (session) {
        await update({
          ...session,
          user: {
            ...session.user,
            isLinked: true,
          },
        });
      }

      // If we're in a mini app, notify the frame when accounts are linked
      if (isMiniApp && typeof sdk?.actions?.ready === 'function') {
        try {
          await sdk.actions.ready();
        } catch (readyError) {
          console.error("Error calling ready after linking accounts:", readyError);
        }
      }

    } catch (error) {
      console.error('Error linking accounts:', error);
      setLinkError(error instanceof Error ? error.message : 'Failed to link accounts');
    } finally {
      setIsLinking(false);
    }
  };

  // Function to initiate Spotify login
  const handleConnectSpotify = async () => {
    await signIn('spotify');
  };

  // Display loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="p-4 bg-purple-800/20 rounded-lg mb-4 animate-pulse">
        <p className="text-center">Loading account information...</p>
      </div>
    );
  }

  // Don't show if not authenticated
  if (!isAuthenticated && !session) {
    return null;
  }

  // If accounts are linked, show success message
  if (session?.user?.isLinked) {
    return (
      <div className="p-4 bg-green-800/20 rounded-lg mb-4">
        <div className="flex items-center">
          <div className="flex-1">
            <p className="font-medium">Accounts Linked!</p>
            <p className="text-sm text-gray-300">Your Spotify and Farcaster accounts are successfully connected.</p>
          </div>
          <div>
            <Button
              onClick={() => signOut()}
              className="text-xs bg-transparent hover:bg-purple-800 border border-purple-600"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If accounts need to be linked
  if (needsLinking) {
    return (
      <div className="p-4 bg-yellow-800/20 rounded-lg mb-4">
        <p className="font-medium mb-2">Connect Your Accounts</p>
        <p className="text-sm text-gray-300 mb-4">
          You're signed in with both Spotify and Farcaster, but they're not linked yet.
          Link them to share your music with friends.
        </p>

        {linkError && (
          <div className="p-2 mb-4 bg-red-900/30 text-red-200 rounded-md text-sm">
            {linkError}
          </div>
        )}

        <Button
          onClick={handleLinkAccounts}
          disabled={isLinking}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {isLinking ? "Linking..." : "Link Accounts"}
        </Button>
      </div>
    );
  }

  // Has only Farcaster - needs Spotify
  if (hasOnlyFarcaster) {
    return (
      <div className="p-4 bg-blue-800/20 rounded-lg mb-4">
        <p className="font-medium mb-2">Connect Spotify</p>
        <p className="text-sm text-gray-300 mb-4">
          You're signed in with Farcaster. Connect your Spotify account to share your music.
        </p>

        <Button
          onClick={handleConnectSpotify}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          <SpotifyIcon className="w-4 h-4 mr-2" />
          Connect Spotify
        </Button>
      </div>
    );
  }

  // Has only Spotify - needs Farcaster
  if (hasOnlySpotify) {
    return (
      <div className="p-4 bg-blue-800/20 rounded-lg mb-4">
        <p className="font-medium mb-2">Connect Farcaster</p>
        <p className="text-sm text-gray-300 mb-4">
          You're signed in with Spotify. Connect your Farcaster account to share your music.
        </p>

        <SignInWithFarcaster />
      </div>
    );
  }

  // Default case - shouldn't reach here
  return null;
}

// Spotify icon component
function SpotifyIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.5 17.3c-.2.3-.6.5-1 .5-.2 0-.4-.1-.6-.2-2.1-1.3-4.8-1.5-7.9-.9-.4.1-.8-.1-.9-.5-.1-.4.1-.8.5-.9 3.5-.8 6.5-.5 9 1 .4.2.5.7.2 1zm1.5-3.2c-.3.4-.8.6-1.2.6-.3 0-.5-.1-.7-.2-2.4-1.5-6-1.9-8.8-1-.4.1-.9-.1-1-.5-.1-.4.1-.9.5-1 3.2-1 7.2-.5 10 1.2.4.3.6.8.3 1.2v-.3zm.1-3.3c-2.9-1.7-7.6-1.9-10.3-1-.4.1-1-.1-1.1-.6-.1-.5.1-1 .6-1.1 3.1-1 8.3-.8 11.6 1.2.5.3.7.9.4 1.4-.3.4-.9.6-1.4.4l.2-.3z" />
    </svg>
  );
}