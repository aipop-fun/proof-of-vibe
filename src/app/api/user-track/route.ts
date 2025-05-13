/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unused-vars, prefer-const */
// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getNeynarClient } from "~/lib/neynar";
import { supabase, getUsersWithSpotify } from "~/lib/supabase";
import { getSpotifyApiClient } from "~/lib/spotify-api";

/**
 * Endpoint para buscar informações de tracks em tempo real dos usuários que conectaram Spotify
 * Este endpoint tenta buscar o que cada usuário está ouvindo no momento ou suas top tracks
 */
export async function GET(request: NextRequest) {
    try {
        // Extract query parameters
        const searchParams = request.nextUrl.searchParams;
        const fidParam = searchParams.get("fid");
        const spotifyIdParam = searchParams.get("spotify_id");
        const tokenParam = searchParams.get("token");

        if (!fidParam && !spotifyIdParam) {
            return NextResponse.json(
                { error: "Either FID or Spotify ID parameter is required" },
                { status: 400 }
            );
        }

        // Buscar o usuário no Supabase
        let userQuery = supabase.from('user_profiles').select('*');

        if (fidParam) {
            const fid = parseInt(fidParam, 10);
            if (isNaN(fid)) {
                return NextResponse.json(
                    { error: "Invalid FID parameter" },
                    { status: 400 }
                );
            }
            userQuery = userQuery.eq('fid', fid);
        } else if (spotifyIdParam) {
            userQuery = userQuery.eq('spotify_id', spotifyIdParam);
        }

        const { data: userData, error: userError } = await userQuery.single();

        if (userError || !userData) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // Verificar se o usuário tem um ID do Spotify
        if (!userData.spotify_id) {
            return NextResponse.json(
                { error: "User does not have a connected Spotify account" },
                { status: 400 }
            );
        }

        // Inicializar o cliente Spotify
        // Normalmente, seria necessário obter o token de acesso do usuário
        // Para fins de demonstração, podemos usar um token passado como parâmetro ou buscar de um armazenamento
        let accessToken = tokenParam;

        if (!accessToken) {
            // Buscar o token de acesso do usuário de um armazenamento
            // Por exemplo, poderia ser armazenado no próprio registro do usuário
            // Para este exemplo, vamos apenas retornar um erro
            return NextResponse.json(
                { error: "Access token is required" },
                { status: 400 }
            );
        }

        // Inicializar o cliente Spotify com o token de acesso
        const spotifyClient = getSpotifyApiClient(accessToken);

        // Buscar o que o usuário está ouvindo no momento
        try {
            const currentlyPlaying = await spotifyClient.player.getCurrentlyPlayingTrack();

            if (currentlyPlaying && currentlyPlaying.item) {
                const track = currentlyPlaying.item;

                // Formatar e retornar os dados da faixa atual
                return NextResponse.json({
                    id: userData.id || userData.spotify_id,
                    fid: userData.fid,
                    username: userData.username || null,
                    displayName: userData.display_name || null,
                    spotifyId: userData.spotify_id,
                    timestamp: new Date().getTime(),
                    track: {
                        id: track.id,
                        title: track.name,
                        artist: track.artists.map(artist => artist.name).join(', '),
                        album: track.album?.name || '',
                        albumArt: track.album?.images?.[0]?.url || null,
                        type: track.type,
                        duration: formatDuration(track.duration_ms),
                        currentTime: formatDuration(currentlyPlaying.progress_ms),
                        isPlaying: currentlyPlaying.is_playing
                    }
                });
            }

            // Se não estiver tocando nada no momento, buscar as top tracks
            const topTracks = await spotifyClient.currentUser.topItems('tracks', 'short_term', 1);

            if (topTracks && topTracks.items && topTracks.items.length > 0) {
                const track = topTracks.items[0];

                // Formatar e retornar os dados da top track
                return NextResponse.json({
                    id: userData.id || userData.spotify_id,
                    fid: userData.fid,
                    username: userData.username || null,
                    displayName: userData.display_name || null,
                    spotifyId: userData.spotify_id,
                    timestamp: new Date().getTime() - 3600000, // 1 hora atrás (para indicar que não é em tempo real)
                    track: {
                        id: track.id,
                        title: track.name,
                        artist: track.artists.map(artist => artist.name).join(', '),
                        album: track.album?.name || '',
                        albumArt: track.album?.images?.[0]?.url || null,
                        type: track.type,
                        duration: formatDuration(track.duration_ms),
                        isRecent: true
                    }
                });
            }

            // Se não tiver dados de tracks, retornar erro
            return NextResponse.json(
                { error: "No track data available for this user" },
                { status: 404 }
            );

        } catch (spotifyError) {
            console.error("Error fetching Spotify data:", spotifyError);
            return NextResponse.json(
                {
                    error: "Failed to fetch Spotify data",
                    details: spotifyError.message || "Unknown Spotify error"
                },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error("Error fetching user tracks:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch user tracks",
                details: error.message || "Unknown error"
            },
            { status: 500 }
        );
    }
}

// Função auxiliar para formatar a duração em minutos:segundos
function formatDuration(ms) {
    if (!ms) return '0:00';

    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}