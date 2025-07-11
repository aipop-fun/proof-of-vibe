"use client";

import React from 'react';

interface SkeletonProps {
    className?: string;
    height?: string;
    width?: string;
    rounded?: string;
}

/**
 * Generic skeleton loader component for content placeholders
 */
export function Skeleton({
    className = "",
    height = "h-4",
    width = "w-full",
    rounded = "rounded-md"
}: SkeletonProps) {
    return (
        <div
            className={`animate-pulse bg-purple-800/30 ${height} ${width} ${rounded} ${className}`}
        />
    );
}

/**
 * Skeleton for user profile card
 */
export function ProfileSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Profile header skeleton */}
            <div className="bg-purple-800/20 rounded-lg p-6">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-purple-700/30 rounded-full" />
                    <div className="flex-1">
                        <div className="h-6 bg-purple-700/30 rounded w-32 mb-2" />
                        <div className="h-4 bg-purple-700/20 rounded w-24" />
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="text-center">
                        <div className="h-6 bg-purple-700/30 rounded w-12 mb-1" />
                        <div className="h-3 bg-purple-700/20 rounded w-16" />
                    </div>
                    <div className="text-center">
                        <div className="h-6 bg-purple-700/30 rounded w-12 mb-1" />
                        <div className="h-3 bg-purple-700/20 rounded w-16" />
                    </div>
                </div>
            </div>

            {/* Top tracks skeleton */}
            <div className="bg-purple-800/20 rounded-lg p-4">
                <div className="h-5 bg-purple-700/30 rounded w-24 mb-4" />
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="w-8 text-center">
                                <div className="h-4 bg-purple-700/20 rounded w-4" />
                            </div>
                            <div className="w-10 h-10 bg-purple-700/30 rounded" />
                            <div className="flex-1">
                                <div className="h-4 bg-purple-700/30 rounded w-24 mb-1" />
                                <div className="h-3 bg-purple-700/20 rounded w-20" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/**
 * Skeleton for track item
 */
export function TrackSkeleton() {
    return (
        <div className="flex items-center p-3 bg-purple-800/30 rounded-lg animate-pulse">
            <div className="w-10 h-10 bg-purple-800/50 rounded-md"></div>
            <div className="ml-3 flex-grow space-y-2">
                <Skeleton height="h-4" width="w-36" />
                <Skeleton height="h-3" width="w-24" />
            </div>
        </div>
    );
}

/**
 * Skeleton for currently playing section
 */
export function CurrentlyPlayingSkeleton() {
    return (
        <div className="p-4 bg-purple-800/20 rounded-lg animate-pulse">
            <div className="flex justify-between mb-2">
                <Skeleton height="h-5" width="w-32" />
                <Skeleton height="h-5" width="w-20" />
            </div>
            <div className="flex items-start">
                <div className="w-16 h-16 bg-purple-800/50 rounded"></div>
                <div className="ml-3 space-y-2 flex-grow">
                    <Skeleton height="h-5" width="w-full max-w-xs" />
                    <Skeleton height="h-4" width="w-32" />
                    <div className="flex items-center mt-1 space-x-2">
                        <Skeleton height="h-2" width="w-full max-w-xs" />
                        <Skeleton height="h-3" width="w-16" />
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Skeleton for track list
 */
export function TrackListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="space-y-2">
            {Array(count).fill(0).map((_, i) => (
                <TrackSkeleton key={i} />
            ))}
        </div>
    );
}