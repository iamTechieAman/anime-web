import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import MobileNav from "@/components/MobileNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://anime-web-neon-one.vercel.app'),
  title: {
    default: "ToonPlayer - Watch Anime Online Free HD",
    template: "%s | ToonPlayer",
  },
  description: "Stream anime in HD on ToonPlayer. No ads, high quality, and fast streaming. Watch Naruto, One Piece, Attack on Titan, and more for free.",
  keywords: ["anime", "watch anime", "anime streaming", "free anime", "hd anime", "naruto", "one piece", "demon slayer", "online anime"],
  authors: [{ name: "ToonPlayer Team" }],
  creator: "ToonPlayer",
  publisher: "ToonPlayer",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://anime-web-neon-one.vercel.app',
    title: 'ToonPlayer - Watch Anime Online Free HD',
    description: 'Stream your favorite anime in HD for free. No ads, just pure anime.',
    siteName: 'ToonPlayer',
    images: [
      {
        url: '/og-image.jpg', // You should ensure this image exists or use a remote URL
        width: 1200,
        height: 630,
        alt: 'ToonPlayer - Watch Anime Online',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ToonPlayer - Watch Anime Online',
    description: 'Stream anime in HD for free.',
    images: ['/og-image.jpg'], // Same here
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
  themeColor: "#050505",
  verification: {
    google: 'your-google-verification-code', // User needs to provide this or I can leave a placeholder
  },
};

import { MobileUIProvider } from "@/context/MobileUIContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-[100dvh]`}
        suppressHydrationWarning
      >
        <MobileUIProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              // Default options
              duration: 3000,
              style: {
                background: '#18181b',
                color: '#fff',
                border: '1px solid rgba(168, 85, 247, 0.2)',
                borderRadius: '12px',
                padding: '12px 16px',
              },
              // Success
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#a855f7',
                  secondary: '#18181b',
                },
              },
              // Error
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#18181b',
                },
              },
            }}
          />
          <MobileNav />
        </MobileUIProvider>
      </body>
    </html>
  );
}
