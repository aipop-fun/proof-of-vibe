// src/app/api/placeholder/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * API route for generating placeholder images with query parameters
 * Format: /api/placeholder?width=100&height=200
 */
export async function GET(request: NextRequest) {
    try {
        // Extract query parameters
        const searchParams = request.nextUrl.searchParams;
        const widthParam = searchParams.get('width');
        const heightParam = searchParams.get('height');
        const sizeParam = searchParams.get('size');

        // Parse dimensions with fallbacks
        let width = 100;
        let height = 100;

        // Size parameter sets both width and height if provided
        if (sizeParam) {
            const size = parseInt(sizeParam, 10);
            if (!isNaN(size)) {
                width = height = size;
            }
        }

        // Width and height parameters override size if provided
        if (widthParam) {
            const parsedWidth = parseInt(widthParam, 10);
            if (!isNaN(parsedWidth)) {
                width = parsedWidth;
            }
        }

        if (heightParam) {
            const parsedHeight = parseInt(heightParam, 10);
            if (!isNaN(parsedHeight)) {
                height = parsedHeight;
            }
        }

        // Generate SVG placeholder
        const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#E5E7EB" />
        <text 
          x="50%" 
          y="50%" 
          font-family="Arial" 
          font-size="14" 
          fill="#6B7280" 
          text-anchor="middle" 
          dominant-baseline="middle"
        >${width}x${height}</text>
      </svg>
    `;

        // Return SVG with appropriate headers
        return new NextResponse(svg, {
            headers: {
                "Content-Type": "image/svg+xml",
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (error) {
        console.error("Error generating placeholder image:", error);
        return NextResponse.json(
            { error: "Failed to generate placeholder image" },
            { status: 500 }
        );
    }
}