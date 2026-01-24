"use client";

import { Home, Search, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function MobileNav() {
    const pathname = usePathname();
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
        return null; // Don't render on desktop (handled by CSS primarily but this is a backup)
    }

    const navItems = [
        { name: "Home", href: "/", icon: Home },
        { name: "Search", href: "/?search=true", icon: Search },
        // We can add more here like "Library" or "My List" later
        // For now using a trigger for the About/Menu modal which is handled via URL hash or state in parent
        // Since we're in a separate component, let's just stick to navigation links for now.
        // Ideally, "About" triggers the modal. We'll link to #about for now or keep it simple.
    ];

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
                <Link href="/" className={`flex flex-col items-center gap-1 p-2 ${pathname === '/' && !pathname.includes('search') ? 'text-purple-500' : 'text-zinc-500'}`}>
                    <Home className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Home</span>
                </Link>

                {/* Helper to focus search on home page */}
                <button
                    onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        // Dispatch custom event or query param to focus search
                        const searchInput = document.querySelector('input[type="text"]');
                        if (searchInput instanceof HTMLElement) searchInput.focus();
                    }}
                    className="flex flex-col items-center gap-1 p-2 text-zinc-500 hover:text-purple-500"
                >
                    <Search className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Search</span>
                </button>

                <Link href="/about" className="flex flex-col items-center gap-1 p-2 text-zinc-500 hover:text-purple-500">
                    <Menu className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Menu</span>
                </Link>
            </div>
        </div>
    );
}
