"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, Search, Play, Compass, Frown, Smile, Flame, Coffee, Share2, Loader2, TrendingUp, X, Film, Star, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import axios from "axios";

const MOODS = [
    { id: "happy", icon: Smile, label: "Happy", emoji: "😄", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", ring: "ring-green-500", genres: ["Comedy", "Animation", "Family"], anilistGenres: ["Comedy", "Slice of Life"], tmdbGenreIds: [35, 16, 10751] },
    { id: "sad", icon: Frown, label: "Emotional", emoji: "😢", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", ring: "ring-blue-500", genres: ["Drama", "Romance"], anilistGenres: ["Drama", "Romance", "Tragedy"], tmdbGenreIds: [18, 10749] },
    { id: "action", icon: Flame, label: "Action & Hype", emoji: "🔥", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", ring: "ring-red-500", genres: ["Action", "Adventure", "Thriller"], anilistGenres: ["Action", "Adventure", "Shounen"], tmdbGenreIds: [28, 12, 53] },
    { id: "chill", icon: Coffee, label: "Chill & Relax", emoji: "☕", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", ring: "ring-amber-500", genres: ["Slice of Life", "Romance", "Mystery"], anilistGenres: ["Slice of Life", "Iyashikei"], tmdbGenreIds: [10749, 14, 9648] },
];

// Keyword → Genre mapping for AI-style natural language search
const KEYWORD_MAP: Record<string, { genres: string[]; tmdbGenreIds: number[] }> = {
    sad: { genres: ["Drama"], tmdbGenreIds: [18] },
    crying: { genres: ["Drama", "Romance"], tmdbGenreIds: [18, 10749] },
    heartbreak: { genres: ["Drama", "Romance"], tmdbGenreIds: [18, 10749] },
    emotional: { genres: ["Drama"], tmdbGenreIds: [18] },
    fight: { genres: ["Action"], tmdbGenreIds: [28] },
    epic: { genres: ["Action", "Adventure"], tmdbGenreIds: [28, 12] },
    power: { genres: ["Action", "Sci-Fi"], tmdbGenreIds: [28, 878] },
    battle: { genres: ["Action"], tmdbGenreIds: [28] },
    funny: { genres: ["Comedy"], tmdbGenreIds: [35] },
    laugh: { genres: ["Comedy"], tmdbGenreIds: [35] },
    comedy: { genres: ["Comedy"], tmdbGenreIds: [35] },
    horror: { genres: ["Horror"], tmdbGenreIds: [27] },
    scary: { genres: ["Horror", "Thriller"], tmdbGenreIds: [27, 53] },
    romance: { genres: ["Romance"], tmdbGenreIds: [10749] },
    love: { genres: ["Romance", "Drama"], tmdbGenreIds: [10749, 18] },
    magic: { genres: ["Fantasy", "Animation"], tmdbGenreIds: [14, 16] },
    fantasy: { genres: ["Fantasy"], tmdbGenreIds: [14] },
    scifi: { genres: ["Science Fiction"], tmdbGenreIds: [878] },
    space: { genres: ["Science Fiction", "Adventure"], tmdbGenreIds: [878, 12] },
    detective: { genres: ["Mystery", "Crime"], tmdbGenreIds: [9648, 80] },
    mystery: { genres: ["Mystery"], tmdbGenreIds: [9648] },
    relax: { genres: ["Family", "Animation"], tmdbGenreIds: [10751, 16] },
    chill: { genres: ["Family", "Comedy"], tmdbGenreIds: [10751, 35] },
    adventure: { genres: ["Adventure"], tmdbGenreIds: [12] },
};

interface ContentResult {
    id: string | number;
    title: string;
    image: string;
    year: string | number;
    rating: string | number;
    genre: string;
    type: "movie" | "tv" | "anime";
    href: string;
}

function resolveKeywordGenres(query: string): { genres: string[]; tmdbGenreIds: number[] } | null {
    const lower = query.toLowerCase();
    for (const [keyword, mapping] of Object.entries(KEYWORD_MAP)) {
        if (lower.includes(keyword)) return mapping;
    }
    return null;
}

async function fetchByGenre(tmdbGenreIds: number[]): Promise<ContentResult[]> {
    const genreParam = tmdbGenreIds.join(",");
    const res = await axios.get(`/api/prime/discover?genre=${genreParam}&sort=popularity.desc&page=1`);
    return (res.data?.results || []).slice(0, 9).map((item: any) => ({
        id: item.id,
        title: item.title || item.name,
        image: item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : "",
        year: (item.release_date || item.first_air_date || "").slice(0, 4),
        rating: item.vote_average?.toFixed(1) || "N/A",
        genre: item.genre_ids?.[0] || "",
        type: item.media_type === "tv" ? "tv" : "movie",
        href: `/watch/${item.media_type === "tv" ? "tv" : "movie"}/${item.id}`,
    }));
}

async function fetchByTextQuery(query: string): Promise<ContentResult[]> {
    const res = await axios.get(`/api/prime/search?query=${encodeURIComponent(query)}`);
    return (res.data?.results || []).slice(0, 9).map((item: any) => ({
        id: item.id,
        title: item.title || item.name,
        image: item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : "",
        year: (item.release_date || item.first_air_date || "").slice(0, 4),
        rating: item.vote_average?.toFixed(1) || "N/A",
        genre: "",
        type: item.media_type === "tv" ? "tv" : "movie",
        href: `/watch/${item.media_type === "tv" ? "tv" : "movie"}/${item.id}`,
    }));
}

const SUGGESTIONS = [
    "Emotional anime scenes", "Best epic fights", "Funny moments", "Heartbreaking dramas", "Space adventures", "Mystery thrillers"
];

export default function DiscoverPage() {
    const [sceneSearch, setSceneSearch] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<ContentResult[] | null>(null);
    const [searchLabel, setSearchLabel] = useState("");
    const [selectedMood, setSelectedMood] = useState<string | null>(null);
    const [moodResults, setMoodResults] = useState<ContentResult[]>([]);
    const [isMoodLoading, setIsMoodLoading] = useState(false);
    const router = useRouter();

    const handleMoodSelect = useCallback(async (moodId: string) => {
        const mood = MOODS.find(m => m.id === moodId);
        if (!mood) return;

        if (selectedMood === moodId) {
            setSelectedMood(null);
            setMoodResults([]);
            return;
        }

        setSelectedMood(moodId);
        setIsMoodLoading(true);
        setMoodResults([]);

        try {
            const results = await fetchByGenre(mood.tmdbGenreIds);
            setMoodResults(results);
        } catch (e) {
            toast.error("Could not load mood results. Try again.");
        } finally {
            setIsMoodLoading(false);
        }
    }, [selectedMood]);

    const handleSearch = useCallback(async (e?: React.FormEvent, overrideQuery?: string) => {
        if (e) e.preventDefault();
        const query = overrideQuery ?? sceneSearch;
        if (!query.trim()) return;

        setIsSearching(true);
        setSearchResults(null);
        setSearchLabel(query);

        try {
            const keywordMatch = resolveKeywordGenres(query);
            let results: ContentResult[];

            if (keywordMatch) {
                // AI mode: keyword matched → fetch by genre
                results = await fetchByGenre(keywordMatch.tmdbGenreIds);
            } else {
                // Direct search mode
                results = await fetchByTextQuery(query);
            }

            setSearchResults(results);
        } catch (e) {
            toast.error("Search failed. Please try again.");
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, [sceneSearch]);

    const activeMood = MOODS.find(m => m.id === selectedMood);

    return (
        <main className="bg-[var(--bg-main)] text-[var(--text-main)] pt-[max(4rem,env(safe-area-inset-top))] md:pt-16 pb-24 md:pl-[72px]">
            <div className="w-full px-4 md:px-8 py-6 space-y-12">

                {/* Header */}
                <div className="flex flex-col items-center justify-center text-center w-full mx-auto space-y-4 pt-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-bold uppercase tracking-widest mb-2">
                        <Sparkles className="w-4 h-4" />
                        AI Powered Discovery
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black font-sora text-white tracking-tight">
                        Find What You <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Love.</span>
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm md:text-base leading-relaxed">
                        Describe a feeling, a mood, or a vibe. Our AI engine maps your words to the perfect content.
                    </p>
                </div>

                {/* AI Search */}
                <div className="relative w-full mx-auto">
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-20" />
                    <form onSubmit={handleSearch} className="relative bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-2 shadow-2xl flex items-center">
                        <div className="px-4 text-[var(--text-muted)]">
                            <Search className="w-5 h-5" />
                        </div>
                        <input
                            type="text"
                            placeholder='Try "emotional farewell" or "epic space battle"...'
                            value={sceneSearch}
                            onChange={(e) => setSceneSearch(e.target.value)}
                            className="flex-1 bg-transparent border-none text-white focus:outline-none text-base font-inter h-14"
                        />
                        {sceneSearch && (
                            <button type="button" onClick={() => { setSceneSearch(""); setSearchResults(null); }} className="p-2 text-[var(--text-muted)] hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={isSearching || !sceneSearch.trim()}
                            className="px-6 py-3 bg-white text-black font-black rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
                        >
                            {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-4 h-4" />AI Search</>}
                        </button>
                    </form>

                    {/* Suggestion Chips */}
                    {!searchResults && (
                        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                            {SUGGESTIONS.map(s => (
                                <button
                                    key={s}
                                    onClick={() => { setSceneSearch(s); handleSearch(undefined, s); }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-white hover:border-purple-500/40 transition-colors"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* AI Search Results */}
                <AnimatePresence>
                    {searchResults !== null && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="max-w-5xl mx-auto bg-[var(--bg-card)] border border-purple-500/30 rounded-2xl p-6 shadow-2xl shadow-purple-500/10"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-white font-sora">
                                        AI Results <span className="text-purple-400">✦</span>
                                    </h3>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                        Showing results for "{searchLabel}" — {searchResults.length} found
                                    </p>
                                </div>
                                <button onClick={() => { setSearchResults(null); setSearchLabel(""); }} className="text-sm font-bold text-[var(--text-muted)] hover:text-white transition-colors flex items-center gap-1">
                                    <X className="w-4 h-4" /> Clear
                                </button>
                            </div>

                            {searchResults.length === 0 ? (
                                <div className="py-16 text-center opacity-50">
                                    <Film className="w-12 h-12 mx-auto mb-3 text-[var(--text-muted)]" />
                                    <p className="font-bold text-white">No results found</p>
                                    <p className="text-sm text-[var(--text-muted)] mt-1">Try different keywords or a mood button below</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {searchResults.map((item) => (
                                        <motion.div
                                            key={`${item.type}-${item.id}`}
                                            whileHover={{ y: -4 }}
                                            onClick={() => router.push(item.href)}
                                            className="group cursor-pointer"
                                        >
                                            <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800 mb-2">
                                                {item.image ? (
                                                    <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Film className="w-8 h-8 text-zinc-600" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                                                        <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                                                    </div>
                                                </div>
                                                <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-md">
                                                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                                    <span className="text-[10px] font-bold text-white">{item.rating}</span>
                                                </div>
                                            </div>
                                            <p className="text-xs font-bold text-white truncate group-hover:text-purple-400 transition-colors">{item.title}</p>
                                            <p className="text-[10px] text-[var(--text-muted)]">{item.year} · {item.type.toUpperCase()}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Mood Section */}
                <div className="pt-4">
                    <div className="flex items-center gap-3 mb-6">
                        <Compass className="w-6 h-6 text-pink-400" />
                        <h2 className="text-2xl font-bold text-white font-sora">What's your mood today?</h2>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {MOODS.map(mood => {
                            const Icon = mood.icon;
                            const isSelected = selectedMood === mood.id;
                            return (
                                <motion.button
                                    key={mood.id}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => handleMoodSelect(mood.id)}
                                    className={`relative p-6 rounded-2xl border transition-all duration-300 text-left overflow-hidden group ${isSelected
                                            ? `${mood.bg} ${mood.border} ring-2 ring-offset-2 ring-offset-[var(--bg-main)] ${mood.ring} shadow-xl`
                                            : "bg-[var(--bg-card)] border-[var(--border-color)] hover:border-white/20"
                                        }`}
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 ${isSelected ? mood.bg : 'bg-white/5'}`}>
                                        <Icon className={`w-6 h-6 ${isSelected ? mood.color : 'text-[var(--text-muted)]'}`} />
                                    </div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-lg">{mood.emoji}</span>
                                        <h3 className={`font-bold text-base font-sora ${isSelected ? 'text-white' : 'text-[var(--text-main)]'}`}>{mood.label}</h3>
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)]">{mood.genres.join(", ")}</p>

                                    {isSelected && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            className="mt-3 pt-3 border-t border-white/10"
                                        >
                                            {isMoodLoading ? (
                                                <div className="flex items-center gap-2">
                                                    <Loader2 className={`w-3 h-3 animate-spin ${mood.color}`} />
                                                    <span className={`text-[10px] font-black ${mood.color}`}>Finding matches...</span>
                                                </div>
                                            ) : (
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${mood.color}`}>
                                                    {moodResults.length} results loaded ↓
                                                </span>
                                            )}
                                        </motion.div>
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>

                    {/* Mood Results Grid */}
                    <AnimatePresence>
                        {activeMood && moodResults.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className={`mt-6 p-6 rounded-2xl border ${activeMood.border} ${activeMood.bg}`}
                            >
                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{activeMood.emoji}</span>
                                        <div>
                                            <h4 className={`font-black text-white`}>{activeMood.label} Picks</h4>
                                            <p className="text-[11px] text-[var(--text-muted)]">{activeMood.genres.join(" · ")} · Curated for you</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => router.push(`/search?genre=${activeMood.genres[0]}`)}
                                        className={`text-xs font-black uppercase tracking-widest ${activeMood.color} hover:text-white transition-colors`}
                                    >
                                        View All →
                                    </button>
                                </div>

                                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-9 gap-3">
                                    {moodResults.map((item) => (
                                        <motion.div
                                            key={`${item.type}-${item.id}`}
                                            whileHover={{ y: -4 }}
                                            onClick={() => router.push(item.href)}
                                            className="group cursor-pointer"
                                        >
                                            <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800 mb-1.5">
                                                {item.image ? (
                                                    <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Film className="w-6 h-6 text-zinc-600" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                                        <Play className="w-3 h-3 text-white fill-white ml-0.5" />
                                                    </div>
                                                </div>
                                                <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-black/60 backdrop-blur-sm px-1 py-0.5 rounded">
                                                    <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                                                    <span className="text-[9px] font-bold text-white">{item.rating}</span>
                                                </div>
                                            </div>
                                            <p className="text-[10px] font-bold text-white truncate group-hover:text-purple-400 transition-colors leading-tight">{item.title}</p>
                                            <p className="text-[9px] text-[var(--text-muted)]">{item.year}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </main>
    );
}
