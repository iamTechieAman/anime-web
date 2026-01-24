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
  title: "ToonPlayer - Watch Anime Online",
  description: "Stream anime in HD on ToonPlayer. The best place for anime fans.",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
  themeColor: "#050505",
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
