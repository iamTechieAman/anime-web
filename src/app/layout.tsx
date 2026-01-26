import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import MobileNav from "@/components/MobileNav";
import { MobileUIProvider } from "@/context/MobileUIContext";

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
    default: "ToonPlayer - Best AnimeWatch Alternative for Free HD Anime",
    template: "%s | ToonPlayer",
  },
  description: "ToonPlayer is the ultimate AnimeWatch alternative. Stream Naruto, One Piece, and latest anime in HD for free. No ads, high speed, and real-time updates.",
  keywords: ["ToonPlayer", "AnimeWatch", "watch anime free", "HD anime streaming", "ad-free anime", "latest anime episodes", "premium anime player"],
  openGraph: {
    title: "ToonPlayer - Premium Free Anime Streaming",
    description: "The best way to watch anime online for free. Ad-free HD streaming with real-time updates.",
    url: 'https://anime-web-neon-one.vercel.app',
    siteName: 'ToonPlayer',
    images: [{ url: '/icon.png' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ToonPlayer - Watch Anime in HD',
    description: 'The ultimate AnimeWatch alternative for true fans.',
    images: ['/icon.png'],
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
  themeColor: "#050505",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-[100dvh] selection:bg-purple-500/30`}
        suppressHydrationWarning
      >
        <MobileUIProvider>
          {children}
          <MobileNav />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#18181b',
                color: '#fff',
                border: '1px solid rgba(168, 85, 247, 0.2)',
                borderRadius: '12px',
              }
            }}
          />
        </MobileUIProvider>
      </body>
    </html>
  );
}
