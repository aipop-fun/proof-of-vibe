/* eslint-disable react/no-unescaped-entities, @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Head from 'next/head';
import { Button } from '~/components/ui/Button';
import { ShareCard } from '~/components/ShareCard';
import { useFrame } from '~/components/providers/FrameProvider';
import { useAuthStore, type TimeRange } from '~/lib/stores/authStore';
import { SpotifyImage } from '~/components/SpotifyImage';
import { NavigationHelper } from '~/lib/utils/navigation';
import sdk from "@farcaster/miniapp-sdk";
import { formatDuration } from '~/lib/utils';

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
                // For unauthenticated users, still show the page with proper messaging
                if (!isAuthenticated) {
                    setIsLoading(false);
                    return;
                }

                // Check if token is valid and refresh if needed
                const tokenValid = await refreshTokenIfNeeded();

                if (!tokenValid || !accessToken) {
                    console.warn('No valid access token available');
                    setError('Authentication required. Please connect your Spotify account.');
                    setIsLoading(false);
                    return;
                }

                // Load data based on the view type
                if (type === 'currently-playing') {
                    // Only fetch if not already loading and no current data
                    if (!loadingCurrentTrack && !currentlyPlaying) {
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

        loadData();
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
    let imageUrl = `${baseUrl}/image.png`;
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

    // Handle opening the full app using NavigationHelper
    const handleOpenApp = () => {
        NavigationHelper.navigate(baseUrl, false); // Internal navigation
    };

    // Handle navigation to different time ranges using NavigationHelper
    const handleTimeRangeChange = (range: TimeRange) => {
        const newUrl = `/results?type=top-tracks&timeRange=${range}`;
        NavigationHelper.navigate(newUrl, false); // Internal navigation within the frame
    };

    // Handle opening Spotify tracks using NavigationHelper
    const handleOpenSpotify = (track: any) => {
        if (track?.uri) {
            NavigationHelper.openSpotify(track.uri);
        } else if (track) {
            NavigationHelper.openSpotify(undefined, undefined, `${track.title} ${track.artist}`);
        }
    };

    // Handle sharing using NavigationHelper
    const handleShare = () => {
        const currentUrl = `${baseUrl}/results?type=${type}${timeRange ? `&timeRange=${timeRange}` : ''}`;
        NavigationHelper.shareFarcaster(shareMessage, [currentUrl]);
    };

    // Handle refreshing the data
    const handleRefresh = useCallback(async () => {
        if (!isAuthenticated) return;

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
    }, [type, timeRange, refreshTokenIfNeeded, fetchCurrentlyPlaying, fetchTopTracks, accessToken, isAuthenticated]);

    // Friendly labels for time periods
    const timeRangeLabels: Record<TimeRange, string> = {
        short_term: 'Last Month',
        medium_term: 'Last 6 Months',
        long_term: 'All Time'
    };

    // Helper function to format time
    const formatTime = (ms: number): string => {
        if (!ms) return '0:00';
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Check if we're currently loading
    const isCurrentlyLoading = isLoading ||
        (type === 'top-tracks' && isLoadingTracks[timeRange]) ||
        (type === 'currently-playing' && loadingCurrentTrack);

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
                        <div className="mb-3 p-3 text-sm bg-red-900/30 text-red-200 rounded-md">
                            <p className="mb-2">{error}</p>
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleRefresh}
                                    className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700"
                                >
                                    Retry
                                </Button>
                                {!isAuthenticated && (
                                    <Button
                                        onClick={handleOpenApp}
                                        className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700"
                                    >
                                        Connect Spotify
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Results content - customize based on the type */}
                    <div className="bg-purple-800/30 rounded-lg p-6 mb-6">
                        {isCurrentlyLoading ? (
                            <div className="flex flex-col items-center py-8">
                                <div className="w-8 h-8 border-t-2 border-b-2 border-purple-500 rounded-full animate-spin mb-4"></div>
                                <p className="text-purple-300">Loading your {type === 'top-tracks' ? 'top tracks' : 'music data'}...</p>
                            </div>
                        ) : type === 'currently-playing' && currentlyPlaying ? (
                            <div className="flex flex-col items-center">
                                <h2 className="text-xl font-semibold mb-4">Now Playing</h2>

                                <div
                                    className="relative w-40 h-40 mb-4 cursor-pointer"
                                    onClick={() => handleOpenSpotify(currentlyPlaying)}
                                >
                                    <SpotifyImage
                                        src={currentlyPlaying.coverArt || '/api/placeholder/160/160'}
                                        alt={`${currentlyPlaying.title} by ${currentlyPlaying.artist}`}
                                        width={160}
                                        height={160}
                                        className="rounded-lg"
                                    />
                                    {/* Spotify overlay */}
                                    <div className="absolute bottom-2 right-2">
                                        <div className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-full transition-colors">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.6 0-.359.24-.66.54-.78 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.242 1.021zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                <h3
                                    className="text-lg font-medium text-center cursor-pointer hover:underline"
                                    onClick={() => handleOpenSpotify(currentlyPlaying)}
                                >
                                    {currentlyPlaying.title}
                                </h3>
                                <p
                                    className="text-gray-300 text-center cursor-pointer hover:underline"
                                    onClick={() => handleOpenSpotify(currentlyPlaying)}
                                >
                                    {currentlyPlaying.artist}
                                </p>
                                {currentlyPlaying.album && (
                                    <p className="text-sm text-gray-400 text-center">{currentlyPlaying.album}</p>
                                )}

                                {/* Progress bar for currently playing track */}
                                {currentlyPlaying.progressMs !== undefined && currentlyPlaying.durationMs && (
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

                                {/* Action buttons */}
                                <div className="flex gap-3 mt-4">
                                    <Button
                                        onClick={() => handleOpenSpotify(currentlyPlaying)}
                                        className="bg-green-600 hover:bg-green-700 text-sm px-4 py-2"
                                    >
                                        Open in Spotify
                                    </Button>
                                    <Button
                                        onClick={handleShare}
                                        className="bg-purple-600 hover:bg-purple-700 text-sm px-4 py-2"
                                    >
                                        Share
                                    </Button>
                                </div>
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
                                        <button
                                            key={range}
                                            onClick={() => handleTimeRangeChange(range as TimeRange)}
                                            className={`px-2 py-1 rounded transition-colors ${timeRange === range
                                                ? 'bg-purple-700 text-white'
                                                : 'bg-purple-900/50 text-gray-300 hover:bg-purple-800/50'
                                                }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>

                                <div className="space-y-3 max-h-80 overflow-y-auto">
                                    {topTracks[timeRange].slice(0, 10).map((track, index) => (
                                        <div
                                            key={track.id}
                                            className="flex items-center bg-purple-900/30 p-2 rounded cursor-pointer hover:bg-purple-900/50 transition-colors"
                                            onClick={() => handleOpenSpotify(track)}
                                        >
                                            <div className="w-8 h-8 flex items-center justify-center font-medium text-gray-400">
                                                {index + 1}
                                            </div>
                                            <div className="w-10 h-10 mx-2 relative">
                                                <SpotifyImage
                                                    src={track.coverArt || '/api/placeholder/40/40'}
                                                    alt={track.title}
                                                    fill
                                                    sizes="40px"
                                                    className="rounded object-cover"
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

                                {/* Action buttons */}
                                <div className="flex gap-3 mt-4 justify-center">
                                    <Button
                                        onClick={handleShare}
                                        className="bg-purple-600 hover:bg-purple-700 text-sm px-4 py-2"
                                    >
                                        Share Top Tracks
                                    </Button>
                                    <Button
                                        onClick={handleRefresh}
                                        className="bg-gray-600 hover:bg-gray-700 text-sm px-4 py-2"
                                    >
                                        Refresh
                                    </Button>
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
                                    <div
                                        className="bg-purple-900/30 p-3 rounded-lg cursor-pointer hover:bg-purple-900/50 transition-colors"
                                        onClick={() => NavigationHelper.viewProfile(1245)}
                                    >
                                        <p className="font-medium">horsefacts</p>
                                        <p className="text-sm text-gray-400">95% match</p>
                                    </div>
                                    <div
                                        className="bg-purple-900/30 p-3 rounded-lg cursor-pointer hover:bg-purple-900/50 transition-colors"
                                        onClick={() => NavigationHelper.viewProfile(5678)}
                                    >
                                        <p className="font-medium">deodad</p>
                                        <p className="text-sm text-gray-400">87% match</p>
                                    </div>
                                    <div
                                        className="bg-purple-900/30 p-3 rounded-lg cursor-pointer hover:bg-purple-900/50 transition-colors"
                                        onClick={() => NavigationHelper.viewProfile(9012)}
                                    >
                                        <p className="font-medium">varunsrin</p>
                                        <p className="text-sm text-gray-400">82% match</p>
                                    </div>
                                </div>

                                {/* Action button */}
                                <div className="mt-6">
                                    <Button
                                        onClick={handleShare}
                                        className="bg-purple-600 hover:bg-purple-700 text-sm px-4 py-2"
                                    >
                                        Share Vibe Match
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-lg mb-2">No results available</p>
                                <p className="text-sm text-gray-400 mb-4">
                                    {!isAuthenticated ?
                                        "Connect your Spotify account to see your music data" :
                                        type === 'currently-playing' ?
                                            "No track currently playing" :
                                            "No tracks found for this period"
                                    }
                                </p>
                                {isAuthenticated ? (
                                    <Button
                                        onClick={handleRefresh}
                                        className="bg-purple-600 hover:bg-purple-700"
                                    >
                                        Refresh Data
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleOpenApp}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        Connect Spotify
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

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