/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */

import { TLSNotaryProof, VerifiableSpotifyData } from './tlsnotary';
import { supabase } from './supabase';

// Type definitions for database records
export interface ProofRecord {
    id: string;
    proof_data: TLSNotaryProof;
    user_id: string;
    fid?: number;
    spotify_id?: string;
    endpoint: string;
    timestamp: number;
    response_hash: string;
    created_at?: string;
}

export interface VerifiableDataRecord {
    id: string;
    proof_id: string;
    user_id: string;
    fid?: number;
    spotify_id?: string;
    endpoint: string;
    data: any;
    timestamp: number;
    created_at?: string;
}

/**
 * Store a TLSNotary proof in the database
 */
export async function storeProofInDb(proof: TLSNotaryProof): Promise<string | null> {
    try {
        // Prepare the record for insertion
        const record: ProofRecord = {
            id: proof.id,
            proof_data: proof,
            user_id: proof.userId,
            fid: proof.fid,
            spotify_id: proof.spotifyId,
            endpoint: proof.endpoint,
            timestamp: proof.timestamp,
            response_hash: proof.responseHash
        };

        // Insert the record into the proofs table
        const { data, error } = await supabase
            .from('proofs')
            .insert(record)
            .select('id')
            .single();

        if (error) {
            console.error('Error storing proof in database:', error);
            return null;
        }

        return data.id;
    } catch (error) {
        console.error('Error storing proof in database:', error);
        return null;
    }
}

/**
 * Store verifiable data in the database
 */
export async function storeVerifiableData(
    verifiableData: VerifiableSpotifyData
): Promise<string | null> {
    try {
        // Prepare the record for insertion
        const record: VerifiableDataRecord = {
            id: crypto.randomUUID(),
            proof_id: verifiableData.proofId,
            user_id: verifiableData.userId,
            fid: verifiableData.fid,
            spotify_id: verifiableData.spotifyId,
            endpoint: verifiableData.endpoint,
            data: verifiableData.data,
            timestamp: verifiableData.timestamp
        };

        // Insert the record into the verifiable_data table
        const { data, error } = await supabase
            .from('verifiable_data')
            .insert(record)
            .select('id')
            .single();

        if (error) {
            console.error('Error storing verifiable data in database:', error);
            return null;
        }

        return data.id;
    } catch (error) {
        console.error('Error storing verifiable data in database:', error);
        return null;
    }
}

/**
 * Retrieve a TLSNotary proof from the database by ID
 */
export async function getProofById(proofId: string): Promise<TLSNotaryProof | null> {
    try {
        const { data, error } = await supabase
            .from('proofs')
            .select('proof_data')
            .eq('id', proofId)
            .single();

        if (error || !data) {
            console.error('Error retrieving proof from database:', error);
            return null;
        }

        return data.proof_data as TLSNotaryProof;
    } catch (error) {
        console.error('Error retrieving proof from database:', error);
        return null;
    }
}

/**
 * Retrieve verifiable data from the database by proof ID
 */
export async function getVerifiableDataByProofId(
    proofId: string
): Promise<VerifiableSpotifyData | null> {
    try {
        const { data, error } = await supabase
            .from('verifiable_data')
            .select('*')
            .eq('proof_id', proofId)
            .single();

        if (error || !data) {
            console.error('Error retrieving verifiable data from database:', error);
            return null;
        }

        // Format the data for return
        return {
            userId: data.user_id,
            fid: data.fid,
            spotifyId: data.spotify_id,
            proofId: data.proof_id,
            timestamp: data.timestamp,
            endpoint: data.endpoint,
            data: data.data,
            proof: JSON.stringify(await getProofById(data.proof_id))
        };
    } catch (error) {
        console.error('Error retrieving verifiable data from database:', error);
        return null;
    }
}

/**
 * Get proofs by user identity (FID or Spotify ID)
 */
export async function getProofsByUser(
    fid?: number,
    spotifyId?: string
): Promise<TLSNotaryProof[]> {
    try {
        if (!fid && !spotifyId) {
            return [];
        }

        let query = supabase.from('proofs').select('proof_data');

        if (fid) {
            query = query.eq('fid', fid);
        } else if (spotifyId) {
            query = query.eq('spotify_id', spotifyId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error retrieving proofs from database:', error);
            return [];
        }

        return data.map(record => record.proof_data as TLSNotaryProof);
    } catch (error) {
        console.error('Error retrieving proofs from database:', error);
        return [];
    }
}

/**
 * Get all proofs for a specific endpoint
 */
export async function getProofsByEndpoint(endpoint: string): Promise<TLSNotaryProof[]> {
    try {
        const { data, error } = await supabase
            .from('proofs')
            .select('proof_data')
            .eq('endpoint', endpoint)
            .order('timestamp', { ascending: false });

        if (error) {
            console.error('Error retrieving proofs from database:', error);
            return [];
        }

        return data.map(record => record.proof_data as TLSNotaryProof);
    } catch (error) {
        console.error('Error retrieving proofs from database:', error);
        return [];
    }
}