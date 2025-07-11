import React from 'react';

interface LoadingStateProps {
    loading: boolean;
    error?: string | null;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
    loading,
    error,
    children,
    fallback = <div className="animate-pulse">Loading...</div>
}) => {
    if (loading) return <>{fallback}</>;
    if (error) return <div className="text-red-400">Error: {error}</div>;
    return <>{children}</>;
};