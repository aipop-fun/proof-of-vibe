"use client";

import { useEffect, useState } from 'react';
import Head from 'next/head';

interface MetaTagsProps {
    title?: string;
    description?: string;
    imageUrl?: string;
    buttonTitle?: string;
    targetUrl?: string;
}

export function MetaTags({
    title = "Proof of Vibes",
    description = "Share your music taste with friends on Farcaster",
    imageUrl,
    buttonTitle = "Open App",
    targetUrl
}: MetaTagsProps) {
    const [baseUrl, setBaseUrl] = useState('');

    useEffect(() => {
        // Get the base URL from environment or window location
        const url = process.env.NEXT_PUBLIC_URL ||
            (typeof window !== 'undefined' ? window.location.origin : '');
        setBaseUrl(url);
    }, []);

    // Default image URL if not provided
    const defaultImageUrl = `${baseUrl}/opengraph-image`;
    const finalImageUrl = imageUrl || defaultImageUrl;

    // Default target URL is current page
    const finalTargetUrl = targetUrl || (typeof window !== 'undefined' ? window.location.href : baseUrl);

    // Create the frame embed JSON
    const frameEmbed = {
        version: "next",
        imageUrl: finalImageUrl,
        button: {
            title: buttonTitle,
            action: {
                type: "launch_frame",
                url: finalTargetUrl,
                name: "Proof of Vibes"
            }
        }
    };

    return (
        <Head>
            {/* Standard OpenGraph meta tags */}
            <title>{title}</title>
            <meta name="description" content={description} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={finalImageUrl} />
            <meta property="og:type" content="website" />
            <meta property="og:url" content={finalTargetUrl} />

            {/* Twitter Card meta tags */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={finalImageUrl} />

            {/* Farcaster Frame meta tag */}
            <meta name="fc:frame" content={JSON.stringify(frameEmbed)} />
        </Head>
    );
}