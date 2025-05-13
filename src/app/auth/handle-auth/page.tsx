/* eslint-disable  @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '~/lib/stores/authStore';
import sdk from "@farcaster/frame-sdk";

export default function HandleAuth() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isProcessing, setIsProcessing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFromMiniApp, setIsFromMiniApp] = useState(false);
    const [sourceFid, setSourceFid] = useState<string | null>(null);

    // Acessar store do Zustand para salvar dados
    const {
        setSpotifyAuth,
        linkAccounts,
        fid
    } = useAuthStore();

    useEffect(() => {
        async function processAuthData() {
            try {
                // Extrair parâmetros de autenticação da URL
                const accessToken = searchParams.get('access_token');
                const refreshToken = searchParams.get('refresh_token');
                const expiresIn = searchParams.get('expires_in');
                const spotifyId = searchParams.get('spotify_id');
                const displayName = searchParams.get('display_name');
                const email = searchParams.get('email');
                const image = searchParams.get('image');
                const authSuccess = searchParams.get('auth_success');

                // Verificar se viemos do mini app
                const source = searchParams.get('source');
                const paramFid = searchParams.get('fid');

                if (source === 'miniapp') {
                    setIsFromMiniApp(true);
                    if (paramFid) {
                        setSourceFid(paramFid);
                    }
                }

                // Verificar se autenticação foi bem-sucedida
                if (authSuccess !== 'true' || !accessToken || !refreshToken || !spotifyId) {
                    throw new Error('Authentication failed or incomplete data received');
                }

                // Salvar dados do Spotify no Zustand store
                setSpotifyAuth({
                    accessToken,
                    refreshToken,
                    expiresIn: expiresIn ? parseInt(expiresIn) : 3600,
                    tokenTimestamp: Date.now(),
                    spotifyId,
                    displayName: displayName || '',
                    email: email || '',
                    profileImage: image || '',
                });

                // Calcular qual FID usar para vincular contas
                const fidToUse = sourceFid || fid;

                // Se temos FID, vincular as contas no backend
                if (fidToUse) {
                    console.log(`Linking accounts for FID: ${fidToUse} and Spotify ID: ${spotifyId}`);

                    // Chamar API para vincular contas
                    const linkResult = await linkAccounts(Number(fidToUse), spotifyId);

                    if (!linkResult.success) {
                        console.warn("Account linking warning:", linkResult.error);
                        // Continuamos mesmo se o link falhar - podemos tentar novamente depois
                    }
                }

                // Decidir para onde redirecionar
                if (isFromMiniApp) {
                    // Voltar para o app no Warpcast após um pequeno delay
                    setTimeout(() => {
                        window.location.href = 'https://warpcast.com/~/apps/timbra';
                    }, 1500);
                } else {
                    // Redirecionar para dashboard
                    router.push('/');
                }
            } catch (err) {
                console.error('Error processing auth data:', err);
                setError(err instanceof Error ? err.message : 'Failed to process authentication data');
            } finally {
                setIsProcessing(false);
            }
        }

        processAuthData();
    }, [searchParams, router, setSpotifyAuth, linkAccounts, fid]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-gradient-to-b from-purple-900 to-black text-white">
            <div className="max-w-md w-full bg-black/50 p-8 rounded-xl shadow-lg backdrop-blur text-center">
                {isProcessing ? (
                    <>
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-6"></div>
                        <h1 className="text-xl font-bold mb-2">Connecting your accounts</h1>
                        <p className="text-gray-300">Please wait while we finish setting up your account...</p>
                    </>
                ) : error ? (
                    <>
                        <div className="w-12 h-12 bg-red-600/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold mb-2">Connection Error</h1>
                        <p className="text-red-400 mb-4">{error}</p>
                        <button
                            onClick={() => router.push('/')}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"
                        >
                            Return to Dashboard
                        </button>
                    </>
                ) : (
                    <>
                        <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold mb-2">Successfully Connected!</h1>
                        <p className="text-gray-300 mb-2">Your Spotify account has been linked.</p>
                        {isFromMiniApp ? (
                            <p className="text-green-400">Returning to Warpcast...</p>
                        ) : (
                            <button
                                onClick={() => router.push('/')}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg mt-4"
                            >
                                Continue to Dashboard
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}