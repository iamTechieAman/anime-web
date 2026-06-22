"use client";

import { Suspense, useEffect, useState } from "react";
import DesktopSidebar from "@/components/DesktopSidebar";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import MobileModals from "@/components/MobileModals";
import ErrorBoundary from "@/components/ErrorBoundary";
import { usePathname } from "next/navigation";
import { useMobileUI } from "@/context/MobileUIContext";
import Footer from "@/components/Footer";
import { AnimatePresence } from "framer-motion";
import RandomizerFloatingTrigger from "@/components/RandomizerFloatingTrigger";
import dynamic from "next/dynamic";

const ProfileSettings = dynamic(() => import("@/components/ProfileSettings"), { ssr: false });
const RandomizerModal = dynamic(() => import("@/components/RandomizerModal"), { ssr: false });
const CommandPalette = dynamic(() => import("@/components/CommandPalette"), { ssr: false });

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const { showProfileSettings, setShowProfileSettings } = useMobileUI();
  const pathname = usePathname();
  const isWatchPage = pathname?.startsWith('/watch');
  const isHomePage = pathname === '/';
  
  const [deviceMode, setDeviceMode] = useState<"mobile" | "pc" | "tv">("pc");
  const [isRandomizerOpen, setIsRandomizerOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const detectDevice = () => {
      if (typeof window !== "undefined") {
        const ua = navigator.userAgent;
        const width = window.innerWidth;
        const isTVUA = /SmartTV|GoogleTV|AppleTV|Roku|CastTV|Tizen|Web0S|NetCast|Opera TV|Viera|Bravia|PlayStation|Xbox/i.test(ua);
        if (isTVUA || width >= 2500) {
          setDeviceMode("tv");
        } else if (width < 1024) {
          setDeviceMode("mobile");
        } else {
          setDeviceMode("pc");
        }
      }
    };
    detectDevice();
    window.addEventListener("resize", detectDevice);
    return () => window.removeEventListener("resize", detectDevice);
  }, []);

  // Keyboard listeners for Surprise Me and Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === "r") {
        setIsRandomizerOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    const handleEvent = () => setIsRandomizerOpen(true);
    const handlePaletteEvent = () => setIsCommandPaletteOpen(true);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("openRandomizer", handleEvent);
    window.addEventListener("openCommandPalette", handlePaletteEvent);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("openRandomizer", handleEvent);
      window.removeEventListener("openCommandPalette", handlePaletteEvent);
    };
  }, []);

  // Cleanup: showProfileSettings should only be triggered by user action
  useEffect(() => {
    if (showProfileSettings && typeof window !== 'undefined' && !localStorage.getItem("toonplayer_profile")) {
       setShowProfileSettings(false);
     }
  }, []);
  
  const showSidebar = deviceMode === "pc" && !isWatchPage;

  return (
    <div className="min-h-dvh bg-[var(--bg-main)] text-[var(--text-main)] overflow-x-hidden w-full m-0 p-0">
      {showSidebar && <DesktopSidebar />}
      
      <Suspense fallback={<div className="h-14 md:h-16 w-full skeleton-shine animate-pulse" />}>
        <Header />
      </Suspense>

      {/* Content area: adaptive padding based on sidebar visibility */}
      <div className={`flex flex-col min-h-dvh relative ${
        showSidebar ? "pl-0 md:pl-[72px] peer-hover/sidebar:md:pl-[240px]" : "pl-0"
      } transition-[padding] duration-300 ease-in-out ${isWatchPage ? 'theme-dark watch-page' : ''}`}>

        {/* pt-[60px] = mobile header height, pt-[64px] = desktop header height */}
        <main className={`flex-1 flex flex-col min-w-0 relative ${
          (isWatchPage || isHomePage) ? '' : 'pt-14 md:pt-16'
        } isolate overflow-x-clip bg-[#09090B]`}>
          {/* Subtle global ambient glow */}
          <div className="absolute bottom-0 left-0 right-0 h-[20vh] bg-gradient-to-t from-orange-900/[0.04] to-transparent pointer-events-none z-0" />
          <ErrorBoundary>
            <Suspense fallback={
              <div className="flex items-center justify-center min-h-[50vh]">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-[var(--text-muted)] text-xs uppercase tracking-widest font-bold animate-pulse">Loading</p>
                </div>
              </div>
            }>
                {children}
            </Suspense>
          </ErrorBoundary>
        </main>
        <MobileNav />
        <Footer />
      </div>
      <MobileModals />
      <RandomizerFloatingTrigger />
      <AnimatePresence>
        {isRandomizerOpen && (
          <RandomizerModal 
            onClose={() => setIsRandomizerOpen(false)} 
          />
        )}
      </AnimatePresence>
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
      />
      {showProfileSettings && (
        <ProfileSettings 
          isOpen={showProfileSettings} 
          onClose={() => setShowProfileSettings(false)} 
        />
      )}
    </div>
  );
}
