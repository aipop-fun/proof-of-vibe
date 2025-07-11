/* eslint-disable @typescript-eslint/ban-ts-comment*/
// @ts-nocheck

"use client";

import React from 'react';
import { VerifiableSpotifyData } from '~/lib/tlsnotary';

interface ProofCardProps {
  proof: VerifiableSpotifyData;
  title?: string;
  className?: string;
  children?: React.ReactNode;
}

export function ProofCard({
  proof,
  title = 'Proof Details',
  className = '',
  children,
}: ProofCardProps) {
  return (
    <div className={`bg-purple-900/30 p-3 rounded text-sm ${className}`}>
      <p className="font-medium">{title}</p>
      <p className="text-gray-300">ID: {proof.proofId}</p>
      <p className="text-gray-300">
        Generated: {new Date(proof.timestamp).toLocaleString()}
      </p>
      <p className="text-gray-300">Endpoint: {proof.endpoint}</p>
      {proof.fid && (
        <p className="text-gray-300">Farcaster ID: {proof.fid}</p>
      )}
      {children}
    </div>
  );
}

interface ResultCardProps {
  isValid: boolean;
  message: string;
  metadata?: Record<string, unknown>;
  className?: string;
}

export function VerificationResultCard({
  isValid,
  message,
  metadata,
  className = '',
}: ResultCardProps) {
  return (
    <div
      className={`p-3 rounded text-sm ${
        isValid
          ? "bg-green-900/30 text-green-400"
          : "bg-red-900/30 text-red-200"
      } ${className}`}
    >
      <p className="font-medium">
        {isValid
          ? "✓ Verification Successful"
          : "✗ Verification Failed"}
      </p>
      <p className="text-gray-300 mt-1">{message}</p>

      {isValid && metadata && (
        <div className="mt-2">
          <p className="text-gray-300">
            Verified at: {new Date().toLocaleString()}
          </p>
          <p className="text-gray-300">
            Original timestamp: {metadata.timestamp}
          </p>
        </div>
      )}
    </div>
  );
}

interface AlertProps {
  type: 'success' | 'error' | 'info';
  message: string;
  className?: string;
}

export function Alert({ type, message, className = '' }: AlertProps) {
  const bgColor = {
    success: 'bg-green-900/30 text-green-400',
    error: 'bg-red-900/30 text-red-200',
    info: 'bg-blue-900/30 text-blue-200',
  }[type];

  const icon = {
    success: '✓',
    error: '✗',
    info: 'ℹ',
  }[type];

  return (
    <div className={`p-3 rounded text-sm ${bgColor} ${className}`}>
      <p className="font-medium">
        {icon} {message}
      </p>
    </div>
  );
}