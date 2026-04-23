"use client";

import { useState, useEffect } from "react";
import { Clock, Trash2, Play, Search, X } from "lucide-react";
import Link from "next/link";
import { useWatch } from "@/context/WatchContext";

export default function HistoryPage() {
  const { history, clearHistory, removeFromHistory } = useWatch();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "anime" | "movie" | "tv">("all");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleClearAll = () => {
    if (confirm("Clear your entire watch history?")) {
      clearHistory();
    }
  };

  const filtered = history.filter((h) => {
    const matchesSearch = h.title.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || h.type === filterType;
    return matchesSearch && matchesType;
  });

  const grouped: Record<string, typeof history> = {};
  filtered.forEach((entry) => {
    // History is sorted by updatedAt from context
    const date = new Date(entry.updatedAt).toLocaleDateString(undefined, {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(entry);
  });

  const relativeTime = (ts: number) => {
    const diff = (Date.now() - ts) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getHistoryLink = (entry: typeof history[0]) => {
    if (entry.type === 'movie') {
      return `/watch/movie/${entry.showId}`;
    }
    if (entry.type === 'tv') {
      const season = (entry as any).season || 1;
      const episode = entry.episodeId || entry.episodeNumber || 1;
      return `/watch/tv/${entry.showId}?s=${season}&e=${episode}`;
    }
    return `/watch/anime/${entry.showId}?ep=${entry.episodeId || 1}`;
  };

  const formatProgress = (current: number, total: number) => {
    if (!total || total <= 0) return '0%';
    return `${Math.min(100, Math.round((current / total) * 100))}%`;
  };

  if (!isMounted) return null;

  return (
    <main className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] pt-16 md:pt-0 pb-24 md:pb-10 md:pl-[72px]">
      <div className="sticky top-0 z-40 bg-[var(--bg-overlay)] backdrop-blur-md border-b border-[var(--border-color)]">
        <div className="w-full px-6 md:px-12 px-4 md:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-purple-400" />
            <h1 className="text-xl md:text-2xl font-bold font-sora">Watch History</h1>
          </div>
          {history.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/30 hover:border-red-500/50"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>

        {history.length > 0 && (
          <div className="w-full px-6 md:px-12 px-4 md:px-6 pb-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search history..."
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
                  {type === "all" ? "All History" : type === "anime" ? "Anime" : type === "movie" ? "Movies" : "TV Shows"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-full px-6 md:px-12 px-4 md:px-6 py-8">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center opacity-50">
            <Clock className="w-16 h-16 mb-4 text-[var(--text-muted)]" />
            <p className="text-xl font-bold">No Watch History</p>
            <p className="text-sm text-[var(--text-muted)] mt-2">Content you watch will appear here</p>
            <Link href="/" className="mt-6 px-6 py-2 bg-purple-600 text-white rounded-full text-sm font-bold hover:bg-purple-700 transition-colors">
              Browse Movies & Anime
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 opacity-50">
            <p className="font-semibold">No results for "{search}"</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([date, entries]) => (
              <div key={date}>
                <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-8 h-px bg-[var(--border-color)]" />
                  {date}
                </h2>
                <div className="space-y-3">
                  {entries.map((entry, i) => (
                    <div key={entry.id} className="group flex items-center gap-4 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-white/10 transition-all">
                      <div className="relative w-24 md:w-32 aspect-video rounded-lg overflow-hidden shrink-0 bg-black/40">
                        {entry.poster && (
                          <img src={entry.poster} alt={entry.title} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
                          <div 
                            className="h-full bg-purple-500" 
                            style={{ width: formatProgress(entry.currentTime, entry.duration) }}
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-6 h-6 text-white fill-white shadow-lg" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <Link href={getHistoryLink(entry)} className="hover:text-purple-400 transition-colors">
                          <h3 className="font-semibold text-sm md:text-base line-clamp-1 font-sora">{entry.title}</h3>
                        </Link>
                        {entry.episodeId && (
                            <p className="text-xs text-purple-400 font-bold mt-1">
                                {entry.type === 'tv' ? `Episode ${entry.episodeId}` : `Episode ${entry.episodeNumber || entry.episodeId}`}
                            </p>
                        )}
                        <p className="text-[10px] md:text-xs text-[var(--text-muted)] mt-1.5">{relativeTime(entry.updatedAt)}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={getHistoryLink(entry)}
                          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-[var(--border-color)] rounded-lg text-xs font-bold transition-colors"
                        >
                          <Play className="w-3 h-3 fill-white" /> Resume
                        </Link>
                        <button
                          onClick={() => removeFromHistory(entry.id)}
                          className="p-1.5 md:p-2 text-[var(--text-muted)] hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
