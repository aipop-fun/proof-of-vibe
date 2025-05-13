/* eslint-disable  @typescript-eslint/no-unused-vars, react/no-unescaped-entities */
"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { FriendsListening } from "./FriendsListening";
import { TopWeeklyTracks } from "./TopWeeklyTracks";
import { Button } from "~/components/ui/Button";
import sdk from "@farcaster/frame-sdk";
import { AccountOnboarding } from "./AccountOnboarding";
import { AccountLinking } from "./AccountLinking";
import { AccountStatus } from "./AccountStatus";
import { PersonalMusic } from "./PersonalMusic";
import { useAuthStore } from "~/lib/stores/authStore";
import { useFrame } from "./providers/FrameProvider";
import { AddFrameButton } from "./AddFrameButton";
import { ConnectedUsers } from "./ConnectedUsers";
import { SpotifyConnect } from "./SpotifyConnect";
import { useRouter } from "next/navigation";

export function Dashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<"current" | "weekly">("current");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAccountSetup, setShowAccountSetup] = useState(false);
  const [sentWelcome, setSentWelcome] = useState(false);
  const [showSpotifyConnect, setShowSpotifyConnect] = useState(false);

  // Get context from FrameProvider
  const { isMiniApp, context, added, notificationDetails } = useFrame();

  // Use Zustand store
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

  // Determinar se precisa mostrar a tela de conexão do Spotify
  useEffect(() => {
    // No mini app, se temos FID (Farcaster) mas não temos Spotify, mostrar o componente de conexão
    if (isMiniApp && fid && !spotifyId) {
      setShowSpotifyConnect(true);
    } else {
      setShowSpotifyConnect(false);
    }
  }, [isMiniApp, fid, spotifyId]);

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
          console.log("App is ready and splash screen has been hidden");
        } catch (readyError) {
          console.error("Error calling ready in Dashboard:", readyError);
        }
      }
    };

    initializeInMiniApp();
  }, [isMiniApp]);

  // Send welcome notification when app is added
  useEffect(() => {
    const sendWelcomeNotification = async () => {
      if (!added || !notificationDetails || !context?.user?.fid || sentWelcome) return;

      try {
        const response = await fetch("/api/welcome-notification", {
          method: "POST",
          mode: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fid: context.user.fid,
          }),
        });

        if (response.ok) {
          console.log("Welcome notification sent successfully");
          setSentWelcome(true);
        } else {
          console.error("Failed to send welcome notification");
        }
      } catch (error) {
        console.error("Error sending notification:", error);
      }
    };

    if (added && notificationDetails && !sentWelcome) {
      sendWelcomeNotification();
    }
  }, [added, notificationDetails, context, sentWelcome]);

  const handleSignOut = async () => {
    // Clear the Zustand store
    clearAuth();
    // Also sign out from NextAuth if session exists
    await signOut({ redirect: false });
    // Redirect to sign-in page
    window.location.href = '/auth/signin';
  };

  const handleShare = () => {
    if (typeof sdk?.actions?.composeCast === 'function') {
      sdk.actions.composeCast({
        text: "🎵 Check out Timbra! Connect your Spotify and share your music taste with friends on Farcaster.",
        embeds: [process.env.NEXT_PUBLIC_URL || window.location.origin]
      });
    } else if (typeof sdk?.actions?.openUrl === 'function') {
      sdk.actions.openUrl("https://warpcast.com/~/compose?text=Check%20out%20Timbra!%20Connect%20your%20Spotify%20and%20share%20your%20music%20taste%20with%20friends%20on%20Farcaster.%20%F0%9F%8E%B5");
    } else {
      // Fallback for regular web browser
      window.open("https://warpcast.com/~/compose?text=Check%20out%20Timbra!%20Connect%20your%20Spotify%20and%20share%20your%20music%20taste%20with%20friends%20on%20Farcaster.%20%F0%9F%8E%B5", "_blank");
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      // Check if token is valid and refresh if needed
      const tokenValid = await refreshTokenIfNeeded();

      if (tokenValid) {
        // Fetch the latest data
        await fetchCurrentlyPlaying();
        await fetchTopTracks('medium_term');
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      // Set refreshing state back to false after a short delay
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleConnectSpotify = () => {
    if (isMiniApp) {
      // No mini app, abrir tela de conexão em vez de redirecionar
      setShowSpotifyConnect(true);
    } else {
      // No navegador normal, redirecionar para página de login do Spotify
      router.push('/auth/signin/spotify');
    }
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

  // Se estiver mostrando a tela de conexão do Spotify, renderizar apenas ela
  if (showSpotifyConnect) {
    return <SpotifyConnect onBack={() => setShowSpotifyConnect(false)} />;
  }

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
      <div className="px-4 py-3">
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
            {userName.charAt(0)}
          </div>
          <div className="ml-3 flex-grow overflow-hidden">
            <p className="font-medium truncate">{userName}</p>
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

      {/* Connected Users Section - only show when user is fully linked */}
      {isAuthenticated && isLinked && (
        <div className="px-4 mb-4">
          <ConnectedUsers />
        </div>
      )}

      {/* Tab navigation - only show in standard view, not in mini app */}
      {!isMiniApp && (
        <div className="flex border-b border-purple-800">
          <TabButton id="current" label="Friends Listening" />
          <TabButton id="weekly" label="Top Weekly" />
        </div>
      )}

      {/* Content area */}
      <div className="flex-grow p-4">
        {/* In mini app mode, always show FriendsListening */}
        {isMiniApp ? (
          <FriendsListening isLoading={false} />
        ) : (
          // In normal web mode, show based on selected tab
          tab === "current" ? (
            <FriendsListening isLoading={false} />
          ) : (
            <TopWeeklyTracks isLoading={false} />
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