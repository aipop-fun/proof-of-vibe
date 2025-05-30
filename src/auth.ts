/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any,  @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import NextAuth from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import CredentialsProvider from "next-auth/providers/credentials";
import { JWT } from "next-auth/jwt";

/**
 * Refreshes an expired Spotify access token
 * @param token The current JWT token containing Spotify credentials
 * @returns Updated JWT with refreshed Spotify tokens
 */
async function refreshSpotifyAccessToken(token: JWT): Promise<JWT> {
  try {
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
        refresh_token: token.refreshToken as string,
      }),
      cache: "no-store",
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
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
    };
  } catch (error) {
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

/**
 * Optional function for production to verify Farcaster signatures
 * This would typically connect to a Hub or service like Neynar
 */
async function verifyFarcasterSignature(message: string | object, signature: string): Promise<boolean> {
  // In production, implement verification logic here
  // Example using Neynar or direct Hub connection:
  /*
  try {
    const neynarClient = new NeynarAPIClient({ apiKey: process.env.NEYNAR_API_KEY });
    const result = await neynarClient.validateFrameAction({
      messageBytes: message,
      signature: signature
    });
    return result.valid;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
  */

  // For the current implementation without external verification
  return true;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID || "",
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "user-read-email,user-read-private,user-read-currently-playing,user-top-read",
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
          // Extract Farcaster ID (FID) from the authentication message
          let fid = 0;

          // Handle different message formats (string vs object)
          if (typeof credentials.message === 'string') {
            try {
              // First attempt: Parse as JSON if it appears to be JSON formatted
              if (credentials.message.startsWith('{')) {
                const messageObj = JSON.parse(credentials.message);
                fid = messageObj.fid || (messageObj.message?.fid) || 0;
              } else {
                // Alternative: Extract FID using regex pattern matching
                const fidMatch = credentials.message.match(/fid[:=]\s*(\d+)/i);
                if (fidMatch && fidMatch[1]) {
                  fid = parseInt(fidMatch[1], 10);
                }
              }
            } catch (parseError) {
              // Continue with FID = 0, which will result in authentication failure
            }
          } else if (typeof credentials.message === 'object' && credentials.message !== null) {
            // Direct extraction if message is already an object
            fid = credentials.message.fid || (credentials.message.message?.fid) || 0;
          }

          // Validate that a user identifier was obtained
          if (!fid) {
            return null;
          }

          // For production, implement signature verification
          // Uncomment and implement the verification logic using verifyFarcasterSignature
          /*
          const isValid = await verifyFarcasterSignature(
            credentials.message, 
            credentials.signature
          );
          
          if (!isValid) {
            return null;
          }
          */

          // Return user object with Farcaster ID
          return {
            id: `farcaster:${fid}`,
            fid: fid,
            name: `Farcaster User ${fid}`,
          };
        } catch (error) {
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
        if (account.provider === "credentials" && (user as any).fid) {
          return {
            ...token,
            fid: (user as any).fid,
          };
        }
      }

      // Return existing token if not expired
      if (token.expiresAt && Date.now() < (token.expiresAt as number) * 1000) {
        return token;
      }

      // Refresh Spotify token if available
      if (token.refreshToken) {
        return refreshSpotifyAccessToken(token);
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
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
});