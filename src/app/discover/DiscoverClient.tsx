"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Sparkles, Loader2, Search, ArrowLeft, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { MovieGrid } from "@/components/MovieCard";

const SUGGESTIONS = [
    { text: "Sad romance anime", desc: "Tearjerkers with beautiful animation", emoji: "🌸", gradient: "from-pink-500/10 via-rose-500/5 to-transparent hover:border-pink-500/30" },
    { text: "Cyberpunk", desc: "Neon aesthetics and futuristic tech", emoji: "🌌", gradient: "from-purple-500/10 via-indigo-500/5 to-transparent hover:border-purple-500/30" },
    { text: "Mind bending", desc: "Psychological thrillers and plot twists", emoji: "🧠", gradient: "from-blue-500/10 via-cyan-500/5 to-transparent hover:border-blue-500/30" },
    { text: "Horror", desc: "Scary slow-burns and suspense", emoji: "💀", gradient: "from-red-500/10 via-orange-500/5 to-transparent hover:border-red-500/30" },
    { text: "Kdrama", desc: "Comforting romantic comedies and dramas", emoji: "🇰🇷", gradient: "from-emerald-500/10 via-teal-500/5 to-transparent hover:border-emerald-500/30" },
    { text: "Studio Ghibli", desc: "Cozy vibes and magical storytelling", emoji: "🌳", gradient: "from-green-500/10 via-emerald-500/5 to-transparent hover:border-green-500/30" },
    { text: "Fantasy", desc: "Epic high fantasy and magic worlds", emoji: "🛡️", gradient: "from-amber-500/10 via-yellow-500/5 to-transparent hover:border-amber-500/30" },
];

const PLACEHOLDERS = [
    "sad romance anime with beautiful visuals...",
    "mind bending sci-fi thriller with plot twists...",
    "cyberpunk neon aesthetic with deep story...",
    "cozy comforting Studio Ghibli vibes...",
    "epic high fantasy with magic and dragons...",
    "scary slow-burn psychological horror...",
];

