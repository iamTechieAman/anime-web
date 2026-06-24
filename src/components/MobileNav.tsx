"use client";

import { Search, Menu, Film, Shuffle, Clock } from "lucide-react";
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

    const isWatchPage = pathname?.startsWith('/watch');
    if (isWatchPage) return null;

    const navItems = [
        {
            label: "Movies",
            icon: Film,
            color: "text-blue-500",
            active: pathname === '/' || pathname?.startsWith('//'),
            onClick: () => { closeAll(); router.push('/', { scroll: false }); },
        },

        {
            label: "Random",
            icon: Shuffle,
            color: "text-pink-500",
            active: false,
            onClick: () => {
                closeAll();
                if (typeof window !== "undefined") {
                    window.dispatchEvent(new Event("openRandomizer"));
                }
            },
        },
        {
            label: "History",
            icon: Clock,
            color: "text-accent-warm",
            active: pathname === '/history',
            onClick: () => { closeAll(); router.push('/history', { scroll: false }); },
        },
        {
            label: "Search",
            icon: Search,
            color: "text-accent-warm",
            active: isSearchOpen,
            onClick: toggleSearch,
        },
        {
            label: "Menu",
            icon: Menu,
            color: "text-accent-warm",
            active: isMenuOpen,
            badge: unreadCount > 0 ? unreadCount : undefined,
            onClick: toggleMenu,
        },
    ];

    return (
        <div
            className={`
                fixed bottom-0 left-0 right-0 z-50 
                bg-[var(--bg-overlay)] backdrop-blur-2xl border-t border-border-color
                transition-all duration-[250ms] md:hidden
                ${isScrolledDown ? "translate-y-24 opacity-0 pointer-events-none" : "translate-y-0 opacity-100"}
                shadow-[0_-8px_32px_rgba(0,0,0,0.4)]
            `}
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
            <div className="flex justify-around items-center h-16 px-1">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.label}
                            aria-label={item.label}
                            aria-current={item.active ? "page" : undefined}
                            onClick={(e) => {
                                // Haptic feedback (run asynchronously to avoid blocking UI rendering)
                                if (navigator.vibrate) {
                                    setTimeout(() => {
                                        try { navigator.vibrate(10); } catch (e) {}
                                    }, 0);
                                }
                                item.onClick();
                            }}
                            className={`tap-scale flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-all duration-200 relative ${
                                item.active ? "text-white" : "text-[var(--text-secondary)] hover:text-white"
                            }`}
                        >
                            <div className="relative">
                                <Icon className={`${item.active ? "w-5 h-5 text-accent drop-shadow-[0_0_8px_var(--accent-glow)]" : "w-[18px] h-[18px]"} transition-all duration-200`} />
                                {/* Notification badge */}
                                {'badge' in item && item.badge && (
                                    <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] flex items-center justify-center bg-gradient-to-tr from-accent to-accent-secondary text-white text-[8px] font-black rounded-full px-0.5 shadow-[0_0_8px_var(--accent-glow)]">
                                        {item.badge > 9 ? '9+' : item.badge}
                                    </span>
                                )}
                            </div>
                            <span className={`text-[10px] font-bold tracking-tight ${item.active ? 'opacity-100' : 'opacity-60'}`}>{item.label}</span>
                            {/* Active dot indicator */}
                            {item.active && (
                                <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-gradient-to-tr from-accent to-accent-secondary shadow-[0_0_8px_var(--accent-glow)] animate-pulse" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
