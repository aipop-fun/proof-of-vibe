/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any,  @typescript-eslint/ban-ts-comment */
// @ts-nocheck
 
import { getUserByFid, getUserBySpotifyId, createOrUpdateUser } from '~/lib/supabase';

/**
 * Error types for account linking operations
 */
export enum AccountLinkingError {
    FID_ALREADY_LINKED = 'FID_ALREADY_LINKED',
    SPOTIFY_ALREADY_LINKED = 'SPOTIFY_ALREADY_LINKED',
    MISSING_CREDENTIALS = 'MISSING_CREDENTIALS',
    DATABASE_ERROR = 'DATABASE_ERROR',
}

/**
 * Response format for account linking operations
 */
export interface AccountLinkingResponse {
    success: boolean;
    error?: AccountLinkingError | string;
    user?: {
        id: string;
        fid: number;
        spotifyId: string;
        displayName?: string;
        isLinked: boolean;
    };
}

/**
 * Validate account linking credentials
 * @param fid Farcaster ID
 * @param spotifyId Spotify ID
 * @returns Validation result
 */
export async function validateLinkingCredentials(
    fid: number,
    spotifyId: string
): Promise<{ valid: boolean; error?: AccountLinkingError }> {
    if (!fid || !spotifyId) {
        return { valid: false, error: AccountLinkingError.MISSING_CREDENTIALS };
    }

    try {
        // Check for existing account connections
        const existingFidUser = await getUserByFid(fid);
        const existingSpotifyUser = await getUserBySpotifyId(spotifyId);

        // Check if FID is already linked to a different Spotify account
        if (existingFidUser && existingFidUser.spotify_id && existingFidUser.spotify_id !== spotifyId) {
            return { valid: false, error: AccountLinkingError.FID_ALREADY_LINKED };
        }

        // Check if Spotify ID is already linked to a different FID
        if (existingSpotifyUser && existingSpotifyUser.fid && existingSpotifyUser.fid !== fid) {
            return { valid: false, error: AccountLinkingError.SPOTIFY_ALREADY_LINKED };
        }

        return { valid: true };
    } catch (error) {
        console.error('Error validating account linking credentials:', error);
        return { valid: false, error: AccountLinkingError.DATABASE_ERROR };
    }
}

/**
 * Link Farcaster and Spotify accounts in the database
 * @param fid Farcaster ID
 * @param spotifyId Spotify ID
 * @returns Account linking operation result
 */
export async function linkAccounts(
    fid: number,
    spotifyId: string
): Promise<AccountLinkingResponse> {
    try {
        // Validate credentials first
        const validation = await validateLinkingCredentials(fid, spotifyId);

        if (!validation.valid) {
            return {
                success: false,
                error: validation.error
            };
        }

        console.log('Credentials validated, proceeding with account linking');
        console.log('Creating or updating user with:', { fid, spotifyId });

        // Try to create or update user with both IDs
        const linkedUser = await createOrUpdateUser({
            fid,
            spotifyId
            // displayName is omitted
        });

        if (!linkedUser) {
            console.error('createOrUpdateUser returned null or undefined');
            return {
                success: false,
                error: 'Failed to create or update user record'
            };
        }

        console.log('User successfully linked:', linkedUser);

        // Format the response
        return {
            success: true,
            user: {
                id: linkedUser.id,
                fid: linkedUser.fid || 0,
                spotifyId: linkedUser.spotify_id || '',
                displayName: linkedUser.display_name,
                isLinked: !!(linkedUser.fid && linkedUser.spotify_id)
            }
        };
    } catch (error) {
        // More detailed error logging
        console.error('Error linking accounts - full error:', error);

        // If it's a Supabase error, extract more information
        if (error && typeof error === 'object' && 'code' in error) {
            console.error('Supabase error code:', error.code);
            console.error('Supabase error message:', error.message);
            console.error('Supabase error details:', error.details);

            return {
                success: false,
                error: `Database error: ${error.message || 'Unknown database error'}`
            };
        }

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error linking accounts'
        };
    }
}

/**
 * Check if user has linked accounts
 * @param fid Farcaster ID
 * @param spotifyId Spotify ID
 * @returns Boolean indicating if accounts are linked
 */
export async function checkAccountsLinked(
    fid?: number,
    spotifyId?: string
): Promise<boolean> {
    try {
        if (!fid && !spotifyId) {
            return false;
        }

        if (fid) {
            const user = await getUserByFid(fid);
            if (user?.spotify_id) {
                return true;
            }
        }

        if (spotifyId) {
            const user = await getUserBySpotifyId(spotifyId);
            if (user?.fid) {
                return true;
            }
        }

        return false;
    } catch (error) {
        console.error('Error checking linked accounts:', error);
        return false;
    }
}