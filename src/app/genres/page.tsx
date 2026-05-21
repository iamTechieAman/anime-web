"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { 
    Film, Zap, Heart, Ghost, Laugh, Sparkles, Sword, 
    Compass, Music, Search, Skull, Target, Rocket, 
    Shield, History, Users, Monitor, Map
} from "lucide-react";

const genres = [
    { name: "Action", icon: Sword, color: "bg-rose-500", desc: "Adrenaline-fueled adventures" },
    { name: "Adventure", icon: Map, color: "bg-orange-500", desc: "Epic journeys and quests" },
    { name: "Animation", icon: Sparkles, color: "bg-orange-500", desc: "Animated worlds and stories" },
    { name: "Comedy", icon: Laugh, color: "bg-yellow-500", desc: "Laughter and fun moments" },
    { name: "Crime", icon: Shield, color: "bg-zinc-500", desc: "Detectives and outlaws" },
    { name: "Drama", icon: Heart, color: "bg-pink-500", desc: "Emotional and powerful tales" },
    { name: "Family", icon: Users, color: "bg-emerald-500", desc: "Content for all ages" },
    { name: "Fantasy", icon: Zap, color: "bg-indigo-500", desc: "Magic and mythical realms" },
    { name: "History", icon: History, color: "bg-amber-700", desc: "Historical events and figures" },
    { name: "Horror", icon: Ghost, color: "bg-red-800", desc: "Spooky and terrifying thrills" },
    { name: "Music", icon: Music, color: "bg-cyan-500", desc: "Musical journeys and performances" },
    { name: "Mystery", icon: Target, color: "bg-blue-700", desc: "Whodunits and puzzles" },
    { name: "Romance", icon: Heart, color: "bg-rose-400", desc: "Love and heartfelt stories" },
    { name: "Sci-Fi", icon: Rocket, color: "bg-blue-500", desc: "Future tech and space travel" },
    { name: "Thriller", icon: Skull, color: "bg-red-600", desc: "Suspense and intense action" },
    { name: "War", icon: Shield, color: "bg-gray-700", desc: "Military conflicts and heroism" },
    { name: "Western", icon: Compass, color: "bg-orange-800", desc: "The wild west and frontiers" },
];

export default function GenresPage() {
    return (
        <main className="min-h-screen pt-24 pb-20 px-4 md:px-8 bg-[var(--bg-main)]">
            <div className="w-full">
                <header className="mb-12">
                    <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight">
                        Explore <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-amber-400">Genres</span>
                    </h1>
                    <p className="text-[var(--text-muted)] text-lg max-w-2xl">
                        Discover your next favorite show by browsing through our curated categories.
                    </p>
                </header>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {genres.map((genre, i) => {
                        const Icon = genre.icon;
                        return (
                            <motion.div
                                key={genre.name}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.03 }}
                            >
                                <Link 
                                    href={`/search?genre=${genre.name}`}
                                    className="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-white/20 transition-all duration-500"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                                    
                                    {/* Icon Background Decoration */}
                                    <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${genre.color} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />
                                    
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20">
                                        <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center ${genre.color} shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white group-hover:text-orange-400 transition-colors">
                                            {genre.name}
                                        </h3>
                                        <p className="text-[10px] text-[var(--text-muted)] mt-1 opacity-100 group-hover:text-white/60 transition-colors">
                                            {genre.desc}
                                        </p>
                                    </div>

                                    {/* Decorative underline */}
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:via-white/30 transition-all duration-500" />
                                </Link>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}
