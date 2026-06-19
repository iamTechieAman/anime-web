"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, X, SlidersHorizontal, Bell, Play, ChevronDown, User, Bookmark, Clock, TrendingUp, Sparkles, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import axios from "axios";
import { useMobileUI } from "@/context/MobileUIContext";
import { useNotifications } from "@/context/NotificationContext";
import { useAdBlock } from "@/context/AdBlockContext";
import { formatDistanceToNow } from 'date-fns';
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import Logo from "@/components/Logo";

import Fuse from "fuse.js";

const GENRES = ["Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary", "Drama", "Family", "Fantasy", "History", "Horror", "Music", "Mystery", "Romance", "Science Fiction", "Thriller", "War", "Western"];
const FORMATS = ["TV", "Movie", "OVA", "ONA", "Special"];
const STATUSES = ["Ongoing", "Completed", "Upcoming"];

const UNIFIED_SEARCH_URL = '/api/search/unified';

export default function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [deviceMode, setDeviceMode] = useState<"mobile" | "pc" | "tv">("pc");
  const [isTvSearchOpen, setIsTvSearchOpen] = useState(false);

  useEffect(() => {
    const detectDevice = () => {
      if (typeof window !== "undefined") {
        const ua = navigator.userAgent;
        const width = window.innerWidth;
        const isTVUA = /SmartTV|GoogleTV|AppleTV|Roku|CastTV|Tizen|Web0S|NetCast|Opera TV|Viera|Bravia|PlayStation|Xbox/i.test(ua);
        if (isTVUA || width >= 2500) {
          setDeviceMode("tv");
        } else if (width < 768) { // Align with standard md breakpoint
          setDeviceMode("mobile");
        } else {
          setDeviceMode("pc");
        }
      }
    };
    detectDevice();
    window.addEventListener("resize", detectDevice);
    return () => window.removeEventListener("resize", detectDevice);
  }, []);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isDiscoverMode, setIsDiscoverMode] = useState(false);
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
  const { isLoaded: isUserLoaded, isSignedIn } = useUser();
  const [isMounted, setIsMounted] = useState(false);
  const [globalCatalog, setGlobalCatalog] = useState<any[]>([]);
  const fuseRef = useRef<Fuse<any> | null>(null);

  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const placeholders = ["Search Movies...", "Search Anime...", "Search TV Shows...", "Search Genres..."];
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % placeholders.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

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
            keys: [
                { name: 'title', weight: 2 },
                { name: '_searchTitle', weight: 1.5 },
                { name: 'type', weight: 0.5 }
            ],
            threshold: 0.3,
            distance: 50,
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

  // Close search dropdown on route change
  useEffect(() => {
    setShowSuggestions(false);
    setShowFilters(false);
  }, [pathname, searchParams]);

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
                keys: [
                    { name: 'title', weight: 2 },
                    { name: 'format', weight: 1 }
                ], 
                threshold: 0.3,
                distance: 100,
                shouldSort: true
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

    // AI Discover routing
    if (isDiscoverMode && q.trim()) {
      setShowSuggestions(false);
      setShowFilters(false);
      router.push(`/discover?prompt=${encodeURIComponent(q.trim())}`);
      return;
    }

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
            ? <b key={i} className="text-[var(--accent)] font-bold">{part}</b> 
            : <span key={i} className="text-[var(--text-secondary)]">{part}</span>
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

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isWatchPage = pathname?.startsWith('/watch');
  const showSidebar = deviceMode === "pc" && !isWatchPage;

  if (pathname?.startsWith('/watch')) return null;

  return (
    <>
    <nav className={`fixed top-0 right-0 z-50 h-[60px] md:h-[64px] flex items-center px-3 md:px-5 lg:px-6 transition-all duration-500 ease-in-out ${
      showSidebar ? "left-0 md:left-[72px] peer-hover/sidebar:md:left-[240px]" : "left-0"
    } ${isScrolled ? "bg-[var(--bg-main)]/90 backdrop-blur-xl border-b border-white/10 shadow-lg" : "bg-gradient-to-b from-black/80 to-transparent border-b border-transparent"}`}>
      
      {/* Search Focus Overlay */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[-1] cursor-pointer"
            onClick={() => setShowSuggestions(false)}
          />
        )}
      </AnimatePresence>

      {/* === FLEX ROW: Logo | Search (desktop) | Actions === */}
      <div className="w-full max-w-[1800px] mx-auto flex items-center gap-2 md:gap-4 min-w-0">
        <Link
          href="/"
          className={`flex items-center gap-2 cursor-pointer shrink-0 active:scale-95 transition-transform select-none ${showSidebar ? "md:hidden" : ""}`}
          onClick={clearSearch}
          aria-label="ToonPlayer Home"
        >
          {/* Fiery play icon */}
          <img
            src="/icon.png"
            alt=""
            aria-hidden="true"
            className="h-[28px] md:h-[34px] lg:h-[38px] w-auto object-contain filter drop-shadow-[0_0_10px_rgba(249,115,22,0.45)]"
          />
          {/* Brand text — matches mockup typography */}
          <span className="flex flex-col leading-none">
            <span className="text-[13px] md:text-[15px] lg:text-[17px] font-black tracking-tight text-white" style={{ fontFamily: "var(--font-sora, 'Sora', sans-serif)", lineHeight: 1 }}>
              Toon
            </span>
            <span className="text-[13px] md:text-[15px] lg:text-[17px] font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent)] to-orange-400" style={{ fontFamily: "var(--font-sora, 'Sora', sans-serif)", lineHeight: 1 }}>
              Player
            </span>
          </span>
        </Link>

        {/* ── NAVIGATION LINKS (desktop & TV) ── */}
        {deviceMode !== "mobile" && (
          <div className="flex items-center gap-2 lg:gap-4 ml-6 mr-auto text-xs lg:text-sm font-black uppercase tracking-wider text-zinc-400">
            {deviceMode === "tv" && (
              <>
                <Link href="/?tab=movies" className="flex items-center gap-2 px-3 py-2 rounded-xl hover:text-white hover:bg-white/5 transition-colors text-white">
                  <Play className="w-4 h-4 fill-current text-[var(--accent)]" /> Home
                </Link>
                <button 
                  onClick={() => { setSearchQuery(""); setIsTvSearchOpen(true); }} 
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <Search className="w-4 h-4" /> Search
                </button>
                <Link href="/watchlist" className="flex items-center gap-2 px-3 py-2 rounded-xl hover:text-white hover:bg-white/5 transition-colors">
                  <Bookmark className="w-4 h-4 text-pink-400" /> My List
                </Link>
              </>
            )}
          </div>
        )}

        {/* ── SEARCH BAR (PC only) ── */}
        {deviceMode === "pc" && (
          <div className="flex-1 justify-self-center w-full max-w-[340px] lg:max-w-[460px] hidden md:flex items-center gap-1 relative p-[2px] bg-white/[0.03] border border-white/5 rounded-xl focus-within:bg-[#12131A] focus-within:border-[var(--accent)]/50 focus-within:shadow-[0_0_20px_var(--accent-glow)] transition-all duration-300">
            <div className="flex-1 relative">
              <form 
                onSubmit={(e) => handleSearch(e)} 
                className={`relative flex items-center px-2.5 py-1.5 group transition-all duration-300 rounded-xl ${isDiscoverMode ? 'bg-[var(--accent)]/10' : 'bg-transparent'}`}
              >
                <button type="submit" aria-label="Search" className="shrink-0 p-1 -ml-1 rounded-full hover:bg-white/5 transition-colors cursor-pointer z-10">
                  <Search className={`w-[18px] h-[18px] transition-colors ${isDiscoverMode ? 'text-[var(--accent)] animate-pulse' : 'text-zinc-400 group-focus-within:text-[var(--accent)]'}`} />
                </button>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setActiveIndex(-1);
                    if (e.target.value.length >= 2 && !isDiscoverMode) setShowSuggestions(true);
                  }}
                  onFocus={() => { if(!isDiscoverMode && searchQuery.length >= 1) setShowSuggestions(true); }}
                  onBlur={() => { setTimeout(() => setShowSuggestions(false), 200); }}
                  onKeyDown={handleKeyDown}
                  placeholder={isDiscoverMode ? "Describe what you want to watch..." : placeholders[placeholderIndex]}
                  className="w-full bg-transparent border-0 border-transparent ring-0 ring-transparent focus:ring-0 focus:ring-transparent focus:border-transparent focus:outline-none focus-visible:outline-none outline-none px-2 text-sm text-white placeholder-zinc-500 font-bold tracking-tight shadow-none"
                  autoComplete="off"
                />
                {searchQuery && (
                  <button aria-label="Clear search" type="button" onClick={clearSearch} className="p-1.5 hover:bg-white/5 rounded-full transition-colors mr-2">
                    <X className="w-4 h-4 text-zinc-400" />
                  </button>
                )}
                
                {/* AI Discover Toggle */}
                <button 
                  type="button"
                  onClick={() => setIsDiscoverMode(!isDiscoverMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all relative overflow-hidden shrink-0 ${isDiscoverMode ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] text-white shadow-lg shadow-[var(--accent)]/25 font-extrabold' : 'bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/10'}`}
                  title="AI Discovery Search"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isDiscoverMode ? 'text-white animate-pulse' : 'text-[var(--accent)]'}`} />
                  <span className="hidden lg:inline">AI Mode</span>
                </button>
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
                          <p className="text-[10px] uppercase tracking-[0.2em] font-black text-[var(--accent)] mb-4 flex items-center gap-2">
                            <TrendingUp className="w-3 h-3" /> Trending Hits
                          </p>
                          <div className="space-y-1">
                            {globalCatalog.slice(0, 5).map((item, i) => (
                              <Link
                                key={i}
                                href={item.href || (item.id ? `/watch/${item.type || 'anime'}/${item.id}` : '#')}
                                className="flex items-center gap-4 p-2.5 hover:bg-white/5 rounded-2xl transition-all group hover:pl-4"
                                onClick={() => setShowSuggestions(false)}
                              >
                                <span className="text-xs font-black text-white/20 w-4 italic group-hover:text-[var(--accent)] transition-colors">0{i + 1}</span>
                                <div className="w-10 h-12 relative shrink-0 overflow-hidden rounded-lg bg-zinc-900 border border-white/5">
                                  {item.image && <img src={item.image} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />}
                                </div>
                                <span className="text-sm font-bold text-white/80 group-hover:text-white transition-colors truncate">{item.title}</span>
                                <Sparkles className="w-3.5 h-3.5 text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
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
                                <h4 className="text-sm font-black text-white truncate group-hover:text-[var(--accent)] transition-colors">
                                  <HighlightText text={item.title} highlight={searchQuery} />
                                </h4>
                                <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${
                                  item.type === 'anime' ? 'bg-[var(--accent)] text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]'
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
                              <ChevronDown className="w-5 h-5 text-[var(--accent)] -rotate-90" />
                            </div>
                          </Link>
                        ))}
                        <button 
                          onClick={() => handleSearch(null)}
                          className="w-full mt-2 p-4 text-center text-xs font-black uppercase tracking-[0.2em] text-[var(--accent)] hover:text-white hover:bg-[var(--accent)] rounded-2xl transition-all duration-300"
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
            <div ref={filterRef} className="relative shrink-0 border-l border-white/[0.06] pl-1">
              <button
                aria-label="Filter Options"
                onClick={() => { setShowFilters(v => !v); setShowNotifications(false); setShowProfileDropdown(false); }}
                className={`h-[36px] px-3 rounded-xl flex items-center gap-2 text-sm font-bold transition-all ${
                  showFilters || filterGenre || filterFormat || filterStatus
                    ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                    : 'bg-transparent text-[var(--text-muted)] hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden lg:block">Filter</span>
                {(filterGenre || filterFormat || filterStatus) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                )}
              </button>

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute top-full right-0 mt-3 w-80 bg-[#0B0713]/90 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_15px_var(--accent-glow)] overflow-hidden z-50 backdrop-blur-3xl"
                  >
                    <div className="p-4 border-b border-[var(--border-color)] bg-white/5 flex items-center justify-between">
                      <span className="font-bold text-sm">Fine-tune Search</span>
                      <button onClick={clearFilters} className="text-xs text-[var(--accent)] hover:text-[var(--accent-secondary)] font-medium">Reset</button>
                    </div>
                    <div className="p-4 space-y-5">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest font-black text-[var(--text-muted)] mb-2 block">Genre</label>
                        <select 
                          value={filterGenre}
                          onChange={(e) => setFilterGenre(e.target.value)}
                          className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--accent)]/50"
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
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filterFormat === f ? 'bg-[var(--accent)] border-[var(--accent-secondary)] text-white' : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-white/20'}`}
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
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filterStatus === s ? 'bg-[var(--accent)] border-[var(--accent-secondary)] text-white' : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-white/20'}`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-white/5 border-t border-[var(--border-color)]">
                      <button onClick={applyFilter} className="w-full py-2.5 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] hover:from-[var(--accent-secondary)] hover:to-[var(--accent)] text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-[var(--accent)]/20">
                        Apply Filters
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* TV Search Overlay */}
        <AnimatePresence>
          {deviceMode === "tv" && isTvSearchOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#07070b]/98 z-[100] flex flex-col items-center justify-start pt-24 px-6 sm:px-10"
            >
              <div className="w-full max-w-3xl flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <span className="text-xl font-black uppercase tracking-widest text-[var(--accent)]">TV Mode Search</span>
                  <button 
                    onClick={() => setIsTvSearchOpen(false)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white cursor-pointer"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="relative flex items-center p-2 bg-white/[0.04] border border-white/10 rounded-2xl focus-within:border-[var(--accent)]/50 transition-all duration-300">
                  <Search className="w-6 h-6 text-zinc-400 ml-3 shrink-0" />
                  <input
                    type="text"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setActiveIndex(-1);
                    }}
                    placeholder="Search cartoons, anime, movies..."
                    className="w-full bg-transparent border-0 focus:outline-none focus:ring-0 text-lg px-4 text-white placeholder-zinc-500 font-bold"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="p-2 hover:bg-white/5 rounded-full mr-2">
                      <X className="w-5 h-5 text-zinc-400" />
                    </button>
                  )}
                </div>

                {/* TV Search suggestions */}
                <div className="max-h-[60vh] overflow-y-auto mt-4 space-y-2 pr-2 hide-scrollbar">
                  {suggestions.length > 0 ? (
                    suggestions.map((item: any, i: number) => (
                      <Link
                        key={`${item.type}-${item.id}`}
                        href={item.href || `/watch/${item.type}/${item.id}`}
                        onClick={() => { setIsTvSearchOpen(false); saveRecentSearch(item.title); }}
                        className={`flex items-center gap-4 p-3 rounded-2xl bg-white/[0.02] hover:bg-white/10 border border-white/5 transition-all ${activeIndex === i ? 'bg-white/10 border-[var(--accent)]' : ''}`}
                      >
                        <div className="w-12 h-16 relative overflow-hidden rounded-xl bg-zinc-900 shrink-0 border border-white/5">
                          {item.image && <img src={item.image} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-base font-bold text-white block truncate">{item.title}</span>
                          <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">{item.type} • {item.year} • {item.format}</span>
                        </div>
                      </Link>
                    ))
                  ) : searchQuery.length >= 2 ? (
                    <p className="text-zinc-500 text-center py-10 font-bold">No results found for "{searchQuery}"</p>
                  ) : null}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── RIGHT ACTIONS ── */}
        <div className="ml-auto flex items-center gap-1.5 md:gap-3 shrink-0">
          <div className="flex items-center gap-1 md:gap-2">
            {/* AdBlock Toggle — HIDDEN on mobile to save space */}
            {isMounted && (
              <button
                onClick={toggleAdBlock}
                className={`hidden sm:flex items-center justify-center p-2 rounded-full transition-all border ${
                  isAdBlockEnabled 
                    ? 'bg-green-500/10 border-green-500/30 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:bg-green-500/20' 
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'
                }`}
                title={isAdBlockEnabled ? "AdBlock ON" : "AdBlock OFF"}
              >
                <div className="relative">
                  <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

            {/* Notifications — HIDDEN on mobile (use MobileNav menu) */}
            <div ref={notifRef} className="relative hidden sm:block">
              <button 
                aria-label="Notifications"
                onClick={() => {
                  if (!showNotifications) {
                    setShowNotifications(true);
                    markAllAsRead();
                  } else {
                    setShowNotifications(false);
                  }
                  setShowFilters(false);
                  setShowProfileDropdown(false);
                }}
                className={`p-2 rounded-full transition-all border min-w-[40px] min-h-[40px] flex items-center justify-center ${
                  showNotifications 
                    ? 'bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]' 
                    : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-white hover:border-white/15'
                }`}
              >
                <div className="relative">
                  <Bell className="w-[18px] h-[18px] md:w-5 md:h-5" />
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
                     className="absolute top-full right-[-48px] sm:right-0 mt-3 w-[88vw] max-w-[340px] sm:w-80 bg-[#0B0713]/90 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_15px_var(--accent-glow)] z-50 overflow-hidden backdrop-blur-3xl"
                   >
                      <div className="p-4 border-b border-[var(--border-color)] bg-white/5 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <span className="font-bold text-sm">Notifications</span>
                           {unreadCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] text-[10px] font-black">{unreadCount}</span>}
                         </div>
                         <button
                           onClick={() => markAllAsRead()}
                           className="text-[10px] uppercase tracking-widest text-[var(--accent)] font-black hover:text-[var(--accent-secondary)] transition-colors"
                         >
                           Mark all read
                         </button>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto hide-scrollbar">
                         {notifications.length > 0 ? (
                           <div className="divide-y divide-[var(--border-color)]">
                             {notifications.map((notif: any) => {
                               const CATEGORY_META: Record<string, { label: string; color: string }> = {
                                 episodes: { label: 'New Episode', color: 'text-[var(--accent)] bg-[var(--accent)]/10' },
                                 trending: { label: 'Trending', color: 'text-red-400 bg-red-500/10' },
                                 recommendations: { label: 'AI Pick', color: 'text-cyan-400 bg-cyan-500/10' },
                                 watchlist: { label: 'Watchlist', color: 'text-blue-400 bg-blue-500/10' },
                                 community: { label: 'Community', color: 'text-green-400 bg-green-500/10' },
                                 system: { label: 'System', color: 'text-zinc-400 bg-zinc-500/10' },
                               };
                               const meta = CATEGORY_META[notif.category] || CATEGORY_META['system'];
                               return (
                                 <div
                                   key={notif.id}
                                   className={`p-4 hover:bg-white/5 transition-colors cursor-pointer relative ${!notif.read ? 'bg-[var(--accent)]/5' : ''}`}
                                   onClick={() => {
                                     markAsRead(notif.id);
                                     if (notif.link) router.push(notif.link);
                                   }}
                                 >
                                   {!notif.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent)] rounded-r" />}
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
                          className="flex-1 py-2.5 text-[10px] uppercase tracking-widest text-[var(--accent)] font-black hover:bg-[var(--accent)]/5 transition-all"
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

          {/* User account — readable signed-out and signed-in states */}
          <div className="profile-action-shell flex items-center justify-center pl-1.5 md:pl-2 border-l border-white/[0.08]">
            {!isUserLoaded && (
                <div className="w-[84px] md:w-[100px] h-10 rounded-xl bg-white/5 animate-pulse" />
            )}
            {isUserLoaded && !isSignedIn && (
              <SignInButton mode="modal">
                <button className="h-10 px-3 md:px-5 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] text-white hover:opacity-95 active:scale-98 transition-all font-black text-xs md:text-sm flex items-center gap-2 shadow-[0_8px_20px_var(--accent-glow)] border-0 cursor-pointer">
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Login</span>
                </button>
              </SignInButton>
            )}
            {isUserLoaded && isSignedIn && (
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-9 h-9 md:w-10 md:h-10 ring-2 ring-[var(--accent)]/55 shadow-[0_0_18px_var(--accent-glow)]",
                    userButtonTrigger: "rounded-full focus:shadow-[0_0_0_3px_var(--accent-glow)]"
                  }
                }}
              >
                <UserButton.MenuItems>
                  <UserButton.Link
                    label="Watchlist"
                    labelIcon={<Bookmark className="w-3.5 h-3.5 text-pink-400" />}
                    href="/watchlist"
                  />
                  <UserButton.Link
                    label="Watch History"
                    labelIcon={<Clock className="w-3.5 h-3.5 text-[var(--accent)]" />}
                    href="/history"
                  />
                  <UserButton.Link
                    label="Profile Settings"
                    labelIcon={<User className="w-3.5 h-3.5 text-blue-400" />}
                    href="/profile"
                  />
                </UserButton.MenuItems>
              </UserButton>
            )}
          </div>
        </div>
      </div>
    </nav>
    </>
  );
}
