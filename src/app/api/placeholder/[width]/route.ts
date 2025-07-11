// src/app/api/placeholder/[width]/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * API route for generating placeholder images with specified width
 * Format: /api/placeholder/100
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ width: string }> }
) {
    try {
        // Now we need to await the params Promise
        const { width } = await params;

        // Parse width from path parameter
        const widthNum = parseInt(width, 10) || 100;

        // Check for height in query parameter, otherwise use width (square)
        const searchParams = request.nextUrl.searchParams;
        const heightNum = parseInt(searchParams.get("height") || String(widthNum), 10);

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