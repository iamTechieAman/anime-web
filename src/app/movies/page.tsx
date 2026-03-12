"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Film, Tv, TrendingUp, Flame, Popcorn, Heart, Skull, Laugh, Swords, Sparkles, ChevronUp } from "lucide-react";
import MovieHeroCarousel from "@/components/MovieHeroCarousel";
import { MovieRow, MovieGrid, type MovieItem } from "@/components/MovieCard";

// CineVibe-style category sections with TMDB genre IDs
const GENRE_ROWS = [
    { title: "Action & Adventure", icon: Swords, genreId: "28", type: "movie" },
    { title: "Comedy", icon: Laugh, genreId: "35", type: "movie" },
    { title: "Romance", icon: Heart, genreId: "10749", type: "movie" },
    { title: "Horror & Thriller", icon: Skull, genreId: "27,53", type: "movie" },
    { title: "Animation", icon: Sparkles, genreId: "16", type: "movie" },
    { title: "Science Fiction", icon: Flame, genreId: "878", type: "movie" },
];

// Network IDs for streaming platform rows
const NETWORK_ROWS = [
    { title: "Netflix Originals", networkId: "213", logo: "🔴" },
    { title: "Prime Video", networkId: "1024", logo: "📦" },
    { title: "Disney+", networkId: "2739", logo: "🔵" },
    { title: "Hulu", networkId: "453", logo: "🟢" },
    { title: "HBO Shows", networkId: "49", logo: "🟣" },
    { title: "Apple TV+", networkId: "2552", logo: "⚪" },
    { title: "Paramount+", networkId: "4330", logo: "⛰️" },
    { title: "Peacock", networkId: "3353", logo: "🦚" },
];

// Nav tabs
const TABS = [
    { id: "home", label: "Home", icon: Film },
    { id: "movies", label: "Movies", icon: Popcorn },
    { id: "tv", label: "TV Shows", icon: Tv },
    { id: "trending", label: "Trending", icon: TrendingUp },
];

