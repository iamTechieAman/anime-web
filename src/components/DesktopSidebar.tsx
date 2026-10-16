"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { 
    Home, Compass, LayoutGrid, Sparkles, Clock, 
    TrendingUp, Calendar, Heart, Settings, Github, HelpCircle, Shuffle,
    Pin, PinOff
} from "lucide-react";
import { motion } from "framer-motion";
import { useMobileUI } from "@/context/MobileUIContext";
import Logo from "@/components/Logo";

export default function DesktopSidebar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { setShowProfileSettings } = useMobileUI();
    const [isPinned, setIsPinned] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem("toonplayer_sidebar_pinned");
            if (saved === "true") setIsPinned(true);
        } catch {}
    }, []);

    const togglePin = () => {
        setIsPinned(prev => {
            const next = !prev;
            try {
                localStorage.setItem("toonplayer_sidebar_pinned", String(next));
                window.dispatchEvent(new CustomEvent("sidebarPinnedChange", { detail: next }));
            } catch {}
            return next;
        });
    };

    const sortBy = searchParams?.get("sort_by");
    const genreId = searchParams?.get("genre_id");
    const networkId = searchParams?.get("network_id");
    const year = searchParams?.get("year");
    const letter = searchParams?.get("letter");
    const isTrendingParam = searchParams?.get("trending") === "true" || searchParams?.get("sort") === "trending";

    const isTrendingRoute = pathname === "/browse" && (isTrendingParam || (sortBy === "popularity.desc" && !genreId && !networkId && !year && !letter));
    const isUpcomingRoute = pathname === "/browse" && sortBy === "primary_release_date.desc";

    const sections = [
        { name: "Home", href: "/", icon: Home, tooltip: "Go to Home" },
        { name: "Browse", href: "/browse", icon: Compass, tooltip: "Explore Catalog" },
        { name: "Genres", href: "/genres", icon: LayoutGrid, tooltip: "View Genres" },
        { name: "AI Discovery", href: "/discover", icon: Sparkles, tooltip: "AI recommendations", isAI: true },
        { name: "History", href: "/history", icon: Clock, tooltip: "Watch History" },
        { name: "Trending", href: "/browse?sort_by=popularity.desc", icon: TrendingUp, tooltip: "Trending Now" },
        { name: "Upcoming", href: "/browse?sort_by=primary_release_date.desc", icon: Calendar, tooltip: "Upcoming Releases" },
        { name: "Favorites", href: "/watchlist", icon: Heart, tooltip: "My Watchlist" },
        { 
            name: "Surprise Me", 
            icon: Shuffle, 
            tooltip: "Feeling Lucky?", 
            onClick: () => {
                if (typeof window !== "undefined") window.dispatchEvent(new Event("openRandomizer"));
            }
        },
    ];

    const isItemActive = (item: typeof sections[0]) => {
        if (!item.href) return false;
        if (item.name === "Home") return pathname === "/";
        if (item.name === "Trending") return isTrendingRoute;
        if (item.name === "Upcoming") return isUpcomingRoute;
        if (item.name === "Browse") return pathname === "/browse" && !isTrendingRoute && !isUpcomingRoute;
        return pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
    };

    return (
        <div className={`peer/sidebar group fixed left-0 top-0 bottom-0 ${isPinned ? 'w-[260px]' : 'w-[72px]'} hidden md:block z-[60] hide-scrollbar transition-all duration-[250ms]`}>
            <aside className={`absolute left-0 top-0 bottom-0 w-[260px] ${
                isPinned 
                    ? '[clip-path:inset(0_0_0_0)]' 
                    : '[clip-path:inset(0_188px_0_0)] group-hover:[clip-path:inset(0_0_0_0)] group-focus-within:[clip-path:inset(0_0_0_0)]'
            } transition-all duration-[250ms] ease-apple bg-[#0c0d12]/95 backdrop-blur-[24px] border-r border-white/[0.06] flex flex-col py-5 shadow-2xl hide-scrollbar`}>
                {/* Branded Logo & Pin Toggle */}
                <div className="mb-6 shrink-0 flex items-center justify-between h-11 w-full px-3.5 transition-all duration-[250ms] relative hide-scrollbar">
                    <Link scroll={false} href="/" className="flex items-center gap-3 active:scale-95 transition-all shrink-0" aria-label="ToonPlayer Home">
                        <div className="w-10 h-10 flex items-center justify-center shrink-0 relative hide-scrollbar" style={{ filter: "drop-shadow(0 0 10px rgba(229,9,20,0.5))" }}>
                            <Logo />
                        </div>
                        <span className={`text-sm font-black tracking-tight text-white uppercase ${isPinned ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'} transition-opacity duration-[250ms] whitespace-nowrap bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent`}>
                            Toon<span className="text-accent">Player</span>
                        </span>
                    </Link>

                    {/* Pin/Unpin Toggle Button */}
                    <button
                        onClick={togglePin}
                        title={isPinned ? "Unpin sidebar" : "Pin sidebar open"}
                        aria-label={isPinned ? "Unpin sidebar" : "Pin sidebar open"}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 transition-all cursor-pointer ${isPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    >
                        {isPinned ? <PinOff className="w-3.5 h-3.5 text-accent" /> : <Pin className="w-3.5 h-3.5" />}
                    </button>
                </div>

            {/* Navigation Sections */}
            <div className="flex-1 flex flex-col gap-1 px-3 hide-scrollbar">
                {sections.map((item) => {
                    const isActive = isItemActive(item);
                    const Icon = item.icon;
                    const isAI = (item as any).isAI;
                    const cssClass = `relative flex items-center h-10 px-0 group-hover:px-2.5 rounded-xl transition-all duration-200 group/item w-full text-left cursor-pointer hide-scrollbar outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                        isActive 
                            ? "bg-white/[0.06] text-white" 
                            : "text-zinc-400 hover:text-white hover:bg-white/[0.03]"
                    }`;

                    const content = (
                        <>
                            {/* Active glow indicator */}
                            {isActive && (
                                <motion.div 
                                    layoutId="activeGlow"
                                    className="absolute left-0 w-[3px] h-6 bg-gradient-to-b from-accent to-accent-warm rounded-r-full shadow-[var(--shadow-glow-primary)]"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}

                            {/* Icon Wrapper */}
                            <div className="flex items-center justify-center shrink-0 w-11 h-10">
                                <Icon 
                                    className={`w-[18px] h-[18px] transition-all duration-[250ms] ${
                                        isActive 
                                            ? "text-accent drop-shadow-[0_0_8px_var(--accent-glow)] scale-110" 
                                            : isAI
                                            ? "text-pink-400 drop-shadow-[0_0_6px_rgba(236,72,153,0.35)] group-hover/item:scale-115 group-hover/item:text-pink-300"
                                            : "group-hover/item:scale-115 group-hover/item:text-white"
                                    }`}
                                    strokeWidth={2.2}
                                />
                            </div>

                            {/* Label */}
                            <span className={`ml-2 text-xs font-semibold tracking-wide whitespace-nowrap ${isPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-[250ms] ${isAI ? 'text-pink-200' : ''}`}>
                                {item.name}
                            </span>

                            {/* Tooltip (Strictly hidden when sidebar expands) */}
                            <div className="absolute left-[74px] px-3 py-1.5 bg-[#12141D] border border-white/10 rounded-lg text-white text-[11px] font-bold tracking-wide whitespace-nowrap opacity-0 pointer-events-none transition-all duration-150 translate-x-1 group-hover/item:opacity-100 group-hover/item:translate-x-2 group-hover:!opacity-0 group-hover:!pointer-events-none z-50 shadow-2xl">
                                {item.tooltip}
                            </div>
                        </>
                    );

                    return item.href ? (
                        <Link scroll={false} key={item.name} href={item.href} aria-label={item.name} className={cssClass}>
                            {content}
                        </Link>
                    ) : (
                        <button key={item.name} onClick={item.onClick} aria-label={item.name} className={cssClass}>
                            {content}
                        </button>
                    );
                })}
            </div>

            {/* Divider */}
            <div className="h-px bg-white/5 my-3 mx-3" />

            {/* Bottom Section */}
            <div className="flex flex-col gap-1 px-3 shrink-0 hide-scrollbar">
                {/* Settings Toggle */}
                <Link
                    href="/settings"
                    scroll={false}
                    aria-label="Settings"
                    className="relative flex items-center h-10 px-0 group-hover:px-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.03] transition-all duration-200 group/item w-full text-left hide-scrollbar outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                    <div className="flex items-center justify-center shrink-0 w-11 h-10">
                        <Settings 
                            className="w-[18px] h-[18px] transition-all duration-[250ms] group-hover/item:scale-115 group-hover/item:text-white" 
                            strokeWidth={2.2}
                        />
                    </div>
                    <span className={`ml-2 text-xs font-semibold tracking-wide whitespace-nowrap ${isPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-[250ms]`}>
                        Settings
                    </span>
                    <div className="absolute left-[74px] px-3 py-1.5 bg-[#12141D] border border-white/10 rounded-lg text-white text-[11px] font-bold tracking-wide whitespace-nowrap opacity-0 pointer-events-none transition-all duration-150 translate-x-1 group-hover/item:opacity-100 group-hover/item:translate-x-2 group-hover:!opacity-0 group-hover:!pointer-events-none z-50 shadow-2xl">
                        Settings
                    </div>
                </Link>

                {/* Support Link */}
                <Link
                    href="/contact"
                    scroll={false}
                    aria-label="Contact Support"
                    className="relative flex items-center h-10 px-0 group-hover:px-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.03] transition-all duration-200 group/item hide-scrollbar outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                    <div className="flex items-center justify-center shrink-0 w-11 h-10">
                        <HelpCircle 
                            className="w-[18px] h-[18px] transition-all duration-[250ms] group-hover/item:scale-115 group-hover/item:text-white" 
                            strokeWidth={2.2}
                        />
                    </div>
                    <span className={`ml-2 text-xs font-semibold tracking-wide whitespace-nowrap ${isPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-[250ms]`}>
                        Support
                    </span>
                    <div className="absolute left-[74px] px-3 py-1.5 bg-[#12141D] border border-white/10 rounded-lg text-white text-[11px] font-bold tracking-wide whitespace-nowrap opacity-0 pointer-events-none transition-all duration-150 translate-x-1 group-hover/item:opacity-100 group-hover/item:translate-x-2 group-hover:!opacity-0 group-hover:!pointer-events-none z-50 shadow-2xl">
                        Contact Support
                    </div>
                </Link>

                {/* Github Link */}
                <a
                    href="https://github.com/iamTechieAman/anime-web"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="GitHub Repository"
                    className="relative flex items-center h-10 px-0 group-hover:px-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.03] transition-all duration-200 group/item hide-scrollbar outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                    <div className="flex items-center justify-center shrink-0 w-11 h-10">
                        <Github 
                            className="w-[18px] h-[18px] transition-all duration-[250ms] group-hover/item:scale-115 group-hover/item:text-white" 
                            strokeWidth={2.2}
                        />
                    </div>
                    <span className={`ml-2 text-xs font-semibold tracking-wide whitespace-nowrap ${isPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-[250ms]`}>
                        GitHub
                    </span>
                    <div className="absolute left-[74px] px-3 py-1.5 bg-[#12141D] border border-white/10 rounded-lg text-white text-[11px] font-bold tracking-wide whitespace-nowrap opacity-0 pointer-events-none transition-all duration-150 translate-x-1 group-hover/item:opacity-100 group-hover/item:translate-x-2 group-hover:!opacity-0 group-hover:!pointer-events-none z-50 shadow-2xl">
                        GitHub Repository
                    </div>
                </a>
            </div>

            {/* Version Badge */}
            <div className="mt-4 px-4 py-2 pointer-events-none shrink-0 flex items-center justify-start h-7 overflow-hidden hide-scrollbar">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest transition-opacity duration-[250ms]">
                    <span className={isPinned ? 'hidden' : 'group-hover:hidden'}>V5.0</span>
                    <span className={isPinned ? 'inline' : 'hidden group-hover:inline'}>ToonPlayer V5.0</span>
                </span>
            </div>
        </aside>
        </div>
    );
}
