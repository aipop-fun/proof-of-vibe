/* eslint-disable @typescript-eslint/ban-ts-comment,  @typescript-eslint/no-unused-vars */
// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { supabase, getUsersWithSpotify } from "~/lib/supabase";
import { getSpotifyApiClient } from "~/lib/spotify-api";



export async function GET(request: NextRequest) {
    try {

        const searchParams = request.nextUrl.searchParams;
        const limit = parseInt(searchParams.get("limit") || "20", 10);
        const cursor = searchParams.get("cursor") || undefined;


        const spotifyUsers = await getUsersWithSpotify();

        if (!spotifyUsers.length) {
            return NextResponse.json({
                items: [],
                message: "No users with connected Spotify accounts found"
            });
        }


        const listeningFeed = [];

        for (let i = 0; i < spotifyUsers.length && listeningFeed.length < limit; i++) {
            const user = spotifyUsers[i];


            
            if (!user.fid || !user.spotify_id) continue;


            const simulatedTrack = {
                id: `track-${i}`,
                title: getRandomTrack(),
                artist: getRandomArtist(),
                album: getRandomAlbum(),
                albumArt: `https://picsum.photos/seed/${user.spotify_id}/300/300`,
                type: Math.random() > 0.1 ? "track" : "podcast",
                duration: `${Math.floor(Math.random() * 5) + 2}:${Math.floor(Math.random() * 59).toString().padStart(2, '0')}`,
                currentTime: `${Math.floor(Math.random() * 2)}:${Math.floor(Math.random() * 59).toString().padStart(2, '0')}`,
            };

            listeningFeed.push({
                id: user.id,
                fid: user.fid,
                username: user.username || `user${user.fid}`,
                displayName: user.display_name || `User ${user.fid}`,
                spotifyId: user.spotify_id,
                profileImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name || 'User')}&background=8B5CF6&color=fff`,
                timestamp: new Date().getTime() - (Math.random() * 3600000), // Tempo aleatório nas últimas horas
                track: simulatedTrack
            });
        }

        
        listeningFeed.sort((a, b) => b.timestamp - a.timestamp);

        let startIndex = 0;

        if (cursor) {
            try {
                const decodedCursor = JSON.parse(atob(cursor));
                const timestamp = decodedCursor.timestamp;
                const id = decodedCursor.id;


                const cursorIndex = listeningFeed.findIndex(item => item.timestamp < timestamp || (item.timestamp === timestamp && item.id > id));

                if (cursorIndex >= 0) {
                    startIndex = cursorIndex;
                }
            } catch (error) {
                console.error("Error parsing cursor:", error);
            }
        }


        
        const items = listeningFeed.slice(startIndex, startIndex + limit);

        let nextCursor = null;

        if (startIndex + limit < listeningFeed.length) {
            const lastItem = items[items.length - 1];
            const cursorData = {
                timestamp: lastItem.timestamp,
                id: lastItem.id
            };
            nextCursor = btoa(JSON.stringify(cursorData));
        }

        return NextResponse.json({
            items,
            nextCursor,
            total: listeningFeed.length
        });

    } catch (error) {
        console.error("Error fetching music feed:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch music feed",
                details: error.message || "Unknown error"
            },
            { status: 500 }
        );
    }
}

function getRandomTrack() {
    const tracks = [
        "Blinding Lights", "Starboy", "Save Your Tears",
        "Levitating", "Don't Start Now", "Physical",
        "As It Was", "Watermelon Sugar", "Adore You",
        "Stay", "Peaches", "Ghost",
        "Heat Waves", "Symphony", "Shotgun",
        "Bad Habits", "Shivers", "Perfect",
        "Unholy", "Flowers", "Kill Bill",
        "Die For You", "Creepin'", "Anti-Hero"
    ];
    return tracks[Math.floor(Math.random() * tracks.length)];
}

function getRandomArtist() {
    const artists = [
        "The Weeknd", "Dua Lipa", "Harry Styles",
        "Justin Bieber", "Glass Animals", "Ed Sheeran",
        "Sam Smith", "Miley Cyrus", "SZA",
        "Taylor Swift", "Ariana Grande", "Olivia Rodrigo",
        "Billie Eilish", "Post Malone", "BTS",
        "Drake", "Bad Bunny", "Doja Cat"
    ];
    return artists[Math.floor(Math.random() * artists.length)];
}

function getRandomAlbum() {
    const albums = [
        "After Hours", "Future Nostalgia", "Fine Line",
        "Justice", "Dreamland", "=",
        "Gloria", "Endless Summer Vacation", "SOS",
        "Midnights", "Positions", "SOUR",
        "Happier Than Ever", "Twelve Carat Toothache", "Proof",
        "Certified Lover Boy", "Un Verano Sin Ti", "Planet Her"
    ];
    return albums[Math.floor(Math.random() * albums.length)];
}