export default function MoviesPage() {
    const [activeTab, setActiveTab] = useState("home");
    const [trending, setTrending] = useState<MovieItem[]>([]);
    const [popular, setPopular] = useState<MovieItem[]>([]);
    const [topRated, setTopRated] = useState<MovieItem[]>([]);
    const [nowPlaying, setNowPlaying] = useState<MovieItem[]>([]);
    const [tvPopular, setTvPopular] = useState<MovieItem[]>([]);
    const [tvTopRated, setTvTopRated] = useState<MovieItem[]>([]);
    const [genreData, setGenreData] = useState<Record<string, MovieItem[]>>({});
    const [networkData, setNetworkData] = useState<Record<string, MovieItem[]>>({});
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<MovieItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);

    // Scroll-to-top visibility
    useEffect(() => {
        const handleScroll = () => setShowScrollTop(window.scrollY > 500);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Fetch main data sequentially to avoid maxing out concurrent connections
    useEffect(() => {
        const loadAllData = async () => {
            // 1. Fetch main headers
            try {
                const [trendingRes, popularRes, topRatedRes, nowPlayingRes, tvPopRes, tvTopRes] = await Promise.all([
                    axios.get("/api/prime/trending"),
                    axios.get("/api/prime/movies?category=popular"),
                    axios.get("/api/prime/movies?category=top_rated"),
                    axios.get("/api/prime/movies?category=now_playing"),
                    axios.get("/api/prime/tv?category=popular"),
                    axios.get("/api/prime/tv?category=top_rated"),
                ]);

                const rawTrending = trendingRes.data.results || [];
                const enhancedTrending = rawTrending.map((item: MovieItem, index: number) => ({
                    ...item,
                    rank: index < 10 ? index + 1 : undefined,
                    isMostViewed: index < 3,
                    liveViewers: index < 10 ? Math.floor(Math.random() * (5000 - 1000) + 1000) : undefined
                }));

                setTrending(enhancedTrending);
                setPopular(popularRes.data.results || []);
                setTopRated(topRatedRes.data.results || []);
                setNowPlaying(nowPlayingRes.data.results || []);
                setTvPopular(tvPopRes.data.results || []);
                setTvTopRated(tvTopRes.data.results || []);
            } catch (err) {
                console.error("Failed to fetch main data:", err);
            }

            // 2. Fetch networks
            try {
                const promises = NETWORK_ROWS.map((net) =>
                    axios.get(`/api/prime/discover?media_type=tv&network_id=${net.networkId}`)
                );
                const results = await Promise.allSettled(promises);
                const newNetworkData: Record<string, MovieItem[]> = {};
                NETWORK_ROWS.forEach((net, i) => {
                    const res = results[i];
                    if (res.status === "fulfilled") {
                        if (res.value.data.results && res.value.data.results.length > 0) {
                            newNetworkData[net.title] = res.value.data.results;
                        }
                    } else {
                        console.error(`Failed to fetch ${net.title}:`, res.reason);
                    }
                });
                setNetworkData(newNetworkData);
            } catch (err) {
                console.error("Failed to fetch network data:", err);
            }

            // 3. Fetch genres
            try {
                const promises = GENRE_ROWS.map((genre) =>
                    axios.get(`/api/prime/discover?media_type=${genre.type}&genre_id=${genre.genreId}`)
                );
                const results = await Promise.allSettled(promises);
                const newGenreData: Record<string, MovieItem[]> = {};
                GENRE_ROWS.forEach((genre, i) => {
                    const res = results[i];
                    if (res.status === "fulfilled") {
                        if (res.value.data.results && res.value.data.results.length > 0) {
                            newGenreData[genre.title] = res.value.data.results;
                        }
                    } else {
                        console.error(`Failed to fetch ${genre.title}:`, res.reason);
                    }
                });
                setGenreData(newGenreData);
            } catch (err) {
                console.error("Failed to fetch genres:", err);
            }
        };

        loadAllData();
    }, []);

    // Simulated Live Polling for Viewership Data
    useEffect(() => {
        if (trending.length === 0) return;

        const interval = setInterval(() => {
            setTrending((prev) =>
                prev.map((item) => {
                    if (!item.liveViewers) return item;
                    // Fluctuate viewers by up to +/- 100
                    const change = Math.floor(Math.random() * 201) - 100;
                    return { ...item, liveViewers: Math.max(100, item.liveViewers + change) };
                })
            );
        }, 5000); // Poll every 5 seconds for visual "live updates"

        return () => clearInterval(interval);
    }, [trending.length > 0]); // only trigger once when trending has data

    // Search handler
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }
        setIsSearching(true);
        const timer = setTimeout(async () => {
            try {
                const res = await axios.get(`/api/prime/search?q=${encodeURIComponent(searchQuery)}`);
                setSearchResults(res.data.results || []);
            } catch (err) {
                console.error("Search failed:", err);
            } finally {
                setIsSearching(false);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Filter content based on active tab
    const getFilteredContent = () => {
        switch (activeTab) {
            case "movies":
                return { showMoviesOnly: true };
            case "tv":
                return { showTvOnly: true };
            case "trending":
                return { showTrendingOnly: true };
            default:
                return { showAll: true };
        }
    };

    const filter = getFilteredContent();

    return (
        <main className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)]">
            {/* Top Navigation Bar — ToonPlayer Movies style */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-main)]/90 backdrop-blur-xl border-b border-[var(--border-color)]">
                <div className="max-w-7xl mx-auto px-4 md:px-6">
                    <div className="flex items-center justify-between h-14">
                        {/* Logo */}
                        <div className="flex items-center gap-6">
                            <a href="/movies" className="flex items-center gap-2 text-xl font-black tracking-tight">
                                <div className="w-6 h-6 relative hidden sm:block">
                                    <img src="/logo.png" alt="ToonPlayer Logo" className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                                </div>
                                <span className="text-[var(--text-main)]">ToonPlayer</span>
                                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-widest -ml-1 mt-1">Movies</span>
                            </a>

                            {/* Desktop tabs */}
                            <div className="hidden md:flex items-center gap-1">
                                {TABS.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                            ? "bg-blue-500/15 text-blue-400"
                                            : "text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-card)]"
                                            }`}
                                    >
                                        <tab.icon className="w-4 h-4" />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Search & Global Nav */}
                        <div className="flex items-center gap-3">
                            <Link href="/" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-card)] hover:bg-[var(--border-color)] border border-[var(--border-color)] rounded-lg text-xs font-medium text-[var(--text-main)] hover:text-white transition-colors">
                                <span className="text-purple-400 font-bold">←</span> Back to Anime
                            </Link>

                            <AnimatePresence>
                                {showSearch && (
                                    <motion.div
                                        initial={{ width: 0, opacity: 0 }}
                                        animate={{ width: "100%", maxWidth: 250, opacity: 1 }}
                                        exit={{ width: 0, opacity: 0 }}
                                        className="overflow-hidden absolute right-12 md:relative md:right-0 bg-[var(--bg-main)] md:bg-transparent p-2 md:p-0 flex-1 z-50 rounded-lg shadow-2xl shadow-black/50 md:shadow-none"
                                        style={{ minWidth: showSearch ? '200px' : '0' }}
                                    >
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search movies & TV..."
                                            className="w-full px-3 py-1.5 md:py-2 bg-white/10 md:bg-[var(--bg-card)] border border-[var(--border-color)] md:border-[var(--border-color)] rounded-lg text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/50"
                                            autoFocus
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <button
                                onClick={() => {
                                    setShowSearch(!showSearch);
                                    if (showSearch) { setSearchQuery(""); setSearchResults([]); }
                                }}
                                className={`p-2 rounded-lg transition-colors z-50 relative ${showSearch ? 'bg-white/10 md:bg-[var(--bg-card)]' : 'hover:bg-[var(--bg-card)]'}`}
                            >
                                {showSearch ? <X className="w-5 h-5 text-[var(--text-main)]" /> : <Search className="w-5 h-5 text-[var(--text-main)]" />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile tabs */}
                    <div className="flex justify-between items-center pb-2 md:hidden">
                        <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                                        ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                                        : "text-[var(--text-muted)] hover:text-white"
                                        }`}
                                >
                                    <tab.icon className="w-3 h-3" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        <Link href="/" className="flex items-center gap-1 pl-2 ml-2 border-l border-[var(--border-color)] text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)] hover:text-purple-400 whitespace-nowrap shrink-0">
                            <span>←</span> Anime
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="pt-[104px] md:pt-14">
                {/* Search Results */}
                {searchQuery.trim() ? (
                    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
                        <h2 className="text-xl font-bold mb-6">
                            {isSearching ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    Searching...
                                </span>
                            ) : (
                                <>Results for &ldquo;{searchQuery}&rdquo;</>
                            )}
                        </h2>
                        {searchResults.length > 0 ? (
                            <MovieGrid items={searchResults} />
                        ) : (
                            !isSearching && (
                                <div className="text-center py-20">
                                    <p className="text-[var(--text-muted)] text-lg">No results found</p>
                                    <p className="text-zinc-600 text-sm mt-1">Try a different search term</p>
                                </div>
                            )
                        )}
                    </div>
                ) : (
                    <>
                        {/* Hero Carousel */}
                        <MovieHeroCarousel items={trending.length > 0 ? trending : popular} />

                        {/* Content Sections */}
                        <div className="max-w-7xl mx-auto px-3 md:px-6 py-6 md:py-8 space-y-8 md:space-y-10">
                            {/* Loading skeletons when data hasn't arrived */}
                            {trending.length === 0 && popular.length === 0 && (
                                <div className="space-y-10">
                                    {[1, 2, 3].map((i) => (
                                        <section key={i}>
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-1 h-6 bg-[var(--bg-card)] rounded-full animate-pulse" />
                                                <div className="h-6 w-40 bg-[var(--bg-card)] rounded-lg animate-pulse" />
                                            </div>
                                            <div className="flex overflow-hidden gap-3">
                                                {[...Array(7)].map((_, j) => (
                                                    <div key={j} className="flex-shrink-0 w-[155px] md:w-[170px]">
                                                        <div className="aspect-[2/3] rounded-xl bg-[var(--bg-card)] animate-pulse" />
                                                        <div className="h-3 w-3/4 mt-2 bg-[var(--bg-card)] rounded animate-pulse" />
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    ))}
                                </div>
                            )}
                            {/* Trending */}
                            {(filter.showAll || filter.showTrendingOnly) && trending.length > 0 && (
                                <section>
                                    <SectionHeader icon={TrendingUp} title="Trending Now" color="text-red-400" />
                                    <MovieRow items={trending} title="trending" />
                                </section>
                            )}

                            {/* Popular Movies */}
                            {(filter.showAll || filter.showMoviesOnly) && popular.length > 0 && (
                                <section>
                                    <SectionHeader icon={Flame} title="Popular Movies" color="text-orange-400" />
                                    <MovieRow items={popular} type="movie" title="popular-movies" />
                                </section>
                            )}

                            {/* Popular TV */}
                            {(filter.showAll || filter.showTvOnly) && tvPopular.length > 0 && (
                                <section>
                                    <SectionHeader icon={Tv} title="Popular TV Shows" color="text-purple-400" />
                                    <MovieRow items={tvPopular} type="tv" title="popular-tv" />
                                </section>
                            )}

                            {/* Network Rows — CineVibe feature */}
                            {(filter.showAll || filter.showTvOnly) && NETWORK_ROWS.map((net) => (
                                networkData[net.title] && networkData[net.title].length > 0 && (
                                    <section key={net.title}>
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className="text-xl">{net.logo}</span>
                                            <h2 className="text-lg font-bold text-[var(--text-main)]">{net.title}</h2>
                                        </div>
                                        <MovieRow items={networkData[net.title]} type="tv" title={net.title} />
                                    </section>
                                )
                            ))}

                            {/* Now Playing */}
                            {(filter.showAll || filter.showMoviesOnly) && nowPlaying.length > 0 && (
                                <section>
                                    <SectionHeader icon={Popcorn} title="Now Playing in Theaters" color="text-yellow-400" />
                                    <MovieRow items={nowPlaying} type="movie" title="now-playing" />
                                </section>
                            )}

                            {/* Genre Rows */}
                            {(filter.showAll || filter.showMoviesOnly) && GENRE_ROWS.map((genre) => (
                                genreData[genre.title] && genreData[genre.title].length > 0 && (
                                    <section key={genre.title}>
                                        <SectionHeader icon={genre.icon} title={genre.title} color="text-blue-400" />
                                        <MovieRow items={genreData[genre.title]} type={genre.type} title={genre.title} />
                                    </section>
                                )
                            ))}

                            {/* Top Rated Movies */}
                            {(filter.showAll || filter.showMoviesOnly) && topRated.length > 0 && (
                                <section>
                                    <SectionHeader icon={Sparkles} title="Top Rated Movies" color="text-green-400" />
                                    <MovieRow items={topRated} type="movie" title="top-rated" />
                                </section>
                            )}

                            {/* Top Rated TV */}
                            {(filter.showAll || filter.showTvOnly) && tvTopRated.length > 0 && (
                                <section>
                                    <SectionHeader icon={Sparkles} title="Top Rated TV Shows" color="text-teal-400" />
                                    <MovieRow items={tvTopRated} type="tv" title="top-rated-tv" />
                                </section>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Footer */}
            <footer className="border-t border-[var(--border-color)] py-8 px-4 mt-10">
                <div className="max-w-7xl mx-auto text-center text-zinc-600 text-xs">
                    <p className="font-medium mb-1">
                        <span className="text-[var(--text-main)]">ToonPlayer</span>
                        <span className="text-[var(--text-muted)] ml-1">Movies</span>
                        {" "} — Powered by TMDB
                    </p>
                    <p>This platform serves as a content aggregator and does not host any media files directly.</p>
                    <p className="mt-1">© 2026 ToonPlayer Movies. All rights reserved.</p>
                </div>
            </footer>

            {/* Scroll to Top */}
            <AnimatePresence>
                {showScrollTop && (
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="fixed bottom-6 right-6 z-40 p-3 bg-blue-500/90 hover:bg-blue-500 text-white rounded-full shadow-[0_0_20px_rgba(59,130,246,0.4)] backdrop-blur-sm transition-colors"
                    >
                        <ChevronUp className="w-5 h-5" />
                    </motion.button>
                )}
            </AnimatePresence>
        </main>
    );
}

// Section Header Component
function SectionHeader({ icon: Icon, title, color }: { icon: React.ComponentType<{ className?: string }>; title: string; color: string }) {
    return (
        <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" />
            <Icon className={`w-5 h-5 ${color}`} />
            <h2 className="text-lg font-bold text-[var(--text-main)]">{title}</h2>
        </div>
    );
}
