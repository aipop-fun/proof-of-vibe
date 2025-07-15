import type { Metadata } from "next";
import { auth } from "~/auth";
import "~/app/globals.css";
import { Providers } from "~/app/providers";


import AdminWrapper from "~/components/admin/AdminWrapper";
import { AuthInitializer } from "~/components/AuthInitializer";

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
    "fc:miniapp": JSON.stringify({
      version: "1", 
      imageUrl: `${process.env.NEXT_PUBLIC_URL}/opengraph-image`,
      button: {
        title: process.env.NEXT_PUBLIC_FRAME_BUTTON_TEXT || "🎵 Open App",
        action: {
          type: "launch_miniapp", 
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
      </head>
      <body className="min-h-screen bg-black text-white">
        <AuthInitializer>
          <Providers session={session}>
            {children}
            <AdminWrapper />
          </Providers>
        </AuthInitializer>
      </body>
    </html>
  );
}