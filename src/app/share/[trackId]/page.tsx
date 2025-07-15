/* eslint-disable @next/next/no-img-element, react/no-unescaped-entities, @typescript-eslint/no-explicit-any, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '~/lib/stores/authStore';
import { Button } from '~/components/ui/Button';
import { ShareCard } from '~/components/ShareCard';
import { useFrame } from '~/components/providers/FrameProvider';
import { listeningHistoryService } from '~/lib/services/listeningHistoryService';
import Head from 'next/head';
import sdk from "@farcaster/miniapp-sdk";

interface TrackData {
    id: string;
    title: string;
    artist: string;
    album?: string;
    albumArt?: string;
    coverArt?: string;
    listenCount?: number;
    duration?: string;
    spotifyId?: string;
    uri?: string;
    popularity?: number;
    // User info for shared tracks
    sharedBy?: {
        username?: string;
        displayName?: string;
        fid?: number;
    };
    listenedAt?: string;
}

export default function ShareTrackPage() {
    const { trackId } = useParams();
    const [track, setTrack] = useState<TrackData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { isMiniApp, context } = useFrame();
    const { isAuthenticated } = useAuthStore();
    const [baseUrl, setBaseUrl] = useState('');

    // Get base URL for constructing the frame embed
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setBaseUrl(window.location.origin);
        }
    }, []);

    // Load track data from Supabase
    useEffect(() => {
        const loadTrack = async () => {
            if (!trackId || typeof trackId !== 'string') {
                setError('Invalid track ID');
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                // Try to fetch track from listening history first
                const response = await fetch(`/api/tracks/${trackId}`);

                if (!response.ok) {
                    throw new Error(`Failed to fetch track: ${response.status}`);
                }

                const data = await response.json();

                if (data.error) {
                    throw new Error(data.error);
                }

                if (data.track) {
                    setTrack({
                        id: data.track.id,
                        title: data.track.track_title || data.track.title,
                        artist: data.track.track_artist || data.track.artist,
                        album: data.track.track_album || data.track.album,
                        albumArt: data.track.track_cover_art || data.track.coverArt || '/api/placeholder/300/300',
                        coverArt: data.track.track_cover_art || data.track.coverArt,
                        spotifyId: data.track.spotify_track_id,
                        uri: data.track.track_uri,
                        popularity: data.track.track_popularity,
                        duration: data.track.track_duration_ms ?
                            formatDuration(data.track.track_duration_ms) : undefined,
                        listenCount: data.listenCount || 0,
                        sharedBy: data.user ? {
                            username: data.user.username,
                            displayName: data.user.display_name,
                            fid: data.user.fid
                        } : undefined,
                        listenedAt: data.track.listened_at
                    });
                } else {
                    setError('Track not found');
                }

            } catch (err) {
                console.error('Error loading track:', err);
                setError(err instanceof Error ? err.message : 'Failed to load track');
            } finally {
                setIsLoading(false);
            }
        };

        loadTrack();
    }, [trackId]);

    // Format duration from milliseconds to MM:SS
    const formatDuration = (ms: number): string => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Format time ago
    const formatTimeAgo = (dateString?: string): string => {
        if (!dateString) return '';

        const date = new Date(dateString);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        return `${Math.floor(diff / 604800)}w ago`;
    };

    // When in Mini App mode, call ready to hide splash screen
    useEffect(() => {
        const init = async () => {
            if (isMiniApp && typeof sdk?.actions?.ready === 'function') {
                try {
                    await sdk.actions.ready();
                } catch (error) {
                    console.error('Error calling ready:', error);
                }
            }
        };

        init();
    }, [isMiniApp]);

    // Handle opening the full app
    const handleOpenApp = () => {
        if (isMiniApp && typeof sdk?.actions?.openUrl === 'function') {
            sdk.actions.openUrl(baseUrl);
        } else {
            window.location.href = baseUrl;
        }
    };

    // Handle opening in Spotify
    const handleOpenSpotify = () => {
        if (!track) return;

        let spotifyUrl = '';

        if (track.uri) {
            spotifyUrl = track.uri.replace('spotify:', 'https://open.spotify.com/');
        } else if (track.spotifyId) {
            spotifyUrl = `https://open.spotify.com/track/${track.spotifyId}`;
        } else {
            // Fallback to search
            spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(`${track.title} ${track.artist}`)}`;
        }

        if (isMiniApp && typeof sdk?.actions?.openUrl === 'function') {
            sdk.actions.openUrl(spotifyUrl);
        } else {
            window.open(spotifyUrl, '_blank');
        }
    };

    // Create share message for this track
    const shareMessage = track ?
        (track.sharedBy ?
            `🎵 ${track.sharedBy.displayName || track.sharedBy.username} was listening to ${track.title} by ${track.artist} on Timbra!` :
            `🎵 Check out ${track.title} by ${track.artist} on Timbra!`
        ) :
        '🎵 Check out Timbra - share your music with friends on Farcaster!';

    // Create the frame embed JSON for this specific share page
    const frameEmbed = {
        version: "next",
        imageUrl: track?.albumArt || `${baseUrl}/image.png`,
        button: {
            title: "🎵 Open App",
            action: {
                type: "launch_frame",
                url: `${baseUrl}/share/${trackId}`,
                name: "Timbra",
                splashImageUrl: `${baseUrl}/splash.png`,
                splashBackgroundColor: "#f7f7f7"
            }
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="flex flex-col min-h-screen bg-gradient-to-b from-purple-900 to-black text-white">
                <div className="flex-grow flex items-center justify-center">
                    <div className="animate-pulse text-center">
                        <div className="w-48 h-48 bg-purple-700/30 rounded-lg mb-4 mx-auto"></div>
                        <div className="h-6 bg-purple-700/30 rounded w-48 mb-2 mx-auto"></div>
                        <div className="h-4 bg-purple-700/30 rounded w-32 mx-auto"></div>
                        <p className="text-xl mt-4">Loading track...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !track) {
        return (
            <div className="flex flex-col min-h-screen bg-gradient-to-b from-purple-900 to-black text-white">
                <div className="flex-grow flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-red-800/30 rounded-full flex items-center justify-center mb-4 mx-auto">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" y1="9" x2="9" y2="15" />
                                <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                        </div>
                        <p className="text-xl mb-2">{error || 'Track not found'}</p>
                        <p className="text-gray-400 mb-4">This track may have been removed or the link is invalid.</p>
                        <Button onClick={handleOpenApp}>Go to Home</Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>{`${track.title} by ${track.artist} - Timbra`}</title>
                <meta name="description" content={shareMessage} />
                <meta property="og:title" content={`${track.title} by ${track.artist} - Timbra`} />
                <meta property="og:description" content={shareMessage} />
                <meta property="og:image" content={track.albumArt} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={`${baseUrl}/share/${trackId}`} />

                {/* Twitter Card meta tags */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={`${track.title} by ${track.artist} - Timbra`} />
                <meta name="twitter:description" content={shareMessage} />
                <meta name="twitter:image" content={track.albumArt} />

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
                    <h1 className="text-2xl font-bold mb-6 text-center">Timbra</h1>

                    <div className="bg-purple-800/30 rounded-lg p-6">
                        <div className="flex flex-col items-center">
                            <div className="relative w-48 h-48 mb-4">
                                <img
                                    src={track.albumArt}
                                    alt={`${track.album || 'Album'} by ${track.artist}`}
                                    className="w-full h-full object-cover rounded-lg"
                                    onError={(e) => {
                                        e.currentTarget.src = '/api/placeholder/300/300';
                                    }}
                                />
                                {/* Spotify overlay */}
                                <div className="absolute bottom-2 right-2">
                                    <button
                                        onClick={handleOpenSpotify}
                                        className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-full transition-colors"
                                        title="Open in Spotify"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.6 0-.359.24-.66.54-.78 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.242 1.021zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <h2 className="text-xl font-semibold text-center">{track.title}</h2>
                            <p className="text-lg text-gray-300 text-center">{track.artist}</p>
                            {track.album && (
                                <p className="text-sm text-gray-400 text-center">{track.album}</p>
                            )}

                            {/* Track metadata */}
                            <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                {track.duration && (
                                    <div className="bg-purple-900/50 px-3 py-1 rounded-full text-sm">
                                        {track.duration}
                                    </div>
                                )}
                                {track.popularity && (
                                    <div className="bg-purple-900/50 px-3 py-1 rounded-full text-sm">
                                        {track.popularity}% popularity
                                    </div>
                                )}
                                {track.listenCount !== undefined && track.listenCount > 0 && (
                                    <div className="bg-purple-900/50 px-3 py-1 rounded-full text-sm">
                                        {track.listenCount} plays on Timbra
                                    </div>
                                )}
                            </div>

                            {/* Shared by info */}
                            {track.sharedBy && (
                                <div className="mt-4 text-center">
                                    <p className="text-sm text-gray-400">
                                        Shared by <span className="text-purple-300 font-medium">
                                            {track.sharedBy.displayName || track.sharedBy.username}
                                        </span>
                                    </p>
                                    {track.listenedAt && (
                                        <p className="text-xs text-gray-500">
                                            {formatTimeAgo(track.listenedAt)}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-6 space-y-3">
                        <Button
                            onClick={handleOpenSpotify}
                            className="w-full bg-green-600 hover:bg-green-700"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="mr-2">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.6 0-.359.24-.66.54-.78 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.242 1.021zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                            Open in Spotify
                        </Button>
                    </div>

                    {/* Share Card */}
                    <ShareCard
                        title="Share this track"
                        message={shareMessage}
                        imageUrl={track.albumArt}
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