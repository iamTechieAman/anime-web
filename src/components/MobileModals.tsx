import { X, Search, TrendingUp, LayoutGrid, Star, Sparkles, Settings, Zap, Shield, Globe, ChevronRight, Compass, Play, Clock, Pin, Mic, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMobileUI } from "@/context/MobileUIContext";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import Fuse from "fuse.js";
import { useDebounce } from "@/hooks/useDebounce";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";

const quickLinks = [
    { name: "Discover AI ✨", href: "/discover", icon: Compass, color: "from-accent to-accent-secondary" },
    { name: "Trending Now", href: "/search?genre=Action", icon: TrendingUp, color: "from-rose-500 to-pink-600" },
    { name: "Browse Genres", href: "/genres", icon: LayoutGrid, color: "from-cyan-500 to-blue-600" },
    { name: "Top Rated", href: "/search?status=Completed", icon: Star, color: "from-yellow-500 to-accent-warm" },
    { name: "New Releases", href: "/search?status=Ongoing", icon: Sparkles, color: "from-emerald-500 to-green-600" },
];

export default function MobileModals() {
    const { isMenuOpen, setMenuOpen, isSearchOpen, setSearchOpen } = useMobileUI();
    const pathname = usePathname();
    const router = useRouter();
    const [autoPlay, setAutoPlay] = useState(true);
    const [autoNext, setAutoNext] = useState(true);
    const [isDiscoverMode, setIsDiscoverMode] = useState(false);
    const [logoError, setLogoError] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const debouncedQuery = useDebounce(searchQuery, 200);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [pinnedSearches, setPinnedSearches] = useState<string[]>([]);
    const [globalCatalog, setGlobalCatalog] = useState<any[]>([]);
    const [fuse, setFuse] = useState<Fuse<any> | null>(null);

    const {
        isListening,
        isTranscribing,
        startListening,
        stopListening,
    } = useVoiceSearch((text) => {
        setSearchQuery(text);
    });

    const toggleVoice = () => {
        if (isListening) stopListening();
        else startListening();
    };

    const isMovies = pathname?.startsWith('/');
    const searchPlaceholder = "Search movies, anime & shows...";

    useEffect(() => {
        setAutoPlay(localStorage.getItem('toonplayer_autoplay') !== 'false');
        setAutoNext(localStorage.getItem('toonplayer_autonext') !== 'false');
    }, [isMenuOpen]);

    const toggleAutoPlay = () => {
        const val = !autoPlay;
        setAutoPlay(val);
        localStorage.setItem('toonplayer_autoplay', String(val));
    };

    // Load recent & pinned searches and catalog
    useEffect(() => {
        if (!isSearchOpen) return;
        const saved = localStorage.getItem("toonplayer_recent_searches");
        if (saved) {
            try { setRecentSearches(JSON.parse(saved)); } catch (e) {}
        }
        const pinned = localStorage.getItem("toonplayer_pinned_searches");
        if (pinned) {
            try { setPinnedSearches(JSON.parse(pinned)); } catch (e) {}
        } else {
            const defaultPinned = ["Anime", "Movies", "TV", "Collections", "Actors"];
            setPinnedSearches(defaultPinned);
            localStorage.setItem("toonplayer_pinned_searches", JSON.stringify(defaultPinned));
        }
    }, [isSearchOpen]);

    useEffect(() => {
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
        const cleanQuery = debouncedQuery.trim().replace(/\s+/g, ' ');
        if (!cleanQuery) {
            setSuggestions([]);
            return;
        }

        // 1. Local fuzzy search
        if (fuse) {
            const matches = fuse.search(cleanQuery).map(r => r.item);
            setSuggestions(matches.slice(0, 10));
        }

        if (cleanQuery.length < 2) return;

        const controller = new AbortController();
        // 2. Network search
        axios.get('/api/search/unified', {
            params: { q: cleanQuery },
            signal: controller.signal
        }).then(response => {
            if (controller.signal.aborted) return;
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

                const seen = new Set();
                const deduped = finalNetwork.filter((item: any) => {
                    const key = `${item.id}-${(item.title || "").toLowerCase().trim()}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                }).slice(0, 10);
                setSuggestions(deduped);
            }
        }).catch((err) => {
            if (axios.isCancel(err)) return;
        });

        return () => controller.abort();
    }, [debouncedQuery, fuse]);

    // Close search overlay on Escape
    useEffect(() => {
        if (!isSearchOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setSearchOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isSearchOpen, setSearchOpen]);

    // Reset search on open state change
    useEffect(() => {
        if (!isSearchOpen) {
            setSearchQuery("");
            setSuggestions([]);
        }
    }, [isSearchOpen]);

    useEffect(() => {
        if (!isMenuOpen && !isSearchOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isMenuOpen, isSearchOpen]);

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
            router.push(`/discover?prompt=${encodeURIComponent(q.trim())}`, { scroll: false });
        } else {
            router.push(`/search?query=${encodeURIComponent(q.trim())}`, { scroll: false });
        }
    };

    return (
        <>
            {/* About/Menu Modal */}
            <AnimatePresence mode="wait">
                {isMenuOpen && (
                    <motion.div
                        key="about-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 pt-[env(safe-area-inset-top)] md:items-center md:p-4"
                        onClick={() => setMenuOpen(false)}
                        style={{ willChange: "opacity" }}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
                            onClick={(e) => e.stopPropagation()}
                            className="mobile-menu-drawer isolate flex w-[90vw] max-w-[420px] flex-col overflow-hidden rounded-t-2xl border border-border-color bg-bg-card shadow-xl md:rounded-2xl"
                        >
                            <div className="w-full flex justify-center pt-3 pb-1 md:hidden">
                                <div className="w-12 h-1.5 bg-[var(--text-muted)]/30 rounded-full"></div>
                            </div>

                            <div className="mobile-menu-scrollbar min-h-0 flex-1 overflow-y-auto pl-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))]">
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-xl font-black text-[var(--text-main)]">Menu</h2>
                                    <button
                                        onClick={() => setMenuOpen(false)}
                                        className="p-2 bg-bg-main hover:bg-border-color rounded-full transition-colors"
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
                                                    onClick={() => { setMenuOpen(false); router.push(link.href, { scroll: false }); }}
                                                    className="flex min-w-0 items-center gap-2.5 overflow-hidden rounded-xl border border-border-color bg-bg-main p-3 text-left transition-colors hover:border-white/20 active:scale-95"
                                                >
                                                    <div className={`flex h-8 w-8 max-w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br ${link.color} shadow-lg`}>
                                                        <Icon className="drawer-safe-icon h-4 w-4 text-white" />
                                                    </div>
                                                    <span className="min-w-0 truncate text-xs font-bold text-[var(--text-main)]">{link.name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Settings Section */}
                                <div className="space-y-3 mb-6">
                                    <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Settings</h3>

                                    {/* Auto Play */}
                                    <div className="flex items-center justify-between p-3 bg-bg-main rounded-xl border border-border-color">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                                                <Zap className="drawer-safe-icon w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-[var(--text-main)]">Auto Play</p>
                                                <p className="text-[10px] text-[var(--text-muted)]">Auto-play on load</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={toggleAutoPlay}
                                            className={`relative w-11 h-6 rounded-full transition-colors duration-[250ms] ${autoPlay ? 'bg-blue-600' : 'bg-zinc-600'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-[250ms] ${autoPlay ? 'left-6' : 'left-1'}`}></div>
                                        </button>
                                    </div>

                                    {/* Features Info */}
                                    <div className="shrink-0 h-auto overflow-hidden rounded-xl border border-border-color bg-gradient-to-r from-accent/5 to-accent-secondary/5 p-4">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-accent uppercase tracking-tight">
                                            <Sparkles className="drawer-safe-icon w-3 h-3" />
                                            Premium Features Active
                                        </div>
                                        <p className="mt-1 break-words text-[10px] leading-relaxed text-[var(--text-muted)]">Auto-Next and Dark Theme are permanently enabled for the best experience.</p>
                                    </div>
                                </div>

                                {/* App Info */}
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">About</h3>
                                    <div className="overflow-hidden rounded-xl border border-accent/20 bg-gradient-to-br from-accent/10 to-accent-secondary/10 p-4 transform-gpu translate-z-0 will-change-transform">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="relative flex h-10 w-10 max-h-12 max-w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5 p-1">
                                                {logoError ? (
                                                    <Play aria-hidden="true" className="drawer-safe-icon h-full w-full max-w-[48px] max-h-[48px] object-contain fill-accent text-accent" />
                                                ) : (
                                                    <Image
                                                        src="/icon-512x512.png"
                                                        alt="ToonPlayer logo"
                                                        width={32}
                                                        height={32}
                                                        sizes="32px"
                                                        loading="eager"
                                                        unoptimized
                                                        className="h-8 w-8 max-h-12 max-w-12 object-contain"
                                                        onError={() => setLogoError(true)}
                                                    />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-sm text-[var(--text-main)]">ToonPlayer</h4>
                                                <p className="break-words text-[10px] leading-relaxed text-[var(--text-muted)]">v3.5 • Full Experience</p>
                                            </div>
                                        </div>
                                        <p className="mb-3 break-words text-[11px] leading-relaxed text-[var(--text-muted)]">
                                            Premium anime & movie streaming. Built with love by Aman Kumar.
                                        </p>
                                        <div className="flex gap-2">
                                            <a href="https://github.com/iamTechieAman" target="_blank" className="flex-1 py-2 text-center bg-bg-main border border-border-color rounded-lg text-[11px] font-bold text-[var(--text-main)] hover:bg-border-color transition-colors">
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
            <AnimatePresence mode="wait">
                {isSearchOpen && (
                    <motion.div
                        key="search-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[55] bg-bg-main flex flex-col md:hidden pt-safe"
                        style={{ willChange: 'opacity' }}
                    >
                        {/* Top bar (sticky) */}
                        <div className="flex items-center gap-3 px-4 py-4 border-b border-border-color bg-bg-main shrink-0">
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
                                        className={`w-full text-[var(--text-main)] border rounded-xl pl-10 pr-[130px] py-3 ring-0 focus:ring-0 outline-none focus:outline-none transition-all text-sm shadow-none ${isDiscoverMode ? 'bg-accent/10 border-accent/50 focus:border-accent' : 'bg-bg-card border-border-color focus:border-accent/60'}`}
                                    />
                                    {/* Mic button */}
                                    <button
                                        type="button"
                                        onClick={toggleVoice}
                                        aria-label={isListening ? "Stop voice search" : "Start voice search"}
                                        className={`absolute right-[60px] top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${
                                            isListening
                                                ? 'bg-red-500/20 text-red-400 animate-pulse'
                                                : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        {isTranscribing ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-accent" />
                                        ) : isListening ? (
                                            <Mic className="w-4 h-4 text-red-400" />
                                        ) : (
                                            <Mic className="w-4 h-4" />
                                        )}
                                    </button>
                                    {/* AI / Discover toggle */}
                                    <button 
                                        type="button"
                                        onClick={() => setIsDiscoverMode(!isDiscoverMode)}
                                        className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-black transition-all ${isDiscoverMode ? 'bg-gradient-to-r from-accent to-accent-secondary text-white shadow-lg shadow-accent/30' : 'bg-bg-main text-[var(--text-muted)] hover:text-white border border-border-color'}`}
                                    >
                                        <Sparkles className="w-3 h-3" />
                                        AI
                                    </button>
                                </form>
                            </div>
                            <button
                                onClick={() => setSearchOpen(false)}
                                className="p-2 bg-bg-card rounded-xl transition-colors active:scale-95 shrink-0"
                            >
                                <X className="w-5 h-5 text-[var(--text-muted)]" />
                            </button>
                        </div>

                        {/* Scrollable body */}
                        <div className="flex-1 overflow-y-auto px-4 pb-28 space-y-6">
                            {/* If query is empty */}
                            {!searchQuery.trim() ? (
                                <>
                                    {/* Pinned Searches */}
                                    {pinnedSearches.length > 0 && (
                                        <div className="pt-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-accent mb-3 flex items-center gap-1.5">
                                                <Pin className="w-3 h-3" /> Pinned Searches
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {pinnedSearches.map((s, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => {
                                                            setSearchQuery(s);
                                                            handleMobileSearchSubmit(s);
                                                        }}
                                                        className="px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-xl text-xs font-bold text-accent active:scale-95 transition-all"
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Recent Searches */}
                                    {recentSearches.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3 flex items-center gap-1.5">
                                                <Clock className="w-3 h-3 text-accent" /> Recent Searches
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {recentSearches.map((s, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => {
                                                            setSearchQuery(s);
                                                            handleMobileSearchSubmit(s);
                                                        }}
                                                        className="px-3 py-1.5 bg-bg-card border border-border-color rounded-xl text-xs font-bold text-[var(--text-main)] active:scale-95 transition-all"
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Popular Genres */}
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">Popular Genres</p>
                                        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                                            {["Action", "Romance", "Comedy", "Fantasy", "Thriller", "Sci-Fi", "Horror", "Drama", "Mystery", "Adventure"].map((genre) => (
                                                <button 
                                                    key={genre}
                                                    onClick={() => { setSearchOpen(false); router.push(`/search?genre=${genre}`, { scroll: false }); }}
                                                    className="px-4 py-2 bg-bg-card border border-border-color rounded-xl text-xs font-bold text-[var(--text-muted)] hover:text-accent hover:border-accent/50 transition-colors active:scale-95 shrink-0"
                                                >
                                                    {genre}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Trending Hits */}
                                    {globalCatalog.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-accent mb-3 flex items-center gap-1.5">
                                                <TrendingUp className="w-3 h-3" /> Trending Hits
                                            </p>
                                            <div className="space-y-2">
                                                {globalCatalog.slice(0, 5).map((item, i) => (
                                                    <Link
                                                        key={i}
                                                        href={item.href || (item.id ? `/watch/${item.type || 'anime'}/${item.id}` : '#')}
                                                        scroll={false}
                                                        className="flex items-center gap-4 p-2 bg-bg-card border border-border-color rounded-2xl active:scale-[0.98] transition-all"
                                                        onClick={() => setSearchOpen(false)}
                                                    >
                                                        <span className="text-sm font-black text-[var(--text-muted)]/50 w-5 text-center italic">0{i + 1}</span>
                                                        <div className="w-10 h-12 relative shrink-0 overflow-hidden rounded-lg bg-bg-elevated border border-white/5">
                                                            {item.image && <Image src={item.image} alt="" fill sizes="48px" className="object-cover" />}
                                                        </div>
                                                        <span className="text-xs font-bold text-[var(--text-main)] truncate flex-1">{item.title}</span>
                                                        <Play className="w-4 h-4 text-accent mr-2 shrink-0" />
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
                                            <div className="space-y-2 max-h-[280px] overflow-y-auto rounded-xl backdrop-blur-xl bg-black/40 border border-white/5 p-2">
                                                {suggestions.map((item) => (
                                                    <Link
                                                        key={`${item.type}-${item.id}`}
                                                        href={item.href || `/watch/${item.type}/${item.id}`}
                                                        scroll={false}
                                                        onClick={() => {
                                                            setSearchOpen(false);
                                                            saveSearch(item.title);
                                                        }}
                                                        className="flex items-center gap-4 p-2 bg-bg-card border border-border-color rounded-2xl active:scale-[0.98] transition-all"
                                                    >
                                                        <div className="w-12 h-16 relative shrink-0 overflow-hidden rounded-xl bg-bg-elevated border border-white/5">
                                                            {item.image ? (
                                                                <Image src={item.image} alt={item.title || "Poster"} fill sizes="80px" className="object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center overflow-hidden">
                                                                    <Play className="w-full h-full max-w-[48px] max-h-[48px] object-contain text-zinc-600 p-2" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <span className="text-xs font-black text-[var(--text-main)] block truncate mb-1">{item.title}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider ${item.type === 'anime' ? 'bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] text-white shadow-inner' : 'bg-blue-500 text-white shadow-inner'}`}>{item.type}</span>
                                                                <span className="text-[10px] text-[var(--text-muted)] font-semibold">{item.format} • {item.year}</span>
                                                                {item.rating && (
                                                                    <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-bold shrink-0">
                                                                        ⭐ {item.rating}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <Play className="w-4 h-4 text-accent mr-2 shrink-0" />
                                                    </Link>
                                                ))}
                                            </div>

                                            <button 
                                                onClick={() => handleMobileSearchSubmit(searchQuery)}
                                                className="w-full py-3.5 bg-gradient-to-r from-accent to-accent-secondary text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-accent/20 active:scale-[0.98]"
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
