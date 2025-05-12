// src/components/SpotifyImage.tsx
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface SpotifyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fill?: boolean;
  sizes?: string;
  style?: React.CSSProperties;
}

/**
 * Component for displaying Spotify images with fallback
 * Resolves issues with blocked domains and missing images
 */
export function SpotifyImage({
  src,
  alt,
  width,
  height,
  className,
  fill = false,
  sizes,
  style
}: SpotifyImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(src);
  const [error, setError] = useState<boolean>(false);

  // Reset error state if src changes
  useEffect(() => {
    setImgSrc(src);
    setError(false);
  }, [src]);

  // Generate placeholder URL if needed
  const getPlaceholderUrl = () => {
    const placeholderWidth = width || 60;
    const placeholderHeight = height || 60;
    return `/api/placeholder/${placeholderWidth}/${placeholderHeight}`;
  };

  // Handle image load error
  const handleError = () => {
    if (!error) {
      setError(true);
      setImgSrc(getPlaceholderUrl());
    }
  };

  // If no source provided, use placeholder
  if (!src || src === '') {
    return (
      <Image
        src={getPlaceholderUrl()}
        alt={alt}
        width={width}
        height={height}
        className={className || ''}
        fill={fill}
        sizes={sizes}
        style={style}
      />
    );
  }

  // Check if URL is from Spotify
  const isSpotifyUrl = src.includes('scdn.co') || src.includes('spotifycdn.com');

  // For Spotify URLs, see if we need a proxy
  // Example: instead of linking directly to i.scdn.co, 
  // we could use our own proxy: /api/image-proxy?url=...
  let finalSrc = imgSrc;

  // Uncomment this to use a proxy for Spotify images
  // if (isSpotifyUrl && !imgSrc.startsWith('/api/') && !error) {
  //   finalSrc = `/api/image-proxy?url=${encodeURIComponent(imgSrc)}`;
  // }

  return (
    <Image
      src={finalSrc}
      alt={alt}
      width={width}
      height={height}
      className={className || ''}
      fill={fill}
      sizes={sizes}
      style={style}
      onError={handleError}
    />
  );
}