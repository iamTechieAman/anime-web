"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Compass, Film, Tv, X, SlidersHorizontal, 
    ArrowUpDown, Globe, Calendar, Loader2, Sparkles, TrendingUp
} from "lucide-react";
import { MovieCard, type MovieItem } from "@/components/MovieCard";
import { GridSkeleton } from "@/components/SkeletonLoader";
import { useUserStore, isKidsFriendly } from "@/store/userStore";

const GENRES = [
    { name: "Action", id: "28" },
    { name: "Adventure", id: "12" },
    { name: "Animation", id: "16" },
    { name: "Comedy", id: "35" },
    { name: "Crime", id: "80" },
    { name: "Documentary", id: "99" },
    { name: "Drama", id: "18" },
    { name: "Family", id: "10751" },
    { name: "Fantasy", id: "14" },
    { name: "History", id: "36" },
    { name: "Horror", id: "27" },
    { name: "Music", id: "10402" },
    { name: "Mystery", id: "9648" },
    { name: "Romance", id: "10749" },
    { name: "Sci-Fi", id: "878" },
    { name: "Thriller", id: "53" },
    { name: "War", id: "10752" },
    { name: "Western", id: "37" }
];

const NETWORKS = [
    { name: "Netflix", id: "213", logo: "🔴" },
    { name: "Disney+", id: "2739", logo: "🔵" },
    { name: "Prime Video", id: "1024", logo: "📦" },
    { name: "Apple TV+", id: "2552", logo: "⚪" },
    { name: "HBO", id: "49", logo: "🟣" },
    { name: "Hulu", id: "453", logo: "🟢" },
    { name: "Paramount+", id: "4330", logo: "⛰️" }
];

const LANGUAGES = [
    { name: "English", code: "en" },
    { name: "Japanese", code: "ja" },
    { name: "Hindi", code: "hi" },
    { name: "Spanish", code: "es" },
    { name: "Korean", code: "ko" },
    { name: "French", code: "fr" },
    { name: "German", code: "de" }
];

const COUNTRIES = [
    { name: "United States", code: "US" },
    { name: "India", code: "IN" },
    { name: "Japan", code: "JP" },
    { name: "South Korea", code: "KR" },
    { name: "United Kingdom", code: "GB" }
];

