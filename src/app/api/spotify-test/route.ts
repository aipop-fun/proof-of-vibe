/* eslint-disable @typescript-eslint/ban-ts-comment*/
export async function GET() {
  try {
    // Encode credentials
    const basicAuth = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString('base64');
    
    // Try to get a token using client credentials flow (simpler than auth code flow)
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return Response.json({
        success: false,
        error: data.error,
        error_description: data.error_description,
        status: response.status,
      });
    }
    
    return Response.json({
      success: true,
      token_type: data.token_type,
      expires_in: data.expires_in,
      access_token_preview: data.access_token?.substring(0, 10) + '...',
    });
  } catch (error) {
    return Response.json({
      success: false,
        // @ts-ignore
      error: error.message,
        // @ts-ignore
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}