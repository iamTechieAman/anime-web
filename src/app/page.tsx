"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Link from "next/link";
import useSWR from 'swr';
import { Search, Play, Star, Clock, TrendingUp, ChevronUp, Zap, Calendar, CheckCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMobileUI } from "@/context/MobileUIContext";
import AZFilter from "@/components/AZFilter";
import { AnimeCard, AnimeGrid, AnimeCardHorizontal, type Show } from "@/components/AnimeCard";
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
  const router = useRouter();

  const [popular, setPopular] = useState<Show[]>([]);
  const [recent, setRecent] = useState<Show[]>([]);
  const [top, setTop] = useState<Show[]>([]);
  const [trending, setTrending] = useState<Show[]>([]);
  const [completed, setCompleted] = useState<Show[]>([]);
  const [upcoming, setUpcoming] = useState<Show[]>([]);
  const [loading, setLoading] = useState({ popular: true, recent: true, top: true, completed: true, upcoming: true });
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Scroll-to-top visibility
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  const handleShuffle = () => {
    const pool = [...trending, ...popular, ...recent];
    if (pool.length > 0) {
      const random = pool[Math.floor(Math.random() * pool.length)];
      router.push(`/watch/${random._id}${random.provider ? `?provider=${random.provider}` : ''}`);
    }
  };


  // Fetcher helper
  const fetcher = (url: string) => axios.get(url).then(res => res.data);

  // Use SWR for all sections with revalidation for real-time updates and instant caching
  const { data: recentData } = useSWR('/api/anime/recent', fetcher, { refreshInterval: 60000, revalidateOnFocus: true });
  const { data: popularData } = useSWR('/api/anime/popular', fetcher, { refreshInterval: 300000, revalidateOnFocus: false });
  const { data: topData } = useSWR('/api/anime/top', fetcher, { revalidateOnFocus: false });
  const { data: trendingData } = useSWR('/api/anime/trending', fetcher, { refreshInterval: 300000, revalidateOnFocus: false });
  const { data: completedData } = useSWR('/api/anime/completed', fetcher, { revalidateOnFocus: false });
  const { data: upcomingData } = useSWR('/api/anime/upcoming', fetcher, { revalidateOnFocus: false });

  useEffect(() => { if (recentData?.shows) setRecent(recentData.shows); }, [recentData]);
  useEffect(() => { if (popularData?.shows) setPopular(popularData.shows); }, [popularData]);
  useEffect(() => { if (topData?.shows) setTop(topData.shows); }, [topData]);
  useEffect(() => { if (trendingData?.shows) setTrending(trendingData.shows); }, [trendingData]);
  useEffect(() => { if (completedData?.shows) setCompleted(completedData.shows); }, [completedData]);
  useEffect(() => { if (upcomingData?.shows) setUpcoming(upcomingData.shows); }, [upcomingData]);

  // Loading state calculations
  useEffect(() => {
    setLoading({
      recent: !recentData && recent.length === 0,
      popular: !popularData && popular.length === 0,
      top: !topData && top.length === 0,
      trending: !trendingData && trending.length === 0,
      completed: !completedData && completed.length === 0,
      upcoming: !upcomingData && upcoming.length === 0
    } as any);
  }, [recentData, recent, popularData, popular, topData, top, trendingData, trending]);

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

      <div className="relative z-10 w-full pb-24 md:pb-0">

            <HeroCarousel />

            {/* Genre Bar */}
            <div className="bg-[var(--bg-card)] border-y border-[var(--border-color)]">
               <div className="w-full max-w-[2000px] mx-auto px-3 md:px-6 py-2.5 flex gap-3 sm:gap-4 overflow-x-auto hide-scrollbar whitespace-nowrap">
                   {["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mecha", "Music", "Mystery", "Psychological", "Romance", "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller"].map(genre => (
                       <Link key={genre} href={`/genre/${genre.toLowerCase()}`} className="text-xs sm:text-sm font-medium text-[var(--text-muted)] hover:text-white transition-colors">{genre}</Link>
                   ))}
               </div>
            </div>

            <div className="w-full max-w-[2000px] mx-auto px-3 md:px-6 py-4 md:py-8 flex flex-col lg:flex-row gap-4 md:gap-8">
                {/* Left Column (Main Content) */}
                <div className="flex-1 space-y-8 min-w-0">
                    <section>
                       <div className="flex items-center justify-between mb-4">
                         <h2 className="text-xl md:text-2xl font-bold font-sora text-white">Recently Updated</h2>
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

                    {/* Latest Completed */}
                    <section className="bg-[var(--bg-card)]/50 p-4 rounded-xl border border-[var(--border-color)]">
                       <h2 className="text-lg font-bold font-sora text-white mb-4 flex items-center gap-2">
                         <CheckCircle className="w-5 h-5 text-green-500" /> 
                         Latest Completed
                       </h2>
                       {(loading as any).completed ? <SidebarLoadingSkeleton /> : <div className="flex flex-col gap-2">{completed.slice(0, 10).map((show, i) => <AnimeCardHorizontal key={`${show._id}-${i}`} show={show} />)}</div>}
                    </section>

                    {/* Top Upcoming */}
                    <section className="bg-[var(--bg-card)]/50 p-4 rounded-xl border border-[var(--border-color)]">
                       <h2 className="text-lg font-bold font-sora text-white mb-4 flex items-center gap-2">
                         <Calendar className="w-5 h-5 text-blue-500" /> 
                         Top Upcoming
                       </h2>
                       {(loading as any).upcoming ? <SidebarLoadingSkeleton /> : <div className="flex flex-col gap-2">{upcoming.slice(0, 10).map((show, i) => <AnimeCardHorizontal key={`${show._id}-${i}`} show={show} />)}</div>}
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
