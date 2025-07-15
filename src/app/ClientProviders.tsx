'use client';

import { useEffect, useState } from "react";
import { Session } from "next-auth";
import { Providers } from "~/app/providers";
import { AuthKitProvider } from '@farcaster/auth-kit';
import '@farcaster/auth-kit/styles.css';
import { sdk } from '@farcaster/miniapp-sdk';

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
                
                const miniAppResult = await sdk.isInMiniApp();
                setIsMiniApp(miniAppResult);

                if (miniAppResult) {
                    try {                        
                        const context = await sdk.context;
                        console.log("Successfully connected to Farcaster Mini App context");

                        if (context?.user?.fid) {
                            console.log("User FID:", context.user.fid);
                        }
                    } catch (error) {
                        console.error("Error accessing Mini App context:", error);
                    }
                }
            } catch (error) {
                console.error('Error checking Mini App environment:', error);
                setIsMiniApp(false);
            } finally {
                setIsLoading(false);
            }
        }
        
        checkEnvironment();
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
        domain: typeof window !== 'undefined' ? window.location.host : '',
        siweUri: typeof window !== 'undefined' ? `https://${window.location.host}/login` : '',
        rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://mainnet.optimism.io",
    };

    return (
        <AuthKitProvider config={config}>
            <Providers session={session}>{children}</Providers>
        </AuthKitProvider>
    );
}