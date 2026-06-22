"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Film, Tv, Shuffle, Calendar, Award, Building2, Flame } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

// TMDB & AniList random pool constants
const POPULAR_MOVIES = ["1084244", "155", "27205", "157336", "299534", "129", "372058", "671", "120", "121", "122", "858"];
const POPULAR_ANIME = ["11061", "16498", "21511", "5114", "1535", "19", "20", "2251", "101922", "113415", "140960"];
const POPULAR_SHOWS = ["94605", "60625", "1396", "60059", "119051", "66732", "82856", "71446", "1434", "63174"];
const GENRES = ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mystery", "Romance", "Sci-Fi", "Thriller"];
const STUDIOS = ["A24", "Paramount", "Sony Pictures", "Legendary", "Lionsgate", "Disney", "Marvel Studios", "Warner Bros.", "Pixar", "Universal Pictures"];
const TOP_RATED = [
    { type: "movie", id: "278" }, // Shawshank Redemption
    { type: "movie", id: "238" }, // The Godfather
    { type: "movie", id: "155" }, // The Dark Knight
    { type: "movie", id: "129" }, // Spirited Away
    { type: "anime", id: "5114" }, // Fullmetal Alchemist: Brotherhood
    { type: "anime", id: "16498" }, // Attack on Titan Season 2
    { type: "tv", id: "1396" }, // Breaking Bad
    { type: "tv", id: "94605" }, // Arcane
];

interface RandomizerModalProps {
    onClose: () => void;
}

