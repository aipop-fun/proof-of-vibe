/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "~/lib/supabase";

interface TrackParams {
    trackId: string;
}

/**
 * Endpoint para buscar informações de uma track específica do histórico
 * Usado pela página de compartilhamento de tracks
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<TrackParams> }
) {
    try {
        const { trackId } = await context.params;

        if (!trackId) {
            return NextResponse.json(
                { error: "Track ID is required" },
                { status: 400 }
            );
        }

        console.log(`Fetching track data for ID: ${trackId}`);

        // Buscar a track no histórico de audição
        // Primeiro, verificar se trackId é um UUID (entrada do listening_history)
        // ou um spotify_track_id
        let trackQuery = supabase
            .from('listening_history')
            .select(`
                *,
                users!inner(
                    id,
                    fid,
                    username,
                    display_name,
                    profile_image
                )
            `);

        // Verificar se é um UUID (formato do ID da tabela)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (uuidRegex.test(trackId)) {
            // É um UUID, buscar por ID da entrada
            trackQuery = trackQuery.eq('id', trackId);
        } else {
            // Assumir que é um spotify_track_id
            trackQuery = trackQuery.eq('spotify_track_id', trackId);
        }

        const { data: trackData, error: trackError } = await trackQuery
            .order('listened_at', { ascending: false })
            .limit(1)
            .single();

        if (trackError) {
            console.error('Error fetching track:', trackError);

            // Se não encontrou por ID específico, tentar buscar por spotify_track_id
            if (trackError.code === 'PGRST116' && uuidRegex.test(trackId)) {
                // Não encontrou por UUID, não tentar novamente
                return NextResponse.json(
                    { error: "Track not found" },
                    { status: 404 }
                );
            } else if (trackError.code === 'PGRST116') {
                // Não encontrou por spotify_track_id
                return NextResponse.json(
                    { error: "Track not found" },
                    { status: 404 }
                );
            }

            throw new Error(`Database error: ${trackError.message}`);
        }

        if (!trackData) {
            return NextResponse.json(
                { error: "Track not found" },
                { status: 404 }
            );
        }

        // Buscar quantas vezes esta track foi ouvida no total
        const { data: listenCountData, error: countError } = await supabase
            .from('listening_history')
            .select('id')
            .eq('spotify_track_id', trackData.spotify_track_id);

        if (countError) {
            console.error('Error fetching listen count:', countError);
            // Continue sem o count em caso de erro
        }

        const listenCount = listenCountData?.length || 0;

        // Buscar usuários únicos que ouviram esta track
        const { data: uniqueListenersData, error: listenersError } = await supabase
            .from('listening_history')
            .select('user_id')
            .eq('spotify_track_id', trackData.spotify_track_id)
            .neq('user_id', null);

        if (listenersError) {
            console.error('Error fetching unique listeners:', listenersError);
        }

        const uniqueListeners = uniqueListenersData ?
            new Set(uniqueListenersData.map(entry => entry.user_id)).size : 0;

        // Formatar resposta
        const response = {
            track: {
                id: trackData.id,
                spotify_track_id: trackData.spotify_track_id,
                track_title: trackData.track_title,
                track_artist: trackData.track_artist,
                track_album: trackData.track_album,
                track_cover_art: trackData.track_cover_art,
                track_duration_ms: trackData.track_duration_ms,
                track_progress_ms: trackData.track_progress_ms,
                track_uri: trackData.track_uri,
                track_popularity: trackData.track_popularity,
                is_playing: trackData.is_playing,
                listened_at: trackData.listened_at,
                created_at: trackData.created_at
            },
            user: trackData.users ? {
                id: trackData.users.id,
                fid: trackData.users.fid,
                username: trackData.users.username,
                display_name: trackData.users.display_name,
                profile_image: trackData.users.profile_image
            } : null,
            listenCount,
            uniqueListeners,
            metadata: {
                fetchedAt: new Date().toISOString(),
                trackId: trackId
            }
        };

        console.log(`Successfully fetched track: ${trackData.track_title} by ${trackData.track_artist}`);

        return NextResponse.json(response);

    } catch (error) {
        console.error("Error in /api/tracks/[trackId]:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch track data",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
}

/**
 * Endpoint para atualizar informações de uma track (futuro)
 */
export async function PATCH(
    request: NextRequest,
    context: { params: Promise<TrackParams> }
) {
    try {
        const { trackId } = await context.params;
        const body = await request.json();

        return NextResponse.json(
            { message: "Track update not implemented yet" },
            { status: 501 }
        );

    } catch (error) {
        console.error("Error updating track:", error);
        return NextResponse.json(
            {
                error: "Failed to update track",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
}