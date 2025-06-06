import { NextRequest, NextResponse } from 'next/server';
import { getNeynarClient, handleNeynarError, normalizeNeynarUser } from '~/lib/neynar';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    console.log('Neynar search API called with:', { query, limit });

    const client = getNeynarClient();

    // Primeiro tentar busca por FID se o query for numérico
    const isFidQuery = /^\d+$/.test(query.trim());

    if (isFidQuery) {
      try {
        const fid = parseInt(query.trim());
        console.log('Searching by FID:', fid);

        const userResponse = await client.fetchBulkUsers({
          fids: [fid]
        });

        if (userResponse.users && userResponse.users.length > 0) {
          const user = normalizeNeynarUser(userResponse.users[0]);
          return NextResponse.json({
            users: [user],
            total: 1
          });
        }
      } catch (fidError) {
        console.log('FID search failed, trying username search:', fidError);
        // Continue para busca por username
      }
    }

    // Busca por username/display name
    console.log('Searching by username/display name:', query);

    const searchResponse = await client.searchUser({
      q: query,
      limit: Math.min(limit, 50) // Neynar tem limite máximo
    });

    console.log('Neynar search response:', {
      resultCount: searchResponse.result?.users?.length || 0,
      query
    });

    if (!searchResponse.result?.users) {
      return NextResponse.json({
        users: [],
        total: 0
      });
    }

    // Normalizar usuários
    const users = searchResponse.result.users.map(normalizeNeynarUser);

    return NextResponse.json({
      users,
      total: users.length
    });

  } catch (error) {
    console.error('Neynar search API error:', error);

    const { state, error: errorMessage } = handleNeynarError(error);

    if (state === 'rate_limit') {
      return NextResponse.json(
        { error: 'Rate limited by Neynar API. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to search users' },
      { status: 500 }
    );
  }
}