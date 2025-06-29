/* eslint-disable  @typescript-eslint/no-unused-expressions, @typescript-eslint/no-unused-vars, react/display-name */
"use client";

import React, { memo } from 'react';
import { z } from 'zod';
import { SpotifyImage } from '../SpotifyImage';
import { useNavigation, useTimeFormatter } from '~/lib/hooks/useCommon';
import { TrackSchema, TimeRangeSchema } from '~/lib/schemas';

const MusicBasePropsSchema = z.object({
    tracks: z.array(TrackSchema),
    timeRange: TimeRangeSchema.optional(),
    title: z.string(),
    variant: z.enum(['list', 'grid', 'compact']).default('list'),
    showProgress: z.boolean().default(false),
    maxItems: z.number().optional(),
    onTrackClick: z.function().optional(),
    onShare: z.function().optional(),
    className: z.string().optional(),
});

type MusicBaseProps = z.infer<typeof MusicBasePropsSchema>;

export const MusicBase = memo<MusicBaseProps>(({
    tracks,
    timeRange,
    title,
    variant,
    showProgress,
    maxItems,
    onTrackClick,
    onShare,
    className = ''
}) => {
    const { openSpotify, composeCast } = useNavigation();
    const { formatDuration } = useTimeFormatter();

    const displayTracks = maxItems ? tracks.slice(0, maxItems) : tracks;

    const handleTrackClick = (track: z.infer<typeof TrackSchema>) => {
        onTrackClick ? onTrackClick(track) : openSpotify(track.uri, `${track.title} ${track.artist}`);
    };

    const handleShare = () => {
        if (onShare) {
            onShare();
        } else {
            const trackList = displayTracks.slice(0, 5).map((track, i) =>
                `${i + 1}. ${track.title} by ${track.artist}`
            ).join('\n');

            const message = `🎵 ${title}:\n\n${trackList}\n\nCheck out Timbra!`;
            composeCast(message, [process.env.NEXT_PUBLIC_URL || 'https://timbra.app']);
        }
    };

    const renderTrack = (track: z.infer<typeof TrackSchema>, index: number) => {
        const isCompact = variant === 'compact';
        const imageSize = isCompact ? 32 : 48;

        return (
            <div
                key={track.id}
                className="flex items-center gap-3 p-2 rounded hover:bg-purple-700/20 cursor-pointer transition-colors"
                onClick={() => handleTrackClick(track)}
            >
                {!isCompact && (
                    <div className="w-6 text-center text-sm font-medium text-gray-400">
                        {index + 1}
                    </div>
                )}

                <SpotifyImage
                    src={track.coverArt || '/api/placeholder/48/48'}
                    alt={track.album || track.title}
                    width={imageSize}
                    height={imageSize}
                    className="rounded"
                />

                <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${isCompact ? 'text-sm' : ''}`}>
                        {track.title}
                    </p>
                    <p className={`text-gray-400 truncate ${isCompact ? 'text-xs' : 'text-sm'}`}>
                        {track.artist}
                    </p>
                    {!isCompact && track.album && (
                        <p className="text-xs text-gray-500 truncate">{track.album}</p>
                    )}
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-400">
                    {track.popularity && (
                        <span className="bg-purple-700/30 px-2 py-1 rounded-full">
                            {track.popularity}%
                        </span>
                    )}
                    {track.duration && <span>{track.duration}</span>}
                    {track.durationMs && <span>{formatDuration(track.durationMs)}</span>}
                </div>

                {showProgress && track.progressMs && track.durationMs && (
                    <div className="w-16 h-1 bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${(track.progressMs / track.durationMs) * 100}%` }}
                        />
                    </div>
                )}
            </div>
        );
    };

    if (tracks.length === 0) {
        return (
            <div className={`bg-purple-800/20 rounded-lg p-6 text-center ${className}`}>
                <div className="w-12 h-12 bg-purple-700/30 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18V5l12-2v13" />
                        <circle cx="6" cy="18" r="3" />
                        <circle cx="18" cy="16" r="3" />
                    </svg>
                </div>
                <p className="text-gray-400">No tracks available</p>
            </div>
        );
    }

    return (
        <div className={`bg-purple-800/20 rounded-lg p-4 ${className}`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">{title}</h3>
                {onShare && (
                    <button
                        onClick={handleShare}
                        className="text-xs text-purple-400 hover:text-purple-300"
                    >
                        Share
                    </button>
                )}
            </div>

            <div className={`space-y-2 ${variant === 'grid' ? 'grid grid-cols-2 gap-2 space-y-0' : ''}`}>
                {displayTracks.map(renderTrack)}
            </div>

            {maxItems && tracks.length > maxItems && (
                <div className="mt-4 text-center">
                    <p className="text-xs text-gray-400">
                        Showing {maxItems} of {tracks.length} tracks
                    </p>
                </div>
            )}
        </div>
    );
}, (prevProps, nextProps) => {
    return (
        JSON.stringify(prevProps.tracks) === JSON.stringify(nextProps.tracks) &&
        prevProps.timeRange === nextProps.timeRange &&
        prevProps.title === nextProps.title &&
        prevProps.variant === nextProps.variant
    );
});