/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "~/lib/supabase";

/**
 * Endpoint para buscar as músicas em trending baseado no histórico de audição
 * Mostra as tracks mais ouvidas por todos os usuários nas últimas semanas
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const limit = parseInt(searchParams.get("limit") || "10", 10);
        const days = parseInt(searchParams.get("days") || "28", 10); // Default: 4 semanas
        const minListeners = parseInt(searchParams.get("min_listeners") || "2", 10);

        console.log(`Fetching trending tracks: limit=${limit}, days=${days}, minListeners=${minListeners}`);

        // Calcular data de início baseado nos dias
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        // Query para buscar as tracks mais populares
        // FIXED: Usando user_profiles em vez de users
        const { data: trendingData, error: trendingError } = await supabase
            .from('listening_history')
            .select(`
                spotify_track_id,
                track_title,
                track_artist,
                track_album,
                album_art_url,
                track_duration_ms,
                track_popularity,
                track_uri,
                listened_at,
                user_profiles!inner(
                    id,
                    fid,
                    username,
                    display_name,
                    avatar_url
                )
            `)
            .gte('listened_at', startDate.toISOString())
            .not('spotify_track_id', 'is', null)
            .not('track_title', 'is', null)
            .order('listened_at', { ascending: false });

        if (trendingError) {
            console.error('Error fetching trending data:', trendingError);
            throw new Error(`Database error: ${trendingError.message}`);
        }

        if (!trendingData || trendingData.length === 0) {
            console.log('No trending data found, returning empty result');
            return NextResponse.json({
                tracks: [],
                metadata: {
                    totalTracks: 0,
                    daysAnalyzed: days,
                    minListeners,
                    limit,
                    message: 'No listening history found for the specified period'
                }
            });
        }

        console.log(`Found ${trendingData.length} listening history entries`);

        // Processar dados para criar ranking de popularidade
        const trackStats = new Map();
        const trackData = new Map();

        trendingData.forEach(entry => {
            const trackId = entry.spotify_track_id;
            const userId = entry.user_profiles.id;

            // Inicializar dados da track se não existir
            if (!trackData.has(trackId)) {
                trackData.set(trackId, {
                    spotify_track_id: trackId,
                    track_title: entry.track_title,
                    track_artist: entry.track_artist,
                    track_album: entry.track_album,
                    track_cover_art: entry.album_art_url, // FIXED: nome da coluna
                    track_duration_ms: entry.track_duration_ms,
                    track_popularity: entry.track_popularity,
                    track_uri: entry.track_uri,
                    first_heard: entry.listened_at,
                    last_heard: entry.listened_at
                });
            }

            // Atualizar estatísticas
            if (!trackStats.has(trackId)) {
                trackStats.set(trackId, {
                    totalPlays: 0,
                    uniqueListeners: new Set(),
                    recentListeners: [],
                    firstHeard: entry.listened_at,
                    lastHeard: entry.listened_at
                });
            }

            const stats = trackStats.get(trackId);
            const track = trackData.get(trackId);

            stats.totalPlays++;
            stats.uniqueListeners.add(userId);
            stats.lastHeard = entry.listened_at;

            // Manter timestamp mais antigo
            if (new Date(entry.listened_at) < new Date(stats.firstHeard)) {
                stats.firstHeard = entry.listened_at;
            }

            // Adicionar listener recente (últimos 3 únicos)
            const listener = {
                username: entry.user_profiles.username,
                displayName: entry.user_profiles.display_name,
                fid: entry.user_profiles.fid,
                profileImage: entry.user_profiles.avatar_url, // FIXED: nome da coluna
                listenedAt: entry.listened_at
            };

            const existingListenerIndex = stats.recentListeners.findIndex(l => l.fid === listener.fid);
            if (existingListenerIndex >= 0) {
                // Atualizar timestamp se já existe
                stats.recentListeners[existingListenerIndex].listenedAt = listener.listenedAt;
            } else {
                stats.recentListeners.push(listener);
            }

            // Manter apenas os 3 listeners mais recentes
            stats.recentListeners = stats.recentListeners
                .sort((a, b) => new Date(b.listenedAt).getTime() - new Date(a.listenedAt).getTime())
                .slice(0, 3);

            // Atualizar dados da track
            track.last_heard = stats.lastHeard;
            if (new Date(stats.firstHeard) < new Date(track.first_heard)) {
                track.first_heard = stats.firstHeard;
            }
        });

        console.log(`Processed ${trackStats.size} unique tracks`);

        // Filtrar tracks que têm o número mínimo de listeners únicos
        const filteredTracks = Array.from(trackStats.entries())
            .filter(([trackId, stats]) => stats.uniqueListeners.size >= minListeners)
            .map(([trackId, stats]) => {
                const track = trackData.get(trackId);

                // Calcular score de trending (combina popularidade e recência)
                const uniqueListeners = stats.uniqueListeners.size;
                const totalPlays = stats.totalPlays;
                const daysSinceLastHeard = (Date.now() - new Date(stats.lastHeard).getTime()) / (1000 * 60 * 60 * 24);
                const recencyBoost = Math.max(0, 7 - daysSinceLastHeard) / 7; // Boost para tracks ouvidas nos últimos 7 dias

                const trendingScore = (uniqueListeners * 2 + totalPlays) * (1 + recencyBoost);

                return {
                    ...track,
                    trending_score: Math.round(trendingScore * 100) / 100,
                    unique_listeners: uniqueListeners,
                    total_plays: totalPlays,
                    recent_listeners: stats.recentListeners,
                    days_since_last_heard: Math.round(daysSinceLastHeard * 10) / 10,
                    duration_formatted: track.track_duration_ms ? formatDuration(track.track_duration_ms) : null
                };
            })
            .sort((a, b) => b.trending_score - a.trending_score)
            .slice(0, limit);

        console.log(`Filtered to ${filteredTracks.length} tracks meeting criteria`);

        // Formatar resultado final
        const formattedTracks = filteredTracks.map((track, index) => ({
            id: track.spotify_track_id,
            rank: index + 1,
            title: track.track_title,
            artist: track.track_artist,
            album: track.track_album,
            coverArt: track.track_cover_art,
            duration: track.duration_formatted,
            spotifyUri: track.track_uri,
            popularity: track.track_popularity,
            trendingScore: track.trending_score,
            stats: {
                uniqueListeners: track.unique_listeners,
                totalPlays: track.total_plays,
                daysSinceLastHeard: track.days_since_last_heard
            },
            recentListeners: track.recent_listeners,
            firstHeard: track.first_heard,
            lastHeard: track.last_heard
        }));

        console.log(`Returning ${formattedTracks.length} trending tracks`);

        return NextResponse.json({
            tracks: formattedTracks,
            metadata: {
                totalTracks: formattedTracks.length,
                daysAnalyzed: days,
                minListeners,
                limit,
                periodStart: startDate.toISOString(),
                periodEnd: new Date().toISOString(),
                totalEntriesAnalyzed: trendingData.length
            }
        });

    } catch (error) {
        console.error("Error in /api/trending-tracks:", error);
        
        // Enhanced error handling
        if (error instanceof Error) {
            // Check for specific database relationship errors
            if (error.message.includes('relationship') || error.message.includes('foreign key')) {
                return NextResponse.json(
                    {
                        error: "Database relationship error",
                        details: "The relationship between listening_history and user_profiles is not properly configured. Please run the database migration scripts.",
                        suggestion: "Execute the database relationship fix scripts and restart the server."
                    },
                    { status: 500 }
                );
            }
            
            // Check for missing table errors
            if (error.message.includes('does not exist') || error.message.includes('relation')) {
                return NextResponse.json(
                    {
                        error: "Database schema error",
                        details: error.message,
                        suggestion: "Ensure both listening_history and user_profiles tables exist and have the correct structure."
                    },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json(
            {
                error: "Failed to fetch trending tracks",
                details: error instanceof Error ? error.message : "Unknown error",
                suggestion: "Check server logs for more details."
            },
            { status: 500 }
        );
    }
}

// Helper function para formatear duração
function formatDuration(ms: number): string {
    if (!ms || ms <= 0) return "0:00";
    
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}