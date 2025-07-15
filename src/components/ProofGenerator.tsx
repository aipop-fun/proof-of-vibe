"use client";

import { useFrame } from "./providers/FrameProvider";
import { Button } from "~/components/ui/Button";
import { useProofGeneration } from "~/hooks/useProofManagement";
import { Alert, ProofCard } from "~/components/ui/ProofCard";
import sdk from "@farcaster/miniapp-sdk";

interface ProofGeneratorProps {
  endpoint: string;
  label: string;
  description: string;
  className?: string;
}

export function ProofGenerator({
  endpoint,
  label,
  description,
  className = "",
}: ProofGeneratorProps) {
  const { isMiniApp } = useFrame();
  const {
    generateProof,
    isGenerating,
    generatedProof,
    error,
    isAuthenticated,
    isExpired,
    resetProof,
    getVerificationUrl,
  } = useProofGeneration({ endpoint });

  const handleShare = () => {
    if (!generatedProof) return;

    const verifyUrl = getVerificationUrl(generatedProof.proofId);
    const shareMessage = `🎵 I've generated a cryptographic proof of my Spotify ${endpoint} data using Timbra! Verify it here:`;

    // Share via Farcaster when in mini app
    if (isMiniApp && typeof sdk?.actions?.composeCast === "function") {
      sdk.actions.composeCast({
        text: shareMessage,
        embeds: [verifyUrl],
      });
    } else {
      // For regular web, open compose URL
      const encodedMessage = encodeURIComponent(shareMessage);
      const encodedUrl = encodeURIComponent(verifyUrl);
      window.open(
        `https://warpcast.com/~/compose?text=${encodedMessage}&embeds=${encodedUrl}`,
        "_blank"
      );
    }
  };

  return (
    <div className={`bg-purple-800/20 rounded-lg p-4 ${className}`}>
      <h3 className="font-medium mb-2">{label}</h3>
      <p className="text-sm text-gray-300 mb-4">{description}</p>

      {error && <Alert type="error" message={error} className="mb-4" />}

      {generatedProof ? (
        <div className="space-y-4">
          <Alert 
            type="success" 
            message="Proof generated successfully!" 
          />
          
          <ProofCard proof={generatedProof} />

          <div className="flex space-x-2">
            <Button
              onClick={handleShare}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Share on Farcaster
            </Button>
            <Button
              onClick={resetProof}
              className="bg-transparent border border-purple-600 hover:bg-purple-900/40"
            >
              Generate New Proof
            </Button>
          </div>
        </div>
      ) : (
        <Button
          onClick={generateProof}
          disabled={isGenerating || !isAuthenticated || isExpired}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {isGenerating ? "Generating..." : "Generate Proof"}
        </Button>
      )}
    </div>
  );
}