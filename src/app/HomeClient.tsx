"use client";

import React, { useState, useEffect, memo } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, CheckCircle, ChevronDown, ChevronUp, Clock, Film, Flame, Heart, History, Info, Laugh, LogOut, Play, Popcorn, Search, Skull, SlidersHorizontal, Sparkles, Star, Swords, TrendingUp, Tv, User, X, Zap } from "lucide-react";
import { MovieGrid, type MovieItem } from "@/components/MovieCard";
import { AnimeGrid, type Show } from "@/components/AnimeCard";
import useSWR from 'swr';
import type { ProviderSlug } from "@/components/ProviderBar";
import dynamic from "next/dynamic";

const HeroCarousel = dynamic(() => import("@/components/HeroCarousel"), { ssr: false, loading: () => <div className="h-[60vh] md:h-[70vh] bg-zinc-900 animate-pulse rounded-2xl w-full" /> });
const MovieRow = dynamic(() => import("@/components/MovieCard").then(mod => mod.MovieRow), { ssr: false });
const AnimeCardHorizontal = dynamic(() => import("@/components/AnimeCard").then(mod => mod.AnimeCardHorizontal), { ssr: false });
const ContinueWatchingRow = dynamic(() => import("@/components/ContinueWatchingRow"), { ssr: false });
const ProviderBar = dynamic(() => import("@/components/ProviderBar"), { ssr: false });

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
    { id: "movies", label: "Movies", icon: Popcorn },
    { id: "tv", label: "TV Shows", icon: Tv },
    { id: "anime", label: "Anime", icon: Sparkles },
    { id: "trending", label: "Trending", icon: TrendingUp },
    { id: "discover", label: "Discover", icon: Zap },
];

