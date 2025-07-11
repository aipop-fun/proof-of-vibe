/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React from 'react';
import { z } from 'zod';

const LoadingStatePropsSchema = z.object({
    variant: z.enum(['track', 'user', 'grid', 'page']).default('track'),
    count: z.number().min(1).max(10).default(3),
    message: z.string().optional(),
    className: z.string().optional(),
});

type LoadingStateProps = z.infer<typeof LoadingStatePropsSchema>;

export const LoadingState: React.FC<LoadingStateProps> = ({
    variant,
    count,
    message,
    className = ''
}) => {
    const renderSkeleton = () => {
        switch (variant) {
            case 'track':
                return Array(count).fill(0).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-purple-800/30 rounded-lg animate-pulse">
                        <div className="w-10 h-10 bg-purple-700/50 rounded"></div>
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-purple-700/50 rounded w-3/4"></div>
                            <div className="h-3 bg-purple-700/30 rounded w-1/2"></div>
                        </div>
                    </div>
                ));

            case 'user':
                return Array(count).fill(0).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 bg-purple-800/30 rounded-lg animate-pulse">
                        <div className="w-12 h-12 bg-purple-700/50 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-purple-700/50 rounded w-24"></div>
                            <div className="h-3 bg-purple-700/30 rounded w-32"></div>
                        </div>
                    </div>
                ));

            case 'grid':
                return Array(count).fill(0).map((_, i) => (
                    <div key={i} className="bg-purple-800/30 p-4 rounded-lg animate-pulse h-24"></div>
                ));

            case 'page':
                return (
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-purple-700/50 rounded w-1/4"></div>
                        <div className="space-y-2">
                            <div className="h-4 bg-purple-700/30 rounded"></div>
                            <div className="h-4 bg-purple-700/30 rounded w-5/6"></div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {message && (
                <div className="text-center text-gray-400 text-sm mb-4">
                    {message}
                </div>
            )}
            {renderSkeleton()}
        </div>
    );
};

// Specific loading components
export const TrackListSkeleton = ({ count = 3 }: { count?: number }) => (
    <LoadingState variant="track" count={count} />
);

export const UserListSkeleton = ({ count = 3 }: { count?: number }) => (
    <LoadingState variant="user" count={count} />
);

export const PageSkeleton = () => (
    <LoadingState variant="page" count={1} />
);