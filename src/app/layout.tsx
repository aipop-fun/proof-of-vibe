// src/app/layout.tsx (updated with improved meta tags)
import type { Metadata } from "next";
import { auth } from "~/auth";
import "~/app/globals.css";
import { Providers } from "~/app/providers";
import Script from "next/script";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_FRAME_NAME || "Timbra",
  description: process.env.NEXT_PUBLIC_FRAME_DESCRIPTION || "Share your music vibe with friends on Farcaster",
  openGraph: {
    title: process.env.NEXT_PUBLIC_FRAME_NAME || "Timbra",
    description: process.env.NEXT_PUBLIC_FRAME_DESCRIPTION || "Share your music vibe with friends on Farcaster",
    url: process.env.NEXT_PUBLIC_URL,
    siteName: process.env.NEXT_PUBLIC_FRAME_NAME || "Timbra",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: process.env.NEXT_PUBLIC_FRAME_NAME || "Timbra",
    description: process.env.NEXT_PUBLIC_FRAME_DESCRIPTION || "Share your music vibe with friends on Farcaster",
  },
  other: {
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: `${process.env.NEXT_PUBLIC_URL}/opengraph-image`,
      button: {
        title: process.env.NEXT_PUBLIC_FRAME_BUTTON_TEXT || "🎵 Open App",
        action: {
          type: "launch_frame",
          url: process.env.NEXT_PUBLIC_URL,
          name: process.env.NEXT_PUBLIC_FRAME_NAME || "Timbra",
          splashImageUrl: `${process.env.NEXT_PUBLIC_URL}/splash.png`,
          splashBackgroundColor: "#f7f7f7"
        }
      }
    })
  }
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