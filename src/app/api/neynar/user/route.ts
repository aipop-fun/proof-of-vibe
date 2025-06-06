// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '~/lib/supabase';
import { z } from 'zod';
import { getNeynarClient, normalizeNeynarUser } from '~/lib/neynar';

// A função de pesquisa direta que imita o endpoint de depuração funcional
async function searchNeynarUsersDirectly(query: string, limit: number) {
  const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
  if (!NEYNAR_API_KEY) {
    throw new Error('NEYNAR_API_KEY não está configurada no servidor.');
  }
  const url = `https://api.neynar.com/v2/farcaster/user/search?q=${encodeURIComponent(query)}&limit=${limit}`;
  const response = await fetch(url, {
    headers: {
      'accept': 'application/json',
      'api_key': NEYNAR_API_KEY,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: `Erro da API com status ${response.status}` }));
    console.error('A chamada direta à API da Neynar falhou:', { status: response.status, data: errorData });
    const error = new Error(`Erro da API Neynar: ${response.status} ${response.statusText}`);
    (error as any).response = { data: errorData, status: response.status };
    throw error;
  }

  return response.json();
}

const SearchParamsSchema = z.object({
  q: z.string().min(1, 'A consulta (query) é obrigatória'),
  limit: z.coerce.number().min(1).max(50).default(20),
  hasSpotify: z
    .string()
    .optional()
    .transform(val => val === 'true' ? true : val === 'false' ? false : undefined)
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parseResult = SearchParamsSchema.safeParse({
      q: searchParams.get('q'),
      limit: searchParams.get('limit'),
      hasSpotify: searchParams.get('hasSpotify')
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const { q: query, limit, hasSpotify } = parseResult.data;
    console.log('API de pesquisa de utilizadores chamada com:', { query, limit, hasSpotify });

    const client = getNeynarClient(); // Ainda usado para fetchBulkUsers por FID
    const isFidQuery = /^\d+$/.test(query.trim());
    let users: any[] = [];

    if (isFidQuery) {
      try {
        const fid = parseInt(query.trim());
        const userResponse = await client.fetchBulkUsers({ fids: [fid] });
        if (userResponse.users?.length > 0) {
          users = userResponse.users.map(normalizeNeynarUser);
        }
      } catch (fidError) {
        console.log('A pesquisa por FID falhou, a tentar pesquisar por nome de utilizador:', fidError);
      }
    }

    if (users.length === 0) {
      // CORREÇÃO: Usar a chamada fetch direta em vez do client.searchUser()
      const searchResponse = await searchNeynarUsersDirectly(query, Math.min(limit, 50));
      users = searchResponse.result?.users?.map(normalizeNeynarUser) || [];
    }

    if (users.length > 0) {
      const fids = users.map(user => user.fid);
      const { data: spotifyUsers } = await supabase
        .from('user_profiles')
        .select('fid')
        .in('fid', fids)
        .not('spotify_id', 'is', null);

      const spotifyFids = new Set(spotifyUsers?.map(user => user.fid) || []);
      users = users.map(user => ({
        ...user,
        hasSpotify: spotifyFids.has(user.fid)
      }));

      if (typeof hasSpotify === 'boolean') {
        users = users.filter(user => user.hasSpotify === hasSpotify);
      }
    }

    return NextResponse.json({
      users: users.slice(0, limit),
      total: users.length,
    });

  } catch (error: any) {
    console.error('Erro na API de pesquisa de utilizadores:', error);

    // CORREÇÃO: Gestão de erros robusta que evita o crash de 'instanceof'
    const status = error?.response?.status || 500;
    let errorMessage = 'Falha ao procurar utilizadores';

    if (error?.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    if (status === 429) {
      errorMessage = 'Limite de pedidos da API da Neynar atingido. Por favor, tente novamente mais tarde.';
    }

    return NextResponse.json(
      { error: errorMessage, details: error?.response?.data || {} },
      { status }
    );
  }
}