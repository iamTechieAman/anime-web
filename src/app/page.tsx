"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Link from "next/link";
import useSWR from 'swr';
import { Search, Play, Star, Clock, TrendingUp, X, ChevronUp, Bell, Shuffle, SlidersHorizontal, Calendar, Zap, CheckCircle, Circle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMobileUI } from "@/context/MobileUIContext";
import AZFilter from "@/components/AZFilter";
import { AnimeCard, AnimeGrid, AnimeCardHorizontal, type Show } from "@/components/AnimeCard";
import { useDebounce } from "@/hooks/useDebounce";
import { useRouter } from "next/navigation";
import HeroCarousel from "@/components/HeroCarousel";

const GENRES = ["Action","Adventure","Comedy","Drama","Fantasy","Horror","Mecha","Mystery","Psychological","Romance","Sci-Fi","Slice of Life","Sports","Supernatural","Thriller"];
const FORMATS = ["TV","Movie","OVA","ONA","Special"];
const STATUSES = ["Ongoing","Completed","Upcoming"];

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

  // Filter and Notification state
  const [showFilter, setShowFilter] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [filterGenre, setFilterGenre] = useState("");
  const [filterFormat, setFilterFormat] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const filterRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const [hasNewNotif] = useState(true);

  // Scroll-to-top visibility
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close panels on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilter(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleShuffle = () => {
    const pool = [...trending, ...popular, ...recent];
    if (pool.length > 0) {
      const random = pool[Math.floor(Math.random() * pool.length)];
      router.push(`/watch/${random._id}${random.provider ? `?provider=${random.provider}` : ''}`);
    }
  };

  const applyFilter = () => {
    const params = new URLSearchParams();
    if (filterGenre) params.set('genre', filterGenre);
    if (filterFormat) params.set('format', filterFormat.toLowerCase());
    if (filterStatus) params.set('status', filterStatus.toLowerCase());
    if (searchQuery) params.set('query', searchQuery);
    setShowFilter(false);
    router.push(`/search?${params.toString()}`);
  };

  const clearFilters = () => {
    setFilterGenre('');
    setFilterFormat('');
    setFilterStatus('');
  };

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

  const router = useRouter();

  const handleSearch = async (e: React.FormEvent | null, queryOverride?: string) => {
    if (e) e.preventDefault();
    const query = queryOverride || searchQuery;

    if (!query.trim()) return;

    setIsSearching(true);
    setShowSuggestions(false);
    
    // Redirect to out-of-the-box search page
    router.push(`/search?query=${encodeURIComponent(query)}`);
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
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 md:px-6 py-3 md:py-4 bg-[var(--bg-overlay)] backdrop-blur-md md:backdrop-blur-xl border-b border-[var(--border-color)] pt-[max(2.5rem,env(safe-area-inset-top))] md:pt-4 transition-all duration-300 md:pl-[72px]">
        <div className="w-full mx-auto flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 cursor-pointer shrink-0" onClick={clearSearch}>
            <div className="w-8 h-8 md:w-9 md:h-9 relative">
              <img src="/logo.png" alt="ToonPlayer Logo" className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
            </div>
            <span className="text-lg md:text-xl font-black tracking-tight text-[var(--text-main)] font-sora block">ToonPlayer</span>
          </Link>

          {/* Search Bar + Filter */}
          <div className="flex-1 max-w-xl hidden md:flex items-center gap-2 relative"
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}>
            <form onSubmit={(e) => handleSearch(e)} className="relative flex-1 flex items-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm px-4 py-2 hover:bg-[var(--bg-card)]/80 focus-within:border-white/20 transition-all">
              <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search anime..."
                className="w-full bg-transparent border-none focus:outline-none px-3 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] font-inter"
                autoComplete="off"
              />
              {searchQuery && (
                <button type="button" onClick={clearSearch} className="p-1 hover:bg-[var(--border-color)] rounded-full mr-1">
                  <X className="w-4 h-4 text-[var(--text-muted)]" />
                </button>
              )}
            </form>

            {/* Filter Button */}
            <div ref={filterRef} className="relative">
              <button
                onClick={() => { setShowFilter(v => !v); setShowNotifications(false); }}
                className={`h-full px-3 py-2.5 bg-[var(--bg-card)] border rounded-sm flex items-center gap-1.5 text-xs font-bold transition-all ${
                  showFilter || filterGenre || filterFormat || filterStatus
                    ? 'border-purple-500 text-purple-400'
                    : 'border-[var(--border-color)] text-[var(--text-muted)] hover:text-white hover:border-white/20'
                }`}
                title="Filter"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden lg:block">Filter</span>
                {(filterGenre || filterFormat || filterStatus) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                )}
              </button>

              <AnimatePresence>
                {showFilter && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    className="absolute top-full right-0 mt-2 w-72 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
                      <span className="font-bold text-sm">Filter Anime</span>
                      <button onClick={clearFilters} className="text-xs text-[var(--text-muted)] hover:text-white">Clear All</button>
                    </div>
                    <div className="p-4 space-y-4">
                      {/* Genre */}
                      <div>
                        <p className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Genre</p>
                        <div className="flex flex-wrap gap-1.5">
                          {GENRES.map(g => (
                            <button key={g} onClick={() => setFilterGenre(filterGenre === g ? '' : g)}
                              className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                                filterGenre === g ? 'bg-purple-600 text-white' : 'bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-white'
                              }`}>{g}</button>
                          ))}
                        </div>
                      </div>
                      {/* Format */}
                      <div>
                        <p className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Format</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {FORMATS.map(f => (
                            <button key={f} onClick={() => setFilterFormat(filterFormat === f ? '' : f)}
                              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                                filterFormat === f ? 'bg-blue-600 text-white' : 'bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-white'
                              }`}>{f}</button>
                          ))}
                        </div>
                      </div>
                      {/* Status */}
                      <div>
                        <p className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Status</p>
                        <div className="flex gap-1.5">
                          {STATUSES.map(s => (
                            <button key={s} onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
                              className={`px-3 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
                                filterStatus === s ? 'bg-[#FF5722] text-white' : 'bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-white'
                              }`}>
                              {filterStatus === s ? <CheckCircle className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="p-3 border-t border-[var(--border-color)]">
                      <button onClick={applyFilter} className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-lg transition-colors">
                        Apply Filter
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Shuffle */}
            <button onClick={handleShuffle} className="h-full px-3 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm hover:bg-white/5 transition-colors flex items-center justify-center text-[var(--text-muted)] hover:text-white" title="Random Anime">
              <Shuffle className="w-4 h-4" />
            </button>

            {/* Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-[105px] mt-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm overflow-hidden shadow-2xl z-50">
                {suggestions.map((show) => (
                  <Link key={show.id} href={`/watch/${show.id}`}
                    className="w-full flex items-center gap-3 p-3 hover:bg-[var(--bg-main)] transition-colors text-left border-b border-[var(--border-color)] last:border-0"
                  >
                    <img src={show.coverImage.medium} alt="" className="w-10 h-14 object-cover rounded-sm bg-[var(--bg-main)]" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-[var(--text-main)] truncate font-sora">{show.title.english || show.title.romaji}</h4>
                      <p className="text-xs text-[var(--text-muted)] truncate mt-1">{show.seasonYear ? `${show.seasonYear} • ` : ''}{show.format}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right Icons */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            {/* Mobile search */}
            <button className="md:hidden p-2 text-[var(--text-muted)] hover:text-white" onClick={() => setMenuOpen(true)}>
              <Search className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => { setShowNotifications(v => !v); setShowFilter(false); }}
                className={`p-2 relative transition-colors hidden sm:flex items-center justify-center rounded-lg hover:bg-[var(--bg-card)] ${
                  showNotifications ? 'text-white bg-[var(--bg-card)]' : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                <Bell className="w-5 h-5" />
                {hasNewNotif && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[var(--bg-overlay)]" />}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    className="absolute top-full right-0 mt-2 w-80 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
                      <span className="font-bold text-sm flex items-center gap-2"><Bell className="w-4 h-4 text-purple-400" />Notifications</span>
                      <Link href="/schedule" onClick={() => setShowNotifications(false)} className="text-xs text-purple-400 hover:text-purple-300">View Schedule</Link>
                    </div>
                    <div className="p-3 space-y-2">
                      {(trending.slice(0,4) || []).map((show, i) => (
                        <Link key={`${show._id}-notif-${i}`} href={`/watch/${show._id}${show.provider ? `?provider=${show.provider}` : ''}`}
                          onClick={() => setShowNotifications(false)}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg-main)] transition-colors group"
                        >
                          <div className="w-10 h-14 rounded overflow-hidden shrink-0 bg-[var(--bg-main)]">
                            {show.thumbnail && <img src={show.thumbnail} alt={show.name} className="w-full h-full object-cover" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold line-clamp-1 group-hover:text-white transition-colors">{show.name}</p>
                            <p className="text-[10px] text-[#FF5722] font-bold mt-0.5 flex items-center gap-1">
                              <Zap className="w-2.5 h-2.5" /> Trending Now
                            </p>
                          </div>
                        </Link>
                      ))}
                      <Link href="/schedule" onClick={() => setShowNotifications(false)}
                        className="flex items-center gap-2 w-full mt-1 p-2 rounded-lg bg-purple-600/10 hover:bg-purple-600/20 transition-colors text-purple-400 text-xs font-bold"
                      >
                        <Calendar className="w-4 h-4" /> View Full Airing Schedule
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-20 md:pt-24 relative z-10 pb-24 md:pb-0">

            <HeroCarousel />

            {/* Genre Bar */}
            <div className="bg-[var(--bg-card)] border-y border-[var(--border-color)]">
               <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3 flex gap-4 overflow-x-auto hide-scrollbar whitespace-nowrap">
                   {["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mecha", "Music", "Mystery", "Psychological", "Romance", "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller"].map(genre => (
                       <Link key={genre} href={`/genre/${genre.toLowerCase()}`} className="text-sm font-medium text-[var(--text-muted)] hover:text-white transition-colors">{genre}</Link>
                   ))}
               </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 md:py-8 flex flex-col lg:flex-row gap-6 md:gap-8">
                {/* Left Column (Main Content) */}
                <div className="flex-1 space-y-10 min-w-0">
                    <section>
                       <div className="flex items-center justify-between mb-6">
                         <h2 className="text-xl md:text-2xl font-bold font-sora text-white">Recently Updated</h2>
                         <Link href="/recent" className="text-sm text-[var(--text-muted)] hover:text-white transition-colors">View All &gt;</Link>
                       </div>
                       {loading.recent ? <LoadingSkeleton /> : <AnimeGrid shows={recent.slice(0, 24)} />}
                    </section>
                </div>

                {/* Right Column (Sidebar) */}
                <div className="w-full lg:w-[320px] xl:w-[350px] space-y-10 shrink-0">
                    {/* Top Airing */}
                    <section className="bg-[var(--bg-card)]/50 p-4 rounded-xl border border-[var(--border-color)]">
                       <h2 className="text-lg font-bold font-sora text-white mb-4 flex items-center gap-2">
                         <Star className="w-5 h-5 text-[#FF5722]" /> 
                         Top Airing
                       </h2>
                       {loading.popular ? <SidebarLoadingSkeleton /> : <div className="flex flex-col gap-2">{popular.slice(0, 10).map((show, i) => <AnimeCardHorizontal key={`${show._id}-${i}`} show={show} rank={i} />)}</div>}
                    </section>

                    {/* Trending */}
                    <section className="bg-[var(--bg-card)]/50 p-4 rounded-xl border border-[var(--border-color)]">
                       <h2 className="text-lg font-bold font-sora text-white mb-4 flex items-center gap-2">
                         <TrendingUp className="w-5 h-5 text-purple-500" /> 
                         Trending Right Now
                       </h2>
                       {(loading as any).trending ? <SidebarLoadingSkeleton /> : <div className="flex flex-col gap-2">{trending.slice(0, 10).map((show, i) => <AnimeCardHorizontal key={`${show._id}-${i}`} show={show} rank={i} />)}</div>}
                    </section>
                </div>
            </div>
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
        <div key={i} className="aspect-[3/4.5] rounded-sm bg-[var(--bg-card)] animate-pulse border border-[var(--border-color)]"></div>
      ))}
    </div>
  );
}

function SidebarLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="w-full h-20 bg-[var(--bg-card)] animate-pulse rounded-md"></div>
      ))}
    </div>
  );
}
