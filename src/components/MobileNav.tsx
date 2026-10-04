"use client";

import { Search, Menu, Film, Tv, Sparkles, MonitorPlay } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useMemo } from "react";
import { useMobileUI } from "@/context/MobileUIContext";
import { useNotifications } from "@/context/NotificationContext";

export default function MobileNav() {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isSearchOpen, isMenuOpen, toggleSearch, toggleMenu, closeAll } = useMobileUI();
    const { unreadCount } = useNotifications();

    const [isScrolledDown, setIsScrolledDown] = useState(false);
    const lastScrollY = useRef(0);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Auto-hide on scroll down, show on scroll up with hysteresis
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY.current && currentScrollY > 90) {
                setIsScrolledDown(true);
            } else if (currentScrollY < lastScrollY.current - 10 || currentScrollY < 40) {
                setIsScrolledDown(false);
            }
            lastScrollY.current = currentScrollY;
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const typeParam = searchParams?.get("type");
    const genreParam = searchParams?.get("genre_id");

    const isHomeActive = pathname === "/" && !typeParam && !genreParam;
    const isAnimeActive = (pathname === "/browse" && typeParam === "anime") || pathname?.startsWith("/anime");
    const isCartoonActive = (pathname === "/browse" && (genreParam === "16" || typeParam === "cartoon")) || pathname?.startsWith("/cartoon");

    if (!isMounted) return null;

    const isWatchPage = pathname?.startsWith("/watch");
    if (isWatchPage) return null;

    const navItems = [
        {
            label: "Home",
            icon: Film,
            active: isHomeActive,
            onClick: () => {
                closeAll();
                router.push("/", { scroll: false });
            },
        },
        {
            label: "Anime",
            icon: Sparkles,
            active: isAnimeActive,
            onClick: () => {
                closeAll();
                router.push("/browse?type=anime", { scroll: false });
            },
        },
        {
            label: "Cartoons",
            icon: MonitorPlay,
            active: isCartoonActive,
            onClick: () => {
                closeAll();
                router.push("/browse?type=tv&genre_id=16", { scroll: false });
            },
        },
        {
            label: "Search",
            icon: Search,
            active: isSearchOpen || pathname === "/search",
            onClick: () => {
                if (pathname === "/search") {
                    closeAll();
                } else {
                    toggleSearch();
                }
            },
        },
        {
            label: "Menu",
            icon: Menu,
            active: isMenuOpen,
            badge: unreadCount > 0 ? unreadCount : undefined,
            onClick: toggleMenu,
        },
    ];

    return (
        <nav
            role="navigation"
            aria-label="Mobile Bottom Navigation"
            className={`
                fixed bottom-0 left-0 right-0 z-50 
                bg-[#0b0c10]/95 backdrop-blur-2xl border-t border-white/[0.08]
                transition-all duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden
                ${isScrolledDown ? "translate-y-24 opacity-0 pointer-events-none" : "translate-y-0 opacity-100"}
                shadow-[0_-12px_40px_rgba(0,0,0,0.7)]
            `}
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
            <div className="flex justify-around items-center h-16 px-1">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.label}
                            type="button"
                            aria-label={item.label}
                            aria-current={item.active ? "page" : undefined}
                            onClick={() => {
                                if (navigator.vibrate) {
                                    try {
                                        navigator.vibrate(8);
                                    } catch {}
                                }
                                item.onClick();
                            }}
                            className={`tap-scale flex flex-col items-center justify-center gap-1 flex-1 py-1.5 transition-all duration-200 relative select-none cursor-pointer ${
                                item.active ? "text-white" : "text-[#8b92a0] hover:text-white"
                            }`}
                        >
                            <div className="relative">
                                <Icon
                                    className={`transition-all duration-200 ${
                                        item.active
                                            ? "w-5 h-5 text-accent drop-shadow-[0_0_10px_var(--accent-glow)] scale-110"
                                            : "w-[19px] h-[19px]"
                                    }`}
                                />
                                {item.badge && item.badge > 0 && (
                                    <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] flex items-center justify-center bg-gradient-to-tr from-accent to-accent-secondary text-white text-[8px] font-black rounded-full px-0.5 shadow-[0_0_8px_var(--accent-glow)]">
                                        {item.badge > 9 ? "9+" : item.badge}
                                    </span>
                                )}
                            </div>
                            <span
                                className={`text-[10px] font-bold tracking-tight transition-all duration-200 ${
                                    item.active ? "opacity-100 text-white font-extrabold" : "opacity-70"
                                }`}
                            >
                                {item.label}
                            </span>
                            {item.active && (
                                <div className="absolute -bottom-1 w-5 h-0.5 rounded-full bg-gradient-to-r from-accent to-accent-warm shadow-[0_0_10px_var(--accent-glow)] animate-pulse" />
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
