/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
import NextAuth from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import CredentialsProvider from "next-auth/providers/credentials";
import { JWT } from "next-auth/jwt";

/**
 * Refreshes an expired Spotify access token
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
      console.error("Failed to refresh token:", refreshedTokens);
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
    console.error("Error refreshing access token:", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
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
      // @ts-ignore
      async authorize(credentials: Record<"message" | "signature", string> | undefined) {
        if (!credentials?.message || !credentials?.signature) {
          return null;
        }

        try {
          // Parse the message
          // @ts-ignore
          const messageObj = JSON.parse(credentials.message);
          const fid = messageObj.fid || messageObj.message?.fid || 0;

          if (!fid) {
            throw new Error("No FID found in message");
          }

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
          // @ts-ignore
          session.user.accessToken = token.accessToken as string;
        }
        if (token.refreshToken) {
          // @ts-ignore
          session.user.refreshToken = token.refreshToken as string;
        }
        if (token.expiresAt) {
          // @ts-ignore
          session.user.expiresAt = token.expiresAt as number;
        }
        if (token.spotifyId) {
          // @ts-ignore
          session.user.spotifyId = token.spotifyId as string;
        }

        // Add Farcaster info to session if available
        if (token.fid) {
          // @ts-ignore
          session.user.fid = token.fid as number;
        }

        // Add error if present
        if (token.error) {
          // @ts-ignore
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