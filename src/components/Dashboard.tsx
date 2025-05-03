/* eslint-disable  @typescript-eslint/no-unused-vars, @typescript-eslint/ban-ts-comment */

//@ts-nocheck
"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useMusic } from "./MusicContext";
import { FriendsListening } from "./FriendsListening";
import { TopWeeklyTracks } from "./TopWeeklyTracks";
import { Button } from "~/components/ui/Button";
import sdk from "@farcaster/frame-sdk";
import { AccountLinking } from "./AccountLinking";
import { PersonalMusic } from "./PersonalMusic";

export function Dashboard() {
  // Use default values from MusicContext to ensure type safety
  const {
    loading = { friends: false, weekly: false },
    error = null,
    connectSpotify,
    refreshData
  } = useMusic();

  const { data: session } = useSession();
  const [tab, setTab] = useState<"current" | "weekly">("current");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
  };

  const handleShare = () => {
    sdk.actions.openUrl("https://warpcast.com/~/compose?text=Check%20out%20what%20my%20friends%20are%20listening%20to%20on%20Proof%20of%20Vibes!");
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

  // Safely extract user information with fallbacks
  const userFid = session?.user?.fid ? String(session.user.fid) : "";
  const userName = session?.user?.name || "Vibe Friend";
  const spotifyId = session?.user?.spotifyId;
  const isLinked = session?.user?.isLinked;

  return (
    <div className="flex flex-col min-h-screen w-full max-w-md mx-auto">
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
              {userFid && (
                <span className="mr-2">FID: {userFid}</span>
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

      {/* Account Linking Section */}
      <AccountLinking />

      {/* Personal Music Section - only displays when user has Spotify connected */}
      <div className="px-4">
        <PersonalMusic />
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-purple-800">
        <TabButton id="current" label="Friends Listening" />
        <TabButton id="weekly" label="Top Weekly" />
      </div>

      {/* Content area */}
      <div className="flex-grow p-4">
        {error && (
          <div className="bg-red-900/30 text-red-200 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        {tab === "current" ? (
          <FriendsListening isLoading={loading.friends} />
        ) : (
          <TopWeeklyTracks isLoading={loading.weekly} />
        )}
      </div>

      {/* Footer */}
      <div className="p-4 flex justify-between items-center">
        <p className="text-xs text-gray-400">
          Data secured with TLSNotary
        </p>
        <Button
          onClick={handleSignOut}
          className="text-xs px-3 py-1 bg-transparent hover:bg-purple-800 border border-purple-600"
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}