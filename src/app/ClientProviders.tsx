/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from "react";
import { Session } from "next-auth";
import { Providers } from "~/app/providers";
import { AuthKitProvider } from '@farcaster/auth-kit';
import '@farcaster/auth-kit/styles.css';


declare global {
    interface Window {
        FrameSDK?: any;
    }
}

export function ClientProviders({
    children,
    session
}: {
    children: React.ReactNode;
    session: Session | null;
}) {
    const [isMiniApp, setIsMiniApp] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    
    useEffect(() => {
        async function checkEnvironment() {
            try {
                

                const inIframe = window !== window.parent;
                const url = new URL(window.location.href);
                const hasFrameParam = url.searchParams.has('fc-frame');
                const isWarpcast = url.hostname.includes('warpcast.com');
                const miniAppParam = url.searchParams.get('miniApp') === 'true' ||
                    url.pathname.includes('/miniapp');


                const isMiniAppEnv = inIframe || hasFrameParam || isWarpcast || miniAppParam;

                setIsMiniApp(isMiniAppEnv);


                if (isMiniAppEnv && window.FrameSDK) {
                    try {
                        const sdk = window.FrameSDK;
                        if (sdk && sdk.context) {
                            console.log("Successfully connected to Farcaster Mini App context");

                            // If we need to reference the FID for debugging
                            sdk.context.then((context: any) => {
                                if (context?.user?.fid) {
                                    console.log("User FID:", context.user.fid);
                                }
                            }).catch((error: any) => {
                                console.error("Error getting context:", error);
                            });
                        }
                    } catch (error) {
                        console.error("Error accessing Mini App context:", error);
                        // If we can't access the context, we're probably not in a mini app
                        setIsMiniApp(false);
                    }
                }
            } catch (error) {
                console.error('Error checking Mini App environment:', error);
                setIsMiniApp(false);
            } finally {
                setIsLoading(false);
            }
        }
        
        const timer = setTimeout(checkEnvironment, 500);
        return () => clearTimeout(timer);
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                Loading...
            </div>
        );
    }


    if (isMiniApp) {
        return <Providers session={session}>{children}</Providers>;
    }
    
    const config = {
        domain: window.location.host,
        siweUri: `https://${window.location.host}/login`,
        rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://mainnet.optimism.io",
    };

    return (
        <AuthKitProvider config={config}>
            <Providers session={session}>{children}</Providers>
        </AuthKitProvider>
    );
}