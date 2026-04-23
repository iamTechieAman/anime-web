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
        <aside className="fixed left-0 top-0 bottom-0 w-[72px] bg-[var(--bg-main)]/95 backdrop-blur-xl border-r border-[var(--border-color)] hidden md:flex flex-col items-center py-6 gap-1.5 z-40 overflow-y-auto hide-scrollbar pointer-events-none">
            {/* Logo */}
            <Link href="/" className="mb-4 group pointer-events-auto">
                <div className="w-10 h-10 relative flex items-center justify-center">
                    <img 
                        src="/logo.webp" 
                        alt="ToonPlayer" 
                        className="w-full h-full object-contain mix-blend-screen group-hover:scale-110 transition-transform duration-300"
                    />
                </div>
            </Link>

            {/* Main Navigation */}
            {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                const Icon = item.icon;
                
                return (
                    <Link 
                        key={item.href}
                        href={item.href}
                        className={`tooltip relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 w-14 group pointer-events-auto ${
                            isActive 
                            ? `${item.color} bg-white/5 border border-purple-500/20` 
                            : "text-[var(--text-muted)] hover:text-white hover:bg-white/5"
                        }`}
                        data-tooltip={item.tooltip || item.name}
                    >
                        {/* Active indicator */}
                        {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-gradient-to-b from-purple-500 to-blue-500 rounded-r-full" />
                        )}
                        <Icon className={`w-5 h-5 transition-all duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_currentColor]' : 'group-hover:scale-110'}`} />
                        <span className={`text-[10px] font-bold tracking-tight transition-colors duration-300 ${isActive ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'}`}>{item.name}</span>
                    </Link>
                );
            })}

            {/* Divider */}
            <div className="w-8 h-px bg-[var(--border-color)] my-2" />

            {/* Explore Section */}
            <p className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
                Explore
            </p>
            {exploreItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                
                return (
                    <Link 
                        key={item.href}
                        href={item.href}
                        className={`tooltip flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 w-14 group ${
                            isActive 
                            ? `${item.color} bg-[var(--bg-card)] border border-[var(--border-color)]` 
                            : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50"
                        }`}
                        data-tooltip={item.name}
                    >
                        <Icon className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                        <span className="text-[10px] font-bold tracking-tight">{item.name}</span>
                    </Link>
                );
            })}

            {/* Version badge at bottom */}
            <div className="mt-auto pt-4 pointer-events-auto">
                <div className="text-[7px] font-black text-[var(--text-muted)]/30 uppercase tracking-widest text-center">
                    V2.0
                </div>
            </div>
        </aside>
    );
}
