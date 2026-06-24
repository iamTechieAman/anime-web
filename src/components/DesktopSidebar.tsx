"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
    Home, Compass, LayoutGrid, Sparkles, Clock, 
    TrendingUp, Calendar, Heart, Settings, Github, HelpCircle, Shuffle
} from "lucide-react";
import { motion } from "framer-motion";
import { useMobileUI } from "@/context/MobileUIContext";
import Logo from "@/components/Logo";

export default function DesktopSidebar() {
    const pathname = usePathname();
    const { setShowProfileSettings } = useMobileUI();

    const sections = [
        { name: "Home", href: "/", icon: Home, tooltip: "Go to Home" },
        { name: "Browse", href: "/browse", icon: Compass, tooltip: "Explore Catalog" },
        { name: "Genres", href: "/genres", icon: LayoutGrid, tooltip: "View Genres" },
        { name: "AI Discovery", href: "/discover", icon: Sparkles, tooltip: "AI recommendations" },
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

    return (
        <div className="peer/sidebar group fixed left-0 top-0 bottom-0 w-[80px] hidden md:block z-[60] hide-scrollbar">
            <aside className="absolute left-0 top-0 bottom-0 w-[280px] [clip-path:inset(0_200px_0_0)] group-hover:[clip-path:inset(0_0_0_0)] transition-all duration-[250ms] ease-apple bg-white/[0.03] backdrop-blur-[20px] border-r border-white/[0.05] flex flex-col py-6 shadow-2xl hide-scrollbar">
                {/* Branded Logo */}
                <div className="mb-8 shrink-0 flex items-center h-10 w-full px-3 transition-all duration-[250ms] relative hide-scrollbar">
                    <Link scroll={false} href="/" className="flex items-center gap-3 active:scale-95 transition-all shrink-0">
                        <div className="w-11 h-11 flex items-center justify-center shrink-0 relative hide-scrollbar">
                            <Logo />
                        </div>
                        <span className="text-sm font-black tracking-tight text-white uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-[250ms] whitespace-nowrap bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent pointer-events-none group-hover:pointer-events-auto">
                            Toon<span className="text-accent">Player</span>
                        </span>
                    </Link>
                </div>

            {/* Navigation Sections */}
            <div className="flex-1 flex flex-col gap-1.5 px-3 hide-scrollbar">
                {sections.map((item) => {
                    const isActive = item.href ? (pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href))) : false;
                    const Icon = item.icon;
                    const cssClass = `relative flex items-center h-11 px-3 rounded-xl transition-all duration-200 group/item w-full text-left cursor-pointer hide-scrollbar ${
                        isActive 
                            ? "bg-white/[0.04] text-white" 
                            : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"
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
                            <div className="flex items-center justify-center shrink-0 w-12 h-11">
                                <Icon 
                                    className={`w-[18px] h-[18px] transition-all duration-[250ms] ${
                                        isActive 
                                            ? "text-accent drop-shadow-[0_0_8px_var(--accent-glow)] scale-110" 
                                            : "group-hover/item:scale-115 group-hover/item:text-white"
                                    }`}
                                    strokeWidth={2.2}
                                />
                            </div>

                            {/* Label */}
                            <span className="ml-2 text-xs font-semibold tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-[250ms]">
                                {item.name}
                            </span>

                            {/* Tooltip (Only visible when sidebar is collapsed) */}
                            <div className="absolute left-[80px] px-3 py-1.5 bg-[#12131A] border border-white/10 rounded-lg text-white text-[10px] font-black tracking-wider uppercase whitespace-nowrap opacity-0 pointer-events-none transition-all duration-200 translate-x-1 group-hover/item:hover:opacity-0 group-hover/item:translate-x-2 group-hover:group-hover/item:opacity-0 group-hover:group-hover/item:translate-x-1 lg:group-hover/item:opacity-100 z-50 shadow-2xl">
                                {item.tooltip}
                            </div>
                        </>
                    );

                    return item.href ? (
                        <Link scroll={false} key={item.name} href={item.href} className={cssClass}>
                            {content}
                        </Link>
                    ) : (
                        <button key={item.name} onClick={item.onClick} className={cssClass}>
                            {content}
                        </button>
                    );
                })}
            </div>

            {/* Divider */}
            <div className="h-px bg-white/5 my-4 mx-3" />

            {/* Bottom Section */}
            <div className="flex flex-col gap-1.5 px-3 shrink-0 hide-scrollbar">
                {/* Settings Toggle */}
                <Link
                    href="/settings"
                    scroll={false}
                    className="relative flex items-center h-11 px-3 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all duration-200 group/item w-full text-left hide-scrollbar"
                >
                    <div className="flex items-center justify-center shrink-0 w-12 h-11">
                        <Settings 
                            className="w-[18px] h-[18px] transition-all duration-[250ms] group-hover/item:scale-115 group-hover/item:text-white" 
                            strokeWidth={2.2}
                        />
                    </div>
                    <span className="ml-2 text-xs font-semibold tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-[250ms]">
                        Settings
                    </span>
                    <div className="absolute left-[80px] px-3 py-1.5 bg-[#12131A] border border-white/10 rounded-lg text-white text-[10px] font-black tracking-wider uppercase whitespace-nowrap opacity-0 pointer-events-none transition-all duration-200 translate-x-1 group-hover/item:opacity-100 group-hover/item:translate-x-2 group-hover:group-hover/item:opacity-0 z-50 shadow-2xl">
                        Settings
                    </div>
                </Link>

                {/* Support Link */}
                <Link
                    href="/contact"
                    scroll={false}
                    className="relative flex items-center h-11 px-3 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all duration-200 group/item hide-scrollbar"
                >
                    <div className="flex items-center justify-center shrink-0 w-12 h-11">
                        <HelpCircle 
                            className="w-[18px] h-[18px] transition-all duration-[250ms] group-hover/item:scale-115 group-hover/item:text-white" 
                            strokeWidth={2.2}
                        />
                    </div>
                    <span className="ml-2 text-xs font-semibold tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-[250ms]">
                        Support
                    </span>
                    <div className="absolute left-[80px] px-3 py-1.5 bg-[#12131A] border border-white/10 rounded-lg text-white text-[10px] font-black tracking-wider uppercase whitespace-nowrap opacity-0 pointer-events-none transition-all duration-200 translate-x-1 group-hover/item:opacity-100 group-hover/item:translate-x-2 group-hover:group-hover/item:opacity-0 z-50 shadow-2xl">
                        Contact Support
                    </div>
                </Link>

                {/* Github Link */}
                <a
                    href="https://github.com/iamTechieAman/anime-web"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative flex items-center h-11 px-3 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all duration-200 group/item hide-scrollbar"
                >
                    <div className="flex items-center justify-center shrink-0 w-12 h-11">
                        <Github 
                            className="w-[18px] h-[18px] transition-all duration-[250ms] group-hover/item:scale-115 group-hover/item:text-white" 
                            strokeWidth={2.2}
                        />
                    </div>
                    <span className="ml-2 text-xs font-semibold tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-[250ms]">
                        GitHub
                    </span>
                    <div className="absolute left-[80px] px-3 py-1.5 bg-[#12131A] border border-white/10 rounded-lg text-white text-[10px] font-black tracking-wider uppercase whitespace-nowrap opacity-0 pointer-events-none transition-all duration-200 translate-x-1 group-hover/item:opacity-100 group-hover/item:translate-x-2 group-hover:group-hover/item:opacity-0 z-50 shadow-2xl">
                        GitHub Repository
                    </div>
                </a>
            </div>

            {/* Version Badge */}
            <div className="mt-6 px-5 py-2 pointer-events-none shrink-0 flex items-center justify-start h-8 overflow-hidden hide-scrollbar">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest transition-opacity duration-[250ms]">
                    <span className="group-hover:hidden">V4.0</span>
                    <span className="hidden group-hover:inline">ToonPlayer V4.0</span>
                </span>
            </div>
        </aside>
        </div>
    );
}
