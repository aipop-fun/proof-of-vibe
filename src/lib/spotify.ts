/* eslint-disable @typescript-eslint/no-explicit-any */
import { URLSearchParams } from 'url';

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.NEXTAUTH_URL}/api/auth/callback/spotify`;

/**
 * Generates a random string for the state parameter in OAuth
 */
export function generateRandomString(length: number): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * Gets the URL for Spotify authorization
 */
export function getSpotifyAuthURL(): string {
  const state = generateRandomString(16);
  const scope = 'user-read-private user-read-email user-read-currently-playing user-top-read';

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID!,
    scope,
    redirect_uri: REDIRECT_URI,
    state,
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

/**
 * Exchanges authorization code for access token
 */
export async function getSpotifyTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
  });

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Failed to get Spotify tokens: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Refreshes an expired access token
 */
export async function refreshSpotifyToken(refresh_token: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token,
  });

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetches the user's Spotify profile
 */
export async function getSpotifyProfile(access_token: string): Promise<{
  id: string;
  display_name: string;
  email: string;
  images: Array<{ url: string }>;
}> {
  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      'Authorization': `Bearer ${access_token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get Spotify profile: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Gets the user's top tracks
 */
export async function getTopTracks(access_token: string, timeRange = 'medium_term'): Promise<any> {
  const response = await fetch(
    `https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=50`, 
    {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get top tracks: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Gets the user's currently playing track
 */
export async function getCurrentlyPlaying(access_token: string): Promise<any> {
  const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: {
      'Authorization': `Bearer ${access_token}`,
    },
  });

  // No content means nothing is playing
  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to get currently playing: ${response.statusText}`);
  }

  return response.json();
}
