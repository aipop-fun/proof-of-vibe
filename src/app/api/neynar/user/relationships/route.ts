/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getNeynarClient } from '~/lib/neynar';
import { z } from 'zod';

const RelationshipsParamsSchema = z.object({
    sourceFid: z.coerce.number().min(1, 'Source FID is required'),
    targetFids: z.string().min(1, 'Target FIDs are required'),
    includeReverse: z
        .string()
        .optional()
        .transform(val => val === 'true')
});

// Helper function to check if user A follows user B
async function checkFollowingRelationship(client: any, followerFid: number, followingFids: number[]): Promise<Set<number>> {
    try {
        const response = await client.fetchUserFollowing({
            fid: followerFid,
            limit: 200 // Adjust based on your needs
        });

        const followingSet = new Set(response.users?.map((user: any) => user.fid) || []);
        return new Set(followingFids.filter(fid => followingSet.has(fid)));
    } catch (error) {
        console.error('Error checking following relationship:', error);
        return new Set();
    }
}


async function checkMultipleRelationships(
    client: any,
    sourceFid: number,
    targetFids: number[],
    includeReverse: boolean = false
): Promise<any[]> {
    try {
        
        const sourceFollowing = await checkFollowingRelationship(client, sourceFid, targetFids);

        const reverseRelationships = new Map<number, boolean>();

        if (includeReverse) {
        
            const promises = targetFids.map(async (targetFid) => {
                const isFollowingSource = await checkFollowingRelationship(client, targetFid, [sourceFid]);
                return { targetFid, isFollowingSource: isFollowingSource.has(sourceFid) };
            });

            const results = await Promise.allSettled(promises);
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    reverseRelationships.set(result.value.targetFid, result.value.isFollowingSource);
                } else {
                    reverseRelationships.set(targetFids[index], false);
                }
            });
        }

        return targetFids.map(targetFid => ({
            targetFid,
            sourceFollowsTarget: sourceFollowing.has(targetFid),
            targetFollowsSource: includeReverse ? reverseRelationships.get(targetFid) || false : null,
            isMutual: includeReverse ?
                sourceFollowing.has(targetFid) && reverseRelationships.get(targetFid) : null
        }));
    } catch (error) {
        console.error('Error checking multiple relationships:', error);
        return targetFids.map(targetFid => ({
            targetFid,
            sourceFollowsTarget: false,
            targetFollowsSource: includeReverse ? false : null,
            isMutual: includeReverse ? false : null,
            error: 'Failed to check relationship'
        }));
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const parseResult = RelationshipsParamsSchema.safeParse({
            sourceFid: searchParams.get('sourceFid'),
            targetFids: searchParams.get('targetFids'),
            includeReverse: searchParams.get('includeReverse')
        });

        if (!parseResult.success) {
            return NextResponse.json(
                { error: 'Invalid parameters', details: parseResult.error.errors },
                { status: 400 }
            );
        }

        const { sourceFid, targetFids: targetFidsParam, includeReverse } = parseResult.data;

        // Parse target FIDs
        const targetFids = targetFidsParam
            .split(',')
            .map(fid => parseInt(fid.trim()))
            .filter(fid => !isNaN(fid));

        if (targetFids.length === 0) {
            return NextResponse.json(
                { error: 'No valid target FIDs provided' },
                { status: 400 }
            );
        }

        // Limit to prevent abuse
        if (targetFids.length > 50) {
            return NextResponse.json(
                { error: 'Too many target FIDs. Maximum is 50' },
                { status: 400 }
            );
        }

        console.log('Checking relationships:', {
            sourceFid,
            targetFids: targetFids.length,
            includeReverse
        });

        const client = getNeynarClient();

        try {
            const relationships = await checkMultipleRelationships(
                client,
                sourceFid,
                targetFids,
                includeReverse
            );

            // Calculate summary statistics
            const summary = {
                totalChecked: relationships.length,
                sourceFollowsCount: relationships.filter(r => r.sourceFollowsTarget).length,
                mutualCount: includeReverse ?
                    relationships.filter(r => r.isMutual).length : null,
                oneWayFollowingSource: includeReverse ?
                    relationships.filter(r => !r.sourceFollowsTarget && r.targetFollowsSource).length : null
            };

            console.log('Relationships check completed:', {
                sourceFid,
                ...summary
            });

            return NextResponse.json({
                sourceFid,
                relationships,
                summary,
                includeReverse,
                timestamp: new Date().toISOString()
            });

        } catch (neynarError) {
            console.error('Neynar API error for relationships:', neynarError);

            return NextResponse.json(
                {
                    error: 'Failed to check relationships',
                    details: neynarError instanceof Error ? neynarError.message : 'Unknown error',
                    sourceFid,
                    targetFids
                },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Error in relationships API:', error);

        return NextResponse.json(
            {
                error: 'Failed to check relationships',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// POST endpoint for checking specific relationship pairs
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const PostRelationshipsSchema = z.object({
            relationships: z.array(z.object({
                sourceFid: z.number().min(1),
                targetFid: z.number().min(1),
                checkReverse: z.boolean().default(false)
            })).min(1).max(20) // Limit to 20 pairs to prevent abuse
        });

        const parseResult = PostRelationshipsSchema.safeParse(body);

        if (!parseResult.success) {
            return NextResponse.json(
                { error: 'Invalid request body', details: parseResult.error.errors },
                { status: 400 }
            );
        }

        const { relationships: relationshipPairs } = parseResult.data;

        console.log('Checking relationship pairs:', relationshipPairs.length);

        const client = getNeynarClient();
        const results = [];

        for (const pair of relationshipPairs) {
            try {
                const pairResult = await checkMultipleRelationships(
                    client,
                    pair.sourceFid,
                    [pair.targetFid],
                    pair.checkReverse
                );

                results.push({
                    sourceFid: pair.sourceFid,
                    targetFid: pair.targetFid,
                    ...pairResult[0]
                });
            } catch {
                results.push({
                    sourceFid: pair.sourceFid,
                    targetFid: pair.targetFid,
                    sourceFollowsTarget: false,
                    targetFollowsSource: pair.checkReverse ? false : null,
                    isMutual: pair.checkReverse ? false : null,
                    error: 'Failed to check relationship'
                });
            }
        }

        return NextResponse.json({
            results,
            total: results.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in POST relationships API:', error);

        return NextResponse.json(
            {
                error: 'Failed to check relationship pairs',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}