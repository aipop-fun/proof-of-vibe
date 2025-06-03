"use client";

import React from 'react';
import { SocialUser } from '~/lib/stores/socialFeedStore';

interface ProfileHeaderProps {
    user: SocialUser;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user }) => {
    return (
        <div className="bg-purple-800/20 rounded-lg p-6">
            <div className="flex items-center gap-4 mb-4">
                <img
                    src={user.pfpUrl || '/api/placeholder/64/64'}
                    alt={user.displayName}
                    className="w-16 h-16 rounded-full object-cover"
                    onError={(e) => {
                        e.currentTarget.src = '/api/placeholder/64/64';
                    }}
                />
                <div className="flex-1">
                    <h2 className="text-xl font-bold text-white">{user.displayName}</h2>
                    <p className="text-gray-300">@{user.username}</p>
                    <p className="text-sm text-gray-400">FID: {user.fid}</p>
                </div>
                {user.hasSpotify && (
                    <div className="text-green-500">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.6 0-.359.24-.66.54-.78 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.242 1.021zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                        </svg>
                    </div>
                )}
            </div>

            {/* Stats */}
            {(user.followerCount !== undefined || user.followingCount !== undefined) && (
                <div className="flex gap-6 text-sm">
                    {user.followerCount !== undefined && (
                        <div className="text-center">
                            <div className="font-bold text-white">{user.followerCount.toLocaleString()}</div>
                            <div className="text-gray-400">Followers</div>
                        </div>
                    )}
                    {user.followingCount !== undefined && (
                        <div className="text-center">
                            <div className="font-bold text-white">{user.followingCount.toLocaleString()}</div>
                            <div className="text-gray-400">Following</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

---

    // src/components/profile/TopTracksSection.tsx
    "use client";

import React from 'react';
import { UserTrack, TimeRange } from '~/lib/stores/socialFeedStore';

interface TopTracksSectionProps {
    tracks: UserTrack[];
    timeRange: TimeRange;
    onTrackClick: (track: UserTrack) => void;
}

export const TopTracksSection: React.FC<TopTracksSectionProps> = ({
    tracks,
    timeRange,
    onTrackClick
}) => {
    const getTimeRangeLabel = (range: TimeRange) => {
        switch (range) {
            case 'short_term': return 'This Week';
            case 'medium_term': return 'This Month';
            case 'long_term': return 'All Time';
            default: return 'Top Tracks';
        }
    };

    if (tracks.length === 0) {
        return (
            <div className="bg-purple-800/20 rounded-lg p-6 text-center">
                <div className="w-12 h-12 bg-purple-700/30 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18V5l12-2v13" />
                        <circle cx="6" cy="18" r="3" />
                        <circle cx="18" cy="16" r="3" />
                    </svg>
                </div>
                <h3 className="font-medium mb-1">No tracks yet</h3>
                <p className="text-sm text-gray-400">
                    No top tracks available for {getTimeRangeLabel(timeRange).toLowerCase()}.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-purple-800/20 rounded-lg p-4">
            <h3 className="font-medium mb-4">Top 5 - {getTimeRangeLabel(timeRange)}</h3>
            <div className="space-y-3">
                {tracks.slice(0, 5).map((track, index) => (
                    <div
                        key={track.id}
                        onClick={() => onTrackClick(track)}
                        className="flex items-center gap-3 p-2 rounded hover:bg-purple-700/20 transition-colors cursor-pointer"
                    >
                        {/* Rank */}
                        <div className="w-8 text-center font-medium text-gray-400">
                            {index + 1}
                        </div>

                        {/* Album Art */}
                        <div className="relative">
                            <img
                                src={track.coverArt || '/api/placeholder/40/40'}
                                alt={track.album}
                                className="w-10 h-10 rounded object-cover"
                                onError={(e) => {
                                    e.currentTarget.src = '/api/placeholder/40/40';
                                }}
                            />
                        </div>

                        {/* Track Info */}
                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-white truncate">{track.title}</div>
                            <div className="text-sm text-gray-300 truncate">{track.artist}</div>
                        </div>

                        {/* Popularity or Duration */}
                        {track.popularity !== undefined && (
                            <div className="text-xs text-gray-400 bg-purple-700/30 px-2 py-1 rounded-full">
                                {track.popularity}%
                            </div>
                        )}

                        {/* Spotify Icon */}
                        <div className="text-green-500">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.6 0-.359.24-.66.54-.78 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.242 1.021zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

---

    // src/components/profile/RecentTracksSection.tsx
    "use client";

import React from 'react';
import { UserTrack } from '~/lib/stores/socialFeedStore';
import { formatRelativeTime } from '~/lib/utils';

interface RecentTracksSectionProps {
    tracks: UserTrack[];
    onTrackClick: (track: UserTrack) => void;
}

export const RecentTracksSection: React.FC<RecentTracksSectionProps> = ({
    tracks,
    onTrackClick
}) => {
    if (tracks.length === 0) {
        return null;
    }

    return (
        <div className="bg-purple-800/20 rounded-lg p-4">
            <h3 className="font-medium mb-4">Recent Activity</h3>
            <div className="space-y-3">
                {tracks.slice(0, 5).map((track, index) => (
                    <div
                        key={`${track.id}-${index}`}
                        onClick={() => onTrackClick(track)}
                        className="flex items-center gap-3 p-2 rounded hover:bg-purple-700/20 transition-colors cursor-pointer"
                    >
                        {/* Album Art */}
                        <div className="relative">
                            <img
                                src={track.coverArt || '/api/placeholder/40/40'}
                                alt={track.album}
                                className="w-10 h-10 rounded object-cover"
                                onError={(e) => {
                                    e.currentTarget.src = '/api/placeholder/40/40';
                                }}
                            />
                            {track.isPlaying && (
                                <div className="absolute inset-0 bg-black/20 rounded flex items-center justify-center">
                                    <div className="w-3 h-3 text-white">
                                        <svg fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Track Info */}
                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-white truncate">{track.title}</div>
                            <div className="text-sm text-gray-300 truncate">{track.artist}</div>
                            {track.timestamp && (
                                <div className="text-xs text-gray-400">
                                    {formatRelativeTime(track.timestamp)}
                                    {track.isPlaying && (
                                        <span className="ml-2 text-green-400">• Now playing</span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Spotify Icon */}
                        <div className="text-green-500">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.6 0-.359.24-.66.54-.78 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.242 1.021zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};