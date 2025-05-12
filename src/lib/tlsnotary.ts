/* eslint-disable  @typescript-eslint/no-explicit-any */

import crypto from 'crypto';

import {
    storeProofInDb,
    getProofById,
    storeVerifiableData
} from './proof-database'

/**
 * TLSNotary proof generation and validation for Spotify API data
 * This is a simplified implementation for demonstration purposes
 */

// Types for TLSNotary proofs
export interface TLSNotaryProof {
    id: string;
    timestamp: number;
    userId: string;
    fid?: number;
    spotifyId?: string;
    endpoint: string;
    responseHash: string;
    signature: string;
    publicData: {
        endpoint: string;
        timestamp: number;
        userIdentifier: string;
    };
}

// Types for verifiable Spotify data
export interface VerifiableSpotifyData {
    userId: string;
    fid?: number;
    spotifyId?: string;
    proofId: string;
    timestamp: number;
    endpoint: string;
    data: any;
    proof: string;
}

/**
 * Generate a TLSNotary proof for Spotify API response
 * In a real implementation, this would use actual TLSNotary libraries
 */
export async function generateProof(
    userId: string,
    fid: number | undefined,
    spotifyId: string | undefined,
    endpoint: string,
    responseData: any
): Promise<TLSNotaryProof> {
    const timestamp = Date.now();
    const proofId = crypto.randomUUID();

    // In a real implementation, we would use TLSNotary to generate
    // a cryptographic proof of the TLS session with Spotify's API

    // For demo purposes, we'll hash the response data
    const responseString = JSON.stringify(responseData);
    const responseHash = crypto
        .createHash('sha256')
        .update(responseString)
        .digest('hex');

    // In real TLSNotary, this would be a signature from the notary server
    const signature = crypto
        .createHmac('sha256', process.env.TLSNOTARY_SECRET || 'demo-secret-key')
        .update(`${proofId}:${timestamp}:${userId}:${endpoint}:${responseHash}`)
        .digest('hex');

    // Create the proof object
    const proof: TLSNotaryProof = {
        id: proofId,
        timestamp,
        userId,
        fid,
        spotifyId,
        endpoint,
        responseHash,
        signature,
        publicData: {
            endpoint,
            timestamp,
            userIdentifier: userId
        }
    };

    return proof;
}

/**
 * Validate a TLSNotary proof
 * In a real implementation, this would use actual TLSNotary validation
 */
export function validateProof(
    proof: TLSNotaryProof,
    responseData: any
): boolean {
    // 1. Verify the signature
    const expectedSignature = crypto
        .createHmac('sha256', process.env.TLSNOTARY_SECRET || 'demo-secret-key')
        .update(`${proof.id}:${proof.timestamp}:${proof.userId}:${proof.endpoint}:${proof.responseHash}`)
        .digest('hex');

    if (expectedSignature !== proof.signature) {
        return false;
    }

    // 2. Verify the response hash matches
    const responseString = JSON.stringify(responseData);
    const actualResponseHash = crypto
        .createHash('sha256')
        .update(responseString)
        .digest('hex');

    if (actualResponseHash !== proof.responseHash) {
        return false;
    }

    // 3. Check that the proof isn't too old (optional)
    const proofAge = Date.now() - proof.timestamp;
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

    if (proofAge > maxAge) {
        return false;
    }

    return true;
}

/**
 * Create and store a verifiable data package with proof
 */
export async function createVerifiableData(
    userId: string,
    fid: number | undefined,
    spotifyId: string | undefined,
    endpoint: string,
    responseData: any
): Promise<VerifiableSpotifyData> {
    // Generate the proof
    const proof = await generateProof(userId, fid, spotifyId, endpoint, responseData);

    // Store the proof
    await storeProof(proof);

    // Create the verifiable data package
    const verifiableData: VerifiableSpotifyData = {
        userId,
        fid,
        spotifyId,
        proofId: proof.id,
        timestamp: proof.timestamp,
        endpoint,
        data: responseData,
        proof: JSON.stringify(proof)
    };

    // Store the verifiable data
    await storeVerifiableData(verifiableData);

    return verifiableData;
}
/**
 * Validate verifiable data package
 */
export function validateVerifiableData(
    verifiableData: VerifiableSpotifyData
): boolean {
    try {
        const proof = JSON.parse(verifiableData.proof) as TLSNotaryProof;
        return validateProof(proof, verifiableData.data);
    } catch (error) {
        console.error('Error validating verifiable data:', error);
        return false;
    }
}


/**
 * Store proof in database
 */
export async function storeProof(proof: TLSNotaryProof): Promise<void> {
    try {
        await storeProofInDb(proof);
    } catch (error) {
        console.error('Error storing proof:', error);
        throw error;
    }
}

/**
 * Retrieve proof from database
 */
export async function retrieveProof(proofId: string): Promise<TLSNotaryProof | null> {
    try {
        return await getProofById(proofId);
    } catch (error) {
        console.error('Error retrieving proof:', error);
        return null;
    }
}