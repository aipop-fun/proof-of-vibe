"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { sdk } from '@farcaster/miniapp-sdk';


interface MiniAppContext {
  user: {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  };
  location?: {
    type: string;
    [key: string]: unknown;
  };
  client: {
    clientFid: number;
    added: boolean;
    safeAreaInsets?: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
    notificationDetails?: {
      url: string;
      token: string;
    };
  };
}

interface FrameContextType {
  isSDKLoaded: boolean;
  isMiniApp: boolean;
  context: MiniAppContext | null;
  added: boolean;
  addFrame: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  notificationDetails?: {
    url: string;
    token: string;
  } | null;
}

const FrameContext = createContext<FrameContextType>({
  isSDKLoaded: false,
  isMiniApp: false,
  context: null,
  added: false,
  addFrame: async () => { },
  isLoading: true,
  error: null,
  notificationDetails: null,
});

export function FrameProvider({ children }: { children: React.ReactNode }) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [context, setContext] = useState<MiniAppContext | null>(null);
  const [added, setAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notificationDetails, setNotificationDetails] = useState<{ url: string; token: string } | null>(null);

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const miniAppResult = await sdk.isInMiniApp();
        setIsMiniApp(miniAppResult);
        setIsSDKLoaded(true);

        if (miniAppResult) {
          console.log("Running in Mini App context");

          try {            
            const contextData = await sdk.context;
            setContext(contextData);
          
            setAdded(contextData?.client?.added || false);

            setNotificationDetails(contextData?.client?.notificationDetails || null);

            console.log("Mini App context loaded:", contextData);
          } catch (contextError) {
            console.warn("Could not load Mini App context:", contextError);            
          }
        } else {
          console.log("Running in regular web browser");
        }
      } catch (err) {
        console.error("Error initializing Mini App SDK:", err);
        setError(err instanceof Error ? err.message : 'Failed to initialize SDK');
        setIsMiniApp(false);
        setIsSDKLoaded(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSDK();
  }, []);

  
  const addFrame = async () => {
    if (!isMiniApp) {
      console.warn("addMiniApp can only be called in Mini App context");
      return;
    }

    try {      
      await sdk.actions.addMiniApp();
      setAdded(true);
      console.log("Mini App added successfully");
    } catch (error) {
      console.error("Error adding Mini App:", error);
      throw error;
    }
  };

  const value: FrameContextType = {
    isSDKLoaded,
    isMiniApp,
    context,
    added,
    addFrame,
    isLoading,
    error,
    notificationDetails,
  };

  return (
    <FrameContext.Provider value={value}>
      {children}
    </FrameContext.Provider>
  );
}


export function useFrame(): FrameContextType {
  const context = useContext(FrameContext);
  if (!context) {
    throw new Error("useFrame must be used within a FrameProvider");
  }
  return context;
}