"use client";

import { useState, useCallback } from 'react';
import { useAuthStore } from '~/lib/stores/authStore';
import { VerifiableSpotifyData } from '~/lib/tlsnotary';

interface GenerateProofConfig {
  endpoint: string;
}

interface VerifyProofConfig {
  initialProofData?: VerifiableSpotifyData;
}

interface VerificationResult {
  valid: boolean;
  message: string;
  metadata?: Record<string, unknown>;
}

export function useProofGeneration({ endpoint }: GenerateProofConfig) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedProof, setGeneratedProof] = useState<VerifiableSpotifyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const {
    accessToken,
    spotifyId,
    fid,
    isAuthenticated,
    isExpired,
  } = useAuthStore();

  const resetProof = useCallback(() => {
    setGeneratedProof(null);
    setError(null);
  }, []);

  const generateProof = useCallback(async () => {
    // Validation checks
    if (!isAuthenticated) {
      setError("You must be authenticated to generate a proof");
      return null;
    }

    if (isExpired()) {
      setError("Your session has expired. Please sign in again.");
      return null;
    }

    if (!accessToken) {
      setError("No access token available");
      return null;
    }

    try {
      setIsGenerating(true);
      setError(null);

      // Create a unique user ID
      const userId = `${fid || ""}:${spotifyId || ""}:${Date.now()}`;

      // Call the API to generate the proof
      const response = await fetch("/api/proofs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          fid,
          spotifyId,
          endpoint,
          accessToken,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate proof");
      }

      setGeneratedProof(data.data);
      return data.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Error generating proof:", error);
      setError(errorMessage);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [accessToken, spotifyId, fid, isAuthenticated, isExpired, endpoint]);

  const getVerificationUrl = useCallback((proofId: string): string => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/verify-proof/${proofId}`;
  }, []);

  return {
    generateProof,
    isGenerating,
    generatedProof,
    error,
    isAuthenticated,
    isExpired: isExpired(),
    resetProof,
    getVerificationUrl,
  };
}

export function useProofVerification({ initialProofData }: VerifyProofConfig = {}) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [proofData, setProofData] = useState<VerifiableSpotifyData | undefined>(
    initialProofData
  );

  const resetVerification = useCallback(() => {
    setProofData(undefined);
    setVerificationResult(null);
    setError(null);
  }, []);

  const verifyProof = useCallback(async () => {
    if (!proofData) {
      setError("No proof data to verify");
      return null;
    }

    try {
      setIsVerifying(true);
      setError(null);

      const response = await fetch("/api/proofs/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verifiableData: proofData }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to verify proof");
      }

      const result = {
        valid: data.valid,
        message: data.message,
        metadata: data.metadata,
      };

      setVerificationResult(result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Error verifying proof:", error);
      setError(errorMessage);
      return null;
    } finally {
      setIsVerifying(false);
    }
  }, [proofData]);

  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result;
        if (typeof content !== "string") return;

        const parsedData = JSON.parse(content) as VerifiableSpotifyData;
        setProofData(parsedData);
        setVerificationResult(null);
        setError(null);
      } catch (uploadError) {
        console.error("File upload error:", uploadError);
        setError("Invalid proof file format");
      }
    };
    
    reader.readAsText(file);
  }, []);

  return {
    verifyProof,
    isVerifying,
    verificationResult,
    error,
    proofData,
    resetVerification,
    handleFileUpload,
    setProofData,
  };
}