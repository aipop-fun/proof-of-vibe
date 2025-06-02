/* eslint-disable prefer-const */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "~/lib/supabase";

/**
 * Endpoint para criar URLs de compartilhamento para tracks
 * Recebe informações da track e retorna URL formatada
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            spotifyTrackId,
            userId,
            trackTitle,
            trackArtist,
            trackAlbum,
            trackCoverArt,
            trackDurationMs,
            trackUri,
            trackPopularity
        } = body;

        // Validar dados obrigatórios
        if (!spotifyTrackId || !userId || !trackTitle || !trackArtist) {
            return NextResponse.json(
                { error: "Missing required fields: spotifyTrackId, userId, trackTitle, trackArtist" },
                { status: 400 }
            );
        }

        console.log(`Creating share URL for track: ${trackTitle} by ${trackArtist}`);

        // Buscar ou criar entrada no histórico
        let { data: existingTrack, error: fetchError } = await supabase
            .from('listening_history')
            .select('id, listened_at')
            .eq('spotify_track_id', spotifyTrackId)
            .eq('user_id', userId)
            .order('listened_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (fetchError) {
            console.error('Error fetching existing track:', fetchError);
            throw new Error(`Database fetch error: ${fetchError.message}`);
        }

        let trackHistoryId: string;

        if (existingTrack) {
            // Atualizar entrada existente
            const { data: updatedTrack, error: updateError } = await supabase
                .from('listening_history')
                .update({
                    track_title: trackTitle,
                    track_artist: trackArtist,
                    track_album: trackAlbum,
                    track_cover_art: trackCoverArt,
                    track_duration_ms: trackDurationMs,
                    track_uri: trackUri,
                    track_popularity: trackPopularity,
                    listened_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingTrack.id)
                .select('id')
                .single();

            if (updateError) {
                console.error('Error updating track:', updateError);
                throw new Error(`Database update error: ${updateError.message}`);
            }

            trackHistoryId = updatedTrack.id;
        } else {
            // Criar nova entrada
            const { data: newTrack, error: insertError } = await supabase
                .from('listening_history')
                .insert({
                    user_id: userId,
                    spotify_track_id: spotifyTrackId,
                    track_title: trackTitle,
                    track_artist: trackArtist,
                    track_album: trackAlbum,
                    track_cover_art: trackCoverArt,
                    track_duration_ms: trackDurationMs,
                    track_uri: trackUri,
                    track_popularity: trackPopularity,
                    is_playing: false,
                    listened_at: new Date().toISOString()
                })
                .select('id')
                .single();

            if (insertError) {
                console.error('Error inserting track:', insertError);
                throw new Error(`Database insert error: ${insertError.message}`);
            }

            trackHistoryId = newTrack.id;
        }

        // Gerar URL de compartilhamento
        const baseUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const shareUrl = `${baseUrl}/share/${trackHistoryId}`;

        // Gerar mensagem de compartilhamento
        const shareMessage = `🎵 I'm listening to ${trackTitle} by ${trackArtist} on Timbra!`;

        // Buscar informações do usuário para enriquecer a resposta
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('username, display_name, fid')
            .eq('id', userId)
            .single();

        if (userError) {
            console.log('Could not fetch user data:', userError);
        }

        const response = {
            shareUrl,
            shareMessage,
            trackHistoryId,
            track: {
                title: trackTitle,
                artist: trackArtist,
                album: trackAlbum,
                coverArt: trackCoverArt,
                spotifyTrackId,
                uri: trackUri
            },
            user: userData ? {
                username: userData.username,
                displayName: userData.display_name,
                fid: userData.fid
            } : null,
            createdAt: new Date().toISOString()
        };

        console.log(`Share URL created: ${shareUrl}`);

        return NextResponse.json(response);

    } catch (error) {
        console.error("Error in /api/share/track:", error);
        return NextResponse.json(
            {
                error: "Failed to create share URL",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
}

/**
 * Endpoint para buscar tracks compartilhadas recentes
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const limit = parseInt(searchParams.get("limit") || "20", 10);
        const userId = searchParams.get("userId");
        const hours = parseInt(searchParams.get("hours") || "24", 10);

        // Calcular timestamp para filtro de tempo
        const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000);

        let query = supabase
            .from('listening_history')
            .select(`
                id,
                spotify_track_id,
                track_title,
                track_artist,
                track_album,
                track_cover_art,
                track_duration_ms,
                track_uri,
                track_popularity,
                listened_at,
                users!inner(
                    id,
                    username,
                    display_name,
                    fid,
                    profile_image
                )
            `)
            .gte('listened_at', timeThreshold.toISOString())
            .order('listened_at', { ascending: false })
            .limit(limit);

        // Filtrar por usuário específico se fornecido
        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data: recentTracks, error } = await query;

        if (error) {
            console.error('Error fetching recent shared tracks:', error);
            throw new Error(`Database error: ${error.message}`);
        }

        // Formatar resposta
        const baseUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

        const formattedTracks = (recentTracks || []).map(track => {
            // Handle the case where users might be an array or object
            const user = Array.isArray(track.users) ? track.users[0] : track.users;

            return {
                id: track.id,
                shareUrl: `${baseUrl}/share/${track.id}`,
                track: {
                    spotifyId: track.spotify_track_id,
                    title: track.track_title,
                    artist: track.track_artist,
                    album: track.track_album,
                    coverArt: track.track_cover_art,
                    duration: track.track_duration_ms,
                    uri: track.track_uri,
                    popularity: track.track_popularity
                },
                user: user ? {
                    id: user.id,
                    username: user.username,
                    displayName: user.display_name,
                    fid: user.fid,
                    profileImage: user.profile_image
                } : null,
                listenedAt: track.listened_at,
                shareMessage: `🎵 Check out ${track.track_title} by ${track.track_artist} on Timbra!`
            };
        });

        return NextResponse.json({
            tracks: formattedTracks,
            total: formattedTracks.length,
            metadata: {
                limit,
                hours,
                fetchedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error("Error fetching recent shared tracks:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch recent shared tracks",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
}