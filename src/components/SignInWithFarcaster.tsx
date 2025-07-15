/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars,  @next/next/no-img-element, @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use client";

import { useCallback, useState, useEffect } from "react";
import { signIn as nextAuthSignIn, getCsrfToken } from "next-auth/react";
import { createAppClient, viemConnector } from '@farcaster/auth-client';
import { AuthClientError, SignInButton, StatusAPIResponse, AuthKitProvider } from '@farcaster/auth-kit';
import '@farcaster/auth-kit/styles.css';
import { Button } from "~/components/ui/Button";
import { useAuthStore } from "~/lib/stores/authStore";
import { useRouter } from "next/navigation";

// Type definitions
interface AuthStore {
  setFarcasterAuth: (auth: { fid: number }) => void;
}

interface AppClientAuth {
  success: boolean;
  fid?: number;
  username?: string;
  displayName?: string;
  bio?: string;
  pfpUrl?: string;
}

interface FrameV2SignInError {
  message: string;
  code?: string;
}

interface FrameV2SignInResult {
  message: string;
  signature: string;
}

interface FrameV2Context {
  user?: {
    fid: number;
    username?: string;
  };
}

type AuthenticationStatus = 'loading' | 'unauthenticated' | 'authenticated';
type AuthMethod = 'app-client' | 'auth-kit' | 'frame-v2';

// App Client configuration
const createFarcasterAppClient = () => {
  try {
    return createAppClient({
      relay: 'https://relay.farcaster.xyz',
      ethereum: viemConnector(
        process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL || 'https://mainnet.optimism.io'
      ),
      version: 'v1'
    });
  } catch (error) {
    console.error('Failed to create Farcaster App Client:', error);
    return null;
  }
};

// Auth Kit configuration (fallback)
const getAuthKitConfig = () => {
  const config = {
    rpcUrl: process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
    domain: process.env.NEXT_PUBLIC_DOMAIN || 'timbra.aipop.fun',
    siweUri: process.env.NEXT_PUBLIC_SITE_URL || 'https://timbra.aipop.fun/login',
    relay: 'https://relay.farcaster.xyz',
  };

  // Ajuste automático para localhost
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    config.domain = 'localhost:3000';
    config.siweUri = 'http://localhost:3000/login';
  }

  return config;
};

// Safe Frame V2 SDK access
const getFrameV2SDK = () => {
  try {
    if (typeof window === 'undefined') return null;

    const SDK = (window as any)?.FrameSDK;
    if (SDK) return SDK;

    try {
      const FrameSDK = require('@farcaster/miniapp-sdk');
      return FrameSDK.default || FrameSDK;
    } catch {
      return null;
    }
  } catch (error) {
    console.warn('Error accessing Frame V2 SDK:', error);
    return null;
  }
};

