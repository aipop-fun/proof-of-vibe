// src/app/api/image-proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';

/**
 * API route that serves as a proxy for fetching images from external domains
 * Helps overcome CORS restrictions and domain limitations in Next.js
 */
export async function GET(request: NextRequest) {
    // Get image URL from query parameters
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    // If no URL is provided, return error
    if (!imageUrl) {
        return new NextResponse('Image URL not provided', { status: 400 });
    }

    try {
        // Validate URL format
        const url = new URL(imageUrl);

        // Security check: only allow Spotify CDN domains
        const allowedDomains = [
            'i.scdn.co',
            'mosaic.scdn.co',
            'image-cdn-fa.spotifycdn.com',
            'image-cdn-ak.spotifycdn.com',
            'image-cdn-tp.spotifycdn.com',
            'lineup-images.scdn.co',
            'seeded-session-images.scdn.co',
            'dailymix-images.scdn.co',
            'newjams-images.scdn.co',
            'thisis-images.scdn.co',
            'wrapped-images.spotifycdn.com'
        ];

        const isAllowedDomain = allowedDomains.some(domain =>
            url.hostname.endsWith(domain) || url.hostname === domain
        );

        if (!isAllowedDomain) {
            return new NextResponse('Only Spotify CDN URLs are allowed', { status: 403 });
        }

        // Fetch the image
        const response = await fetch(imageUrl, {
            headers: {
                // Pass a user-agent to avoid being blocked
                'User-Agent': 'Timbra-Image-Proxy/1.0',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        // Get the image data as an array buffer
        const imageData = await response.arrayBuffer();

        // Detect content type from response headers or use fallback
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        // Create response with appropriate headers
        return new NextResponse(imageData, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
                'Access-Control-Allow-Origin': '*', // CORS headers
                'Access-Control-Allow-Methods': 'GET',
            }
        });

    } catch (error) {
        console.error('Error in image proxy:', error);
        return new NextResponse(
            error instanceof Error ? error.message : 'Error processing image',
            { status: 500 }
        );
    }
}