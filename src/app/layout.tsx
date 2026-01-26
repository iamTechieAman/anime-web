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
    default: "ToonPlayer - Watch Anime Online Free HD",
    template: "%s | ToonPlayer",
  },
  description: "Stream anime in HD on ToonPlayer. No ads, high quality, and fast streaming.",
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
