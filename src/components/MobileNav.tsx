"use client";

import { Search, Menu, Film, Zap, Shuffle, Clock } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMobileUI } from "@/context/MobileUIContext";
import { useNotifications } from "@/context/NotificationContext";

export default function MobileNav() {
    const pathname = usePathname();
    const router = useRouter();
    const { isSearchOpen, isMenuOpen, toggleSearch, toggleMenu, closeAll } = useMobileUI();
    const { unreadCount } = useNotifications();

    const [isScrolledDown, setIsScrolledDown] = useState(false);
    const lastScrollY = useRef(0);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Auto-hide on scroll down, show on scroll up
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY.current && currentScrollY > 80) {
                setIsScrolledDown(true);
            } else {
                setIsScrolledDown(false);
            }
            lastScrollY.current = currentScrollY;
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    if (!isMounted) return null;

    const navItems = [
        {
            label: "Movies",
            icon: Film,
            color: "text-blue-500",
            active: pathname === '/' || pathname?.startsWith('//'),
            onClick: () => { closeAll(); router.push('/'); },
        },
        {
            label: "Anime",
            icon: Zap,
            color: "text-purple-500",
            active: pathname === '/az-list/all' || pathname?.startsWith('/az-list/'),
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
            badge: unreadCount > 0 ? unreadCount : undefined,
            onClick: toggleMenu,
        },
    ];

    return (
        <div
            className={`
                fixed bottom-0 left-0 right-0 z-50 
                bg-[var(--bg-main)]/95 border-t border-[var(--border-color)]
                pb-[env(safe-area-inset-bottom)] transition-all duration-300 md:hidden
                ${isScrolledDown ? "translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"}
                shadow-[0_-8px_30px_rgba(0,0,0,0.5)]
            `}
        >
            <div className="flex justify-around items-center h-16 px-1">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.label}
                            onClick={(e) => {
                                // Haptic feedback
                                if (navigator.vibrate) navigator.vibrate(10);
                                item.onClick();
                            }}
                            className={`tap-scale flex flex-col items-center justify-center gap-1 flex-1 py-1.5 transition-colors duration-150 relative ${
                                item.active ? item.color : "text-[var(--text-muted)]"
                            }`}
                        >
                            <div className="relative">
                                <Icon className={`${item.active ? "w-5 h-5" : "w-[18px] h-[18px]"} transition-all duration-200`} />
                                {/* Notification badge */}
                                {'badge' in item && item.badge && (
                                    <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] flex items-center justify-center bg-red-500 text-white text-[8px] font-black rounded-full px-0.5">
                                        {item.badge > 9 ? '9+' : item.badge}
                                    </span>
                                )}
                            </div>
                            <span className={`text-[10px] font-bold tracking-tight ${item.active ? 'opacity-100' : 'opacity-50'}`}>{item.label}</span>
                            {/* Active dot indicator */}
                            {item.active && (
                                <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-current" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
