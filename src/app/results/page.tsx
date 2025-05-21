/* eslint-disable @typescript-eslint/no-unused-vars, react/no-unescaped-entities, @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '~/components/ui/Button';
import { ShareCard } from '~/components/ShareCard';
import { useFrame } from '~/components/providers/FrameProvider';
import { useAuthStore } from '~/lib/stores/authStore';
import { SpotifyImage } from '~/components/SpotifyImage';
import Head from 'next/head';
import sdk from "@farcaster/frame-sdk";
import { TimeRange } from '~/stores/spotifyDataStore';

type ResultsType = 'top-tracks' | 'currently-playing' | 'vibe-match';

export default function ResultsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isMiniApp, context, added, addFrame } = useFrame();
    const [baseUrl, setBaseUrl] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Get auth and music state from the store
    const {
        spotifyUser,
        topTracks,
        isLoadingTracks,
        currentlyPlaying,
        loadingCurrentTrack,
        isAuthenticated,
        isLinked,
        accessToken,
        refreshTokenIfNeeded,
        fetchTopTracks,
        fetchCurrentlyPlaying
    } = useAuthStore();

    // Determine which type of results to show
    const type = searchParams?.get('type') as ResultsType || 'top-tracks';
    const timeRange = searchParams?.get('timeRange') as TimeRange || 'medium_term';

    // Set base URL for constructing the frame embed
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setBaseUrl(window.location.origin);
        }
    }, []);

    // Initialize app when in Mini App context
    useEffect(() => {
        const init = async () => {
            if (isMiniApp && typeof sdk?.actions?.ready === 'function') {
                try {
                    await sdk.actions.ready();
                    console.log("Results page is ready");
                } catch (error) {
                    console.error('Error calling ready:', error);
                }
            }
        };

        init();
    }, [isMiniApp]);

    // Load the appropriate data based on the requested view type
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // Check if token is valid and refresh if needed
                const tokenValid = await refreshTokenIfNeeded();

                if (!tokenValid || !accessToken) {
                    console.warn('No valid access token available');
                    setIsLoading(false);
                    return;
                }

                // Load data based on the view type
                if (type === 'currently-playing') {
                    // Only fetch if not already loading
                    if (!loadingCurrentTrack && (!currentlyPlaying || currentlyPlaying.length === 0)) {
                        await fetchCurrentlyPlaying();
                    }
                } else if (type === 'top-tracks') {
                    // Only fetch if no data and not already loading
                    if (!isLoadingTracks[timeRange] && (!topTracks[timeRange] || topTracks[timeRange].length === 0)) {
                        await fetchTopTracks(timeRange);
                    }
                }
            } catch (err) {
                console.error(`Error loading data for ${type}:`, err);
                setError(err instanceof Error ? err.message : "Failed to load data");
            } finally {
                setIsLoading(false);
            }
        };

        if (isAuthenticated) {
            loadData();
        } else {
            setIsLoading(false);
        }
    }, [
        type,
        timeRange,
        isAuthenticated,
        accessToken,
        refreshTokenIfNeeded,
        fetchCurrentlyPlaying,
        fetchTopTracks,
        currentlyPlaying,
        topTracks,
        loadingCurrentTrack,
        isLoadingTracks
    ]);

    // Get user info for display
    const userName = spotifyUser?.name || 'music lover';

    // Generate page title and description based on results type
    let title = 'My Music Results - Timbra';
    let description = 'Check out my music taste on Timbra!';
    let imageUrl = `${baseUrl}/opengraph-image`;
    let shareMessage = '🎵 Check out my music taste on Timbra!';

    // Customize content based on the results type
    if (type === 'currently-playing' && currentlyPlaying) {
        title = `${userName} is listening to ${currentlyPlaying.title} by ${currentlyPlaying.artist}`;
        description = `${userName} is currently playing ${currentlyPlaying.title} by ${currentlyPlaying.artist} on Timbra`;
        imageUrl = currentlyPlaying.coverArt || imageUrl;
        shareMessage = `🎵 I'm currently listening to ${currentlyPlaying.title} by ${currentlyPlaying.artist} on Timbra!`;
    } else if (type === 'top-tracks' && topTracks[timeRange]?.length > 0) {
        const trackCount = topTracks[timeRange].length;
        const timeRangeText = timeRange === 'short_term' ? 'the last month' :
            timeRange === 'medium_term' ? 'the last 6 months' : 'all time';

        title = `${userName}'s Top Tracks`;
        description = `Check out ${userName}'s top ${trackCount} tracks from ${timeRangeText} on Timbra`;

        // Use the top track's cover for the image
        if (topTracks[timeRange][0]?.coverArt) {
            imageUrl = topTracks[timeRange][0].coverArt;
        }

        shareMessage = `🎵 Here are my top tracks from ${timeRangeText} on Timbra!`;
    } else if (type === 'vibe-match') {
        title = `${userName}'s Vibe Match Results`;
        description = `Check out who matches ${userName}'s music taste on Timbra!`;
        shareMessage = '🎵 Just got my vibe match results on Timbra! See who has similar music taste!';
    }

    // Create the frame embed for this results page
    const frameEmbed = {
        version: "next",
        imageUrl: imageUrl,
        button: {
            title: "🎵 See Results",
            action: {
                type: "launch_frame",
                url: `${baseUrl}/results?type=${type}${timeRange ? `&timeRange=${timeRange}` : ''}`,
                name: "Timbra",
                splashImageUrl: `${baseUrl}/splash.png`,
                splashBackgroundColor: "#f7f7f7"
            }
        }
    };

    // Handle opening the full app
    const handleOpenApp = () => {
        if (isMiniApp && typeof sdk?.actions?.openUrl === 'function') {
            sdk.actions.openUrl(baseUrl);
        } else {
            window.location.href = baseUrl;
        }
    };

    // Handle refreshing the data
    const handleRefresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Refresh token if needed
            const tokenValid = await refreshTokenIfNeeded();

            if (!tokenValid || !accessToken) {
                throw new Error('No valid access token available');
            }

            // Refresh data based on view type
            if (type === 'currently-playing') {
                await fetchCurrentlyPlaying();
            } else if (type === 'top-tracks') {
                await fetchTopTracks(timeRange);
            }
        } catch (err) {
            console.error(`Error refreshing data:`, err);
            setError(err instanceof Error ? err.message : "Failed to refresh data");
        } finally {
            setIsLoading(false);
        }
    }, [type, timeRange, refreshTokenIfNeeded, fetchCurrentlyPlaying, fetchTopTracks, accessToken]);

    // Friendly labels for time periods
    const timeRangeLabels: Record<TimeRange, string> = {
        short_term: 'Last Month',
        medium_term: 'Last 6 Months',
        long_term: 'All Time'
    };

    return (
        <>
            <Head>
                <title>{title}</title>
                <meta name="description" content={description} />
                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
                <meta property="og:image" content={imageUrl} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={`${baseUrl}/results?type=${type}${timeRange ? `&timeRange=${timeRange}` : ''}`} />

                {/* Twitter Card meta tags */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={title} />
                <meta name="twitter:description" content={description} />
                <meta name="twitter:image" content={imageUrl} />

                {/* Farcaster Frame meta tag */}
                <meta name="fc:frame" content={JSON.stringify(frameEmbed)} />
            </Head>

            <div
                className="flex flex-col min-h-screen bg-gradient-to-b from-purple-900 to-black text-white"
                style={isMiniApp ? {
                    paddingTop: context?.client.safeAreaInsets?.top ?? 0,
                    paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
                    paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
                    paddingRight: context?.client.safeAreaInsets?.right ?? 0,
                } : {}}
            >
                <div className="container mx-auto max-w-md p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold">Timbra</h1>

                        {/* Add Frame button if in Mini App context */}
                        {isMiniApp && !added && (
                            <Button
                                onClick={addFrame}
                                className="text-xs px-2 py-0.5 bg-purple-600 hover:bg-purple-700"
                            >
                                Add to Farcaster
                            </Button>
                        )}
                    </div>

                    {/* Error display */}
                    {error && (
                        <div className="mb-3 p-2 text-sm bg-red-900/30 text-red-200 rounded-md">
                            {error}
                            <Button
                                onClick={handleRefresh}
                                className="ml-2 text-xs px-2 py-0.5 bg-red-600 hover:bg-red-700"
                            >
                                Retry
                            </Button>
                        </div>
                    )}

                    {/* Results content - customize based on the type */}
                    <div className="bg-purple-800/30 rounded-lg p-6 mb-6">
                        {isLoading || isLoadingTracks[timeRange] || loadingCurrentTrack ? (
                            <div className="flex flex-col items-center py-8">
                                <div className="w-8 h-8 border-t-2 border-b-2 border-purple-500 rounded-full animate-spin mb-4"></div>
                                <p className="text-purple-300">Loading your {type === 'top-tracks' ? 'top tracks' : 'music data'}...</p>
                            </div>
                        ) : type === 'currently-playing' && currentlyPlaying ? (
                            <div className="flex flex-col items-center">
                                <h2 className="text-xl font-semibold mb-4">Now Playing</h2>

                                <div className="relative w-40 h-40 mb-4">
                                    <SpotifyImage
                                        src={currentlyPlaying.coverArt || '/api/placeholder/160/160'}
                                        alt={`${currentlyPlaying.title} by ${currentlyPlaying.artist}`}
                                        width={160}
                                        height={160}
                                        className="rounded-lg"
                                    />
                                </div>

                                <h3 className="text-lg font-medium">{currentlyPlaying.title}</h3>
                                <p className="text-gray-300">{currentlyPlaying.artist}</p>
                                {currentlyPlaying.album && (
                                    <p className="text-sm text-gray-400">{currentlyPlaying.album}</p>
                                )}

                                {/* Progress bar for currently playing track */}
                                {currentlyPlaying.progressMs && currentlyPlaying.durationMs && (
                                    <div className="w-full mt-4">
                                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                                            <div
                                                className="bg-green-500 h-1.5 rounded-full"
                                                style={{ width: `${(currentlyPlaying.progressMs / currentlyPlaying.durationMs) * 100}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                                            <span>{formatTime(currentlyPlaying.progressMs)}</span>
                                            <span>{formatTime(currentlyPlaying.durationMs)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : type === 'top-tracks' && topTracks[timeRange]?.length > 0 ? (
                            <div>
                                <h2 className="text-xl font-semibold mb-4 text-center">
                                    My Top Tracks
                                    <span className="block text-sm font-normal text-gray-300 mt-1">
                                        {timeRangeLabels[timeRange]}
                                    </span>
                                </h2>

                                {/* Time range tabs */}
                                <div className="flex space-x-2 mb-4 text-xs justify-center">
                                    {Object.entries(timeRangeLabels).map(([range, label]) => (
                                        <a
                                            key={range}
                                            href={`/results?type=top-tracks&timeRange=${range}`}
                                            className={`px-2 py-1 rounded ${timeRange === range
                                                ? 'bg-purple-700 text-white'
                                                : 'bg-purple-900/50 text-gray-300 hover:bg-purple-800/50'
                                                }`}
                                        >
                                            {label}
                                        </a>
                                    ))}
                                </div>

                                <div className="space-y-3 max-h-80 overflow-y-auto">
                                    {topTracks[timeRange].slice(0, 5).map((track, index) => (
                                        <div key={track.id} className="flex items-center bg-purple-900/30 p-2 rounded">
                                            <div className="w-8 h-8 flex items-center justify-center font-medium text-gray-400">
                                                {index + 1}
                                            </div>
                                            <div className="w-10 h-10 mx-2">
                                                <SpotifyImage
                                                    src={track.coverArt || '/api/placeholder/40/40'}
                                                    alt={track.title}
                                                    width={40}
                                                    height={40}
                                                    className="rounded"
                                                />
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <p className="font-medium truncate">{track.title}</p>
                                                <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                                            </div>
                                            {track.popularity !== undefined && (
                                                <div className="text-xs text-gray-400 bg-purple-800/50 px-2 py-0.5 rounded-full">
                                                    {track.popularity}%
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : type === 'vibe-match' ? (
                            <div className="text-center">
                                <h2 className="text-xl font-semibold mb-4">Vibe Match Results</h2>
                                <p className="mb-4">
                                    Based on your listening history, you match with:
                                </p>

                                {/* Mock vibe matches */}
                                <div className="space-y-3">
                                    <div className="bg-purple-900/30 p-3 rounded-lg">
                                        <p className="font-medium">horsefacts</p>
                                        <p className="text-sm text-gray-400">95% match</p>
                                    </div>
                                    <div className="bg-purple-900/30 p-3 rounded-lg">
                                        <p className="font-medium">deodad</p>
                                        <p className="text-sm text-gray-400">87% match</p>
                                    </div>
                                    <div className="bg-purple-900/30 p-3 rounded-lg">
                                        <p className="font-medium">varunsrin</p>
                                        <p className="text-sm text-gray-400">82% match</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-lg">No results available</p>
                                <p className="text-sm text-gray-400 mt-2">
                                    {isAuthenticated ?
                                        "Try listening to some music first!" :
                                        "Connect your Spotify account to see your music data"}
                                </p>
                                {isAuthenticated && (
                                    <Button
                                        onClick={handleRefresh}
                                        className="mt-4 bg-purple-600 hover:bg-purple-700"
                                    >
                                        Refresh Data
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Share Card */}
                    <ShareCard
                        title="Share your results"
                        message={shareMessage}
                        imageUrl={imageUrl}
                    />

                    {/* Call to action */}
                    <div className="mt-8 flex flex-col items-center">
                        {!isAuthenticated ? (
                            <>
                                <p className="text-center mb-4">
                                    Connect your Spotify account to share what you're listening to!
                                </p>
                                <Button
                                    onClick={handleOpenApp}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    Connect Spotify
                                </Button>
                            </>
                        ) : !isLinked ? (
                            <>
                                <p className="text-center mb-4">
                                    Link your Spotify and Farcaster accounts to share what you're listening to!
                                </p>
                                <Button
                                    onClick={handleOpenApp}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    Link Accounts
                                </Button>
                            </>
                        ) : (
                            <Button
                                onClick={handleOpenApp}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                Open Full App
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

// Helper function to format milliseconds into MM:SS
function formatTime(ms: number): string {
    if (!ms) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}