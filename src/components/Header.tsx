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
import CustomProfileMenu from "@/components/CustomProfileMenu";
import Image from "next/image";
import { useUserStore } from "@/store/userStore";

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
  const { activeProfileId } = useUserStore();

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
      fuseRef.current = new Fuse(catalog, { keys:[{name:'title',weight:2},{name:'altTitles',weight:1.8},{name:'_searchTitle',weight:1.5},{name:'type',weight:0.5}], threshold:0.3, distance:50, minMatchCharLength:2, shouldSort:true });
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
          const nf = new Fuse(net, { keys:[{name:'title',weight:2},{name:'altTitles',weight:1.8},{name:'format',weight:1}], threshold:0.3, distance:100, shouldSort:true });
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
    }, 200);
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
    if (isDiscoverMode && q.trim()) { setShowSuggestions(false); setShowFilters(false); router.push(`/discover?prompt=${encodeURIComponent(q.trim())}`, { scroll: false }); return; }
    const p = new URLSearchParams();
    if (q.trim()) p.set("query",q);
    if (filterGenre) p.set("genre",filterGenre);
    if (filterFormat) p.set("format",filterFormat.toLowerCase());
    if (filterStatus) p.set("status",filterStatus.toLowerCase());
    if (!q.trim() && !filterGenre && !filterFormat && !filterStatus) return;
    setShowSuggestions(false); setShowFilters(false);
    router.push(`/search?${p.toString()}`, { scroll: false });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key==="ArrowDown") { e.preventDefault(); setActiveIndex(p => p<suggestions.length-1?p+1:p); }
    else if (e.key==="ArrowUp") { e.preventDefault(); setActiveIndex(p => p>-1?p-1:p); }
    else if (e.key==="Enter" && activeIndex>=0) { e.preventDefault(); router.push(suggestions[activeIndex].href, { scroll: false }); setShowSuggestions(false); }
    else if (e.key==="Escape") setShowSuggestions(false);
  };

  const HL = ({ text, highlight }: { text:string, highlight:string }) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const esc = highlight.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    return <span className="truncate">{text.split(new RegExp(`(${esc})`,"gi")).map((p,i)=>p.toLowerCase()===highlight.toLowerCase().trim()?<b key={i} className="text-accent">{p}</b>:<span key={i} className="text-[var(--text-secondary)]">{p}</span>)}</span>;
  };

  const clearSearch = () => { setSearchQuery(""); setSuggestions([]); setShowSuggestions(false); };
  const applyFilter = () => {
    const p = new URLSearchParams();
    if (searchQuery.trim()) p.set("query",searchQuery);
    if (filterGenre) p.set("genre",filterGenre);
    if (filterFormat) p.set("format",filterFormat.toLowerCase());
    if (filterStatus) p.set("status",filterStatus.toLowerCase());
    if (p.toString()) router.push(`/search?${p.toString()}`, { scroll: false });
    setShowFilters(false);
  };

  const isWatchPage = pathname?.startsWith('/watch');
  const showSidebar = deviceMode==="pc" && !isWatchPage;
  if (isWatchPage) return null;

  return (
    <>
    <header className={`fixed top-0 right-0 z-50 pt-[env(safe-area-inset-top,0px)] h-[72px] flex items-center px-3 sm:px-4 md:px-5 transition-all duration-[250ms] ease-apple ${
      showSidebar ? "left-0 md:left-[80px]" : "left-0"
    } ${isScrolled
      ? "bg-[rgba(8,8,12,0.72)] backdrop-blur-[24px] border-b border-white/[0.05]"
      : "bg-gradient-to-b from-[rgba(5,5,7,0.9)] to-transparent border-b border-transparent"
    }`}>

      <AnimatePresence>
        {showSuggestions && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[-1] cursor-pointer"
            onClick={() => setShowSuggestions(false)} />
        )}
      </AnimatePresence>

      <div className="w-full max-w-[1800px] mx-auto flex items-center justify-between gap-2 sm:gap-3 md:gap-4 min-w-0">
        
        {/* Left Section - Logo */}
        <div className={`flex items-center shrink-0 ${showSidebar ? "md:hidden" : "md:w-[40px] overflow-visible"}`}>
          <Link href="/" className="flex items-center gap-2 shrink-0 active:scale-95 transition-transform select-none" will-change-transform onClick={clearSearch} aria-label="ToonPlayer Home">
            <div className="w-8 h-8 shrink-0 relative" style={{filter:"drop-shadow(0 0 8px rgba(249,115,22,0.5))"}}>
              <Logo />
            </div>
            <span className="flex flex-col leading-none md:hidden lg:flex">
              <span className="text-[14px] sm:text-[15px] font-black tracking-tight text-white" style={{fontFamily:"var(--font-sora,'Sora',sans-serif)",lineHeight:1}}>Toon</span>
              <span className="text-[14px] sm:text-[15px] font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-accent to-accent-warm" style={{fontFamily:"var(--font-sora,'Sora',sans-serif)",lineHeight:1}}>Player</span>
            </span>
          </Link>
        </div>

        {/* TV Nav */}
        {deviceMode==="tv" && (
          <div className="flex items-center gap-3 ml-4 mr-auto text-xs font-black uppercase tracking-wider text-zinc-400">
            <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-xl hover:text-white hover:bg-white/5 transition-colors text-white"><Play className="w-4 h-4 fill-current text-accent"/>Home</Link>
            <button onClick={()=>{setSearchQuery("");setIsTvSearchOpen(true);}} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:text-white hover:bg-white/5 transition-colors cursor-pointer"><Search className="w-4 h-4"/>Search</button>
            <Link href="/watchlist" className="flex items-center gap-2 px-3 py-2 rounded-xl hover:text-white hover:bg-white/5 transition-colors"><Bookmark className="w-4 h-4 text-pink-400"/>My List</Link>
          </div>
        )}

        {/* Center Section - PC Search Bar */}
        {deviceMode==="pc" && (
          <div className="flex-1 mx-6 hidden md:flex items-center justify-center min-w-[500px] max-w-[900px]">
            <button 
              onClick={() => window.dispatchEvent(new Event("openCommandPalette"))}
              className="pointer-events-auto w-full flex items-center relative h-10 bg-white/[0.04] border border-white/[0.07] rounded-full hover:bg-white/[0.08] hover:border-white/20 transition-all duration-[250ms] ease-apple text-left outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <div className="flex-1 flex items-center min-w-0 pl-4 pr-2 h-full gap-2">
                <Search className="w-4 h-4 text-zinc-500 shrink-0" />
                <span className="text-[13px] text-zinc-500 font-medium flex-1 truncate">
                  Search movies, anime, actors, genres...
                </span>
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-[10px] text-zinc-400 font-bold select-none">
                  <span>Ctrl</span><span>K</span>
                </kbd>
              </div>
            </button>
          </div>
        )}

        {/* TV Search Overlay */}
        <AnimatePresence>
          {deviceMode==="tv"&&isTvSearchOpen&&(
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-[#07070b]/98 z-[100] flex flex-col items-center justify-start pt-24 px-10">
              <div className="w-full max-w-3xl flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <span className="text-xl font-black uppercase tracking-widest text-accent">Search</span>
                  <button onClick={()=>setIsTvSearchOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full"><X className="w-6 h-6"/></button>
                </div>
                <div className="relative flex items-center p-2 bg-white/[0.04] border border-white/10 rounded-2xl focus-within:border-accent/50 transition-all">
                  <Search className="w-6 h-6 text-zinc-400 ml-3 shrink-0"/>
                  <input type="text" value={searchQuery} onChange={e=>{setSearchQuery(e.target.value);setActiveIndex(-1);}} onKeyDown={(e) => { if (e.key === "Enter" && searchQuery.length >= 2) { if (suggestions.length > 0) { router.push(suggestions[0].href || `/watch/${suggestions[0].type}/${suggestions[0].id}`, { scroll: false }); setIsTvSearchOpen(false); saveRecent(suggestions[0].title); } else { handleSearch(null, searchQuery); setIsTvSearchOpen(false); } } }} placeholder="Search..." className="w-full bg-transparent border-0 focus:outline-none text-lg px-4 text-white placeholder-zinc-500 font-bold"/>
                  {searchQuery&&<button onClick={()=>setSearchQuery("")} className="p-2"><X className="w-5 h-5 text-zinc-400"/></button>}
                </div>
                <div className="max-h-[60vh] overflow-y-auto space-y-2 hide-scrollbar">
                  {suggestions.length>0?suggestions.map((item:any,i:number)=>(
                    <Link key={`${item.type}-${item.id}`} href={item.href||`/watch/${item.type}/${item.id}`} onClick={()=>{setIsTvSearchOpen(false);saveRecent(item.title);}}
                      className={`flex items-center gap-4 p-3 rounded-2xl bg-white/[0.02] hover:bg-white/10 border border-white/5 transition-all ${activeIndex===i?'border-accent':''}`}>
                      <div className="w-12 h-16 overflow-hidden rounded-xl bg-bg-elevated shrink-0">{item.image&&<Image src={item.image} alt="" fill sizes="48px" className="object-cover"/>}</div>
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

        {/* Right Section - Actions */}
        <div className="flex items-center gap-3 shrink-0">

          {/* Mobile Search */}
          {deviceMode==="mobile" && (
            <button 
              onClick={() => window.dispatchEvent(new Event("openCommandPalette"))}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.05] border border-white/[0.07] text-zinc-400 hover:text-white transition-all cursor-pointer"
              aria-label="Open Command Palette"
            >
              <Search className="w-4 h-4"/>
            </button>
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
              className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${showNotifications?'bg-accent/10 border-accent/20 text-accent':'bg-white/[0.04] border-white/[0.07] text-zinc-500 hover:text-zinc-300'}`}>
              <div className="relative">
                <Bell className="w-4 h-4"/>
                {isMounted&&unreadCount>0&&<span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-[var(--bg-overlay)] animate-pulse"/>}
              </div>
            </button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div initial={{opacity:0,y:8,scale:0.95}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:8,scale:0.95}}
                  className="absolute top-full right-4 md:-right-2 mt-2 w-[90vw] md:w-[320px] max-w-[320px] bg-[#111113] border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl z-50">
                  <div className="p-3.5 border-b border-border-color bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">Notifications</span>
                      {unreadCount>0&&<span className="px-1.5 py-0.5 rounded-full bg-accent/20 text-accent text-[10px] font-black">{unreadCount}</span>}
                    </div>
                    <button onClick={()=>markAllAsRead()} className="text-[10px] uppercase tracking-widest text-accent font-black">Mark read</button>
                  </div>
                  <div className="max-h-[340px] overflow-y-auto hide-scrollbar">
                    {notifications.length>0?(
                      <div className="divide-y divide-border-color">
                        {notifications.map((n:any)=>{
                          const meta:Record<string,{label:string,color:string}>={episodes:{label:'New Episode',color:'text-accent bg-accent/10'},trending:{label:'Trending',color:'text-red-400 bg-red-500/10'},recommendations:{label:'AI Pick',color:'text-cyan-400 bg-cyan-500/10'},watchlist:{label:'Watchlist',color:'text-blue-400 bg-blue-500/10'},community:{label:'Community',color:'text-green-400 bg-green-500/10'},system:{label:'System',color:'text-zinc-400 bg-zinc-500/10'}};
                          const m=meta[n.category]||meta['system'];
                          return (
                            <div key={n.id} className={`p-3.5 hover:bg-white/5 transition-colors cursor-pointer relative ${!n.read?'bg-accent/5':''}`} onClick={()=>{markAsRead(n.id);if(n.link)router.push(n.link, { scroll: false });}}>
                              {!n.read&&<div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent rounded-r"/>}
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
                  <div className="border-t border-border-color flex divide-x divide-border-color">
                    <button onClick={()=>{setShowNotifications(false);window.dispatchEvent(new Event("openSettingsModal"));}} className="flex-1 py-2.5 text-[10px] uppercase tracking-widest text-accent font-black hover:bg-accent/5 transition-all">⚙ Manage</button>
                    {notifications.length>0&&<button onClick={clearNotifications} className="flex-1 py-2.5 text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-black hover:bg-red-500/10 hover:text-red-400 transition-all">Clear All</button>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Auth */}
          <div className="flex items-center pl-2 border-l border-white/[0.07]">
            {!isUserLoaded&&<div className="w-16 sm:w-20 h-9 rounded-xl bg-white/[0.05] animate-pulse"/>}
            {isUserLoaded&&!activeProfileId&&(
              <button 
                onClick={() => window.dispatchEvent(new Event("openLoginModal"))}
                className="h-9 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-accent to-accent-secondary text-white hover:opacity-90 active:scale-95 transition-all font-black text-xs flex items-center gap-1.5 shadow-[0_4px_16px_var(--accent-glow)] cursor-pointer whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5 shrink-0"/><span>Login</span>
              </button>
            )}
            {isUserLoaded&&activeProfileId&&(
              <CustomProfileMenu />
            )}
          </div>
        </div>
      </div>
    </header>
    </>
  );
}
