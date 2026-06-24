import type { Metadata } from "next";
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
import { ClerkProvider } from "@clerk/nextjs";


export const viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,          // allow pinch-zoom for accessibility
  viewportFit: "cover",     // fills notch / Dynamic Island areas
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0f" },
    { media: "(prefers-color-scheme: light)", color: "#0b0b0f" },
  ],
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  metadataBase: new URL('https://toonplayer.in'),
  title: {
    default: "ToonPlayer – Watch Free Anime, Movies & TV Shows Online",
    template: "%s | ToonPlayer",
  },
  alternates: { canonical: "https://toonplayer.in" },

  description: "ToonPlayer is a free HD streaming platform to watch anime, movies, and TV shows online in 1080p. No ads, no subscription. Stream the latest anime episodes, blockbuster movies, and trending TV series on any device.",
  keywords: [
    // Brand
    "toonplayer", "toon player", "toonplayer.in",
    // Core intent
    "watch anime online free", "watch movies online free", "watch TV shows online free",
    "free anime streaming site", "free HD movie streaming", "online streaming platform",
    // Content types
    "anime episodes", "dubbed anime", "subbed anime", "anime movies",
    "Hollywood movies", "Bollywood movies", "Korean drama online",
    "web series online", "OTT platform free",
    // Quality
    "1080p streaming", "HD quality anime", "no ads streaming",
    // Alternatives (discovery)
    "crunchyroll alternative free", "Netflix free alternative",
    "gogoanime alternative", "animixplay alternative",
    // Long-tail
    "watch demon slayer online", "watch one piece online", "watch naruto online",
    "latest anime 2025", "new anime season", "anime recommendation AI",
  ],
  authors: [{ name: "ToonPlayer Team", url: "https://toonplayer.in" }],
  creator: "ToonPlayer",
  publisher: "ToonPlayer",
  openGraph: {
    title: "ToonPlayer – Watch Free Anime, Movies & TV Shows in HD",
    description: "Stream anime, movies, and TV shows for free in HD quality. No ads, no registration required. ToonPlayer — your premium streaming experience.",
    url: 'https://toonplayer.in',
    siteName: 'ToonPlayer',
    images: [
      { url: '/og-image.png', width: 1200, height: 630, alt: 'ToonPlayer – Free HD Anime & Movie Streaming' },
      { url: '/icon.png', width: 512, height: 512, alt: 'ToonPlayer Logo' },
    ],
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ToonPlayer – Watch Free Anime & Movies Online',
    description: 'Free HD streaming for anime, movies, and TV shows. No ads. Stream on any device at ToonPlayer.in',
    images: ['/og-image.png'],
    creator: '@toonplayer',
    site: '@toonplayer',
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



export default async function RootLayout({
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
                   "alternateName": ["Toon Player", "ToonPlayer.in"],
                   "description": "Free HD streaming platform for anime, movies, and TV shows. No ads, no subscription needed.",
                   "potentialAction": {
                     "@type": "SearchAction",
                     "target": {
                       "@type": "EntryPoint",
                       "urlTemplate": "https://toonplayer.in/search?query={search_term_string}"
                     },
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
                   "description": "ToonPlayer is a free streaming platform providing anime, movies, and TV shows in HD quality with no ads.",
                   "sameAs": [
                     "https://twitter.com/toonplayer",
                     "https://github.com/iamTechieAman"
                   ]
                 },
                 {
                   "@type": "WebApplication",
                   "@id": "https://toonplayer.in/#webapp",
                   "name": "ToonPlayer",
                   "url": "https://toonplayer.in",
                   "applicationCategory": "EntertainmentApplication",
                   "operatingSystem": "Web, Android, iOS",
                   "offers": {
                     "@type": "Offer",
                     "price": "0",
                     "priceCurrency": "USD"
                   },
                   "description": "Stream anime, movies, and TV shows for free. Watch on mobile, tablet, and desktop."
                 },
                 {
                   "@type": "FAQPage",
                   "@id": "https://toonplayer.in/#faq",
                   "mainEntity": [
                     {
                       "@type": "Question",
                       "name": "Is ToonPlayer free?",
                       "acceptedAnswer": {
                         "@type": "Answer",
                         "text": "Yes, ToonPlayer is completely free. No subscription or registration required to watch anime, movies, and TV shows."
                       }
                     },
                     {
                       "@type": "Question",
                       "name": "What can I watch on ToonPlayer?",
                       "acceptedAnswer": {
                         "@type": "Answer",
                         "text": "ToonPlayer offers a large catalog of anime series, anime movies, Hollywood films, Bollywood movies, Korean dramas, and international TV shows in HD quality."
                       }
                     },
                     {
                       "@type": "Question",
                       "name": "Does ToonPlayer have ads?",
                       "acceptedAnswer": {
                         "@type": "Answer",
                         "text": "ToonPlayer includes a built-in AdBlock toggle that can eliminate ads for a clean, premium streaming experience."
                       }
                     },
                     {
                       "@type": "Question",
                       "name": "Is ToonPlayer available on mobile?",
                       "acceptedAnswer": {
                         "@type": "Answer",
                         "text": "Yes, ToonPlayer is fully optimized for Android and iOS devices and can be installed as a Progressive Web App (PWA) for an app-like experience."
                       }
                     }
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
        <link rel="preload" href="/avatars/avatar-1.webp" as="image" type="image/webp" />
        <link rel="preload" href="/avatars/avatar-2.webp" as="image" type="image/webp" />
        <link rel="preload" href="/avatars/avatar-3.webp" as="image" type="image/webp" />
        <link rel="preload" href="/avatars/avatar-4.webp" as="image" type="image/webp" />
        <link rel="preload" href="/avatars/avatar-5.webp" as="image" type="image/webp" />
        <link rel="preload" href="/avatars/avatar-6.webp" as="image" type="image/webp" />
        <link rel="preload" href="/avatars/avatar-7.webp" as="image" type="image/webp" />
        <link rel="preload" href="/avatars/avatar-8.webp" as="image" type="image/webp" />
        <link rel="dns-prefetch" href="https://s4.anilist.co" />
        <link rel="dns-prefetch" href="https://graphql.anilist.co" />
        <link rel="dns-prefetch" href="https://vidlink.pro" />
        <link rel="dns-prefetch" href="https://vidsrc.me" />

        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#050505" />
        <link rel="apple-touch-icon" href="/icon.png" />
        
        {/* Google Search Console Verification */}
        <meta name="google-site-verification" content="google555e8d2c84c218f0" />
      </head>
      <body
        className="font-inter antialiased bg-[#09090B] text-white transition-colors duration-[250ms] selection:bg-violet-500/25"
        suppressHydrationWarning
      >
        <ClerkProvider
          appearance={{
            variables: {
              /* Brand */
              colorPrimary: '#f97316',
              /* Card / Modal surface — lifted from pitch-black so elements are visible */
              colorBackground: '#1c1c2a',
              /* Input field background — slightly lighter than card */
              colorInputBackground: '#252535',
              colorInputText: '#f1f5f9',
              /* All text must be white/near-white so it's readable on dark card */
              colorText: '#f1f5f9',
              colorTextSecondary: '#94a3b8',
              colorTextOnPrimaryBackground: '#ffffff',
              colorNeutral: '#f1f5f9',
              colorDanger: '#ef4444',
              colorSuccess: '#10b981',
              fontFamily: 'Inter, sans-serif',
              borderRadius: '16px',
              spacingUnit: '16px',
            },
            elements: {
              /* Modal root card — dark but lighter than page BG */
              card: '!bg-[#111113] !border !border-white/10 !rounded-2xl !shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_0_1px_rgba(124,58,237,0.08)] backdrop-blur-xl',
              /* Header */
              headerTitle: '!text-white !font-black !text-xl !tracking-tight',
              headerSubtitle: '!text-slate-300 !font-medium !text-sm',
              /* Social auth buttons — visible ghost style */
              socialButtonsBlockButton: '!bg-white/8 !border !border-white/10 !text-white hover:!bg-white/15 !text-sm !font-semibold !transition-all !rounded-xl',
              socialButtonsBlockButtonText: '!text-white !font-semibold',
              socialButtonsBlockButtonArrow: '!text-slate-300',
              /* Divider */
              dividerLine: '!bg-white/10',
              dividerText: '!text-slate-400',
              /* Form fields */
              formFieldLabel: '!text-slate-200 !font-semibold !text-xs !uppercase !tracking-wider',
              formFieldInput: '!bg-[#18181B] !border !border-white/10 !text-white !text-sm placeholder:!text-slate-500 focus:!border-violet-500/70 focus:!ring-1 focus:!ring-violet-500/40 !rounded-xl !px-4 !py-3 !transition-all',
              formFieldInputShowPasswordButton: '!text-slate-400 hover:!text-white',
              formFieldHintText: '!text-slate-400 !text-xs',
              formFieldErrorText: '!text-red-400 !text-xs',
              formFieldWarningText: '!text-cyan-400 !text-xs',
              /* Primary CTA button */
              formButtonPrimary: '!bg-gradient-to-r !from-violet-600 !to-cyan-500 hover:!from-violet-500 hover:!to-cyan-400 !text-white !font-bold !text-sm !tracking-wide !transition-all !rounded-xl !py-3 !shadow-lg !shadow-violet-500/25',
              /* Secondary / ghost button */
              formButtonReset: '!text-violet-400 hover:!text-violet-300 !font-semibold !text-sm',
              /* Footer links */
              footerActionText: '!text-slate-400 !text-sm',
              footerActionLink: '!text-violet-400 hover:!text-violet-300 !font-bold !text-sm',
              /* Identity preview (email badge shown before password step) */
              identityPreviewText: '!text-white !font-medium',
              identityPreviewEditButtonIcon: '!text-violet-400',
              identityPreviewEditButton: '!text-violet-400 hover:!text-violet-300',
              /* OTP / verification code input */
              otpCodeFieldInput: '!bg-[#18181B] !border-2 !border-white/10 !text-white !text-xl !font-black focus:!border-violet-500 !rounded-xl !transition-all',
              /* Alert banners */
              alertText: '!text-white !font-medium',
              alert: '!bg-violet-500/10 !border !border-violet-500/20 !rounded-xl',
              /* Avatar */
              avatarBox: '!ring-2 !ring-violet-500/30',
              /* Modal backdrop */
              modalBackdrop: '!backdrop-blur-md !bg-black/70',
              /* Navbar/internal header in Clerk components */
              navbar: '!bg-[#111113] !border-b !border-white/10',
              navbarButton: '!text-slate-300 hover:!text-white',
              navbarButtonActive: '!text-white',
              /* User profile sections */
              profileSectionTitle: '!text-white !font-bold',
              profileSectionContent: '!text-slate-300',
              accordionTriggerButton: '!text-slate-200 hover:!text-white',
              badge: '!bg-violet-500/15 !text-violet-400 !border !border-violet-500/20',
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
                </WatchProvider>
              </NotificationProvider>
            </MobileUIProvider>
          </AdBlockProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