export default function MoviesPage() {
    const [activeTab, setActiveTab] = useState("movies");
    const [activeProvider, setActiveProvider] = useState<ProviderSlug>("all");
    const [providerData, setProviderData] = useState<Record<string, any>>({}); // keyed by slug
    const [providerLoading, setProviderLoading] = useState(false);
    const [trending, setTrending] = useState<MovieItem[]>([]);
    const [popular, setPopular] = useState<MovieItem[]>([]);
    const [topRated, setTopRated] = useState<MovieItem[]>([]);
    const [nowPlaying, setNowPlaying] = useState<MovieItem[]>([]);
    const [tvPopular, setTvPopular] = useState<MovieItem[]>([]);
    const [tvTopRated, setTvTopRated] = useState<MovieItem[]>([]);
    const [genreData, setGenreData] = useState<Record<string, MovieItem[]>>({});
    const [networkData, setNetworkData] = useState<Record<string, MovieItem[]>>({});
    const [animeLatest, setAnimeLatest] = useState<any[]>([]);
    const [animeTrending, setAnimeTrending] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<MovieItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [trendingPeople, setTrendingPeople] = useState<any[]>([]);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [profile, setProfile] = useState<{name: string, avatar: string} | null>(null);

    // Premium Extra Categories
    const [podcasts, setPodcasts] = useState<any[]>([]);
    const [books, setBooks] = useState<any[]>([]);
    const [songs, setSongs] = useState<any[]>([]);
    const [videos, setVideos] = useState<any[]>([]);
    const [mjItems, setMjItems] = useState<any[]>([]);

    // Fetch Movie Data for Unified Home
    const fetcher = (url: string) => axios.get(url).then(res => res.data);
    
    // Fetch current user from secure API
    const { data: userData } = useSWR('/api/auth/me', fetcher, {
        revalidateOnFocus: false,       // don't re-fetch auth when user alt-tabs
        shouldRetryOnError: false,      // don't retry 4xx auth failures
        dedupingInterval: 60000,        // cache result for 60s
        onErrorRetry: (err, _key, _cfg, revalidate, { retryCount }) => {
            const status = err?.status ?? err?.response?.status;
            if (status === 401 || status === 403 || status === 404) return; // never retry auth failures
            if (retryCount >= 2) return;
            setTimeout(() => revalidate({ retryCount }), 5000);
        },
    });

    
    useEffect(() => {
        if (userData?.user) {
            setProfile(userData.user);
        } else {
            setProfile(null);
        }
    }, [userData]);

    const { data: movieTrending } = useSWR('/api/prime/trending', fetcher);
    const { data: moviePopular } = useSWR('/api/prime?category=popular', fetcher);
    const { data: movieUpcoming } = useSWR('/api/prime?category=now_playing', fetcher);
    const { data: moviePeople } = useSWR('/api/prime/trending?type=person', fetcher);

    // Scroll-to-top visibility
    useEffect(() => {
        const handleScroll = () => setShowScrollTop(window.scrollY > 500);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (movieTrending?.results) {
            const rawTrending = movieTrending.results || [];
            const validTrending = rawTrending.filter((item: MovieItem) => item && (item.poster_path || item.backdrop_path));
            const enhancedTrending = validTrending.map((item: MovieItem, index: number) => ({
                ...item,
                rank: index < 10 ? index + 1 : undefined,
                isMostViewed: index < 3,
                liveViewers: index < 10 ? Math.floor(Math.random() * (5000 - 1000) + 1000) : undefined
            }));
            setTrending(enhancedTrending);
        }
    }, [movieTrending]);

    useEffect(() => { if (Array.isArray(moviePopular?.results)) setPopular(moviePopular.results.filter((i: any) => i && (i.poster_path || i.backdrop_path))); }, [moviePopular]);
    useEffect(() => { if (Array.isArray(movieUpcoming?.results)) setNowPlaying(movieUpcoming.results.filter((i: any) => i && (i.poster_path || i.backdrop_path))); }, [movieUpcoming]);
    useEffect(() => { if (Array.isArray(moviePeople?.results)) setTrendingPeople(moviePeople.results.filter((i: any) => i && i.profile_path).slice(0, 6)); }, [moviePeople]);

    // Fetch main data sequentially (remaining axios calls)
    useEffect(() => {
        const loadOtherData = async () => {
            // Fetch top rated movies, tv popular, tv top rated
            try {
                const [topRatedRes, tvPopRes, tvTopRes] = await Promise.all([
                    axios.get("/api/prime?category=top_rated"),
                    axios.get("/api/prime/tv?category=popular"),
                    axios.get("/api/prime/tv?category=top_rated"),
                ]);

                setTopRated(Array.isArray(topRatedRes.data.results) ? topRatedRes.data.results.filter((i: any) => i && (i.poster_path || i.backdrop_path)) : []);
                setTvPopular(Array.isArray(tvPopRes.data.results) ? tvPopRes.data.results.filter((i: any) => i && (i.poster_path || i.backdrop_path)) : []);
                setTvTopRated(Array.isArray(tvTopRes.data.results) ? tvTopRes.data.results.filter((i: any) => i && (i.poster_path || i.backdrop_path)) : []);
            } catch (err) {
                console.error("Failed to fetch main data:", err);
            }

            // Fetch genres (since we only show these for movies now, it fits the movies tab)
            try {
                const promises = GENRE_ROWS.map((genre) =>
                    axios.get(`/api/prime/discover?media_type=${genre.type}&genre_id=${genre.genreId}`)
                );
                const results = await Promise.allSettled(promises);
                const newGenreData: Record<string, MovieItem[]> = {};
                GENRE_ROWS.forEach((genre, i) => {
                    const res = results[i];
                    if (res.status === "fulfilled" && res.value.data.results?.length > 0) {
                        newGenreData[genre.title] = res.value.data.results.filter((i: any) => i && (i.poster_path || i.backdrop_path));
                    }
                });
                setGenreData(newGenreData);
            } catch (err) {
                console.error("Failed to fetch genres:", err);
            }
            
            // Fetch networks
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
                    }
                });
                setNetworkData(newNetworkData);
            } catch (err) {
                console.error("Failed to fetch network data:", err);
            }

            // Fetch Anime Home
            try {
                const animeRes = await axios.get("/api/anime/home");
                if (Array.isArray(animeRes.data.latest)) setAnimeLatest(animeRes.data.latest.filter((i: any) => i && i.image));
                if (Array.isArray(animeRes.data.trending)) setAnimeTrending(animeRes.data.trending.filter((i: any) => i && i.image));
            } catch (err) {
                console.error("Failed to fetch anime home:", err);
            }


            // Fetch Premium Extra Content
            try {
                const premiumRes = await axios.get("/data/premium_content.json");
                const data = premiumRes.data;
                setPodcasts(data.trending_podcasts || []);
                setBooks(data.trending_books || []);
                setSongs(data.trending_songs || []);
                setVideos(data.trending_videos || []);
                
                // Group MJ items for theme alignment
                const allMj = [
                    ...(data.trending_movies || []),
                    ...(data.trending_tv_shows || []),
                    ...(data.trending_podcasts || []),
                    ...(data.trending_books || []),
                    ...(data.trending_songs || []),
                    ...(data.trending_videos || [])
                ].filter(item => item && (item.title?.toLowerCase().includes('michael jackson') || item.artist?.toLowerCase().includes('michael jackson') || item.author?.toLowerCase().includes('michael jackson') || item.title === "Michael" || item.title === "The Wiz" || item.title === "Moonwalker" || item.title === "This Is It"));
                
                setMjItems(allMj.slice(0, 8));
            } catch (err) {
                console.error("Failed to fetch premium content:", err);
            }
        };

        loadOtherData();
    }, []);

    // Provider switching: fetch from /api/provider when activeProvider changes
    useEffect(() => {
        if (activeProvider === "all") return; // reset handled below
        if (providerData[activeProvider]) return; // already cached

        setProviderLoading(true);
        const controller = new AbortController();
        axios
            .get(`/api/provider?provider=${activeProvider}`, { signal: controller.signal })
            .then((res) => {
                setProviderData((prev) => ({ ...prev, [activeProvider]: res.data }));
            })
            .catch((err) => {
                if (!axios.isCancel(err)) console.error("Provider fetch error:", err);
            })
            .finally(() => setProviderLoading(false));

        return () => controller.abort();
    }, [activeProvider]);



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

    // Check for search query in URL
    const paramsInUrl = useSearchParams();
    useEffect(() => {
        const q = paramsInUrl?.get('q');
        if (q) {
            setSearchQuery(q);
        }
    }, [paramsInUrl]);

    return (
        <div className="bg-[var(--bg-main)] text-[var(--text-main)] selection:bg-orange-500/25 transition-colors duration-300">
            {/* Background Ambience */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-[var(--accent)]/[0.03] to-transparent" />
            </div>

            <div className="relative z-10 w-full">
                <h1 className="sr-only">ToonPlayer - Watch Free Anime & Movies</h1>
                <HeroCarousel />

                {/* Provider Bar — sticky, below hero */}
                <ProviderBar
                    activeProvider={activeProvider}
                    onProviderChange={(slug) => setActiveProvider(slug)}
                    isLoading={providerLoading}
                />

                {/* Genres & Categories Sub-Nav */}
                <div className="bg-[var(--bg-overlay)]/95 backdrop-blur-3xl border-b border-white/5 sticky top-[64px] z-40 shadow-[0_10px_30px_rgba(0,0,0,0.3)] py-1 transition-all duration-300">
                    <div className="w-full max-w-[1800px] mx-auto px-4 md:px-6 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar z-50">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer relative z-50 border ${activeTab === tab.id
                                        ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] text-white border-transparent shadow-[0_0_20px_rgba(88,101,242,0.35)] scale-105"
                                        : "bg-[var(--bg-card)] border-white/5 text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
                                    }`}
                                >
                                    <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'animate-pulse' : ''}`} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        <div className="hidden lg:flex items-center gap-4 pl-6 border-l border-white/10 ml-6">
                            <span className="text-[11px] uppercase tracking-[0.2em] font-black text-[var(--text-muted)]">Quick Filters:</span>
                            {GENRE_ROWS.slice(0, 4).map(g => (
                                <button 
                                    key={g.genreId}
                                    onClick={() => document.getElementById(`genre-${g.genreId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-all"
                                >
                                    {g.title}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="w-full max-w-[1800px] mx-auto px-4 md:px-6 py-4">
                    {searchQuery ? (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                <Search className="w-6 h-6 text-[var(--accent)]" />
                                {isSearching ? "Searching..." : `Results for "${searchQuery}"`}
                            </h2>
                            {searchResults.length > 0 ? (
                                <div className="responsive-grid">
                                    {searchResults.map((item: any) => (
                                        <Link
                                            key={`${item.type}-${item.id}`}
                                            href={item.href}
                                            className="group relative bg-[var(--bg-card)] rounded-xl overflow-hidden border border-[var(--border-color)] hover:border-[var(--accent)]/40 transition-all hover:scale-[1.02] duration-300 shadow-lg"
                                        >
                                            <div className="aspect-[2/3] relative">
                                                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                                <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/80 backdrop-blur-md text-[10px] font-black uppercase tracking-tighter text-white border border-white/10">
                                                    {item.type}
                                                </div>
                                            </div>
                                            <div className="p-3">
                                                <h3 className="text-sm font-bold text-white truncate leading-tight mb-1 group-hover:text-[var(--accent)] transition-colors tracking-tight">{item.title}</h3>
                                                <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-medium">
                                                    <span>{item.format}</span>
                                                    <span>{item.year}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                !isSearching && <div className="text-center py-4 md:py-6 text-[var(--text-muted)]">No results found for your search.</div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col lg:flex-row gap-8 xl:gap-10">
                            {/* Main Feed */}
                            <div className="flex-1 min-w-0">

                            {/* Provider empty state */}
                            {activeProvider !== "all" && !providerLoading && providerData[activeProvider] && (
                                (() => {
                                    const pd = providerData[activeProvider];
                                    const hasContent = (pd.trending?.length || 0) + (pd.movies?.length || 0) + (pd.tv?.length || 0) > 0;
                                    if (!hasContent) return (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex flex-col items-center justify-center py-4 md:py-6 text-center gap-6"
                                        >
                                            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-4xl border border-white/10">
                                                🎬
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black text-white mb-2">{pd.label} — No content found</h3>
                                                <p className="text-[var(--text-muted)] text-sm">This provider may have limited availability in your region.</p>
                                            </div>
                                            <button
                                                onClick={() => setActiveProvider("all")}
                                                className="px-6 py-3 rounded-full bg-[var(--accent)] hover:opacity-90 text-white font-bold text-sm transition-all"
                                            >
                                                Browse All Content
                                            </button>
                                        </motion.div>
                                    );
                                    return null;
                                })()
                            )}
                                <ContinueWatchingRow />

                                {/* Trending row for active provider */}
                                {activeProvider !== "all" && providerData[activeProvider]?.trending?.length > 0 && (
                                    <section className="mb-4 relative">
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-24 bg-[var(--accent)]/8 rounded-full blur-[60px] pointer-events-none" />
                                        <SectionHeader icon={Sparkles} title={`Trending on ${providerData[activeProvider].label}`} color="text-[var(--accent)]" isFeatured />
                                        <MovieRow items={providerData[activeProvider].trending} title={`${activeProvider}-trending`} isLarge />
                                    </section>
                                )}

                                {/* Smart Recommendations (only when no provider active) */}
                                {activeProvider === "all" && activeTab !== "anime" && trending.length > 0 && popular.length > 0 && (
                                    <section className="mb-4 relative">
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-24 bg-[var(--accent)]/8 rounded-full blur-[60px] pointer-events-none" />
                                        <SectionHeader icon={Sparkles} title="Smart Recommendations For You" color="text-[var(--accent)]" isFeatured />
                                        <MovieRow 
                                            items={[...trending.slice(2, 6), ...popular.slice(2, 6)].sort(() => Math.random() - 0.5)} 
                                            title="smart-recommendations" 
                                            isLarge 
                                        />
                                    </section>
                                )}
                                
                                {activeTab === "movies" && (
                                    <AnimatePresence mode="wait">
                                    <motion.div
                                        key={`movies-${activeProvider}`}
                                        initial={{ opacity: 0, y: 18 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -12 }}
                                        transition={{ duration: 0.35, ease: "easeOut" }}
                                        className="space-y-2 md:space-y-3"
                                    >
                                        {activeProvider !== "all" && providerData[activeProvider] ? (
                                            <>
                                                {providerData[activeProvider].movies?.length > 0 && (
                                                    <section>
                                                        <SectionHeader icon={Flame} title={`${providerData[activeProvider].label} Movies`} color="text-[var(--accent)]" isFeatured />
                                                        <MovieRow items={providerData[activeProvider].movies} type="movie" title={`${activeProvider}-movies`} isLarge />
                                                    </section>
                                                )}
                                                {providerData[activeProvider].topRated?.length > 0 && (
                                                    <section>
                                                        <SectionHeader icon={Star} title="Top Rated" color="text-[var(--accent-warm)]" />
                                                        <MovieRow items={providerData[activeProvider].topRated.filter((i:any) => !i.name)} type="movie" title={`${activeProvider}-toprated`} />
                                                    </section>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <section>
                                                    <SectionHeader icon={Flame} title="Trending Movies" color="text-[var(--accent)]" isFeatured />
                                                    {trending.filter(m => (m as any).media_type === 'movie' || !m.name).length > 0 ? <MovieRow items={trending.filter(m => (m as any).media_type === 'movie' || !m.name)} title="movie-trending" isLarge /> : <RowSkeleton />}
                                                </section>
                                                <section>
                                                    <SectionHeader icon={Film} title="Popular Movies" color="text-[var(--accent)]" />
                                                    {popular.length > 0 ? <MovieRow items={popular} type="movie" title="movies-popular" /> : <RowSkeleton />}
                                                </section>
                                                <section>
                                                    <SectionHeader icon={Popcorn} title="Now Playing in Theaters" color="text-[var(--accent-warm)]" />
                                                    {nowPlaying.length > 0 ? <MovieRow items={nowPlaying} type="movie" title="now-playing" /> : <RowSkeleton />}
                                                </section>
                                                <section>
                                                    <SectionHeader icon={Star} title="Top Rated Movies" color="text-[var(--accent-warm)]" isFeatured />
                                                    {topRated.length > 0 ? <MovieRow items={topRated} type="movie" title="top-rated-movies" isLarge /> : <RowSkeleton />}
                                                </section>
                                                {GENRE_ROWS.map((genre) => (
                                                    genreData[genre.title] && (
                                                        <section key={genre.title} id={`genre-${genre.genreId}`}>
                                                            <SectionHeader icon={genre.icon} title={genre.title} color="text-[var(--accent)]" />
                                                            <MovieRow items={genreData[genre.title]} type={genre.type} title={genre.title} />
                                                        </section>
                                                    )
                                                ))}
                                            </>
                                        )}
                                    </motion.div>
                                    </AnimatePresence>
                                )}

                                {activeTab === "tv" && (
                                    <AnimatePresence mode="wait">
                                    <motion.div
                                        key={`tv-${activeProvider}`}
                                        initial={{ opacity: 0, y: 18 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -12 }}
                                        transition={{ duration: 0.35, ease: "easeOut" }}
                                        className="space-y-2 md:space-y-3"
                                    >
                                        {activeProvider !== "all" && providerData[activeProvider] ? (
                                            <>
                                                {providerData[activeProvider].tv?.length > 0 && (
                                                    <section>
                                                        <SectionHeader icon={Flame} title={`${providerData[activeProvider].label} Series`} color="text-[var(--accent)]" isFeatured />
                                                        <MovieRow items={providerData[activeProvider].tv} type="tv" title={`${activeProvider}-tv`} isLarge />
                                                    </section>
                                                )}
                                                {providerData[activeProvider].topRated?.filter((i:any) => !!i.name).length > 0 && (
                                                    <section>
                                                        <SectionHeader icon={Star} title="Top Rated Shows" color="text-[var(--accent-warm)]" />
                                                        <MovieRow items={providerData[activeProvider].topRated.filter((i:any) => !!i.name)} type="tv" title={`${activeProvider}-toprated-tv`} />
                                                    </section>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <section>
                                                    <SectionHeader icon={Flame} title="Trending TV Shows" color="text-[var(--accent)]" isFeatured />
                                                    {trending.filter(m => (m as any).media_type === 'tv' || m.name).length > 0 ? <MovieRow items={trending.filter(m => (m as any).media_type === 'tv' || m.name)} title="tv-trending" isLarge /> : <RowSkeleton />}
                                                </section>
                                                <section>
                                                    <SectionHeader icon={Tv} title="Popular TV Shows" color="text-[var(--accent)]" />
                                                    {tvPopular.length > 0 ? <MovieRow items={tvPopular} type="tv" title="tv-popular" /> : <RowSkeleton />}
                                                </section>
                                                <section>
                                                    <SectionHeader icon={Star} title="Top Rated TV Shows" color="text-[var(--accent-warm)]" isFeatured />
                                                    {tvTopRated.length > 0 ? <MovieRow items={tvTopRated} type="tv" title="top-rated-tv" isLarge /> : <RowSkeleton />}
                                                </section>
                                                {NETWORK_ROWS.map((net, idx) => (
                                                    networkData[net.title] && (
                                                        <section key={net.title} id={`network-${net.networkId}`}>
                                                            <SectionHeader icon={Tv} title={`${net.logo} ${net.title}`} color="text-[var(--accent-secondary)]" />
                                                            <MovieRow items={networkData[net.title]} type="tv" title={net.title} isLarge={idx === 1 || idx === 5} />
                                                        </section>
                                                    )
                                                ))}
                                            </>
                                        )}
                                    </motion.div>
                                    </AnimatePresence>
                                )}
                                
                                {activeTab === "anime" && (
                                    <AnimatePresence mode="wait">
                                    <motion.div
                                        key={`anime-${activeProvider}`}
                                        initial={{ opacity: 0, y: 18 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -12 }}
                                        transition={{ duration: 0.35, ease: "easeOut" }}
                                        className="space-y-2 md:space-y-3 mt-4"
                                    >
                                        {/* Provider anime content (Crunchyroll / ToonPlayer Originals) */}
                                        {activeProvider !== "all" && providerData[activeProvider]?.isAnime && providerData[activeProvider].tv?.length > 0 ? (
                                            <>
                                                <section>
                                                    <SectionHeader icon={Flame} title={`${providerData[activeProvider].label} — Top Anime`} color="text-[var(--accent)]" isFeatured />
                                                    <MovieRow items={providerData[activeProvider].tv} type="tv" title={`${activeProvider}-anime`} isLarge />
                                                </section>
                                                {providerData[activeProvider].movies?.length > 0 && (
                                                    <section>
                                                        <SectionHeader icon={Sparkles} title="Anime Movies" color="text-[var(--accent-secondary)]" />
                                                        <MovieRow items={providerData[activeProvider].movies} type="movie" title={`${activeProvider}-anime-movies`} />
                                                    </section>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <section>
                                                    <SectionHeader icon={Flame} title="Trending Anime" color="text-[var(--accent)]" />
                                                    {animeTrending.length > 0 ? (
                                                        <div className="responsive-grid">
                                                            {animeTrending.map((item, idx) => <AnimeCardHorizontal key={item.id || item._id || idx} show={item} />)}
                                                        </div>
                                                    ) : <RowSkeleton />}
                                                </section>
                                                <section>
                                                    <SectionHeader icon={Sparkles} title="Recently Released Anime" color="text-[var(--accent)]" />
                                                    {animeLatest.length > 0 ? (
                                                        <div className="responsive-grid">
                                                            {animeLatest.map((item, idx) => <AnimeCardHorizontal key={item.id || item._id || idx} show={item} />)}
                                                        </div>
                                                    ) : <RowSkeleton />}
                                                </section>
                                            </>
                                        )}
                                    </motion.div>
                                    </AnimatePresence>
                                )}

                                {activeTab === "trending" && (
                                    <div className="space-y-2 md:space-y-3">
                                        <section>
                                            <SectionHeader icon={TrendingUp} title="Global Trending" color="text-[var(--accent)]" isFeatured />
                                            {trending.length > 0 ? <MovieRow items={trending} title="global-trending" isLarge /> : <RowSkeleton />}
                                        </section>
                                        <section>
                                            <SectionHeader icon={Sparkles} title="Most Popular Today" color="text-[var(--accent-secondary)]" />
                                            {popular.length > 0 ? <MovieRow items={popular} type="movie" title="movies-popular-trending" /> : <RowSkeleton />}
                                        </section>
                                        <section>
                                            <SectionHeader icon={Tv} title="Trending Series" color="text-[var(--accent)]" />
                                            {tvPopular.length > 0 ? <MovieRow items={tvPopular} type="tv" title="tv-popular-trending" /> : <RowSkeleton />}
                                        </section>
                                    </div>
                                )}

                                {activeTab === "discover" && (
                                    <div className="space-y-2 md:space-y-3">
                                        {mjItems.length > 0 && (
                                            <section className="relative p-8 rounded-3xl bg-gradient-to-br from-orange-900/20 to-amber-900/20 border border-[var(--accent)]/20 overflow-hidden">
                                                <div className="absolute -right-20 -top-20 w-80 h-80 bg-[var(--accent)]/10 rounded-full blur-3xl" />
                                                <SectionHeader icon={Star} title="Michael Jackson: Beyond the Music" color="text-[var(--accent-warm)]" isFeatured />
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-6">
                                                    {mjItems.map((item, i) => (
                                                        <div key={i} className="bg-[var(--bg-card)] p-4 rounded-2xl border border-white/5 hover:border-[var(--accent)]/30 transition-all cursor-pointer group">
                                                            <div className="aspect-square rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 mb-3 overflow-hidden flex items-center justify-center">
                                                                {item.poster ? (
                                                                    <img src={`https://image.tmdb.org/t/p/w200${item.poster}`} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                                ) : (
                                                                    <div className="text-zinc-600 font-bold text-lg">{item.title?.charAt(0)}</div>
                                                                )}
                                                            </div>
                                                            <h3 className="text-xs font-bold text-white truncate">{item.title}</h3>
                                                            <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">{item.type} • {item.year}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}
                                        <section>
                                            <SectionHeader icon={Zap} title="Trending Podcasts" color="text-[var(--accent-secondary)]" />
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                {podcasts.map((pod, i) => (
                                                    <div key={i} className="flex items-center gap-4 bg-[var(--bg-card)] p-4 rounded-2xl border border-white/5 hover:border-[var(--accent-secondary)]/30 transition-all cursor-pointer group">
                                                        <div className="w-16 h-16 rounded-xl bg-[var(--accent-secondary)]/10 flex items-center justify-center border border-[var(--accent-secondary)]/20 flex-shrink-0 group-hover:bg-[var(--accent-secondary)]/20">
                                                            <Play className="w-6 h-6 text-[var(--accent-secondary)]" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="text-sm font-bold text-white truncate">{pod.title}</h3>
                                                            <p className="text-xs text-zinc-500 mt-1">{pod.year} • Podcast</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                        <section>
                                            <SectionHeader icon={Popcorn} title="Trending Books" color="text-[var(--accent)]" />
                                            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
                                                {books.map((book, i) => (
                                                    <div key={i} className="flex-shrink-0 w-[160px] group cursor-pointer">
                                                        <div className="aspect-[2/3] rounded-xl bg-zinc-800 border border-white/10 mb-3 shadow-lg group-hover:border-[var(--accent)]/40 transition-all flex flex-col items-center justify-center p-4 text-center">
                                                            <div className="w-10 h-1 bg-[var(--accent)] mb-4" />
                                                            <h3 className="text-xs font-bold text-white leading-tight mb-2">{book.title}</h3>
                                                            <p className="text-[9px] text-zinc-500">{book.author}</p>
                                                        </div>
                                                        <p className="text-[10px] text-center font-bold text-zinc-500 uppercase">{book.year}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                        <section>
                                            <SectionHeader icon={Flame} title="Trending Songs" color="text-[var(--accent)]" />
                                            <div className="space-y-2">
                                                {songs.map((song, i) => (
                                                    <div key={i} className="flex items-center gap-4 bg-[var(--bg-card)]/50 p-3 rounded-xl border border-white/5 hover:bg-white/5 transition-all cursor-pointer group">
                                                        <span className="text-xs font-bold text-zinc-600 w-4">{i + 1}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="text-sm font-bold text-white truncate">{song.title}</h3>
                                                            <p className="text-[10px] text-zinc-500">{song.artist}</p>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-zinc-500">{song.year}</span>
                                                        <Play className="w-4 h-4 text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                        <section>
                                            <SectionHeader icon={Film} title="Trending Videos" color="text-[var(--accent)]" />
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {videos.map((vid, i) => (
                                                    <div key={i} className="relative aspect-video rounded-2xl bg-zinc-800 overflow-hidden group cursor-pointer border border-white/5">
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                                                        <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center">
                                                                <Play className="w-6 h-6 text-white fill-white ml-1" />
                                                            </div>
                                                        </div>
                                                        <div className="absolute bottom-4 left-4 z-20">
                                                            <h3 className="text-sm font-bold text-white">{vid.title}</h3>
                                                            <p className="text-[10px] text-zinc-300 mt-0.5">{vid.year} • HD Video</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    </div>
                                )}
                            </div>

                            {/* Sidebar */}
                            <div className="w-full lg:w-[320px] xl:w-[380px] space-y-12 shrink-0">
                                {trendingPeople.length > 0 && (
                                    <section className="bg-gradient-to-b from-[var(--bg-card)] to-transparent p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden group/sidebar">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-secondary)]/10 rounded-full blur-3xl" />
                                        <h2 className="text-xl font-black font-sora text-white mb-8 flex items-center gap-3">
                                            <div className="p-2 bg-[var(--accent-secondary)]/10 rounded-lg">
                                                <User className="w-5 h-5 text-[var(--accent-secondary)]" /> 
                                            </div>
                                            Trending Stars
                                        </h2>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-8 relative z-10">
                                            {trendingPeople.map((person: any) => (
                                                <div key={person.id} className="flex flex-col items-center text-center group cursor-pointer">
                                                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-transparent group-hover:border-[var(--accent-secondary)]/50 transition-all duration-500 shadow-xl mb-3 relative">
                                                        <img src={`https://image.tmdb.org/t/p/w200${person.profile_path}`} alt={person.name} className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-110" />
                                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                    </div>
                                                    <p className="text-xs font-bold text-white group-hover:text-[var(--accent-secondary)] truncate w-full transition-colors">{person.name}</p>
                                                    <p className="text-[10px] text-zinc-500 truncate w-full mt-0.5 uppercase tracking-wider font-semibold">{person.known_for_department}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                <section className="bg-gradient-to-b from-[var(--bg-card)] to-transparent p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden group/sidebar">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-warm)]/10 rounded-full blur-3xl" />
                                    <h2 className="text-xl font-black font-sora text-white mb-6 flex items-center gap-3">
                                        <div className="p-2 bg-[var(--accent-warm)]/10 rounded-lg">
                                            <Sparkles className="w-5 h-5 text-[var(--accent-warm)]" /> 
                                        </div>
                                        {activeTab === 'tv' ? 'Top Rated Shows' : 'Top Rated Movies'}
                                    </h2>
                                    <div className="flex flex-col">
                                        {(activeTab === 'tv' ? tvTopRated : topRated).slice(0, 8).map((item, i) => (
                                            <Link 
                                                key={item.id} 
                                                href={`/watch/${activeTab === 'tv' ? 'tv' : 'movie'}/${item.id}`}
                                                className="flex items-center gap-5 group cursor-pointer p-3 -mx-3 rounded-xl hover:bg-white/5 transition-all duration-300 relative"
                                            >
                                                {/* Left structural rank */}
                                                <span className={`text-3xl font-black w-6 text-right tabular-nums tracking-tighter transition-colors duration-300 ${i < 3 ? 'text-white/20 group-hover:text-[var(--accent-warm)]/50' : 'text-white/5 group-hover:text-[var(--accent)]/30'}`}>
                                                    {i + 1}
                                                </span>
                                                
                                                <div className="flex-1 min-w-0 flex flex-col justify-center transform transition-transform duration-300 group-hover:translate-x-1">
                                                    <h3 className="text-sm font-bold text-white/90 truncate group-hover:text-white transition-colors">{item.title || item.name}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--accent-warm)]">
                                                            <Star className="w-3 h-3 fill-[var(--accent-warm)]" />
                                                            {item.vote_average?.toFixed(1)}
                                                        </span>
                                                        <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                                        <span className="text-[11px] font-medium text-zinc-500">{(item.release_date || item.first_air_date || '').split('-')[0]}</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                    
                                    <Link href="/discover" className="block w-full py-3 mt-6 text-center text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300 border border-transparent hover:border-white/10">
                                        Explore Full Ranking
                                    </Link>
                                </section>
                            </div>
                        </div>
                    )}
                </div>

                <div className="w-full max-w-[1800px] mx-auto px-6 lg:px-12 my-12 md:my-16">
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>

                <section className="mb-6 md:mb-8 max-w-[1400px] mx-auto px-6 lg:px-12 relative">
                    {/* Subtle ambient glow for the bottom region */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-full max-w-2xl h-64 bg-[var(--accent)]/10 rounded-full blur-[120px] pointer-events-none z-0" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center relative z-10">
                        <div className="space-y-8">
                            <h2 className="text-display">
                                ToonPlayer – Watch Movies & Anime Online
                            </h2>
                            <p className="text-body-lg">
                                ToonPlayer is a modern streaming platform where you can watch the latest movies, anime, and TV shows online in high quality. Discover trending content, explore genres like action, comedy, and adventure, and enjoy a fast and smooth viewing experience.
                            </p>
                            <div className="pt-4">
                                <h3 className="text-title mb-6 flex items-center gap-3">
                                    <Sparkles className="w-6 h-6 text-[var(--accent)]" />
                                    Why Choose ToonPlayer?
                                </h3>
                                <ul className="space-y-4">
                                    {["Watch HD movies and anime online", "Fast and user-friendly interface", "Explore trending and top-rated content", "Regularly updated library"].map((feat, i) => (
                                        <li key={i} className="flex items-center gap-4 text-body font-bold text-white/90">
                                            <CheckCircle className="w-5 h-5 text-[var(--accent)]" /> {feat}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-[var(--bg-card)] to-transparent rounded-[2rem] p-10 border border-white/5 relative overflow-hidden group shadow-2xl">
                           <div className="absolute -right-20 -top-20 w-80 h-80 bg-[var(--accent)]/10 rounded-full blur-3xl" />
                           <h3 className="text-2xl font-black text-white mb-4 flex items-center gap-3 font-sora">
                               <Flame className="w-6 h-6 text-[var(--accent)]" /> 
                               Stream Anytime, Anywhere
                           </h3>
                           <p className="text-body mb-8">ToonPlayer works beautifully across all devices including mobile, tablet, and desktop, giving you seamless access to entertainment on the go.</p>
                           <div className="mt-8 border-t border-white/10 pt-8 flex items-center justify-between">
                                <div>
                                    <h4 className="text-metadata text-[var(--accent)] mb-2">Platform Status</h4>
                                    <p className="text-sm font-medium text-white/50 italic">Actively updated with thousands of titles.</p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                    <Zap className="w-5 h-5 text-[var(--accent-secondary)]" />
                                </div>
                           </div>
                        </div>
                    </div>
                </section>

                <section className="mb-32 max-w-[900px] mx-auto px-6 lg:px-12">
                    <h2 className="text-heading mb-6 md:mb-8 flex items-center gap-4 justify-center">
                        <Info className="w-6 h-6 text-[var(--accent)]" /> Frequently Asked Questions
                    </h2>
                    <div className="space-y-4">
                        {[
                            { q: "What is ToonPlayer?", a: "ToonPlayer is a free online streaming platform where you can watch movies, anime, and TV shows in HD quality without signing up." },
                            { q: "Is ToonPlayer free to use?", a: "Yes, ToonPlayer is completely free. Stream movies, anime, and TV shows without any subscription or registration." },
                            { q: "What devices does ToonPlayer support?", a: "ToonPlayer works on all devices — smartphones, tablets, laptops, desktops, and smart TVs through any modern web browser." },
                            { q: "Does ToonPlayer have anime?", a: "Yes! ToonPlayer has a massive anime library with sub and dub options. Browse by genre or search for your favorites." },
                        ].map((faq, i) => (
                            <details key={i} className="group bg-[var(--bg-card)] border border-white/5 rounded-2xl overflow-hidden hover:border-[var(--accent)]/30 transition-all duration-300 shadow-lg">
                                <summary className="flex items-center justify-between cursor-pointer px-6 py-5 text-base font-bold text-white hover:text-[var(--accent)] transition-colors list-none">
                                    {faq.q}
                                    <ChevronDown className="w-5 h-5 text-[var(--text-muted)] group-open:rotate-180 transition-transform duration-300" />
                                </summary>
                                <div className="px-6 pb-6 text-body">{faq.a}</div>
                            </details>
                        ))}
                    </div>
                </section>
            </div>

            <AnimatePresence>
                {showScrollTop && (
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="fixed bottom-6 right-6 z-40 p-3 bg-[var(--accent)] hover:opacity-90 text-white rounded-full shadow-[0_0_20px_rgba(88,101,242,0.4)] backdrop-blur-sm transition-colors"
                    >
                        <ChevronUp className="w-5 h-5" />
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
}

// Section Header Component — memoized to avoid re-renders on tab/provider changes
const SectionHeader = memo(function SectionHeader({ icon: Icon, title, color, isFeatured = false }: { icon: any; title: string; color: string; isFeatured?: boolean }) {
    return (
        <div className={`flex items-end gap-3 md:gap-4 mb-6 text-[var(--text-main)] transition-all ${isFeatured ? 'ml-2' : ''}`}>
            {isFeatured ? (
                <div className="w-1.5 h-10 bg-gradient-to-t from-[var(--accent)] to-[var(--accent)] rounded-full shadow-[0_0_15px_rgba(88,101,242,0.6)]" />
            ) : (
                <div className="w-1 h-6 bg-[var(--accent)] rounded-full shadow-[0_0_10px_rgba(88,101,242,0.4)]" />
            )}
            <div className="flex flex-col">
                <div className="flex items-center gap-2 md:gap-3">
                    <Icon className={`${isFeatured ? 'w-6 h-6 md:w-7 md:h-7' : 'w-5 h-5'} text-[var(--accent)] drop-shadow-md`} />
                    <h2 className={`${isFeatured ? 'text-2xl md:text-3xl font-black tracking-tight drop-shadow-sm font-sora' : 'text-lg md:text-xl font-bold tracking-tight font-sora'}`}>{title}</h2>
                </div>
                {isFeatured && (
                    <p className="text-[11px] md:text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1 ml-1 opacity-80">Featured Collection</p>
                )}
            </div>
        </div>
    );
});

// Row Skeleton for Anime — memoized (static, never changes)
const RowSkeleton = memo(function RowSkeleton() {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-[3/4.5] rounded-xl bg-white/5 animate-pulse" />
            ))}
        </div>
    );
});
