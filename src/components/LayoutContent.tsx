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
import { useUserStore, Profile, getAvatarUrl, isDefaultAvatar } from "@/store/userStore";
import OpeningAnimation from "@/components/OpeningAnimation";
import { useUser } from "@clerk/nextjs";


const RandomizerModal = dynamic(() => import("@/components/RandomizerModal"), { ssr: false });
const CommandPalette = dynamic(() => import("@/components/CommandPalette"), { ssr: false });
const LoginModal = dynamic(() => import("@/components/LoginModal"), { ssr: false });
const ProfileEditModal = dynamic(() => import("@/components/ProfileEditModal"), { ssr: false });
const SettingsModal = dynamic(() => import("@/components/SettingsModal"), { ssr: false });

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const { activeProfileId, setActiveProfile, profiles, syncProfile } = useUserStore();
  const [mounted, setMounted] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const { user, isLoaded } = useUser();
  const [synced, setSynced] = useState(false);

  // Reset synced state on user changes (logout/login switch)
  useEffect(() => {
    if (isLoaded && !user && synced) {
      setSynced(false);
    }
  }, [isLoaded, user, synced]);

  // Sync external profiles (Clerk) on login/load
  useEffect(() => {
    if (isLoaded && user && !synced) {
      const clerkProfiles = user.unsafeMetadata?.profiles as Profile[] | undefined;
      const localProfiles = useUserStore.getState().profiles;
      
      let mergedProfiles = [...localProfiles];
      if (clerkProfiles && Array.isArray(clerkProfiles)) {
        clerkProfiles.forEach(cp => {
          const existsIdx = mergedProfiles.findIndex(lp => lp.id === cp.id);
          if (existsIdx >= 0) {
            mergedProfiles[existsIdx] = { ...mergedProfiles[existsIdx], ...cp };
          } else {
            mergedProfiles.push(cp);
          }
        });
      }
      
      const clerkProfileId = `profile-${user.id}`;
      const hasClerkMain = mergedProfiles.some(p => p.id === clerkProfileId);
      if (!hasClerkMain) {
        const clerkName = user.firstName || user.username || "My Profile";
        const clerkAvatar = (user.imageUrl && !isDefaultAvatar(user.imageUrl)) 
          ? user.imageUrl 
          : getAvatarUrl(clerkName, 'red');
        mergedProfiles.unshift({
          id: clerkProfileId,
          name: clerkName,
          avatar: clerkAvatar,
          type: 'adult',
          isKids: false,
          theme: 'red'
        });
      }

      // Sync into local Zustand store
      mergedProfiles.forEach(p => {
        syncProfile(p);
      });

      // Save merged profiles to Clerk metadata if different
      const clerkProfilesStr = JSON.stringify(clerkProfiles || []);
      const mergedProfilesStr = JSON.stringify(mergedProfiles);
      if (clerkProfilesStr !== mergedProfilesStr) {
        user.update({
          unsafeMetadata: {
            ...user.unsafeMetadata,
            profiles: mergedProfiles
          }
        }).catch(err => console.error("Error updating Clerk metadata:", err));
      }
      
      setSynced(true);
    }
  }, [isLoaded, user, synced, syncProfile]);

  // Keep Clerk unsafeMetadata in sync with subsequent Zustand profile changes
  useEffect(() => {
    if (isLoaded && user && synced) {
      const clerkProfiles = user.unsafeMetadata?.profiles as Profile[] | undefined;
      const clerkProfilesStr = JSON.stringify(clerkProfiles || []);
      const localProfilesStr = JSON.stringify(profiles);
      
      if (clerkProfilesStr !== localProfilesStr) {
        const t = setTimeout(() => {
          user.update({
            unsafeMetadata: {
              ...user.unsafeMetadata,
              profiles: profiles
            }
          }).catch(err => console.error("Error syncing profiles to Clerk:", err));
        }, 1000);
        return () => clearTimeout(t);
      }
    }
  }, [profiles, user, isLoaded, synced]);
  
  useEffect(() => {
    setMounted(true);
    const hydrated = useUserStore.persist.hasHydrated();
    setHasHydrated(hydrated);

    // Sync active profile synchronously inside useEffect during mounting
    if (typeof window !== "undefined") {
      let activeId = useUserStore.getState().activeProfileId;
      if (!activeId) {
        try {
          const storeData = window.localStorage.getItem("toonplayer-unified-store");
          if (storeData) {
            const parsed = JSON.parse(storeData);
            if (parsed && parsed.state && parsed.state.activeProfileId) {
              activeId = parsed.state.activeProfileId;
            }
          }
        } catch (e) {}

        if (!activeId) {
          const match = document.cookie.match(/(^|;)\s*toonplayer_active_profile_id\s*=\s*([^;]+)/);
          if (match) {
            activeId = match[2];
          }
        }
      }

      if (activeId) {
        setActiveProfile(activeId);
      }
    }
    
    const unsubHydrate = useUserStore.persist.onHydrate(() => setHasHydrated(false));
    const unsubFinishHydration = useUserStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
      // Active profile remains persistent across refreshes/tab close. No sessionStorage check.
    });
    return () => {
      unsubHydrate();
      unsubFinishHydration();
    };
  }, [setActiveProfile]);

  const { showProfileSettings, setShowProfileSettings } = useMobileUI();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0 });
    }
  }, [pathname]);

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
    const handleProfileGateEvent = () => {
      closeAllModals();
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("toonplayer-explicit-switch", "true");
      }
      setActiveProfile(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("openRandomizer", handleEvent);
    window.addEventListener("openCommandPalette", handlePaletteEvent);
    window.addEventListener("openLoginModal", handleLoginEvent);
    window.addEventListener("openProfileModal", handleProfileEvent);
    window.addEventListener("openSettingsModal", handleSettingsEvent);
    window.addEventListener("openProfileGate", handleProfileGateEvent);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("openRandomizer", handleEvent);
      window.removeEventListener("openCommandPalette", handlePaletteEvent);
      window.removeEventListener("openLoginModal", handleLoginEvent);
      window.removeEventListener("openProfileModal", handleProfileEvent);
      window.removeEventListener("openSettingsModal", handleSettingsEvent);
      window.removeEventListener("openProfileGate", handleProfileGateEvent);
    };
  }, [isRandomizerOpen, isCommandPaletteOpen, isLoginOpen, isProfileOpen, isSettingsOpen, setActiveProfile]);


  
  const showSidebar = !isWatchPage;
  // During SSR/hydration, assume profile gate is active to hide content and prevent flash
  const isProfileGateActive = mounted ? (hasHydrated && !activeProfileId) : true;

  return (
    <div className="min-h-dvh bg-bg-main text-[var(--text-main)] w-full m-0 p-0 relative max-w-full overflow-x-hidden">
      <OpeningAnimation />
      {showSidebar && <DesktopSidebar />}
      
      <Suspense fallback={<div className="h-14 md:h-16 w-full skeleton-shine animate-pulse" />}>
        <Header />
      </Suspense>

      {/* Content area: adaptive padding based on sidebar visibility */}
      <div className={`flex flex-col min-h-dvh relative max-w-full overflow-x-hidden ${
        showSidebar ? "pl-0 md:pl-[80px]" : "pl-0"
      } transition-[padding,opacity] duration-[200ms] ease-out ${isWatchPage ? 'theme-dark watch-page' : ''} ${
        isProfileGateActive ? 'select-none pointer-events-none opacity-0 invisible' : 'opacity-100'
      }`}>

        {/* pt-[60px] = mobile header height, pt-[64px] = desktop header height */}
        <main className={`flex-1 flex flex-col min-w-0 relative ${
          (isWatchPage || isHomePage) ? '' : 'pt-[72px]'
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
      {isProfileGateActive && mounted && <ProfileGate />}
      {isProfileGateActive && !mounted && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-bg-main">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Global Portal Modals */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
      <ProfileEditModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

    </div>
  );
}
