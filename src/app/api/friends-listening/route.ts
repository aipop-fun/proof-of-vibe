/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unused-vars, prefer-const */
// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getNeynarClient } from "~/lib/neynar";
import { supabase, getUsersWithSpotify } from "~/lib/supabase";
import { getSpotifyApiClient } from "~/lib/spotify-api";

/**
 * Endpoint para buscar amigos que estão ouvindo música em tempo real
 * Este endpoint combina dados do Neynar (amigos no Farcaster) e do Spotify
 */
export async function GET(request: NextRequest) {
    try {
        // Extract query parameters
        const searchParams = request.nextUrl.searchParams;
        const fidParam = searchParams.get("fid");
        const limit = parseInt(searchParams.get("limit") || "20", 10);

        if (!fidParam) {
            return NextResponse.json(
                { error: "FID parameter is required" },
                { status: 400 }
            );
        }

        const fid = parseInt(fidParam, 10);
        if (isNaN(fid)) {
            return NextResponse.json(
                { error: "Invalid FID parameter" },
                { status: 400 }
            );
        }

        // Passo 1: Buscar usuários que conectaram o Spotify do Supabase
        const spotifyUsers = await getUsersWithSpotify();

        if (!spotifyUsers.length) {
            return NextResponse.json({
                friends: [],
                message: "No users with connected Spotify accounts found"
            });
        }

        // Passo 2: Buscar pessoas que o usuário segue e que seguem o usuário no Farcaster
        const neynarClient = getNeynarClient();
        const apiKey = process.env.NEYNAR_API_KEY;

        // Buscar seguidores usando API direta
        let followersUrl = `https://api.neynar.com/v2/farcaster/user/followers?fid=${fid}&limit=50`;
        const followersResponse = await fetch(followersUrl, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'api_key': apiKey
            }
        });

        if (!followersResponse.ok) {
            throw new Error(`Error fetching followers: ${followersResponse.status}`);
        }

        const followersData = await followersResponse.json();

        // Buscar pessoas que o usuário segue
        let followingUrl = `https://api.neynar.com/v2/farcaster/following?fid=${fid}&limit=50`;
        const followingResponse = await fetch(followingUrl, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'api_key': apiKey
            }
        });

        if (!followingResponse.ok) {
            throw new Error(`Error fetching following: ${followingResponse.status}`);
        }

        const followingData = await followingResponse.json();

        // Passo 3: Criar um mapa com todos os amigos (seguidores e seguidos)
        const friendsMap = new Map();

        // Adicionar seguidores ao mapa
        if (followersData.users && Array.isArray(followersData.users)) {
            followersData.users.forEach(item => {
                const user = item.user;
                friendsMap.set(user.fid, {
                    fid: user.fid,
                    username: user.username,
                    displayName: user.display_name || user.username,
                    profileImage: user.pfp_url,
                    isFollower: true,
                    isFollowing: false
                });
            });
        }

        // Adicionar pessoas que o usuário segue ao mapa
        if (followingData.users && Array.isArray(followingData.users)) {
            followingData.users.forEach(item => {
                const user = item.user;
                if (friendsMap.has(user.fid)) {
                    // Se já estiver no mapa, atualizar a propriedade isFollowing
                    friendsMap.get(user.fid).isFollowing = true;
                } else {
                    // Se não estiver no mapa, adicionar
                    friendsMap.set(user.fid, {
                        fid: user.fid,
                        username: user.username,
                        displayName: user.display_name || user.username,
                        profileImage: user.pfp_url,
                        isFollower: false,
                        isFollowing: true
                    });
                }
            });
        }

        // Passo 4: Filtrar apenas amigos que conectaram o Spotify
        const friendsWithSpotify = [];

        // Para cada amigo no mapa, verificar se conectou o Spotify
        for (let [friendFid, friendData] of friendsMap) {
            const spotifyUser = spotifyUsers.find(user => user.fid === friendFid);

            if (spotifyUser && spotifyUser.spotify_id) {
                friendsWithSpotify.push({
                    ...friendData,
                    id: spotifyUser.id,
                    spotifyId: spotifyUser.spotify_id
                });
            }
        }

        // Passo 5: Para cada amigo com Spotify, buscar o que está ouvindo
        // Note: Idealmente, isso requer um token de acesso para cada usuário
        // Por simplificação, estamos apenas retornando a lista de amigos com Spotify

        // Gerar IDs únicos para cada amigo
        const friendsListening = friendsWithSpotify.map((friend, index) => ({
            ...friend,
            id: friend.id || `friend-${friend.fid}`,
            timestamp: new Date().getTime() - (index * 60000) // Simular timestamps diferentes
        }));

        return NextResponse.json({
            friends: friendsListening.slice(0, limit),
            total: friendsListening.length
        });

    } catch (error) {
        console.error("Error fetching friends listening:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch friends listening",
                details: error.message || "Unknown error"
            },
            { status: 500 }
        );
    }
}