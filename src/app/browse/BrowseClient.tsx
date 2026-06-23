"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Compass, Film, Tv, X, SlidersHorizontal, 
    ArrowUpDown, Globe, Calendar, RefreshCw, Loader2 
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
    { name: "Drama", id: "18" },
    { name: "Family", id: "10751" },
    { name: "Fantasy", id: "14" },
    { name: "History", id: "36" },
    { name: "Horror", id: "27" },
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
    const mediaType = (searchParams.get("type") as "movie" | "tv") || "movie";
    const selectedGenre = searchParams.get("genre_id") || "";
    const selectedNetwork = searchParams.get("network_id") || "";
    const selectedYear = searchParams.get("year") || "";
    const selectedLanguage = searchParams.get("language") || "";
    const selectedCountry = searchParams.get("country") || "US";
    const selectedSort = searchParams.get("sort_by") || "popularity.desc";
    const selectedLetter = searchParams.get("letter") || "";

    const [items, setItems] = useState<MovieItem[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    const observerTarget = useRef<HTMLDivElement>(null);
    const isFetchingRef = useRef(false);

    // Lock body scrolling when filter drawer is open
    useEffect(() => {
        if (showFilters) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
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

    const handleReset = () => {
        const params = new URLSearchParams();
        params.set("type", mediaType); // Keep current media type
        params.set("country", "US");
        router.replace(`/browse?${params.toString()}`, { scroll: false });
    };

    // Load filters on mount if URL parameters are not set
    useEffect(() => {
        if (typeof window !== "undefined" && !searchParams.toString()) {
            const saved = localStorage.getItem("toonplayer_browse_filters");
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    const params = new URLSearchParams();
                    if (parsed.mediaType) params.set("type", parsed.mediaType);
                    if (parsed.selectedGenre) params.set("genre_id", parsed.selectedGenre);
                    if (parsed.selectedNetwork) params.set("network_id", parsed.selectedNetwork);
                    if (parsed.selectedYear) params.set("year", parsed.selectedYear);
                    if (parsed.selectedLanguage) params.set("language", parsed.selectedLanguage);
                    if (parsed.selectedCountry) params.set("country", parsed.selectedCountry);
                    if (parsed.selectedSort) params.set("sort_by", parsed.selectedSort);
                    if (parsed.selectedLetter) params.set("letter", parsed.selectedLetter);
                    router.replace(`/browse?${params.toString()}`, { scroll: false });
                } catch(e) {}
            }
        }
    }, [searchParams, router]);

    // Save filters to localStorage whenever searchParams change
    useEffect(() => {
        if (typeof window !== "undefined") {
            const filters = { mediaType, selectedGenre, selectedNetwork, selectedYear, selectedLanguage, selectedCountry, selectedSort, selectedLetter };
            localStorage.setItem("toonplayer_browse_filters", JSON.stringify(filters));
        }
    }, [mediaType, selectedGenre, selectedNetwork, selectedYear, selectedLanguage, selectedCountry, selectedSort, selectedLetter]);

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
            let attempts = 0;
            const maxAttempts = 5; // Guard against infinite looping

            while (attempts < maxAttempts) {
                const params = new URLSearchParams({
                    media_type: mediaType,
                    sort_by: selectedSort,
                    page: String(currentPageNum),
                    watch_region: selectedCountry
                });

                if (selectedGenre) params.set("genre_id", selectedGenre);
                if (selectedNetwork) params.set("network_id", selectedNetwork);
                if (selectedYear) params.set("year", selectedYear);
                if (selectedLanguage) params.set("with_original_language", selectedLanguage);

                const res = await axios.get(`/api/prime/discover?${params.toString()}`);
                let fetchedResults = res.data.results || [];
                currentTotalPages = res.data.total_pages || 1;

                // Client-side alphabet filter
                if (selectedLetter) {
                    const letter = selectedLetter.toLowerCase();
                    fetchedResults = fetchedResults.filter((item: MovieItem) => {
                        const title = (item.title || item.name || "").toLowerCase();
                        return title.startsWith(letter);
                    });
                }

                combinedResults = [...combinedResults, ...fetchedResults];

                // If not filtering by letter, or got enough items, or hit total pages, stop
                if (!selectedLetter || combinedResults.length >= 8 || currentPageNum >= currentTotalPages) {
                    break;
                }

                currentPageNum++;
                attempts++;
            }

            setPage(currentPageNum);
            setTotalPages(currentTotalPages);

            if (isAppend) {
                setItems(prev => {
                    const combined = [...prev, ...combinedResults];
                    const seen = new Set();
                    return combined.filter(item => {
                        if (seen.has(item.id)) return false;
                        seen.add(item.id);
                        return true;
                    });
                });
            } else {
                setItems(combinedResults);
            }
        } catch (err: any) {
            console.error("Browse loading failed:", err);
            setError("Failed to load catalog content. Please try again.");
        } finally {
            setLoading(false);
            setLoadingMore(false);
            isFetchingRef.current = false;
        }
    }, [mediaType, selectedGenre, selectedNetwork, selectedYear, selectedLanguage, selectedCountry, selectedSort, selectedLetter]);

    // Fetch initial results on change
    useEffect(() => {
        setPage(1);
        fetchCatalog(1, false);
    }, [mediaType, selectedGenre, selectedNetwork, selectedYear, selectedLanguage, selectedCountry, selectedSort, selectedLetter, fetchCatalog]);

    // Handle Infinite Scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && !isFetchingRef.current) {
                    setPage(prevPage => {
                        const nextPage = prevPage + 1;
                        if (nextPage <= totalPages) {
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
                        return prevPage;
                    });
                }
            },
            { 
                threshold: 0.3,
                rootMargin: "300px"
            }
        );

        const target = observerTarget.current;
        if (target) observer.observe(target);

        return () => {
            if (target) observer.unobserve(target);
            observer.disconnect();
        };
    }, [totalPages, fetchCatalog]);

    return (
        <div className="flex-1 w-full bg-[#050505] pt-6 pb-12 px-4 md:px-8 flex flex-col">
            <div className="max-w-[1800px] mx-auto w-full flex-1 flex flex-col space-y-8">
                
                {/* Sticky Header Bar */}
                <div className="sticky top-14 md:top-16 z-30 bg-[#050505]/95 backdrop-blur-md py-4 border-b border-white/5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-3xl md:text-5xl font-black text-white flex items-center gap-3">
                                <Compass className="w-8 h-8 text-[var(--accent)] shrink-0 animate-pulse" />
                                Browse <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] bg-clip-text text-transparent">Catalog</span>
                            </h1>
                            <p className="text-zinc-400 mt-2 font-medium text-sm">
                                Explore dynamic catalog collections with infinite scrolling and premium filtering.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="bg-[#12131A] border border-white/5 p-1 rounded-xl flex gap-1">
                                <button
                                    onClick={() => setFilterParam("type", "movie")}
                                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                                        mediaType === "movie" 
                                            ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] text-white shadow-lg" 
                                            : "bg-white/5 border border-white/10 text-zinc-400 hover:text-white"
                                    }`}
                                >
                                    <Film className="w-3.5 h-3.5 inline mr-2" />
                                    Movies
                                </button>
                                <button
                                    onClick={() => setFilterParam("type", "tv")}
                                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                                        mediaType === "tv" 
                                            ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] text-white shadow-lg" 
                                            : "bg-white/5 border border-white/10 text-zinc-400 hover:text-white"
                                    }`}
                                >
                                    <Tv className="w-3.5 h-3.5 inline mr-2" />
                                    TV Series
                                </button>
                            </div>

                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 h-11 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all border cursor-pointer ${
                                    showFilters 
                                        ? "bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] shadow-[0_0_15px_var(--accent-glow)]" 
                                        : "bg-[#12131A] border-white/5 text-zinc-400 hover:text-white hover:border-white/10"
                                }`}
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                                Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sliding Glassmorphic Filter Drawer Overlay */}
                <AnimatePresence>
                    {showFilters && (
                        <>
                            {/* Backdrop overlay */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowFilters(false)}
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
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
                                        <SlidersHorizontal className="w-5 h-5 text-[var(--accent)]" />
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
                                        <div className="grid grid-cols-2 gap-2 bg-[#08080B] p-1 rounded-xl border border-white/5">
                                            <button
                                                onClick={() => setFilterParam("type", "movie")}
                                                className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                                    mediaType === "movie"
                                                        ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] text-white shadow-md"
                                                        : "text-zinc-400 hover:text-white"
                                                }`}
                                            >
                                                <Film className="w-3.5 h-3.5" />
                                                Movies
                                            </button>
                                            <button
                                                onClick={() => setFilterParam("type", "tv")}
                                                className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                                    mediaType === "tv"
                                                        ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] text-white shadow-md"
                                                        : "text-zinc-400 hover:text-white"
                                                }`}
                                            >
                                                <Tv className="w-3.5 h-3.5" />
                                                TV Shows
                                            </button>
                                        </div>
                                    </div>

                                    {/* Sorting selection */}
                                    <div className="space-y-3">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1">
                                            <ArrowUpDown className="w-3 h-3 text-[var(--accent)]" /> Sort By
                                        </span>
                                        <div className="grid grid-cols-2 gap-2">
                                            {SORT_OPTIONS.map(opt => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => setFilterParam("sort_by", opt.value)}
                                                    className={`px-3 py-2 border rounded-xl text-left text-xs font-bold transition-all cursor-pointer ${
                                                        selectedSort === opt.value
                                                            ? "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/40 shadow-[0_0_12px_var(--accent-glow)]"
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
                                            <Calendar className="w-3 h-3 text-[var(--accent)]" /> Release Year
                                        </span>
                                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                            <button
                                                onClick={() => setFilterParam("year", "")}
                                                className={`px-4 py-2 border rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                                    selectedYear === ""
                                                        ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-warm)] hover:-translate-y-[1px] hover:scale-[1.02] text-white border-transparent shadow-[0_0_12px_var(--accent-glow)]"
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
                                                            ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-warm)] hover:-translate-y-[1px] hover:scale-[1.02] text-white border-transparent shadow-[0_0_12px_var(--accent-glow)]"
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
                                                            ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-warm)] hover:-translate-y-[1px] hover:scale-[1.02] text-white border-transparent shadow-[0_0_12px_var(--accent-glow)]"
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
                                            <Globe className="w-3 h-3 text-[var(--accent)]" /> Original Language
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => setFilterParam("language", "")}
                                                className={`px-3.5 py-1.5 border rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                    selectedLanguage === ""
                                                        ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-warm)] hover:-translate-y-[1px] hover:scale-[1.02] text-white border-transparent shadow-[0_0_12px_var(--accent-glow)]"
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
                                                            ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-warm)] hover:-translate-y-[1px] hover:scale-[1.02] text-white border-transparent shadow-[0_0_12px_var(--accent-glow)]"
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
                                            <Globe className="w-3 h-3 text-[var(--accent)]" /> Watch Region
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                            {COUNTRIES.map(c => (
                                                <button
                                                    key={c.code}
                                                    onClick={() => setFilterParam("country", selectedCountry === c.code ? "" : c.code)}
                                                    className={`px-3.5 py-1.5 border rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                        selectedCountry === c.code
                                                            ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-warm)] hover:-translate-y-[1px] hover:scale-[1.02] text-white border-transparent shadow-[0_0_12px_var(--accent-glow)]"
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
                                                            ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-warm)] hover:-translate-y-[1px] hover:scale-[1.02] text-white border-transparent shadow-[0_0_12px_var(--accent-glow)]"
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
                                                            ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-warm)] hover:-translate-y-[1px] hover:scale-[1.02] text-white shadow-[0_0_10px_var(--accent-glow)]"
                                                            : "bg-[#08080B] text-zinc-400 hover:text-white hover:bg-white/5 border border-white/5"
                                                    }`}
                                                >
                                                    {letter}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Sub-header status bar */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <p className="text-sm text-zinc-400 font-semibold">
                        Found <span className="text-white font-extrabold">{items.length}</span> titles matching filters
                    </p>
                </div>

                {/* Main Results Display */}
                {loading ? (
                    <GridSkeleton count={16} />
                ) : error ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4 border border-red-500/20 text-red-500">
                            <X className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Something went wrong</h3>
                        <p className="text-zinc-500 text-sm mb-6">{error}</p>
                        <button
                            onClick={() => fetchCatalog(1, false)}
                            className="px-6 py-2.5 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] text-white font-black uppercase tracking-wider text-xs rounded-xl transition-all cursor-pointer"
                        >
                            Retry Loading
                        </button>
                    </div>
                ) : items.length === 0 ? (
                    <div className="py-24 flex flex-col items-center justify-center text-center opacity-60 flex-1">
                        <Compass className="w-16 h-16 text-zinc-500 mb-4 animate-bounce" />
                        <h3 className="text-lg font-bold text-white">No content matching filters</h3>
                        <p className="text-zinc-500 text-sm mt-1">Try resetting genres, networks, or alphabetical parameters.</p>
                        <button
                            onClick={handleReset}
                            className="mt-6 px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-wider text-white border border-white/10 transition-all cursor-pointer"
                        >
                            Clear Filters
                        </button>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col justify-between">
                        <div className="responsive-grid">
                            {(isKidsMode ? items.filter(item => isKidsFriendly(item)) : items).map((item) => (
                                <div key={item.id} className="w-full">
                                    <MovieCard item={item} type={item.media_type || mediaType} />
                                </div>
                            ))}
                        </div>

                        {/* Infinite scroll target trigger / status pill */}
                        <div ref={observerTarget} className="w-full flex flex-col items-center justify-center mt-12 mb-8 min-h-[50px]">
                            {loadingMore ? (
                                <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-widest bg-[var(--bg-elevated)]/50 border border-white/5 px-5 py-2.5 rounded-full shadow-lg backdrop-blur-md">
                                    <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
                                    Loading More Hits...
                                </div>
                            ) : page >= totalPages && items.length > 0 ? (
                                <div className="text-zinc-500 text-[10px] font-black uppercase tracking-widest bg-[#12131A] border border-white/5 px-6 py-2.5 rounded-full shadow-md">
                                    End of Catalog
                                </div>
                            ) : null}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
