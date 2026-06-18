"use client";

import { useState, useEffect } from "react";
import { Bookmark, Trash2, Play, Search, X } from "lucide-react";
import Link from "next/link";
import { useWatch } from "@/context/WatchContext";

export default function WatchlistPage() {
  const { watchlist, removeFromWatchlist } = useWatch();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "anime" | "movie" | "tv">("all");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const filtered = watchlist.filter((w) => {
    const matchesSearch = w.title.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || w.type === filterType;
    return matchesSearch && matchesType;
  });

  const relativeTime = (ts: number) => {
    const diff = (Date.now() - ts) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getWatchlistLink = (entry: typeof watchlist[0]) => {
    if (entry.type === 'movie' || entry.type === 'tv') {
      return `/watch/${entry.type}/${entry.showId}`;
    }
    return `/watch/anime/${entry.showId}`;
  };

  if (!isMounted) return null;

  return (
    <main className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] pb-24 md:pb-10">
      {/* Sticky header with glassmorphism */}
      <div className="sticky top-[60px] md:top-[64px] z-40 bg-[var(--bg-main)]/80 backdrop-blur-xl border-b border-white/5">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/30 to-transparent" />
        <div className="w-full px-6 md:px-12 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
              <Bookmark className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div>
              <h1 className="text-xl font-black font-sora tracking-tight text-white">Watchlist</h1>
              {watchlist.length > 0 && (
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{watchlist.length} titles</p>
              )}
            </div>
          </div>
        </div>

        {watchlist.length > 0 && (
          <div className="w-full px-6 md:px-12 pb-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search watchlist..."
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-white/10 focus:border-[var(--accent)]/50 rounded-xl pl-10 pr-10 py-2.5 text-sm outline-none transition-all placeholder-[var(--text-muted)]"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/5 rounded-full">
                  <X className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-0.5">
              {(["all", "anime", "movie", "tv"] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all duration-200 ${
                    filterType === type 
                      ? "bg-[var(--accent)] text-white shadow-[0_0_16px_var(--accent-glow)]" 
                      : "bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-white hover:border-white/15"
                  }`}
                >
                  {type === "all" ? "All Items" : type === "anime" ? "Anime" : type === "movie" ? "Movies" : "TV Shows"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-full px-6 md:px-12 py-8">
        {watchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center mb-6">
              <Bookmark className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
            <p className="text-xl font-black font-sora text-white mb-2">Watchlist is Empty</p>
            <p className="text-sm text-[var(--text-muted)] mb-8">Save shows and movies to watch later</p>
            <Link href="/" className="px-6 py-2.5 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] text-white rounded-full text-sm font-bold hover:shadow-[0_0_25px_var(--accent-glow)] transition-all duration-300">
              Browse Content
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-black text-white text-lg mb-1">No results for &ldquo;{search}&rdquo;</p>
            <p className="text-sm text-[var(--text-muted)]">Try a different title or clear filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 md:gap-6">
            {filtered.map((entry) => (
              <div 
                key={entry.id} 
                className="group relative rounded-2xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent)]/50 hover:shadow-[0_4px_30px_-8px_var(--accent-glow)] hover:-translate-y-1 transition-all duration-300 aspect-[2/3]"
              >
                <Link href={getWatchlistLink(entry)} className="block w-full h-full">
                  {entry.poster ? (
                    <img src={entry.poster} alt={entry.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full bg-black/40 flex items-center justify-center">
                      <Play className="w-10 h-10 text-white/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center transform scale-50 group-hover:scale-100 transition-transform">
                      <Play className="w-6 h-6 text-white fill-current ml-1" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 p-3 flex flex-col justify-end">
                    <h3 className="font-bold text-xs text-white line-clamp-1 group-hover:line-clamp-2 transition-all font-sora shadow-md">{entry.title}</h3>
                    <p className="text-[10px] text-white/70 uppercase tracking-wider mt-1">{entry.type}</p>
                  </div>
                </Link>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeFromWatchlist(entry.id);
                  }}
                  className="absolute top-2 right-2 p-1.5 md:p-2 bg-red-500/80 backdrop-blur-md rounded-lg text-white opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:scale-110 transition-all z-10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
