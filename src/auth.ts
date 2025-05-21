/* eslint-disable @typescript-eslint/no-unused-vars,  @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any  */

// @ts-nocheck
import NextAuth from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import CredentialsProvider from "next-auth/providers/credentials";
import { JWT } from "next-auth/jwt";
import { z } from "zod"; 

// Tipagem para o token do Spotify
interface SpotifyToken extends JWT {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  spotifyId?: string;
  error?: string;
}

// Tipagem para o token do Farcaster
interface FarcasterToken extends JWT {
  fid?: number;
  error?: string;
}

// Tipagem para mensagem Farcaster
interface FarcasterMessage {
  fid?: number;
  message?: {
    fid?: number;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Refreshes an expired Spotify access token
 * @param token The current JWT token containing Spotify credentials
 * @returns Updated JWT with refreshed Spotify tokens
 */
async function refreshSpotifyAccessToken(token: SpotifyToken): Promise<SpotifyToken> {
  try {
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      throw new Error("Missing Spotify credentials in environment variables");
    }

    if (!token.refreshToken) {
      throw new Error("No refresh token available");
    }

    const url = "https://accounts.spotify.com/api/token";
    const basicAuth = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
      cache: "no-store",
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      console.error("Token refresh failed:", refreshedTokens);
      return {
        ...token,
        error: "RefreshAccessTokenError",
      };
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000 + refreshedTokens.expires_in),
      error: undefined, // Clear any previous errors
    };
  } catch (error) {
    console.error("Token refresh error:", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

/**
 * Verify Farcaster signature
 * This is a production-ready implementation using Neynar API
 */
async function verifyFarcasterSignature(message: string | object, signature: string): Promise<boolean> {
  if (!process.env.NEYNAR_API_KEY) {
    console.error("Missing Neynar API key");
    return false;
  }

  try {
    const messageStr = typeof message === 'string'
      ? message
      : JSON.stringify(message);

    // Implement proper verification with Neynar API
    const response = await fetch('https://api.neynar.com/v2/farcaster/verify-signature', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_key': process.env.NEYNAR_API_KEY
      },
      body: JSON.stringify({
        message: messageStr,
        signature: signature
      })
    });

    const result = await response.json();

    // Verify the response format based on Neynar API
    if (!response.ok) {
      console.error("Signature verification failed:", result);
      return false;
    }

    return result.valid === true;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

/**
 * Extract FID from Farcaster auth message using Zod validation
 */
function extractFidFromMessage(message: string | object): number {
  try {
    // Define schema for validation
    const messageSchema = z.object({
      fid: z.number().optional(),
      message: z.object({
        fid: z.number().optional()
      }).optional()
    });

    let parsedMessage: FarcasterMessage;

    if (typeof message === 'string') {
      try {
        parsedMessage = JSON.parse(message);
      } catch (e) {
        // Not valid JSON, try regex
        const match = message.match(/fid[:=]\s*(\d+)/i);
        return match && match[1] ? parseInt(match[1], 10) : 0;
      }
    } else {
      parsedMessage = message as FarcasterMessage;
    }

    // Validate with Zod
    const result = messageSchema.safeParse(parsedMessage);

    if (!result.success) {
      console.error("Invalid message format:", result.error);
      return 0;
    }

    const validData = result.data;
    return validData.fid || (validData.message?.fid) || 0;
  } catch (error) {
    console.error("Error extracting FID:", error);
    return 0;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID || "",
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "user-read-email,user-read-private,user-read-currently-playing,user-top-read,user-read-recently-played",
        },
      },
    }),
    CredentialsProvider({
      name: "Farcaster",
      credentials: {
        message: { label: "Message", type: "text" },
        signature: { label: "Signature", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.message || !credentials?.signature) {
          return null;
        }

        try {
          // Get FID from the message
          const fid = extractFidFromMessage(credentials.message);

          if (!fid) {
            console.error("No FID found in message");
            return null;
          }

          // Production: Real verification with Neynar
          const isValid = await verifyFarcasterSignature(
            credentials.message,
            credentials.signature
          );

          if (!isValid) {
            console.error("Invalid Farcaster signature");
            return null;
          }

          // Return user object with Farcaster ID
          return {
            id: `farcaster:${fid}`,
            fid: fid,
            name: `Farcaster User ${fid}`,
          };
        } catch (error) {
          console.error("Farcaster auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      // Initial sign in
      if (account && user) {
        // For Spotify accounts
        if (account.provider === "spotify") {
          return {
            ...token,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            expiresAt: Math.floor(Date.now() / 1000 + (account.expires_in as number)),
            spotifyId: account.providerAccountId,
          };
        }

        // For Farcaster accounts
        if (account.provider === "credentials" && "fid" in user) {
          return {
            ...token,
            fid: user.fid as number,
          };
        }
      }

      // Return existing token if not expired
      if (token.expiresAt && Date.now() < (token.expiresAt as number) * 1000) {
        return token;
      }

      // Refresh Spotify token if available
      if (token.refreshToken) {
        return refreshSpotifyAccessToken(token as SpotifyToken);
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Add Spotify info to session if available
        if (token.accessToken) {
          session.user.accessToken = token.accessToken as string;
        }
        if (token.refreshToken) {
          session.user.refreshToken = token.refreshToken as string;
        }
        if (token.expiresAt) {
          session.user.expiresAt = token.expiresAt as number;
        }
        if (token.spotifyId) {
          session.user.spotifyId = token.spotifyId as string;
        }

        // Add Farcaster info to session if available
        if (token.fid) {
          session.user.fid = token.fid as number;
        }

        // Add error if present
        if (token.error) {
          session.error = token.error as string;
        }
      }
      return session;
    },
    // Adicionar evento para sincronizar com o sistema de admin
    async signIn({ user }) {
      if (user) {
        try {
          // Obter lista de admin IDs do environment
          const adminUsers = process.env.NEXT_PUBLIC_ADMIN_USERS?.split(',') || [];

          // Verificar se o usuário logado está na lista de admins
          const userFid = (user as any).fid?.toString();
          const userSpotifyId = (user as any).spotifyId;

          const isUserAdmin =
            adminUsers.includes(userFid || '') ||
            adminUsers.includes(userSpotifyId || '');

          if (isUserAdmin && typeof window !== 'undefined') {
            // Disparar evento para atualizar status de admin
            window.dispatchEvent(new CustomEvent('set-admin-status', {
              detail: { isAdmin: true }
            }));
          }
        } catch (error) {
          console.error("Error checking admin status during sign in:", error);
        }
      }
      return true;
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  // Habilitar debug apenas em desenvolvimento
  debug: process.env.NODE_ENV === "development",
});