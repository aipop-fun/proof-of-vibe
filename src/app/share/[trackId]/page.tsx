/* eslint-disable @next/next/no-img-element, react/no-unescaped-entities, @typescript-eslint/no-explicit-any */

"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '~/lib/stores/authStore';
import { Button } from '~/components/ui/Button';
import { ShareCard } from '~/components/ShareCard';
import { useFrame } from '~/components/providers/FrameProvider';
import Head from 'next/head';
import sdk from "@farcaster/frame-sdk";

// Mock track data for demo - in production, fetch from your database
const mockTracks = {
    "1": {
        id: "1",
        title: "Midnight City",
        artist: "M83",
        album: "Hurry Up, We're Dreaming",
        albumArt: "/api/placeholder/300/200",
        listenCount: 342
    },
    "2": {
        id: "2",
        title: "Blinding Lights",
        artist: "The Weeknd",
        album: "After Hours",
        albumArt: "/api/placeholder/300/200",
        listenCount: 567
    },
    "3": {
        id: "3",
        title: "Silk Chiffon",
        artist: "MUNA, Phoebe Bridgers",
        album: "MUNA",
        albumArt: "/api/placeholder/300/200",
        listenCount: 189
    },
};

export default function ShareTrackPage() {
    const { trackId } = useParams();
    const [track, setTrack] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { isMiniApp, context } = useFrame();
    const { isAuthenticated } = useAuthStore();
    const [baseUrl, setBaseUrl] = useState('');

    // Get base URL for constructing the frame embed
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setBaseUrl(window.location.origin);
        }
    }, []);

    // Simulate loading track data
    useEffect(() => {
        const loadTrack = async () => {
            setIsLoading(true);

            try {
                // In a real app, fetch from your API
                // const response = await fetch(`/api/tracks/${trackId}`);
                // const data = await response.json();

                // For demo purposes, use mock data
                setTimeout(() => {
                    if (trackId && typeof trackId === 'string') {
                        const foundTrack = mockTracks[trackId as keyof typeof mockTracks];
                        setTrack(foundTrack || null);
                        setIsLoading(false);
                    } else {
                        setTrack(null);
                        setIsLoading(false);
                    }
                }, 800);
            } catch (error) {
                console.error('Error loading track:', error);
                setIsLoading(false);
            }
        };

        loadTrack();
    }, [trackId]);

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

    // Create share message for this track
    const shareMessage = track ?
        `🎵 I'm vibing to ${track.title} by ${track.artist} on Timbra!` :
        '🎵 Check out Timbra - share your music with friends on Farcaster!';

    // Create the frame embed JSON for this specific share page
    const frameEmbed = {
        version: "next",
        imageUrl: track?.albumArt || `${baseUrl}/opengraph-image`,
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

    if (isLoading) {
        return (
            <div className="flex flex-col min-h-screen bg-gradient-to-b from-purple-900 to-black text-white">
                <div className="flex-grow flex items-center justify-center">
                    <div className="animate-pulse text-center">
                        <p className="text-xl">Loading track...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!track) {
        return (
            <div className="flex flex-col min-h-screen bg-gradient-to-b from-purple-900 to-black text-white">
                <div className="flex-grow flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-xl mb-4">Track not found</p>
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
                <meta name="description" content={`Check out ${track.title} by ${track.artist} on Timbra!`} />
                <meta property="og:title" content={`${track.title} by ${track.artist} - Timbra`} />
                <meta property="og:description" content={`Check out ${track.title} by ${track.artist} on Timbra!`} />
                <meta property="og:image" content={track.albumArt} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={`${baseUrl}/share/${trackId}`} />

                {/* Twitter Card meta tags */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={`${track.title} by ${track.artist} - Timbra`} />
                <meta name="twitter:description" content={`Check out ${track.title} by ${track.artist} on Timbra!`} />
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
                                    alt={`${track.album} by ${track.artist}`}
                                    className="w-full h-full object-cover rounded-lg"
                                />
                            </div>

                            <h2 className="text-xl font-semibold">{track.title}</h2>
                            <p className="text-lg text-gray-300">{track.artist}</p>
                            <p className="text-sm text-gray-400">{track.album}</p>

                            <div className="mt-4 bg-purple-900/50 px-3 py-1 rounded-full text-sm">
                                {track.listenCount} plays on Timbra
                            </div>
                        </div>
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