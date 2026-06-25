"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Film, Tv, Clock, Compass, X, Command, Mic, MicOff, Pin, PinOff, Sparkles, User, Tag, HelpCircle, Layers, AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import axios from "axios";
import Image from "next/image";
import { useDebounce } from "@/hooks/useDebounce";
import toast from "react-hot-toast";

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
}

const GENRES = ["Action", "Adventure", "Animation", "Comedy", "Crime", "Drama", "Fantasy", "Horror", "Romance", "Sci-Fi", "Thriller"];
const COLLECTIONS = ["Trending Now", "Premium 4K", "Classic Animes", "Netflix Originals", "Crunchyroll Hits"];

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounce(query, 200);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [pinnedSearches, setPinnedSearches] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleTranscriptReady = useCallback((text: string) => {
        setQuery(text);
    }, []);

    const {
        isListening,
        recordingFallbackActive,
        isTranscribing,
        errorMsg,
        permissionStatus,
        diagnostics,
        startListening,
        stopListening,
        runDiagnostics
    } = useVoiceSearch(handleTranscriptReady);

    const toggleVoice = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };
    const recognitionRef = useRef<any>(null);

    function saveSearch(q: string) {
        if (!q.trim()) return;
        const updated = [q.trim(), ...recentSearches.filter(x => x !== q.trim())].slice(0, 10);
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

    // toggleVoice was moved to useVoiceSearch hook hook

    const getNavigableItems = () => {
        const list: any[] = [];
        if (query.trim()) {
            results.forEach(item => {
                list.push({
                    type: "result",
                    title: item.title,
                    action: () => {
                        router.push(item.href, { scroll: false });
                        saveSearch(item.title);
                        onClose();
                    }
                });
            });
        } else {
            pinnedSearches.forEach(term => {
                list.push({
                    type: "pinned",
                    title: term,
                    action: () => {
                        router.push(`/search?query=${encodeURIComponent(term)}`, { scroll: false });
                        saveSearch(term);
                        onClose();
                    }
                });
            });
            recentSearches.forEach(term => {
                list.push({
                    type: "recent",
                    title: term,
                    action: () => {
                        router.push(`/search?query=${encodeURIComponent(term)}`, { scroll: false });
                        saveSearch(term);
                        onClose();
                    }
                });
            });
            list.push({
                type: "system",
                title: "Browse Movies",
                action: () => {
                    router.push("/browse?type=movie", { scroll: false });
                    onClose();
                }
            });
            list.push({
                type: "system",
                title: "Browse TV Shows",
                action: () => {
                    router.push("/browse?type=tv", { scroll: false });
                    onClose();
                }
            });
            list.push({
                type: "system",
                title: "AI Discovery",
                action: () => {
                    router.push("/discover", { scroll: false });
                    onClose();
                }
            });
        }
        return list;
    };

    function triggerItemAtIndex(index: number) {
        const items = getNavigableItems();
        if (items.length === 0 && query.trim()) {
            router.push(`/search?query=${encodeURIComponent(query.trim())}`, { scroll: false });
            saveSearch(query);
            onClose();
            return;
        }
        const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
        const selected = items[clampedIndex];
        if (selected) {
            selected.action();
        } else if (query.trim()) {
            router.push(`/search?query=${encodeURIComponent(query.trim())}`, { scroll: false });
            saveSearch(query);
            onClose();
        }
    }

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
            } else {
                const defaultPinned = ["Anime", "Movies", "TV", "Collections", "Actors"];
                setPinnedSearches(defaultPinned);
                localStorage.setItem("toonplayer_pinned_searches", JSON.stringify(defaultPinned));
            }
        }
    }, [isOpen]);

    // Reset active index when query/results/lists change
    useEffect(() => {
        setActiveIndex(-1);
    }, [query, results.length, recentSearches.length, pinnedSearches.length]);

    // Speech recognition setup was removed and replaced with useVoiceSearch hook

    // Fetch results on query change
    useEffect(() => {
        if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
            setResults([]);
            return;
        }

        const controller = new AbortController();
        setLoading(true);
        axios.get(`/api/search/unified?q=${encodeURIComponent(debouncedQuery)}`, {
            signal: controller.signal
        })
            .then(res => {
                const items = res.data.results || [];
                setResults(items.slice(0, 10));
            })
            .catch((err) => {
                if (axios.isCancel(err) || err.name === 'CanceledError') return;
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });
            
        return () => controller.abort();
    }, [debouncedQuery]);

    // Auto-focus input on open
    useEffect(() => {
        if (isOpen) {
            setQuery("");
            setActiveIndex(0);
            inputRef.current?.focus();
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Keyboard navigation
    const navigableItems = getNavigableItems();
    const allItemsCount = navigableItems.length;
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex(prev => {
                    if (allItemsCount === 0) return -1;
                    if (prev === -1) return 0;
                    return (prev + 1) % allItemsCount;
                });
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex(prev => {
                    if (allItemsCount === 0) return -1;
                    if (prev === -1 || prev === 0) return allItemsCount - 1;
                    return (prev - 1) % allItemsCount;
                });
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (activeIndex === -1 && query.trim()) {
                    router.push(`/search?query=${encodeURIComponent(query.trim())}`, { scroll: false });
                    saveSearch(query);
                    onClose();
                } else if (activeIndex >= 0) {
                    triggerItemAtIndex(activeIndex);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, activeIndex, allItemsCount, query, router, onClose]);

    // Scroll active item into view dynamically
    useEffect(() => {
        if (activeIndex >= 0) {
            const activeEl = document.getElementById(`option-${activeIndex}`);
            if (activeEl) {
                activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
            }
        }
    }, [activeIndex]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div 
                onClick={onClose}
                className="fixed inset-0 z-[130] flex items-start justify-center pt-[10vh] px-4 bg-black/85 backdrop-blur-md cursor-pointer"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -20 }}
                    onClick={e => e.stopPropagation()}
                    className="w-[90vw] sm:w-[420px] md:w-[480px] bg-bg-elevated/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl flex flex-col"
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
                            role="combobox"
                            aria-autocomplete="list"
                            aria-expanded={isOpen}
                            aria-haspopup="listbox"
                            aria-controls="command-palette-results"
                            aria-activedescendant={activeIndex >= 0 ? `option-${activeIndex}` : undefined}
                        />
                        <button 
                            type="button" 
                            onClick={toggleVoice} 
                            className={`p-2 rounded-xl transition-all ${
                                isListening 
                                    ? recordingFallbackActive
                                        ? 'bg-blue-500/20 text-blue-500 animate-pulse'
                                        : 'bg-red-500/20 text-red-500 animate-pulse' 
                                    : 'hover:bg-white/5 text-zinc-400 hover:text-white'
                            }`}
                            title="Voice Search"
                        >
                            {isTranscribing ? (
                                <Loader2 className="w-4 h-4 animate-spin text-accent" />
                            ) : isListening ? (
                                <Mic className="w-4 h-4 text-red-500 animate-pulse" />
                            ) : (
                                <Mic className="w-4 h-4" />
                            )}
                        </button>
                        <div className="flex items-center gap-1.5 shrink-0 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] text-zinc-400 font-bold">
                            <Command className="w-3 h-3" />
                            <span>K</span>
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {errorMsg && (
                        <div className="p-3 mx-3 mb-2 rounded-xl bg-red-950/20 border border-red-500/20 text-left text-xs">
                            <div className="flex items-start gap-2.5">
                                <AlertTriangle className="w-4.5 h-4.5 text-red-400 shrink-0 mt-0.5" />
                                <div className="flex-1 space-y-1.5">
                                    <div className="font-bold text-white">Voice Search Diagnostics</div>
                                    <div className="text-[11px] text-zinc-400 leading-normal">
                                        {errorMsg === "not-allowed" && "Microphone permission is blocked. Please allow microphone access in your browser settings."}
                                        {errorMsg === "transcription-key-missing" && "Voice recording completed! However, the translation service is currently offline. Please type to search."}
                                        {errorMsg === "no-speech" && "No speech was detected. Please check your mic and try again."}
                                        {errorMsg !== "not-allowed" && errorMsg !== "transcription-key-missing" && errorMsg !== "no-speech" && `Voice error details: ${errorMsg}`}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={startListening}
                                            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase text-white transition-all border border-white/5 cursor-pointer"
                                        >
                                            Retry
                                        </button>
                                        <button
                                            onClick={async () => {
                                                const rep = await runDiagnostics();
                                                toast.success(`Diag: Mic=${rep.hasAudioInput ? 'Yes' : 'No'}, Secure=${rep.secureContext ? 'Yes' : 'No'}`);
                                            }}
                                            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase text-zinc-400 hover:text-white transition-all border border-white/5 cursor-pointer"
                                        >
                                            Test Mic
                                        </button>
                                    </div>
                                    {diagnostics && (
                                        <div className="text-[9px] text-zinc-500 font-mono pt-1.5 border-t border-white/5 mt-1.5 space-y-0.5">
                                            <div>Secure context: {diagnostics.secureContext ? "Yes" : "No"} | Input mic: {diagnostics.hasAudioInput ? "Yes" : "No"}</div>
                                            <div>Permissions Policy: {diagnostics.permissionsPolicyOk ? "Allowed" : "Blocked"}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Results Container */}
                    <div 
                        id="command-palette-results"
                        role="listbox"
                        aria-label="Search suggestions"
                        className="flex-1 overflow-y-auto p-3 space-y-4 max-h-[280px] md:max-h-[420px] rounded-xl backdrop-blur-xl bg-black/40 border border-white/5 mx-3 mb-3"
                    >
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
                                        const actualIdx = idx;
                                        const isSelected = actualIdx === activeIndex;
                                        return (
                                            <div
                                                id={`option-${actualIdx}`}
                                                role="option"
                                                aria-selected={isSelected}
                                                key={item.id + item.type}
                                                onClick={() => { router.push(item.href, { scroll: false }); saveSearch(item.title); onClose(); }}
                                                onMouseEnter={() => setActiveIndex(actualIdx)}
                                                className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer text-left transition-all ${
                                                    isSelected ? "bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] text-white shadow-lg shadow-[var(--accent-glow)]" : "text-zinc-300 hover:bg-white/5"
                                                }`}
                                            >
                                                <div className="w-8 h-10 relative overflow-hidden rounded bg-zinc-950/40 border border-white/10 shrink-0">
                                                    {item.image ? <Image src={item.image} alt="" fill sizes="32px" className="object-cover" /> : <Film className="w-4 h-4 m-auto text-zinc-500" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold truncate block">{item.title}</span>
                                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase shrink-0 ${item.type === 'anime' ? 'bg-accent/20 text-accent border border-accent/10' : 'bg-blue-500/20 text-blue-400 border border-blue-500/10'}`}>{item.type}</span>
                                                        {item.rating && (
                                                            <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-bold shrink-0">
                                                                ⭐ {item.rating}
                                                            </span>
                                                        )}
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
                                        <p className="text-[10px] font-black tracking-widest text-accent uppercase px-3 mb-2 flex items-center gap-1.5">
                                            <Pin className="w-3 h-3" /> Pinned Searches
                                        </p>
                                        <div className="grid grid-cols-2 gap-1.5 p-1">
                                            {pinnedSearches.map((term, idx) => {
                                                const actualIdx = idx;
                                                const isSelected = actualIdx === activeIndex;
                                                return (
                                                    <div
                                                        id={`option-${actualIdx}`}
                                                        role="option"
                                                        aria-selected={isSelected}
                                                        key={term}
                                                        onClick={() => { router.push(`/search?query=${encodeURIComponent(term)}`, { scroll: false }); saveSearch(term); onClose(); }}
                                                        onMouseEnter={() => setActiveIndex(actualIdx)}
                                                        className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer border transition-all ${
                                                            isSelected ? "bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] border-transparent text-white" : "bg-white/5 border-white/5 hover:border-white/10 text-zinc-300"
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
                                                const actualIdx = pinnedSearches.length + idx;
                                                const isSelected = actualIdx === activeIndex;
                                                return (
                                                    <div
                                                        id={`option-${actualIdx}`}
                                                        role="option"
                                                        aria-selected={isSelected}
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
                                                            {pinnedSearches.includes(term) ? <Pin className="w-3.5 h-3.5 fill-current text-accent" /> : <PinOff className="w-3.5 h-3.5 text-zinc-500" />}
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
                        {!query && (
                            <div>
                                <p className="text-[10px] font-black tracking-widest text-zinc-500 uppercase px-3 mb-2">System Commands</p>
                                <div className="space-y-1">
                                    <button
                                        id={`option-${pinnedSearches.length + recentSearches.length}`}
                                        role="option"
                                        aria-selected={activeIndex === (pinnedSearches.length + recentSearches.length)}
                                        onClick={() => { router.push("/browse?type=movie", { scroll: false }); onClose(); }}
                                        onMouseEnter={() => setActiveIndex(pinnedSearches.length + recentSearches.length)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                                            activeIndex === (pinnedSearches.length + recentSearches.length) ? "bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] text-white shadow-lg" : "text-zinc-300 hover:bg-white/5"
                                        }`}
                                    >
                                        <Film className="w-4 h-4 shrink-0 text-blue-400" />
                                        <span className="text-xs font-bold">Browse Movies</span>
                                    </button>
                                    <button
                                        id={`option-${pinnedSearches.length + recentSearches.length + 1}`}
                                        role="option"
                                        aria-selected={activeIndex === (pinnedSearches.length + recentSearches.length + 1)}
                                        onClick={() => { router.push("/browse?type=tv", { scroll: false }); onClose(); }}
                                        onMouseEnter={() => setActiveIndex(pinnedSearches.length + recentSearches.length + 1)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                                            activeIndex === (pinnedSearches.length + recentSearches.length + 1) ? "bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] text-white shadow-lg" : "text-zinc-300 hover:bg-white/5"
                                        }`}
                                    >
                                        <Tv className="w-4 h-4 shrink-0 text-green-400" />
                                        <span className="text-xs font-bold">Browse TV Shows</span>
                                    </button>
                                    <button
                                        id={`option-${pinnedSearches.length + recentSearches.length + 2}`}
                                        role="option"
                                        aria-selected={activeIndex === (pinnedSearches.length + recentSearches.length + 2)}
                                        onClick={() => { router.push("/discover", { scroll: false }); onClose(); }}
                                        onMouseEnter={() => setActiveIndex(pinnedSearches.length + recentSearches.length + 2)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                                            activeIndex === (pinnedSearches.length + recentSearches.length + 2) ? "bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] text-white shadow-lg" : "text-zinc-300 hover:bg-white/5"
                                        }`}
                                    >
                                        <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                                        <span className="text-xs font-bold">AI Discovery</span>
                                    </button>
                                </div>
                            </div>
                        )}

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
                                            className="px-2.5 py-1 bg-white/5 hover:bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] hover:text-white border border-white/5 hover:border-transparent rounded-lg text-[11px] font-bold text-zinc-400 transition-all cursor-pointer"
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
                                            <Compass className="w-3.5 h-3.5 text-accent-warm" />
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
