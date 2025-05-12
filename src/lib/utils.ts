// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { mnemonicToAccount } from 'viem/accounts';

interface FrameMetadata {
  accountAssociation?: {
    header: string;
    payload: string;
    signature: string;
  };
  frame: {
    version: string;
    name: string;
    iconUrl: string;
    homeUrl: string;
    imageUrl: string;
    buttonTitle: string;
    splashImageUrl: string;
    splashBackgroundColor: string;
    webhookUrl: string;
  };
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format milliseconds to mm:ss format
 */
export function formatDuration(ms: number): string {
  if (!ms) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format a timestamp as a relative time (e.g., "2 min ago")
 */
export function formatRelativeTime(timestamp: number | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // difference in seconds

  if (diff < 60) return `${diff} sec ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

/**
 * Get seed phrase and FID from environment variables
 */
export function getSecretEnvVars() {
  const seedPhrase = process.env.SEED_PHRASE;
  const fid = process.env.FID;

  if (!seedPhrase || !fid) {
    return null;
  }

  return { seedPhrase, fid };
}

/**
 * Get Farcaster metadata for the frame
 */
export async function getFarcasterMetadata(): Promise<FrameMetadata> {
  if (process.env.FRAME_METADATA) {
    try {
      const metadata = JSON.parse(process.env.FRAME_METADATA);
      console.log('Using pre-signed frame metadata from environment');
      return metadata;
    } catch (error) {
      console.warn('Failed to parse FRAME_METADATA from environment:', error);
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_URL;
  if (!appUrl) {
    throw new Error('NEXT_PUBLIC_URL not configured');
  }

  // Get the domain from the URL (without https:// prefix)
  const domain = new URL(appUrl).hostname;
  console.log('Using domain for manifest:', domain);

  const secretEnvVars = getSecretEnvVars();
  if (!secretEnvVars) {
    console.warn('No seed phrase or FID found in environment variables -- generating unsigned metadata');
  }

  let accountAssociation;
  if (secretEnvVars) {
    // Generate account from seed phrase
    const account = mnemonicToAccount(secretEnvVars.seedPhrase);
    const custodyAddress = account.address;

    const header = {
      fid: parseInt(secretEnvVars.fid),
      type: 'custody',
      key: custodyAddress,
    };
    const encodedHeader = Buffer.from(JSON.stringify(header), 'utf-8').toString('base64');

    const payload = {
      domain
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');

    const signature = await account.signMessage({
      message: `${encodedHeader}.${encodedPayload}`
    });
    const encodedSignature = Buffer.from(signature, 'utf-8').toString('base64url');

    accountAssociation = {
      header: encodedHeader,
      payload: encodedPayload,
      signature: encodedSignature
    };
  }

  // Determine webhook URL based on whether Neynar is enabled
  const neynarApiKey = process.env.NEYNAR_API_KEY;
  const neynarClientId = process.env.NEYNAR_CLIENT_ID;
  const webhookUrl = neynarApiKey && neynarClientId
    ? `https://api.neynar.com/f/app/${neynarClientId}/event`
    : `${appUrl}/api/webhook`;

  return {
    accountAssociation,
    frame: {
      version: "1",
      name: process.env.NEXT_PUBLIC_FRAME_NAME || "Timbra",
      iconUrl: `${appUrl}/icon.png`,
      homeUrl: appUrl,
      imageUrl: `${appUrl}/opengraph-image`,
      buttonTitle: process.env.NEXT_PUBLIC_FRAME_BUTTON_TEXT || "Share your vibe",
      splashImageUrl: `${appUrl}/splash.png`,
      splashBackgroundColor: "#8A2BE2",
      webhookUrl,
    },
  };
}

/**
 * Fetches an absolute URL based on the current environment
 */
export function getAbsoluteUrl(path: string = ""): string {
  const baseUrl = process.env.NEXT_PUBLIC_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  return `${baseUrl}${path}`;
}

/**
 * Extracts a clean domain from a full URL
 */
export function getDomainFromUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain;
  } catch (e) {
    return url;
  }
}

/**
 * Safely parses JSON with error handling
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch (e) {
    console.error('Failed to parse JSON:', e);
    return fallback;
  }
}