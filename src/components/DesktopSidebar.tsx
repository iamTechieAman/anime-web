"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Calendar, Clock, TrendingUp, LayoutGrid, Star, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function DesktopSidebar() {
    const pathname = usePathname();

    const navItems = [
        { name: "Movies & Anime", href: "/movies", icon: Compass, color: "text-blue-400" },
        { name: "Schedule", href: "/schedule", icon: Calendar, color: "text-green-400" },
        { name: "History", href: "/history", icon: Clock, color: "text-orange-400" },
        { name: "About", href: "/about", icon: Star, color: "text-purple-400" },
    ];

    const exploreItems = [
        { name: "Trending", href: "/search?genre=Action", icon: TrendingUp, color: "text-rose-400" },
        { name: "Genres", href: "/az-list/all", icon: LayoutGrid, color: "text-cyan-400" },
        { name: "Top Rated", href: "/search?status=Completed", icon: Star, color: "text-yellow-400" },
        { name: "New", href: "/search?status=Ongoing", icon: Sparkles, color: "text-emerald-400" },
    ];

    return (
        <aside className="sticky left-0 top-0 bottom-0 w-[72px] bg-[var(--bg-main)] border-r border-[var(--border-color)] hidden md:flex flex-col items-center py-4 gap-1 z-40 overflow-y-auto scrollbar-none">
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
                            className={`flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all duration-300 w-14 ${
                                isActive 
                                ? `${item.color} bg-[var(--bg-card)] shadow-lg border border-[var(--border-color)]` 
                                : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50"
                            }`}
                            title={item.name}
                        >
                            <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                            <span className="text-[9px] font-bold tracking-tight">{item.name}</span>
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
                            href={item.href}
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
