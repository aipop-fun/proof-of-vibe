/* eslint-disable  @typescript-eslint/ban-ts-comment */
// @ts-nocheck

"use client";

import { useState, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "~/lib/stores/authStore";
import { useFrame } from "./providers/FrameProvider";
import { Button } from "~/components/ui/Button";
import sdk from "@farcaster/frame-sdk";

// Components
import { FriendsListening } from "./FriendsListening";
import { TopWeeklyTracks } from "./TopWeeklyTracks";
import { AccountOnboarding } from "./AccountOnboarding";
import { AccountLinking } from "./AccountLinking";
import { AccountStatus } from "./AccountStatus";
import { PersonalMusic } from "./PersonalMusic";
import { AddFrameButton } from "./AddFrameButton";
import { ConnectedUsers } from "./ConnectedUsers";
import { SpotifyConnect } from "./SpotifyConnect";

// Types
type TabType = "current" | "weekly";

export function Dashboard() {
  // State
  const [tab, setTab] = useState<TabType>("current");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAccountSetup, setShowAccountSetup] = useState(false);
  const [sentWelcome, setSentWelcome] = useState(false);
  const [showSpotifyConnect, setShowSpotifyConnect] = useState(false);
  const [farcastUserData, setFarcastUserData] = useState<{
    username?: string;
    displayName?: string;
  } | null>(null);

  // Hooks
  const router = useRouter();
  const { isMiniApp, context, added, notificationDetails } = useFrame();
  const {
    spotifyId,
    spotifyUser,
    fid,
    clearAuth,
    isAuthenticated,
    isLinked,
    fetchCurrentlyPlaying,
    fetchTopTracks,
    refreshTokenIfNeeded
  } = useAuthStore();

  // Fetch Farcaster user data when needed - FIXED API CALL
  useEffect(() => {
    const fetchUserData = async () => {
      if (fid) {
        try {
          // Use the correct Neynar bulk users endpoint
          const response = await fetch(`/api/neynar/user/bulk?fids=${fid}`);
          if (response.ok) {
            const data = await response.json();
            if (data.users?.length > 0) {
              const userData = data.users[0];
              // Store both display name and username from Farcaster
              setFarcastUserData({
                username: userData.username || null,
                displayName: userData.display_name || null
              });
            }
          } else {
            console.error('Failed to fetch user data:', response.status, response.statusText);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };

    // Only fetch if we have fid and don't have data yet
    if (fid && !farcastUserData) {
      fetchUserData();
    }
  }, [fid, farcastUserData]);

  // Show/hide Spotify connect based on authentication state
  useEffect(() => {
    setShowSpotifyConnect(isMiniApp && fid && !spotifyId);
  }, [isMiniApp, fid, spotifyId]);

  // Show/hide account setup based on authentication state
  useEffect(() => {
    setShowAccountSetup(isAuthenticated && !isLinked);
  }, [isAuthenticated, isLinked]);

  // Initialize SDK in mini app
  useEffect(() => {
    if (isMiniApp && typeof sdk?.actions?.ready === 'function') {
      sdk.actions.ready().catch(error =>
        console.error("Error initializing mini app:", error)
      );
    }
  }, [isMiniApp]);

  // Send welcome notification
  useEffect(() => {
    const sendWelcomeNotification = async () => {
      if (!added || !notificationDetails || !context?.user?.fid || sentWelcome) return;

      try {
        const response = await fetch("/api/welcome-notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fid: context.user.fid }),
        });

        if (response.ok) setSentWelcome(true);
      } catch (error) {
        console.error("Error sending notification:", error);
      }
    };

    if (added && notificationDetails && !sentWelcome) {
      sendWelcomeNotification();
    }
  }, [added, notificationDetails, context, sentWelcome]);

  // Action handlers
  const handleSignOut = useCallback(async () => {
    clearAuth();
    await signOut({ redirect: false });
    window.location.href = '/auth/signin';
  }, [clearAuth]);

  const handleShare = useCallback(() => {
    const shareText = "🎵 Check out Timbra! Connect your Spotify and share your music taste with friends on Farcaster.";
    const shareUrl = process.env.NEXT_PUBLIC_URL || window.location.origin;
    const warpcastUrl = "https://warpcast.com/~/compose?text=Check%20out%20Timbra!%20Connect%20your%20Spotify%20and%20share%20your%20music%20taste%20with%20friends%20on%20Farcaster.%20%F0%9F%8E%B5";

    if (typeof sdk?.actions?.composeCast === 'function') {
      sdk.actions.composeCast({ text: shareText, embeds: [shareUrl] });
    } else if (typeof sdk?.actions?.openUrl === 'function') {
      sdk.actions.openUrl(warpcastUrl);
    } else {
      window.open(warpcastUrl, "_blank");
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const tokenValid = await refreshTokenIfNeeded();
      if (tokenValid) {
        await fetchCurrentlyPlaying();
        await fetchTopTracks('medium_term');
      }

      // Also refresh Farcaster user data
      if (fid) {
        setFarcastUserData(null); // Reset to trigger refetch
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }, [refreshTokenIfNeeded, fetchCurrentlyPlaying, fetchTopTracks, fid]);

  const handleConnectSpotify = useCallback(() => {
    if (isMiniApp) {
      setShowSpotifyConnect(true);
    } else {
      router.push('/auth/signin/spotify');
    }
  }, [isMiniApp, router]);

  // Show SpotifyConnect if needed
  if (showSpotifyConnect) {
    return <SpotifyConnect onBack={() => setShowSpotifyConnect(false)} />;
  }

  // UI components
  const TabButton = ({ id, label }: { id: TabType; label: string }) => (
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

  // Get user info - PRIORITIZE FARCASTER DATA
  const userName = farcastUserData?.displayName ||
    farcastUserData?.username ||
    spotifyUser?.name ||
    (fid ? `@${fid}` : "");

  const fidString = fid ? String(fid) : "";

  // Safety check for context
  const contextStyle = isMiniApp ? {
    paddingTop: context?.client.safeAreaInsets?.top ?? 0,
    paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
    paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
    paddingRight: context?.client.safeAreaInsets?.right ?? 0,
  } : {};

  return (
    <div
      className="flex flex-col min-h-screen w-full max-w-md mx-auto"
      style={contextStyle}
    >
      {/* Header */}
      <header className="px-4 py-3">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Timbra</h1>
          <div className="flex items-center gap-1">
            {isAuthenticated && isLinked && (
              <button
                onClick={() => router.push('/generate-proof')}
                className="text-xs p-1.5 bg-purple-600 hover:bg-purple-700 rounded-full"
                title="Verify Vibes"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            )}

            {isMiniApp && <AddFrameButton />}

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1.5 text-sm rounded-full hover:bg-purple-800"
              title="Refresh"
            >
              <span className={`inline-block ${isRefreshing ? 'animate-spin' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 21h5v-5" />
                </svg>
              </span>
            </button>

            <button
              onClick={handleShare}
              className="p-1.5 text-sm rounded-full hover:bg-purple-800"
              title="Share"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center">
          <div className="w-10 h-10 rounded-full bg-purple-700 flex items-center justify-center">
            {userName ? userName.charAt(0).toUpperCase() : ''}
          </div>
          <div className="ml-3 flex-grow overflow-hidden">
            <p className="font-medium truncate">{userName}</p>
            <div className="flex text-xs text-gray-300 flex-wrap gap-2">
              {fidString && <span>FID: {fidString}</span>}
              {spotifyId && <span className="bg-green-800/50 px-1 rounded text-xs">Spotify Connected</span>}
              {farcastUserData && <span className="bg-blue-800/50 px-1 rounded text-xs">Farcaster Connected</span>}
            </div>
          </div>
          {!spotifyId && (
            <div className="ml-auto">
              <Button
                onClick={handleConnectSpotify}
                className={`text-xs px-2 py-1 bg-green-600 hover:bg-green-700 rounded-full flex items-center ${isMiniApp ? 'gap-0.5' : 'gap-1'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="4" />
                  <line x1="12" y1="6" x2="12" y2="8" />
                  <line x1="12" y1="16" x2="12" y2="18" />
                  <line x1="6" y1="12" x2="8" y2="12" />
                  <line x1="16" y1="12" x2="18" y2="12" />
                </svg>
                {!isMiniApp && "Connect Spotify"}
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Account components */}
      <section className="px-4">
        <AccountStatus />

        {showAccountSetup ? (
          <AccountOnboarding />
        ) : (
          !isLinked && <AccountLinking />
        )}

        <PersonalMusic />

        {isAuthenticated && isLinked && (
          <ConnectedUsers />
        )}
      </section>

      {/* Tab navigation - only for standard view */}
      {!isMiniApp && (
        <div className="flex border-b border-purple-800">
          <TabButton id="current" label="Friends Listening" />
          <TabButton id="weekly" label="Top Weekly" />
        </div>
      )}

      {/* Content area */}
      <main className="flex-grow p-4">
        {isMiniApp ? (
          <FriendsListening isLoading={false} />
        ) : (
          tab === "current" ? (
            <FriendsListening isLoading={false} />
          ) : (
            <TopWeeklyTracks isLoading={false} />
          )
        )}
      </main>

      {/* Footer with account linking status */}
      <footer className="p-4 flex justify-between items-center">
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

        {!isMiniApp && (
          <Button
            onClick={handleSignOut}
            className="text-xs px-3 py-1 bg-transparent hover:bg-purple-800 border border-purple-600"
          >
            Sign Out
          </Button>
        )}
      </footer>
    </div>
  );
}