// src/app/api/placeholder/[width]/[height]/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * API route for generating placeholder images with specified width and height
 * Format: /api/placeholder/100/200
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ width: string; height: string }> }
) {
    try {
        // Now we need to await the params Promise
        const { width, height } = await params;

        // Parse parameters
        const widthNum = parseInt(width, 10) || 100;
        const heightNum = parseInt(height, 10) || 100;

        // Generate SVG placeholder
        const svg = `
      <svg width="${widthNum}" height="${heightNum}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#E5E7EB" />
        <text 
          x="50%" 
          y="50%" 
          font-family="Arial" 
          font-size="14" 
          fill="#6B7280" 
          text-anchor="middle" 
          dominant-baseline="middle"
        >${widthNum}x${heightNum}</text>
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