import { NextRequest, NextResponse } from 'next/server';

/**
 * Custom API route to handle authentication errors
 * This intercepts error requests to /api/auth/error and redirects them to a user-friendly error page
 */
export async function GET(request: NextRequest) {
    // Get the error parameter from the URL
    const searchParams = request.nextUrl.searchParams;
    const error = searchParams.get('error') || 'unknown';

    // Create the redirect URL to our custom error page
    const errorPageUrl = `/auth/error?error=${encodeURIComponent(error)}`;

    // Redirect to the custom error page
    return NextResponse.redirect(new URL(errorPageUrl, request.url));
}