const SORT_OPTIONS = [
    { label: "Popularity Desc", value: "popularity.desc" },
    { label: "Rating Desc", value: "vote_average.desc" },
    { label: "Newest First", value: "primary_release_date.desc" },
    { label: "Oldest First", value: "primary_release_date.asc" },
    { label: "Alphabetical A-Z", value: "original_title.asc" }
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function BrowseClient() {
    const { profiles, activeProfileId } = useUserStore();
    const activeProfile = profiles.find(p => p.id === activeProfileId);
    const isKidsMode = activeProfile?.isKids || (typeof window !== 'undefined' && localStorage.getItem(`kids-filter-${activeProfileId}`) === 'true');

    const searchParams = useSearchParams();
    const router = useRouter();

    // Read filters directly from searchParams (single source of truth)
    const rawType = searchParams.get("type");
    const mediaType: "movie" | "tv" | "anime" = rawType === "anime" ? "anime" : (rawType === "tv" ? "tv" : "movie");
    const rawGenre = searchParams.get("genre_id") || searchParams.get("genre") || "";
    const selectedGenre = useMemo(() => {
        if (!rawGenre) return "";
        const matched = GENRES.find(g => g.id === rawGenre || g.name.toLowerCase() === rawGenre.toLowerCase());
        return matched ? matched.id : rawGenre;
    }, [rawGenre]);
    const selectedNetwork = searchParams.get("network_id") || "";
    const selectedYear = searchParams.get("year") || "";
    const selectedLanguage = searchParams.get("language") || "";
    const selectedCountry = searchParams.get("country") || "US";
    const selectedSort = searchParams.get("sort_by") || "popularity.desc";
    const selectedLetter = searchParams.get("letter") || "";

    // Route-aware page identity computations
    const isTrending = Boolean(
        searchParams.get("trending") === "true" ||
        searchParams.get("sort") === "trending" ||
        (selectedSort === "popularity.desc" && !selectedGenre && !selectedNetwork && !selectedYear && !selectedLetter && !rawType)
    );
    const isUpcoming = selectedSort === "primary_release_date.desc";

    const currentGenreObj = useMemo(() => GENRES.find(g => g.id === selectedGenre), [selectedGenre]);
    const currentNetworkObj = useMemo(() => NETWORKS.find(n => n.id === selectedNetwork), [selectedNetwork]);
    const currentLanguageObj = useMemo(() => LANGUAGES.find(l => l.code === selectedLanguage), [selectedLanguage]);

    const [items, setItems] = useState<MovieItem[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    const observerTarget = useRef<HTMLDivElement>(null);
    const isFetchingRef = useRef(false);
    const pageRef = useRef(1);
    const totalPagesRef = useRef(1);

    pageRef.current = page;
    totalPagesRef.current = totalPages;

    // Lock body scrolling when filter drawer is open & handle Escape key
    useEffect(() => {
        if (showFilters) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && showFilters) setShowFilters(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [showFilters]);

    // Sync helper to push parameter updates to router URL (triggers fetchCatalog automatically via searchParams changes)
    const setFilterParam = useCallback((key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("page"); // Reset pagination
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        
        // Reset network filter if swapping media type
        if (key === "type") {
            params.delete("network_id");
        }
        
        router.replace(`/browse?${params.toString()}`, { scroll: false });
    }, [searchParams, router]);

    const handleReset = useCallback(() => {
        const params = new URLSearchParams();
        if (rawType) params.set("type", rawType);
        params.set("country", "US");
        router.replace(`/browse?${params.toString()}`, { scroll: false });
    }, [rawType, router]);

    // Fetch catalog helper
    const fetchCatalog = useCallback(async (pageNum: number, isAppend: boolean) => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);
        setError(null);

        try {
            let combinedResults: MovieItem[] = [];
            let currentPageNum = pageNum;
            let currentTotalPages = 1;
            let currentTotalResults = 0;
            let attempts = 0;
            const maxAttempts = 5; // Guard against infinite looping

            while (attempts < maxAttempts) {
                const isAnime = mediaType === "anime";
                const params = new URLSearchParams({
                    media_type: isAnime ? "tv" : mediaType,
                    sort_by: selectedSort,
                    page: String(currentPageNum),
                    watch_region: selectedCountry
                });

                if (isAnime) {
                    params.set("genre_id", selectedGenre || "16");
                    if (!selectedLanguage) params.set("with_original_language", "ja");
                } else if (selectedGenre) {
                    params.set("genre_id", selectedGenre);
                }
                if (selectedNetwork) params.set("network_id", selectedNetwork);
                if (selectedYear) params.set("year", selectedYear);
                if (selectedLanguage && !isAnime) params.set("with_original_language", selectedLanguage);

                const res = await axios.get(`/api/prime/discover?${params.toString()}`);
                let fetchedResults: MovieItem[] = res.data.results || [];
                currentTotalPages = res.data.total_pages || 1;
                currentTotalResults = res.data.total_results || 0;

                // Client-side kids filter
                if (isKidsMode) {
                    fetchedResults = fetchedResults.filter(isKidsFriendly);
                }

                // Client-side alphabet filter
                if (selectedLetter) {
                    const letter = selectedLetter.toLowerCase();
                    fetchedResults = fetchedResults.filter((item: MovieItem) => {
                        const title = (item.title || item.name || "").toLowerCase();
                        return title.startsWith(letter);
                    });
                }

                combinedResults = [...combinedResults, ...fetchedResults];

                // If not filtering by letter and not kids mode, or got enough items, or hit total pages, stop
                const minTarget = isKidsMode ? 12 : 8;
                if ((!selectedLetter && !isKidsMode) || combinedResults.length >= minTarget || currentPageNum >= currentTotalPages) {
                    break;
                }

                currentPageNum++;
                attempts++;
            }

            setPage(currentPageNum);
            setTotalPages(currentTotalPages);
            setTotalResults(currentTotalResults || combinedResults.length);

            if (isAppend) {
                setItems(prev => {
                    const seen = new Set(prev.map(i => String(i.id)));
                    const appended: MovieItem[] = [];
                    for (const item of combinedResults) {
                        if (!item || !item.id) continue;
                        const key = String(item.id);
                        if (!seen.has(key)) {
                            seen.add(key);
                            appended.push(item);
                        }
                    }
                    return [...prev, ...appended];
                });
            } else {
                const seen = new Set<string>();
                const deduplicated = combinedResults.filter(item => {
                    if (!item || !item.id) return false;
                    const key = String(item.id);
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
                setItems(deduplicated);
            }
        } catch (err: any) {
            console.error("Browse loading failed:", err);
            setError("Failed to load catalog content. Please check your connection and try again.");
        } finally {
            setLoading(false);
            setLoadingMore(false);
            isFetchingRef.current = false;
        }
    }, [mediaType, selectedGenre, selectedNetwork, selectedYear, selectedLanguage, selectedCountry, selectedSort, selectedLetter, isKidsMode]);

    // Fetch initial results on filter change
    useEffect(() => {
        setPage(1);
        fetchCatalog(1, false);
    }, [mediaType, selectedGenre, selectedNetwork, selectedYear, selectedLanguage, selectedCountry, selectedSort, selectedLetter, isKidsMode, fetchCatalog]);

    const hasMore = page < totalPages;

    // Handle Infinite Scroll
    useEffect(() => {
        if (!hasMore || loading || loadingMore || error) return;

        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && !isFetchingRef.current) {
                    const nextPage = pageRef.current + 1;
                    if (nextPage <= totalPagesRef.current) {
                        if (typeof window !== "undefined" && "requestIdleCallback" in window) {
                            window.requestIdleCallback(() => {
                                fetchCatalog(nextPage, true);
                            });
                        } else {
                            setTimeout(() => {
                                fetchCatalog(nextPage, true);
                            }, 50);
                        }
                    }
                }
            },
            { 
                threshold: 0.1,
                rootMargin: "250px"
            }
        );

        const target = observerTarget.current;
        if (target) observer.observe(target);

        return () => {
            if (target) observer.unobserve(target);
            observer.disconnect();
        };
    }, [hasMore, loading, loadingMore, error, fetchCatalog]);

    // Determine heading text and icon based on route intent
    let PageIcon = Compass;
    let pageTitlePrefix = "Browse";
    let pageTitleHighlight = `${mediaType === "anime" ? "Anime" : mediaType === "tv" ? "TV Series" : "Movies"} Catalog`;
    let pageSubtitle = `Explore dynamic ${mediaType === "anime" ? "anime" : mediaType === "tv" ? "television series" : "movie"} collections with high-speed streaming and refined filters.`;

    if (isTrending) {
        PageIcon = TrendingUp;
        pageTitlePrefix = "Trending";
        pageTitleHighlight = "Now";
        pageSubtitle = "Discover the most popular movies, television series, and anime trending right now.";
    } else if (isUpcoming) {
        PageIcon = Calendar;
        pageTitlePrefix = "Upcoming";
        pageTitleHighlight = "Releases";
        pageSubtitle = "Anticipated new titles, premiere schedules, and future broadcast dates.";
    } else if (currentGenreObj) {
        PageIcon = SlidersHorizontal;
        pageTitlePrefix = currentGenreObj.name;
        pageTitleHighlight = "Catalog";
        pageSubtitle = `Top rated and popular ${currentGenreObj.name.toLowerCase()} titles available for streaming.`;
    } else if (currentNetworkObj) {
        PageIcon = Tv;
        pageTitlePrefix = currentNetworkObj.name;
        pageTitleHighlight = "Collection";
        pageSubtitle = `Stream the highest rated and newly released content on ${currentNetworkObj.name}.`;
    } else if (selectedLetter) {
        PageIcon = Compass;
        pageTitlePrefix = `Letter "${selectedLetter.toUpperCase()}"`;
        pageTitleHighlight = "Index";
        pageSubtitle = `Alphabetical listing of catalog titles starting with "${selectedLetter.toUpperCase()}".`;
    }

    const hasActiveFilters = Boolean(
        selectedGenre || selectedNetwork || selectedYear || selectedLanguage || selectedLetter || (selectedSort !== "popularity.desc" && !isTrending)
    );

    return (
        <div className="flex-1 w-full bg-bg-main pt-6 pb-16 px-4 sm:px-6 md:px-8 flex flex-col min-h-[75vh]">
            <div className="max-w-[1800px] mx-auto w-full flex-1 flex flex-col space-y-6">
                
                {/* Sticky Header Bar */}
                <div className="sticky top-[72px] z-30 bg-bg-main/95 backdrop-blur-md py-4 border-b border-white/5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-3xl md:text-5xl font-black text-white flex items-center gap-3">
                                <PageIcon className="w-8 h-8 text-accent shrink-0 animate-pulse" />
                                <span>{pageTitlePrefix}</span> <span className="bg-gradient-to-r from-accent to-accent-secondary bg-clip-text text-transparent">{pageTitleHighlight}</span>
                            </h1>
                            <p className="text-zinc-400 mt-2 font-medium text-sm">
                                {pageSubtitle}
                            </p>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="bg-[#12131A] border border-white/5 p-1 rounded-xl flex gap-1">
                                <button
                                    onClick={() => setFilterParam("type", "movie")}
                                    className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                                        mediaType === "movie" 
                                            ? "bg-gradient-to-r from-accent to-accent-secondary text-white shadow-lg shadow-accent/20" 
                                            : "bg-white/5 border border-white/10 text-zinc-400 hover:text-white"
                                    }`}
                                >
                                    <Film className="w-3.5 h-3.5 inline mr-1.5" />
                                    Movies
                                </button>
                                <button
                                    onClick={() => setFilterParam("type", "tv")}
                                    className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                                        mediaType === "tv" 
                                            ? "bg-gradient-to-r from-accent to-accent-secondary text-white shadow-lg shadow-accent/20" 
                                            : "bg-white/5 border border-white/10 text-zinc-400 hover:text-white"
                                    }`}
                                >
                                    <Tv className="w-3.5 h-3.5 inline mr-1.5" />
                                    TV Series
                                </button>
                                <button
                                    onClick={() => setFilterParam("type", "anime")}
                                    className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                                        mediaType === "anime" 
                                            ? "bg-gradient-to-r from-accent to-accent-secondary text-white shadow-lg shadow-accent/20" 
                                            : "bg-white/5 border border-white/10 text-zinc-400 hover:text-white"
                                    }`}
                                >
                                    <Sparkles className="w-3.5 h-3.5 inline mr-1.5" />
                                    Anime
                                </button>
                            </div>

                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 h-11 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all border cursor-pointer ${
                                    showFilters 
                                        ? "bg-accent/15 border-accent/40 text-accent shadow-[0_0_15px_var(--accent-glow)]" 
                                        : hasActiveFilters
                                        ? "bg-accent/10 border-accent/30 text-white"
                                        : "bg-[#12131A] border-white/5 text-zinc-400 hover:text-white hover:border-white/10"
                                }`}
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                                Filters
                                {hasActiveFilters && (
                                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse ml-0.5" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sliding Filter Drawer Overlay */}
                <AnimatePresence>
                    {showFilters && (
                        <>
                            {/* Backdrop overlay */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowFilters(false)}
                                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
                            />

                            {/* Drawer Panel */}
                            <motion.div
                                initial={{ x: "100%" }}
                                animate={{ x: 0 }}
                                exit={{ x: "100%" }}
                                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                className="fixed right-0 top-0 h-full w-full sm:w-[440px] z-50 bg-[#0B0B0F]/95 backdrop-blur-2xl border-l border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col"
                            >
                                {/* Header */}
                                <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/20">
                                    <div className="flex items-center gap-2">
                                        <SlidersHorizontal className="w-5 h-5 text-accent" />
                                        <span className="text-base font-extrabold text-white tracking-wide">Catalog Filters</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleReset}
                                            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-400 hover:text-white border border-white/5 hover:border-white/10 bg-white/5 rounded-lg transition-all cursor-pointer"
                                        >
                                            Reset All
                                        </button>
                                        <button
                                            onClick={() => setShowFilters(false)}
                                            aria-label="Close filters drawer"
                                            className="p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all cursor-pointer"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Scrollable filter segments */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                    
                                    {/* Content type */}
                                    <div className="space-y-2.5">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Content Type</span>
                                        <div className="grid grid-cols-3 gap-2 bg-[#08080B] p-1 rounded-xl border border-white/5">
                                            <button
                                                onClick={() => setFilterParam("type", "movie")}
                                                className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                                    mediaType === "movie"
                                                        ? "bg-gradient-to-r from-accent to-accent-secondary text-white shadow-md"
                                                        : "text-zinc-400 hover:text-white"
                                                }`}
                                            >
                                                <Film className="w-3.5 h-3.5" />
                                                Movies
                                            </button>
                                            <button
                                                onClick={() => setFilterParam("type", "tv")}
                                                className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                                    mediaType === "tv"
                                                        ? "bg-gradient-to-r from-accent to-accent-secondary text-white shadow-md"
                                                        : "text-zinc-400 hover:text-white"
                                                }`}
                                            >
                                                <Tv className="w-3.5 h-3.5" />
                                                Series
                                            </button>
                                            <button
                                                onClick={() => setFilterParam("type", "anime")}
                                                className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                                    mediaType === "anime"
                                                        ? "bg-gradient-to-r from-accent to-accent-secondary text-white shadow-md"
                                                        : "text-zinc-400 hover:text-white"
                                                }`}
                                            >
                                                <Sparkles className="w-3.5 h-3.5" />
                                                Anime
                                            </button>
                                        </div>
                                    </div>

                                    {/* Sorting selection */}
                                    <div className="space-y-3">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1">
                                            <ArrowUpDown className="w-3 h-3 text-accent" /> Sort By
                                        </span>
                                        <div className="grid grid-cols-2 gap-2">
                                            {SORT_OPTIONS.map(opt => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => setFilterParam("sort_by", opt.value)}
                                                    className={`px-3 py-2 border rounded-xl text-left text-xs font-bold transition-all cursor-pointer ${
                                                        selectedSort === opt.value
                                                            ? "bg-accent/15 text-accent border-accent/40 shadow-[0_0_12px_var(--accent-glow)]"
                                                            : "bg-[#08080B] border-white/5 text-zinc-400 hover:text-white hover:border-white/10"
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Year scroll selection */}
                                    <div className="space-y-3">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1">
                                            <Calendar className="w-3 h-3 text-accent" /> Release Year
                                        </span>
                                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                            <button
                                                onClick={() => setFilterParam("year", "")}
                                                className={`px-4 py-2 border rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                                    selectedYear === ""
                                                        ? "bg-gradient-to-r from-accent to-accent-warm text-white border-transparent shadow-[0_0_12px_var(--accent-glow)]"
                                                        : "bg-[#08080B] border-white/5 text-zinc-400 hover:text-white hover:border-white/10"
                                                }`}
                                            >
                                                All Years
                                            </button>
                                            {Array.from({ length: 27 }, (_, i) => String(2026 - i)).map(yr => (
                                                <button
                                                    key={yr}
                                                    onClick={() => setFilterParam("year", selectedYear === yr ? "" : yr)}
                                                    className={`px-4 py-2 border rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                                        selectedYear === yr
                                                            ? "bg-gradient-to-r from-accent to-accent-warm text-white border-transparent shadow-[0_0_12px_var(--accent-glow)]"
                                                            : "bg-[#08080B] border-white/5 text-zinc-400 hover:text-white hover:border-white/10"
                                                    }`}
                                                >
                                                    {yr}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Genre selector */}
                                    <div className="space-y-3">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Filter by Genre</span>
                                        <div className="flex flex-wrap gap-2">
                                            {GENRES.map(g => (
                                                <button
                                                    key={g.id}
                                                    onClick={() => setFilterParam("genre_id", selectedGenre === g.id ? "" : g.id)}
                                                    className={`px-3.5 py-2 border rounded-full text-xs font-bold transition-all cursor-pointer ${
                                                        selectedGenre === g.id
                                                            ? "bg-gradient-to-r from-accent to-accent-warm text-white border-transparent shadow-[0_0_12px_var(--accent-glow)]"
                                                            : "bg-[#08080B] border-white/5 text-zinc-400 hover:text-white hover:border-white/10"
                                                    }`}
                                                >
                                                    {g.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Language selector */}
                                    <div className="space-y-3">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1">
                                            <Globe className="w-3 h-3 text-accent" /> Original Language
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => setFilterParam("language", "")}
                                                className={`px-3.5 py-1.5 border rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                    selectedLanguage === ""
                                                        ? "bg-gradient-to-r from-accent to-accent-warm text-white border-transparent shadow-[0_0_12px_var(--accent-glow)]"
                                                        : "bg-[#08080B] border-white/5 text-zinc-400 hover:text-white hover:border-white/10"
                                                }`}
                                            >
                                                All Languages
                                            </button>
                                            {LANGUAGES.map(lang => (
                                                <button
                                                    key={lang.code}
                                                    onClick={() => setFilterParam("language", selectedLanguage === lang.code ? "" : lang.code)}
                                                    className={`px-3.5 py-1.5 border rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                        selectedLanguage === lang.code
                                                            ? "bg-gradient-to-r from-accent to-accent-warm text-white border-transparent shadow-[0_0_12px_var(--accent-glow)]"
                                                            : "bg-[#08080B] border-white/5 text-zinc-400 hover:text-white hover:border-white/10"
                                                    }`}
                                                >
                                                    {lang.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Region selector */}
                                    <div className="space-y-3">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1">
                                            <Globe className="w-3 h-3 text-accent" /> Watch Region
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                            {COUNTRIES.map(c => (
                                                <button
                                                    key={c.code}
                                                    onClick={() => setFilterParam("country", selectedCountry === c.code ? "" : c.code)}
                                                    className={`px-3.5 py-1.5 border rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                        selectedCountry === c.code
                                                            ? "bg-gradient-to-r from-accent to-accent-warm text-white border-transparent shadow-[0_0_12px_var(--accent-glow)]"
                                                            : "bg-[#08080B] border-white/5 text-zinc-400 hover:text-white hover:border-white/10"
                                                    }`}
                                                >
                                                    {c.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Network Channel / Platform selector */}
                                    <div className="space-y-3">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                            {mediaType === "tv" ? "Network Channel" : "Streaming Platform"}
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                            {NETWORKS.map(net => (
                                                <button
                                                    key={net.id}
                                                    onClick={() => setFilterParam("network_id", selectedNetwork === net.id ? "" : net.id)}
                                                    className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                                        selectedNetwork === net.id
                                                            ? "bg-gradient-to-r from-accent to-accent-warm text-white border-transparent shadow-[0_0_12px_var(--accent-glow)]"
                                                            : "bg-[#08080B] border-white/5 text-zinc-400 hover:text-white hover:border-white/10"
                                                    }`}
                                                >
                                                    <span>{net.logo}</span>
                                                    {net.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Alphabet selector */}
                                    <div className="space-y-3">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Titles Starting With</span>
                                        <div className="grid grid-cols-6 gap-1.5">
                                            {ALPHABET.map(letter => (
                                                <button
                                                    key={letter}
                                                    onClick={() => setFilterParam("letter", selectedLetter === letter ? "" : letter)}
                                                    className={`h-9 rounded-lg text-xs font-black transition-all flex items-center justify-center cursor-pointer ${
                                                        selectedLetter === letter
                                                            ? "bg-gradient-to-r from-accent to-accent-warm text-white shadow-[0_0_10px_var(--accent-glow)]"
                                                            : "bg-[#08080B] text-zinc-400 hover:text-white hover:bg-white/5 border border-white/5"
                                                    }`}
                                                >
                                                    {letter}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                </div>

                                {/* Drawer Footer */}
                                <div className="p-4 border-t border-white/10 bg-[#0B0B0F]/95 flex items-center gap-3">
                                    <button
                                        onClick={handleReset}
                                        className="flex-1 py-3 text-xs font-bold uppercase tracking-wider text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all cursor-pointer"
                                    >
                                        Reset All
                                    </button>
                                    <button
                                        onClick={() => setShowFilters(false)}
                                        className="flex-1 py-3 text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-accent to-accent-secondary rounded-xl shadow-lg transition-all cursor-pointer"
                                    >
                                        Apply Filters
                                    </button>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Sub-header status bar & Active Filters */}
                <div className="space-y-3 border-b border-white/5 pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm text-zinc-400 font-medium">
                            <span>Showing</span>
                            <span className="text-white font-black bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                                {items.length.toLocaleString()}
                            </span>
                            {totalResults > items.length && (
                                <>
                                    <span>of</span>
                                    <span className="text-white font-extrabold">{totalResults.toLocaleString()}</span>
                                </>
                            )}
                            <span>titles</span>
                        </div>
                    </div>

                    {/* Active Filter Badges */}
                    {hasActiveFilters && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-xs font-semibold text-zinc-400 mr-1">Active:</span>
                            {currentGenreObj && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-accent/15 border border-accent/30 text-white">
                                    Genre: {currentGenreObj.name}
                                    <button onClick={() => setFilterParam("genre_id", "")} aria-label="Remove genre filter" className="hover:text-accent transition-colors cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                                </span>
                            )}
                            {currentNetworkObj && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-accent/15 border border-accent/30 text-white">
                                    Network: {currentNetworkObj.name}
                                    <button onClick={() => setFilterParam("network_id", "")} aria-label="Remove network filter" className="hover:text-accent transition-colors cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                                </span>
                            )}
                            {selectedYear && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-accent/15 border border-accent/30 text-white">
                                    Year: {selectedYear}
                                    <button onClick={() => setFilterParam("year", "")} aria-label="Remove year filter" className="hover:text-accent transition-colors cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                                </span>
                            )}
                            {currentLanguageObj && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-accent/15 border border-accent/30 text-white">
                                    Language: {currentLanguageObj.name}
                                    <button onClick={() => setFilterParam("language", "")} aria-label="Remove language filter" className="hover:text-accent transition-colors cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                                </span>
                            )}
                            {selectedLetter && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-accent/15 border border-accent/30 text-white">
                                    Letter: {selectedLetter.toUpperCase()}
                                    <button onClick={() => setFilterParam("letter", "")} aria-label="Remove letter filter" className="hover:text-accent transition-colors cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                                </span>
                            )}
                            {selectedSort !== "popularity.desc" && !isTrending && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-accent/15 border border-accent/30 text-white">
                                    Sort: {SORT_OPTIONS.find(s => s.value === selectedSort)?.label || selectedSort}
                                    <button onClick={() => setFilterParam("sort_by", "popularity.desc")} aria-label="Reset sort" className="hover:text-accent transition-colors cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                                </span>
                            )}
                            <button
                                onClick={handleReset}
                                className="text-xs font-bold text-accent hover:underline ml-1 cursor-pointer"
                            >
                                Clear All
                            </button>
                        </div>
                    )}
                </div>

                {/* Main Results Display */}
                {loading ? (
                    <GridSkeleton count={14} />
                ) : error ? (
                    <div className="py-24 flex flex-col items-center justify-center text-center flex-1 min-h-[40vh]">
                        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-4 shadow-inner">
                            <X className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Something went wrong</h3>
                        <p className="text-zinc-400 text-sm max-w-md mb-6 leading-relaxed">{error}</p>
                        <button
                            onClick={() => fetchCatalog(1, false)}
                            className="px-6 py-2.5 bg-gradient-to-r from-accent to-accent-secondary hover:from-accent-hover hover:to-accent-warm text-white font-black uppercase tracking-wider text-xs rounded-xl transition-all shadow-lg shadow-accent/20 cursor-pointer"
                        >
                            Retry Loading
                        </button>
                    </div>
                ) : items.length === 0 ? (
                    <div className="py-24 flex flex-col items-center justify-center text-center flex-1 min-h-[40vh]">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 mb-4 shadow-inner">
                            <Compass className="w-8 h-8 text-accent animate-pulse" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No content matching filters</h3>
                        <p className="text-zinc-400 text-sm max-w-md mb-6 leading-relaxed">
                            We couldn&apos;t find any {mediaType === "anime" ? "anime" : mediaType === "tv" ? "TV series" : "movies"} matching your selected criteria.
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleReset}
                                className="px-6 py-2.5 bg-gradient-to-r from-accent to-accent-secondary hover:from-accent-hover hover:to-accent-warm text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-accent/20 cursor-pointer"
                            >
                                Clear All Filters
                            </button>
                            <button
                                onClick={() => router.push("/browse?sort_by=popularity.desc", { scroll: false })}
                                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                            >
                                Browse Trending
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col justify-between">
                        {/* Consistent, responsive poster grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4 md:gap-5 w-full">
                            {items.map((item) => (
                                <div key={`${item.id}-${item.media_type || mediaType}`} className="w-full">
                                    <MovieCard item={item} type={item.media_type || mediaType} />
                                </div>
                            ))}
                        </div>

                        {/* Infinite scroll sentinel & loader in standard content flow */}
                        <div className="w-full mt-10">
                            {hasMore && !loading && !error && (
                                <div ref={observerTarget} className="h-10 w-full pointer-events-none" aria-hidden="true" />
                            )}

                            {loadingMore && (
                                <div className="w-full flex items-center justify-center py-8">
                                    <div className="flex items-center gap-3 text-zinc-300 text-xs font-bold uppercase tracking-widest bg-[#12131A]/90 border border-white/10 px-6 py-3 rounded-full shadow-xl backdrop-blur-md">
                                        <Loader2 className="w-4 h-4 animate-spin text-accent" />
                                        Loading more titles...
                                    </div>
                                </div>
                            )}

                            {!hasMore && items.length > 0 && !loading && (
                                <div className="w-full flex flex-col items-center justify-center py-12 border-t border-white/5 mt-10 mb-4 text-center">
                                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 mb-2">
                                        <Compass className="w-4 h-4" />
                                    </div>
                                    <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider">
                                        End of Catalog
                                    </p>
                                    <p className="text-zinc-600 text-xs mt-0.5">
                                        Showing all {items.length.toLocaleString()} available titles
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
