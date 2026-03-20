"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Compass, Calendar, Clock, TrendingUp, LayoutGrid, Star, Sparkles, Shuffle, Film, Tv, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function DesktopSidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const navItems = [
        { name: "Movies", href: "/", icon: Film, color: "text-blue-400" },
        { name: "Anime", href: "/az-list/all", icon: Zap, color: "text-purple-400" },
        { name: "Schedule", href: "/schedule", icon: Calendar, color: "text-green-400" },
        { name: "History", href: "/history", icon: Clock, color: "text-orange-400" },
        { name: "About", href: "/about", icon: Star, color: "text-purple-400" },
    ];

    const exploreItems = [
        { name: "Trending", href: "/search?genre=Action", icon: TrendingUp, color: "text-rose-400" },
        { name: "Genres", href: "/genres", icon: LayoutGrid, color: "text-cyan-400" },
        { name: "Top Rated", href: "/search?status=Completed", icon: Star, color: "text-yellow-400" },
        { name: "New", href: "/search?status=Ongoing", icon: Sparkles, color: "text-emerald-400" },
        { name: "Random", href: "/watch/movie/random", icon: Shuffle, color: "text-pink-400", isRandom: true },
    ];

    return (
        <aside className="sticky left-0 top-0 bottom-0 w-[72px] bg-[var(--bg-main)]/80 backdrop-blur-xl border-r border-[var(--border-color)] hidden md:flex flex-col items-center py-6 gap-2 z-40 overflow-y-auto hide-scrollbar shadow-[20px_0_40px_-20px_rgba(0,0,0,0.5)]">
            {/* Main Navigation */}
            {navItems.map((item, i) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                const Icon = item.icon;
                
                return (
                    <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08, duration: 0.3 }}
                    >
                        <Link 
                            href={item.href}
                            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-500 w-14 group ${
                                isActive 
                                ? `${item.color} bg-white/5 shadow-[0_0_20px_rgba(139,92,246,0.1)] border border-purple-500/20` 
                                : "text-[var(--text-muted)] hover:text-white hover:bg-white/5"
                            }`}
                            title={item.name}
                        >
                            <Icon className={`w-5 h-5 transition-all duration-500 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_currentColor]' : 'group-hover:scale-110 group-hover:text-white'}`} />
                            <span className={`text-[9px] font-bold tracking-tight transition-colors duration-500 ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>{item.name}</span>
                        </Link>
                    </motion.div>
                );
            })}

            {/* Divider */}
            <div className="w-8 h-px bg-[var(--border-color)] my-2" />

            {/* Explore Section */}
            <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1"
            >
                Explore
            </motion.p>
            {exploreItems.map((item, i) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                
                return (
                    <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.08, duration: 0.3 }}
                    >
                        <Link 
                            href={item.isRandom ? '#' : item.href}
                            onClick={(e) => {
                                if (item.isRandom) {
                                    e.preventDefault();
                                    // In a real app, this would fetch a random ID. 
                                    // For now, let's pick a popular one or navigate to a random search result.
                                    const randomIds = [1022789, 822119, 933260, 519182, 1011985]; // Sample popular TMDB IDs
                                    const randomId = randomIds[Math.floor(Math.random() * randomIds.length)];
                                    router.push(`/watch/movie/${randomId}`);
                                }
                            }}
                            className={`flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all duration-300 w-14 ${
                                isActive 
                                ? `${item.color} bg-[var(--bg-card)] shadow-lg border border-[var(--border-color)]` 
                                : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50"
                            }`}
                            title={item.name}
                        >
                            <Icon className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
                            <span className="text-[8px] font-bold tracking-tight">{item.name}</span>
                        </Link>
                    </motion.div>
                );
            })}
        </aside>
    );
}
