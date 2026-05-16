"use client";

import { Suspense, useEffect } from "react";
import DesktopSidebar from "@/components/DesktopSidebar";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import MobileModals from "@/components/MobileModals";
import ErrorBoundary from "@/components/ErrorBoundary";
import { usePathname } from "next/navigation";
import ProfileSettings from "@/components/ProfileSettings";
import { useMobileUI } from "@/context/MobileUIContext";
import Footer from "@/components/Footer";

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const { showProfileSettings, setShowProfileSettings } = useMobileUI();
  const pathname = usePathname();
  const isWatchPage = pathname?.startsWith('/watch');
  const isHomePage = pathname === '/';
  
  // Cleanup: showProfileSettings should only be triggered by user action
  useEffect(() => {
    if (showProfileSettings && typeof window !== 'undefined' && !localStorage.getItem("toonplayer_profile")) {
       setShowProfileSettings(false);
    }
  }, []);
  
  return (
    <div className="min-h-screen bg-[var(--bg-main)] relative overflow-x-hidden">
      <DesktopSidebar />
      <div className="flex flex-col min-h-screen relative md:pl-[72px] overflow-y-visible overflow-x-hidden">




        <Suspense fallback={<div className="h-16 w-full skeleton-shine" />}>
          <Header />
        </Suspense>
        <main className={`flex-1 flex flex-col min-w-0 relative ${(isWatchPage || isHomePage) ? '' : 'pt-14 md:pt-20'} bg-gradient-to-b from-[var(--bg-main)] to-[var(--bg-main)]/90`}>
          {/* Subtle global bottom ambient glow for short pages */}
          <div className="absolute bottom-0 left-0 right-0 h-[30vh] bg-gradient-to-t from-purple-900/5 to-transparent pointer-events-none z-0" />
          <ErrorBoundary>
            <Suspense fallback={
              <div className="flex items-center justify-center min-h-[50vh]">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
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
      {showProfileSettings && (
        <ProfileSettings 
          isOpen={showProfileSettings} 
          onClose={() => setShowProfileSettings(false)} 
        />
      )}
    </div>
  );
}
