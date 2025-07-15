import sdk from "@farcaster/miniapp-sdk";

/**
 * Handles dismissing the splash screen in Farcaster Mini App context
 * @param options Configuration options
 * @returns Promise that resolves when ready is called or rejects if there's an error
 */
export async function dismissSplashScreen(options?: {
    disableNativeGestures?: boolean
}): Promise<void> {
    // Only execute if we're in a browser environment
    if (typeof window === 'undefined') return;

    try {
        // Check if the SDK is available and has the ready function
        if (typeof sdk?.actions?.ready === 'function') {
            console.log("Dismissing splash screen...");
            await sdk.actions.ready(options);
            console.log("Splash screen dismissed successfully");
        } else {
            console.warn("Frame SDK ready function not available");
        }
    } catch (error) {
        console.error("Error dismissing splash screen:", error);
        // Not throwing the error, as this shouldn't break the app functionality
    }
}

/**
 * Checks if the current environment is a Farcaster Mini App
 * @returns boolean indicating if the app is running in a Farcaster Mini App context
 */
export function isFarcasterMiniApp(): boolean {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') return false;

    return (
        // Check if we're in an iframe
        window.parent !== window ||
        // Check for specific Farcaster URL patterns
        !!window.location.href.match(/fc-frame=|warpcast\.com|farcaster\./i) ||
        // Check for mini app parameter
        !!new URLSearchParams(window.location.search).get('miniApp')
    );
}