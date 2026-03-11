"use client";

import { useState, useEffect } from "react";
import { Clock, Trash2, Play, Search, X } from "lucide-react";
import Link from "next/link";

type HistoryEntry = {
  id: string;
  title: string;
  thumbnail?: string;
  episode: string;
  provider: string;
  watchedAt: number;
};

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [search, setSearch] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const stored = localStorage.getItem("watchHistory");
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch { setHistory([]); }
    }
  }, []);

  const clearAll = () => {
    if (confirm("Clear your entire watch history?")) {
      localStorage.removeItem("watchHistory");
      setHistory([]);
    }
  };

  const removeEntry = (id: string, episode: string) => {
    const updated = history.filter((h) => !(h.id === id && h.episode === episode));
    setHistory(updated);
    localStorage.setItem("watchHistory", JSON.stringify(updated));
  };

  const filtered = history.filter((h) =>
    h.title.toLowerCase().includes(search.toLowerCase())
  );

  const grouped: Record<string, HistoryEntry[]> = {};
  filtered.forEach((entry) => {
    const date = new Date(entry.watchedAt).toLocaleDateString(undefined, {
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

  if (!isMounted) return null;

  return (
    <main className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] pt-16 md:pt-0 pb-24 md:pb-10 md:pl-[72px]">
      <div className="sticky top-0 z-40 bg-[var(--bg-overlay)] backdrop-blur-xl border-b border-[var(--border-color)]">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-purple-400" />
            <h1 className="text-xl md:text-2xl font-bold font-sora">Watch History</h1>
          </div>
          {history.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/30 hover:border-red-500/50"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>

        {history.length > 0 && (
          <div className="max-w-4xl mx-auto px-4 md:px-6 pb-4">
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
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center opacity-50">
            <Clock className="w-16 h-16 mb-4 text-[var(--text-muted)]" />
            <p className="text-xl font-bold">No Watch History</p>
            <p className="text-sm text-[var(--text-muted)] mt-2">Anime you watch will appear here</p>
            <Link href="/" className="mt-6 px-6 py-2 bg-purple-600 text-white rounded-full text-sm font-bold hover:bg-purple-700 transition-colors">
              Browse Anime
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
                    <div key={`${entry.id}-${entry.episode}-${i}`} className="group flex items-center gap-4 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-white/10 transition-all">
                      <div className="relative w-16 h-24 rounded-lg overflow-hidden shrink-0 bg-black/20">
                        {entry.thumbnail && (
                          <img src={entry.thumbnail} alt={entry.title} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-5 h-5 text-white fill-white" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <Link href={`/watch/${entry.id}?provider=${entry.provider}&ep=${entry.episode}`} className="hover:text-purple-400 transition-colors">
                          <h3 className="font-semibold text-sm line-clamp-1 font-sora">{entry.title}</h3>
                        </Link>
                        <p className="text-xs text-purple-400 font-bold mt-1">Episode {entry.episode}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">{relativeTime(entry.watchedAt)}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/watch/${entry.id}?provider=${entry.provider}&ep=${entry.episode}`}
                          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-[var(--border-color)] rounded-lg text-xs font-bold transition-colors"
                        >
                          <Play className="w-3 h-3 fill-white" /> Resume
                        </Link>
                        <button
                          onClick={() => removeEntry(entry.id, entry.episode)}
                          className="p-1.5 text-[var(--text-muted)] hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
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
