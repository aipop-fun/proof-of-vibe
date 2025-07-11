"use client";

import { useAuthStore } from "~/lib/stores/authStore";

export function AuthDebugPanel() {
    const {
        isAuthenticated,
        spotifyId,
        accessToken,
        refreshToken,
        expiresAt,
        currentlyPlaying,
        topTracks,
        isLoadingTracks,
        loadingCurrentTrack,
        error,
        isExpired,
        fetchCurrentlyPlaying,
        fetchTopTracks,
        refreshTokenIfNeeded
    } = useAuthStore();

    const handleTestCurrentTrack = async () => {
        console.log('Testing current track fetch...');
        try {
            await fetchCurrentlyPlaying();
        } catch (error) {
            console.error('Test failed:', error);
        }
    };

    const handleTestTopTracks = async () => {
        console.log('Testing top tracks fetch...');
        try {
            await fetchTopTracks('medium_term');
        } catch (error) {
            console.error('Test failed:', error);
        }
    };

    const handleTestTokenRefresh = async () => {
        console.log('Testing token refresh...');
        try {
            const result = await refreshTokenIfNeeded();
            console.log('Token refresh result:', result);
        } catch (error) {
            console.error('Token refresh failed:', error);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="fixed bottom-4 right-4 bg-red-900 text-white p-4 rounded shadow max-w-sm">
                <h3 className="font-bold">Debug: Not Authenticated</h3>
            </div>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded shadow max-w-sm text-xs">
            <h3 className="font-bold mb-2">Auth Debug Panel</h3>
            
            <div className="space-y-1 mb-3">
                <div>Auth: {isAuthenticated ? '✅' : '❌'}</div>
                <div>Spotify ID: {spotifyId ? '✅' : '❌'}</div>
                <div>Access Token: {accessToken ? '✅' : '❌'}</div>
                <div>Refresh Token: {refreshToken ? '✅' : '❌'}</div>
                <div>Token Expired: {isExpired() ? '❌' : '✅'}</div>
                <div>Currently Playing: {currentlyPlaying ? '✅' : '❌'}</div>
                <div>Loading Current: {loadingCurrentTrack ? '⏳' : '✅'}</div>
                <div>Top Tracks: {Object.values(topTracks).some(tracks => tracks.length > 0) ? '✅' : '❌'}</div>
                <div>Error: {error ? '❌' : '✅'}</div>
            </div>

            {error && (
                <div className="bg-red-800 p-2 rounded mb-2 text-xs">
                    {error}
                </div>
            )}

            <div className="space-y-2">
                <button
                    onClick={handleTestTokenRefresh}
                    className="w-full bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
                >
                    Test Token Refresh
                </button>
                <button
                    onClick={handleTestCurrentTrack}
                    className="w-full bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs"
                    disabled={loadingCurrentTrack}
                >
                    Test Current Track
                </button>
                <button
                    onClick={handleTestTopTracks}
                    className="w-full bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded text-xs"
                    disabled={isLoadingTracks.medium_term}
                >
                    Test Top Tracks
                </button>
            </div>

            {/* Token expiration info */}
            {expiresAt && (
                <div className="mt-2 text-xs text-gray-300">
                    Token expires: {new Date(expiresAt * 1000).toLocaleTimeString()}
                </div>
            )}
        </div>
    );
}