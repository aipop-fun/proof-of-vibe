import { NextRequest, NextResponse } from 'next/server';
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

/**
 * Generates a placeholder image with the specified dimensions
 * 
 * This is used as a fallback when actual images fail to load
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { width: string; height: string } }
) {
    try {
        // Parse width and height from URL params
        const width = parseInt(params.width, 10) || 100;
        const height = parseInt(params.height, 10) || 100;

        // Ensure dimensions are reasonable to prevent abuse
        const safeWidth = Math.min(Math.max(width, 10), 800);
        const safeHeight = Math.min(Math.max(height, 10), 800);

        // Generate a placeholder image (purple gradient with music icon)
        return new ImageResponse(
            (
                <div
          style= {{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #7C3AED, #4F46E5)',
            color: 'white',
            fontSize: Math.max(safeWidth, safeHeight) * 0.3,
        }}
        >
        <svg 
            xmlns="http://www.w3.org/2000/svg"
    width = { safeWidth * 0.5}
    height = { safeHeight * 0.5}
    viewBox = "0 0 24 24"
    fill = "none"
    stroke = "currentColor"
    strokeWidth = "2"
    strokeLinecap = "round"
    strokeLinejoin = "round"
        >
        <circle cx="12" cy = "12" r = "10" />
            <circle cx="12" cy = "12" r = "4" />
                <line x1="12" y1 = "16" x2 = "12" y2 = "22" />
                    <line x1="12" y1 = "8" x2 = "12" y2 = "2" />
                        <line x1="16" y1 = "12" x2 = "22" y2 = "12" />
                            <line x1="8" y1 = "12" x2 = "2" y2 = "12" />
                                </svg>
                                </div>
      ),
    {
        width: safeWidth,
            height: safeHeight,
      }
    );
} catch (error) {
    console.error('Error generating placeholder image:', error);
    return new NextResponse('Error generating image', { status: 500 });
}
}