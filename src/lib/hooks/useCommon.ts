import { useCallback } from 'react';
import { useFrame } from '~/components/providers/FrameProvider';
import sdk from '@farcaster/miniapp-sdk';
import { z } from 'zod';

// Common time formatting
export const useTimeFormatter = () => {
    const formatRelativeTime = useCallback((timestamp: number): string => {
        const now = Date.now();
        const diff = Math.floor((now - timestamp) / 1000);

        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    }, []);

    const formatDuration = useCallback((ms: number): string => {
        if (!ms) return '0:00';
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, []);

    return { formatRelativeTime, formatDuration };
};

// Common navigation
export const useNavigation = () => {
    const { isMiniApp } = useFrame();

    const navigate = useCallback((url: string, external = false) => {
        if (isMiniApp && !external && typeof sdk?.actions?.openUrl === 'function') {
            sdk.actions.openUrl(url);
        } else {
            window.open(url, external ? '_blank' : '_self');
        }
    }, [isMiniApp]);

    const viewProfile = useCallback((fid: number) => {
        if (isMiniApp && typeof sdk?.actions?.viewProfile === 'function') {
            sdk.actions.viewProfile({ fid });
        } else {
            navigate(`https://warpcast.com/~/profiles/${fid}`, true);
        }
    }, [isMiniApp, navigate]);

    const openSpotify = useCallback((uri?: string, query?: string) => {
        const url = uri ?
            uri.replace('spotify:', 'https://open.spotify.com/') :
            `https://open.spotify.com/search/${encodeURIComponent(query || '')}`;
        navigate(url, true);
    }, [navigate]);

    const composeCast = useCallback((text: string, embeds?: string[]) => {
        if (isMiniApp && typeof sdk?.actions?.composeCast === 'function') {
            // Convert embeds array to the format expected by the SDK
            const formattedEmbeds: [] | [string] | [string, string] | undefined =
                !embeds || embeds.length === 0 ? undefined :
                    embeds.length === 1 ? [embeds[0]] :
                        embeds.length >= 2 ? [embeds[0], embeds[1]] :
                            undefined;

            sdk.actions.composeCast({ text, embeds: formattedEmbeds });
        } else {
            const encodedText = encodeURIComponent(text);
            const embedsParam = embeds ? `&embeds=${encodeURIComponent(embeds.join(','))}` : '';
            navigate(`https://warpcast.com/~/compose?text=${encodedText}${embedsParam}`, true);
        }
    }, [isMiniApp, navigate]);

    return { navigate, viewProfile, openSpotify, composeCast };
};

// Common validation
export const useValidation = () => {
    const validateAndParse = useCallback(<T>(
        schema: z.ZodType<T>,
        data: unknown,
        onError?: (errors: z.ZodError) => void
    ): T | null => {
        try {
            return schema.parse(data);
        } catch (error) {
            if (error instanceof z.ZodError) {
                onError?.(error);
                console.error('Validation error:', error.errors);
            }
            return null;
        }
    }, []);

    const safeValidate = useCallback(<T>(
        schema: z.ZodType<T>,
        data: unknown
    ): { success: true; data: T } | { success: false; error: z.ZodError } => {
        const result = schema.safeParse(data);
        return result.success ?
            { success: true, data: result.data } :
            { success: false, error: result.error };
    }, []);

    return { validateAndParse, safeValidate };
};