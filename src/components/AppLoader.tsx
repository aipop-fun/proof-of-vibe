// src/components/AppLoader.tsx
"use client";

import { useEffect, useState } from "react";
import { dismissSplashScreen, isFarcasterMiniApp } from "~/lib/splashScreen";

interface AppLoaderProps {
    children: React.ReactNode;
}

/**
 * AppLoader handles initial app loading and splash screen dismissal
 * Wrap your main app content with this component to ensure proper splash screen handling
 */
export function AppLoader({ children }: AppLoaderProps) {
    const [isMiniApp, setIsMiniApp] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Detect if we're in a mini app
        setIsMiniApp(isFarcasterMiniApp());

        // Set up loading state
        const loadingTimer = setTimeout(() => {
            setIsLoading(false);
        }, 1000); // Short timeout to ensure UI is ready

        return () => clearTimeout(loadingTimer);
    }, []);

    // Handle splash screen dismissal when loading completes
    useEffect(() => {
        const handleSplashScreen = async () => {
            if (!isLoading && isMiniApp) {
                try {
                    // Dismiss the splash screen
                    await dismissSplashScreen();
                } catch (error) {
                    console.error("Failed to dismiss splash screen:", error);
                }
            }
        };

        handleSplashScreen();
    }, [isLoading, isMiniApp]);

    // If app is still loading, show a minimal loading indicator
    // This will be very brief and only visible in browser context, not in mini app
    if (isLoading && !isMiniApp) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-b from-purple-900 to-black text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4 animate-pulse">Timbra</h1>
                    <p className="animate-pulse">Loading...</p>
                </div>
            </div>
        );
    }

    // Render children with mini app context
    return <>{children}</>;
}