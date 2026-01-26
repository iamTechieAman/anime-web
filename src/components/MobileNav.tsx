"use client";

import { Home, Search, Menu } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMobileUI } from "@/context/MobileUIContext";

export default function MobileNav() {
    const pathname = usePathname();
    const router = useRouter();
    const { isSearchOpen, isMenuOpen, toggleSearch, toggleMenu, closeAll } = useMobileUI();

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

    // Handle Home Click
    const handleHomeClick = () => {
        if (pathname === '/') {
            closeAll();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            closeAll();
            router.push('/');
        }
    };

    // Only show on mobile
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
        return null;
    }

    return (
        <div
            className={`
        fixed bottom-0 left-0 right-0 z-50 
        bg-[var(--bg-overlay)] backdrop-blur-xl border-t border-[var(--border-color)]
        pb-[env(safe-area-inset-bottom)] transition-transform duration-300 md:hidden
        ${isScrolledDown ? "translate-y-full" : "translate-y-0"}
      `}
        >
            <div className="flex justify-around items-center h-16">
                <button
                    onClick={handleHomeClick}
                    className={`flex flex-col items-center gap-1 p-2 ${pathname === '/' && !isSearchOpen && !isMenuOpen ? 'text-purple-600' : 'text-[var(--text-muted)]'}`}
                >
                    <Home className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Home</span>
                </button>

                <button
                    onClick={toggleSearch}
                    className={`flex flex-col items-center gap-1 p-2 ${isSearchOpen ? 'text-purple-600' : 'text-[var(--text-muted)]'}`}
                >
                    <Search className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Search</span>
                </button>

                <button
                    onClick={toggleMenu}
                    className={`flex flex-col items-center gap-1 p-2 ${isMenuOpen ? 'text-purple-600' : 'text-[var(--text-muted)]'}`}
                >
                    <Menu className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Menu</span>
                </button>
            </div>
        </div>
    );
}
