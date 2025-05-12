"use client";

import { useEffect, useState, useCallback, createContext, useContext } from "react";
import sdk, {
  type Context,
  type FrameNotificationDetails,
  AddFrame
} from "@farcaster/frame-sdk";
import React from "react";

interface FrameContextType {
  isSDKLoaded: boolean;
  context: Context.FrameContext | undefined;
  added: boolean;
  notificationDetails: FrameNotificationDetails | null;
  lastEvent: string;
  isMiniApp: boolean;
  addFrame: () => Promise<AddFrame.AddFrameResult>;
  addFrameResult: string;
}

const FrameContext = createContext<FrameContextType | undefined>(undefined);

/**
 * Custom hook to access frame context and functions
 */
export function useFrame() {
  const context = useContext(FrameContext);
  if (!context) {
    throw new Error('useFrame must be used within a FrameProvider');
  }
  return context;
}

/**
 * Frame Provider component to manage Farcaster Frame SDK
 * Handles initialization, events, and provides context to children
 */
export function FrameProvider({ children }: { children: React.ReactNode }) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<Context.FrameContext>();
  const [added, setAdded] = useState(false);
  const [notificationDetails, setNotificationDetails] = useState<FrameNotificationDetails | null>(null);
  const [lastEvent, setLastEvent] = useState("");
  const [addFrameResult, setAddFrameResult] = useState("");
  const [isMiniApp, setIsMiniApp] = useState(false);

  /**
   * Function to add the frame to the client
   */
  const addFrame = useCallback(async () => {
    try {
      setAddFrameResult("");

      // Call the SDK action to add the frame
      const result = await sdk.actions.addFrame();

      if (result.notificationDetails) {
        setNotificationDetails(result.notificationDetails);
        setAdded(true);

        // Store notification token if needed
        console.log("Frame added with notification details", result.notificationDetails);

        // Set the result message
        setAddFrameResult("Frame successfully added!");
      }

      return result;
    } catch (error) {
      if (error instanceof AddFrame.RejectedByUser) {
        setAddFrameResult(`User rejected adding the frame: ${error.message}`);
      } else if (error instanceof AddFrame.InvalidDomainManifest) {
        setAddFrameResult(`Invalid domain manifest: ${error.message}`);
      } else {
        setAddFrameResult(`Error adding frame: ${error}`);
      }
      console.error("Error adding frame:", error);
      throw error;
    }
  }, []);

  // Initialize the SDK and set up event listeners
  useEffect(() => {
    const load = async () => {
      try {
        // Check if running in Farcaster mini app environment
        const isFarcasterMiniApp = window.parent !== window ||
          !!window.location.href.match(/fc-frame=|warpcast\.com/i);
        setIsMiniApp(isFarcasterMiniApp);

        // Get context from SDK
        const frameContext = await sdk.context;
        setContext(frameContext);

        // Check if the app is already added
        if (frameContext?.client?.added) {
          setAdded(true);
          if (frameContext.client.notificationDetails) {
            setNotificationDetails(frameContext.client.notificationDetails);
          }
        }

        setIsSDKLoaded(true);

        // Set up event listeners
        sdk.on("frameAdded", ({ notificationDetails }) => {
          console.log("Frame added", notificationDetails);
          setAdded(true);
          setNotificationDetails(notificationDetails ?? null);
          setLastEvent("Frame added");
        });

        sdk.on("frameAddRejected", ({ reason }) => {
          console.log("Frame add rejected", reason);
          setAdded(false);
          setLastEvent(`Frame add rejected: ${reason}`);
        });

        sdk.on("frameRemoved", () => {
          console.log("Frame removed");
          setAdded(false);
          setNotificationDetails(null);
          setLastEvent("Frame removed");
        });

        sdk.on("notificationsEnabled", ({ notificationDetails }) => {
          console.log("Notifications enabled", notificationDetails);
          setNotificationDetails(notificationDetails ?? null);
          setLastEvent("Notifications enabled");
        });

        sdk.on("notificationsDisabled", () => {
          console.log("Notifications disabled");
          setNotificationDetails(null);
          setLastEvent("Notifications disabled");
        });

        // Call ready action to signal frame is ready if in Mini App context
        if (isFarcasterMiniApp) {
          console.log("Calling ready (Mini App detected)");
          try {
            await sdk.actions.ready({});
            console.log("Ready called successfully");
          } catch (readyError) {
            console.error("Error calling ready:", readyError);
          }
        }
      } catch (error) {
        console.error("Error initializing Frame SDK:", error);
      }
    };

    if (typeof window !== 'undefined' && !isSDKLoaded) {
      console.log("Loading Frame SDK");
      load();

      return () => {
        // Clean up event listeners on unmount
        if (sdk) {
          sdk.removeAllListeners();
        }
      };
    }
  }, [isSDKLoaded]);

  const value: FrameContextType = {
    isSDKLoaded,
    context,
    added,
    notificationDetails,
    lastEvent,
    isMiniApp,
    addFrame,
    addFrameResult
  };

  return (
    <FrameContext.Provider value={value}>
      {children}
    </FrameContext.Provider>
  );
}