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
    <main className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] pt-16 md:pt-0 pb-24 md:pb-10 md:pl-[72px]">
      <div className="sticky top-0 z-40 bg-[var(--bg-overlay)] backdrop-blur-md border-b border-[var(--border-color)]">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Bookmark className="w-6 h-6 text-purple-400" />
            <h1 className="text-xl md:text-2xl font-bold font-sora">Watchlist</h1>
          </div>
        </div>

        {watchlist.length > 0 && (
          <div className="max-w-4xl mx-auto px-4 md:px-6 pb-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search watchlist..."
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg pl-10 pr-10 py-2.5 text-sm outline-none focus:border-purple-500 transition-colors"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-[var(--text-muted)]" />
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-4 overflow-x-auto hide-scrollbar pb-1">
              {(["all", "anime", "movie", "tv"] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                    filterType === type ? "bg-purple-600 text-white" : "bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-white hover:border-white/20"
                  }`}
                >
                  {type === "all" ? "All Items" : type === "anime" ? "Anime" : type === "movie" ? "Movies" : "TV Shows"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        {watchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center opacity-50">
            <Bookmark className="w-16 h-16 mb-4 text-[var(--text-muted)]" />
            <p className="text-xl font-bold">Watchlist is Empty</p>
            <p className="text-sm text-[var(--text-muted)] mt-2">Save shows and movies to watch later</p>
            <Link href="/" className="mt-6 px-6 py-2 bg-purple-600 text-white rounded-full text-sm font-bold hover:bg-purple-700 transition-colors">
              Browse Content
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 opacity-50">
            <p className="font-semibold">No results for "{search}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map((entry) => (
              <div key={entry.id} className="group relative rounded-xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-purple-500/50 hover:shadow-lg transition-all aspect-[2/3]">
                <Link href={getWatchlistLink(entry)} className="block w-full h-full">
                  {entry.poster ? (
                    <img src={entry.poster} alt={entry.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full bg-black/40 flex items-center justify-center">
                      <Play className="w-10 h-10 text-white/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center transform scale-50 group-hover:scale-100 transition-transform">
                      <Play className="w-6 h-6 text-white fill-current ml-1" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 p-3 flex flex-col justify-end">
                    <h3 className="font-bold text-sm text-white line-clamp-2 md:line-clamp-1 group-hover:line-clamp-2 transition-all font-sora shadow-md">{entry.title}</h3>
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