export default function DiscoverPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const prompt = searchParams?.get("prompt") || "";

    const [input, setInput] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Typing effect for input placeholder
    const [placeholderText, setPlaceholderText] = useState("");
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [charIndex, setCharIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        const currentSentence = PLACEHOLDERS[placeholderIndex];

        if (isDeleting) {
            timer = setTimeout(() => {
                setPlaceholderText(currentSentence.substring(0, charIndex - 1));
                setCharIndex(prev => prev - 1);
            }, 30);
        } else {
            timer = setTimeout(() => {
                setPlaceholderText(currentSentence.substring(0, charIndex + 1));
                setCharIndex(prev => prev + 1);
            }, 60);
        }

        if (!isDeleting && charIndex === currentSentence.length) {
            timer = setTimeout(() => setIsDeleting(true), 1500); // Wait before delete
        } else if (isDeleting && charIndex === 0) {
            setIsDeleting(false);
            setPlaceholderIndex(prev => (prev + 1) % PLACEHOLDERS.length);
        }

        return () => clearTimeout(timer);
    }, [charIndex, isDeleting, placeholderIndex]);

    useEffect(() => {
        if (!prompt) {
            setResults([]);
            setLoading(false);
            return;
        }

        const fetchDiscovery = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.get("/api/discover", { params: { prompt } });
                setResults(res.data.results || []);
            } catch (err) {
                console.error("Discovery error:", err);
                setError("Failed to fetch discovery results. Please try another query.");
            } finally {
                setLoading(false);
            }
        };

        fetchDiscovery();
        setInput(prompt);
    }, [prompt]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        router.push(`/discover?prompt=${encodeURIComponent(input.trim())}`);
    };

    const handleSuggestionClick = (text: string) => {
        setInput(text);
        router.push(`/discover?prompt=${encodeURIComponent(text)}`);
    };

    return (
        <main className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] pt-24 pb-20 px-6 md:px-12">
            <div className="max-w-6xl mx-auto w-full flex flex-col min-h-[75vh]">
                
                {/* Back button */}
                {prompt && (
                    <div className="mb-6 flex justify-start">
                        <button 
                            onClick={() => {
                                setInput("");
                                router.push("/discover");
                            }}
                            className="flex items-center gap-2 text-[var(--text-muted)] hover:text-white font-bold transition-colors text-xs py-1.5 px-3 bg-[var(--bg-card)]/40 border border-[var(--border-color)] rounded-xl"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" /> Back to Console
                        </button>
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {!prompt ? (
                        // ChatGPT style prompt setup
                        <motion.div 
                            key="input-view"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                            className="flex-1 flex flex-col justify-center max-w-3xl mx-auto w-full py-10"
                        >
                            <div className="text-center mb-10 space-y-4">
                                <div className="inline-flex w-16 h-16 rounded-3xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 items-center justify-center shadow-[0_0_30px_var(--accent-glow)] mb-4">
                                    <Sparkles className="w-8 h-8 text-[var(--accent)]" />
                                </div>
                                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight font-sora">
                                    ToonPlayer <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)]">AI Discovery</span>
                                </h1>
                                <p className="text-[var(--text-muted)] font-medium text-sm md:text-base">
                                    Describe what you're in the mood for, and our AI will search across movie networks and anime catalogs.
                                </p>
                            </div>

                            {/* Chat Form */}
                            <form onSubmit={handleSubmit} className="relative mb-12">
                                <div className="relative flex items-center bg-[var(--bg-card)]/40 border border-[var(--border-color)] focus-within:border-[var(--accent)]/50 focus-within:shadow-[0_0_24px_var(--accent-glow)] rounded-3xl p-2 transition-all duration-300 backdrop-blur-md">
                                    <input 
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder={placeholderText}
                                        className="w-full bg-transparent pl-4 pr-12 py-3 text-sm md:text-base text-white outline-none placeholder-white/30"
                                    />
                                    <button 
                                        type="submit"
                                        disabled={!input.trim()}
                                        className="absolute right-3.5 w-10 h-10 rounded-2xl bg-[var(--accent)] text-white hover:bg-[var(--accent-secondary)] disabled:opacity-30 disabled:hover:bg-[var(--accent)] transition-all flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </form>

                            {/* Suggestions grid */}
                            <div className="space-y-4">
                                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">Try these suggestions:</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {SUGGESTIONS.map((sug, i) => (
                                        <button
                                            key={sug.text}
                                            onClick={() => handleSuggestionClick(sug.text)}
                                            className={`group p-4 rounded-2xl bg-[var(--bg-card)]/40 border border-[var(--border-color)] backdrop-blur-md text-left flex flex-col justify-between transition-all duration-300 bg-gradient-to-br ${sug.gradient} hover:shadow-lg`}
                                        >
                                            <div className="flex items-center justify-between w-full mb-1">
                                                <span className="text-xl">{sug.emoji}</span>
                                                <Sparkles className="w-3.5 h-3.5 text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-white tracking-tight">{sug.text}</h3>
                                                <p className="text-[10px] text-[var(--text-muted)] mt-1 font-medium group-hover:text-white/80 transition-colors line-clamp-1">{sug.desc}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        // Results console view
                        <motion.div 
                            key="results-view"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex-1 w-full"
                        >
                            {/* Search edit bar */}
                            <form onSubmit={handleSubmit} className="mb-10 max-w-3xl">
                                <div className="relative flex items-center bg-[var(--bg-card)]/40 border border-[var(--border-color)] focus-within:border-[var(--accent)]/55 focus-within:shadow-[0_0_24px_var(--accent-glow)] rounded-2xl p-1.5 transition-all duration-300 backdrop-blur-md">
                                    <Search className="w-5 h-5 ml-3 text-[var(--text-muted)]" />
                                    <input 
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        className="w-full bg-transparent px-3 py-2 text-sm text-white outline-none"
                                        placeholder="Modify AI query..."
                                    />
                                    <button 
                                        type="submit"
                                        disabled={!input.trim() || loading}
                                        className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white hover:bg-[var(--accent-secondary)] disabled:opacity-50 text-xs font-bold transition-colors cursor-pointer"
                                    >
                                        Ask AI
                                    </button>
                                </div>
                            </form>

                            {/* Loading State */}
                            {loading && (
                                <div className="py-24 flex flex-col items-center justify-center space-y-4">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-[var(--accent)] blur-2xl opacity-20 rounded-full animate-pulse scale-150" />
                                        <Loader2 className="w-12 h-12 text-[var(--accent)] animate-spin relative z-10" />
                                    </div>
                                    <div className="text-center space-y-1.5">
                                        <p className="text-sm font-black text-[var(--accent)] uppercase tracking-widest animate-pulse">Analyzing Prompt...</p>
                                        <p className="text-xs text-[var(--text-muted)] font-medium max-w-xs leading-relaxed">AI is parsing keywords, analyzing database index layers, and fetching metadata links.</p>
                                    </div>
                                </div>
                            )}

                            {/* Error State */}
                            {!loading && error && (
                                <div className="py-20 flex flex-col items-center justify-center text-center max-w-md mx-auto">
                                    <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
                                        <Search className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Something went wrong</h3>
                                    <p className="text-[var(--text-muted)] text-sm mb-6">{error}</p>
                                </div>
                            )}

                            {/* Results list */}
                            {!loading && !error && results.length > 0 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                                        <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                                            <Sparkles className="w-5 h-5 text-[var(--accent)]" /> Mapped Recommendations
                                        </h2>
                                        <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-card)] border border-[var(--border-color)] px-2.5 py-0.5 rounded-full">{results.length} matched</span>
                                    </div>
                                    <MovieGrid items={results} />
                                </div>
                            )}

                            {/* Empty Results */}
                            {!loading && !error && results.length === 0 && (
                                <div className="py-20 flex flex-col items-center justify-center text-center opacity-60">
                                    <Search className="w-16 h-16 text-[var(--text-muted)] mb-6" />
                                    <h3 className="text-xl font-bold text-white mb-2">No recommendations found</h3>
                                    <p className="text-[var(--text-muted)] text-sm">Try using different keywords or simpler request phrases.</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </main>
    );
}
