"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, TrendingUp, LayoutGrid, Star, Sparkles, Shuffle, Film, Zap, Compass } from "lucide-react";

export default function DesktopSidebar() {
    const pathname = usePathname();

    const navItems = [
        { name: "Movies", href: "/", icon: Film, tooltip: "Browse Movies" },
        { name: "Anime", href: "/az-list/all", icon: Zap, tooltip: "Browse Anime" },
        { name: "Random", href: "/randomize", icon: Shuffle, tooltip: "Random Pick" },
        { name: "History", href: "/history", icon: Clock, tooltip: "Watch History" },
        { name: "About", href: "/about", icon: Star, tooltip: "About Us" },
    ];

    const exploreItems = [
        { name: "Discover", href: "/discover", icon: Compass },
        { name: "Trending", href: "/search?genre=Action", icon: TrendingUp },
        { name: "Genres", href: "/genres", icon: LayoutGrid },
        { name: "Top Rated", href: "/search?status=Completed", icon: Star },
        { name: "New", href: "/search?status=Ongoing", icon: Sparkles },
    ];

    return (
        <aside className="peer/sidebar fixed left-0 top-0 bottom-0 w-[72px] hover:w-[220px] transition-[width,border-color,box-shadow] duration-300 ease-in-out bg-[var(--bg-surface)] border-r border-[var(--border-color)] hidden md:flex flex-col py-5 z-[60] overflow-hidden group/sidebar">
            {/* Logo */}
            <Link href="/" className="mb-5 mx-auto group pointer-events-auto flex items-center justify-center w-full px-4 relative overflow-hidden">
                <div className="w-8 h-8 relative flex items-center justify-center shrink-0">
                    <img 
                        src="/logo.webp" 
                        alt="ToonPlayer" 
                        className="w-full h-full object-contain"
                    />
                </div>
            </Link>

            {/* Main Navigation */}
            <div className="flex flex-col gap-2 px-2.5 w-full mt-3">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                    const Icon = item.icon;
                    
                    return (
                        <Link 
                            key={item.href}
                            href={item.href}
                            className={`relative flex items-center p-2 rounded-xl transition-all duration-300 h-11 group pointer-events-auto border ${
                                isActive 
                                ? `bg-gradient-to-r from-[var(--accent)]/20 to-[var(--accent-secondary)]/15 text-white border-[var(--accent)]/35 shadow-[0_0_12px_rgba(249,115,22,0.2)]` 
                                : "border-transparent text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.04]"
                            }`}
                        >
                            {/* Tooltip */}
                            <div className="absolute left-[66px] px-3 py-1.5 bg-zinc-950 border border-white/10 rounded-lg text-white text-[11px] font-bold whitespace-nowrap opacity-0 pointer-events-none transition-all duration-300 group-hover:opacity-100 z-50 shadow-xl hidden lg:block group-hover/sidebar:hidden">
                                {item.tooltip || item.name}
                            </div>

                            <div className="w-8 h-full flex items-center justify-center shrink-0">
                                <Icon strokeWidth={2} className={`w-[18px] h-[18px] transition-transform duration-300 ${isActive ? 'scale-110 text-[var(--accent)] drop-shadow-[0_0_8px_rgba(249,115,22,0.7)]' : 'group-hover:scale-110'}`} />
                            </div>
                            <span className={`text-[12px] font-bold tracking-wide transition-all duration-300 whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 ml-3.5 w-0 group-hover/sidebar:w-auto`}>{item.name}</span>
                        </Link>
                    );
                })}
            </div>

            {/* Divider */}
            <div className="w-8 group-hover/sidebar:w-3/4 transition-all duration-300 h-px bg-white/10 my-4 mx-auto" />

            {/* Explore Section */}
            <div className="flex flex-col gap-2 px-2.5 w-full">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1 ml-3.5 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 h-0 group-hover/sidebar:h-auto overflow-hidden">
                    Explore
                </p>
                {exploreItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    
                    return (
                        <Link 
                            key={item.href}
                            href={item.href}
                            className={`relative flex items-center p-2 rounded-xl transition-all duration-300 h-11 group pointer-events-auto border ${
                                isActive 
                                ? `bg-gradient-to-r from-[var(--accent)]/20 to-[var(--accent-secondary)]/15 text-white border-[var(--accent)]/35 shadow-[0_0_12px_rgba(249,115,22,0.2)]` 
                                : "border-transparent text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.04]"
                            }`}
                        >
                            {/* Tooltip */}
                            <div className="absolute left-[66px] px-3 py-1.5 bg-zinc-950 border border-white/10 rounded-lg text-white text-[11px] font-bold whitespace-nowrap opacity-0 pointer-events-none transition-all duration-300 group-hover:opacity-100 z-50 shadow-xl hidden lg:block group-hover/sidebar:hidden">
                                {item.name}
                            </div>

                            <div className="w-8 h-full flex items-center justify-center shrink-0">
                                <Icon strokeWidth={2} className={`w-[16px] h-[16px] transition-transform duration-300 ${isActive ? 'scale-110 text-[var(--accent)] drop-shadow-[0_0_8px_rgba(249,115,22,0.7)]' : 'group-hover:scale-110'}`} />
                            </div>
                            <span className={`text-[11px] font-bold tracking-wide whitespace-nowrap transition-colors opacity-0 group-hover/sidebar:opacity-100 ml-3.5 w-0 group-hover/sidebar:w-auto`}>{item.name}</span>
                        </Link>
                    );
                })}
            </div>

            {/* Version badge at bottom */}
            <div className="mt-auto pt-4 pb-2 pointer-events-auto w-full flex justify-center">
                <div className="text-[7px] font-black text-zinc-500/50 uppercase tracking-widest transition-all duration-300">
                    <span className="inline group-hover/sidebar:hidden">V2.0</span>
                    <span className="hidden group-hover/sidebar:inline">ToonPlayer V2.0</span>
                </div>
            </div>
        </aside>
    );
}
