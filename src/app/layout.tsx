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
        className="font-inter antialiased bg-[#09090B] text-white overflow-x-hidden transition-colors duration-300 selection:bg-violet-500/25"
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
              colorPrimary: '#7C3AED',
              colorBackground: '#111113',
              colorText: '#ffffff',
              colorTextSecondary: '#a1a1aa',
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
