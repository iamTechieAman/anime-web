"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Film, Tv, TrendingUp, Flame, Popcorn, Heart, Skull, Laugh, Swords, Sparkles, ChevronUp, SlidersHorizontal, User, History, LogOut } from "lucide-react";
import { MovieRow, MovieGrid, type MovieItem } from "@/components/MovieCard";
import HeroCarousel from "@/components/HeroCarousel";
import { AnimeGrid, AnimeCardHorizontal, type Show } from "@/components/AnimeCard";
import useSWR from 'swr';

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
    { id: "home", label: "Explore", icon: Film },
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
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [profile, setProfile] = useState<{name: string, avatar: string} | null>(null);
    const [showProfile, setShowProfile] = useState(false);

    // Anime Data using SWR (same as old home page for consistency)
    const fetcher = (url: string) => axios.get(url).then(res => res.data);
    const { data: animeRecent } = useSWR('/api/anime/recent', fetcher, { refreshInterval: 60000 });
    const { data: animeTrending } = useSWR('/api/anime/trending', fetcher, { refreshInterval: 300000 });
    const { data: animePopular } = useSWR('/api/anime/popular', fetcher, { refreshInterval: 300000 });

    // Helper to get active filters
    const getFilteredContent = () => ({
        showMoviesOnly: activeTab === "movies",
        showTvOnly: activeTab === "tv",
        showTrendingOnly: activeTab === "trending",
        showAll: activeTab === "home"
    });

    // Fetch user profile
    useEffect(() => {
        const updateProfile = () => {
            const p = localStorage.getItem("toonplayer_profile");
            if (p) {
                try { setProfile(JSON.parse(p)); } catch(e) {}
            }
        };
        updateProfile();
        window.addEventListener('profileUpdated', updateProfile);
        return () => window.removeEventListener('profileUpdated', updateProfile);
    }, []);

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
                const res = await axios.get(`/api/search/unified?q=${encodeURIComponent(searchQuery)}`);
                setSearchResults(res.data.results || []);
            } catch (err) {
                console.error("Search failed:", err);
            } finally {
                setIsSearching(false);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const filter = getFilteredContent();

    // Check for search query in URL
    const paramsInUrl = useSearchParams();
    useEffect(() => {
        const q = paramsInUrl?.get('q');
        if (q) {
            setSearchQuery(q);
            handleSearch(q);
        } else {
            setSearchQuery("");
            setSearchResults([]);
        }
    }, [paramsInUrl]);

    const handleSearch = async (query: string) => {
        setIsSearching(true);
        try {
            const res = await axios.get(`/api/search/unified?q=${encodeURIComponent(query)}`);
            setSearchResults(res.data.results || []);
        } catch (err) {
            console.error("Search failed:", err);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <main className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] selection:bg-purple-500/30 overflow-x-hidden transition-colors duration-300">
            {/* Background Ambience */}
            <div className="fixed inset-0 z-0 pointer-events-none bg-[var(--bg-main)]">
                <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-900/10 to-transparent opacity-50" />
            </div>

            <div className="relative z-10 w-full pb-24 md:pb-0">
                {/* Hero section - Unified or Anime Primary */}
                <HeroCarousel />

                {/* Genres & Categories Sub-Nav */}
                <div className="bg-[var(--bg-card)]/80 backdrop-blur-md border-y border-[var(--border-color)] sticky top-0 z-40">
                    <div className="w-full max-w-[2000px] mx-auto px-4 md:px-6 py-2 flex items-center justify-between pointer-events-auto">
                        <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar z-50">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer relative z-50 ${activeTab === tab.id
                                        ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                                        : "text-[var(--text-muted)] hover:text-white hover:bg-white/5"
                                    }`}
                                >
                                    <tab.icon className="w-3.5 h-3.5" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-[var(--border-color)] ml-4">
                            <span className="text-[10px] uppercase tracking-wider font-black text-[var(--text-muted)]">Quick Filters:</span>
                            {GENRE_ROWS.slice(0, 4).map(g => (
                                <button 
                                    key={g.genreId}
                                    onClick={() => document.getElementById(`genre-${g.genreId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                                    className="px-2.5 py-1 text-[10px] font-bold text-[var(--text-muted)] hover:text-white transition-colors"
                                >
                                    {g.title}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="w-full max-w-[2000px] mx-auto px-3 md:px-6 py-4 md:py-8">
                    {searchQuery ? (
                        <div className="space-y-8">
                            <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                <Search className="w-6 h-6 text-purple-400" />
                                {isSearching ? "Searching..." : `Results for "${searchQuery}"`}
                            </h2>
                            {searchResults.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                                    {searchResults.map((item: any) => (
                                        <Link
                                            key={`${item.type}-${item.id}`}
                                            href={item.href}
                                            className="group relative bg-[var(--bg-card)] rounded-xl overflow-hidden border border-[var(--border-color)] hover:border-purple-500/50 transition-all hover:scale-[1.02] duration-300 shadow-lg"
                                        >
                                            <div className="aspect-[2/3] relative">
                                                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                                <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/80 backdrop-blur-md text-[10px] font-black uppercase tracking-tighter text-white border border-white/10">
                                                    {item.type}
                                                </div>
                                            </div>
                                            <div className="p-3">
                                                <h3 className="text-sm font-bold text-white truncate leading-tight mb-1 group-hover:text-purple-400 transition-colors uppercase tracking-tight">{item.title}</h3>
                                                <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-medium">
                                                    <span>{item.format}</span>
                                                    <span>{item.year}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                !isSearching && <div className="text-center py-20 text-[var(--text-muted)]">No results found for your search.</div>
                            )}
                        </div>
                    ) : activeTab === "home" ? (
                        <div className="flex flex-col lg:flex-row gap-6 md:gap-10">
                            {/* Main Feed */}
                            <div className="flex-1 space-y-12 min-w-0">
                                {/* Recently Updated Anime */}
                                <section>
                                    <SectionHeader icon={Sparkles} title="Recently Updated Anime" color="text-purple-400" />
                                    {animeRecent?.shows ? <AnimeGrid shows={animeRecent.shows.slice(0, 12)} prefix="recent" /> : <RowSkeleton />}
                                </section>
                                {/* Trending Movies & TV */}
                                <section>
                                    <SectionHeader icon={TrendingUp} title="Trending Movies & TV" color="text-red-400" />
                                    {trending.length > 0 ? <MovieRow items={trending} title="movie-trending" /> : <RowSkeleton />}
                                </section>
                                
                                {/* Popular Anime */}
                                <section>
                                    <SectionHeader icon={Flame} title="Popular Anime" color="text-orange-400" />
                                    {animePopular?.shows ? <AnimeGrid shows={animePopular.shows.slice(0, 12)} prefix="popular" /> : <RowSkeleton />}
                                </section>
                                
                                {/* Now Playing */}
                                <section>
                                    <SectionHeader icon={Popcorn} title="Now Playing in Theaters" color="text-yellow-400" />
                                    {nowPlaying.length > 0 ? <MovieRow items={nowPlaying} type="movie" title="now-playing" /> : <RowSkeleton />}
                                </section>

                                {/* Genre Discovery */}
                                {GENRE_ROWS.map((genre) => (
                                    genreData[genre.title] && (
                                        <section key={genre.title} id={`genre-${genre.genreId}`}>
                                            <SectionHeader icon={genre.icon} title={genre.title} color="text-blue-400" />
                                            <MovieRow items={genreData[genre.title]} type={genre.type} title={genre.title} />
                                        </section>
                                    )
                                ))}
                            </div>

                            {/* Sidebar - Trending & Airing */}
                            <div className="w-full lg:w-[320px] xl:w-[380px] space-y-10 shrink-0">
                                {/* Top Airing Anime */}
                                <section className="bg-[var(--bg-card)]/50 p-5 rounded-2xl border border-[var(--border-color)]">
                                    <h2 className="text-lg font-bold font-sora text-white mb-5 flex items-center gap-2">
                                        <Tv className="w-5 h-5 text-purple-400" /> 
                                        Top Anime
                                    </h2>
                                    <div className="flex flex-col gap-3">
                                        {animeTrending?.shows?.slice(0, 6).map((show: Show, i: number) => (
                                            <AnimeCardHorizontal key={`trending-${show._id}`} show={show} rank={i} />
                                        ))}
                                    </div>
                                </section>

                                {/* Top Rated Movies */}
                                <section className="bg-[var(--bg-card)]/50 p-5 rounded-2xl border border-[var(--border-color)]">
                                    <h2 className="text-lg font-bold font-sora text-white mb-5 flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-yellow-400" /> 
                                        Top Rated Movies
                                    </h2>
                                    {topRated.slice(0, 6).map((item, i) => (
                                        <div key={item.id} className="flex items-center gap-3 py-2 group cursor-pointer border-b border-white/5 last:border-0">
                                            <span className="text-2xl font-black text-white/10 group-hover:text-blue-500/50 transition-colors w-6">0{i+1}</span>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-bold text-white truncate group-hover:text-blue-400 transition-colors">{item.title}</h3>
                                                <p className="text-[10px] text-[var(--text-muted)]">★ {item.vote_average?.toFixed(1)} • {item.release_date?.split('-')[0]}</p>
                                            </div>
                                        </div>
                                    ))}
                                </section>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-10">
                            {activeTab === "movies" && popular.length > 0 && <section><SectionHeader icon={Film} title="Popular Movies" color="text-blue-400" /><MovieGrid items={popular} /></section>}
                            {activeTab === "tv" && tvPopular.length > 0 && <section><SectionHeader icon={Tv} title="Popular TV Shows" color="text-purple-400" /><MovieGrid items={tvPopular} /></section>}
                            {activeTab === "trending" && trending.length > 0 && <section><SectionHeader icon={TrendingUp} title="Currently Trending" color="text-red-400" /><MovieGrid items={trending} /></section>}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <footer className="border-t border-[var(--border-color)] py-8 px-4 mt-10">
                <div className="w-full max-w-[2000px] mx-auto text-center text-zinc-600 text-xs">
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

// Row Skeleton for Anime
function RowSkeleton() {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-[3/4.5] rounded-xl bg-white/5 animate-pulse" />
            ))}
        </div>
    );
}
