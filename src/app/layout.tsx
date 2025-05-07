import type { Metadata } from "next";
import { auth } from "~/auth";
import "~/app/globals.css";
import { Providers } from "~/app/providers";
import Script from "next/script";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_FRAME_NAME || "Proof of Vibes",
  description: process.env.NEXT_PUBLIC_FRAME_DESCRIPTION || "Share your music vibe with friends on Farcaster",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en">
      <head>
        {/* Ensure Farcaster Frame SDK is loaded properly for both Mini App and website */}
        <Script
          src="https://cdn.jsdelivr.net/npm/@farcaster/frame-sdk/dist/index.min.js"
          strategy="beforeInteractive"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}