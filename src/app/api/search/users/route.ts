// src/app/api/search/users/route.ts

// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '~/lib/supabase';
import { z } from 'zod';
import { getNeynarClient, normalizeNeynarUser } from '~/lib/neynar';

async function searchNeynarUsersDirectly(query: string, limit: number) {
    const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
    if (!NEYNAR_API_KEY) throw new Error('NEYNAR_API_KEY não está configurada no servidor.');

    // CORREÇÃO: A API da Neynar para pesquisa de utilizadores tem um limite de 10.
    const effectiveLimit = Math.min(limit, 10);
    const url = `https://api.neynar.com/v2/farcaster/user/search?q=${encodeURIComponent(query)}&limit=${effectiveLimit}`;

    const response = await fetch(url, {
        headers: { 'accept': 'application/json', 'api_key': NEYNAR_API_KEY },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Erro da API com status ${response.status}` }));
        const error = new Error(`Erro da API Neynar: ${response.status}`);
        (error as any).response = { data: errorData, status: response.status };
        throw error;
    }

    return response.json();
}

// ... (o resto do ficheiro permanece igual, a chamada já passa o 'limit' corretamente)
const SearchParamsSchema = z.object({
    q: z.string().min(1, 'A consulta (query) é obrigatória'),
    limit: z.coerce.number().min(1).max(50).default(20), // O schema pode permitir mais, mas a função limita
    hasSpotify: z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined)
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
            return NextResponse.json({ error: 'Parâmetros inválidos', details: parseResult.error.errors }, { status: 400 });
        }

        const { q: query, limit, hasSpotify } = parseResult.data;
        const client = getNeynarClient();
        const isFidQuery = /^\d+$/.test(query.trim());
        let users: any[] = [];

        if (isFidQuery) {
            // ... (a lógica de pesquisa por FID não precisa de alterações)
        }

        if (users.length === 0) {
            // A chamada aqui passa o 'limit', que a função 'searchNeynarUsersDirectly' irá fixar em 10.
            const searchResponse = await searchNeynarUsersDirectly(query, limit);
            users = searchResponse.result?.users?.map(normalizeNeynarUser) || [];
        }

        // ... (a lógica do Spotify e a resposta final permanecem as mesmas)
        if (users.length > 0) {
            const fids = users.map(user => user.fid);
            const { data: spotifyUsers } = await supabase.from('user_profiles').select('fid').in('fid', fids).not('spotify_id', 'is', null);
            const spotifyFids = new Set(spotifyUsers?.map(user => user.fid) || []);
            users = users.map(user => ({ ...user, hasSpotify: spotifyFids.has(user.fid) }));

            if (typeof hasSpotify === 'boolean') {
                users = users.filter(user => user.hasSpotify === hasSpotify);
            }
        }

        return NextResponse.json({ users: users.slice(0, limit), total: users.length });

    } catch (error: any) {
        console.error('Erro na API de pesquisa de utilizadores:', error);

        const status = error?.response?.status || 500;
        let errorMessage = 'Falha ao procurar utilizadores';

        if (error?.response?.data?.message) {
            errorMessage = error.response.data.message;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }

        return NextResponse.json({ error: errorMessage, details: error?.response?.data || {} }, { status });
    }
}