// App Client Sign In Button - Implementação oficial corrigida
function AppClientSignInButton({
  nonce,
  onSuccess,
  onError
}: {
  nonce: string;
  onSuccess: (response: AppClientAuth) => Promise<void>;
  onError: (error: Error) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [channelToken, setChannelToken] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsLoading(true);
    setQrCodeUrl(null);

    try {
      const appClient = createFarcasterAppClient();
      if (!appClient) {
        throw new Error('Failed to initialize Farcaster App Client');
      }

      // Criar um canal de relay conforme documentação oficial
      const channelResponse = await appClient.createChannel({
        siweUri: getAuthKitConfig().siweUri,
        domain: getAuthKitConfig().domain,
        nonce: nonce,
      });

      console.log('Channel response:', channelResponse);

      // Verificar se houve erro
      if (channelResponse.isError) {
        throw channelResponse.error || new Error('Failed to create channel');
      }

      // Extrair dados do canal
      const { channelToken: token, url, nonce: channelNonce } = channelResponse.data;

      setChannelToken(token);
      setQrCodeUrl(url);

      console.log('Channel created successfully:', {
        channelToken: token,
        url: url,
        nonce: channelNonce
      });

      // Polling do status do canal
      const pollChannelStatus = async (): Promise<boolean> => {
        try {
          const statusResponse = await appClient.status({
            channelToken: token,
          });

          console.log('Channel status response:', statusResponse);

          // Verificar se houve erro na resposta
          if (statusResponse.isError) {
            throw statusResponse.error || new Error('Status check failed');
          }

          const { state, nonce: statusNonce } = statusResponse.data;

          if (state === 'completed') {
            // Verificar a assinatura usando o nonce do canal
            const verifyResponse = await appClient.verify({
              channelToken: token,
              nonce: statusNonce || channelNonce, // Usar o nonce do status ou do canal
            });

            console.log('Verify response:', verifyResponse);

            if (verifyResponse.isError) {
              throw verifyResponse.error || new Error('Verification failed');
            }

            const { success, fid, username, displayName, bio, pfpUrl } = verifyResponse.data;

            if (success && fid) {
              await onSuccess({
                success: true,
                fid: fid,
                username: username,
                displayName: displayName,
                bio: bio,
                pfpUrl: pfpUrl,
              });
              return true; // Parar polling
            } else {
              throw new Error('Invalid verification response');
            }
          } else if (state === 'errored') {
            throw new Error(statusResponse.data.error || 'Authentication failed');
          }

          // Continuar polling se estado for 'pending'
          return false;
        } catch (error) {
          console.error('Polling error:', error);
          throw error;
        }
      };

      // Sistema de polling melhorado
      const startPolling = () => {
        const maxAttempts = 60; // 2 minutos (2 segundos * 60)
        let attempts = 0;

        const pollInterval = setInterval(async () => {
          try {
            const completed = await pollChannelStatus();

            if (completed) {
              clearInterval(pollInterval);
              setIsLoading(false);
              setQrCodeUrl(null);
              setChannelToken(null);
              return;
            }

            attempts++;
            if (attempts >= maxAttempts) {
              clearInterval(pollInterval);
              throw new Error('Authentication timeout - please try again');
            }
          } catch (error) {
            clearInterval(pollInterval);
            setIsLoading(false);
            setQrCodeUrl(null);
            setChannelToken(null);
            onError(error as Error);
          }
        }, 2000); // Poll a cada 2 segundos

        // Cleanup function para o componente
        return () => clearInterval(pollInterval);
      };

      // Iniciar polling após criar o canal
      startPolling();

    } catch (error) {
      console.error('App Client creation error:', error);
      setIsLoading(false);
      setQrCodeUrl(null);
      setChannelToken(null);
      onError(error as Error);
    }
  };

  const cancelSignIn = () => {
    setIsLoading(false);
    setQrCodeUrl(null);
    setChannelToken(null);
  };

  // Interface de QR Code melhorada
  if (qrCodeUrl) {
    return (
      <div className="w-full max-w-sm mx-auto">
        <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
          {/* Header */}
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Sign in with Farcaster
            </h3>
            <p className="text-sm text-gray-600">
              Scan the QR code with your Farcaster app or click the button below
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white border-2 border-gray-100 rounded-xl">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}&margin=10`}
                alt="Farcaster QR Code"
                className="w-48 h-48"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
          </div>

          {/* Mobile deep link */}
          <div className="space-y-3 mb-6">
            <a
              href={qrCodeUrl}
              className="block w-full px-4 py-3 bg-purple-600 text-white text-center font-medium rounded-lg hover:bg-purple-700 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in Farcaster App
            </a>
          </div>

          {/* Status indicator */}
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-sm text-gray-600">Waiting for confirmation...</span>
          </div>

          {/* Cancel button */}
          <div className="text-center">
            <button
              onClick={cancelSignIn}
              className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Button
      onClick={handleSignIn}
      disabled={isLoading}
      className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full font-medium disabled:bg-gray-400 disabled:cursor-not-allowed w-full"
    >
      {isLoading ? (
        <span className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Creating secure channel...
        </span>
      ) : (
        "Sign in with Farcaster"
      )}
    </Button>
  );
}

// Frame V2 Sign In Button
function FrameV2SignInButton({
  nonce,
  onSuccess,
  onError
}: {
  nonce: string;
  onSuccess: (response: FrameV2SignInResult) => Promise<void>;
  onError: (error: FrameV2SignInError) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);

    try {
      const FrameSDK = getFrameV2SDK();
      if (!FrameSDK) {
        throw new Error('Frame V2 SDK not available');
      }

      const result = await FrameSDK.actions.signIn({ nonce });
      await onSuccess(result);
    } catch (error) {
      onError({
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'FRAME_V2_ERROR'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSignIn}
      disabled={loading}
      className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full font-medium disabled:bg-gray-400 disabled:cursor-not-allowed w-full"
    >
      {loading ? "Signing in..." : "Sign in with Farcaster"}
    </Button>
  );
}

// Auth Kit wrapper (fallback final)
function AuthKitSignInWrapper({
  nonce,
  onSuccess,
  onError
}: {
  nonce: string;
  onSuccess: (response: StatusAPIResponse) => Promise<void>;
  onError: (error: AuthClientError | undefined) => void;
}) {
  return (
    <div className="w-full">
      <AuthKitProvider config={getAuthKitConfig()}>
        <SignInButton
          nonce={nonce}
          onSuccess={onSuccess}
          onError={onError}
          hideSignOut
        />
      </AuthKitProvider>
    </div>
  );
}

/**
 * SignInWithFarcaster component
 * Prioridade: Frame V2 > App Client > Auth Kit
 */
export function SignInWithFarcaster() {
  // Estados
  const [nonce, setNonce] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<AuthMethod>('app-client');
  const [authStatus, setAuthStatus] = useState<AuthenticationStatus>('unauthenticated');
  const [signInFailure, setSignInFailure] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Frame V2 específico
  const [isFrameV2, setIsFrameV2] = useState(false);
  const [frameV2Context, setFrameV2Context] = useState<FrameV2Context | null>(null);

  // Success responses
  const [appClientResponse, setAppClientResponse] = useState<AppClientAuth | null>(null);
  const [frameV2Response, setFrameV2Response] = useState<FrameV2SignInResult | null>(null);
  const [authKitResponse, setAuthKitResponse] = useState<StatusAPIResponse | null>(null);

  const router = useRouter();
  const { setFarcasterAuth } = useAuthStore() as AuthStore;

  // Detectar Frame V2 primeiro
  useEffect(() => {
    let isMounted = true;

    const checkFrameV2 = async () => {
      try {
        const FrameSDK = getFrameV2SDK();
        if (FrameSDK) {
          const context = await Promise.race([
            FrameSDK.context,
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 2000)
            )
          ]) as FrameV2Context;

          if (isMounted && context?.user?.fid) {
            setIsFrameV2(true);
            setFrameV2Context(context);
            setAuthMethod('frame-v2');

            // Auto-autenticar
            setFarcasterAuth({ fid: context.user.fid });
            await FrameSDK.actions.ready();
            console.log('Auto-authenticated with Frame V2:', context.user.fid);
          }
        }
      } catch (error) {
        console.log('Frame V2 not available:', error);
      } finally {
        if (isMounted) {
          setIsInitialized(true);
        }
      }
    };

    checkFrameV2();

    return () => {
      isMounted = false;
    };
  }, [setFarcasterAuth]);

  // Fetch nonce
  useEffect(() => {
    if (!isInitialized || nonce) return;

    const fetchNonce = async () => {
      try {
        const csrfToken = await getCsrfToken();
        setNonce(csrfToken || `nonce_${Date.now()}_${Math.random()}`);
      } catch (error) {
        console.error('Failed to fetch nonce:', error);
        setNonce(`fallback_${Date.now()}_${Math.random()}`);
      }
    };

    fetchNonce();
  }, [isInitialized, nonce]);

  // Handlers de erro melhorados
  const handleError = useCallback((error: Error | AuthClientError | FrameV2SignInError | undefined) => {
    console.error('Sign in error:', error);
    setAuthStatus('unauthenticated');

    const message = error instanceof Error ? error.message :
      error?.message || 'Authentication failed';

    // Detectar erros específicos para fallback automático
    const isAppClientError = message.includes('verify is not a function') ||
      message.includes('CSRF') ||
      message.includes('Failed to initialize') ||
      message.includes('createChannel');

    if (isAppClientError && authMethod === 'app-client') {
      console.log('App Client failed, switching to Auth Kit fallback');
      setSignInFailure('Connection issue detected. Switching to fallback method...');

      // Auto-switch para Auth Kit após 2 segundos
      setTimeout(() => {
        setSignInFailure(null);
        setAuthMethod('auth-kit');
      }, 2000);
    } else {
      setSignInFailure(message);
    }
  }, [authMethod]);

  // Completar autenticação
  const completeAuth = useCallback(async (
    fid: number,
    message: string,
    signature: string,
    username?: string
  ) => {
    try {
      setAuthStatus('loading');
      setFarcasterAuth({ fid });

      const authResult = await nextAuthSignIn('credentials', {
        message,
        signature,
        redirect: false,
      });

      if (authResult?.error) {
        throw new Error(authResult.error);
      }

      setAuthStatus('authenticated');
      setTimeout(() => router.push('/'), 1500);
    } catch (error) {
      handleError(error as Error);
    }
  }, [setFarcasterAuth, router, handleError]);

  // Success handlers com tratamento de fallback
  const handleAppClientSuccess = useCallback(async (response: AppClientAuth) => {
    if (!response.fid) {
      handleError(new Error('No FID received'));
      return;
    }

    setAppClientResponse(response);
    await completeAuth(
      response.fid,
      '', // App Client gerencia internamente
      '', // App Client gerencia internamente
      response.username
    );
  }, [completeAuth, handleError]);

  const handleAppClientError = useCallback((error: Error) => {
    // Se é um erro que requer fallback, mudar método automaticamente
    if (error.message === 'APP_CLIENT_FALLBACK_REQUIRED') {
      console.log('App Client failed, auto-switching to Auth Kit');
      setAuthMethod('auth-kit');
      setSignInFailure('Switching to fallback authentication method...');

      // Limpar erro após switch
      setTimeout(() => {
        setSignInFailure(null);
      }, 1500);
    } else {
      handleError(error);
    }
  }, [handleError]);

  const handleFrameV2Success = useCallback(async (response: FrameV2SignInResult) => {
    if (!frameV2Context?.user?.fid) {
      handleError(new Error('No FID available'));
      return;
    }

    setFrameV2Response(response);
    await completeAuth(
      frameV2Context.user.fid,
      response.message,
      response.signature,
      frameV2Context.user.username
    );
  }, [frameV2Context, completeAuth, handleError]);

  const handleAuthKitSuccess = useCallback(async (response: StatusAPIResponse) => {
    if (!response.fid) {
      handleError(new Error('No FID received'));
      return;
    }

    setAuthKitResponse(response);
    await completeAuth(
      response.fid,
      response.message || '',
      response.signature || '',
      response.username
    );
  }, [completeAuth, handleError]);

  // Estados de renderização
  if (authStatus === 'authenticated' ||
    appClientResponse?.success ||
    frameV2Response ||
    (authKitResponse?.state === 'completed' && authKitResponse.fid)) {
    const user = appClientResponse || frameV2Context?.user || authKitResponse;
    return (
      <div className="flex flex-col items-center">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <p className="text-green-800 font-medium">✅ Successfully signed in!</p>
          <p className="text-green-600 text-sm mt-1">
            Welcome{user?.username ? `, ${user.username}` : ''}!
          </p>
          <p className="text-green-500 text-xs mt-1">
            Method: {authMethod}
          </p>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Redirecting to dashboard...
        </div>
      </div>
    );
  }

  if (!isInitialized || !nonce) {
    return (
      <div className="flex flex-col items-center">
        <Button disabled className="bg-gray-400 text-white px-6 py-3 rounded-full font-medium cursor-not-allowed">
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Initializing...
          </span>
        </Button>
        <p className="mt-2 text-sm text-gray-500">
          {!isInitialized ? 'Detecting environment...' : 'Loading authentication...'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* Método de autenticação baseado na prioridade */}
      {isFrameV2 ? (
        <FrameV2SignInButton
          nonce={nonce}
          onSuccess={handleFrameV2Success}
          onError={handleError}
        />
      ) : (
        <AuthKitSignInWrapper
          nonce={nonce}
          onSuccess={handleAuthKitSuccess}
          onError={handleError}
        />
      )}

      {/* Estados de erro */}
      {signInFailure && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg max-w-sm">
          <p className="text-red-800 text-sm font-medium">⚠️ Sign In Failed</p>
          <p className="text-red-600 text-xs mt-1">{signInFailure}</p>
          {authMethod === 'app-client' && (
            <p className="text-red-500 text-xs mt-1">Switching to fallback method...</p>
          )}
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => {
                setSignInFailure(null);
                setAuthMethod('app-client');
              }}
              className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
            >
              Try Again
            </button>
            {authMethod !== 'auth-kit' && (
              <button
                onClick={() => {
                  setSignInFailure(null);
                  setAuthMethod('auth-kit');
                }}
                className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
              >
                Use Fallback
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading state */}
      {authStatus === 'loading' && (
        <div className="mt-4 flex items-center">
          <svg className="animate-spin h-4 w-4 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-blue-600 text-sm">Completing authentication...</p>
        </div>
      )}

      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-4 p-2 bg-gray-100 rounded text-xs max-w-sm">
          <summary className="cursor-pointer font-medium">🐛 Debug Info</summary>
          <div className="mt-2 space-y-1">
            <p>Method: <span className="font-medium">{authMethod}</span></p>
            <p>Frame V2: {isFrameV2 ? '✅ Yes' : '❌ No'}</p>
            <p>Nonce: {nonce ? '✅ Available' : '❌ None'}</p>
            <p>Status: {authStatus}</p>
            <p>Error: {signInFailure || 'None'}</p>
            <div className="mt-2 flex gap-1">
              <button
                onClick={() => setAuthMethod('app-client')}
                className={`px-2 py-1 text-xs rounded ${authMethod === 'app-client' ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}
              >
                App Client
              </button>
              <button
                onClick={() => setAuthMethod('auth-kit')}
                className={`px-2 py-1 text-xs rounded ${authMethod === 'auth-kit' ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}
              >
                Auth Kit
              </button>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}