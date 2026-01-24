"use client";

import { Home, Search, Menu } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function MobileNav() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const currentView = searchParams.get('view');

    const [isScrolledDown, setIsScrolledDown] = useState(false);
    const [lastScrollY, setLastScrollY] = useState(0);

    // Hide nav on scroll down, show on scroll up (app-like feel)
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY && currentScrollY > 50) {
                setIsScrolledDown(true);
            } else {
                setIsScrolledDown(false);
            }
            setLastScrollY(currentScrollY);
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [lastScrollY]);

    // Only show on mobile
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
        return null;
    }

    const handleNavigation = (view: string | null) => {
        if (!view) {
            router.push('/');
        } else {
            router.push(`/?view=${view}`);
        }
    };

    return (
        <div
            className={`
        fixed bottom-0 left-0 right-0 z-50 
        bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/5 
        pb-[env(safe-area-inset-bottom)] transition-transform duration-300 md:hidden
        ${isScrolledDown ? "translate-y-full" : "translate-y-0"}
      `}
        >
            <div className="flex justify-around items-center h-16">
                <button
                    onClick={() => handleNavigation(null)}
                    className={`flex flex-col items-center gap-1 p-2 ${pathname === '/' && !currentView ? 'text-purple-500' : 'text-zinc-500'}`}
                >
                    <Home className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Home</span>
                </button>

                <button
                    onClick={() => handleNavigation('search')}
                    className={`flex flex-col items-center gap-1 p-2 ${currentView === 'search' ? 'text-purple-500' : 'text-zinc-500'}`}
                >
                    <Search className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Search</span>
                </button>

                <button
                    onClick={() => handleNavigation('about')}
                    className={`flex flex-col items-center gap-1 p-2 ${currentView === 'about' ? 'text-purple-500' : 'text-zinc-500'}`}
                >
                    <Menu className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Menu</span>
                </button>
            </div>
        </div>
    );
}
