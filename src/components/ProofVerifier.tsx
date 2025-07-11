"use client";

import { Button } from "~/components/ui/Button";
import { useProofVerification } from "~/hooks/useProofManagement";
import { VerifiableSpotifyData } from "~/lib/tlsnotary";
import { Alert, ProofCard, VerificationResultCard } from "~/components/ui/ProofCard";

interface ProofVerifierProps {
  initialProofData?: VerifiableSpotifyData;
  className?: string;
}

export function ProofVerifier({
  initialProofData,
  className = "",
}: ProofVerifierProps) {
  const {
    verifyProof,
    isVerifying,
    verificationResult,
    error,
    proofData,
    handleFileUpload,
    resetVerification
  } = useProofVerification({ initialProofData });

  return (
    <div className={`bg-purple-800/20 rounded-lg p-4 ${className}`}>
      <h3 className="font-medium mb-2">Verify Spotify Data Proof</h3>
      <p className="text-sm text-gray-300 mb-4">
        Verify the authenticity of a Spotify data proof using TLSNotary
      </p>

      {error && <Alert type="error" message={error} className="mb-4" />}

      {!proofData ? (
        <div className="space-y-4">
          <p className="text-sm">
            Upload a proof file to verify its authenticity
          </p>
          <input
            type="file"
            accept=".json"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-purple-600 file:text-white hover:file:bg-purple-700"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <ProofCard proof={proofData} />

          {verificationResult ? (
            <VerificationResultCard 
              isValid={verificationResult.valid}
              message={verificationResult.message}
              metadata={verificationResult.metadata}
            />
          ) : (
            <Button
              onClick={verifyProof}
              disabled={isVerifying}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isVerifying ? "Verifying..." : "Verify Proof"}
            </Button>
          )}

          {verificationResult && (
            <Button
              onClick={resetVerification}
              className="bg-transparent border border-purple-600 hover:bg-purple-900/40"
            >
              Verify Another Proof
            </Button>
          )}
        </div>
      )}
    </div>
  );
}