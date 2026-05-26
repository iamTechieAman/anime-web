import type { Metadata } from "next";
import { Sora, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { MobileUIProvider } from "@/context/MobileUIContext";
import ProfileGate from "@/components/ProfileGate"; // Deprecated
import LayoutContent from "@/components/LayoutContent";
import { NotificationProvider } from "@/context/NotificationContext";
import { WatchProvider } from "@/context/WatchContext";
import GlobalErrorListener from "@/components/GlobalErrorListener";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { AdBlockProvider } from "@/context/AdBlockContext";
import { ClerkProvider, Show } from "@clerk/nextjs";
import NetflixAuthGate from "@/components/NetflixAuthGate";


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
    default: "ToonPlayer - Watch Free Anime & Movies",
    template: "%s | ToonPlayer",
  },
  alternates: { canonical: "https://toonplayer.in" },

  description: "Watch free HD movies, TV shows, and anime online. ToonPlayer is the ultimate premium streaming platform for the latest entertainment with zero ads.",
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
    title: "ToonPlayer - Watch Free Anime & Movies",

    description: "Watch free HD movies, TV shows, and anime online. ToonPlayer is the ultimate premium streaming platform for the latest entertainment with zero ads.",
    url: 'https://toonplayer.in',
    siteName: 'ToonPlayer',
    images: [{ url: '/icon.png', width: 512, height: 512, alt: 'ToonPlayer (Toon Player) - Watch Movies & Anime Online in HD' }],
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ToonPlayer - Watch Free Anime & Movies',
    description: 'Watch free HD movies, TV shows, and anime online. ToonPlayer is the ultimate premium streaming platform for the latest entertainment with zero ads.',
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
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#050505" />
        <link rel="apple-touch-icon" href="/logo.webp" />
        
        {/* Google Search Console Verification */}
        <meta name="google-site-verification" content="google555e8d2c84c218f0" />
      </head>
      <body
        className={`${sora.variable} ${inter.variable} font-inter antialiased bg-[#0b0b0f] text-white overflow-x-hidden transition-colors duration-300 selection:bg-orange-500/25`}
        suppressHydrationWarning
      >
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: '#f97316',
              colorBackground: '#0b0b0f',
              colorInputBackground: '#14141b',
              colorInputText: '#ffffff',
              colorText: '#ffffff',
              colorTextSecondary: '#9ca3af',
              colorTextOnPrimaryBackground: '#ffffff',
              colorDanger: '#ef4444',
            },
            elements: {
              card: 'bg-[#0b0b0f] border border-white/10 rounded-2xl shadow-2xl',
              headerTitle: 'text-white font-sora font-black text-xl uppercase tracking-tight',
              headerSubtitle: 'text-zinc-400 font-bold text-xs',
              socialButtonsBlockButton: 'bg-white/5 border border-white/10 text-white hover:bg-white/10 text-xs font-bold transition-all',
              socialButtonsBlockButtonText: 'text-white font-bold',
              formButtonPrimary: 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black uppercase text-xs tracking-wider transition-all',
              footerActionText: 'text-zinc-400 text-xs font-medium',
              footerActionLink: 'text-orange-400 hover:text-orange-300 font-black text-xs',
              formFieldLabel: 'text-zinc-300 font-bold text-xs uppercase tracking-wider',
              formFieldInput: 'bg-[#14141b] border border-white/10 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl px-4 py-2.5',
              identityPreviewText: 'text-white',
              identityPreviewEditButtonIcon: 'text-orange-500',
            }
          }}
          localization={{
            signIn: {
              start: {
                title: "Sign in to ToonPlayer",
                subtitle: "to access premium movies & anime"
              }
            },
            signUp: {
              start: {
                title: "Create ToonPlayer Account",
                subtitle: "to start watching ad-free"
              }
            }
          }}
        >
          <AdBlockProvider>
            <MobileUIProvider>
              <NotificationProvider>
                <WatchProvider>
                  <GlobalErrorListener />

                  <Show when="signed-in">
                    <LayoutContent>
                      {children}
                    </LayoutContent>
                  </Show>
                  <Show when="signed-out">
                    <NetflixAuthGate />
                  </Show>

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
                </WatchProvider>
              </NotificationProvider>
            </MobileUIProvider>
          </AdBlockProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
