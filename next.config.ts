import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: [
      'i.scdn.co',       
      'mosaic.scdn.co',  
      'lineup-images.scdn.co', 
      'image-cdn-fa.spotifycdn.com', 
      'image-cdn-ak.spotifycdn.com', 
      'i.imgur.com',     
      'platform-lookaside.fbsbx.com', 
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.scdn.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.spotifycdn.com',
        port: '',
        pathname: '/**',
      }
    ]
  },
  
  async rewrites() {
    return [
      {
        source: '/api/placeholder/:width/:height',
        destination: 'https://placehold.co/:width/:height',
      },
    ];
  }
};

export default nextConfig;