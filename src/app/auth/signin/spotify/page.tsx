/* eslint-disable react/no-unescaped-entities, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "~/components/ui/Button";
import sdk from "@farcaster/frame-sdk";

export default function SpotifySigninPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFromMiniApp, setIsFromMiniApp] = useState(false);
    const [sourceFid, setSourceFid] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Verificar se viemos do mini app
        const source = searchParams.get('source');
        const fid = searchParams.get('fid');

        if (source === 'miniapp') {
            setIsFromMiniApp(true);
            if (fid) {
                setSourceFid(fid);
            }
        }

        // Começar o processo de login automaticamente
        handleLogin();
    }, [searchParams]);

    const handleLogin = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Para garantir que o servidor saiba de onde viemos
            let url = '/api/auth/csrf';

            // Adicionar parâmetros do mini app, se necessário
            if (isFromMiniApp && sourceFid) {
                url += `?source=miniapp&fid=${sourceFid}`;
            }

            // Buscar token CSRF antes de iniciar fluxo de autenticação
            const csrfResponse = await fetch(url);

            if (!csrfResponse.ok) {
                throw new Error('Failed to get CSRF token');
            }

            // Iniciar o processo de autenticação redirecionando para o Spotify
            window.location.href = '/api/auth/signin/spotify';
        } catch (err) {
            console.error('Error starting Spotify authentication:', err);
            setError('Failed to start authentication process. Please try again.');
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        if (isFromMiniApp) {
            // Se veio do mini app, voltar para o Warpcast
            // URL é o formato recomendado para voltar ao app Farcaster
            window.location.href = 'https://warpcast.com/~/apps/timbra';
        } else {
            // Caso contrário, voltar para a página inicial
            router.push('/');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 py-6 bg-gradient-to-b from-purple-900 to-black text-white">
            <div className="max-w-md w-full bg-black/50 p-8 rounded-xl shadow-lg backdrop-blur">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18V5l12-2v13" />
                            <circle cx="6" cy="18" r="3" />
                            <circle cx="18" cy="16" r="3" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Connect with Spotify</h1>
                    <p className="text-gray-300">
                        Connect your Spotify account to share your music with friends on Farcaster.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-900/50 border border-red-600 p-4 rounded-lg text-sm mb-6">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500 mb-4"></div>
                            <p className="text-gray-300">Connecting to Spotify...</p>
                        </div>
                    ) : (
                        <>
                            <Button
                                onClick={handleLogin}
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 18V5l12-2v13" />
                                    <circle cx="6" cy="18" r="3" />
                                    <circle cx="18" cy="16" r="3" />
                                </svg>
                                Connect with Spotify
                            </Button>

                            <button
                                onClick={handleCancel}
                                className="w-full text-gray-400 hover:text-white text-sm py-2"
                            >
                                Cancel
                            </button>
                        </>
                    )}
                </div>

                <div className="mt-8 text-xs text-gray-500">
                    <p>
                        By connecting, you're allowing Timbra to access your Spotify listening data.
                        We only use this to show what you're playing to your friends.
                    </p>
                </div>
            </div>
        </div>
    );
}