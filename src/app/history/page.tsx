"use client";

import { useState, useEffect, useRef } from "react";
import { Clock, Trash2, Play, Search, X, Download, CheckSquare, Square, ChevronRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useWatch } from "@/context/WatchContext";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function HistoryPage() {
  const { history, clearHistory, removeFromHistory } = useWatch();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "anime" | "movie" | "tv">("all");
  const [isMounted, setIsMounted] = useState(false);
  
  // Selection / Bulk Delete states
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Collapsible sections
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Virtualized loading
  const [visibleCount, setVisibleCount] = useState(15);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Intersection observer for infinite scroll / virtualization
  useEffect(() => {
    if (!isMounted || visibleCount >= history.length) return;
    
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount(prev => prev + 15);
      }
    }, { threshold: 0.1 });

    const target = observerTarget.current;
    if (target) observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [isMounted, visibleCount, history.length]);

  const handleClearAll = () => {
    if (confirm("Clear your entire watch history?")) {
      clearHistory();
      toast.success("Watch history cleared!");
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Remove the ${selectedIds.length} selected items from history?`)) {
      selectedIds.forEach(id => removeFromHistory(id));
      setSelectedIds([]);
      setIsSelectMode(false);
      toast.success("Selected history items removed!");
    }
  };

  const handleExportHistory = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `toonplayer_watch_history.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("Watch history exported successfully!");
    } catch (err) {
      toast.error("Failed to export history");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const filtered = history.filter((h) => {
    const matchesSearch = h.title.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || h.type === filterType;
    return matchesSearch && matchesType;
  });

  // Limit rendering to match visible virtual count
  const visibleItems = filtered.slice(0, visibleCount);

  // Group items by Day, Week, Month, Older
  const grouped: Record<string, typeof history> = {
    "Today": [],
    "Yesterday": [],
    "This Week": [],
    "This Month": [],
    "Older": []
  };

  visibleItems.forEach((entry) => {
    const entryDate = new Date(entry.updatedAt);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - entryDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (entryDate.toDateString() === today.toDateString()) {
      grouped["Today"].push(entry);
    } else if (diffDays <= 2) {
      grouped["Yesterday"].push(entry);
    } else if (diffDays <= 7) {
      grouped["This Week"].push(entry);
    } else if (diffDays <= 30) {
      grouped["This Month"].push(entry);
    } else {
      grouped["Older"].push(entry);
    }
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
    <main className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] pb-24 md:pb-10">
      {/* Sticky header */}
      <div className="sticky top-[56px] md:top-[64px] z-40 bg-[var(--bg-main)]/90 backdrop-blur-xl border-b border-white/5 px-6 md:px-12 py-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div>
              <h1 className="text-xl font-black font-sora tracking-tight text-white">Watch History</h1>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{history.length} titles watched</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <>
                <button
                  onClick={handleExportHistory}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                  title="Export Watch History as JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </button>
                <button
                  onClick={() => setIsSelectMode(!isSelectMode)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    isSelectMode ? 'bg-[var(--accent)] text-white border-transparent' : 'text-zinc-400 hover:text-white bg-white/5 border-white/10'
                  }`}
                >
                  {isSelectMode ? "Cancel Select" : "Bulk Select"}
                </button>
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-all border border-red-500/20 hover:border-red-500/40 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear All</span>
                </button>
              </>
            )}
          </div>
        </div>

        {history.length > 0 && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search history titles..."
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-white/10 focus:border-[var(--accent)]/50 rounded-xl pl-10 pr-10 py-2.5 text-sm outline-none transition-all text-white placeholder-zinc-500"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/5 rounded-full">
                  <X className="w-3.5 h-3.5 text-zinc-500" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
              {(["all", "anime", "movie", "tv"] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    filterType === type
                      ? "bg-[var(--accent)] text-white shadow-[0_0_16px_var(--accent-glow)]"
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
              <Clock className="w-8 h-8 text-zinc-500" />
            </div>
            <p className="text-xl font-black font-sora text-white mb-2">No Watch History</p>
            <p className="text-sm text-zinc-500 mb-8">Content you watch will appear here automatically</p>
            <Link href="/" className="px-6 py-2.5 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] text-white rounded-full text-sm font-bold hover:shadow-[0_0_25px_var(--accent-glow)] transition-all duration-300">
              Browse Catalog
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-black text-white text-lg mb-1">No matches found</p>
            <p className="text-sm text-zinc-500">Try adjusting your filters or search keywords.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([sectionName, entries]) => {
              if (entries.length === 0) return null;
              const isCollapsed = collapsedSections[sectionName];
              
              return (
                <div key={sectionName} className="space-y-4">
                  {/* Collapsible Section Header */}
                  <button 
                    onClick={() => toggleSection(sectionName)}
                    className="w-full flex items-center justify-between py-2 border-b border-white/5 text-left cursor-pointer group/header"
                  >
                    <div className="flex items-center gap-3">
                      {isCollapsed ? <ChevronRight className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                      <span className="text-xs font-black text-white group-hover/header:text-[var(--accent)] transition-colors uppercase tracking-widest">{sectionName}</span>
                      <span className="text-[10px] text-zinc-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full font-bold">
                        {entries.length} items
                      </span>
                    </div>
                  </button>

                  {/* Rows */}
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3"
                      >
                        {entries.map((entry) => {
                          const progressPct = formatProgress(entry.currentTime, entry.duration);
                          const progressNum = entry.duration > 0
                            ? Math.min(100, Math.round((entry.currentTime / entry.duration) * 100))
                            : 0;
                          const isSelected = selectedIds.includes(entry.id);
                          
                          return (
                            <div
                              key={entry.id}
                              className={`group flex items-stretch rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent)]/30 hover:shadow-[0_4px_30px_-8px_var(--accent-glow)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden ${
                                isSelected ? 'border-[var(--accent)] bg-[var(--accent)]/5' : ''
                              }`}
                            >
                              {/* Selection overlay */}
                              {isSelectMode && (
                                <button 
                                  onClick={() => toggleSelect(entry.id)}
                                  className="px-4 flex items-center justify-center bg-white/5 border-r border-white/5 cursor-pointer text-zinc-400 hover:text-[var(--accent)]"
                                >
                                  {isSelected ? <CheckSquare className="w-5 h-5 text-[var(--accent)]" /> : <Square className="w-5 h-5" />}
                                </button>
                              )}

                              {/* Progress bar line indicators */}
                              <div
                                className="w-1 shrink-0"
                                style={{
                                  background: progressNum > 80
                                    ? 'linear-gradient(to bottom, #00D084, #14F195)'
                                    : progressNum > 0
                                    ? 'linear-gradient(to bottom, var(--accent), var(--accent-secondary))'
                                    : 'rgba(255,255,255,0.04)'
                                }}
                              />

                              {/* Thumbnail */}
                              <div className="relative w-28 md:w-36 shrink-0 bg-black/40 overflow-hidden select-none">
                                {entry.poster ? (
                                  <img
                                    src={entry.poster}
                                    alt=""
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">No Cover</div>
                                )}
                                <div className="absolute bottom-0 inset-x-0 h-1 bg-white/10">
                                  <div
                                    className="h-full transition-all duration-700"
                                    style={{
                                      width: progressPct,
                                      background: progressNum > 80 ? 'linear-gradient(to right, #00D084, #14F195)' : 'linear-gradient(to right, var(--accent), var(--accent-secondary))'
                                    }}
                                  />
                                </div>
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Link href={getHistoryLink(entry)} className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
                                    <Play className="w-3.5 h-3.5 text-black fill-black ml-0.5" />
                                  </Link>
                                </div>
                              </div>

                              {/* Detail Content */}
                              <div className="flex-1 min-w-0 flex flex-col justify-between p-4 py-3.5">
                                <div className="space-y-1.5">
                                  <Link href={getHistoryLink(entry)} className="block group/link">
                                    <h3 className="font-black text-sm md:text-base text-white line-clamp-1 font-sora group-hover/link:text-[var(--accent)] transition-colors tracking-tight">
                                      {entry.title}
                                    </h3>
                                  </Link>
                                  <div className="flex items-center gap-2 flex-wrap select-none">
                                    {entry.type && (
                                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                        entry.type === 'anime' ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                                        : entry.type === 'movie' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                        : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                      }`}>
                                        {entry.type}
                                      </span>
                                    )}
                                    {entry.episodeId && (
                                      <span className="text-[10px] font-bold text-zinc-500">
                                        {entry.type === 'tv' ? `S1 \u00b7 E${entry.episodeId}` : `Ep ${entry.episodeNumber || entry.episodeId}`}
                                      </span>
                                    )}
                                    <span className="text-[10px] text-zinc-500">&middot;</span>
                                    <span className="text-[10px] font-semibold text-zinc-400">{relativeTime(entry.updatedAt)}</span>
                                  </div>
                                </div>
                                
                                {entry.duration > 0 && (
                                  <div className="mt-2 space-y-1 select-none">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Progress</span>
                                      <span className={`text-[9px] font-black ${progressNum > 80 ? 'text-emerald-400' : 'text-[var(--accent)]'}`}>{progressPct}</span>
                                    </div>
                                    <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                                      <div
                                        className="h-full rounded-full transition-all duration-700"
                                        style={{
                                          width: progressPct,
                                          background: progressNum > 80 ? 'linear-gradient(to right, #00D084, #14F195)' : 'linear-gradient(to right, var(--accent), var(--accent-secondary))'
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Card Actions */}
                              <div className="flex flex-col items-center justify-center gap-2 px-3 md:px-4 py-3 shrink-0 border-l border-[var(--border-color)] select-none">
                                <Link
                                  href={getHistoryLink(entry)}
                                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[var(--accent)]/80 hover:bg-[var(--accent)] text-white rounded-xl text-xs font-black transition-all duration-200 hover:shadow-[0_0_20px_var(--accent-glow)] whitespace-nowrap"
                                >
                                  <Play className="w-3 h-3 fill-white" />
                                  <span className="hidden sm:inline">Resume</span>
                                </Link>
                                <button
                                  onClick={() => {
                                    removeFromHistory(entry.id);
                                    toast.success("Removed from watch history");
                                  }}
                                  className="p-2 text-zinc-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10 cursor-pointer"
                                  aria-label="Remove from history"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {/* Incremental loading anchor target */}
        {visibleCount < filtered.length && (
          <div ref={observerTarget} className="h-14 w-full flex items-center justify-center mt-8">
            <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Floating Multi-Select Delete Action Banner */}
      <AnimatePresence>
        {isSelectMode && selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90vw] max-w-md bg-zinc-950/90 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-2xl flex items-center justify-between gap-4"
          >
            <div>
              <p className="text-xs font-bold text-white">{selectedIds.length} items selected</p>
              <p className="text-[10px] text-zinc-500">Remove selected items permanently</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setSelectedIds([])}
                className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-zinc-300 hover:text-white transition-all cursor-pointer"
              >
                Clear
              </button>
              <button 
                onClick={handleBulkDelete}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-black text-white transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
