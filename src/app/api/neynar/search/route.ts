// src/app/api/neynar/search/route.ts

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getNeynarClient, normalizeNeynarUser } from '~/lib/neynar';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query) {
      return NextResponse.json({ error: 'O parâmetro de consulta (query) é obrigatório' }, { status: 400 });
    }

    const client = getNeynarClient();
    const isFidQuery = /^\d+$/.test(query.trim());
    let users: any[] = [];

    if (isFidQuery) {
      // ... (lógica de pesquisa por FID)
    }

    if (users.length === 0) {
      const searchResponse = await client.searchUser({
        q: query,
        // CORREÇÃO: Ajustar o limite para o máximo permitido pela API
        limit: Math.min(limit, 10),
      });
      users = searchResponse.result?.users?.map(normalizeNeynarUser) || [];
    }

    return NextResponse.json({
      users: users.slice(0, limit),
      total: users.length,
    });

  } catch (error: any) {
    console.error('Erro na API de pesquisa Neynar:', error);

    // CORREÇÃO: Implementar gestão de erros robusta para evitar o crash de 'instanceof'
    const status = error?.response?.status || 500;
    let errorMessage = 'Falha ao procurar utilizadores';

    if (error?.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error?.response?.data || {},
      },
      { status: status }
    );
  }
}