"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, X, SlidersHorizontal, Bell, Play, ChevronDown, User, History as HistoryIcon, LogOut, Bookmark, Clock, TrendingUp, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import axios from "axios";
import { useMobileUI } from "@/context/MobileUIContext";
import { useNotifications } from "@/context/NotificationContext";
import { useAdBlock } from "@/context/AdBlockContext";
import { formatDistanceToNow } from 'date-fns';

import Fuse from "fuse.js";

const GENRES = ["Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary", "Drama", "Family", "Fantasy", "History", "Horror", "Music", "Mystery", "Romance", "Science Fiction", "Thriller", "War", "Western"];
const FORMATS = ["TV", "Movie", "OVA", "ONA", "Special"];
const STATUSES = ["Ongoing", "Completed", "Upcoming"];

const UNIFIED_SEARCH_URL = '/api/search/unified';

export default function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
  const [profile, setProfile] = useState<{name: string, avatar: string} | null>(null);

  const [filterGenre, setFilterGenre] = useState("");
  const [filterFormat, setFilterFormat] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const { setShowProfileSettings } = useMobileUI();
  const { isAdBlockEnabled, toggleAdBlock } = useAdBlock();
  const [isMounted, setIsMounted] = useState(false);
  const [globalCatalog, setGlobalCatalog] = useState<any[]>([]);
  const fuseRef = useRef<Fuse<any> | null>(null);

  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem("toonplayer_recent_searches");
    if (saved) try { setRecentSearches(JSON.parse(saved)); } catch(e) {}
    
    // Preload trending catalog from server-side API (no API key exposure)
    const preloadCatalog = async () => {
      try {
        const res = await axios.get('/api/search/catalog');
        const catalog = res.data.results || [];

        setGlobalCatalog(catalog);
        fuseRef.current = new Fuse(catalog, {
            keys: ["title", "_searchTitle", "type"],
            threshold: 0.45,
            ignoreLocation: true,
            distance: 100,
            minMatchCharLength: 2,
            shouldSort: true
        });
      } catch (e) {
        console.warn('[Header] Catalog preload failed:', e);
      }
    };
    preloadCatalog();
  }, []);

  const searchPlaceholder = "Search movies, anime & shows...";

  const filterRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = searchParams?.get("query") || "";
    setSearchQuery(q);
  }, [searchParams]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilters(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfileDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);

    const updateProfile = () => {
      const p = localStorage.getItem("toonplayer_profile");
      if (p) {
        try { setProfile(JSON.parse(p)); } catch(e) {}
      }
    };
    updateProfile();
    window.addEventListener('profileUpdated', updateProfile);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('profileUpdated', updateProfile);
    };
  }, []);

  useEffect(() => {
    const cleanQuery = searchQuery.trim().replace(/\s+/g, ' '); // Normalize spaces
    
    if (!cleanQuery) {
      setSuggestions([]);
      return;
    }

    // 1. Instant local Fuzzy Search
    if (fuseRef.current) {
        const localMatches = fuseRef.current.search(cleanQuery).map(r => r.item);
        if (localMatches.length > 0) {
            setSuggestions(localMatches.slice(0, 10));
        }
    }

    // 2. 300ms Debounced Network Deep Search
    const timer = setTimeout(async () => {
      if (cleanQuery.length < 2) return;
      try {
        const response = await axios.get(UNIFIED_SEARCH_URL, {
          params: { q: cleanQuery }
        });
        const networkItems = response.data.results || [];
        
        if (networkItems.length > 0) {
            // Apply Fuzzy Search against network items
            const networkFuse = new Fuse(networkItems, { 
                keys: ["title"], 
                threshold: 0.45,
                distance: 100
            });
            const rankedNetwork = networkFuse.search(cleanQuery).map(r => r.item);
            const finalNetwork = rankedNetwork.length > 0 ? rankedNetwork : networkItems;
            
            setSuggestions((prev) => {
                const combined = [...prev, ...finalNetwork];
                // Deep deduplication by normalized title and ID
                const seenKeys = new Set();
                const unique = combined.filter((item) => {
                    const key = `${item.id}-${(item.title || "").toLowerCase().trim()}`;
                    if (seenKeys.has(key)) return false;
                    seenKeys.add(key);
                    return true;
                });
                return unique.slice(0, 10);
            });
        }
      } catch (error) {
      }
    }, 300); // Strict 300ms debounce
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const saveRecentSearch = (query: string) => {
    if (!query.trim()) return;
    const newRecent = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem("toonplayer_recent_searches", JSON.stringify(newRecent));
  };

  const handleSearch = (e: React.FormEvent | null, queryOverride?: string) => {
    if (e) e.preventDefault();
    const q = queryOverride || searchQuery;
    
    if (q.trim()) saveRecentSearch(q);

    const params = new URLSearchParams();
    if (q.trim()) params.set("query", q);
    if (filterGenre) params.set("genre", filterGenre);
    if (filterFormat) params.set("format", filterFormat.toLowerCase());
    if (filterStatus) params.set("status", filterStatus.toLowerCase());
    
    // Allow navigation if we have either a query or any filter set
    if (!q.trim() && !filterGenre && !filterFormat && !filterStatus) return;
    
    setShowSuggestions(false);
    setShowFilters(false); 
    router.push(`/search?${params.toString()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(prev => (prev > -1 ? prev - 1 : prev));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0) {
        e.preventDefault();
        const item = suggestions[activeIndex];
        router.push(item.href);
        setShowSuggestions(false);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const HighlightText = ({ text, highlight }: { text: string, highlight: string }) => {
    if (!highlight.trim()) return <span>{text}</span>;
    // Escape special characters so they don't break the regex
    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedHighlight})`, "gi"));
    return (
      <span className="truncate">
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase().trim() 
            ? <b key={i} className="text-blue-400 font-black">{part}</b> 
            : <span key={i} className="text-white/70">{part}</span>
        )}
      </span>
    );
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
    setShowFilters(false);
  };

  const clearFilters = () => {
    setFilterGenre('');
    setFilterFormat('');
    setFilterStatus('');
  };

  if (pathname?.startsWith('/watch')) return null;

  return (
    <>
    <nav className="fixed top-0 left-0 md:left-[72px] right-0 z-50 px-4 md:px-6 py-3 md:py-4 bg-[var(--bg-overlay)] backdrop-blur-sm border-b border-[var(--border-color)] pt-[max(2.5rem,env(safe-area-inset-top))] md:pt-4 transition-all duration-300">
      <div className="w-full mx-auto flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 cursor-pointer shrink-0 active:scale-95 transition-transform group" onClick={clearSearch}>
          <div className="w-10 h-10 md:w-12 md:h-12 relative flex items-center justify-center">
            {/* Original Logo with Premium Glow */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity"
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            
            <img 
              src="/logo.webp" 
              alt="ToonPlayer Logo" 
              className="w-full h-full relative z-10 object-contain drop-shadow-[0_0_8px_rgba(168,85,247,0.5)] group-hover:scale-105 transition-transform duration-300 mix-blend-screen"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xl md:text-2xl font-black tracking-tighter text-white font-sora block drop-shadow-[0_0_10px_rgba(168,85,247,0.4)] leading-tight uppercase">
              Toon<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Player</span>
            </span>
            <div className="flex items-center gap-1.5 -mt-0.5 ml-0.5">
              <span className="text-[9px] uppercase tracking-[0.3em] font-black text-white/40">Premium</span>
              <div className="w-1 h-1 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-[8px] font-bold text-purple-400/80 uppercase">Infinity</span>
            </div>
          </div>
        </Link>

        {/* Search Bar + Filter */}
        <div className="flex-1 max-w-xl hidden md:flex items-center gap-2 relative">
          <div className="flex-1 relative">
            <form 
              onSubmit={(e) => handleSearch(e)} 
              className="relative flex items-center bg-[var(--bg-card)]/50 backdrop-blur-sm border border-[var(--border-color)] rounded-2xl px-4 py-3 group hover:border-white/20 focus-within:border-purple-500/50 focus-within:ring-4 focus-within:ring-purple-500/5 transition-all duration-300"
            >
              <Search className="w-[18px] h-[18px] text-[var(--text-muted)] group-focus-within:text-purple-400 shrink-0 transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActiveIndex(-1);
                  if (e.target.value.length >= 2) setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                placeholder="Find movies, shows & more..."
                className="w-full bg-transparent border-none focus:outline-none px-3 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] font-bold tracking-tight"
                autoComplete="off"
              />
              {searchQuery && (
                <button aria-label="Clear search" type="button" onClick={clearSearch} className="p-1.5 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-4 h-4 text-[var(--text-muted)]" />
                </button>
              )}
            </form>

            {/* Suggestions Dropdown */}
            <AnimatePresence>
              {showSuggestions && (
                <motion.div
                  ref={dropdownRef}
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  className="absolute top-full left-0 right-0 mt-3 bg-zinc-950/95 border border-white/10 rounded-[28px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden z-50 backdrop-blur-2xl"
                >
                  {searchQuery.length < 2 ? (
                    <div className="divide-y divide-white/[0.04]">
                      {recentSearches.length > 0 && (
                        <div className="p-5">
                          <p className="text-[10px] uppercase tracking-[0.2em] font-black text-white/40 mb-3 flex items-center gap-2">
                            <Clock className="w-3 h-3" /> Recent Searches
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {recentSearches.map((s, i) => (
                              <button
                                key={i}
                                onClick={() => { setSearchQuery(s); handleSearch(null, s); }}
                                className="px-3.5 py-1.5 bg-white/[0.03] hover:bg-white/10 border border-white/[0.05] rounded-full text-xs font-bold transition-all hover:-translate-y-0.5 active:translate-y-0 text-white/70 hover:text-white"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Trending Section when empty */}
                      <div className="p-5">
                        <p className="text-[10px] uppercase tracking-[0.2em] font-black text-purple-400 mb-4 flex items-center gap-2">
                          <TrendingUp className="w-3 h-3" /> Trending Hits
                        </p>
                        <div className="space-y-1">
                          {globalCatalog.slice(0, 5).map((item, i) => (
                            <Link
                              key={i}
                              href={item.id ? `/watch/${item.type}/${item.id}` : '#'}
                              className="flex items-center gap-4 p-2.5 hover:bg-white/5 rounded-2xl transition-all group hover:pl-4"
                              onClick={() => setShowSuggestions(false)}
                            >
                              <span className="text-xs font-black text-white/20 w-4 italic group-hover:text-purple-500 transition-colors">0{i + 1}</span>
                              <div className="w-10 h-12 relative shrink-0 overflow-hidden rounded-lg bg-zinc-900 border border-white/5">
                                {item.image && <img src={item.image} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />}
                              </div>
                              <span className="text-sm font-bold text-white/80 group-hover:text-white transition-colors truncate">{item.title}</span>
                              <Sparkles className="w-3.5 h-3.5 text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : suggestions.length > 0 ? (
                    <div className="p-2 space-y-1">
                      {suggestions.map((item: any, i: number) => (
                        <Link
                          key={`${item.type}-${item.id}`}
                          href={item.href || `/watch/${item.type}/${item.id}`}
                          className={`flex items-center gap-4 p-3 rounded-2xl transition-all group ${activeIndex === i ? 'bg-white/10 ring-1 ring-white/10 shadow-lg' : 'hover:bg-white/5'}`}
                          onMouseEnter={() => setActiveIndex(i)}
                          onClick={() => { setShowSuggestions(false); saveRecentSearch(item.title); }}
                        >
                          <div className="w-12 h-16 relative shrink-0 overflow-hidden rounded-xl bg-zinc-900 border border-white/5 shadow-inner">
                            {item.image ? (
                              <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Play className="w-5 h-5 text-zinc-700" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-black text-white truncate group-hover:text-purple-400 transition-colors">
                                <HighlightText text={item.title} highlight={searchQuery} />
                              </h4>
                              <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${
                                item.type === 'anime' ? 'bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                              }`}>
                                {item.type}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{item.format}</p>
                                <span className="w-1 h-1 rounded-full bg-white/10" />
                                <p className="text-[10px] font-bold text-white/40">{item.year}</p>
                            </div>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0 -translate-x-2">
                            <ChevronDown className="w-5 h-5 text-purple-500 -rotate-90" />
                          </div>
                        </Link>
                      ))}
                      <button 
                        onClick={() => handleSearch(null)}
                        className="w-full mt-2 p-4 text-center text-xs font-black uppercase tracking-[0.2em] text-purple-400 hover:text-white hover:bg-purple-600 rounded-2xl transition-all duration-300"
                      >
                        All results for "{searchQuery}"
                      </button>
                    </div>
                  ) : (
                    <div className="p-12 text-center">
                      <div className="w-16 h-16 bg-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-4 border border-white/[0.05]">
                        <Search className="w-6 h-6 text-white/20" />
                      </div>
                      <p className="text-sm font-black text-white mb-1 uppercase tracking-widest">No Matches Found</p>
                      <p className="text-xs text-white/40 font-medium">Try different keywords or browse genres</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Filter Button */}
          <div ref={filterRef} className="relative shrink-0">
            <button
              aria-label="Filter Options"
              onClick={() => { setShowFilters(v => !v); setShowNotifications(false); setShowProfileDropdown(false); }}
              className={`h-[44px] px-4 bg-[var(--bg-card)] border rounded-xl flex items-center gap-2 text-sm font-bold transition-all ${
                showFilters || filterGenre || filterFormat || filterStatus
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
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute top-full right-0 mt-3 w-80 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden z-50 backdrop-blur-md"
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
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-black text-[var(--text-muted)] mb-2 block">Status</label>
                      <div className="grid grid-cols-2 gap-2">
                        {STATUSES.map(s => (
                          <button
                            key={s}
                            onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filterStatus === s ? 'bg-purple-500 border-purple-400 text-white' : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-white/20'}`}
                          >
                            {s}
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
        </div>

        {/* Right side icons */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <div className="flex items-center gap-1.5 md:gap-3">
             {/* AdBlock Toggle Button */}
             {isMounted && (
              <button
                onClick={toggleAdBlock}
                className={`flex items-center justify-center p-2 rounded-full transition-all border ${
                  isAdBlockEnabled 
                    ? 'bg-green-500/10 border-green-500/30 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:bg-green-500/20' 
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'
                }`}
                title={isAdBlockEnabled ? "AdBlock is ON: Blocks Redirections & Ads" : "AdBlock is OFF"}
              >
                <div className="relative">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    {isAdBlockEnabled ? (
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4" />
                    ) : (
                      <>
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2.5" />
                      </>
                    )}
                  </svg>
                </div>
              </button>
            )}

            {/* Notifications */}
            <div ref={notifRef} className="relative">
              <button 
                aria-label="Notifications"
                onClick={() => {
                  if (!showNotifications) {
                    setShowNotifications(true);
                    markAllAsRead(); // Mark all as read when opening
                  } else {
                    setShowNotifications(false);
                  }
                  setShowFilters(false);
                  setShowProfileDropdown(false);
                }}
                className={`p-2 rounded-full transition-all border ${
                  showNotifications 
                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' 
                    : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-white hover:border-white/20'
                }`}
              >
                <div className="relative">
                  <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  {isMounted && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[var(--bg-overlay)] animate-pulse" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                     initial={{ opacity: 0, y: 12, scale: 0.95 }}
                     animate={{ opacity: 1, y: 0, scale: 1 }}
                     exit={{ opacity: 0, y: 12, scale: 0.95 }}
                     className="absolute top-full right-0 mt-3 w-80 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-md"
                   >
                      <div className="p-4 border-b border-[var(--border-color)] bg-white/5 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <span className="font-bold text-sm">Notifications</span>
                           {unreadCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-black">{unreadCount}</span>}
                         </div>
                         <button
                           onClick={() => markAllAsRead()}
                           className="text-[10px] uppercase tracking-widest text-purple-400 font-black hover:text-purple-300 transition-colors"
                         >
                           Mark all read
                         </button>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto hide-scrollbar">
                         {notifications.length > 0 ? (
                           <div className="divide-y divide-[var(--border-color)]">
                             {notifications.map((notif: any) => {
                               const CATEGORY_META: Record<string, { label: string; color: string }> = {
                                 episodes: { label: 'New Episode', color: 'text-purple-400 bg-purple-500/10' },
                                 trending: { label: 'Trending', color: 'text-red-400 bg-red-500/10' },
                                 recommendations: { label: 'AI Pick', color: 'text-amber-400 bg-amber-500/10' },
                                 watchlist: { label: 'Watchlist', color: 'text-blue-400 bg-blue-500/10' },
                                 community: { label: 'Community', color: 'text-green-400 bg-green-500/10' },
                                 system: { label: 'System', color: 'text-zinc-400 bg-zinc-500/10' },
                               };
                               const meta = CATEGORY_META[notif.category] || CATEGORY_META['system'];
                               return (
                                 <div
                                   key={notif.id}
                                   className={`p-4 hover:bg-white/5 transition-colors cursor-pointer relative ${!notif.read ? 'bg-purple-500/5' : ''}`}
                                   onClick={() => {
                                     markAsRead(notif.id);
                                     if (notif.link) router.push(notif.link);
                                   }}
                                 >
                                   {!notif.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500 rounded-r" />}
                                   <div className="flex justify-between items-start mb-1 gap-2">
                                     <div className="flex-1 min-w-0">
                                       <div className="flex items-center gap-1.5 mb-0.5">
                                         <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
                                       </div>
                                       <h5 className="text-xs font-bold text-white leading-tight">{notif.title}</h5>
                                     </div>
                                     <span className="text-[9px] text-[var(--text-muted)] whitespace-nowrap shrink-0">
                                       {formatDistanceToNow(notif.timestamp, { addSuffix: true }).replace('about ', '')}
                                     </span>
                                   </div>
                                   <p className="text-[11px] text-[var(--text-muted)] leading-relaxed line-clamp-2">{notif.message}</p>
                                 </div>
                               );
                             })}
                           </div>
                         ) : (
                           <div className="p-10 text-center">
                             <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                               <Bell className="w-6 h-6 text-[var(--text-muted)] opacity-20" />
                             </div>
                             <p className="text-sm font-medium text-white mb-1">Stay Tuned!</p>
                             <p className="text-xs text-[var(--text-muted)]">We'll alert you when your favorite shows get new episodes.</p>
                           </div>
                         )}
                      </div>
                      <div className="border-t border-[var(--border-color)] flex divide-x divide-[var(--border-color)]">
                        <button
                          onClick={() => { setShowNotifications(false); setShowProfileSettings(true); }}
                          className="flex-1 py-2.5 text-[10px] uppercase tracking-widest text-purple-400 font-black hover:bg-purple-500/5 transition-all"
                        >
                          ⚙ Manage Alerts
                        </button>
                        {notifications.length > 0 && (
                          <button
                            onClick={clearNotifications}
                            className="flex-1 py-2.5 text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-black hover:bg-red-500/10 hover:text-red-400 transition-all"
                          >
                            Clear All
                          </button>
                        )}
                      </div>
                   </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div ref={profileRef} className="relative">
            <button 
              aria-label="Profile Menu"
              onClick={() => {
                setShowProfileDropdown(v => !v);
                setShowNotifications(false);
                setShowFilters(false);
              }}
              className="flex items-center gap-3 p-1 pr-3 hover:bg-[var(--bg-card)] rounded-full transition-all border border-transparent hover:border-[var(--border-color)] group"
            >
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-tr from-purple-600 to-blue-600 p-[2px] transition-transform group-hover:scale-105 shadow-lg shadow-purple-500/20">
                <div className="w-full h-full bg-[var(--bg-main)] rounded-full flex items-center justify-center overflow-hidden">
                  <img src={profile?.avatar || "https://api.dicebear.com/9.x/avataaars/svg?seed=Felix"} alt="User Avatar" className="w-full h-full object-cover" />
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-300 ${showProfileDropdown ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showProfileDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute top-full right-0 mt-3 w-64 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-md"
                >
                  <div className="p-4 border-b border-[var(--border-color)] bg-white/5">
                    <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Account</p>
                    <p className="text-sm font-bold text-white truncate">{profile?.name || "Guest Account"}</p>
                  </div>
                  <div className="p-2">
                    <Link href="/history" className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl transition-colors group">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                        <HistoryIcon className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">Watch History</p>
                        <p className="text-[10px] text-[var(--text-muted)]">Continue where you left off</p>
                      </div>
                    </Link>
                    <Link href="/watchlist" className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl transition-colors group">
                      <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center group-hover:bg-pink-500/20 transition-colors">
                        <Bookmark className="w-4 h-4 text-pink-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-bold text-white">Watchlist</p>
                        <p className="text-[10px] text-[var(--text-muted)]">Saved shows & movies</p>
                      </div>
                    </Link>
                    <button 
                      onClick={() => { 
                        setShowProfileSettings(true); 
                        setShowProfileDropdown(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                        <User className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-bold text-white">Profile Settings</p>
                        <p className="text-[10px] text-[var(--text-muted)]">Customize your experience</p>
                      </div>
                    </button>
                    <div className="my-2 border-t border-[var(--border-color)] mx-2" />
                    <button onClick={() => { localStorage.removeItem("toonplayer_profile"); window.location.href = "/"; }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-500/10 rounded-xl transition-colors group text-red-400">
                      <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold">Switch Profile</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </nav>
    </>
  );
}
