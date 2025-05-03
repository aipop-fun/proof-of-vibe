/* eslint-disable react/no-unescaped-entities,  @typescript-eslint/no-unused-vars, @typescript-eslint/ban-ts-comment */
// @ts-nocheck

"use client";

import { useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "~/components/ui/Button";
import { SignInWithFarcaster } from "~/components/SignInWithFarcaster";

export function AccountLinking() {
  const { data: session, status, update } = useSession();
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Verificar se o usuário tem ambas as contas, mas elas não estão vinculadas
  const needsLinking = (
    session?.user?.fid &&
    session?.user?.spotifyId &&
    !session?.user?.isLinked
  );

  // Verificar se o usuário tem apenas um tipo de conta
  const hasOnlyFarcaster = session?.user?.fid && !session?.user?.spotifyId;
  const hasOnlySpotify = session?.user?.spotifyId && !session?.user?.fid;

  // Função para vincular contas
  const handleLinkAccounts = async () => {
    if (!session?.user?.fid || !session?.user?.spotifyId) {
      return;
    }

    try {
      setIsLinking(true);
      setLinkError(null);

      // Chamar API para vincular as contas
      const response = await fetch('/api/auth/link-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fid: session.user.fid,
          spotifyId: session.user.spotifyId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to link accounts');
      }

      // Atualizar a sessão para refletir as contas vinculadas
      await update({
        ...session,
        user: {
          ...session.user,
          isLinked: true,
        },
      });

    } catch (error) {
      console.error('Error linking accounts:', error);
      setLinkError(error instanceof Error ? error.message : 'Failed to link accounts');
    } finally {
      setIsLinking(false);
    }
  };

  // Função para iniciar o login do Spotify
  const handleConnectSpotify = async () => {
    await signIn('spotify');
  };

  // Renderizar com base no estado de autenticação
  if (status === 'loading') {
    return (
      <div className="p-4 bg-purple-800/20 rounded-lg mb-4 animate-pulse">
        <p className="text-center">Loading account information...</p>
      </div>
    );
  }

  if (!session) {
    return null; // Não mostrar se não estiver autenticado
  }

  // Ambas as contas estão vinculadas
  if (session.user.isLinked) {
    return (
      <div className="p-4 bg-green-800/20 rounded-lg mb-4">
        <div className="flex items-center">
          <div className="flex-1">
            <p className="font-medium">Accounts Linked!</p>
            <p className="text-sm text-gray-300">Your Spotify and Farcaster accounts are successfully connected.</p>
          </div>
          <div>
            <Button
              onClick={() => signOut()}
              className="text-xs bg-transparent hover:bg-purple-800 border border-purple-600"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // As contas precisam ser vinculadas
  if (needsLinking) {
    return (
      <div className="p-4 bg-yellow-800/20 rounded-lg mb-4">
        <p className="font-medium mb-2">Connect Your Accounts</p>
        <p className="text-sm text-gray-300 mb-4">
          You're signed in with both Spotify and Farcaster, but they're not linked yet.
          Link them to share your music with friends.
        </p>

        {linkError && (
          <div className="p-2 mb-4 bg-red-900/30 text-red-200 rounded-md text-sm">
            {linkError}
          </div>
        )}

        <Button
          onClick={handleLinkAccounts}
          disabled={isLinking}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {isLinking ? "Linking..." : "Link Accounts"}
        </Button>
      </div>
    );
  }

  // Tem apenas Farcaster - precisa do Spotify
  if (hasOnlyFarcaster) {
    return (
      <div className="p-4 bg-blue-800/20 rounded-lg mb-4">
        <p className="font-medium mb-2">Connect Spotify</p>
        <p className="text-sm text-gray-300 mb-4">
          You're signed in with Farcaster. Connect your Spotify account to share your music.
        </p>

        <Button
          onClick={handleConnectSpotify}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          <SpotifyIcon className="w-4 h-4 mr-2" />
          Connect Spotify
        </Button>
      </div>
    );
  }

  // Tem apenas Spotify - precisa do Farcaster
  if (hasOnlySpotify) {
    return (
      <div className="p-4 bg-blue-800/20 rounded-lg mb-4">
        <p className="font-medium mb-2">Connect Farcaster</p>
        <p className="text-sm text-gray-300 mb-4">
          You're signed in with Spotify. Connect your Farcaster account to share your music.
        </p>

        <SignInWithFarcasterButton />
      </div>
    );
  }

  // Caso padrão - não deveria chegar aqui
  return null;
}

// Botão simples para iniciar o login do Farcaster
function SignInWithFarcasterButton() {
  return (
    <Button
      onClick={() => signIn('credentials')}
      className="w-full bg-purple-600 hover:bg-purple-700"
    >
      <FarcasterIcon className="w-4 h-4 mr-2" />
      Connect Farcaster
    </Button>
  );
}

// Componente de ícone do Spotify
function SpotifyIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.5 17.3c-.2.3-.6.5-1 .5-.2 0-.4-.1-.6-.2-2.1-1.3-4.8-1.5-7.9-.9-.4.1-.8-.1-.9-.5-.1-.4.1-.8.5-.9 3.5-.8 6.5-.5 9 1 .4.2.5.7.2 1zm1.5-3.2c-.3.4-.8.6-1.2.6-.3 0-.5-.1-.7-.2-2.4-1.5-6-1.9-8.8-1-.4.1-.9-.1-1-.5-.1-.4.1-.9.5-1 3.2-1 7.2-.5 10 1.2.4.3.6.8.3 1.2v-.3zm.1-3.3c-2.9-1.7-7.6-1.9-10.3-1-.4.1-1-.1-1.1-.6-.1-.5.1-1 .6-1.1 3.1-1 8.3-.8 11.6 1.2.5.3.7.9.4 1.4-.3.4-.9.6-1.4.4l.2-.3z" />
    </svg>
  );
}

// Componente de ícone do Farcaster
function FarcasterIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0L5.482 11.195l6.462 4.726-6.462-9.477 6.462-6.444z" />
      <path d="M11.944 24L18.406 12.805l-6.462-4.726 6.462 9.477-6.462 6.444z" />
    </svg>
  );
}