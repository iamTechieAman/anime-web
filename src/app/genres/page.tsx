"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { 
    Zap, Heart, Ghost, Laugh, Sparkles, Sword, 
    Compass, Music, Skull, Target, Rocket, 
    Shield, History, Users, Map
} from "lucide-react";

const genres = [
    { name: "Action", icon: Sword, color: "from-rose-600/20 to-red-500/20", border: "group-hover:border-rose-500/50", iconBg: "bg-rose-500", desc: "Adrenaline-fueled adventures", size: "col-span-2 md:col-span-2 row-span-1" },
    { name: "Adventure", icon: Map, color: "from-orange-600/20 to-amber-500/20", border: "group-hover:border-orange-500/50", iconBg: "bg-orange-500", desc: "Epic journeys and quests", size: "col-span-1 md:col-span-1 row-span-1" },
    { name: "Animation", icon: Sparkles, color: "from-amber-500/20 to-yellow-400/20", border: "group-hover:border-amber-400/50", iconBg: "bg-amber-500", desc: "Animated worlds and stories", size: "col-span-1 md:col-span-1 row-span-2" },
    { name: "Comedy", icon: Laugh, color: "from-yellow-500/20 to-orange-400/20", border: "group-hover:border-yellow-500/50", iconBg: "bg-yellow-500", desc: "Laughter and fun moments", size: "col-span-1 md:col-span-1 row-span-1" },
    { name: "Crime", icon: Shield, color: "from-zinc-700/20 to-slate-500/20", border: "group-hover:border-zinc-500/50", iconBg: "bg-zinc-500", desc: "Detectives and outlaws", size: "col-span-1 md:col-span-1 row-span-1" },
    { name: "Drama", icon: Heart, color: "from-pink-600/20 to-rose-500/20", border: "group-hover:border-pink-500/50", iconBg: "bg-pink-500", desc: "Emotional and powerful tales", size: "col-span-2 md:col-span-2 row-span-1" },
    { name: "Family", icon: Users, color: "from-emerald-600/20 to-teal-500/20", border: "group-hover:border-emerald-500/50", iconBg: "bg-emerald-500", desc: "Content for all ages", size: "col-span-1 md:col-span-1 row-span-1" },
    { name: "Fantasy", icon: Zap, color: "from-indigo-600/20 to-violet-500/20", border: "group-hover:border-indigo-500/50", iconBg: "bg-indigo-500", desc: "Magic and mythical realms", size: "col-span-2 md:col-span-2 row-span-1" },
    { name: "History", icon: History, color: "from-amber-800/20 to-yellow-700/20", border: "group-hover:border-amber-700/50", iconBg: "bg-amber-700", desc: "Historical events and figures", size: "col-span-1 md:col-span-1 row-span-1" },
    { name: "Horror", icon: Ghost, color: "from-red-950/20 to-red-800/20", border: "group-hover:border-red-650/50", iconBg: "bg-red-800", desc: "Spooky and terrifying thrills", size: "col-span-1 md:col-span-1 row-span-1" },
    { name: "Music", icon: Music, color: "from-cyan-600/20 to-blue-500/20", border: "group-hover:border-cyan-500/50", iconBg: "bg-cyan-500", desc: "Musical journeys and performances", size: "col-span-1 md:col-span-1 row-span-1" },
    { name: "Mystery", icon: Target, color: "from-blue-800/20 to-cyan-600/20", border: "group-hover:border-blue-600/50", iconBg: "bg-blue-700", desc: "Whodunits and puzzles", size: "col-span-1 md:col-span-1 row-span-1" },
    { name: "Romance", icon: Heart, color: "from-rose-400/20 to-pink-300/20", border: "group-hover:border-rose-400/50", iconBg: "bg-rose-400", desc: "Love and heartfelt stories", size: "col-span-2 md:col-span-2 row-span-1" },
    { name: "Sci-Fi", icon: Rocket, color: "from-sky-600/20 to-indigo-500/20", border: "group-hover:border-sky-500/50", iconBg: "bg-sky-500", desc: "Future tech and space travel", size: "col-span-2 md:col-span-2 row-span-1" },
    { name: "Thriller", icon: Skull, color: "from-red-700/20 to-rose-600/20", border: "group-hover:border-red-500/50", iconBg: "bg-red-600", desc: "Suspense and intense action", size: "col-span-1 md:col-span-1 row-span-1" },
    { name: "War", icon: Shield, color: "from-gray-800/20 to-slate-650/20", border: "group-hover:border-gray-650/50", iconBg: "bg-gray-700", desc: "Military conflicts and heroism", size: "col-span-1 md:col-span-1 row-span-1" },
    { name: "Western", icon: Compass, color: "from-orange-900/20 to-amber-950/20", border: "group-hover:border-amber-800/50", iconBg: "bg-orange-800", desc: "The wild west and frontiers", size: "col-span-1 md:col-span-1 row-span-1" },
];

export default function GenresPage() {
    return (
        <main className="min-h-dvh pt-24 pb-20 px-6 md:px-12 bg-[var(--bg-main)]">
            <div className="w-full max-w-[1800px] mx-auto">
                <header className="mb-12">
                    <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight">
                        Explore <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)]">Genres</span>
                    </h1>
                    <p className="text-[var(--text-muted)] text-base md:text-lg max-w-2xl font-medium">
                        Discover your next favorite show by browsing through our curated categories.
                    </p>
                </header>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6 auto-rows-[140px] md:auto-rows-[180px]">
                    {genres.map((genre, i) => {
                        const Icon = genre.icon;
                        const isTall = genre.size.includes("row-span-2");
                        return (
                            <motion.div
                                key={genre.name}
                                className={genre.size}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30, delay: i * 0.02 }}
                            >
                                <Link 
                                    href={`/search?genre=${genre.name}`}
                                    className={`group relative flex flex-col justify-between h-full overflow-hidden rounded-2xl bg-[var(--bg-card)]/40 border border-[var(--border-color)] backdrop-blur-md transition-all duration-500 ${genre.border} hover:shadow-[0_8px_32px_var(--accent-glow)]`}
                                >
                                    {/* Ambient Glow */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${genre.color} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent z-10" />

                                    {/* Glass reflection line */}
                                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:via-white/20 transition-all duration-500" />

                                    {/* Content Layout */}
                                    <div className={`relative z-20 flex flex-col h-full justify-between p-5 md:p-6 ${isTall ? "items-start" : "items-start flex-row md:flex-col md:items-start"}`}>
                                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-white ${genre.iconBg} shadow-lg shadow-black/40 group-hover:scale-110 transition-transform duration-500 flex-shrink-0`}>
                                            <Icon className="w-5 h-5 md:w-6 md:h-6" />
                                        </div>
                                        
                                        <div className={`${isTall ? "mt-auto pt-6" : "mt-0 md:mt-auto text-left"}`}>
                                            <h3 className="text-base md:text-xl font-black text-white group-hover:text-[var(--accent)] transition-colors tracking-tight leading-snug">
                                                {genre.name}
                                            </h3>
                                            <p className="text-[10px] md:text-xs text-[var(--text-muted)] mt-1 font-medium group-hover:text-white/80 transition-colors line-clamp-1">
                                                {genre.desc}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}
