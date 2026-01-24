"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Play, Star, Clock, TrendingUp, X, Github, Mail, Linkedin, Globe, Trophy } from "lucide-react";
import axios from "axios";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useMobileUI } from "@/context/MobileUIContext";

interface Show {
  _id: string;
  name: string;
  availableEpisodes: {
    sub: number;
    dub: number;
    raw: number;
  };
  thumbnail?: string;
  __typename: string;
}

// Featured anime (manually curated)
const FEATURED = {
  _id: "PEQjWP25keRPXEt4f",
  name: "Re:Zero − Starting Life in Another World Season 3",
  description: "When Subaru Natsuki leaves the convenience store, the last thing he expects is to be wrenched from his everyday life and dropped into a fantasy world.",
  episodes: { sub: 8, dub: 0 },
  image: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx163134-yieRFbvUOH9a.jpg",
  rating: "9.1"
};

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [popular, setPopular] = useState<Show[]>([]);
  const [recent, setRecent] = useState<Show[]>([]);
  const [top, setTop] = useState<Show[]>([]);
  const [searchResults, setSearchResults] = useState<Show[]>([]);
  const [loading, setLoading] = useState({ popular: true, recent: true, top: true });
  const [isSearching, setIsSearching] = useState(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Mobile UI Context
  const { isSearchOpen, isMenuOpen, setSearchOpen, setMenuOpen, theme, toggleTheme } = useMobileUI();

  // Fetch popular anime
  const fetchPopular = async () => {
    try {
      const res = await axios.get("/api/anime/popular");
      setPopular(res.data.shows || []);
    } catch (error) {
      console.error("Failed to fetch popular anime", error);
    } finally {
      setLoading(prev => ({ ...prev, popular: false }));
    }
  };

  // Fetch recent anime
  const fetchRecent = async () => {
    try {
      const res = await axios.get("/api/anime/recent");
      setRecent(res.data.shows || []);
    } catch (error) {
      console.error("Failed to fetch recent anime", error);
    } finally {
      setLoading(prev => ({ ...prev, recent: false }));
    }
  };

  // Fetch top anime
  const fetchTop = async () => {
    try {
      const res = await axios.get("/api/anime/top");
      setTop(res.data.shows || []);
    } catch (error) {
      console.error("Failed to fetch top anime", error);
    } finally {
      setLoading(prev => ({ ...prev, top: false }));
    }
  };

  // Fetch data on mount and set up auto-refresh
  useEffect(() => {
    fetchPopular();
    fetchRecent();
    fetchTop();

    // Auto-refresh every 1 minute (60000ms) for real-time updates
    refreshIntervalRef.current = setInterval(() => {
      console.log('[ToonPlayer] Auto-refreshing anime data...');
      fetchPopular();
      fetchRecent();
      fetchTop();
    }, 60000); // 1 minute

    // Cleanup interval on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await axios.get(`/api/anime/search?query=${encodeURIComponent(searchQuery)}`);
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
  };

  return (
    <main className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] selection:bg-purple-500/30 overflow-x-hidden font-sans transition-colors duration-300">
      {/* No JavaScript Fallback */}
      <noscript>
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="max-w-md bg-zinc-900 border border-purple-500/30 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Play className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-3">JavaScript Required</h2>
            <p className="text-zinc-400 mb-6">
              ToonPlayer requires JavaScript to provide the best streaming experience. Please enable JavaScript in your browser settings to continue.
            </p>
            <div className="text-sm text-zinc-500">
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

      {/* About/Menu Modal (Triggered by MobileNav Context) */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            key="about-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full md:max-w-md bg-[var(--bg-card)] border-t md:border border-[var(--border-color)] rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            >
              {/* Handle Bar for Mobile Swipe Feel */}
              <div className="w-full flex justify-center pt-3 pb-1 md:hidden">
                <div className="w-12 h-1.5 bg-[var(--text-muted)]/30 rounded-full"></div>
              </div>

              <div className="p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-[var(--text-main)]">Menu</h2>
                  <button
                    onClick={() => setMenuOpen(false)}
                    className="p-2 bg-[var(--bg-main)] hover:bg-[var(--border-color)] rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-[var(--text-main)]" />
                  </button>
                </div>

                {/* Settings Section */}
                <div className="space-y-4 mb-8">
                  <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Settings</h3>

                  {/* Theme Toggle */}
                  <div className="flex items-center justify-between p-4 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-purple-500/20 text-purple-400' : 'bg-yellow-500/20 text-yellow-600'}`}>
                        {theme === 'dark' ? <div className="w-5 h-5">🌙</div> : <div className="w-5 h-5">☀️</div>}
                      </div>
                      <div>
                        <p className="font-bold text-[var(--text-main)]">App Theme</p>
                        <p className="text-xs text-[var(--text-muted)]">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
                      </div>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${theme === 'dark' ? 'bg-purple-600' : 'bg-zinc-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${theme === 'dark' ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>
                </div>

                {/* Profile Section */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Developer</h3>
                  <div className="p-4 bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-xl border border-purple-500/20">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">AK</div>
                      <div>
                        <h4 className="font-bold text-[var(--text-main)]">Aman Kumar</h4>
                        <p className="text-xs text-[var(--text-muted)]">Full Stack Developer</p>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
                      Built with Next.js 15, React 19, and Tailwind CSS. Focused on high-performance mobile web experiences.
                    </p>
                    <div className="flex gap-2">
                      <a href="https://github.com/iamTechieAman" target="_blank" className="flex-1 py-2 text-center bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-main)] hover:bg-[var(--border-color)] transition-colors">
                        GitHub
                      </a>
                      <a href="https://linkedin.com" target="_blank" className="flex-1 py-2 text-center bg-[#0077b5] text-white rounded-lg text-xs font-bold hover:bg-[#006097] transition-colors">
                        LinkedIn
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Mobile Search Overlay (Triggered by MobileNav Context) */}
        {isSearchOpen && (
          <motion.div
            key="search-overlay"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-0 z-[55] bg-[#050505] pt-safe px-4"
          >
            <div className="flex items-center gap-4 py-4 border-b border-white/10">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                  placeholder="Search..."
                  className="w-full bg-zinc-900 rounded-lg py-2 pl-9 pr-4 text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <button
                onClick={() => setSearchOpen(false)}
                className="text-zinc-400 font-medium"
              >
                Cancel
              </button>
            </div>

            <div className="py-4 overflow-y-auto h-[calc(100vh-80px)]">
              {isSearching ? (
                <div className="flex justify-center pt-10"><div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div></div>
              ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 pb-20">
                  {/* Reuse AnimeCard structure simplified for search results */}
                  {searchResults.map(show => (
                    <Link href={`/watch/${show._id}`} key={show._id} onClick={() => setSearchOpen(false)}>
                      <div className="bg-zinc-900 rounded-lg overflow-hidden border border-white/5">
                        <img src={show.thumbnail} alt={show.name} className="w-full aspect-[2/3] object-cover" />
                        <div className="p-2">
                          <h3 className="text-xs font-bold line-clamp-1">{show.name}</h3>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center text-zinc-600 mt-20">
                  <Search className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>Search for your favorite anime...</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Ambience - Hidden on mobile for performance */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[#050505] hidden md:block">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[150px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/10 blur-[150px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 md:px-6 py-3 md:py-4 bg-black/50 backdrop-blur-md md:backdrop-blur-xl border-b border-white/5 pt-[max(2.5rem,env(safe-area-inset-top))] md:pt-4 transition-all duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 cursor-pointer" onClick={clearSearch}>
            <div className="w-8 h-8 md:w-10 md:h-10 relative">
              <img src="/logo.png" alt="ToonPlayer Logo" className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
            </div>
            <span className="text-lg md:text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">ToonPlayer</span>
          </Link>

          {/* Search in Navbar - Hide on mobile since we have bottom nav search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md hidden md:block">
            <div className="relative flex items-center bg-[#0a0a0a] border border-white/10 rounded-full px-3 py-1.5 md:py-2 focus-within:border-purple-500/50">
              <Search className="w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search anime..."
                className="w-full bg-transparent border-none focus:outline-none px-2 md:px-3 text-sm text-white placeholder-zinc-600"
              />
              {searchQuery && (
                <button type="button" onClick={clearSearch} className="p-1 hover:bg-white/10 rounded-full">
                  <X className="w-3 h-3 text-zinc-500" />
                </button>
              )}
            </div>
          </form>

          <div className="md:hidden flex-1 flex justify-end"></div>

          <div className="flex gap-3 md:gap-6 text-xs md:text-sm font-medium text-zinc-400">
            <button className="hover:text-white transition-colors hidden sm:block" onClick={clearSearch}>Home</button>
            <button className="hover:text-purple-400 transition-colors text-white" onClick={() => setMenuOpen(true)}>About</button>
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

        {/* Featured Section */}
        {searchResults.length === 0 && (
          <>
            <div className="relative h-[400px] md:h-[500px] overflow-hidden">
              {/* Background */}
              <div className="absolute inset-0">
                <img
                  src={FEATURED.image}
                  alt={FEATURED.name}
                  className="w-full h-full object-cover blur-2xl scale-110 opacity-30"
                  fetchPriority="high"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent"></div>
              </div>

              {/* Content */}
              <div className="relative max-w-7xl mx-auto px-4 md:px-6 h-full flex items-center">
                <div className="grid md:grid-cols-2 gap-8 items-center w-full">
                  {/* Left: Details */}
                  <div className="space-y-4 md:space-y-6">
                    <div className="inline-block px-3 py-1 bg-green-600 text-white text-xs font-bold rounded">
                      SPOTLIGHT
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black leading-tight">{FEATURED.name}</h1>
                    <p className="text-zinc-400 text-sm md:text-base line-clamp-3">{FEATURED.description}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="font-bold">{FEATURED.rating}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-bold rounded">SUB {FEATURED.episodes.sub}</span>
                      {FEATURED.episodes.dub > 0 && (
                        <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded">DUB {FEATURED.episodes.dub}</span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <Link href={`/watch/${FEATURED._id}`}>
                        <button className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-zinc-200 text-black font-bold rounded-lg transition-all">
                          <Play className="w-4 h-4 fill-current" /> Watch Now
                        </button>
                      </Link>
                    </div>
                  </div>

                  {/* Right: Poster */}
                  <div className="hidden md:flex justify-end">
                    <Link href={`/watch/${FEATURED._id}`}>
                      <div className="relative group cursor-pointer">
                        <img
                          src={FEATURED.image}
                          alt={FEATURED.name}
                          className="w-64 h-96 object-cover rounded-2xl shadow-2xl border border-white/10 group-hover:scale-105 transition-transform duration-300"
                          fetchPriority="high"
                          loading="eager"
                        />
                        <div className="absolute inset-0 bg-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-12">

              {/* Popular Today */}
              <section>
                <SectionHeader icon={TrendingUp} title="Popular Today" />
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

// Anime Grid Component
function AnimeGrid({ shows }: { shows: Show[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
      {shows.map((show) => (
        <AnimeCard key={show._id} show={show} />
      ))}
    </div>
  );
}

// Anime Card Component
function AnimeCard({ show }: { show: Show }) {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <Link href={`/watch/${show._id}`}>
      <motion.div
        whileHover={{ y: -8, scale: 1.02 }}
        className="group relative aspect-[3/4.5] rounded-xl overflow-hidden cursor-pointer bg-zinc-900 border border-white/5 hover:border-purple-500/50 transition-colors shadow-xl"
      >
        {/* Image */}
        {show.thumbnail && !imageError ? (
          <img
            src={show.thumbnail}
            alt={show.name}
            onError={handleImageError}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 brightness-[0.7] group-hover:brightness-100"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-zinc-900 to-cyan-900/30 flex flex-col items-center justify-center p-4">
            <Play className="w-16 h-16 text-purple-500/40 mb-3" />
            <p className="text-white text-xs font-bold text-center line-clamp-3 opacity-60">{show.name}</p>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          {show.availableEpisodes?.sub > 0 && (
            <span className="px-2 py-0.5 bg-green-600 text-white text-[10px] font-bold rounded shadow-lg">
              SUB
            </span>
          )}
          {show.availableEpisodes?.dub > 0 && (
            <span className="px-2 py-0.5 bg-purple-600 text-white text-[10px] font-bold rounded shadow-lg">
              DUB
            </span>
          )}
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] transform scale-0 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-5 h-5 text-black fill-black ml-0.5" />
          </div>
        </div>

        {/* Info */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 text-left z-10">
          <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-zinc-300">
            <span className="px-1.5 py-0.5 rounded bg-white/10">
              {show.availableEpisodes?.sub || show.availableEpisodes?.dub} EPS
            </span>
          </div>
          <h3 className="font-bold text-white text-sm line-clamp-2 group-hover:text-purple-400 transition-colors">
            {show.name}
          </h3>
        </div>
      </motion.div>
    </Link>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="aspect-[3/4.5] rounded-xl bg-zinc-900 animate-pulse border border-white/5"></div>
      ))}
    </div>
  );
}
