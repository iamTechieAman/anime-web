"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Play, Star, Clock, TrendingUp, X, Github, Mail, Linkedin, Globe, Filter, Trophy } from "lucide-react";
import axios from "axios";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

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
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
    <main className="min-h-screen bg-[#050505] text-white selection:bg-purple-500/30 overflow-x-hidden font-sans">

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

      {/* About Modal */}
      <AnimatePresence>
        {isAboutOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setIsAboutOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setIsAboutOpen(false)}
                className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="h-32 md:h-40 bg-gradient-to-r from-purple-900 via-blue-900 to-black relative">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30"></div>
                <div className="absolute -bottom-10 md:-bottom-12 left-4 md:left-8">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-zinc-800 border-4 border-[#0a0a0a] flex items-center justify-center text-2xl md:text-3xl font-bold text-white shadow-xl">
                    AK
                  </div>
                </div>
              </div>

              <div className="pt-14 md:pt-16 pb-6 md:pb-8 px-4 md:px-8">
                <h2 className="text-2xl md:text-3xl font-bold text-white">Aman Kumar</h2>
                <p className="text-purple-400 font-medium text-xs md:text-sm mt-1">Web Developer | Cloud & Security Enthusiast</p>

                <div className="mt-4 md:mt-6 space-y-3 md:space-y-4 text-zinc-400 text-xs md:text-sm leading-relaxed">
                  <p>
                    I am a results-driven web developer with a proven track record of delivering responsive, high-performance digital solutions. With expertise in WordPress, React, and Java, I combine technical excellence with a security-first mindset (Secure by Design) to build scalable applications.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-3 md:mt-4">
                    <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                      <h3 className="font-bold text-white mb-2 flex items-center gap-2 text-xs md:text-sm"><Globe className="w-3 h-3 md:w-4 md:h-4 text-cyan-400" /> Core Skills</h3>
                      <p className="text-[10px] md:text-xs">Web Dev, WordPress, Java, HTML/CSS, React, API Integration</p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                      <h3 className="font-bold text-white mb-2 flex items-center gap-2 text-xs md:text-sm"><TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-pink-400" /> Growth Focus</h3>
                      <p className="text-[10px] md:text-xs">AWS Cloud, DevOps CI/CD, Cybersecurity & Ethical Hacking</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 md:mt-8 flex flex-wrap gap-2 md:gap-4 pt-4 border-t border-white/5">
                  <a href="mailto:Er.amankumar@hotmail.com" className="flex items-center gap-2 px-3 md:px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs md:text-sm font-bold transition-colors">
                    <Mail className="w-3 h-3 md:w-4 md:h-4" /> Contact
                  </a>
                  <a href="https://github.com/iamTechieAman" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs md:text-sm font-medium transition-colors">
                    <Github className="w-3 h-3 md:w-4 md:h-4" /> GitHub
                  </a>
                  <a href="https://www.linkedin.com/in/aman-kumar-a8792a206/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 md:px-4 py-2 bg-[#0077b5] hover:bg-[#006097] text-white rounded-lg text-xs md:text-sm font-medium transition-colors">
                    <Linkedin className="w-3 h-3 md:w-4 md:h-4" /> LinkedIn
                  </a>
                </div>
              </div>
            </motion.div>
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
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 md:px-6 py-3 md:py-4 bg-black/50 backdrop-blur-md md:backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 cursor-pointer" onClick={clearSearch}>
            <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-tr from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center transform rotate-3 hover:rotate-6 transition-transform shadow-[0_0_15px_rgba(168,85,247,0.5)]">
              <Play className="w-3 h-3 md:w-4 md:h-4 text-white fill-white" />
            </div>
            <span className="text-lg md:text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">ToonPlayer</span>
          </Link>

          {/* Search in Navbar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
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

          <div className="flex gap-3 md:gap-6 text-xs md:text-sm font-medium text-zinc-400">
            <button className="hover:text-white transition-colors hidden sm:block" onClick={clearSearch}>Home</button>
            <button className="hover:text-purple-400 transition-colors text-white" onClick={() => setIsAboutOpen(true)}>About</button>
          </div>
        </div>
      </nav>

      <div className="pt-16 md:pt-20 relative z-10">

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
