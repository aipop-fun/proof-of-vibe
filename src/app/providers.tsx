"use client";

import dynamic from "next/dynamic";
import type { Session } from "next-auth"
import { SessionProvider } from "next-auth/react"
import { FrameProvider } from "~/components/providers/FrameProvider";
import { AppLoader } from "~/components/AppLoader";
import { StoreInitializer } from "~/components/providers/StoreInitializer";

const WagmiProvider = dynamic(
  () => import("~/components/providers/WagmiProvider"),
  {
    ssr: false,
  }
);

export function Providers({ session, children }: { session: Session | null, children: React.ReactNode }) {
  return (
    <SessionProvider session={session}>
      <WagmiProvider>
        <FrameProvider>
          {/* Initialize the unified store */}
          <StoreInitializer>
            <AppLoader>
              {children}
            </AppLoader>
          </StoreInitializer>
        </FrameProvider>
      </WagmiProvider>
    </SessionProvider>
  );
}