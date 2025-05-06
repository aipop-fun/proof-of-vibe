import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Custom API route to handle CSRF token requests
 * This generates a CSRF token for form submissions
 */
export async function GET() {
  // Generate a random token
  const csrfToken = crypto.randomBytes(32).toString('hex');
  
  // Store it in a cookie
  const response = NextResponse.json({ csrfToken });
  
  // Set the cookie
  response.cookies.set({
    name: 'next-auth.csrf-token',
    value: `${csrfToken}|${crypto.randomBytes(32).toString('hex')}`,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 // 1 hour
  });
  
  return response;
}