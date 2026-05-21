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
        <aside className="fixed left-4 top-4 bottom-4 w-[76px] hover:w-[220px] transition-[width,border-color,box-shadow] duration-300 ease-in-out bg-[var(--bg-card)]/40 backdrop-blur-3xl border border-white/10 rounded-[24px] hidden md:flex flex-col py-8 z-40 overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.7)] group/sidebar hover:border-[var(--accent)]/30 hover:shadow-[0_12px_40px_rgba(168,85,247,0.15)]">
            {/* Logo */}
            <Link href="/" className="mb-6 mx-auto group pointer-events-auto flex items-center justify-center w-full px-4 relative">
                <div className="w-9 h-9 relative flex items-center justify-center shrink-0 bg-gradient-to-tr from-[var(--accent)] to-[var(--accent-secondary)] rounded-xl p-[2px] shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                    <img 
                        src="/logo.webp" 
                        alt="ToonPlayer" 
                        className="w-full h-full object-contain mix-blend-screen bg-[#05010A] rounded-[10px]"
                    />
                </div>
                <span className="text-white font-black font-sora text-sm opacity-0 group-hover/sidebar:opacity-100 transition-all duration-300 absolute left-16 tracking-tighter uppercase bg-clip-text bg-gradient-to-r from-white via-purple-300 to-pink-300">
                    ToonPlayer
                </span>
            </Link>

            {/* Main Navigation */}
            <div className="flex flex-col gap-2.5 px-3 w-full mt-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                    const Icon = item.icon;
                    
                    return (
                        <Link 
                            key={item.href}
                            href={item.href}
                            className={`relative flex items-center p-2 rounded-xl transition-all duration-300 h-12 group pointer-events-auto border ${
                                isActive 
                                ? `bg-gradient-to-r from-[var(--accent)]/20 to-[var(--accent-secondary)]/20 text-white border-[var(--accent)]/40 shadow-[0_0_15px_rgba(168,85,247,0.25)]` 
                                : "border-transparent text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
                            }`}
                        >
                            {/* Custom Hover Tooltip (Only when collapsed) */}
                            <div className="absolute left-[70px] px-3 py-1.5 bg-zinc-950 border border-white/10 rounded-lg text-white text-[11px] font-bold whitespace-nowrap opacity-0 pointer-events-none transition-all duration-300 group-hover:opacity-100 z-50 shadow-xl hidden lg:block group-hover/sidebar:hidden">
                                {item.tooltip || item.name}
                            </div>

                            <div className="w-9 h-full flex items-center justify-center shrink-0">
                                <Icon strokeWidth={2} className={`w-[20px] h-[20px] transition-transform duration-300 ${isActive ? 'scale-110 text-[var(--accent)] drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'group-hover:scale-110'}`} />
                            </div>
                            <span className={`text-[12px] font-bold tracking-wide transition-all duration-300 whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 ml-4 w-0 group-hover/sidebar:w-auto`}>{item.name}</span>
                        </Link>
                    );
                })}
            </div>

            {/* Divider */}
            <div className="w-8 group-hover/sidebar:w-3/4 transition-all duration-300 h-px bg-white/10 my-4 mx-auto" />

            {/* Explore Section */}
            <div className="flex flex-col gap-2.5 px-3 w-full">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1 ml-4 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 h-0 group-hover/sidebar:h-auto overflow-hidden">
                    Explore
                </p>
                {exploreItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    
                    return (
                        <Link 
                            key={item.href}
                            href={item.href}
                            className={`relative flex items-center p-2 rounded-xl transition-all duration-300 h-12 group pointer-events-auto border ${
                                isActive 
                                ? `bg-gradient-to-r from-[var(--accent)]/20 to-[var(--accent-secondary)]/20 text-white border-[var(--accent)]/40 shadow-[0_0_15px_rgba(168,85,247,0.25)]` 
                                : "border-transparent text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
                            }`}
                        >
                            {/* Custom Hover Tooltip */}
                            <div className="absolute left-[70px] px-3 py-1.5 bg-zinc-950 border border-white/10 rounded-lg text-white text-[11px] font-bold whitespace-nowrap opacity-0 pointer-events-none transition-all duration-300 group-hover:opacity-100 z-50 shadow-xl hidden lg:block group-hover/sidebar:hidden">
                                {item.name}
                            </div>

                            <div className="w-9 h-full flex items-center justify-center shrink-0">
                                <Icon strokeWidth={2} className={`w-[18px] h-[18px] transition-transform duration-300 ${isActive ? 'scale-110 text-[var(--accent)] drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'group-hover:scale-110'}`} />
                            </div>
                            <span className={`text-[12px] font-bold tracking-wide whitespace-nowrap transition-colors opacity-0 group-hover/sidebar:opacity-100 ml-4 w-0 group-hover/sidebar:w-auto`}>{item.name}</span>
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
