/* eslint-disable  @typescript-eslint/no-unused-vars  */
import { AuthOptions, getServerSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials";
import SpotifyProvider from "next-auth/providers/spotify";
import { createAppClient, viemConnector } from "@farcaster/auth-client";
import { createOrUpdateUser, getUserByFid, getUserBySpotifyId } from "./lib/supabase";

declare module "next-auth" {
  interface Session {
    user: {
      name: string;
      fid?: number;
      spotifyId?: string;
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: number;
      isLinked?: boolean;
    };
  }
  
  interface User {
    id: string;
    name?: string;
    fid?: number;
    spotifyId?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }
}

function getDomainFromUrl(urlString: string | undefined): string {
  if (!urlString) {
    console.warn('NEXTAUTH_URL is not set, using localhost:3000 as fallback');
    return 'localhost:3000';
  }
  try {
    const url = new URL(urlString);
    return url.hostname;
  } catch (error) {
    console.error('Invalid NEXTAUTH_URL:', urlString, error);
    console.warn('Using localhost:3000 as fallback');
    return 'localhost:3000';
  }
}

export const authOptions: AuthOptions = {
  // Configure multiple authentication providers
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'user-read-email user-read-private user-read-currently-playing user-top-read'
        }
      }
    }),
    CredentialsProvider({
      name: "Sign in with Farcaster",
      credentials: {
        message: {
          label: "Message",
          type: "text",
          placeholder: "0x0",
        },
        signature: {
          label: "Signature",
          type: "text",
          placeholder: "0x0",
        },
      },
      async authorize(credentials, req) {
        const csrfToken = req?.body?.csrfToken;
        if (!csrfToken) {
          console.error('CSRF token is missing from request');
          return null;
        }

        const appClient = createAppClient({
          ethereum: viemConnector(),
        });

        const domain = getDomainFromUrl(process.env.NEXTAUTH_URL);

        const verifyResponse = await appClient.verifySignInMessage({
          message: credentials?.message as string,
          signature: credentials?.signature as `0x${string}`,
          domain,
          nonce: csrfToken,
        });
        const { success, fid } = verifyResponse;

        if (!success) {
          return null;
        }

        // Check if user already exists in our Supabase DB
        let userProfile = await getUserByFid(fid);
        
        if (!userProfile) {
          // Create new user if they don't exist
          userProfile = await createOrUpdateUser({ fid });
        }

        // Return the user object with FID
        return {
          id: userProfile.id,
          name: userProfile.display_name || `Farcaster User ${fid}`,
          fid,
          spotifyId: userProfile.spotify_id,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        if (account.provider === 'spotify') {
          // Store Spotify tokens and user ID
          token.spotifyId = user.spotifyId || account.providerAccountId;
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
          token.expiresAt = account.expires_at;
          
          // Check if user exists in Supabase or create them
          let userProfile = await getUserBySpotifyId(account.providerAccountId);
          
          if (!userProfile) {
            userProfile = await createOrUpdateUser({ 
              spotifyId: account.providerAccountId,
              displayName: user.name || account.providerAccountId,
            });
          }
          
          // Store FID if it exists for this Spotify account
          token.fid = userProfile.fid;
          
          // Check if accounts are linked
          token.isLinked = Boolean(userProfile.fid && userProfile.spotify_id);
        } else if (user.fid) {
          // Farcaster login
          token.fid = user.fid;
          token.spotifyId = user.spotifyId;
          
          // Check if accounts are linked
          token.isLinked = Boolean(user.fid && user.spotifyId);
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.fid = token.fid as number | undefined;
        session.user.spotifyId = token.spotifyId as string | undefined;
        session.user.accessToken = token.accessToken as string | undefined;
        session.user.refreshToken = token.refreshToken as string | undefined;
        session.user.expiresAt = token.expiresAt as number | undefined;
        session.user.isLinked = token.isLinked as boolean | undefined;
      }
      return session;
    },
    async signIn({ user, account }) {
      // Always allow sign in
      return true;
    },
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true
      }
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: "none",
        path: "/",
        secure: true
      }
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true
      }
    }
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
  },
}

export const getSession = async () => {
  try {
    return await getServerSession(authOptions);
  } catch (error) {
    console.error('Error getting server session:', error);
    return null;
  }
}
