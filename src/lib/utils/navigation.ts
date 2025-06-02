// ~/lib/utils/navigation.ts
import sdk from "@farcaster/frame-sdk";

/**
 * Navigation helper that respects the current environment (web vs webframe/miniapp)
 */
export class NavigationHelper {
    private static _isMiniApp: boolean | null = null;

    // Detect if we're in a mini app environment
    static detectEnvironment(): boolean {
        if (typeof window === 'undefined') return false;

        if (this._isMiniApp !== null) {
            return this._isMiniApp;
        }

        const inIframe = window !== window.parent;
        const url = new URL(window.location.href);
        const hasFrameParam = url.searchParams.has('fc-frame');
        const isWarpcast = url.hostname.includes('warpcast.com');
        const miniAppParam = url.searchParams.get('miniApp') === 'true' ||
            url.pathname.includes('/miniapp');

        this._isMiniApp = inIframe || hasFrameParam || isWarpcast || miniAppParam;
        return this._isMiniApp;
    }

    // Navigate to a URL respecting the environment
    static navigate(url: string, external: boolean = false) {
        const isMiniApp = this.detectEnvironment();

        console.log('Navigation:', { url, external, isMiniApp });

        if (isMiniApp) {
            if (external && typeof sdk?.actions?.openUrl === 'function') {
                // External links in mini app - use SDK
                sdk.actions.openUrl(url);
            } else {
                // Internal navigation in mini app - same window
                window.location.href = url;
            }
        } else {
            if (external) {
                // External links in web - new tab
                window.open(url, '_blank');
            } else {
                // Internal navigation in web
                window.location.href = url;
            }
        }
    }

    // Open Spotify URL
    static openSpotify(uri?: string, trackId?: string, searchQuery?: string) {
        let spotifyUrl = '';

        if (uri) {
            // Convert spotify: URI to https: URL
            spotifyUrl = uri.replace('spotify:', 'https://open.spotify.com/');
        } else if (trackId) {
            spotifyUrl = `https://open.spotify.com/track/${trackId}`;
        } else if (searchQuery) {
            spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(searchQuery)}`;
        } else {
            spotifyUrl = 'https://open.spotify.com';
        }

        // Always treat Spotify as external
        this.navigate(spotifyUrl, true);
    }

    // Share content via Farcaster
    static shareFarcaster(text: string, embeds?: string[]) {
        const isMiniApp = this.detectEnvironment();

        if (isMiniApp && typeof sdk?.actions?.composeCast === 'function') {
            // Use native share in mini app
            // Handle embeds according to SDK type requirements: [] | [string] | [string, string]
            if (!embeds || embeds.length === 0) {
                sdk.actions.composeCast({
                    text,
                    embeds: []
                });
            } else if (embeds.length === 1) {
                sdk.actions.composeCast({
                    text,
                    embeds: [embeds[0]] as [string]
                });
            } else {
                // Take only first 2 embeds (Farcaster limit)
                sdk.actions.composeCast({
                    text,
                    embeds: [embeds[0], embeds[1]] as [string, string]
                });
            }
        } else {
            // Fallback to Warpcast web
            const embedsParam = embeds && embeds.length > 0
                ? `&embeds=${encodeURIComponent(embeds.join(','))}`
                : '';
            const warpcastUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}${embedsParam}`;
            this.navigate(warpcastUrl, true);
        }
    }

    // View Farcaster profile
    static viewProfile(fid: number) {
        const isMiniApp = this.detectEnvironment();

        if (isMiniApp && typeof sdk?.actions?.viewProfile === 'function') {
            // Use native profile view in mini app
            sdk.actions.viewProfile({ fid });
        } else {
            // Fallback to Warpcast web
            this.navigate(`https://warpcast.com/~/profiles/${fid}`, true);
        }
    }

    // Refresh the current page (useful after auth)
    static refresh() {
        window.location.reload();
    }

    // Go back in history
    static goBack() {
        const isMiniApp = this.detectEnvironment();

        if (isMiniApp) {
            // In mini app, just reload or go to home
            window.location.href = '/';
        } else {
            // In web, use browser back
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = '/';
            }
        }
    }

    // Check if we can use native SDK features
    static hasNativeFeatures(): boolean {
        const isMiniApp = this.detectEnvironment();
        return isMiniApp && typeof sdk?.actions !== 'undefined';
    }

    // Get current environment info
    static getEnvironmentInfo() {
        const isMiniApp = this.detectEnvironment();
        return {
            isMiniApp,
            hasNativeFeatures: this.hasNativeFeatures(),
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
            url: typeof window !== 'undefined' ? window.location.href : ''
        };
    }
}

// Export a hook for React components
export function useNavigation() {
    const isMiniApp = NavigationHelper.detectEnvironment();

    return {
        isMiniApp,
        navigate: NavigationHelper.navigate,
        openSpotify: NavigationHelper.openSpotify,
        shareFarcaster: NavigationHelper.shareFarcaster,
        viewProfile: NavigationHelper.viewProfile,
        refresh: NavigationHelper.refresh,
        goBack: NavigationHelper.goBack,
        hasNativeFeatures: NavigationHelper.hasNativeFeatures(),
        environmentInfo: NavigationHelper.getEnvironmentInfo()
    };
}