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

const GENRES = ["Action","Adventure","Animation","Comedy","Crime","Documentary","Drama","Family","Fantasy","History","Horror","Music","Mystery","Romance","Science Fiction","Thriller","War","Western"];
const FORMATS = ["TV","Movie","OVA","ONA","Special"];
const STATUSES = ["Ongoing","Completed","Upcoming"];
const UNIFIED_SEARCH_URL = '/api/search/unified';

export default function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [deviceMode, setDeviceMode] = useState<"mobile"|"pc"|"tv">("pc");
  const [isTvSearchOpen, setIsTvSearchOpen] = useState(false);

  useEffect(() => {
    const detect = () => {
      const ua = navigator.userAgent;
      const w = window.innerWidth;
      const isTV = /SmartTV|GoogleTV|AppleTV|Roku|CastTV|Tizen|Web0S|NetCast|Opera TV|Viera|Bravia|PlayStation|Xbox/i.test(ua);
      setDeviceMode(isTV || w >= 2500 ? "tv" : w < 768 ? "mobile" : "pc");
    };
    detect();
    window.addEventListener("resize", detect);
    return () => window.removeEventListener("resize", detect);
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [isDiscoverMode, setIsDiscoverMode] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
  const [filterGenre, setFilterGenre] = useState("");
  const [filterFormat, setFilterFormat] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const { setShowProfileSettings } = useMobileUI();
  const { isAdBlockEnabled, toggleAdBlock } = useAdBlock();
  const { isLoaded: isUserLoaded, isSignedIn } = useUser();
  const [isMounted, setIsMounted] = useState(false);
  const [globalCatalog, setGlobalCatalog] = useState<any[]>([]);
  const fuseRef = useRef<Fuse<any>|null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const placeholders = ["Search Movies...","Search Anime...","Search TV Shows...","Search Genres..."];
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setPlaceholderIndex(p => (p+1)%placeholders.length), 3500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem("toonplayer_recent_searches");
    if (saved) try { setRecentSearches(JSON.parse(saved)); } catch(e) {}
    axios.get('/api/search/catalog').then(res => {
      const catalog = res.data.results || [];
      setGlobalCatalog(catalog);
      fuseRef.current = new Fuse(catalog, { keys:[{name:'title',weight:2},{name:'_searchTitle',weight:1.5},{name:'type',weight:0.5}], threshold:0.3, distance:50, minMatchCharLength:2, shouldSort:true });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => { setSearchQuery(searchParams?.get("query") || ""); }, [searchParams]);
  useEffect(() => { setShowSuggestions(false); setShowFilters(false); }, [pathname, searchParams]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilters(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfileDropdown(false);
    };
    document.addEventListener('mousedown', handleOutside);
    const updateProfile = () => { const p = localStorage.getItem("toonplayer_profile"); if (p) try { JSON.parse(p); } catch(e) {} };
    updateProfile();
    window.addEventListener('profileUpdated', updateProfile);
    return () => { document.removeEventListener('mousedown', handleOutside); window.removeEventListener('profileUpdated', updateProfile); };
  }, []);

  useEffect(() => {
    const q = searchQuery.trim().replace(/\s+/g,' ');
    if (!q) { setSuggestions([]); return; }
    if (fuseRef.current) {
      const local = fuseRef.current.search(q).map(r => r.item);
      if (local.length > 0) setSuggestions(local.slice(0,10));
    }
    const t = setTimeout(async () => {
      if (q.length < 2) return;
      try {
        const res = await axios.get(UNIFIED_SEARCH_URL, { params:{ q } });
        const net = res.data.results || [];
        if (net.length > 0) {
          const nf = new Fuse(net, { keys:[{name:'title',weight:2},{name:'format',weight:1}], threshold:0.3, distance:100, shouldSort:true });
          const ranked = nf.search(q).map(r => r.item);
          const final = ranked.length > 0 ? ranked : net;
          setSuggestions(prev => {
            const combined = [...prev, ...final];
            const seen = new Set();
            return combined.filter(item => {
              const k = `${item.id}-${(item.title||"").toLowerCase().trim()}`;
              if (seen.has(k)) return false; seen.add(k); return true;
            }).slice(0,10);
          });
        }
      } catch(e) {}
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const saveRecent = (q: string) => {
    if (!q.trim()) return;
    const n = [q,...recentSearches.filter(s=>s!==q)].slice(0,5);
    setRecentSearches(n);
    localStorage.setItem("toonplayer_recent_searches", JSON.stringify(n));
  };

  const handleSearch = (e: React.FormEvent|null, override?: string) => {
    if (e) e.preventDefault();
    const q = override || searchQuery;
    if (q.trim()) saveRecent(q);
    if (isDiscoverMode && q.trim()) { setShowSuggestions(false); setShowFilters(false); router.push(`/discover?prompt=${encodeURIComponent(q.trim())}`); return; }
    const p = new URLSearchParams();
    if (q.trim()) p.set("query",q);
    if (filterGenre) p.set("genre",filterGenre);
    if (filterFormat) p.set("format",filterFormat.toLowerCase());
    if (filterStatus) p.set("status",filterStatus.toLowerCase());
    if (!q.trim() && !filterGenre && !filterFormat && !filterStatus) return;
    setShowSuggestions(false); setShowFilters(false);
    router.push(`/search?${p.toString()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key==="ArrowDown") { e.preventDefault(); setActiveIndex(p => p<suggestions.length-1?p+1:p); }
    else if (e.key==="ArrowUp") { e.preventDefault(); setActiveIndex(p => p>-1?p-1:p); }
    else if (e.key==="Enter" && activeIndex>=0) { e.preventDefault(); router.push(suggestions[activeIndex].href); setShowSuggestions(false); }
    else if (e.key==="Escape") setShowSuggestions(false);
  };

  const HL = ({ text, highlight }: { text:string, highlight:string }) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const esc = highlight.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    return <span className="truncate">{text.split(new RegExp(`(${esc})`,"gi")).map((p,i)=>p.toLowerCase()===highlight.toLowerCase().trim()?<b key={i} className="text-[var(--accent)]">{p}</b>:<span key={i} className="text-[var(--text-secondary)]">{p}</span>)}</span>;
  };

  const clearSearch = () => { setSearchQuery(""); setSuggestions([]); setShowSuggestions(false); };
  const applyFilter = () => {
    const p = new URLSearchParams();
    if (searchQuery.trim()) p.set("query",searchQuery);
    if (filterGenre) p.set("genre",filterGenre);
    if (filterFormat) p.set("format",filterFormat.toLowerCase());
    if (filterStatus) p.set("status",filterStatus.toLowerCase());
    if (p.toString()) router.push(`/search?${p.toString()}`);
    setShowFilters(false);
  };

  const isWatchPage = pathname?.startsWith('/watch');
  const showSidebar = deviceMode==="pc" && !isWatchPage;
  if (isWatchPage) return null;

  return (
    <>
    <nav className={`fixed top-0 right-0 z-50 h-14 md:h-16 flex items-center px-3 sm:px-4 md:px-5 transition-all duration-300 ${
      showSidebar ? "left-0 md:left-[72px]" : "left-0"
    } ${isScrolled
      ? "bg-[var(--bg-main)]/95 backdrop-blur-xl border-b border-white/[0.06] shadow-[0_1px_0_rgba(255,255,255,0.04)]"
      : "bg-gradient-to-b from-black/70 to-transparent border-b border-transparent"
    }`}>

      <AnimatePresence>
        {showSuggestions && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[-1] cursor-pointer"
            onClick={() => setShowSuggestions(false)} />
        )}
      </AnimatePresence>

      <div className="w-full max-w-[1800px] mx-auto flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0">

        {/* Logo */}
        <Link href="/" className={`flex items-center gap-2 shrink-0 active:scale-95 transition-transform select-none ${showSidebar ? "md:hidden" : ""}`} onClick={clearSearch} aria-label="ToonPlayer Home">
          <div className="w-7 h-7 shrink-0" style={{filter:"drop-shadow(0 0 8px rgba(249,115,22,0.5))"}}>
            <Logo />
          </div>
          <span className="flex flex-col leading-none">
            <span className="text-[14px] sm:text-[15px] font-black tracking-tight text-white" style={{fontFamily:"var(--font-sora,'Sora',sans-serif)",lineHeight:1}}>Toon</span>
            <span className="text-[14px] sm:text-[15px] font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent)] to-orange-400" style={{fontFamily:"var(--font-sora,'Sora',sans-serif)",lineHeight:1}}>Player</span>
          </span>
        </Link>

        {/* TV Nav */}
        {deviceMode==="tv" && (
          <div className="flex items-center gap-3 ml-4 mr-auto text-xs font-black uppercase tracking-wider text-zinc-400">
            <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-xl hover:text-white hover:bg-white/5 transition-colors text-white"><Play className="w-4 h-4 fill-current text-[var(--accent)]"/>Home</Link>
            <button onClick={()=>{setSearchQuery("");setIsTvSearchOpen(true);}} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:text-white hover:bg-white/5 transition-colors cursor-pointer"><Search className="w-4 h-4"/>Search</button>
            <Link href="/watchlist" className="flex items-center gap-2 px-3 py-2 rounded-xl hover:text-white hover:bg-white/5 transition-colors"><Bookmark className="w-4 h-4 text-pink-400"/>My List</Link>
          </div>
        )}

        {/* PC Search Bar */}
        {deviceMode==="pc" && (
          <div className="flex-1 min-w-0 max-w-[360px] lg:max-w-[500px] xl:max-w-[580px] hidden md:flex items-center relative h-10 bg-white/[0.04] border border-white/[0.07] rounded-xl focus-within:bg-[#12131A] focus-within:border-[var(--accent)]/40 focus-within:shadow-[0_0_0_3px_var(--accent-glow)] transition-all duration-300">
            <form onSubmit={handleSearch} className={`flex-1 flex items-center min-w-0 pl-2 pr-1 h-full ${isDiscoverMode?'bg-[var(--accent)]/5 rounded-xl':''}`}>
              <button type="submit" aria-label="Search" className="shrink-0 p-1.5 rounded-lg cursor-pointer">
                <Search className={`w-4 h-4 ${isDiscoverMode?'text-[var(--accent)] animate-pulse':'text-zinc-500 group-focus-within:text-[var(--accent)]'}`}/>
              </button>
              <input type="text" value={searchQuery}
                onChange={e=>{setSearchQuery(e.target.value);setActiveIndex(-1);if(e.target.value.length>=2&&!isDiscoverMode)setShowSuggestions(true);}}
                onFocus={()=>{if(!isDiscoverMode&&searchQuery.length>=1)setShowSuggestions(true);}}
                onBlur={()=>setTimeout(()=>setShowSuggestions(false),200)}
                onKeyDown={handleKeyDown}
                placeholder={isDiscoverMode?"Describe what you want to watch...":placeholders[placeholderIndex]}
                className="flex-1 min-w-0 bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none outline-none px-2 text-[13px] text-white placeholder-zinc-500 font-medium h-full"
                autoComplete="off"
              />
              {searchQuery && <button type="button" onClick={clearSearch} className="p-1.5 shrink-0"><X className="w-3.5 h-3.5 text-zinc-500"/></button>}
              <button type="button" onClick={()=>setIsDiscoverMode(!isDiscoverMode)}
                className={`flex items-center gap-1 px-2 py-1 mr-1 rounded-lg text-[11px] font-black transition-all shrink-0 ${isDiscoverMode?'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] text-white':'bg-white/[0.05] text-zinc-500 hover:text-white hover:bg-white/10'}`}
                title="AI Discovery">
                <Sparkles className={`w-3.5 h-3.5 ${isDiscoverMode?'text-white animate-pulse':'text-[var(--accent)]'}`}/>
                <span className="hidden xl:inline">AI</span>
              </button>
            </form>

            {/* Filter */}
            <div ref={filterRef} className="relative shrink-0 border-l border-white/[0.06] h-full flex items-center px-1">
              <button aria-label="Filter" onClick={()=>{setShowFilters(v=>!v);setShowNotifications(false);setShowProfileDropdown(false);}}
                className={`h-7 px-2 rounded-lg flex items-center gap-1 text-xs font-bold transition-all ${showFilters||filterGenre||filterFormat||filterStatus?'text-[var(--accent)] bg-[var(--accent)]/10':'text-zinc-500 hover:text-white hover:bg-white/[0.06]'}`}>
                <SlidersHorizontal className="w-3.5 h-3.5"/>
                <span className="hidden lg:block text-[11px]">Filter</span>
                {(filterGenre||filterFormat||filterStatus)&&<span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse"/>}
              </button>
              <AnimatePresence>
                {showFilters && (
                  <motion.div initial={{opacity:0,y:8,scale:0.95}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:8,scale:0.95}}
                    className="absolute top-full right-0 mt-2 w-72 bg-[#0B0713]/97 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden z-50 backdrop-blur-3xl">
                    <div className="p-3 border-b border-[var(--border-color)] bg-white/5 flex items-center justify-between">
                      <span className="font-bold text-sm">Filter</span>
                      <button onClick={()=>{setFilterGenre('');setFilterFormat('');setFilterStatus('');}} className="text-xs text-[var(--accent)]">Reset</button>
                    </div>
                    <div className="p-4 space-y-4">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest font-black text-[var(--text-muted)] mb-2 block">Genre</label>
                        <select value={filterGenre} onChange={e=>setFilterGenre(e.target.value)} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--accent)]/50">
                          <option value="">All Genres</option>
                          {GENRES.map(g=><option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest font-black text-[var(--text-muted)] mb-2 block">Format</label>
                        <div className="grid grid-cols-3 gap-1.5">{FORMATS.map(f=><button key={f} onClick={()=>setFilterFormat(filterFormat===f?"":f)} className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${filterFormat===f?'bg-[var(--accent)] border-transparent text-white':'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-white/20'}`}>{f}</button>)}</div>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest font-black text-[var(--text-muted)] mb-2 block">Status</label>
                        <div className="grid grid-cols-3 gap-1.5">{STATUSES.map(s=><button key={s} onClick={()=>setFilterStatus(filterStatus===s?"":s)} className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${filterStatus===s?'bg-[var(--accent)] border-transparent text-white':'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-white/20'}`}>{s}</button>)}</div>
                      </div>
                    </div>
                    <div className="p-3 border-t border-[var(--border-color)]">
                      <button onClick={applyFilter} className="w-full py-2 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] text-white text-sm font-bold rounded-xl">Apply</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Suggestions Dropdown */}
            <AnimatePresence>
              {showSuggestions && (
                <motion.div ref={dropdownRef} initial={{opacity:0,y:10,scale:0.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:6,scale:0.98}}
                  className="absolute top-[calc(100%+8px)] left-0 right-0 bg-zinc-950/97 border border-white/10 rounded-2xl shadow-[0_24px_48px_-8px_rgba(0,0,0,0.7)] overflow-hidden z-50 backdrop-blur-2xl">
                  {searchQuery.length<2 ? (
                    <div className="divide-y divide-white/[0.04]">
                      {recentSearches.length>0 && (
                        <div className="p-4">
                          <p className="text-[10px] uppercase tracking-[0.2em] font-black text-white/40 mb-3 flex items-center gap-2"><Clock className="w-3 h-3"/>Recent</p>
                          <div className="flex flex-wrap gap-2">{recentSearches.map((s,i)=><button key={i} onClick={()=>{setSearchQuery(s);handleSearch(null,s);}} className="px-3 py-1 bg-white/[0.04] hover:bg-white/10 border border-white/[0.06] rounded-full text-xs font-bold text-white/70 hover:text-white transition-all">{s}</button>)}</div>
                        </div>
                      )}
                      <div className="p-4">
                        <p className="text-[10px] uppercase tracking-[0.2em] font-black text-[var(--accent)] mb-3 flex items-center gap-2"><TrendingUp className="w-3 h-3"/>Trending</p>
                        <div className="space-y-0.5">
                          {globalCatalog.slice(0,5).map((item,i)=>(
                            <Link key={i} href={item.href||`/watch/${item.type||'anime'}/${item.id}`} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-all group" onClick={()=>setShowSuggestions(false)}>
                              <span className="text-xs font-black text-white/20 w-4 italic group-hover:text-[var(--accent)] transition-colors">0{i+1}</span>
                              <div className="w-8 h-10 relative shrink-0 overflow-hidden rounded-md bg-zinc-900 border border-white/5">{item.image&&<img src={item.image} alt="" className="w-full h-full object-cover"/>}</div>
                              <span className="text-sm font-bold text-white/80 group-hover:text-white transition-colors truncate">{item.title}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : suggestions.length>0 ? (
                    <div className="p-2 space-y-0.5">
                      {suggestions.map((item:any,i:number)=>(
                        <Link key={`${item.type}-${item.id}`} href={item.href||`/watch/${item.type}/${item.id}`}
                          className={`flex items-center gap-3 p-2.5 rounded-xl transition-all group ${activeIndex===i?'bg-white/10':'hover:bg-white/5'}`}
                          onMouseEnter={()=>setActiveIndex(i)} onClick={()=>{setShowSuggestions(false);saveRecent(item.title);}}>
                          <div className="w-10 h-14 relative shrink-0 overflow-hidden rounded-lg bg-zinc-900 border border-white/5">
                            {item.image?<img src={item.image} alt={item.title} className="w-full h-full object-cover"/>:<Play className="w-4 h-4 text-zinc-700 m-auto"/>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h4 className="text-[13px] font-bold text-white truncate group-hover:text-[var(--accent)] transition-colors"><HL text={item.title} highlight={searchQuery}/></h4>
                              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase shrink-0 ${item.type==='anime'?'bg-[var(--accent)]/20 text-[var(--accent)]':'bg-blue-500/20 text-blue-400'}`}>{item.type}</span>
                            </div>
                            <p className="text-[10px] font-medium text-white/40">{item.format} · {item.year}</p>
                          </div>
                          <ChevronDown className="w-4 h-4 text-[var(--accent)] -rotate-90 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"/>
                        </Link>
                      ))}
                      <button onClick={()=>handleSearch(null)} className="w-full mt-1 p-3 text-center text-xs font-black uppercase tracking-[0.2em] text-[var(--accent)] hover:text-white hover:bg-[var(--accent)] rounded-xl transition-all">
                        All results for "{searchQuery}"
                      </button>
                    </div>
                  ) : (
                    <div className="p-10 text-center">
                      <Search className="w-8 h-8 text-white/10 mx-auto mb-3"/>
                      <p className="text-sm font-bold text-white/50">No results found</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* TV Search Overlay */}
        <AnimatePresence>
          {deviceMode==="tv"&&isTvSearchOpen&&(
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-[#07070b]/98 z-[100] flex flex-col items-center justify-start pt-24 px-10">
              <div className="w-full max-w-3xl flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <span className="text-xl font-black uppercase tracking-widest text-[var(--accent)]">Search</span>
                  <button onClick={()=>setIsTvSearchOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full"><X className="w-6 h-6"/></button>
                </div>
                <div className="relative flex items-center p-2 bg-white/[0.04] border border-white/10 rounded-2xl focus-within:border-[var(--accent)]/50 transition-all">
                  <Search className="w-6 h-6 text-zinc-400 ml-3 shrink-0"/>
                  <input type="text" autoFocus value={searchQuery} onChange={e=>{setSearchQuery(e.target.value);setActiveIndex(-1);}} placeholder="Search..." className="w-full bg-transparent border-0 focus:outline-none text-lg px-4 text-white placeholder-zinc-500 font-bold"/>
                  {searchQuery&&<button onClick={()=>setSearchQuery("")} className="p-2"><X className="w-5 h-5 text-zinc-400"/></button>}
                </div>
                <div className="max-h-[60vh] overflow-y-auto space-y-2 hide-scrollbar">
                  {suggestions.length>0?suggestions.map((item:any,i:number)=>(
                    <Link key={`${item.type}-${item.id}`} href={item.href||`/watch/${item.type}/${item.id}`} onClick={()=>{setIsTvSearchOpen(false);saveRecent(item.title);}}
                      className={`flex items-center gap-4 p-3 rounded-2xl bg-white/[0.02] hover:bg-white/10 border border-white/5 transition-all ${activeIndex===i?'border-[var(--accent)]':''}`}>
                      <div className="w-12 h-16 overflow-hidden rounded-xl bg-zinc-900 shrink-0">{item.image&&<img src={item.image} alt="" className="w-full h-full object-cover"/>}</div>
                      <div className="flex-1 min-w-0">
                        <span className="text-base font-bold text-white block truncate">{item.title}</span>
                        <span className="text-xs text-zinc-400 font-semibold uppercase">{item.type} · {item.year}</span>
                      </div>
                    </Link>
                  )):searchQuery.length>=2?<p className="text-zinc-500 text-center py-10 font-bold">No results for "{searchQuery}"</p>:null}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right Actions */}
        <div className="ml-auto flex items-center gap-2 shrink-0">

          {/* Mobile Search */}
          {deviceMode==="mobile" && (
            <Link href="/search" className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.05] border border-white/[0.07] text-zinc-400 hover:text-white transition-all">
              <Search className="w-4 h-4"/>
            </Link>
          )}

          {/* AdBlock */}
          {isMounted && (
            <button onClick={toggleAdBlock} title={isAdBlockEnabled?"AdBlock ON":"AdBlock OFF"}
              className={`hidden sm:flex items-center justify-center w-9 h-9 rounded-full border transition-all ${isAdBlockEnabled?'bg-green-500/10 border-green-500/20 text-green-400':'bg-white/[0.04] border-white/[0.07] text-zinc-500 hover:text-zinc-300'}`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {isAdBlockEnabled?<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4"/>:<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="4" y1="4" x2="20" y2="20"/></>}
              </svg>
            </button>
          )}

          {/* Notifications */}
          <div ref={notifRef} className="relative hidden sm:block">
            <button aria-label="Notifications"
              onClick={()=>{if(!showNotifications){setShowNotifications(true);markAllAsRead();}else setShowNotifications(false);setShowFilters(false);setShowProfileDropdown(false);}}
              className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${showNotifications?'bg-[var(--accent)]/10 border-[var(--accent)]/20 text-[var(--accent)]':'bg-white/[0.04] border-white/[0.07] text-zinc-500 hover:text-zinc-300'}`}>
              <div className="relative">
                <Bell className="w-4 h-4"/>
                {isMounted&&unreadCount>0&&<span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-[var(--bg-overlay)] animate-pulse"/>}
              </div>
            </button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div initial={{opacity:0,y:8,scale:0.95}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:8,scale:0.95}}
                  className="absolute top-full right-0 mt-2 w-[88vw] max-w-[320px] sm:w-80 bg-[#0B0713]/97 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 overflow-hidden backdrop-blur-3xl">
                  <div className="p-3.5 border-b border-[var(--border-color)] bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">Notifications</span>
                      {unreadCount>0&&<span className="px-1.5 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] text-[10px] font-black">{unreadCount}</span>}
                    </div>
                    <button onClick={()=>markAllAsRead()} className="text-[10px] uppercase tracking-widest text-[var(--accent)] font-black">Mark read</button>
                  </div>
                  <div className="max-h-[340px] overflow-y-auto hide-scrollbar">
                    {notifications.length>0?(
                      <div className="divide-y divide-[var(--border-color)]">
                        {notifications.map((n:any)=>{
                          const meta:Record<string,{label:string,color:string}>={episodes:{label:'New Episode',color:'text-[var(--accent)] bg-[var(--accent)]/10'},trending:{label:'Trending',color:'text-red-400 bg-red-500/10'},recommendations:{label:'AI Pick',color:'text-cyan-400 bg-cyan-500/10'},watchlist:{label:'Watchlist',color:'text-blue-400 bg-blue-500/10'},community:{label:'Community',color:'text-green-400 bg-green-500/10'},system:{label:'System',color:'text-zinc-400 bg-zinc-500/10'}};
                          const m=meta[n.category]||meta['system'];
                          return (
                            <div key={n.id} className={`p-3.5 hover:bg-white/5 transition-colors cursor-pointer relative ${!n.read?'bg-[var(--accent)]/5':''}`} onClick={()=>{markAsRead(n.id);if(n.link)router.push(n.link);}}>
                              {!n.read&&<div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--accent)] rounded-r"/>}
                              <div className="flex justify-between items-start mb-1 gap-2">
                                <div className="flex-1 min-w-0">
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider ${m.color}`}>{m.label}</span>
                                  <h5 className="text-xs font-bold text-white leading-tight mt-0.5 line-clamp-1">{n.title}</h5>
                                </div>
                                <span className="text-[9px] text-[var(--text-muted)] whitespace-nowrap shrink-0">{formatDistanceToNow(n.timestamp,{addSuffix:true}).replace('about ','')}</span>
                              </div>
                              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed line-clamp-2">{n.message}</p>
                            </div>
                          );
                        })}
                      </div>
                    ):(
                      <div className="p-8 text-center">
                        <Bell className="w-8 h-8 text-white/10 mx-auto mb-3"/>
                        <p className="text-sm text-white/50">No notifications</p>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-[var(--border-color)] flex divide-x divide-[var(--border-color)]">
                    <button onClick={()=>{setShowNotifications(false);setShowProfileSettings(true);}} className="flex-1 py-2.5 text-[10px] uppercase tracking-widest text-[var(--accent)] font-black hover:bg-[var(--accent)]/5 transition-all">⚙ Manage</button>
                    {notifications.length>0&&<button onClick={clearNotifications} className="flex-1 py-2.5 text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-black hover:bg-red-500/10 hover:text-red-400 transition-all">Clear All</button>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Auth */}
          <div className="flex items-center pl-2 border-l border-white/[0.07]">
            {!isUserLoaded&&<div className="w-16 sm:w-20 h-9 rounded-xl bg-white/[0.05] animate-pulse"/>}
            {isUserLoaded&&!isSignedIn&&(
              <SignInButton mode="modal">
                <button className="h-9 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] text-white hover:opacity-90 active:scale-95 transition-all font-black text-xs flex items-center gap-1.5 shadow-[0_4px_16px_var(--accent-glow)] cursor-pointer whitespace-nowrap">
                  <LogIn className="w-3.5 h-3.5 shrink-0"/><span>Login</span>
                </button>
              </SignInButton>
            )}
            {isUserLoaded&&isSignedIn&&(
              <UserButton appearance={{elements:{userButtonAvatarBox:"w-9 h-9 ring-2 ring-[var(--accent)]/40 shadow-[0_0_12px_var(--accent-glow)]",userButtonTrigger:"rounded-full"}}}>
                <UserButton.MenuItems>
                  <UserButton.Link label="Watchlist" labelIcon={<Bookmark className="w-3.5 h-3.5 text-pink-400"/>} href="/watchlist"/>
                  <UserButton.Link label="Watch History" labelIcon={<Clock className="w-3.5 h-3.5 text-[var(--accent)]"/>} href="/history"/>
                  <UserButton.Link label="Profile Settings" labelIcon={<User className="w-3.5 h-3.5 text-blue-400"/>} href="/profile"/>
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
