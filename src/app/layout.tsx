import type { Metadata } from "next";
import { Sora, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { MobileUIProvider } from "@/context/MobileUIContext";
import ProfileGate from "@/components/ProfileGate";
import LayoutContent from "@/components/LayoutContent";
import { NotificationProvider } from "@/context/NotificationContext";
import { WatchProvider } from "@/context/WatchContext";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { AdBlockProvider } from "@/context/AdBlockContext";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050505",
};

export const metadata: Metadata = {
  metadataBase: new URL('https://toonplayer.in'),
  title: {
    default: "ToonPlayer — Watch Free HD Movies, Anime & TV Shows Online",
    template: "%s | ToonPlayer",
  },
  description: "ToonPlayer is the #1 free streaming platform for HD movies, anime, and TV shows. Watch Naruto, One Piece, Breaking Bad, and thousands more — ad-free with zero buffering. No sign-up required.",
  keywords: [
    "ToonPlayer",
    "free movies online",
    "watch anime free",
    "HD anime streaming",
    "free TV shows",
    "watch movies online free",
    "anime streaming site",
    "toonplayer.in",
    "free movie streaming",
    "watch series online",
    "Netflix alternative free",
    "ad-free anime",
    "latest anime episodes",
    "premium anime player",
  ],
  openGraph: {
    title: "ToonPlayer — Free HD Movies, Anime & TV Shows Streaming",
    description: "Watch thousands of movies, anime, and TV shows for free in HD quality. No ads, no sign-up, just stream.",
    url: 'https://toonplayer.in',
    siteName: 'ToonPlayer',
    images: [{ url: '/icon.png', width: 512, height: 512, alt: 'ToonPlayer Logo' }],
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ToonPlayer — Watch Free HD Movies & Anime Online',
    description: 'The ultimate free streaming platform for movies, anime, and TV shows. Zero ads, instant playback.',
    images: ['/icon.png'],
    creator: '@toonplayer',
  },
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
  alternates: {
    canonical: 'https://toonplayer.in',
  },
  category: 'entertainment',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* JSON-LD Structured Data for the Website */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
             __html: JSON.stringify({
               "@context": "https://schema.org",
               "@type": "WebSite",
               "name": "ToonPlayer",
               "url": "https://toonplayer.in",
               "potentialAction": {
                 "@type": "SearchAction",
                 "target": "https://toonplayer.in/search?query={search_term_string}",
                 "query-input": "required name=search_term_string"
               }
             })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
             __html: JSON.stringify({
               "@context": "https://schema.org",
               "@type": "Organization",
               "name": "ToonPlayer",
               "url": "https://toonplayer.in",
               "logo": "https://toonplayer.in/icon.png",
               "sameAs": [
                 "https://twitter.com/toonplayer",
                 "https://github.com/iamTechieAman"
               ]
             })
          }}
        />
        {/* DNS Prefetch & Preconnect for critical third-party domains */}
        <link rel="preconnect" href="https://image.tmdb.org" />
        <link rel="preconnect" href="https://api.themoviedb.org" />
        <link rel="preconnect" href="https://api.dicebear.com" />
        <link rel="dns-prefetch" href="https://s4.anilist.co" />
        <link rel="dns-prefetch" href="https://graphql.anilist.co" />
        <link rel="dns-prefetch" href="https://vidlink.pro" />
        <link rel="dns-prefetch" href="https://vidsrc.me" />

        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#050505" />
        <link rel="apple-touch-icon" href="/logo.webp" />
        
        {/* Google Search Console Verification */}
        <meta name="google-site-verification" content="google555e8d2c84c218f0" />
        
        {/* HilltopAds Verification */}
        <meta name="ad3ad63b7ceec379be5a929cd5e988238fbeaf17" content="ad3ad63b7ceec379be5a929cd5e988238fbeaf17" />
      </head>
      <body
        className={`${sora.variable} ${inter.variable} font-inter antialiased bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-300 selection:bg-purple-500/30 overflow-x-hidden`}
        suppressHydrationWarning
      >
        <AdBlockProvider>
          <MobileUIProvider>
            <NotificationProvider>
              <WatchProvider>
                {/* JSON-LD Structured Data for Search Engine Optimization */}
                <script
                  type="application/ld+json"
                  dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                      "@context": "https://schema.org",
                      "@type": "WebSite",
                      "name": "ToonPlayer",
                      "alternateName": ["Toon Player", "ToonPlayer.in"],
                      "url": "https://toonplayer.in/",
                      "description": "ToonPlayer is a free streaming platform for HD movies, anime, and TV shows. Watch thousands of titles instantly with no ads and no sign-up.",
                      "inLanguage": "en",
                      "creator": {
                          "@type": "Person",
                          "name": "Aman Kumar",
                          "jobTitle": "Full-Stack Developer"
                      },
                      "potentialAction": {
                        "@type": "SearchAction",
                        "target": {
                          "@type": "EntryPoint",
                          "urlTemplate": "https://toonplayer.in/search?query={search_term_string}"
                        },
                        "query-input": "required name=search_term_string"
                      }
                    })
                  }}
                />
                {/* Organization Schema */}
                <script
                  type="application/ld+json"
                  dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                      "@context": "https://schema.org",
                      "@type": "Organization",
                      "name": "ToonPlayer",
                      "url": "https://toonplayer.in",
                      "logo": "https://toonplayer.in/icon.png",
                      "sameAs": []
                    })
                  }}
                />
                <ProfileGate />
                <LayoutContent>
                  {children}
                </LayoutContent>
                <Toaster 
                  position="bottom-center" 
                  toastOptions={{
                    style: {
                      background: '#141414',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: 600,
                    },
                  }}
                />
                <SpeedInsights />
                <Analytics />
                
                {/* HilltopAds — Loaded lazily to avoid blocking page render */}
                <Script 
                  src="//poweredbyhilltopads.com/ad3ad63b7ceec379be5a929cd5e988238fbeaf17.js"
                  strategy="lazyOnload"
                />
              </WatchProvider>
            </NotificationProvider>
          </MobileUIProvider>
        </AdBlockProvider>
      </body>
    </html>
  );
}
