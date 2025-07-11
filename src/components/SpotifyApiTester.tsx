/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useState } from 'react';
import { useAuthStore } from "~/lib/stores/authStore";

export function SpotifyApiTester() {
    const [testResults, setTestResults] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { accessToken, refreshTokenIfNeeded } = useAuthStore();

    const testSpotifyAPI = async (endpoint: string) => {
        if (!accessToken) {
            setTestResults({ error: 'No access token available' });
            return;
        }

        setIsLoading(true);
        try {
            // Refresh token if needed
            await refreshTokenIfNeeded();

            const response = await fetch(`/api/spotify-debug?endpoint=${endpoint}&token=${accessToken}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();
            setTestResults({ endpoint, success: response.ok, data });
            
            console.log(`Spotify API Test (${endpoint}):`, data);
        } catch (error) {
            console.error('API test error:', error);
            setTestResults({ 
                endpoint, 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    const testDirectSpotifyCall = async (endpoint: string) => {
        if (!accessToken) {
            setTestResults({ error: 'No access token available' });
            return;
        }

        setIsLoading(true);
        try {
            await refreshTokenIfNeeded();

            let url = '';
            switch (endpoint) {
                case 'currently-playing':
                    url = 'https://api.spotify.com/v1/me/player/currently-playing';
                    break;
                case 'top-tracks':
                    url = 'https://api.spotify.com/v1/me/top/tracks?time_range=medium_term&limit=10';
                    break;
                case 'profile':
                    url = 'https://api.spotify.com/v1/me';
                    break;
                default:
                    throw new Error('Unknown endpoint');
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                }
            });

            let data = null;
            if (response.status !== 204) {
                data = await response.json();
            }

            setTestResults({ 
                endpoint, 
                success: response.ok, 
                status: response.status,
                data: data || 'No content (204)' 
            });
            
            console.log(`Direct Spotify API Test (${endpoint}):`, { status: response.status, data });
        } catch (error) {
            console.error('Direct API test error:', error);
            setTestResults({ 
                endpoint, 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed top-4 right-4 bg-gray-900 text-white p-4 rounded shadow max-w-md text-sm z-50">
            <h3 className="font-bold mb-3">Spotify API Tester</h3>
            
            <div className="space-y-2 mb-4">
                <div className="text-xs">
                    <strong>Via Internal API:</strong>
                </div>
                <button
                    onClick={() => testSpotifyAPI('currently-playing')}
                    className="w-full bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs"
                    disabled={isLoading}
                >
                    Test Currently Playing (Internal)
                </button>
                <button
                    onClick={() => testSpotifyAPI('top-tracks')}
                    className="w-full bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded text-xs"
                    disabled={isLoading}
                >
                    Test Top Tracks (Internal)
                </button>
                
                <div className="text-xs mt-3">
                    <strong>Direct Spotify API:</strong>
                </div>
                <button
                    onClick={() => testDirectSpotifyCall('profile')}
                    className="w-full bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
                    disabled={isLoading}
                >
                    Test Profile (Direct)
                </button>
                <button
                    onClick={() => testDirectSpotifyCall('currently-playing')}
                    className="w-full bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs"
                    disabled={isLoading}
                >
                    Test Currently Playing (Direct)
                </button>
                <button
                    onClick={() => testDirectSpotifyCall('top-tracks')}
                    className="w-full bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded text-xs"
                    disabled={isLoading}
                >
                    Test Top Tracks (Direct)
                </button>
            </div>

            {isLoading && (
                <div className="text-yellow-300 text-xs mb-2">
                    Testing API...
                </div>
            )}

            {testResults && (
                <div className="bg-gray-800 p-2 rounded text-xs max-h-48 overflow-y-auto">
                    <div className={`font-bold ${testResults.success ? 'text-green-300' : 'text-red-300'}`}>
                        {testResults.endpoint}: {testResults.success ? 'SUCCESS' : 'FAILED'}
                    </div>
                    {testResults.status && (
                        <div className="text-gray-300">Status: {testResults.status}</div>
                    )}
                    {testResults.error && (
                        <div className="text-red-300">Error: {testResults.error}</div>
                    )}
                    {testResults.data && (
                        <div className="mt-2">
                            <div className="text-gray-400">Response:</div>
                            <pre className="text-xs text-gray-200 mt-1 whitespace-pre-wrap">
                                {typeof testResults.data === 'string' 
                                    ? testResults.data 
                                    : JSON.stringify(testResults.data, null, 2)
                                }
                            </pre>
                        </div>
                    )}
                </div>
            )}

            <button
                onClick={() => setTestResults(null)}
                className="w-full bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded text-xs mt-2"
            >
                Clear Results
            </button>
        </div>
    );
}
