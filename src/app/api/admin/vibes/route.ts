import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const session = await auth();
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!session?.user || !token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify admin user (in production, use a proper admin check)
    const adminUsers = process.env.ADMIN_USERS?.split(',') || [];
    const userEmail = session.user.email;
    
    if (!adminUsers.includes(userEmail || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Mock vibe data - in a real app, fetch from database
    const mockVibes = Array.from({ length: 100 }, (_, i) => {
      const id = i + 1;
      const userId = Math.floor(Math.random() * 10) + 1;
      const timestamp = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      
      return {
        id,
        userId,
        fid: userId * 1000 + Math.floor(Math.random() * 1000),
        spotifyId: `spotify:user:${userId * 100 + Math.floor(Math.random() * 100)}`,
        timestamp: timestamp.toISOString(),
        proofId: `proof_${id}_${Math.random().toString(36).substring(2, 10)}`,
        trackId: `spotify:track:${Math.random().toString(36).substring(2, 12)}`,
        trackName: `Track ${id}`,
        artistName: `Artist ${Math.floor(Math.random() * 20) + 1}`,
        albumName: `Album ${Math.floor(Math.random() * 50) + 1}`,
        duration: Math.floor(Math.random() * 300000) + 120000, // 2-7 minutes in ms
        verified: Math.random() > 0.2, // 80% are verified
        shared: Math.random() > 0.5, // 50% are shared
        rawData: {
          popularity: Math.floor(Math.random() * 100),
          danceability: Math.random().toFixed(2),
          energy: Math.random().toFixed(2),
          valence: Math.random().toFixed(2),
          tempo: (Math.random() * 80 + 70).toFixed(2)
        }
      };
    });
    
    // Sort by most recent first
    mockVibes.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Paginate
    const paginatedVibes = mockVibes.slice(offset, offset + limit);
    
    return NextResponse.json({
      vibes: paginatedVibes,
      meta: {
        total: mockVibes.length,
        limit,
        offset,
        count: paginatedVibes.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching vibes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vibes data' },
      { status: 500 }
    );
  }
}