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
import ProfileGate from "@/components/ProfileGate";
import { useUserStore } from "@/store/userStore";


const RandomizerModal = dynamic(() => import("@/components/RandomizerModal"), { ssr: false });
const CommandPalette = dynamic(() => import("@/components/CommandPalette"), { ssr: false });
const LoginModal = dynamic(() => import("@/components/LoginModal"), { ssr: false });
const ProfileEditModal = dynamic(() => import("@/components/ProfileEditModal"), { ssr: false });
const SettingsModal = dynamic(() => import("@/components/SettingsModal"), { ssr: false });

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const { activeProfileId } = useUserStore();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const { showProfileSettings, setShowProfileSettings } = useMobileUI();
  const pathname = usePathname();
  const isWatchPage = pathname?.startsWith('/watch');
  const isHomePage = pathname === '/';
  
  const [deviceMode, setDeviceMode] = useState<"mobile" | "pc" | "tv">("pc");
  const [isRandomizerOpen, setIsRandomizerOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

  // Keyboard listeners for Surprise Me and Command Palette + Custom Modal Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target && (
          target.tagName === "INPUT" || 
          target.tagName === "TEXTAREA" || 
          target.isContentEditable ||
          target.closest("input, textarea, [contenteditable]")
        )
      ) {
        return;
      }
      // If any modal is already open, ignore shortcut keys
      if (isRandomizerOpen || isCommandPaletteOpen || isLoginOpen || isProfileOpen || isSettingsOpen) {
        return;
      }
      if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        setIsRandomizerOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };

    const closeAllModals = () => {
      setIsRandomizerOpen(false);
      setIsCommandPaletteOpen(false);
      setIsLoginOpen(false);
      setIsProfileOpen(false);
      setIsSettingsOpen(false);
    };

    const handleEvent = () => {
      closeAllModals();
      setIsRandomizerOpen(true);
    };
    const handlePaletteEvent = () => {
      closeAllModals();
      setIsCommandPaletteOpen(true);
    };
    const handleLoginEvent = () => {
      closeAllModals();
      setIsLoginOpen(true);
    };
    const handleProfileEvent = () => {
      closeAllModals();
      setIsProfileOpen(true);
    };
    const handleSettingsEvent = () => {
      closeAllModals();
      setIsSettingsOpen(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("openRandomizer", handleEvent);
    window.addEventListener("openCommandPalette", handlePaletteEvent);
    window.addEventListener("openLoginModal", handleLoginEvent);
    window.addEventListener("openProfileModal", handleProfileEvent);
    window.addEventListener("openSettingsModal", handleSettingsEvent);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("openRandomizer", handleEvent);
      window.removeEventListener("openCommandPalette", handlePaletteEvent);
      window.removeEventListener("openLoginModal", handleLoginEvent);
      window.removeEventListener("openProfileModal", handleProfileEvent);
      window.removeEventListener("openSettingsModal", handleSettingsEvent);
    };
  }, [isRandomizerOpen, isCommandPaletteOpen, isLoginOpen, isProfileOpen, isSettingsOpen]);


  
  if (!mounted) {
    return <div className="min-h-screen bg-[#141414]" />;
  }

  const showSidebar = !isWatchPage;
  const isProfileGateActive = !activeProfileId;

  return (
    <div className="min-h-dvh bg-bg-main text-[var(--text-main)] w-full m-0 p-0 relative">
      {showSidebar && <DesktopSidebar />}
      
      <Suspense fallback={<div className="h-14 md:h-16 w-full skeleton-shine animate-pulse" />}>
        <Header />
      </Suspense>

      {/* Content area: adaptive padding based on sidebar visibility */}
      <div className={`flex flex-col min-h-dvh relative ${
        showSidebar ? "pl-0 md:pl-[80px]" : "pl-0"
      } transition-[padding,filter,opacity] duration-[250ms] ease-apple-out ${isWatchPage ? 'theme-dark watch-page' : ''} ${
        isProfileGateActive ? 'select-none pointer-events-none filter blur-xl opacity-20' : ''
      }`}>

        {/* pt-[60px] = mobile header height, pt-[64px] = desktop header height */}
        <main className={`flex-1 flex flex-col min-w-0 relative ${
          (isWatchPage || isHomePage) ? '' : 'pt-14 md:pt-16'
        } isolate bg-[var(--bg-main)]`}>
          {/* Subtle global ambient glow */}
          <div className="absolute bottom-0 left-0 right-0 h-[20vh] bg-gradient-to-t from-accent/[0.04] to-transparent pointer-events-none z-0" />
          <ErrorBoundary>
            <Suspense fallback={
              <div className="flex items-center justify-center min-h-[50vh]">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-2 border-accent-warm border-t-transparent rounded-full animate-spin" />
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
      <AnimatePresence mode="wait">
        {isRandomizerOpen && (
          <RandomizerModal 
            key="randomizer-modal"
            onClose={() => setIsRandomizerOpen(false)} 
          />
        )}
      </AnimatePresence>
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
      />
      
      {/* Profile Gate overlay */}
      {isProfileGateActive && <ProfileGate />}

      {/* Global Portal Modals */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
      <ProfileEditModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

    </div>
  );
}
