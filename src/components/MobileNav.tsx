"use client";

import { Home, Search, Menu, Film, Calendar, Clock } from "lucide-react";
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
            label: "Home",
            icon: Home,
            color: "text-purple-500",
            active: pathname === '/' && !isSearchOpen && !isMenuOpen,
            onClick: handleHomeClick,
        },
        {
            label: "Movies",
            icon: Film,
            color: "text-blue-500",
            active: pathname === '/movies' || pathname.startsWith('/movies/'),
            onClick: () => { closeAll(); router.push('/movies'); },
        },
        {
            label: "Schedule",
            icon: Calendar,
            color: "text-green-500",
            active: pathname === '/schedule',
            onClick: () => { closeAll(); router.push('/schedule'); },
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
        bg-[var(--bg-overlay)] backdrop-blur-xl border-t border-[var(--border-color)]
        pb-[env(safe-area-inset-bottom)] transition-transform duration-300 md:hidden
        ${isScrolledDown ? "translate-y-full" : "translate-y-0"}
      `}
        >
            <div className="flex justify-around items-center h-16 px-1">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <motion.button
                            key={item.label}
                            whileTap={{ scale: 0.85 }}
                            onClick={item.onClick}
                            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors ${
                                item.active ? item.color : "text-[var(--text-muted)]"
                            }`}
                        >
                            <Icon className={`${item.active ? "w-5 h-5" : "w-4 h-4"} transition-all`} />
                            <span className="text-[9px] font-bold">{item.label}</span>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}
