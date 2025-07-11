"use client";

import { useEffect, useState } from 'react';
import sdk from "@farcaster/frame-sdk";
import { Button } from './ui/Button';
import { useFrame } from './providers/FrameProvider';

interface ShareCardProps {
    title: string;
    message: string;
    imageUrl?: string;
    url?: string;
}

export function ShareCard({ title, message,  url }: ShareCardProps) {
    const { isMiniApp } = useFrame();
    const [shareUrl, setShareUrl] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        // Get the URL to share - either the provided URL or the current page URL
        const currentUrl = typeof window !== 'undefined'
            ? url || window.location.href
            : '';
        setShareUrl(currentUrl);
    }, [url]);

    const handleCopyLink = () => {
        if (navigator.clipboard && shareUrl) {
            navigator.clipboard.writeText(shareUrl)
                .then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                })
                .catch(err => {
                    console.error('Failed to copy text: ', err);
                });
        }
    };

    const handleShare = () => {
        if (isMiniApp && typeof sdk?.actions?.composeCast === 'function') {
            // Use the Farcaster SDK to compose a cast
            sdk.actions.composeCast({
                text: message,
                embeds: [shareUrl]
            });
        } else {
            // Fallback for web - open Warpcast compose in a new tab
            const encodedMessage = encodeURIComponent(message);
            const encodedUrl = encodeURIComponent(shareUrl);
            window.open(
                `https://warpcast.com/~/compose?text=${encodedMessage}&embeds=${encodedUrl}`,
                '_blank'
            );
        }
    };

    return (
        <div className="p-4 bg-purple-800/30 rounded-lg mt-4">
            <h3 className="font-medium mb-2">{title}</h3>

            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                <Button
                    onClick={handleShare}
                    className="bg-purple-600 hover:bg-purple-700"
                >
                    Share on Farcaster
                </Button>

                <Button
                    onClick={handleCopyLink}
                    className="bg-transparent border border-purple-600 hover:bg-purple-900/40"
                >
                    {copied ? 'Copied!' : 'Copy Link'}
                </Button>
            </div>
        </div>
    );
}