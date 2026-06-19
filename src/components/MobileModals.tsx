"use client";

import { X, Search, TrendingUp, LayoutGrid, Star, Sparkles, Settings, Zap, Shield, Globe, ChevronRight, Compass, Play, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMobileUI } from "@/context/MobileUIContext";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import Fuse from "fuse.js";

const quickLinks = [
    { name: "Discover AI ✨", href: "/discover", icon: Compass, color: "from-[var(--accent)] to-[var(--accent-secondary)]" },
    { name: "Trending Now", href: "/search?genre=Action", icon: TrendingUp, color: "from-rose-500 to-pink-600" },
    { name: "Browse Genres", href: "/genres", icon: LayoutGrid, color: "from-cyan-500 to-blue-600" },
    { name: "Top Rated", href: "/search?status=Completed", icon: Star, color: "from-yellow-500 to-amber-600" },
    { name: "New Releases", href: "/search?status=Ongoing", icon: Sparkles, color: "from-emerald-500 to-green-600" },
];

export default function MobileModals() {
    const { isMenuOpen, setMenuOpen, isSearchOpen, setSearchOpen } = useMobileUI();
    const pathname = usePathname();
    const router = useRouter();
    const [autoPlay, setAutoPlay] = useState(false);
    const [autoNext, setAutoNext] = useState(false);
    const [isDiscoverMode, setIsDiscoverMode] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [globalCatalog, setGlobalCatalog] = useState<any[]>([]);
    const [fuse, setFuse] = useState<Fuse<any> | null>(null);

    const isMovies = pathname?.startsWith('/');
    const searchPlaceholder = "Search movies, anime & shows...";

    useEffect(() => {
        setAutoPlay(localStorage.getItem('toonplayer_autoplay') === 'true');
        setAutoNext(localStorage.getItem('toonplayer_autonext') === 'true');
    }, [isMenuOpen]);

    const toggleAutoPlay = () => {
        const val = !autoPlay;
        setAutoPlay(val);
        localStorage.setItem('toonplayer_autoplay', String(val));
    };

    // Load recent searches and catalog on mount
    useEffect(() => {
        const saved = localStorage.getItem("toonplayer_recent_searches");
        if (saved) {
            try { setRecentSearches(JSON.parse(saved)); } catch (e) {}
        }
        
        const fetchCatalog = async () => {
            try {
                const res = await axios.get('/api/search/catalog');
                const catalog = res.data.results || [];
                setGlobalCatalog(catalog);
                setFuse(new Fuse(catalog, {
                    keys: [
                        { name: 'title', weight: 2 },
                        { name: '_searchTitle', weight: 1.5 },
                        { name: 'type', weight: 0.5 }
                    ],
                    threshold: 0.3,
                    distance: 50,
                    minMatchCharLength: 2,
                    shouldSort: true
                }));
            } catch (e) {
                console.warn('[MobileModals] Catalog fetch failed:', e);
            }
        };
        fetchCatalog();
    }, []);

    // Perform suggestions lookup
    useEffect(() => {
        const cleanQuery = searchQuery.trim().replace(/\s+/g, ' ');
        if (!cleanQuery) {
            setSuggestions([]);
            return;
        }

        // 1. Local fuzzy search
        if (fuse) {
            const matches = fuse.search(cleanQuery).map(r => r.item);
            if (matches.length > 0) {
                setSuggestions(matches.slice(0, 10));
            }
        }

        // 2. Debounced network search
        const timer = setTimeout(async () => {
            if (cleanQuery.length < 2) return;
            try {
                const response = await axios.get('/api/search/unified', {
                    params: { q: cleanQuery }
                });
                const networkItems = response.data.results || [];
                if (networkItems.length > 0) {
                    const netFuse = new Fuse(networkItems, {
                        keys: [
                            { name: 'title', weight: 2 },
                            { name: 'format', weight: 1 }
                        ],
                        threshold: 0.3,
                        distance: 100,
                        shouldSort: true
                    });
                    const ranked = netFuse.search(cleanQuery).map(r => r.item);
                    const finalNetwork = ranked.length > 0 ? ranked : networkItems;

                    setSuggestions(prev => {
                        const combined = [...prev, ...finalNetwork];
                        const seen = new Set();
                        const unique = combined.filter(item => {
                            const key = `${item.id}-${(item.title || "").toLowerCase().trim()}`;
                            if (seen.has(key)) return false;
                            seen.add(key);
                            return true;
                        });
                        return unique.slice(0, 10);
                    });
                }
            } catch (e) {}
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, fuse]);

    // Reset search on open state change
    useEffect(() => {
        if (!isSearchOpen) {
            setSearchQuery("");
            setSuggestions([]);
        }
    }, [isSearchOpen]);

    const saveSearch = (q: string) => {
        if (!q.trim()) return;
        const newRecent = [q.trim(), ...recentSearches.filter(s => s !== q.trim())].slice(0, 5);
        setRecentSearches(newRecent);
        localStorage.setItem("toonplayer_recent_searches", JSON.stringify(newRecent));
    };

    const handleMobileSearchSubmit = (q: string) => {
        if (!q.trim()) return;
        saveSearch(q);
        setSearchOpen(false);
        if (isDiscoverMode) {
            router.push(`/discover?prompt=${encodeURIComponent(q.trim())}`);
        } else {
            router.push(`/search?query=${encodeURIComponent(q.trim())}`);
        }
    };

    return (
        <>
            {/* About/Menu Modal */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        key="about-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80"
                        onClick={() => setMenuOpen(false)}
                        style={{ willChange: "opacity" }}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full md:max-w-md bg-[var(--bg-card)] border-t md:border border-[var(--border-color)] rounded-t-2xl md:rounded-2xl shadow-xl overflow-hidden max-h-[85vh] flex flex-col will-change-transform"
                        >
                            <div className="w-full flex justify-center pt-3 pb-1 md:hidden">
                                <div className="w-12 h-1.5 bg-[var(--text-muted)]/30 rounded-full"></div>
                            </div>

                            <div className="p-5 overflow-y-auto">
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-xl font-black text-[var(--text-main)]">Menu</h2>
                                    <button
                                        onClick={() => setMenuOpen(false)}
                                        className="p-2 bg-[var(--bg-main)] hover:bg-[var(--border-color)] rounded-full transition-colors"
                                    >
                                        <X className="w-5 h-5 text-[var(--text-main)]" />
                                    </button>
                                </div>

                                {/* Quick Links */}
                                <div className="mb-6">
                                    <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">Quick Links</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {quickLinks.map((link) => {
                                            const Icon = link.icon;
                                            return (
                                                <button
                                                    key={link.name}
                                                    onClick={() => { setMenuOpen(false); router.push(link.href); }}
                                                    className="flex items-center gap-2.5 p-3 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] hover:border-white/20 transition-colors active:scale-95 text-left"
                                                >
                                                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${link.color} flex items-center justify-center shadow-lg shrink-0`}>
                                                        <Icon className="w-4 h-4 text-white" />
                                                    </div>
                                                    <span className="text-xs font-bold text-[var(--text-main)] truncate">{link.name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Settings Section */}
                                <div className="space-y-3 mb-6">
                                    <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Settings</h3>

                                    {/* Auto Play */}
                                    <div className="flex items-center justify-between p-3 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                                                <Zap className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-[var(--text-main)]">Auto Play</p>
                                                <p className="text-[10px] text-[var(--text-muted)]">Auto-play on load</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={toggleAutoPlay}
                                            className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${autoPlay ? 'bg-blue-600' : 'bg-zinc-600'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${autoPlay ? 'left-6' : 'left-1'}`}></div>
                                        </button>
                                    </div>

                                    {/* Features Info */}
                                    <div className="p-3 bg-gradient-to-r from-[var(--accent)]/5 to-[var(--accent-secondary)]/5 rounded-xl border border-[var(--border-color)]">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--accent)] uppercase tracking-tight">
                                            <Sparkles className="w-3 h-3" />
                                            Premium Features Active
                                        </div>
                                        <p className="mt-1 text-[10px] text-[var(--text-muted)]">Auto-Next and Dark Theme are permanently enabled for the best experience.</p>
                                    </div>
                                </div>

                                {/* App Info */}
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">About</h3>
                                    <div className="p-4 bg-gradient-to-br from-[var(--accent)]/10 to-[var(--accent-secondary)]/10 rounded-xl border border-[var(--accent)]/20">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 flex items-center justify-center p-1 bg-white/5 rounded-lg shrink-0">
                                                <img src="/logo.webp" alt="Logo" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = '<div class="text-white font-black text-xs">TP</div>'; }} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-[var(--text-main)]">ToonPlayer</h4>
                                                <p className="text-[10px] text-[var(--text-muted)]">v3.5 • Full Experience</p>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mb-3">
                                            Premium anime & movie streaming. Built with love by Aman Kumar.
                                        </p>
                                        <div className="flex gap-2">
                                            <a href="https://github.com/iamTechieAman" target="_blank" className="flex-1 py-2 text-center bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[11px] font-bold text-[var(--text-main)] hover:bg-[var(--border-color)] transition-colors">
                                                GitHub
                                            </a>
                                            <a href="https://linkedin.com" target="_blank" className="flex-1 py-2 text-center bg-[#0077b5] text-white rounded-lg text-[11px] font-bold hover:bg-[#006097] transition-colors">
                                                LinkedIn
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Search Overlay */}
            <AnimatePresence>
                {isSearchOpen && (
                    <motion.div
                        key="search-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[55] bg-[var(--bg-main)] flex flex-col md:hidden pt-safe"
                        style={{ willChange: 'opacity' }}
                    >
                        {/* Top bar (sticky) */}
                        <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--border-color)] bg-[var(--bg-main)] shrink-0">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    handleMobileSearchSubmit(searchQuery);
                                }}>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={isDiscoverMode ? "Describe what you want..." : searchPlaceholder}
                                        autoFocus
                                        className={`w-full text-[var(--text-main)] border rounded-xl pl-10 pr-[88px] py-3 ring-0 focus:ring-0 outline-none focus:outline-none transition-all text-sm shadow-none ${isDiscoverMode ? 'bg-[var(--accent)]/10 border-[var(--accent)]/50 focus:border-[var(--accent)]' : 'bg-[var(--bg-card)] border-[var(--border-color)] focus:border-[var(--accent)]/60'}`}
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setIsDiscoverMode(!isDiscoverMode)}
                                        className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${isDiscoverMode ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] text-white shadow-lg shadow-[var(--accent)]/30' : 'bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-white border border-[var(--border-color)]'}`}
                                    >
                                        <Sparkles className="w-3 h-3" />
                                        AI
                                    </button>
                                </form>
                            </div>
                            <button
                                onClick={() => setSearchOpen(false)}
                                className="p-2 bg-[var(--bg-card)] rounded-xl transition-colors active:scale-95 shrink-0"
                            >
                                <X className="w-5 h-5 text-[var(--text-muted)]" />
                            </button>
                        </div>

                        {/* Scrollable body */}
                        <div className="flex-1 overflow-y-auto px-4 pb-28 space-y-6">
                            {/* If query is empty */}
                            {!searchQuery.trim() ? (
                                <>
                                    {/* Recent Searches */}
                                    {recentSearches.length > 0 && (
                                        <div className="pt-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3 flex items-center gap-1.5">
                                                <Clock className="w-3 h-3 text-[var(--accent)]" /> Recent Searches
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {recentSearches.map((s, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => {
                                                            setSearchQuery(s);
                                                            handleMobileSearchSubmit(s);
                                                        }}
                                                        className="px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--text-main)] active:scale-95 transition-all"
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Popular Genres */}
                                    <div className={recentSearches.length === 0 ? "pt-4" : ""}>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">Popular Genres</p>
                                        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                                            {["Action", "Romance", "Comedy", "Fantasy", "Thriller", "Sci-Fi", "Horror", "Drama", "Mystery", "Adventure"].map((genre) => (
                                                <button 
                                                    key={genre}
                                                    onClick={() => { setSearchOpen(false); router.push(`/search?genre=${genre}`); }}
                                                    className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/50 transition-colors active:scale-95 shrink-0"
                                                >
                                                    {genre}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Trending Hits */}
                                    {globalCatalog.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] mb-3 flex items-center gap-1.5">
                                                <TrendingUp className="w-3 h-3" /> Trending Hits
                                            </p>
                                            <div className="space-y-2">
                                                {globalCatalog.slice(0, 5).map((item, i) => (
                                                    <Link
                                                        key={i}
                                                        href={item.href || (item.id ? `/watch/${item.type || 'anime'}/${item.id}` : '#')}
                                                        className="flex items-center gap-4 p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl active:scale-[0.98] transition-all"
                                                        onClick={() => setSearchOpen(false)}
                                                    >
                                                        <span className="text-sm font-black text-[var(--text-muted)]/50 w-5 text-center italic">0{i + 1}</span>
                                                        <div className="w-10 h-12 relative shrink-0 overflow-hidden rounded-lg bg-zinc-900 border border-white/5">
                                                            {item.image && <img src={item.image} alt="" className="w-full h-full object-cover" />}
                                                        </div>
                                                        <span className="text-xs font-bold text-[var(--text-main)] truncate flex-1">{item.title}</span>
                                                        <Play className="w-4 h-4 text-[var(--accent)] mr-2 shrink-0" />
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                /* If query is not empty, show suggestions */
                                <div className="pt-4 space-y-3">
                                    {suggestions.length > 0 ? (
                                        <>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Suggestions</p>
                                            <div className="space-y-2">
                                                {suggestions.map((item) => (
                                                    <Link
                                                        key={`${item.type}-${item.id}`}
                                                        href={item.href || `/watch/${item.type}/${item.id}`}
                                                        onClick={() => {
                                                            setSearchOpen(false);
                                                            saveSearch(item.title);
                                                        }}
                                                        className="flex items-center gap-4 p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl active:scale-[0.98] transition-all"
                                                    >
                                                        <div className="w-12 h-16 relative shrink-0 overflow-hidden rounded-xl bg-zinc-900 border border-white/5">
                                                            {item.image ? (
                                                                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <Play className="w-4 h-4 text-zinc-600" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <span className="text-xs font-black text-[var(--text-main)] block truncate mb-1">{item.title}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider ${item.type === 'anime' ? 'bg-[var(--accent)] text-white shadow-inner' : 'bg-blue-500 text-white shadow-inner'}`}>{item.type}</span>
                                                                <span className="text-[10px] text-[var(--text-muted)] font-semibold">{item.format} • {item.year}</span>
                                                            </div>
                                                        </div>
                                                        <Play className="w-4 h-4 text-[var(--accent)] mr-2 shrink-0" />
                                                    </Link>
                                                ))}
                                            </div>

                                            <button 
                                                onClick={() => handleMobileSearchSubmit(searchQuery)}
                                                className="w-full py-3.5 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-[var(--accent)]/20 active:scale-[0.98]"
                                            >
                                                See All Results
                                            </button>
                                        </>
                                    ) : (
                                        <div className="py-12 text-center">
                                            <div className="w-16 h-16 bg-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-4 border border-white/[0.05]">
                                                <Search className="w-6 h-6 text-white/20" />
                                            </div>
                                            <p className="text-sm font-black text-white mb-1 uppercase tracking-widest">No Matches Found</p>
                                            <p className="text-xs text-white/40 font-medium">Try different keywords or browse genres</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
