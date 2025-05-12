"use client";

import { useState } from 'react';
import { Button } from './ui/Button';
import { useFrame } from './providers/FrameProvider';

export function AddFrameButton() {
    const { added, addFrame } = useFrame();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAddFrame = async () => {
        if (added) return; 

        try {
            setIsLoading(true);
            setError(null);
            await addFrame();
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to add frame');
            console.error('Error adding frame:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            {!added ? (
                <Button
                    onClick={handleAddFrame}
                    disabled={isLoading}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                    {isLoading ? "Adding..." : "Add to Farcaster"}
                </Button>
            ) : (
                <div className="text-green-400 text-sm flex items-center">
                    <span className="mr-1">✓</span> Added to Farcaster
                </div>
            )}

            {error && (
                <p className="text-red-400 text-xs mt-1">{error}</p>
            )}
        </div>
    );
}