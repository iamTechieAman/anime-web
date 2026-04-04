"use client";

import { Search, Menu, Film, Zap, Shuffle, Clock } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMobileUI } from "@/context/MobileUIContext";

export default function MobileNav() {
    const pathname = usePathname();
    const router = useRouter();
    const { isSearchOpen, isMenuOpen, toggleSearch, toggleMenu, closeAll } = useMobileUI();

    const [isScrolledDown, setIsScrolledDown] = useState(false);
    const lastScrollY = useRef(0); // useRef = zero re-renders on scroll
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Hide nav on scroll down, show on scroll up — stable handler via useRef (no dep array re-creation)
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
                setIsScrolledDown(true);
            } else {
                setIsScrolledDown(false);
            }
            lastScrollY.current = currentScrollY;
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []); // Empty deps — handler never re-created

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

    if (!isMounted) return null;

    const navItems = [
        {
            label: "Movies",
            icon: Film,
            color: "text-blue-500",
            active: pathname === '/' || pathname.startsWith('//'),
            onClick: () => { closeAll(); router.push('/'); },
        },
        {
            label: "Anime",
            icon: Zap,
            color: "text-purple-500",
            active: pathname === '/az-list/all' || pathname.startsWith('/az-list/'),
            onClick: () => { closeAll(); router.push('/az-list/all'); },
        },
        {
            label: "Random",
            icon: Shuffle,
            color: "text-pink-500",
            active: pathname === '/randomize',
            onClick: () => { closeAll(); router.push('/randomize'); },
        },
        {
            label: "History",
            icon: Clock,
            color: "text-orange-500",
            active: pathname === '/history',
            onClick: () => { closeAll(); router.push('/history'); },
        },
        {
            label: "Search",
            icon: Search,
            color: "text-purple-500",
            active: isSearchOpen,
            onClick: toggleSearch,
        },
        {
            label: "Menu",
            icon: Menu,
            color: "text-purple-500",
            active: isMenuOpen,
            onClick: toggleMenu,
        },
    ];

    return (
        <div
            className={`
        fixed bottom-0 left-0 right-0 z-50 
        bg-[var(--bg-main)]/90 border-t border-[var(--border-color)]
        pb-[env(safe-area-inset-bottom)] transition-all duration-500 md:hidden
        ${isScrolledDown ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"}
        shadow-[0_-10px_30px_rgba(0,0,0,0.5)]
      `}
        >
            <div className="flex justify-around items-center h-16 px-1">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.label}
                            onClick={item.onClick}
                            className={`tap-scale flex flex-col items-center justify-center gap-1.5 flex-1 py-1 transition-colors duration-150 ${
                                item.active ? item.color : "text-[var(--text-muted)]"
                            }`}
                        >
                            <div className={`relative ${item.active ? 'after:content-[""] after:absolute after:-bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-current after:rounded-full' : ''}`}>
                              <Icon className={`${item.active ? "w-5 h-5" : "w-4 h-4"} transition-all duration-150`} />
                            </div>
                            <span className={`text-[10px] font-bold tracking-tight ${item.active ? 'opacity-100' : 'opacity-60'}`}>{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
