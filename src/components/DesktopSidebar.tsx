"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Clock, TrendingUp, LayoutGrid, Star, Sparkles, Shuffle, Film, Zap } from "lucide-react";

export default function DesktopSidebar() {
    const pathname = usePathname();

    const navItems = [
        { name: "Movies", href: "/", icon: Film, color: "text-blue-400", tooltip: "Browse Movies" },
        { name: "Anime", href: "/az-list/all", icon: Zap, color: "text-purple-400", tooltip: "Browse Anime" },
        { name: "Random", href: "/randomize", icon: Shuffle, color: "text-pink-400", tooltip: "Random Pick" },
        { name: "History", href: "/history", icon: Clock, color: "text-orange-400", tooltip: "Watch History" },
        { name: "About", href: "/about", icon: Star, color: "text-purple-400", tooltip: "About Us" },
    ];

    const exploreItems = [
        { name: "Discover", href: "/discover", icon: Compass, color: "text-blue-400" },
        { name: "Trending", href: "/search?genre=Action", icon: TrendingUp, color: "text-rose-400" },
        { name: "Genres", href: "/genres", icon: LayoutGrid, color: "text-cyan-400" },
        { name: "Top Rated", href: "/search?status=Completed", icon: Star, color: "text-yellow-400" },
        { name: "New", href: "/search?status=Ongoing", icon: Sparkles, color: "text-emerald-400" },
    ];

    return (
        <aside className="fixed left-0 top-0 bottom-0 w-[84px] hover:w-[200px] transition-[width] duration-300 ease-in-out bg-black/90 backdrop-blur-2xl border-r border-white/5 hidden md:flex flex-col py-8 z-40 overflow-hidden shadow-[4px_0_24px_rgba(0,0,0,0.6)] group/sidebar">
            {/* Logo */}
            <Link href="/" className="mb-4 mx-auto group pointer-events-auto flex items-center justify-center w-full">
                <div className="w-10 h-10 relative flex items-center justify-center shrink-0">
                    <img 
                        src="/logo.webp" 
                        alt="ToonPlayer" 
                        className="w-full h-full object-contain mix-blend-screen group-hover:scale-110 transition-transform duration-300"
                    />
                </div>
                <span className="text-white font-black font-sora text-lg opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 absolute left-16 whitespace-nowrap">
                    ToonPlayer
                </span>
            </Link>

            {/* Main Navigation */}
            <div className="flex flex-col gap-3 px-2 w-full mt-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                    const Icon = item.icon;
                    
                    return (
                        <Link 
                            key={item.href}
                            href={item.href}
                            className={`relative flex items-center p-2 rounded-2xl transition-all duration-300 h-14 group pointer-events-auto border ${
                                isActive 
                                ? `bg-purple-500/15 text-purple-400 border-purple-500/30 shadow-[0_0_24px_rgba(168,85,247,0.25)]` 
                                : "border-transparent text-[var(--text-muted)] hover:text-white hover:bg-white/5"
                            }`}
                        >
                            {/* Custom Hover Tooltip (Only when collapsed) */}
                            <div className="absolute left-[70px] px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-white text-[11px] font-bold whitespace-nowrap opacity-0 pointer-events-none transition-all duration-300 group-hover:opacity-100 z-50 shadow-xl hidden lg:block group-hover/sidebar:hidden">
                                {item.tooltip || item.name}
                            </div>

                            <div className="w-12 h-full flex items-center justify-center shrink-0">
                                <Icon strokeWidth={2.5} className={`w-[24px] h-[24px] transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_10px_rgba(168,85,247,0.6)]' : 'group-hover:scale-110 group-hover:-translate-y-0.5'}`} />
                            </div>
                            <span className={`text-[12px] font-bold tracking-wide transition-all duration-300 whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 w-0 group-hover/sidebar:w-auto`}>{item.name}</span>
                        </Link>
                    );
                })}
            </div>

            {/* Divider */}
            <div className="w-8 group-hover/sidebar:w-3/4 transition-all duration-300 h-px bg-[var(--border-color)] my-4 mx-auto" />

            {/* Explore Section */}
            <div className="flex flex-col gap-3 px-2 w-full">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1 ml-5 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 h-0 group-hover/sidebar:h-auto overflow-hidden">
                    Explore
                </p>
                {exploreItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    
                    return (
                        <Link 
                            key={item.href}
                            href={item.href}
                            className={`relative flex items-center p-2 rounded-2xl transition-all duration-300 h-14 group pointer-events-auto border ${
                                isActive 
                                ? `bg-white/10 text-white border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)]` 
                                : "border-transparent text-[var(--text-muted)] hover:text-white hover:bg-white/5"
                            }`}
                        >
                            {/* Custom Hover Tooltip */}
                            <div className="absolute left-[70px] px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-white text-[11px] font-bold whitespace-nowrap opacity-0 pointer-events-none transition-all duration-300 group-hover:opacity-100 z-50 shadow-xl hidden lg:block group-hover/sidebar:hidden">
                                {item.name}
                            </div>

                            <div className="w-12 h-full flex items-center justify-center shrink-0">
                                <Icon strokeWidth={2.5} className={`w-[22px] h-[22px] transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'group-hover:scale-110 group-hover:-translate-y-0.5'}`} />
                            </div>
                            <span className={`text-[12px] font-bold tracking-wide whitespace-nowrap transition-colors opacity-0 group-hover/sidebar:opacity-100 w-0 group-hover/sidebar:w-auto`}>{item.name}</span>
                        </Link>
                    );
                })}
            </div>

            {/* Version badge at bottom */}
            <div className="mt-auto pt-4 pb-2 pointer-events-auto w-full flex justify-center">
                <div className="text-[7px] font-black text-[var(--text-muted)]/30 uppercase tracking-widest transition-all duration-300">
                    <span className="inline group-hover/sidebar:hidden">V2.0</span>
                    <span className="hidden group-hover/sidebar:inline">ToonPlayer V2.0</span>
                </div>
            </div>
        </aside>
    );
}
