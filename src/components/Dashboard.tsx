// src/components/Dashboard.tsx
/* eslint-disable  @typescript-eslint/no-unused-vars, @typescript-eslint/ban-ts-comment */

//@ts-nocheck
// src/components/Dashboard.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useMusic } from "./MusicContext";
import { FriendsListening } from "./FriendsListening";
import { TopWeeklyTracks } from "./TopWeeklyTracks";
import { Button } from "~/components/ui/Button";
import sdk from "@farcaster/frame-sdk";
import { AccountOnboarding } from "./AccountOnboarding"; // Import the new onboarding component
import { AccountLinking } from "./AccountLinking";
import { AccountStatus } from "./AccountStatus"; // Import the status component
import { PersonalMusic } from "./PersonalMusic";
import { useAuthStore } from "~/lib/stores/authStore";
import { useFrame } from "./providers/FrameProvider";

export function Dashboard() {
  const {
    loading = { friends: false, weekly: false },
    error = null,
    connectSpotify,
    refreshData
  } = useMusic();

  const { data: session } = useSession();
  const [tab, setTab] = useState<"current" | "weekly">("current");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAccountSetup, setShowAccountSetup] = useState(false);

  // Get context from FrameProvider
  const { isMiniApp, context } = useFrame();

  // Use Zustand store
  const {
    spotifyId,
    spotifyUser,
    fid,
    clearAuth,
    isAuthenticated,
    isLinked
  } = useAuthStore();

  // Show account setup section when not fully configured
  useEffect(() => {
    if (isAuthenticated && !isLinked) {
      setShowAccountSetup(true);
    } else {
      setShowAccountSetup(false);
    }
  }, [isAuthenticated, isLinked]);

  // Initialize SDK if in mini app
  useEffect(() => {
    const initializeInMiniApp = async () => {
      if (isMiniApp && typeof sdk?.actions?.ready === 'function') {
        try {
          await sdk.actions.ready();
        } catch (readyError) {
          console.error("Error calling ready in Dashboard:", readyError);
        }
      }
    };

    initializeInMiniApp();
  }, [isMiniApp]);

  const handleSignOut = async () => {
    // Clear the Zustand store
    clearAuth();
    // Also sign out from NextAuth if session exists
    if (session) {
      await signOut({ redirect: false });
    }
    // Redirect to sign-in page
    window.location.href = '/auth/signin';
  };

  const handleShare = () => {
    if (typeof sdk?.actions?.openUrl === 'function') {
      sdk.actions.openUrl("https://warpcast.com/~/compose?text=Check%20out%20what%20my%20friends%20are%20listening%20to%20on%20Proof%20of%20Vibes!");
    } else {
      // Fallback for regular web browser
      window.open("https://warpcast.com/~/compose?text=Check%20out%20what%20my%20friends%20are%20listening%20to%20on%20Proof%20of%20Vibes!", "_blank");
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshData();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Type the TabButton component props
  interface TabButtonProps {
    id: "current" | "weekly";
    label: string;
  }

  const TabButton = ({ id, label }: TabButtonProps) => (
    <button
      className={`px-4 py-2 rounded-t-lg ${tab === id
        ? "bg-purple-800 text-white"
        : "bg-purple-950 text-gray-300 hover:bg-purple-900"
        }`}
      onClick={() => setTab(id)}
    >
      {label}
    </button>
  );

  // Safely extract user information with fallbacks using Zustand
  const userName = spotifyUser?.name || "Vibe Friend";
  const fidString = fid ? String(fid) : "";

  return (
    <div
      className="flex flex-col min-h-screen w-full max-w-md mx-auto"
      style={isMiniApp ? {
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      } : {}}
    >
      {/* Header */}
      <div className="px-4 py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Proof of Vibes</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || loading.friends || loading.weekly}
              className="p-2 text-sm rounded-full hover:bg-purple-800"
            >
              ↻
            </button>
            <button
              onClick={handleShare}
              className="p-2 text-sm rounded-full hover:bg-purple-800"
            >
              Share
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center">
          <div className="w-10 h-10 rounded-full bg-purple-700 flex items-center justify-center">
            {userName.charAt(0)}
          </div>
          <div className="ml-3">
            <p className="font-medium">{userName}</p>
            <div className="flex text-xs text-gray-300">
              {fidString && (
                <span className="mr-2">FID: {fidString}</span>
              )}
              {spotifyId && (
                <span className="bg-green-800/50 px-1 rounded text-xs">Spotify Connected</span>
              )}
            </div>
          </div>
          <div className="ml-auto">
            {!spotifyId && (
              <Button
                onClick={connectSpotify}
                className="text-xs px-3 py-1 bg-green-600 hover:bg-green-700 rounded-full"
              >
                Connect Spotify
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Account Status Display */}
      <div className="px-4">
        <AccountStatus />
      </div>

      {/* Account Setup Section - only shown when needed */}
      {showAccountSetup && (
        <div className="px-4">
          <AccountOnboarding />
        </div>
      )}

      {/* Account Linking Section - used if onboarding is not shown */}
      {!showAccountSetup && !isLinked && (
        <div className="px-4">
          <AccountLinking />
        </div>
      )}

      {/* Personal Music Section - only displays when user has Spotify connected */}
      <div className="px-4">
        <PersonalMusic />
      </div>

      {/* Tab navigation - only show in standard view, not in mini app */}
      {!isMiniApp && (
        <div className="flex border-b border-purple-800">
          <TabButton id="current" label="Friends Listening" />
          <TabButton id="weekly" label="Top Weekly" />
        </div>
      )}

      {/* Content area */}
      <div className="flex-grow p-4">
        {error && (
          <div className="bg-red-900/30 text-red-200 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* In mini app mode, always show FriendsListening */}
        {isMiniApp ? (
          <FriendsListening isLoading={loading.friends} />
        ) : (
          // In normal web mode, show based on selected tab
          tab === "current" ? (
            <FriendsListening isLoading={loading.friends} />
          ) : (
            <TopWeeklyTracks isLoading={loading.weekly} />
          )
        )}
      </div>

      {/* Footer with account linking status */}
      <div className="p-4 flex justify-between items-center">
        <div className="text-xs text-gray-400">
          {isLinked ? (
            <span className="flex items-center text-green-400">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
              Accounts Linked
            </span>
          ) : (
            <span className="flex items-center">
              <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></span>
              Accounts Not Linked
            </span>
          )}
        </div>

        {/* Don't show sign out button in mini app mode */}
        {!isMiniApp && (
          <Button
            onClick={handleSignOut}
            className="text-xs px-3 py-1 bg-transparent hover:bg-purple-800 border border-purple-600"
          >
            Sign Out
          </Button>
        )}
      </div>
    </div>
  );
}