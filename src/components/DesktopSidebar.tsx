"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
    Home, Compass, LayoutGrid, Sparkles, Clock, 
    TrendingUp, Calendar, Heart, Settings, Github, HelpCircle 
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
        { name: "Calendar", href: "/calendar", icon: Calendar, tooltip: "Release Calendar" },
        { name: "Favorites", href: "/watchlist", icon: Heart, tooltip: "My Watchlist" },
    ];

    return (
        <aside className="peer/sidebar group fixed left-0 top-0 bottom-0 w-[72px] hover:w-[240px] transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] bg-[#08080B]/95 backdrop-blur-md border-r border-white/5 hidden md:flex flex-col py-6 z-[60]">
            {/* Branded Logo */}
            <div className="mb-8 shrink-0 flex items-center justify-center group-hover:justify-start h-10 w-full px-3 group-hover:px-[18px] transition-all duration-300 relative">
                <Link href="/" className="flex items-center gap-3 active:scale-95 transition-all shrink-0">
                    <div className="w-11 h-11 flex items-center justify-center shrink-0">
                        <Logo />
                    </div>
                    <span className="text-sm font-black tracking-tight text-white uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
                        Toon<span className="text-[#FF9D00]">Player</span>
                    </span>
                </Link>
            </div>

            {/* Navigation Sections */}
            <div className="flex-1 flex flex-col gap-1.5 px-3">
                {sections.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`relative flex items-center h-11 px-3 rounded-xl transition-all duration-200 group/item ${
                                isActive 
                                    ? "bg-white/[0.04] text-white" 
                                    : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                            }`}
                        >
                            {/* Active glow indicator */}
                            {isActive && (
                                <motion.div 
                                    layoutId="activeGlow"
                                    className="absolute left-0 w-[3px] h-6 bg-[#FF9D00] rounded-r-full shadow-[0_0_15px_#FF9D00]"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}

                            {/* Icon Wrapper */}
                            <div className="flex items-center justify-center shrink-0 w-12 h-11">
                                <Icon 
                                    className={`w-[18px] h-[18px] transition-all duration-300 ${
                                        isActive 
                                            ? "text-[#FF9D00] drop-shadow-[0_0_8px_rgba(255,157,0,0.6)] scale-110" 
                                            : "group-hover/item:scale-115 group-hover/item:text-white"
                                    }`}
                                    strokeWidth={2.2}
                                />
                            </div>

                            {/* Label */}
                            <span className="ml-2 text-xs font-semibold tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                {item.name}
                            </span>

                            {/* Tooltip (Only visible when sidebar is collapsed) */}
                            <div className="absolute left-[80px] px-3 py-1.5 bg-[#12131A] border border-white/10 rounded-lg text-white text-[10px] font-black tracking-wider uppercase whitespace-nowrap opacity-0 pointer-events-none transition-all duration-200 translate-x-1 group-hover/item:hover:opacity-0 group-hover/item:translate-x-2 group-hover:group-hover/item:opacity-0 group-hover:group-hover/item:translate-x-1 lg:group-hover/item:opacity-100 z-50 shadow-2xl">
                                {item.tooltip}
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Divider */}
            <div className="h-px bg-white/5 my-4 mx-3" />

            {/* Bottom Section */}
            <div className="flex flex-col gap-1.5 px-3 shrink-0">
                {/* Settings Toggle */}
                <button
                    onClick={() => setShowProfileSettings(true)}
                    className="relative flex items-center h-11 px-3 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all duration-200 group/item w-full text-left"
                >
                    <div className="flex items-center justify-center shrink-0 w-12 h-11">
                        <Settings 
                            className="w-[18px] h-[18px] transition-all duration-300 group-hover/item:scale-115 group-hover/item:text-white" 
                            strokeWidth={2.2}
                        />
                    </div>
                    <span className="ml-2 text-xs font-semibold tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        Settings
                    </span>
                    <div className="absolute left-[80px] px-3 py-1.5 bg-[#12131A] border border-white/10 rounded-lg text-white text-[10px] font-black tracking-wider uppercase whitespace-nowrap opacity-0 pointer-events-none transition-all duration-200 translate-x-1 group-hover/item:opacity-100 group-hover/item:translate-x-2 group-hover:group-hover/item:opacity-0 z-50 shadow-2xl">
                        Settings
                    </div>
                </button>

                {/* Support Link */}
                <Link
                    href="/contact"
                    className="relative flex items-center h-11 px-3 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all duration-200 group/item"
                >
                    <div className="flex items-center justify-center shrink-0 w-12 h-11">
                        <HelpCircle 
                            className="w-[18px] h-[18px] transition-all duration-300 group-hover/item:scale-115 group-hover/item:text-white" 
                            strokeWidth={2.2}
                        />
                    </div>
                    <span className="ml-2 text-xs font-semibold tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
                    className="relative flex items-center h-11 px-3 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all duration-200 group/item"
                >
                    <div className="flex items-center justify-center shrink-0 w-12 h-11">
                        <Github 
                            className="w-[18px] h-[18px] transition-all duration-300 group-hover/item:scale-115 group-hover/item:text-white" 
                            strokeWidth={2.2}
                        />
                    </div>
                    <span className="ml-2 text-xs font-semibold tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        GitHub
                    </span>
                    <div className="absolute left-[80px] px-3 py-1.5 bg-[#12131A] border border-white/10 rounded-lg text-white text-[10px] font-black tracking-wider uppercase whitespace-nowrap opacity-0 pointer-events-none transition-all duration-200 translate-x-1 group-hover/item:opacity-100 group-hover/item:translate-x-2 group-hover:group-hover/item:opacity-0 z-50 shadow-2xl">
                        GitHub Repository
                    </div>
                </a>
            </div>

            {/* Version Badge */}
            <div className="mt-6 px-5 py-2 pointer-events-none shrink-0 flex items-center justify-start h-8 overflow-hidden">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest transition-opacity duration-300">
                    <span className="group-hover:hidden">V4.0</span>
                    <span className="hidden group-hover:inline">ToonPlayer V4.0</span>
                </span>
            </div>
        </aside>
    );
}
