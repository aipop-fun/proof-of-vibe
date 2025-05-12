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
        <div className="flex items-center animate-pulse">
            <div className="w-10 h-10 rounded-full bg-purple-800/50"></div>
            <div className="ml-3 space-y-2">
                <Skeleton height="h-4" width="w-24" />
                <Skeleton height="h-3" width="w-32" />
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