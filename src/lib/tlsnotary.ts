/* eslint-disable @typescript-eslint/no-explicit-any*/
import crypto from 'crypto';
import { storeProofInDb, getProofById, storeVerifiableData } from './proof-database';

// Types
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

// Core crypto operations
const hash = (data: string): string => 
  crypto.createHash('sha256').update(data).digest('hex');

const hmac = (data: string): string => {
  const secret = process.env.TLSNOTARY_SECRET || 'demo-secret-key';
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
};

const createSignaturePayload = (
  id: string,
  timestamp: number,
  userId: string,
  endpoint: string,
  hash: string
): string => `${id}:${timestamp}:${userId}:${endpoint}:${hash}`;

// Proof generation and validation
export async function generateProof(
  userId: string,
  fid: number | undefined,
  spotifyId: string | undefined,
  endpoint: string,
  responseData: any
): Promise<TLSNotaryProof> {
  const timestamp = Date.now();
  const proofId = crypto.randomUUID();
  const responseString = JSON.stringify(responseData);
  const responseHash = hash(responseString);
  const signaturePayload = createSignaturePayload(proofId, timestamp, userId, endpoint, responseHash);
  const signature = hmac(signaturePayload);

  return {
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
}

export function validateProof(proof: TLSNotaryProof, responseData: any): boolean {
  // 1. Verify signature
  const signaturePayload = createSignaturePayload(
    proof.id, proof.timestamp, proof.userId, proof.endpoint, proof.responseHash
  );
  const expectedSignature = hmac(signaturePayload);
  if (expectedSignature !== proof.signature) return false;

  // 2. Verify response hash
  const actualResponseHash = hash(JSON.stringify(responseData));
  if (actualResponseHash !== proof.responseHash) return false;

  // 3. Check proof age
  const MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days
  if (Date.now() - proof.timestamp > MAX_AGE) return false;

  return true;
}

// Database operations with error handling
const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  errorMessage: string
): Promise<T | null> => {
  try {
    return await operation();
  } catch (error) {
    console.error(errorMessage, error);
    return null;
  }
};

export async function storeProof(proof: TLSNotaryProof): Promise<void> {
  await withErrorHandling(
    () => storeProofInDb(proof),
    'Error storing proof:'
  );
}

export async function retrieveProof(proofId: string): Promise<TLSNotaryProof | null> {
  return await withErrorHandling(
    () => getProofById(proofId),
    'Error retrieving proof:'
  );
}

// Higher level operations
export async function createVerifiableData(
  userId: string,
  fid: number | undefined,
  spotifyId: string | undefined,
  endpoint: string,
  responseData: any
): Promise<VerifiableSpotifyData> {
  const proof = await generateProof(userId, fid, spotifyId, endpoint, responseData);
  await storeProof(proof);

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

  await storeVerifiableData(verifiableData);
  return verifiableData;
}

export function validateVerifiableData(verifiableData: VerifiableSpotifyData): boolean {
  try {
    const proof = JSON.parse(verifiableData.proof) as TLSNotaryProof;
    return validateProof(proof, verifiableData.data);
  } catch (error) {
    console.error('Error validating verifiable data:', error);
    return false;
  }
}