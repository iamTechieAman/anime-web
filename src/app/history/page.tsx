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
      {/* Sticky header with glassmorphism */}
      <div className="sticky top-0 z-40 bg-[var(--bg-main)]/80 backdrop-blur-xl border-b border-white/5">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
        <div className="w-full px-6 md:px-12 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-black font-sora tracking-tight text-white">Watch History</h1>
              {history.length > 0 && (
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{history.length} titles</p>
              )}
            </div>
          </div>
          {history.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-all border border-red-500/20 hover:border-red-500/40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </button>
          )}
        </div>
        {history.length > 0 && (
          <div className="w-full px-6 md:px-12 pb-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your history..."
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-white/10 focus:border-orange-500/50 rounded-xl pl-10 pr-10 py-2.5 text-sm outline-none transition-all placeholder-[var(--text-muted)]"
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
                      ? "bg-orange-500 text-white shadow-[0_0_16px_rgba(249,115,22,0.25)]"
                      : "bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-white hover:border-white/15"
                  }`}
                >
                  {type === "all" ? "All" : type === "anime" ? "Anime" : type === "movie" ? "Movies" : "TV Shows"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-full px-6 md:px-12 py-8">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center mb-6">
              <Clock className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
            <p className="text-xl font-black font-sora text-white mb-2">No Watch History</p>
            <p className="text-sm text-[var(--text-muted)] mb-8">Content you watch will appear here automatically</p>
            <Link href="/" className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-blue-600 text-white rounded-full text-sm font-bold hover:shadow-[0_0_25px_rgba(249,115,22,0.3)] transition-all duration-300">
              Browse Movies &amp; Anime
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-black text-white text-lg mb-1">No results for &ldquo;{search}&rdquo;</p>
            <p className="text-sm text-[var(--text-muted)]">Try a different title or clear filters</p>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(grouped).map(([date, entries]) => (
              <div key={date}>
                {/* Date Group Header */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249, 115, 22, 0.7)]" />
                  <h2 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-[0.15em]">{date}</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-orange-500/20 to-transparent" />
                  <span className="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--bg-card)] px-2 py-0.5 rounded-full border border-[var(--border-color)]">
                    {entries.length} {entries.length === 1 ? "title" : "titles"}
                  </span>
                </div>

                {/* History Rows */}
                <div className="space-y-2.5">
                  {entries.map((entry) => {
                    const progressPct = formatProgress(entry.currentTime, entry.duration);
                    const progressNum = entry.duration > 0
                      ? Math.min(100, Math.round((entry.currentTime / entry.duration) * 100))
                      : 0;
                    return (
                      <div
                        key={entry.id}
                        className="group flex items-stretch rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-orange-500/30 hover:shadow-[0_4px_30px_-8px_rgba(249,115,22,0.2)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
                      >
                        {/* Left color accent bar */}
                        <div
                          className="w-1 shrink-0"
                          style={{
                            background: progressNum > 80
                              ? 'linear-gradient(to bottom, #4ade80, #22c55e)'
                              : progressNum > 0
                              ? 'linear-gradient(to bottom, #9d72ff, #3b82f6)'
                              : 'rgba(255,255,255,0.04)'
                          }}
                        />
                        {/* Thumbnail */}
                        <div className="relative w-28 md:w-36 shrink-0 bg-black/40 overflow-hidden">
                          {entry.poster && (
                            <img
                              src={entry.poster}
                              alt={entry.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          )}
                          <div className="absolute bottom-0 inset-x-0 h-1 bg-white/10">
                            <div
                              className="h-full transition-all duration-700"
                              style={{
                                width: progressPct,
                                background: progressNum > 80 ? 'linear-gradient(to right, #4ade80, #22c55e)' : 'linear-gradient(to right, #9d72ff, #3b82f6)'
                              }}
                            />
                          </div>
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                              <Play className="w-4 h-4 text-black fill-black ml-0.5" />
                            </div>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between p-4 py-3.5">
                          <div className="space-y-1.5">
                            <Link href={getHistoryLink(entry)} className="block group/link">
                              <h3 className="font-black text-sm md:text-base text-white line-clamp-1 font-sora group-hover/link:text-orange-400 transition-colors tracking-tight">
                                {entry.title}
                              </h3>
                            </Link>
                            <div className="flex items-center gap-2 flex-wrap">
                              {entry.type && (
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  entry.type === 'anime' ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20'
                                  : entry.type === 'movie' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                }`}>
                                  {entry.type}
                                </span>
                              )}
                              {entry.episodeId && (
                                <span className="text-[10px] font-bold text-[var(--text-muted)]">
                                  {entry.type === 'tv' ? `S1 \u00b7 E${entry.episodeId}` : `Ep ${entry.episodeNumber || entry.episodeId}`}
                                </span>
                              )}
                              <span className="text-[10px] text-[var(--text-muted)]">&middot;</span>
                              <span className="text-[10px] font-medium text-[var(--text-muted)]">{relativeTime(entry.updatedAt)}</span>
                            </div>
                          </div>
                          {entry.duration > 0 && (
                            <div className="mt-2.5 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Progress</span>
                                <span className={`text-[9px] font-black ${progressNum > 80 ? 'text-green-400' : 'text-orange-400'}`}>{progressPct}</span>
                              </div>
                              <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{
                                    width: progressPct,
                                    background: progressNum > 80 ? 'linear-gradient(to right, #4ade80, #22c55e)' : 'linear-gradient(to right, #9d72ff, #3b82f6)'
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col items-center justify-center gap-2 px-3 md:px-4 py-3 shrink-0 border-l border-[var(--border-color)]">
                          <Link
                            href={getHistoryLink(entry)}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-500/80 hover:bg-orange-500 text-white rounded-xl text-xs font-black transition-all duration-200 hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] whitespace-nowrap"
                          >
                            <Play className="w-3 h-3 fill-white" />
                            <span className="hidden sm:inline">Resume</span>
                          </Link>
                          <button
                            onClick={() => removeFromHistory(entry.id)}
                            className="p-2 text-[var(--text-muted)] hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                            aria-label="Remove from history"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