export default function RandomizerModal({ onClose }: RandomizerModalProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    const handleRandomize = async (mode: string) => {
        setLoading(true);
        try {
            let type = "movie";
            let targetId = "";

            if (mode === "movie") {
                type = "movie";
                targetId = POPULAR_MOVIES[Math.floor(Math.random() * POPULAR_MOVIES.length)];
                toast.success("Chosen a blockbuster Movie for you!", { icon: "🎬" });
                router.push(`/watch/${type}/${targetId}`);
            } else if (mode === "anime") {
                type = "anime";
                targetId = POPULAR_ANIME[Math.floor(Math.random() * POPULAR_ANIME.length)];
                toast.success("Fate selected a popular Anime for you!", { icon: "🎏" });
                router.push(`/watch/anime/${targetId}`);
            } else if (mode === "genre") {
                const pickedGenre = GENRES[Math.floor(Math.random() * GENRES.length)];
                toast.success(`Picked Genre: ${pickedGenre}!`);
                router.push(`/search?genre=${pickedGenre}`);
            } else if (mode === "year") {
                const pickedYear = Math.floor(Math.random() * (2026 - 2000 + 1)) + 2000;
                toast.success(`Picked Year: ${pickedYear}!`);
                router.push(`/search?status=Completed&query=${pickedYear}`);
            } else if (mode === "studio") {
                const pickedStudio = STUDIOS[Math.floor(Math.random() * STUDIOS.length)];
                toast.success(`Picked Production House: ${pickedStudio}!`);
                router.push(`/search?query=${encodeURIComponent(pickedStudio)}`);
            } else if (mode === "top") {
                const pick = TOP_RATED[Math.floor(Math.random() * TOP_RATED.length)];
                toast.success("Streaming an acclaimed Top-Rated classic!", { icon: "⭐" });
                if (pick.type === "anime") {
                    router.push(`/watch/anime/${pick.id}`);
                } else {
                    router.push(`/watch/${pick.type}/${pick.id}`);
                }
            } else {
                // Surprise Me - completely random
                const chance = Math.random();
                if (chance < 0.33) {
                    type = "movie";
                    targetId = POPULAR_MOVIES[Math.floor(Math.random() * POPULAR_MOVIES.length)];
                    router.push(`/watch/${type}/${targetId}`);
                } else if (chance < 0.66) {
                    type = "anime";
                    targetId = POPULAR_ANIME[Math.floor(Math.random() * POPULAR_ANIME.length)];
                    router.push(`/watch/anime/${targetId}`);
                } else {
                    type = "tv";
                    targetId = POPULAR_SHOWS[Math.floor(Math.random() * POPULAR_SHOWS.length)];
                    router.push(`/watch/${type}/${targetId}`);
                }
                toast.success("Destiny has chosen! Enjoy the stream...", { icon: "✨" });
            }

            onClose();
        } catch (err) {
            toast.error("Fate is fluctuating. Try again!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md cursor-pointer"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 15 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg bg-[var(--bg-elevated)]/95 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden cursor-default"
            >
                <button 
                    onClick={onClose}
                    aria-label="Close randomizer"
                    className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-500">
                        <Sparkles className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white font-sora tracking-tight">Surprise Me</h2>
                        <p className="text-xs text-zinc-400">Can't decide? Let fate choose your next watch.</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <button
                        disabled={loading}
                        onClick={() => handleRandomize("surprise")}
                        className="col-span-2 flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 active:scale-[0.98] text-white font-black text-sm rounded-xl transition-all shadow-lg shadow-pink-500/10"
                    >
                        <Shuffle className="w-4 h-4 animate-spin" />
                        SURPRISE ME
                    </button>
                    
                    <button
                        disabled={loading}
                        onClick={() => handleRandomize("movie")}
                        className="flex items-center gap-3 p-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 text-left rounded-xl transition-all"
                    >
                        <Film className="w-4 h-4 text-sky-400" />
                        <div>
                            <div className="text-xs font-bold text-white">Random Movie</div>
                            <div className="text-[10px] text-zinc-500">Blockbusters</div>
                        </div>
                    </button>

                    <button
                        disabled={loading}
                        onClick={() => handleRandomize("anime")}
                        className="flex items-center gap-3 p-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 text-left rounded-xl transition-all"
                    >
                        <Tv className="w-4 h-4 text-purple-400" />
                        <div>
                            <div className="text-xs font-bold text-white">Random Anime</div>
                            <div className="text-[10px] text-zinc-500">Japanese Classics</div>
                        </div>
                    </button>

                    <button
                        disabled={loading}
                        onClick={() => handleRandomize("genre")}
                        className="flex items-center gap-3 p-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 text-left rounded-xl transition-all"
                    >
                        <Award className="w-4 h-4 text-amber-400" />
                        <div>
                            <div className="text-xs font-bold text-white">Random Genre</div>
                            <div className="text-[10px] text-zinc-500">Custom Category</div>
                        </div>
                    </button>

                    <button
                        disabled={loading}
                        onClick={() => handleRandomize("year")}
                        className="flex items-center gap-3 p-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 text-left rounded-xl transition-all"
                    >
                        <Calendar className="w-4 h-4 text-emerald-400" />
                        <div>
                            <div className="text-xs font-bold text-white">Random Year</div>
                            <div className="text-[10px] text-zinc-500">Retro to Modern</div>
                        </div>
                    </button>

                    <button
                        disabled={loading}
                        onClick={() => handleRandomize("studio")}
                        className="flex items-center gap-3 p-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 text-left rounded-xl transition-all"
                    >
                        <Building2 className="w-4 h-4 text-orange-400" />
                        <div>
                            <div className="text-xs font-bold text-white">Random Studio</div>
                            <div className="text-[10px] text-zinc-500">Marvel, MAPPA, etc</div>
                        </div>
                    </button>

                    <button
                        disabled={loading}
                        onClick={() => handleRandomize("top")}
                        className="flex items-center gap-3 p-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 text-left rounded-xl transition-all"
                    >
                        <Flame className="w-4 h-4 text-red-400" />
                        <div>
                            <div className="text-xs font-bold text-white">Top Rated</div>
                            <div className="text-[10px] text-zinc-500">IMDb 8.5+ Classics</div>
                        </div>
                    </button>
                </div>

                <div className="text-[10px] text-center text-zinc-600 font-bold uppercase tracking-widest">
                    Tip: Press <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-400 font-normal">R</kbd> anywhere to trigger
                </div>
            </motion.div>
        </motion.div>
    );
}
