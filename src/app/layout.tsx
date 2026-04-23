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
    default: "ToonPlayer - Watch Movies & Anime Online in HD",
    template: "%s | ToonPlayer",
  },
  description: "ToonPlayer is a premium platform to watch movies, anime, and TV shows online in HD. Explore trending content with a fast and smooth experience.",
  keywords: [
    "toonplayer",
    "toon player",
    "watch anime online",
    "free movies streaming",
    "HD movies",
    "anime streaming",
    "watch movies online free",
    "toonplayer online",
    "toonplayer.in",
    "watch tv shows online free",
    "free anime streaming",
    "watch bollywood movies online",
    "watch hollywood movies free",
    "streaming platform",
    "toonplayer movies",
    "toonplayer anime",
    "watch series online",
    "free HD streaming",
    "anime watch free",
  ],
  openGraph: {
    title: "ToonPlayer - Watch Movies & Anime Online in HD",
    description: "ToonPlayer is a premium platform to watch movies, anime, and TV shows online in HD. Explore trending content with a fast and smooth experience.",
    url: 'https://toonplayer.in',
    siteName: 'ToonPlayer',
    images: [{ url: '/icon.png', width: 512, height: 512, alt: 'ToonPlayer (Toon Player) - Watch Movies & Anime Online in HD' }],
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ToonPlayer - Watch Movies & Anime Online in HD',
    description: 'ToonPlayer is a premium platform to watch movies, anime, and TV shows online in HD. Explore trending content with a fast and smooth experience.',
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
             __html: JSON.stringify({
               "@context": "https://schema.org",
               "@graph": [
                 {
                   "@type": "WebSite",
                   "@id": "https://toonplayer.in/#website",
                   "url": "https://toonplayer.in",
                   "name": "ToonPlayer",
                   "alternateName": "Toon Player",
                   "description": "Premium free streaming platform for HD movies and anime.",
                   "potentialAction": {
                     "@type": "SearchAction",
                     "target": "https://toonplayer.in/search?query={search_term_string}",
                     "query-input": "required name=search_term_string"
                   },
                   "inLanguage": "en-US"
                 },
                 {
                   "@type": "Organization",
                   "@id": "https://toonplayer.in/#organization",
                   "name": "ToonPlayer",
                   "alternateName": "Toon Player",
                   "url": "https://toonplayer.in",
                   "logo": {
                     "@type": "ImageObject",
                     "url": "https://toonplayer.in/icon.png",
                     "width": 512,
                     "height": 512
                   },
                   "sameAs": [
                     "https://twitter.com/toonplayer",
                     "https://github.com/iamTechieAman"
                   ]
                 }
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
        className={`${sora.variable} ${inter.variable} font-inter antialiased bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-300 selection:bg-purple-500/30`}
        suppressHydrationWarning
      >

        <AdBlockProvider>
          <MobileUIProvider>
            <NotificationProvider>
              <WatchProvider>
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
