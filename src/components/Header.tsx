"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, X, SlidersHorizontal, Bell, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";

const GENRES = ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mecha", "Mystery", "Psychological", "Romance", "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller"];
const FORMATS = ["TV", "Movie", "OVA", "ONA", "Special"];
const STATUSES = ["Ongoing", "Completed", "Upcoming"];

const SEARCH_QUERY = `
query($search: String) {
  Page(page: 1, perPage: 5) {
    media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
      id
      title { romaji english native }
      coverImage { medium }
      format
      seasonYear
    }
  }
}
`;

export default function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasNewNotif] = useState(true);
  const [profile, setProfile] = useState<{name: string, avatar: string} | null>(null);

  const [filterGenre, setFilterGenre] = useState("");
  const [filterFormat, setFilterFormat] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const filterRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = searchParams?.get("query") || "";
    setSearchQuery(q);
  }, [searchParams]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilter(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', handler);

    const updateProfile = () => {
      const p = localStorage.getItem("toonplayer_profile");
      if (p) {
        try { setProfile(JSON.parse(p)); } catch(e) {}
      }
    };
    updateProfile();
    window.addEventListener('profileUpdated', updateProfile);

    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('profileUpdated', updateProfile);
    };
  }, []);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const response = await axios.post('https://graphql.anilist.co', {
          query: SEARCH_QUERY,
          variables: { search: searchQuery }
        });
        setSuggestions(response.data.data.Page.media || []);
      } catch (error) {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent | null, queryOverride?: string) => {
    if (e) e.preventDefault();
    const q = queryOverride || searchQuery;
    
    const params = new URLSearchParams();
    if (q.trim()) params.set("query", q);
    if (filterGenre) params.set("genre", filterGenre);
    if (filterFormat) params.set("format", filterFormat.toLowerCase());
    if (filterStatus) params.set("status", filterStatus.toLowerCase());
    
    // Allow navigation if we have either a query or any filter set
    if (!q.trim() && !filterGenre && !filterFormat && !filterStatus) return;
    
    setShowSuggestions(false);
    router.push(`/search?${params.toString()}`);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const applyFilter = () => {
    // If we have a search query, combine with filters
    // If not, navigate with filters alone
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("query", searchQuery);
    if (filterGenre) params.set("genre", filterGenre);
    if (filterFormat) params.set("format", filterFormat.toLowerCase());
    if (filterStatus) params.set("status", filterStatus.toLowerCase());
    
    if (params.toString()) {
      router.push(`/search?${params.toString()}`);
    }
    setShowFilter(false);
  };

  const clearFilters = () => {
    setFilterGenre('');
    setFilterFormat('');
    setFilterStatus('');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 md:px-6 py-3 md:py-4 bg-[var(--bg-overlay)] backdrop-blur-md md:backdrop-blur-xl border-b border-[var(--border-color)] pt-[max(2.5rem,env(safe-area-inset-top))] md:pt-4 transition-all duration-300 md:pl-[72px]">
      <div className="w-full mx-auto flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 cursor-pointer shrink-0" onClick={clearSearch}>
          <div className="w-8 h-8 md:w-10 md:h-10 relative">
            <img src="/logo.png" alt="ToonPlayer Logo" className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
          </div>
          <span className="text-xl md:text-2xl font-black tracking-tighter text-white font-sora block drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">
            ToonPlayer
          </span>
        </Link>

        {/* Search Bar + Filter */}
        <div className="flex-1 max-w-xl hidden md:flex items-center gap-2 relative">
          <form onSubmit={(e) => handleSearch(e)} className="relative flex-1 flex items-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 hover:bg-[var(--bg-card)]/80 focus-within:border-purple-500/50 focus-within:ring-2 focus-within:ring-purple-500/10 transition-all">
            <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
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
              className={`h-full px-4 py-2.5 bg-[var(--bg-card)] border rounded-xl flex items-center gap-2 text-sm font-bold transition-all ${
                showFilter || filterGenre || filterFormat || filterStatus
                  ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                  : 'border-[var(--border-color)] text-[var(--text-muted)] hover:text-white hover:border-white/20'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden lg:block">Filter</span>
              {(filterGenre || filterFormat || filterStatus) && (
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              )}
            </button>

            <AnimatePresence>
              {showFilter && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute top-full right-0 mt-3 w-80 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl"
                >
                  <div className="p-4 border-b border-[var(--border-color)] bg-white/5 flex items-center justify-between">
                    <span className="font-bold text-sm">Fine-tune Search</span>
                    <button onClick={clearFilters} className="text-xs text-purple-400 hover:text-purple-300 font-medium">Reset</button>
                  </div>
                  <div className="p-4 space-y-5">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-black text-[var(--text-muted)] mb-2 block">Genre</label>
                      <select 
                        value={filterGenre}
                        onChange={(e) => setFilterGenre(e.target.value)}
                        className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500/50"
                      >
                        <option value="">All Genres</option>
                        {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-black text-[var(--text-muted)] mb-2 block">Format</label>
                      <div className="grid grid-cols-2 gap-2">
                        {FORMATS.map(f => (
                          <button
                            key={f}
                            onClick={() => setFilterFormat(filterFormat === f ? "" : f)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filterFormat === f ? 'bg-purple-500 border-purple-400 text-white' : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-white/20'}`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-white/5 border-t border-[var(--border-color)]">
                    <button onClick={applyFilter} className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-purple-500/20">
                      Apply Filters
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Suggestions Dropdown */}
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 right-14 mt-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl"
              >
                {suggestions.map((item: any) => (
                  <Link
                    key={item.id}
                    href={`/watch/${item.id}`}
                    className="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors group"
                    onClick={() => setShowSuggestions(false)}
                  >
                    <div className="w-10 h-14 relative shrink-0 overflow-hidden rounded-md">
                      <img src={item.coverImage.medium} alt={item.title.english || item.title.romaji} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{item.title.english || item.title.romaji}</h4>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">{item.format} • {item.seasonYear}</p>
                    </div>
                  </Link>
                ))}
                <button 
                  onClick={() => handleSearch(null)}
                  className="w-full p-3 text-center text-xs font-bold text-purple-400 border-t border-[var(--border-color)] hover:bg-purple-500/5 transition-colors"
                >
                  View all results
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right side icons */}
        <div className="flex items-center gap-2 md:gap-4">
          <div ref={notifRef} className="relative">
            <button 
              onClick={() => setShowNotifications(v => !v)}
              className="p-2.5 hover:bg-[var(--bg-card)] rounded-xl relative transition-all text-[var(--text-muted)] hover:text-white"
            >
              <Bell className="w-5 h-5" />
              {hasNewNotif && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[var(--bg-main)] animate-pulse" />}
            </button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute top-full right-0 mt-3 w-80 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
                >
                   <div className="p-4 border-b border-[var(--border-color)] bg-white/5 flex items-center justify-between">
                      <span className="font-bold text-sm">Notifications</span>
                      <button className="text-[10px] uppercase tracking-widest text-purple-400 font-black">Mark all read</button>
                   </div>
                   <div className="p-6 text-center">
                      <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Bell className="w-6 h-6 text-[var(--text-muted)]" />
                      </div>
                      <p className="text-sm font-medium text-white mb-1">No new alerts</p>
                      <p className="text-xs text-[var(--text-muted)]">Check back later for anime updates and season starts.</p>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-3">
            {profile && (
              <span className="hidden md:inline-block text-sm font-bold text-[var(--text-muted)]">
                Hi, {profile.name}
              </span>
            )}
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 p-[2px] transition-transform hover:scale-105 cursor-pointer">
              <div className="w-full h-full bg-[var(--bg-main)] rounded-full flex items-center justify-center overflow-hidden">
                 <img src={profile?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"} alt="User Avatar" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
