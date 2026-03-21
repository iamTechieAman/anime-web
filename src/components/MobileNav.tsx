"use client";

import { Home, Search, Menu, Film, Calendar, Clock, Tv, Zap, Shuffle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useMobileUI } from "@/context/MobileUIContext";

export default function MobileNav() {
    const pathname = usePathname();
    const router = useRouter();
    const { isSearchOpen, isMenuOpen, toggleSearch, toggleMenu, closeAll } = useMobileUI();

    const [isScrolledDown, setIsScrolledDown] = useState(false);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

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
        bg-[var(--bg-main)]/80 backdrop-blur-md border-t border-[var(--border-color)]
        pb-[env(safe-area-inset-bottom)] transition-all duration-500 md:hidden
        ${isScrolledDown ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"}
        shadow-[0_-10px_30px_rgba(0,0,0,0.5)]
      `}
        >
            <div className="flex justify-around items-center h-16 px-1">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <motion.button
                            key={item.label}
                            whileTap={{ scale: 0.9 }}
                            onClick={item.onClick}
                            className={`flex flex-col items-center justify-center gap-1.5 flex-1 py-1 transition-all duration-300 ${
                                item.active ? item.color : "text-[var(--text-muted)] hover:text-white"
                            }`}
                        >
                            <div className={`relative ${item.active ? 'after:content-[""] after:absolute after:-bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-current after:rounded-full after:shadow-[0_0_8px_currentColor]' : ''}`}>
                              <Icon className={`${item.active ? "w-5 h-5 drop-shadow-[0_0_8px_currentColor]" : "w-4 h-4"} transition-all duration-300`} />
                            </div>
                            <span className={`text-[10px] font-bold tracking-tight transition-opacity ${item.active ? 'opacity-100' : 'opacity-60'}`}>{item.label}</span>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}
