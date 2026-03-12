import type { Metadata } from "next";
import { Sora, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { Suspense } from "react";
import MobileNav from "@/components/MobileNav";
import MobileModals from "@/components/MobileModals";
import DesktopSidebar from "@/components/DesktopSidebar";
import Header from "@/components/Header";
import { MobileUIProvider } from "@/context/MobileUIContext";
import ProfileGate from "@/components/ProfileGate";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#050505",
};

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${sora.variable} ${inter.variable} font-inter antialiased min-h-[100dvh] bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-300 selection:bg-purple-500/30 overflow-x-hidden flex flex-col`}
        suppressHydrationWarning
      >
        <MobileUIProvider>
          {/* JSON-LD Structured Data for Search Engine Optimization */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebSite",
                "name": "ToonPlayer",
                "alternateName": "AnimeWatch",
                "url": "https://anime-web-neon-one.vercel.app/",
                "potentialAction": {
                  "@type": "SearchAction",
                  "target": "https://anime-web-neon-one.vercel.app/search?query={search_term_string}",
                  "query-input": "required name=search_term_string"
                }
              })
            }}
          />
          <ProfileGate />
          <div className="flex flex-col md:flex-row min-h-screen bg-[var(--bg-main)]">
            <DesktopSidebar />
            <div className="flex-1 flex flex-col">
              <Suspense fallback={<div className="h-16 w-full animate-pulse bg-white/5" />}>
                <Header />
              </Suspense>
              <main className="flex-1">
                <Suspense fallback={
                  <div className="flex items-center justify-center min-h-[50vh]">
                    <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                }>
                  <div className="page-transition-wrapper">
                    {children}
                  </div>
                </Suspense>
              </main>
              <MobileNav />
            </div>
            <MobileModals />
          </div>
          <Toaster position="bottom-center" />
        </MobileUIProvider>
      </body>
    </html>
  );
}
