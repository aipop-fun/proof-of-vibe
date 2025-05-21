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
    
    // Mock data - in a real app, fetch from database
    const users = [
      {
        id: 1,
        fid: 1234,
        username: 'alice',
        spotifyId: 'spotify:user:123',
        joinedAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        connections: {
          spotify: true,
          farcaster: true
        },
        stats: {
          proofs: 5,
          shares: 12,
          connections: 8
        }
      },
      {
        id: 2,
        fid: 5678,
        username: 'bob',
        spotifyId: 'spotify:user:456',
        joinedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        lastLogin: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        connections: {
          spotify: true,
          farcaster: true
        },
        stats: {
          proofs: 3,
          shares: 5,
          connections: 4
        }
      },
      {
        id: 3,
        fid: null,
        username: null,
        spotifyId: 'spotify:user:789',
        joinedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        lastLogin: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        connections: {
          spotify: true,
          farcaster: false
        },
        stats: {
          proofs: 1,
          shares: 0,
          connections: 2
        }
      }
    ];
    
    return NextResponse.json({
      users,
      meta: {
        total: users.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}