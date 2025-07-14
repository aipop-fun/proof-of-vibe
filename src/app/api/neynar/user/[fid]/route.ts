/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unused-vars */
// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getNeynarClient, normalizeNeynarUser } from '~/lib/neynar';
import { supabase } from '~/lib/supabase';


async function checkFollowingRelationship(client: any, followerFid: number, followingFid: number): Promise<boolean> {
    try {
        const response = await client.fetchUserFollowing({
            fid: followerFid,
            limit: 200 
        });

        return response.users.some((user: any) => user.fid === followingFid);
    } catch (error) {
        console.error('Error checking following relationship:', error);
        return false;
    }
}


async function checkBestFriendsRelationship(client: any, currentUserFid: number, targetFid: number): Promise<{ isFollowing: boolean, isFollower: boolean }> {
    try {        
        const bestFriendsResponse = await client.fetchBestFriends({
            fid: currentUserFid
        });

        const isBestFriend = bestFriendsResponse.users.some((user: any) => user.fid === targetFid);

        
        if (isBestFriend) {
            return { isFollowing: true, isFollower: true };
        }

        
        return await checkMutualRelationship(client, currentUserFid, targetFid);
    } catch (error) {
        console.error('Error checking best friends relationship:', error);        
        return await checkMutualRelationship(client, currentUserFid, targetFid);
    }
}
async function checkMutualRelationship(client: any, currentUserFid: number, targetFid: number): Promise<{ isFollowing: boolean, isFollower: boolean }> {
    try {
        
        const [followingResponse, followerResponse] = await Promise.allSettled([
            client.fetchUserFollowing({
                fid: currentUserFid,
                limit: 200
            }),
            client.fetchUserFollowing({
                fid: targetFid,
                limit: 200
            })
        ]);

        let isFollowing = false;
        let isFollower = false;

        
        if (followingResponse.status === 'fulfilled') {
            isFollowing = followingResponse.value.users.some((user: any) => user.fid === targetFid);
        }

        
        if (followerResponse.status === 'fulfilled') {
            isFollower = followerResponse.value.users.some((user: any) => user.fid === currentUserFid);
        }

        return { isFollowing, isFollower };
    } catch (error) {
        console.error('Error checking mutual relationship:', error);
        return { isFollowing: false, isFollower: false };
    }
}


function getCurrentUserFid(request: NextRequest): number | null {

    const headerFid = request.headers.get('x-current-user-fid');
    if (headerFid) return parseInt(headerFid);


    const queryFid = request.nextUrl.searchParams.get('currentUserFid');
    if (queryFid) return parseInt(queryFid);

    // Option 3: From JWT token or session (implement based on your auth system)
    // const token = request.headers.get('authorization')?.replace('Bearer ', '');
    // if (token) {
    //     const decoded = jwt.verify(token, process.env.JWT_SECRET);
    //     return decoded.fid;
    // }

    // Option 4: From cookie (implement based on your auth system)
    // const sessionCookie = request.cookies.get('session-token');
    // if (sessionCookie) {
    //     const session = await getSessionFromCookie(sessionCookie.value);
    //     return session?.fid;
    // }

    return null;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ fid: string }> }
) {
    try {
        const { fid: fidParam } = await params;
        const fid = parseInt(fidParam);

        if (isNaN(fid)) {
            return NextResponse.json(
                { error: 'Invalid FID parameter' },
                { status: 400 }
            );
        }

        console.log('Fetching user profile for FID:', fid);

        const client = getNeynarClient();
        const currentUserFid = getCurrentUserFid(request);

        try {

            const userResponse = await client.fetchBulkUsers({ fids: [fid] });

            if (!userResponse.users || userResponse.users.length === 0) {
                return NextResponse.json(
                    { error: 'User not found' },
                    { status: 404 }
                );
            }

            const rawUser = userResponse.users[0];
            const normalizedUser = normalizeNeynarUser(rawUser);


            let hasSpotify = false;
            try {
                const { data: spotifyUser } = await supabase
                    .from('user_profiles')
                    .select('spotify_id')
                    .eq('fid', fid)
                    .not('spotify_id', 'is', null)
                    .single();

                hasSpotify = !!spotifyUser;
            } catch (spotifyError) {
                console.log('No Spotify connection found for FID:', fid);
                hasSpotify = false;
            }


            // Check following relationships if current user is available
            let isFollowing = false;
            let isFollower = false;

            if (currentUserFid && currentUserFid !== fid) {
                // Try best friends API first for efficiency, fallback to individual checks
                const relationships = await checkBestFriendsRelationship(client, currentUserFid, fid);
                isFollowing = relationships.isFollowing;
                isFollower = relationships.isFollower;
            }

            const userProfile = {
                fid: normalizedUser.fid,
                username: normalizedUser.username,
                displayName: normalizedUser.display_name || normalizedUser.username,
                pfpUrl: normalizedUser.pfp_url,
                bio: normalizedUser.bio,
                followerCount: normalizedUser.follower_count || 0,
                followingCount: normalizedUser.following_count || 0,
                verifiedAddresses: normalizedUser.verified_addresses || {
                    eth_addresses: [],
                    sol_addresses: []
                },
                hasSpotify,
                lastActive: Date.now() - Math.floor(Math.random() * 86400000), // Mock last active
                isFollowing,
                isFollower,
            };


            const profileData = {
                user: userProfile,
                topTracks: {
                    short_term: [],
                    medium_term: [],
                    long_term: []
                },
                recentTracks: [],
                isLoading: false
            };

            console.log('Successfully fetched user profile:', {
                fid: userProfile.fid,
                username: userProfile.username,
                hasSpotify: userProfile.hasSpotify,
                isFollowing: userProfile.isFollowing,
                isFollower: userProfile.isFollower
            });

            return NextResponse.json(profileData);

        } catch (neynarError) {
            console.error('Neynar API error:', neynarError);


            const minimalProfile = {
                user: {
                    fid,
                    username: `user${fid}`,
                    displayName: `User ${fid}`,
                    pfpUrl: null,
                    bio: '',
                    followerCount: 0,
                    followingCount: 0,
                    verifiedAddresses: {
                        eth_addresses: [],
                        sol_addresses: []
                    },
                    hasSpotify: false,
                    lastActive: Date.now(),
                    isFollowing: false,
                    isFollower: false,
                },
                topTracks: {
                    short_term: [],
                    medium_term: [],
                    long_term: []
                },
                recentTracks: [],
                isLoading: false
            };

            return NextResponse.json(minimalProfile);
        }

    } catch (error) {
        console.error('Error in user profile API:', error);

        return NextResponse.json(
            {
                error: 'Failed to fetch user profile',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}