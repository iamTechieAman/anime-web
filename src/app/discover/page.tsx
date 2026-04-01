"use client";

import { useState } from "react";
import { Sparkles, Search, Play, Compass, Frown, Smile, Flame, Coffee, Share2, Loader2 } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

const MOODS = [
    { id: "happy", icon: Smile, label: "Happy", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
    { id: "sad", icon: Frown, label: "Emotional", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    { id: "action", icon: Flame, label: "Action & Hype", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
    { id: "chill", icon: Coffee, label: "Chill & Relax", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" }
];

const SCENE_SUGGESTIONS = [
    "Sad anime scenes", "Best anime fights", "Goku transformation", "Funny anime moments"
];

// Mock mapped results for AI scene search
const mockScenes = [
    { title: "Epic Final Battle", show: "Demon Slayer", duration: "2:45", img: "https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJHS6zeJBf1.jpg" },
    { title: "Emotional Farewell", show: "Your Lie in April", duration: "3:10", img: "https://image.tmdb.org/t/p/w500/1yepeH9pQeR0pY956N3ySihs48H.jpg" },
    { title: "Surprise Attack Strategy", show: "Attack on Titan", duration: "1:15", img: "https://image.tmdb.org/t/p/w500/1k1Bnn610Bq5a2A9Q70sZgR10gS.jpg" },
];

export default function DiscoverPage() {
    const [sceneSearch, setSceneSearch] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<typeof mockScenes | null>(null);
    const [selectedMood, setSelectedMood] = useState<string | null>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!sceneSearch.trim()) return;
        setIsSearching(true);
        // Mock network delay for "AI Processing"
        setTimeout(() => {
            setSearchResults(mockScenes.sort(() => 0.5 - Math.random()));
            setIsSearching(false);
        }, 1500);
    };

    return (
        <main className="min-h-[100dvh] bg-[var(--bg-main)] text-[var(--text-main)] pt-[max(4rem,env(safe-area-inset-top))] md:pt-16 pb-24 md:pl-[72px]">
            <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-12">
                
                {/* Header Page */}
                <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-4 pt-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-bold uppercase tracking-widest mb-2">
                        <Sparkles className="w-4 h-4" />
                        AI Powered Discovery
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black font-sora text-white tracking-tight">
                        Find What You <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Love.</span>
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm md:text-base leading-relaxed">
                        Describe a feeling, a mood, or an exact scene you have in mind. Our AI engine will find it for you to watch, clip, and share.
                    </p>
                </div>

                {/* AI Scene Search Section */}
                <div className="relative max-w-3xl mx-auto">
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                    <form onSubmit={handleSearch} className="relative bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-2 shadow-2xl flex items-center">
                        <div className="px-4 text-[var(--text-muted)]">
                            <Search className="w-5 h-5" />
                        </div>
                        <input 
                            type="text" 
                            placeholder='Try "Best epic fights" or "Sad emotional scenes"...'
                            value={sceneSearch}
                            onChange={(e) => setSceneSearch(e.target.value)}
                            className="flex-1 bg-transparent border-none text-white focus:outline-none text-base font-inter h-14"
                        />
                        <button 
                            type="submit"
                            disabled={isSearching || !sceneSearch.trim()}
                            className="px-6 py-3 bg-white text-black font-black rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search AI"}
                        </button>
                    </form>

                    {/* Suggestions */}
                    {!searchResults && (
                        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                            {SCENE_SUGGESTIONS.map(s => (
                                <button 
                                    key={s} 
                                    onClick={() => setSceneSearch(s)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-white transition-colors"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Search Results */}
                <AnimatePresence>
                    {searchResults && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-4xl mx-auto bg-[var(--bg-card)] border border-purple-500/30 rounded-2xl p-6 shadow-2xl shadow-purple-500/10"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-white font-sora">AI Scene Results</h3>
                                <button onClick={() => setSearchResults(null)} className="text-sm font-bold text-[var(--text-muted)] hover:text-white">Clear</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {searchResults.map((scene, i) => (
                                    <div key={i} className="group relative rounded-xl overflow-hidden aspect-video bg-black/40 border border-white/5">
                                        <img src={scene.img} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                                        <div className="absolute bottom-0 inset-x-0 p-3">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-purple-400">{scene.show}</p>
                                            <h4 className="text-sm font-bold text-white leading-tight mb-2">{scene.title}</h4>
                                            <div className="flex items-center gap-2">
                                                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black rounded-lg text-xs font-black shadow-lg hover:scale-105 transition-transform">
                                                    <Play className="w-3 h-3 fill-current ml-0.5" /> Watch
                                                </button>
                                                <button 
                                                    onClick={() => toast.success("Scene clipped directly to clipboard!")}
                                                    className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-colors"
                                                    title="Clip & Share"
                                                >
                                                    <Share2 className="w-3.5 h-3.5" />
                                                </button>
                                                <span className="ml-auto text-[10px] font-bold text-white/50">{scene.duration}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Mood Based Selections */}
                <div className="pt-8">
                    <div className="flex items-center gap-3 mb-6">
                        <Compass className="w-6 h-6 text-pink-400" />
                        <h2 className="text-2xl font-bold text-white font-sora">What's your mood today?</h2>
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {MOODS.map(mood => {
                            const Icon = mood.icon;
                            const isSelected = selectedMood === mood.id;
                            return (
                                <button
                                    key={mood.id}
                                    onClick={() => setSelectedMood(isSelected ? null : mood.id)}
                                    className={`relative p-6 rounded-2xl border transition-all duration-300 text-left overflow-hidden group ${
                                        isSelected 
                                            ? `${mood.bg} ${mood.border} ring-2 ring-offset-2 ring-offset-[var(--bg-main)] ring-${mood.color.split('-')[1]}-500 shadow-xl` 
                                            : "bg-[var(--bg-card)] border-[var(--border-color)] hover:border-white/20"
                                    }`}
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 ${isSelected ? mood.bg : 'bg-white/5'}`}>
                                        <Icon className={`w-6 h-6 ${isSelected ? mood.color : 'text-[var(--text-muted)]'}`} />
                                    </div>
                                    <h3 className={`font-bold text-lg mb-1 font-sora ${isSelected ? 'text-white' : 'text-[var(--text-main)]'}`}>{mood.label}</h3>
                                    <p className="text-xs text-[var(--text-muted)]">Curated list matching this vibe</p>
                                    
                                    {isSelected && (
                                        <div className="mt-4 pt-4 border-t border-white/10 flex justify-end">
                                            <Link 
                                                // Link to a filtered search results page mock
                                                href={`/search?query=anime`} 
                                                className={`text-xs font-black uppercase tracking-widest ${mood.color} hover:text-white transition-colors flex items-center gap-1`}
                                            >
                                                Explore Now &rarr;
                                            </Link>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </main>
    );
}
