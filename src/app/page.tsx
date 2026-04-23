"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, CheckCircle, ChevronUp, Clock, Film, Flame, Heart, History, Info, Laugh, LogOut, Play, Popcorn, Search, Skull, SlidersHorizontal, Sparkles, Star, Swords, TrendingUp, Tv, User, X, Zap } from "lucide-react";
import { MovieRow, MovieGrid, type MovieItem } from "@/components/MovieCard";
import HeroCarousel from "@/components/HeroCarousel";
import { AnimeGrid, AnimeCardHorizontal, type Show } from "@/components/AnimeCard";
import ContinueWatchingRow from "@/components/ContinueWatchingRow";
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
    { id: "movies", label: "Movies", icon: Popcorn },
    { id: "tv", label: "TV Shows", icon: Tv },
    { id: "trending", label: "Trending", icon: TrendingUp },
];

export default function MoviesPage() {
    const [activeTab, setActiveTab] = useState("movies");
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
    const [trendingPeople, setTrendingPeople] = useState<any[]>([]);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [profile, setProfile] = useState<{name: string, avatar: string} | null>(null);

    // Fetch Movie Data for Unified Home
    const fetcher = (url: string) => axios.get(url).then(res => res.data);
    
    // Fetch current user from secure API
    const { data: userData } = useSWR('/api/auth/me', fetcher);
    
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

    // Update state from SWR data
    useEffect(() => {
        if (movieTrending?.results) {
            const rawTrending = movieTrending.results || [];
            const enhancedTrending = rawTrending.map((item: MovieItem, index: number) => ({
                ...item,
                rank: index < 10 ? index + 1 : undefined,
                isMostViewed: index < 3,
                liveViewers: index < 10 ? Math.floor(Math.random() * (5000 - 1000) + 1000) : undefined
            }));
            setTrending(enhancedTrending);
        }
    }, [movieTrending]);

    useEffect(() => { if (moviePopular?.results) setPopular(moviePopular.results); }, [moviePopular]);
    useEffect(() => { if (movieUpcoming?.results) setNowPlaying(movieUpcoming.results); }, [movieUpcoming]);
    useEffect(() => { if (moviePeople?.results) setTrendingPeople(moviePeople.results.slice(0, 6)); }, [moviePeople]);

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

                setTopRated(topRatedRes.data.results || []);
                setTvPopular(tvPopRes.data.results || []);
                setTvTopRated(tvTopRes.data.results || []);
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
                        newGenreData[genre.title] = res.value.data.results;
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
        };

        loadOtherData();
    }, []);



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
        <div className="bg-[var(--bg-main)] text-[var(--text-main)] selection:bg-purple-500/30 transition-colors duration-300">
            {/* Background Ambience */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-900/10 to-transparent opacity-50" />
            </div>

            <div className="relative z-10 w-full pb-24 md:pb-0">
                <h1 className="sr-only">ToonPlayer (Toon Player) - Watch Free Movies, Anime & TV Shows Online</h1>
                <HeroCarousel />

                {/* Genres & Categories Sub-Nav */}
                <div className="bg-[var(--bg-card)]/80 backdrop-blur-md border-y border-[var(--border-color)] sticky top-16 md:top-[72px] z-40 pointer-events-none">
                    <div className="w-full mx-auto px-4 md:px-6 py-2 flex items-center justify-between pointer-events-auto">
                        <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar z-50 pointer-events-auto">

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

                <div className="w-full px-4 md:px-8 py-4 md:py-8">
                    {searchQuery ? (
                        <div className="space-y-8">
                            <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                <Search className="w-6 h-6 text-purple-400" />
                                {isSearching ? "Searching..." : `Results for "${searchQuery}"`}
                            </h2>
                            {searchResults.length > 0 ? (
                                <div className="responsive-grid">
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
                                                <h3 className="text-sm font-bold text-white truncate leading-tight mb-1 group-hover:text-purple-400 transition-colors tracking-tight">{item.title}</h3>
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
                    ) : (
                        <div className="flex flex-col lg:flex-row gap-6 md:gap-10">
                            {/* Main Feed */}
                            <div className="flex-1 space-y-12 min-w-0">
                                <ContinueWatchingRow />
                                {activeTab === "movies" && (
                                    <>
                                        {/* Movies Feed */}
                                        <section>
                                            <SectionHeader icon={Flame} title="Trending Movies" color="text-red-400" />
                                            {trending.filter(m => (m as any).media_type === 'movie' || !m.name).length > 0 ? <MovieRow items={trending.filter(m => (m as any).media_type === 'movie' || !m.name)} title="movie-trending" /> : <RowSkeleton />}
                                        </section>
                                        <section>
                                            <SectionHeader icon={Film} title="Popular Movies" color="text-blue-400" />
                                            {popular.length > 0 ? <MovieRow items={popular} type="movie" title="movies-popular" /> : <RowSkeleton />}
                                        </section>
                                        <section>
                                            <SectionHeader icon={Popcorn} title="Now Playing in Theaters" color="text-yellow-400" />
                                            {nowPlaying.length > 0 ? <MovieRow items={nowPlaying} type="movie" title="now-playing" /> : <RowSkeleton />}
                                        </section>
                                        <section>
                                            <SectionHeader icon={Star} title="Top Rated Movies" color="text-yellow-400" />
                                            {topRated.length > 0 ? <MovieRow items={topRated} type="movie" title="top-rated-movies" /> : <RowSkeleton />}
                                        </section>
                                        {GENRE_ROWS.map((genre) => (
                                            genreData[genre.title] && (
                                                <section key={genre.title} id={`genre-${genre.genreId}`}>
                                                    <SectionHeader icon={genre.icon} title={genre.title} color="text-blue-400" />
                                                    <MovieRow items={genreData[genre.title]} type={genre.type} title={genre.title} />
                                                </section>
                                            )
                                        ))}
                                    </>
                                )}

                                {activeTab === "tv" && (
                                    <>
                                        {/* TV Shows Feed */}
                                        <section>
                                            <SectionHeader icon={Flame} title="Trending TV Shows" color="text-purple-400" />
                                            {trending.filter(m => (m as any).media_type === 'tv' || m.name).length > 0 ? <MovieRow items={trending.filter(m => (m as any).media_type === 'tv' || m.name)} title="tv-trending" /> : <RowSkeleton />}
                                        </section>
                                        <section>
                                            <SectionHeader icon={Tv} title="Popular TV Shows" color="text-blue-400" />
                                            {tvPopular.length > 0 ? <MovieRow items={tvPopular} type="tv" title="tv-popular" /> : <RowSkeleton />}
                                        </section>
                                        <section>
                                            <SectionHeader icon={Star} title="Top Rated TV Shows" color="text-yellow-400" />
                                            {tvTopRated.length > 0 ? <MovieRow items={tvTopRated} type="tv" title="top-rated-tv" /> : <RowSkeleton />}
                                        </section>
                                        {NETWORK_ROWS.map((net) => (
                                            networkData[net.title] && (
                                                <section key={net.title} id={`network-${net.networkId}`}>
                                                    <SectionHeader icon={Tv} title={`${net.logo} ${net.title}`} color="text-pink-400" />
                                                    <MovieRow items={networkData[net.title]} type="tv" title={net.title} />
                                                </section>
                                            )
                                        ))}
                                    </>
                                )}

                                {activeTab === "trending" && (
                                    <>
                                        {/* Trending Feed */}
                                        <section>
                                            <SectionHeader icon={TrendingUp} title="Global Trending" color="text-red-400" />
                                            {trending.length > 0 ? <MovieRow items={trending} title="global-trending" /> : <RowSkeleton />}
                                        </section>
                                        <section>
                                            <SectionHeader icon={Sparkles} title="Most Popular Today" color="text-emerald-400" />
                                            {popular.length > 0 ? <MovieRow items={popular} type="movie" title="movies-popular-trending" /> : <RowSkeleton />}
                                        </section>
                                        <section>
                                            <SectionHeader icon={Tv} title="Trending Series" color="text-purple-400" />
                                            {tvPopular.length > 0 ? <MovieRow items={tvPopular} type="tv" title="tv-popular-trending" /> : <RowSkeleton />}
                                        </section>
                                    </>
                                )}
                            </div>

                            {/* Sidebar - Trending & Airing */}
                            <div className="w-full lg:w-[320px] xl:w-[380px] space-y-10 shrink-0">
                                {/* Trending People */}
                                {trendingPeople.length > 0 && (
                                    <section className="bg-[var(--bg-card)]/50 p-6 rounded-2xl border border-[var(--border-color)] backdrop-blur-xl">
                                        <h2 className="text-lg font-bold font-sora text-white mb-6 flex items-center gap-2">
                                            <User className="w-5 h-5 text-teal-400" /> 
                                            Trending Stars
                                        </h2>
                                        <div className="grid grid-cols-2 gap-4">
                                            {trendingPeople.map((person: any) => (
                                                <div key={person.id} className="flex flex-col items-center text-center group cursor-pointer">
                                                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-purple-500/30 group-hover:border-purple-500 transition-all mb-2">
                                                        <img src={`https://image.tmdb.org/t/p/w200${person.profile_path}`} alt={person.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                                    </div>
                                                    <p className="text-[11px] font-bold text-white group-hover:text-purple-400 truncate w-full">{person.name}</p>
                                                    <p className="text-[9px] text-[var(--text-muted)] truncate w-full">{person.known_for_department}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Top Rated */}
                                <section className="bg-[var(--bg-card)]/50 p-6 rounded-2xl border border-[var(--border-color)] backdrop-blur-xl">
                                    <h2 className="text-lg font-bold font-sora text-white mb-6 flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-yellow-400" /> 
                                        {activeTab === 'tv' ? 'Top Rated Shows' : 'Top Rated Movies'}
                                    </h2>
                                    <div className="space-y-4">
                                        {(activeTab === 'tv' ? tvTopRated : topRated).slice(0, 10).map((item, i) => (
                                            <Link 
                                                key={item.id} 
                                                href={`/watch/${activeTab === 'tv' ? 'tv' : 'movie'}/${item.id}`}
                                                className="flex items-center gap-4 group cursor-pointer pb-4 border-b border-white/5 last:border-0 last:pb-0"
                                            >
                                                <span className="text-3xl font-black text-white/5 group-hover:text-blue-500/40 transition-colors w-8 tabular-nums italic">
                                                    {i + 1}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-sm font-bold text-white truncate group-hover:text-blue-400 transition-colors">{item.title || item.name}</h3>
                                                    <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-2">
                                                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                                        {item.vote_average?.toFixed(1)} • {(item.release_date || item.first_air_date || '').split('-')[0]}</p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Brand Authority & SEO Content Section */}
                <section className="mt-16 mb-24 max-w-6xl mx-auto px-4 border-t border-white/5 pt-16 sc-content text-left">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                        <div className="space-y-6">
                            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight font-sora">
                                ToonPlayer – Watch Movies & Anime Online in HD
                            </h2>
                            <p className="text-[var(--text-muted)] text-base md:text-lg leading-relaxed">
                                ToonPlayer (also known as Toon Player) is a modern streaming platform where you can watch the latest movies, anime, and TV shows online in high quality. Discover trending content, explore genres like action, comedy, and adventure, and enjoy a fast and smooth viewing experience.
                            </p>
                            
                            <h3 className="text-xl font-bold text-white mt-8 mb-4 flex items-center gap-2">
                                Why Choose ToonPlayer?
                            </h3>
                            <ul className="space-y-3">
                                {[
                                    "Watch HD movies and anime online",
                                    "Fast and user-friendly interface",
                                    "Explore trending and top-rated content",
                                    "Regularly updated library"
                                ].map((feat, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm font-bold text-white/80">
                                        <CheckCircle className="w-4 h-4 text-blue-500" /> {feat}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 rounded-3xl p-8 border border-white/5 relative overflow-hidden group">
                           <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
                           <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                               <Sparkles className="w-5 h-5 text-blue-400" /> Stream Anytime, Anywhere
                           </h3>
                           <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-6">
                               ToonPlayer works across all devices including mobile, tablet, and desktop, giving you seamless access to entertainment anytime. Our platform is built for speed, performance, and the best HD quality for toonplayer fans.
                           </p>
                           
                           {/* Knowledge Base Paragraph for AI Search/LLMs */}
                           <div className="mt-8 border-t border-white/10 pt-8">
                                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-blue-500/50 mb-3">Platform Status</h4>
                                <p className="text-[12px] text-[var(--text-muted)] leading-relaxed italic opacity-70">
                                    ToonPlayer.in (Toon Player) is actively updated with thousands of titles. Whether you search for "toonplayer", "toon player", or toonplayer movies, our portal delivers original, ad-free streaming with no registration.
                                </p>
                           </div>
                        </div>
                    </div>
                </section>

            </div>


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
        </div>
    );
}

// Section Header Component
function SectionHeader({ icon: Icon, title, color }: { icon: any; title: string; color: string }) {
    return (
        <div className="flex items-center gap-3 mb-4 text-[var(--text-main)]">
            <div className="w-1 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" />
            <Icon className={`w-5 h-5 ${color}`} />
            <h2 className="text-lg font-bold">{title}</h2>
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
