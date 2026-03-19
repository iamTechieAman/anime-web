"use client";

import { Suspense, useEffect } from "react";
import DesktopSidebar from "@/components/DesktopSidebar";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import MobileModals from "@/components/MobileModals";
import { usePathname } from "next/navigation";
import ProfileSettings from "@/components/ProfileSettings";
import { useMobileUI } from "@/context/MobileUIContext";

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const { showProfileSettings, setShowProfileSettings } = useMobileUI();
  const pathname = usePathname();
  const isWatchPage = pathname?.startsWith('/watch') || pathname?.startsWith('/movies/watch');
  const isHomePage = pathname === '/';
  
  // Cleanup: showProfileSettings should only be triggered by user action
  useEffect(() => {
    // Ensuring it defaults to false on mount if it was somehow true
    if (showProfileSettings && typeof window !== 'undefined' && !localStorage.getItem("toonplayer_profile")) {
       setShowProfileSettings(false);
    }
  }, []);
  
  return (
    <div className="flex flex-col md:grid md:grid-cols-[72px_1fr] min-h-screen bg-[var(--bg-main)] relative overflow-hidden">
      <DesktopSidebar />
      <div className="flex-1 flex flex-col min-w-0 relative min-h-screen overflow-x-hidden scrollbar-none">
        <Suspense fallback={<div className="h-16 w-full animate-pulse bg-white/5" />}>
          <Header />
        </Suspense>
        <main className={`flex-1 flex flex-col min-w-0 relative ${(isWatchPage || isHomePage) ? '' : 'pt-14 md:pt-20'}`}>
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-[50vh]">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          }>
            <div className="page-transition-wrapper flex-auto flex flex-col min-h-full">
              {children}
            </div>
          </Suspense>
        </main>
        <MobileNav />
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
