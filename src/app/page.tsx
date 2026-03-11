"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Link from "next/link";
import useSWR from 'swr';
import { Search, Play, Star, Clock, TrendingUp, X, Github, Mail, Linkedin, Globe, Trophy, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMobileUI } from "@/context/MobileUIContext";
import AZFilter from "@/components/AZFilter";
import { AnimeCard, AnimeGrid, type Show } from "@/components/AnimeCard";
import { useDebounce } from "@/hooks/useDebounce";
import HeroCarousel from "@/components/HeroCarousel";

// AniList GraphQL Query
const SEARCH_QUERY = `
query($search: String) {
  Page(page: 1, perPage: 5) {
    media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
      id
        title {
        romaji
        english
        native
      }
        coverImage {
        medium
      }
      format
      seasonYear
    }
  }
}
`;

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [popular, setPopular] = useState<Show[]>([]);
  const [recent, setRecent] = useState<Show[]>([]);
  const [top, setTop] = useState<Show[]>([]);
  const [trending, setTrending] = useState<Show[]>([]);
  const [searchResults, setSearchResults] = useState<Show[]>([]);
  const [loading, setLoading] = useState({ popular: true, recent: true, top: true });
  const [isSearching, setIsSearching] = useState(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Scroll-to-top visibility
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Mobile UI Context
  const { theme, setMenuOpen } = useMobileUI();

  // Fetch suggestions from AniList
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!debouncedSearch.trim() || debouncedSearch.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await axios.post('https://graphql.anilist.co', {
          query: SEARCH_QUERY,
          variables: { search: debouncedSearch }
        });
        setSuggestions(response.data.data.Page.media || []);
      } catch (error) {
        console.warn("AniList/Search failed:", error);
        setSuggestions([]);
      }
    };

    fetchSuggestions();
  }, [debouncedSearch]);

  // Fetcher helper
  const fetcher = (url: string) => axios.get(url).then(res => res.data);

  // Use SWR for all sections with revalidation for real-time updates and instant caching
  const { data: recentData } = useSWR('/api/anime/recent', fetcher, { refreshInterval: 60000, revalidateOnFocus: true });
  const { data: popularData } = useSWR('/api/anime/popular', fetcher, { refreshInterval: 300000, revalidateOnFocus: false });
  const { data: topData } = useSWR('/api/anime/top', fetcher, { revalidateOnFocus: false });
  const { data: trendingData } = useSWR('/api/anime/trending', fetcher, { refreshInterval: 300000, revalidateOnFocus: false });

  useEffect(() => { if (recentData?.shows) setRecent(recentData.shows); }, [recentData]);
  useEffect(() => { if (popularData?.shows) setPopular(popularData.shows); }, [popularData]);
  useEffect(() => { if (topData?.shows) setTop(topData.shows); }, [topData]);
  useEffect(() => { if (trendingData?.shows) setTrending(trendingData.shows); }, [trendingData]);

  // Loading state calculations
  useEffect(() => {
    setLoading({
      recent: !recentData && recent.length === 0,
      popular: !popularData && popular.length === 0,
      top: !topData && top.length === 0,
      trending: !trendingData && trending.length === 0
    } as any);
  }, [recentData, recent, popularData, popular, topData, top, trendingData, trending]);

  const handleSearch = async (e: React.FormEvent | null, queryOverride?: string) => {
    if (e) e.preventDefault();
    const query = queryOverride || searchQuery;

    if (!query.trim()) return;

    setIsSearching(true);
    setShowSuggestions(false); // Hide suggestions on search

    // Update input if using override
    if (queryOverride) setSearchQuery(queryOverride);

    try {
      const res = await axios.get(`/api/anime/search?query=${encodeURIComponent(query)}`);
      setSearchResults(res.data.shows || []);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <main className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] selection:bg-purple-500/30 overflow-x-hidden font-sans transition-colors duration-300">
      {/* No JavaScript Fallback */}
      <noscript>
        <div className="fixed inset-0 z-[100] bg-[var(--bg-main)]/95 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="max-w-md bg-[var(--bg-card)] border border-purple-500/30 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Play className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-3">JavaScript Required</h2>
            <p className="text-[var(--text-muted)] mb-6">
              ToonPlayer requires JavaScript to provide the best streaming experience. Please enable JavaScript in your browser settings to continue.
            </p>
            <div className="text-sm text-[var(--text-muted)]">
              <p className="mb-2">Without JavaScript:</p>
              <ul className="text-left space-y-1">
                <li>• Video playback will not work</li>
                <li>• Search functionality is unavailable</li>
                <li>• Interactive features are disabled</li>
              </ul>
            </div>
          </div>
        </div>
      </noscript>

      {/* Background Ambience - Highly optimized */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[var(--bg-main)]">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-purple-900/10 to-transparent opacity-50 transition-opacity duration-300" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 md:px-6 py-3 md:py-4 bg-[var(--bg-overlay)] backdrop-blur-md md:backdrop-blur-xl border-b border-[var(--border-color)] pt-[max(2.5rem,env(safe-area-inset-top))] md:pt-4 transition-all duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 cursor-pointer" onClick={clearSearch}>
            <div className="w-8 h-8 md:w-10 md:h-10 relative">
              <img src="/logo.png" alt="ToonPlayer Logo" className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
            </div>
            <span className="text-lg md:text-xl font-bold tracking-tight text-[var(--text-main)]">ToonPlayer</span>
          </Link>

          <div className="flex-1 max-w-md hidden md:block relative group"
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}>
            <form onSubmit={(e) => handleSearch(e)} className="relative flex items-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full px-3 py-1.5 md:py-2 focus-within:border-purple-500/50 transition-colors">
              <Search className="w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search anime..."
                className="w-full bg-transparent border-none focus:outline-none px-2 md:px-3 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)]"
                autoComplete="off"
              />
              {searchQuery && (
                <button type="button" onClick={clearSearch} className="p-1 hover:bg-[var(--border-color)] rounded-full">
                  <X className="w-3 h-3 text-[var(--text-muted)]" />
                </button>
              )}
            </form>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-2xl z-50">
                {suggestions.map((show) => (
                  <Link
                    key={show.id}
                    href={`/watch/${show.id}`}
                    className="w-full flex items-center gap-3 p-3 hover:bg-[var(--bg-main)] transition-colors text-left border-b border-[var(--border-color)] last:border-0"
                  >
                    <img
                      src={show.coverImage.medium}
                      alt=""
                      className="w-8 h-12 object-cover rounded bg-[var(--bg-main)]"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-[var(--text-main)] truncate">
                        {show.title.english || show.title.romaji}
                      </h4>
                      <p className="text-xs text-[var(--text-muted)] truncate">
                        {show.seasonYear ? `${show.seasonYear} • ` : ''}{show.format}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="md:hidden flex-1 flex justify-end"></div>

          <div className="flex gap-3 md:gap-6 text-xs md:text-sm font-medium text-[var(--text-muted)]">
            <button className="hover:text-[var(--text-main)] transition-colors hidden sm:block" onClick={clearSearch}>Home</button>
            <Link href="/movies" className="hover:text-blue-400 transition-colors hidden sm:block">Movies</Link>
            <button className="hover:text-purple-400 transition-colors text-[var(--text-main)]" onClick={() => setMenuOpen(true)}>About</button>
          </div>
        </div>
      </nav>

      <div className="pt-20 md:pt-24 relative z-10 pb-24 md:pb-0">

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl md:text-2xl font-bold">Search Results for "{searchQuery}"</h2>
              <button onClick={clearSearch} className="text-sm text-purple-400 hover:text-purple-300">Clear</button>
            </div>
            <AnimeGrid shows={searchResults} />
          </div>
        )}

        {/* Hero Carousel Section */}
        {searchResults.length === 0 && (
          <>
            <HeroCarousel />

            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-12">

              {/* Watchlist Section */}
              <WatchlistSection />

              {/* A-Z Filter Bar */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-1 h-5 bg-purple-500 rounded-full"></span>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">Browse by Letter</h3>
                </div>
                <AZFilter />
              </section>

              {/* Trending Now (Ranked) */}
              <section>
                <SectionHeader icon={TrendingUp} title="Trending Now" />
                {(loading as any).trending ? <LoadingSkeleton /> : <AnimeGridRanked shows={trending.slice(0, 15)} />}
              </section>

              {/* Top Airing */}
              <section>
                <SectionHeader icon={Star} title="Top Airing" />
                {loading.popular ? <LoadingSkeleton /> : <AnimeGrid shows={popular.slice(0, 15)} />}
              </section>

              {/* Top Anime (All Time) */}
              <section>
                <SectionHeader icon={Trophy} title="Top Anime" />
                {loading.top ? <LoadingSkeleton /> : <AnimeGrid shows={top.slice(0, 15)} />}
              </section>

              {/* Latest Releases */}
              <section>
                <SectionHeader icon={Clock} title="Latest Releases" />
                {loading.recent ? <LoadingSkeleton /> : <AnimeGrid shows={recent.slice(0, 15)} />}
              </section>

            </div>
          </>
        )}

      </div>

      {/* Scroll to Top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-40 p-3 bg-purple-500/90 hover:bg-purple-500 text-white rounded-full shadow-[0_0_20px_rgba(168,85,247,0.4)] backdrop-blur-sm transition-colors"
          >
            <ChevronUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </main>
  );
}

// Section Header Component
function SectionHeader({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-1 h-6 bg-purple-500 rounded-full shadow-[0_0_10px_#a855f7]"></div>
      <h2 className="text-xl md:text-2xl font-bold tracking-tight">{title}</h2>
      <Icon className="w-5 h-5 text-purple-400" />
    </div>
  );
}

function WatchlistSection() {
  const [watchlist, setWatchlist] = useState<Show[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = JSON.parse(localStorage.getItem('toonplayer_watchlist') || '[]');
    setWatchlist(saved);
  }, []);

  if (!mounted || watchlist.length === 0) return null;

  return (
    <section>
      <SectionHeader icon={Star} title="Your Watchlist" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
        {watchlist.map((show) => (
          <div key={show._id} className="relative group">
            <Link href={`/watch/${show._id}${show.provider ? `?provider=${show.provider}` : ''}`}>
              <div className="aspect-[3/4.5] rounded-xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-purple-500/50 transition-all cursor-pointer relative shadow-lg group-hover:shadow-purple-500/20">
                <img
                  src={show.thumbnail}
                  alt={show.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3">
                  <p className="text-white text-sm font-bold line-clamp-2 leading-tight">{show.name}</p>
                </div>
              </div>
            </Link>
            <button
              onClick={(e) => {
                e.preventDefault();
                const newList = watchlist.filter(i => i._id !== show._id);
                localStorage.setItem('toonplayer_watchlist', JSON.stringify(newList));
                setWatchlist(newList);
              }}
              className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
              title="Remove"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function AnimeGridRanked({ shows }: { shows: Show[] }) {
  if (!shows || shows.length === 0) return null;

  return (
    <div className="relative">
      <div className="flex overflow-x-auto gap-6 pb-6 pt-2 px-2 snap-x hide-scrollbar">
        {shows.map((show, index) => (
          <Link key={show._id} href={`/watch/${show._id}`} className="relative flex-shrink-0 w-[160px] md:w-[200px] snap-start group">
            <div className="relative aspect-[3/4.5] ml-8 z-10 transition-transform duration-300 group-hover:-translate-y-2">
              <div className="absolute inset-0 rounded-xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xl">
                <img
                  src={show.thumbnail}
                  alt={show.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
              </div>
            </div>
            {/* Big Ranking Number */}
            <div className="absolute -left-2 bottom-4 text-[100px] md:text-[140px] font-black text-transparent leading-none z-0 select-none"
              style={{ WebkitTextStroke: '2px rgba(255,255,255,0.2)' }}>
              {index + 1}
            </div>
            <div className="absolute -left-2 bottom-4 text-[100px] md:text-[140px] font-black text-[var(--accent)] leading-none z-0 select-none opacity-20 transform translate-x-1 translate-y-1">
              {index + 1}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="aspect-[3/4.5] rounded-xl bg-[var(--bg-card)] animate-pulse border border-[var(--border-color)]"></div>
      ))}
    </div>
  );
}
