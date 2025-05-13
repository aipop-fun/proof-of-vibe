/* eslint-disable  @typescript-eslint/no-unused-vars, react/no-unescaped-entities */
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "~/components/ui/Button";
import sdk from "@farcaster/frame-sdk";
import { useFrame } from "./providers/FrameProvider";
import { useAuthStore } from "~/lib/stores/authStore";
import QRCode from 'react-qr-code';

export function SpotifyConnect({ onBack }: { onBack: () => void }) {
    const { isMiniApp, context } = useFrame();
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const router = useRouter();
    const { fid } = useAuthStore();

    // Gerar URL para autenticação do Spotify
    const spotifyAuthUrl = `${process.env.NEXT_PUBLIC_URL || window.location.origin}/auth/signin/spotify?source=miniapp&fid=${fid}`;

    const handleConnectSpotify = () => {
        setIsLoading(true);
        setErrorMessage(null);

        if (isMiniApp && typeof sdk?.actions?.openUrl === 'function') {
            // Abrir URL de autenticação do Spotify diretamente no mini app
            sdk.actions.openUrl(spotifyAuthUrl);

            // Não fazemos setIsLoading(false) aqui porque vamos sair do mini app
        } else {
            // Fallback para navegador normal
            window.open(spotifyAuthUrl, '_blank');
            setIsLoading(false);
        }
    };

    return (
        <div
            className="flex flex-col items-center justify-center min-h-screen px-4 py-6 text-center"
            style={isMiniApp ? {
                paddingTop: context?.client.safeAreaInsets?.top ?? 0,
                paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
                paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
                paddingRight: context?.client.safeAreaInsets?.right ?? 0,
            } : {}}
        >
            {/* Logo e título */}
            <div className="mb-6">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="4" />
                        <path d="M12 6v2" />
                        <path d="M12 16v2" />
                        <path d="M6 12h2" />
                        <path d="M16 12h2" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold">Connect Spotify</h1>
                <p className="text-gray-400 mt-2">
                    Link your Spotify account to share your music with Farcaster friends.
                </p>
            </div>

            {/* QR Code */}
            <div className="bg-white p-4 rounded-lg mb-6">
                <QRCode
                    size={200}
                    value={spotifyAuthUrl}
                    viewBox={`0 0 200 200`}
                />
            </div>

            {/* Instruções */}
            <div className="mb-8">
                <p className="text-sm text-gray-300 mb-2">
                    Scan this code with your camera or click the button below to connect.
                </p>
                {errorMessage && (
                    <div className="text-red-400 text-sm mt-2">
                        {errorMessage}
                    </div>
                )}
            </div>

            {/* Botões */}
            <div className="flex flex-col w-full max-w-xs gap-3">
                <Button
                    onClick={handleConnectSpotify}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg flex items-center justify-center gap-2"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <span className="animate-spin mr-2">↻</span>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18V5l12-2v13" />
                            <circle cx="6" cy="18" r="3" />
                            <circle cx="18" cy="16" r="3" />
                        </svg>
                    )}
                    {isLoading ? "Connecting..." : "Connect Spotify"}
                </Button>

                <button
                    onClick={onBack}
                    className="text-gray-400 hover:text-white text-sm py-2"
                >
                    Skip for now
                </button>
            </div>

            {/* Informações de privacidade */}
            <div className="mt-8 text-xs text-gray-500 max-w-xs">
                <p>
                    By connecting, you're allowing Timbra to access your Spotify listening data.
                    We only use this to show what you're playing to your friends.
                </p>
            </div>
        </div>
    );
}