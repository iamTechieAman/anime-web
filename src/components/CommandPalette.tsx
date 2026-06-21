"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Film, Tv, Clock, Compass, X, Command, Mic, MicOff, Pin, PinOff, Sparkles, User, Tag, HelpCircle, Layers } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Image from "next/image";

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
}

const GENRES = ["Action", "Adventure", "Animation", "Comedy", "Crime", "Drama", "Fantasy", "Horror", "Romance", "Sci-Fi", "Thriller"];
const COLLECTIONS = ["Trending Now", "Premium 4K", "Classic Animes", "Netflix Originals", "Crunchyroll Hits"];

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [pinnedSearches, setPinnedSearches] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);

    function saveSearch(q: string) {
        const updated = [q, ...recentSearches.filter(x => x !== q)].slice(0, 8);
        setRecentSearches(updated);
        localStorage.setItem("toonplayer_recent_searches", JSON.stringify(updated));
    }

    function togglePin(q: string, e: React.MouseEvent) {
        e.stopPropagation();
        let updated;
        if (pinnedSearches.includes(q)) {
            updated = pinnedSearches.filter(x => x !== q);
        } else {
            updated = [...pinnedSearches, q];
        }
        setPinnedSearches(updated);
        localStorage.setItem("toonplayer_pinned_searches", JSON.stringify(updated));
    }

    function toggleVoice() {
        if (!recognitionRef.current) {
            alert("Speech recognition is not supported in this browser.");
            return;
        }
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
        }
    }

    function getFlattenedItems() {
        const list: any[] = [];
        
        // Static commands
        list.push({
            name: "Surprise Me (Random Picker)",
            action: () => { window.dispatchEvent(new Event("openRandomizer")); onClose(); }
        });
        list.push({
            name: "Browse Movies",
            action: () => { router.push("/browse?type=movie", { scroll: false }); onClose(); }
        });
        list.push({
            name: "Browse TV Shows",
            action: () => { router.push("/browse?type=tv", { scroll: false }); onClose(); }
        });
        list.push({
            name: "AI Discovery (Smart Recommendations)",
            action: () => { router.push("/discover", { scroll: false }); onClose(); }
        });

        // Pinned
        pinnedSearches.forEach(term => {
            list.push({
                name: `Search Pinned: ${term}`,
                action: () => { router.push(`/search?query=${encodeURIComponent(term)}`, { scroll: false }); saveSearch(term); onClose(); }
            });
        });

        // Recents
        recentSearches.forEach(term => {
            list.push({
                name: `Search Recent: ${term}`,
                action: () => { router.push(`/search?query=${encodeURIComponent(term)}`, { scroll: false }); saveSearch(term); onClose(); }
            });
        });

        // Results
        results.forEach(item => {
            list.push({
                name: item.title,
                action: () => { router.push(item.href, { scroll: false }); saveSearch(item.title); onClose(); }
            });
        });

        return list;
    }

    function triggerItemAtIndex(index: number) {
        const items = getFlattenedItems();
        const selected = items[index];
        if (selected) {
            selected.action();
        }
    }

    // Debounce query
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query);
        }, 200);
        return () => clearTimeout(handler);
    }, [query]);

    // Load recent & pinned searches from localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            const recent = localStorage.getItem("toonplayer_recent_searches");
            if (recent) {
                try { setRecentSearches(JSON.parse(recent)); } catch (e) {}
            }
            const pinned = localStorage.getItem("toonplayer_pinned_searches");
            if (pinned) {
                try { setPinnedSearches(JSON.parse(pinned)); } catch (e) {}
            }
        }
    }, [isOpen]);

    // Speech recognition setup
    useEffect(() => {
        if (typeof window !== "undefined") {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const rec = new SpeechRecognition();
                rec.continuous = false;
                rec.interimResults = false;
                rec.lang = "en-US";

                rec.onstart = () => setIsListening(true);
                rec.onend = () => setIsListening(false);
                rec.onresult = (e: any) => {
                    const transcript = e.results[0][0].transcript;
                    if (transcript) setQuery(transcript);
                };
                rec.onerror = () => setIsListening(false);
                recognitionRef.current = rec;
            }
        }
    }, []);

    // Fetch results on query change
    useEffect(() => {
        if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
            setResults([]);
            return;
        }

        setLoading(true);
        axios.get(`/api/search/unified?q=${encodeURIComponent(debouncedQuery)}`)
            .then(res => {
                const items = res.data.results || [];
                setResults(items);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [debouncedQuery]);

    // Auto-focus input on open
    useEffect(() => {
        if (isOpen) {
            setQuery("");
            setActiveIndex(0);
            setTimeout(() => inputRef.current?.focus(), 80);
        }
    }, [isOpen]);

    // Keyboard navigation
    const allItemsCount = results.length + pinnedSearches.length + recentSearches.length + 3; // results + static items
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex(prev => (prev + 1) % allItemsCount);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex(prev => (prev - 1 + allItemsCount) % allItemsCount);
            } else if (e.key === "Enter") {
                e.preventDefault();
                triggerItemAtIndex(activeIndex);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, activeIndex, allItemsCount, results, recentSearches, pinnedSearches]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[130] flex items-start justify-center pt-[10vh] px-4 bg-black/85 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -20 }}
                    className="w-full max-w-2xl bg-[var(--bg-elevated)]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl flex flex-col max-h-[75vh]"
                >
                    {/* Header Input */}
                    <div className="flex items-center gap-3 p-4 border-b border-white/10 shrink-0">
                        <Search className="w-5 h-5 text-zinc-400 shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
                            placeholder="Search anime, movies, actors, collections, genres..."
                            className="w-full bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none outline-none text-white placeholder-zinc-500 text-sm font-semibold"
                        />
                        <button 
                            type="button" 
                            onClick={toggleVoice} 
                            className={`p-2 rounded-xl transition-all ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'hover:bg-white/5 text-zinc-400 hover:text-white'}`}
                            title="Voice Search"
                        >
                            {isListening ? <Mic className="w-4 h-4 text-red-500" /> : <MicOff className="w-4 h-4" />}
                        </button>
                        <div className="flex items-center gap-1.5 shrink-0 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] text-zinc-400 font-bold">
                            <Command className="w-3 h-3" />
                            <span>K</span>
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Results Container */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-4">
                        {loading && (
                            <div className="p-8 text-center text-zinc-500 text-xs font-bold animate-pulse">
                                Loading matched titles...
                            </div>
                        )}

                        {/* Search Results */}
                        {!loading && results.length > 0 && (
                            <div>
                                <p className="text-[10px] font-black tracking-widest text-zinc-500 uppercase px-3 mb-2">Search Results</p>
                                <div className="space-y-1">
                                    {results.map((item, idx) => {
                                        const actualIdx = 3 + pinnedSearches.length + recentSearches.length + idx;
                                        const isSelected = actualIdx === activeIndex;
                                        return (
                                            <div
                                                key={item.id + item.type}
                                                onClick={() => { router.push(item.href, { scroll: false }); saveSearch(item.title); onClose(); }}
                                                onMouseEnter={() => setActiveIndex(actualIdx)}
                                                className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer text-left transition-all ${
                                                    isSelected ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent-glow)]" : "text-zinc-300 hover:bg-white/5"
                                                }`}
                                            >
                                                <div className="w-8 h-10 overflow-hidden rounded bg-zinc-950/40 border border-white/10 shrink-0">
                                                    {item.image ? <Image src={item.image} alt="" fill sizes="32px" className="object-cover" /> : <Film className="w-4 h-4 m-auto text-zinc-500" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold truncate block">{item.title}</span>
                                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase shrink-0 ${item.type === 'anime' ? 'bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/10' : 'bg-blue-500/20 text-blue-400 border border-blue-500/10'}`}>{item.type}</span>
                                                    </div>
                                                    <span className="text-[10px] text-zinc-400 font-semibold">{item.format} · {item.year}</span>
                                                </div>
                                                <button
                                                    onClick={(e) => togglePin(item.title, e)}
                                                    className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                                                >
                                                    {pinnedSearches.includes(item.title) ? <Pin className="w-3.5 h-3.5 fill-current" /> : <PinOff className="w-3.5 h-3.5" />}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Recent & Pinned Searches */}
                        {!loading && !query && (
                            <div className="space-y-4">
                                {pinnedSearches.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-black tracking-widest text-[var(--accent)] uppercase px-3 mb-2 flex items-center gap-1.5">
                                            <Pin className="w-3 h-3" /> Pinned Searches
                                        </p>
                                        <div className="grid grid-cols-2 gap-1.5 p-1">
                                            {pinnedSearches.map((term, idx) => {
                                                const actualIdx = 3 + idx;
                                                const isSelected = actualIdx === activeIndex;
                                                return (
                                                    <div
                                                        key={term}
                                                        onClick={() => { router.push(`/search?query=${encodeURIComponent(term)}`, { scroll: false }); saveSearch(term); onClose(); }}
                                                        onMouseEnter={() => setActiveIndex(actualIdx)}
                                                        className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer border transition-all ${
                                                            isSelected ? "bg-[var(--accent)] border-transparent text-white" : "bg-white/5 border-white/5 hover:border-white/10 text-zinc-300"
                                                        }`}
                                                    >
                                                        <span className="text-xs font-bold truncate">{term}</span>
                                                        <button onClick={(e) => togglePin(term, e)} className="text-zinc-500 hover:text-white">
                                                            <Pin className="w-3 h-3 fill-current" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {recentSearches.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-black tracking-widest text-zinc-500 uppercase px-3 mb-2 flex items-center gap-1.5">
                                            <Clock className="w-3 h-3" /> Recent Searches
                                        </p>
                                        <div className="space-y-1">
                                            {recentSearches.map((term, idx) => {
                                                const actualIdx = 3 + pinnedSearches.length + idx;
                                                const isSelected = actualIdx === activeIndex;
                                                return (
                                                    <div
                                                        key={term}
                                                        onClick={() => { router.push(`/search?query=${encodeURIComponent(term)}`, { scroll: false }); saveSearch(term); onClose(); }}
                                                        onMouseEnter={() => setActiveIndex(actualIdx)}
                                                        className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer text-left transition-all ${
                                                            isSelected ? "bg-white/10 text-white" : "text-zinc-300 hover:bg-white/5"
                                                        }`}
                                                    >
                                                        <Clock className="w-4 h-4 text-zinc-500" />
                                                        <span className="text-xs font-bold flex-1 truncate">{term}</span>
                                                        <button
                                                            onClick={(e) => togglePin(term, e)}
                                                            className="p-1 hover:bg-white/10 rounded"
                                                        >
                                                            {pinnedSearches.includes(term) ? <Pin className="w-3.5 h-3.5 fill-current text-[var(--accent)]" /> : <PinOff className="w-3.5 h-3.5 text-zinc-500" />}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Static Navigation Commands */}
                        <div>
                            <p className="text-[10px] font-black tracking-widest text-zinc-500 uppercase px-3 mb-2">System Commands</p>
                            <div className="space-y-1">
                                <button
                                    onClick={() => { window.dispatchEvent(new Event("openRandomizer")); onClose(); }}
                                    onMouseEnter={() => setActiveIndex(0)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                                        activeIndex === 0 ? "bg-[var(--accent)] text-white shadow-lg" : "text-zinc-300 hover:bg-white/5"
                                    }`}
                                >
                                    <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                                    <span className="text-xs font-bold">Surprise Me (Random Picker)</span>
                                </button>
                                <button
                                    onClick={() => { router.push("/browse?type=movie", { scroll: false }); onClose(); }}
                                    onMouseEnter={() => setActiveIndex(1)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                                        activeIndex === 1 ? "bg-[var(--accent)] text-white shadow-lg" : "text-zinc-300 hover:bg-white/5"
                                    }`}
                                >
                                    <Film className="w-4 h-4 shrink-0 text-blue-400" />
                                    <span className="text-xs font-bold">Browse Movies</span>
                                </button>
                                <button
                                    onClick={() => { router.push("/browse?type=tv", { scroll: false }); onClose(); }}
                                    onMouseEnter={() => setActiveIndex(2)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                                        activeIndex === 2 ? "bg-[var(--accent)] text-white shadow-lg" : "text-zinc-300 hover:bg-white/5"
                                    }`}
                                >
                                    <Tv className="w-4 h-4 shrink-0 text-green-400" />
                                    <span className="text-xs font-bold">Browse TV Shows</span>
                                </button>
                            </div>
                        </div>

                        {/* Genres Quick Navigation */}
                        {!query && (
                            <div>
                                <p className="text-[10px] font-black tracking-widest text-zinc-500 uppercase px-3 mb-2 flex items-center gap-1.5">
                                    <Tag className="w-3 h-3" /> Quick Genres
                                </p>
                                <div className="flex flex-wrap gap-1.5 px-3">
                                    {GENRES.map(genre => (
                                        <button
                                            key={genre}
                                            onClick={() => { router.push(`/search?genre=${encodeURIComponent(genre)}`, { scroll: false }); onClose(); }}
                                            className="px-2.5 py-1 bg-white/5 hover:bg-[var(--accent)] hover:text-white border border-white/5 hover:border-transparent rounded-lg text-[11px] font-bold text-zinc-400 transition-all cursor-pointer"
                                        >
                                            {genre}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Collections Quick Navigation */}
                        {!query && (
                            <div>
                                <p className="text-[10px] font-black tracking-widest text-zinc-500 uppercase px-3 mb-2 flex items-center gap-1.5">
                                    <Layers className="w-3 h-3" /> Collections
                                </p>
                                <div className="grid grid-cols-2 gap-1.5 px-3">
                                    {COLLECTIONS.map(collection => (
                                        <button
                                            key={collection}
                                            onClick={() => { router.push(`/search?query=${encodeURIComponent(collection)}`, { scroll: false }); onClose(); }}
                                            className="flex items-center gap-2 p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold text-zinc-300 transition-all text-left"
                                        >
                                            <Compass className="w-3.5 h-3.5 text-orange-400" />
                                            <span>{collection}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
