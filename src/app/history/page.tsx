"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Clock, Trash2, Play, Search, X, Download, CheckSquare,
  Square, ChevronRight, ChevronDown, Filter, RotateCcw,
  Calendar, Film, Tv2, Swords, Clock3, CheckCheck,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useWatch } from "@/context/WatchContext";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────
type FilterType = "all" | "anime" | "movie" | "tv";
type GroupMode  = "day" | "week" | "month";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function relativeTime(ts: number): string {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60)      return "Just now";
  if (diff < 3600)    return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)   return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800)  return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDuration(s: number): string {
  if (!s || s <= 0) return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// Group key generators
function getDayKey(d: Date): string {
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString())     return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function getWeekKey(d: Date): string {
  const now = new Date();
  const msPerWeek = 7 * 24 * 3600 * 1000;
  const diff = Math.floor((now.getTime() - d.getTime()) / msPerWeek);
  if (diff === 0) return "This Week";
  if (diff === 1) return "Last Week";
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  return `Week of ${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function getMonthKey(d: Date): string {
  const now = new Date();
  if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth())
    return "This Month";
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex flex-col items-center justify-center py-32 text-center select-none"
    >
      <div className="relative mb-8">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="w-24 h-24 rounded-3xl bg-gradient-to-br from-accent/20 to-accent-secondary/10 border border-accent/20 flex items-center justify-center"
        >
          <Clock3 className="w-10 h-10 text-accent" />
        </motion.div>
        {/* Floating decorators */}
        <motion.div
          animate={{ y: [-4, 4, -4], x: [2, -2, 2] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-accent-secondary/20 border border-accent-secondary/30 flex items-center justify-center"
        >
          <Play className="w-2.5 h-2.5 text-accent-secondary fill-accent-secondary" />
        </motion.div>
        <motion.div
          animate={{ y: [4, -4, 4], x: [-2, 2, -2] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-2 -left-2 w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/30"
        />
      </div>
      <h2 className="text-2xl font-black font-sora text-white mb-3">Nothing here yet</h2>
      <p className="text-sm text-zinc-400 max-w-xs mb-8 leading-relaxed">
        Start watching movies, anime or TV shows — they'll appear here automatically with your progress.
      </p>
      <Link
        href="/"
        scroll={false}
        className="px-8 py-3 bg-gradient-to-r from-accent to-accent-secondary text-white rounded-2xl text-sm font-black hover:shadow-[0_0_35px_var(--accent-glow)] transition-all duration-[250ms] hover:scale-105 active:scale-95"
      >
        Browse Catalog
      </Link>
    </motion.div>
  );
}

// ─── No Results ───────────────────────────────────────────────────────────────
function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
        <Search className="w-7 h-7 text-zinc-500" />
      </div>
      <p className="text-lg font-black text-white mb-1">No matches found</p>
      <p className="text-sm text-zinc-500 mb-5">Try different keywords or filters.</p>
      <button
        onClick={onClear}
        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-zinc-300 transition-all cursor-pointer"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Reset Filters
      </button>
    </motion.div>
  );
}

// ─── History Card ─────────────────────────────────────────────────────────────
interface HistoryCardProps {
  entry: ReturnType<typeof useWatch>["history"][0];
  isSelectMode: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  index: number;
}

function HistoryCard({ entry, isSelectMode, isSelected, onSelect, onRemove, index }: HistoryCardProps) {
  const progressPct = entry.duration > 0
    ? Math.min(100, Math.round((entry.currentTime / entry.duration) * 100))
    : 0;
  const isCompleted = progressPct >= 90;

  const href = useMemo(() => {
    if (entry.type === "movie") return `/watch/movie/${entry.showId}`;
    if (entry.type === "tv") {
      const s = (entry as any).season || 1;
      const e = entry.episodeId || entry.episodeNumber || 1;
      return `/watch/tv/${entry.showId}?s=${s}&e=${e}`;
    }
    return `/watch/anime/${entry.showId}?ep=${entry.episodeId || 1}`;
  }, [entry]);

  const typeStyle = entry.type === "anime"
    ? "bg-accent/10 text-accent border-accent/25"
    : entry.type === "movie"
    ? "bg-blue-500/10 text-blue-400 border-blue-500/25"
    : "bg-cyan-500/10 text-cyan-400 border-cyan-500/25";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      className={`group flex items-stretch rounded-2xl bg-bg-card border transition-all duration-[250ms] overflow-hidden ${
        isSelected
          ? "border-accent shadow-[0_0_20px_var(--accent-glow)]"
          : "border-border-color hover:border-accent/30 hover:shadow-[0_4px_30px_-8px_var(--accent-glow)] hover:-translate-y-0.5"
      }`}
    >
      {/* Selection checkbox */}
      {isSelectMode && (
        <button
          onClick={onSelect}
          className="px-4 flex items-center justify-center bg-white/3 border-r border-white/5 cursor-pointer text-zinc-400 hover:text-accent transition-colors shrink-0"
          aria-label={isSelected ? "Deselect" : "Select"}
        >
          <motion.div animate={{ scale: isSelected ? 1.1 : 1 }} transition={{ duration: 0.15 }}>
            {isSelected
              ? <CheckSquare className="w-5 h-5 text-accent" />
              : <Square className="w-5 h-5" />
            }
          </motion.div>
        </button>
      )}

      {/* Progress accent bar */}
      <div
        className="w-1 shrink-0 transition-all duration-[250ms]"
        style={{
          background: isCompleted
            ? "linear-gradient(to bottom, #10B981, #34D399)"
            : progressPct > 0
            ? "linear-gradient(to bottom, var(--accent), var(--accent-secondary))"
            : "rgba(255,255,255,0.04)"
        }}
      />

      {/* Thumbnail */}
      <div className="relative w-24 md:w-36 shrink-0 bg-black/40 overflow-hidden select-none">
        {entry.poster ? (
          <Image
            src={entry.poster}
            alt={entry.title || "Poster"}
            fill
            sizes="(max-width: 768px) 96px, 144px"
            className="object-cover transition-transform duration-[250ms] group-hover:scale-105 will-change-transform" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-700">
            <Film className="w-6 h-6" />
          </div>
        )}

        {/* Progress bar on thumbnail */}
        <div className="absolute bottom-0 inset-x-0 h-1 bg-white/10">
          <motion.div
            className="h-full rounded-r-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{
              background: isCompleted
                ? "linear-gradient(to right, #10B981, #34D399)"
                : "linear-gradient(to right, var(--accent), var(--accent-secondary))"
            }}
          />
        </div>

        {/* Hover play overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Link
            href={href}
            scroll={false}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform will-change-transform" 
            aria-label="Resume"
          >
            <Play className="w-4 h-4 text-black fill-black ml-0.5" />
          </Link>
        </div>

        {/* Completed badge */}
        {isCompleted && (
          <div className="absolute top-1.5 left-1.5 bg-emerald-500/90 backdrop-blur-sm rounded-full p-1">
            <CheckCheck className="w-2.5 h-2.5 text-white" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between p-4 py-3.5">
        <div className="space-y-1.5">
          <Link href={href} scroll={false} className="block">
            <h3 className="font-black text-sm md:text-base text-white line-clamp-1 font-sora tracking-tight hover:text-accent transition-colors">
              {entry.title}
            </h3>
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${typeStyle}`}>
              {entry.type}
            </span>
            {entry.episodeId && (
              <span className="text-[10px] font-bold text-zinc-500">
                {entry.type === "tv"
                  ? `S${(entry as any).season || 1} · E${entry.episodeId}`
                  : `Ep ${entry.episodeNumber || entry.episodeId}`}
              </span>
            )}
            <span className="text-zinc-600">·</span>
            <span className="text-[10px] font-semibold text-zinc-400">{relativeTime(entry.updatedAt)}</span>
          </div>
        </div>

        {/* Progress bar */}
        {entry.duration > 0 && (
          <div className="mt-2.5 space-y-1.5 select-none">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Progress</span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-zinc-500">{formatDuration(entry.currentTime)} / {formatDuration(entry.duration)}</span>
                <span className={`text-[9px] font-black ${isCompleted ? "text-emerald-400" : "text-accent"}`}>
                  {progressPct}%
                </span>
              </div>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/8 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
                style={{
                  background: isCompleted
                    ? "linear-gradient(to right, #10B981, #34D399)"
                    : "linear-gradient(to right, var(--accent), var(--accent-secondary))"
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center justify-center gap-2 px-3 md:px-4 py-3 shrink-0 border-l border-border-color select-none">
        <Link
          href={href}
          scroll={false}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02]/80 hover:bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] text-white rounded-xl text-xs font-black transition-all duration-200 hover:shadow-[0_0_20px_var(--accent-glow)] whitespace-nowrap"
        >
          <Play className="w-3 h-3 fill-white" />
          <span className="hidden sm:inline">{isCompleted ? "Rewatch" : "Resume"}</span>
        </Link>
        <button
          onClick={onRemove}
          className="p-2 text-zinc-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10 cursor-pointer"
          aria-label="Remove from history"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const { history, clearHistory, removeFromHistory, bulkRemoveFromHistory } = useWatch();
  const [search, setSearch]           = useState("");
  const [filterType, setFilterType]   = useState<FilterType>("all");
  const [groupMode, setGroupMode]     = useState<GroupMode>("day");
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [visibleCount, setVisibleCount] = useState(30);
  const [isMounted, setIsMounted]     = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => { setIsMounted(true); }, []);

  // Infinite scroll observer
  useEffect(() => {
    if (!isMounted) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setVisibleCount(prev => prev + 20); },
      { threshold: 0.1 }
    );
    const target = observerTarget.current;
    if (target) observer.observe(target);
    return () => { if (target) observer.unobserve(target); };
  }, [isMounted]);

  // ── Filtering / Grouping ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return history.filter(h => {
      const matchesSearch = !q || h.title.toLowerCase().includes(q);
      const matchesType   = filterType === "all" || h.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [history, search, filterType]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  const grouped = useMemo(() => {
    const groups: Map<string, typeof history> = new Map();
    visible.forEach(entry => {
      const d = new Date(entry.updatedAt);
      const key = groupMode === "day" ? getDayKey(d)
        : groupMode === "week" ? getWeekKey(d)
        : getMonthKey(d);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(entry);
    });
    return groups;
  }, [visible, groupMode]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    toast(
      (t) => (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-white">Clear entire watch history?</p>
          <p className="text-xs text-zinc-400">This cannot be undone.</p>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => { clearHistory(); toast.dismiss(t.id); toast.success("Watch history cleared"); }}
              className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-lg transition-all"
            >
              Clear All
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="flex-1 py-1.5 bg-white/10 text-white text-xs font-bold rounded-lg hover:bg-white/20 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      { duration: 10000, style: { background: "#18181B", border: "1px solid rgba(255,255,255,0.1)" } }
    );
  }, [clearHistory]);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.length === 0) return;
    bulkRemoveFromHistory(selectedIds);
    toast.success(`Removed ${selectedIds.length} item${selectedIds.length > 1 ? "s" : ""}`);
    setSelectedIds([]);
    setIsSelectMode(false);
  }, [selectedIds, bulkRemoveFromHistory]);

  const handleExport = useCallback(() => {
    try {
      const data = JSON.stringify(history, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `toonplayer_history_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("History exported!");
    } catch {
      toast.error("Export failed");
    }
  }, [history]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(filtered.map(e => e.id));
  }, [filtered]);

  const toggleSection = useCallback((key: string) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const resetFilters = useCallback(() => {
    setSearch(""); setFilterType("all"); setGroupMode("day");
  }, []);

  if (!isMounted) return null;

  const filterIcons = { all: Filter, anime: Swords, movie: Film, tv: Tv2 } as const;
  const filterLabels = { all: "All", anime: "Anime", movie: "Movies", tv: "TV Shows" } as const;
  const groupLabels: Record<GroupMode, string> = { day: "Day", week: "Week", month: "Month" };

  return (
    <main className="min-h-dvh bg-bg-main text-[var(--text-main)] pb-24 md:pb-10">

      {/* ── Sticky Toolbar ───────────────────────────────────────── */}
      <div className="sticky top-[56px] md:top-[64px] z-40 bg-bg-main/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[1800px] mx-auto px-4 md:px-10 py-3 space-y-3">

          {/* Row 1: Title + Actions */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-accent" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-black font-sora tracking-tight text-white">Watch History</h1>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  {history.length} title{history.length !== 1 ? "s" : ""} watched
                </p>
              </div>
            </div>

            {history.length > 0 && (
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white bg-white/5 border border-white/8 hover:bg-white/10 transition-all cursor-pointer"
                  title="Export as JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </button>

                {isSelectMode && selectedIds.length < filtered.length && (
                  <button
                    onClick={selectAll}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white bg-white/5 border border-white/8 hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">All</span>
                  </button>
                )}

                <button
                  onClick={() => { setIsSelectMode(!isSelectMode); setSelectedIds([]); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    isSelectMode
                      ? "bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] text-white border-transparent"
                      : "text-zinc-400 hover:text-white bg-white/5 border-white/8 hover:bg-white/10"
                  }`}
                >
                  {isSelectMode ? <X className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{isSelectMode ? "Cancel" : "Select"}</span>
                </button>

                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all border border-red-500/20 hover:border-red-500/40 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear All</span>
                </button>
              </div>
            )}
          </div>

          {/* Row 2: Search + Filters */}
          {history.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search history..."
                  className="w-full bg-bg-card border border-border-color hover:border-white/12 focus:border-accent/50 rounded-xl pl-10 pr-10 py-2.5 text-sm outline-none transition-all text-white placeholder-zinc-600"
                />
                <AnimatePresence>
                  {search && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/8 rounded-full"
                    >
                      <X className="w-3.5 h-3.5 text-zinc-500" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {/* Filters row */}
              <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar shrink-0">
                {/* Type filter chips */}
                {(["all", "anime", "movie", "tv"] as FilterType[]).map(t => {
                  const Icon = filterIcons[t];
                  return (
                    <button
                      key={t}
                      onClick={() => setFilterType(t)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer border ${
                        filterType === t
                          ? "bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] text-white border-transparent shadow-[0_0_12px_var(--accent-glow)]"
                          : "bg-bg-card border-border-color text-zinc-400 hover:text-white hover:border-white/15"
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {filterLabels[t]}
                    </button>
                  );
                })}

                {/* Separator */}
                <div className="w-px h-5 bg-white/8 mx-1 shrink-0" />

                {/* Group mode */}
                <div className="flex items-center gap-0.5 bg-bg-card border border-border-color rounded-xl p-0.5 shrink-0">
                  {(["day", "week", "month"] as GroupMode[]).map(g => (
                    <button
                      key={g}
                      onClick={() => setGroupMode(g)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        groupMode === g
                          ? "bg-white/10 text-white"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {groupLabels[g]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="max-w-[1800px] mx-auto px-4 md:px-10 py-8">
        {history.length === 0 ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <NoResults onClear={resetFilters} />
        ) : (
          <motion.div layout className="space-y-10">
            {[...grouped.entries()].map(([sectionKey, entries]) => {
              if (entries.length === 0) return null;
              const isCollapsed = collapsedSections[sectionKey];
              return (
                <div key={sectionKey}>
                  {/* Section header */}
                  <button
                    onClick={() => toggleSection(sectionKey)}
                    className="w-full flex items-center justify-between py-2 mb-4 text-left cursor-pointer group/header"
                    aria-expanded={!isCollapsed}
                  >
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{ rotate: isCollapsed ? -90 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-4 h-4 text-zinc-500 group-hover/header:text-accent transition-colors" />
                      </motion.div>
                      <div className="flex items-center gap-2.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-xs font-black text-white group-hover/header:text-accent transition-colors uppercase tracking-widest">
                          {sectionKey}
                        </span>
                        <span className="text-[10px] text-zinc-500 bg-white/5 border border-white/8 px-2 py-0.5 rounded-full font-bold">
                          {entries.length}
                        </span>
                      </div>
                    </div>
                    <div className="h-px flex-1 bg-white/5 ml-4" />
                  </button>

                  {/* Cards */}
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div
                        key="section-content"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="space-y-3 overflow-hidden"
                      >
                        <AnimatePresence>
                          {entries.map((entry, idx) => (
                            <HistoryCard
                              key={entry.id}
                              entry={entry}
                              index={idx}
                              isSelectMode={isSelectMode}
                              isSelected={selectedIds.includes(entry.id)}
                              onSelect={() => toggleSelect(entry.id)}
                              onRemove={() => {
                                removeFromHistory(entry.id);
                                toast.success("Removed from history");
                              }}
                            />
                          ))}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* Infinite scroll sentinel */}
        {visibleCount < filtered.length && (
          <div ref={observerTarget} className="h-16 flex items-center justify-center mt-6">
            <div className="flex items-center gap-3 text-zinc-500">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold">Loading more...</span>
            </div>
          </div>
        )}

        {/* Show total count */}
        {filtered.length > 0 && visibleCount >= filtered.length && (
          <div className="text-center mt-8">
            <p className="text-xs text-zinc-600 font-semibold">
              Showing all {filtered.length} {filtered.length === 1 ? "item" : "items"}
            </p>
          </div>
        )}
      </div>

      {/* ── Bulk Delete Floating Banner ──────────────────────────── */}
      <AnimatePresence>
        {isSelectMode && selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[92vw] max-w-md bg-zinc-950/95 border border-white/10 rounded-2xl px-5 py-4 shadow-2xl backdrop-blur-2xl flex items-center justify-between gap-4"
          >
            <div>
              <p className="text-sm font-black text-white">{selectedIds.length} item{selectedIds.length > 1 ? "s" : ""} selected</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Tap delete to remove permanently</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIds([])}
                className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-zinc-300 hover:text-white transition-all cursor-pointer"
              >
                Deselect
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-black text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
