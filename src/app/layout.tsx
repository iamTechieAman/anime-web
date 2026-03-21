import type { Metadata } from "next";
import { Sora, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { MobileUIProvider } from "@/context/MobileUIContext";
import ProfileGate from "@/components/ProfileGate";
import LayoutContent from "@/components/LayoutContent";
import { NotificationProvider } from "@/context/NotificationContext";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

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
  viewportFit: "cover",
  themeColor: "#050505",
};

export const metadata: Metadata = {
  metadataBase: new URL('https://toonplayer.in'),
  title: {
    default: "ToonPlayer - Best AnimeWatch Alternative for Free HD Anime",
    template: "%s | ToonPlayer",
  },
  description: "ToonPlayer is the best AnimeWatch alternative for HD anime streaming. Watch Naruto, One Piece, and the latest anime episodes for free with high speed and zero ads.",
  keywords: ["ToonPlayer", "AnimeWatch", "watch anime free", "HD anime streaming", "ad-free anime", "latest anime episodes", "premium anime player", "toonplayer.in", "free anime HD"],
  openGraph: {
    title: "ToonPlayer - Premium Free Anime Streaming",
    description: "The best way to watch anime online for free. Ad-free HD streaming with real-time updates.",
    url: 'https://toonplayer.in',
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
      <head>
        <link rel="preconnect" href="https://image.tmdb.org" />
        <link rel="preconnect" href="https://api.dicebear.com" />
      </head>
      <body
        className={`${sora.variable} ${inter.variable} font-inter antialiased min-h-[100dvh] bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-300 selection:bg-purple-500/30 overflow-x-hidden flex flex-col`}
        suppressHydrationWarning
      >
        <MobileUIProvider>
          <NotificationProvider>
            {/* JSON-LD Structured Data for Search Engine Optimization */}
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "WebSite",
                  "name": "ToonPlayer",
                  "alternateName": "AnimeWatch",
                  "url": "https://toonplayer.in/",
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": "https://toonplayer.in/search?query={search_term_string}",
                    "query-input": "required name=search_term_string"
                  }
                })
              }}
            />
            <ProfileGate />
            <LayoutContent>
              {children}
            </LayoutContent>
            <Toaster position="bottom-center" />
            <SpeedInsights />
            <Analytics />
          </NotificationProvider>
        </MobileUIProvider>
      </body>
    </html>
  );
}

