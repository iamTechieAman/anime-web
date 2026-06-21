"use client";

import {
  useState, useEffect, useRef, useCallback, useMemo
} from "react";
import {
  Bookmark, Trash2, Play, Search, X, LayoutGrid, List,
  FolderPlus, Tag, ArrowUpDown, Plus, GripVertical,
  Star, Clock4, CheckCircle2, Folder, ChevronDown,
  Swords, Film, Tv2, Filter,
} from "lucide-react";
import Link from "next/link";
import { useWatch, WatchlistItem } from "@/context/WatchContext";
import toast from "react-hot-toast";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import Image from "next/image";

// ─── Types ────────────────────────────────────────────────────────────────────
type FilterType = "all" | "anime" | "movie" | "tv";
type SortMode   = "date" | "alpha" | "type";
type ViewMode   = "grid" | "list";

const BUILTIN_ICONS: Record<string, React.ReactNode> = {
  "Favorites":  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />,
  "To Watch":   <Clock4 className="w-3 h-3 text-blue-400" />,
  "Completed":  <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
};

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
          animate={{ y: [-4, 4, -4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent-secondary)]/10 border border-[var(--accent)]/20 flex items-center justify-center"
        >
          <Bookmark className="w-10 h-10 text-[var(--accent)]" />
        </motion.div>
        <motion.div
          animate={{ y: [-3, 3, -3], x: [2, -2, 2] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center"
        >
          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
        </motion.div>
        <motion.div
          animate={{ y: [3, -3, 3], x: [-2, 2, -2] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-2 -left-2 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center"
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        </motion.div>
      </div>
      <h2 className="text-2xl font-black font-sora text-white mb-3">Your watchlist is empty</h2>
      <p className="text-sm text-zinc-400 max-w-xs mb-8 leading-relaxed">
        Tap <span className="text-[var(--accent)] font-bold">Add to Watchlist</span> on any title to save it here, organized by folders and tags.
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="px-6 py-3 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] text-white rounded-2xl text-sm font-black hover:shadow-[0_0_35px_var(--accent-glow)] transition-all duration-300 hover:scale-105 active:scale-95"
        >
          Browse Catalog
        </Link>
        <Link
          href="/ai"
          className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl text-sm font-bold transition-all duration-300 hover:scale-105 active:scale-95"
        >
          AI Discovery
        </Link>
      </div>
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
      <p className="text-sm text-zinc-500 mb-5">Try a different folder, tag, or search keyword.</p>
      <button
        onClick={onClear}
        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-zinc-300 transition-all cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
        Reset Filters
      </button>
    </motion.div>
  );
}

// ─── Tag Input (Inline, no prompt()) ─────────────────────────────────────────
interface TagInputProps {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
}

function TagInput({ tags, onAdd, onRemove }: TagInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = value.trim().toLowerCase().replace(/\s+/g, "-");
    if (trimmed && !tags.includes(trimmed)) {
      onAdd(trimmed);
    }
    setValue("");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") { setValue(""); setIsEditing(false); }
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-2">
      {tags.map(tag => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] text-[10px] font-bold rounded-lg"
        >
          #{tag}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(tag); }}
            className="ml-0.5 hover:text-red-400 transition-colors leading-none"
            aria-label="Remove tag"
          >
            ×
          </button>
        </span>
      ))}

      {isEditing ? (
        <form onSubmit={handleSubmit} className="flex items-center gap-1">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => { if (!value.trim()) setIsEditing(false); else handleSubmit(); }}
            placeholder="tag name…"
            maxLength={24}
            className="w-20 bg-white/5 border border-[var(--accent)]/30 rounded-lg px-2 py-0.5 text-[10px] text-white outline-none focus:border-[var(--accent)]/60 font-bold"
          />
        </form>
      ) : (
        <button
          onClick={() => { setIsEditing(true); }}
          className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-zinc-500 hover:text-zinc-300 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
          aria-label="Add tag"
        >
          <Plus className="w-2.5 h-2.5" />
          Tag
        </button>
      )}
    </div>
  );
}

// ─── Grid Card ────────────────────────────────────────────────────────────────
interface GridCardProps {
  entry: WatchlistItem;
  collections: string[];
  onRemove: () => void;
  onUpdateCollection: (c: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  href: string;
}

function GridCard({ entry, collections, onRemove, onUpdateCollection, href }: GridCardProps) {
  const [showCollections, setShowCollections] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="group relative rounded-2xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent)]/50 hover:shadow-[0_8px_40px_-8px_var(--accent-glow)] hover:-translate-y-1 transition-all duration-300 aspect-[2/3]"
    >
      <Link href={href} className="absolute inset-0 block w-full h-full select-none">
        {entry.poster ? (
          <Image src={entry.poster} alt={entry.title || "Poster"} fill sizes="(max-width: 640px) 150px, 200px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--bg-elevated)] to-[var(--bg-card)] flex items-center justify-center">
            <Play className="w-10 h-10 text-white/10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-[var(--accent)] flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-300 shadow-[0_0_30px_var(--accent-glow)]">
            <Play className="w-6 h-6 text-white fill-white ml-1" />
          </div>
        </div>
      </Link>

      {/* Info overlay */}
      <div className="relative z-10 absolute bottom-0 inset-x-0 p-3 pointer-events-none">
        <h3 className="font-black text-xs text-white line-clamp-2 font-sora mb-1.5">{entry.title}</h3>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[8px] bg-white/15 border border-white/10 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
            {entry.type}
          </span>
          {entry.collection && entry.collection !== "All" && (
            <span className="text-[8px] bg-[var(--accent)]/15 text-[var(--accent)] px-1.5 py-0.5 rounded font-bold border border-[var(--accent)]/20">
              {entry.collection}
            </span>
          )}
        </div>
        {entry.tags.length > 0 && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {entry.tags.slice(0, 2).map(tag => (
              <span key={tag} className="text-[8px] text-[var(--accent)] font-bold">#{tag}</span>
            ))}
            {entry.tags.length > 2 && <span className="text-[8px] text-zinc-500">+{entry.tags.length - 2}</span>}
          </div>
        )}
      </div>

      {/* Top controls */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-200 z-20">
        {/* Collection picker */}
        <div className="relative">
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); setShowCollections(!showCollections); }}
            className="bg-black/80 backdrop-blur-md border border-white/10 rounded-lg text-[9px] text-zinc-200 font-bold px-2 py-1 cursor-pointer flex items-center gap-1 hover:bg-black/90 transition-all"
          >
            <Folder className="w-2.5 h-2.5" />
            {entry.collection}
            <ChevronDown className="w-2 h-2" />
          </button>
          <AnimatePresence>
            {showCollections && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-7 left-0 bg-zinc-950/98 border border-white/10 rounded-xl overflow-hidden z-50 min-w-[120px] shadow-2xl backdrop-blur-xl"
                onClick={e => e.stopPropagation()}
              >
                {collections.map(c => (
                  <button
                    key={c}
                    onClick={() => { onUpdateCollection(c); setShowCollections(false); }}
                    className={`w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-white/10 transition-colors flex items-center gap-2 ${
                      entry.collection === c ? "text-[var(--accent)]" : "text-zinc-300"
                    }`}
                  >
                    {BUILTIN_ICONS[c] || <Folder className="w-2.5 h-2.5 text-zinc-500" />}
                    {c}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
          className="p-1.5 bg-red-600/90 hover:bg-red-500 text-white rounded-lg transition-all active:scale-90"
          aria-label="Remove from watchlist"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── List Row (Draggable) ─────────────────────────────────────────────────────
interface ListRowProps {
  entry: WatchlistItem;
  collections: string[];
  onRemove: () => void;
  onUpdateCollection: (c: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  href: string;
  isDragEnabled: boolean;
}

function ListRow({ entry, collections, onRemove, onUpdateCollection, onAddTag, onRemoveTag, href, isDragEnabled }: ListRowProps) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={entry}
      dragListener={false}
      dragControls={dragControls}
      as="div"
      className="group flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent)]/30 hover:shadow-[0_4px_24px_-8px_var(--accent-glow)] rounded-2xl p-3.5 transition-all duration-300"
    >
      {/* Drag handle */}
      {isDragEnabled && (
        <div
          className="cursor-grab active:cursor-grabbing touch-none shrink-0 p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
          onPointerDown={e => dragControls.start(e)}
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {/* Thumbnail */}
      <div className="w-12 h-[68px] rounded-xl overflow-hidden bg-black/40 shrink-0">
        {entry.poster
          ? <Image src={entry.poster} alt={entry.title || "Poster"} fill sizes="80px" className="object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Film className="w-4 h-4 text-zinc-700" /></div>
        }
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <Link
          href={href}
          className="font-black text-sm md:text-base text-white hover:text-[var(--accent)] transition-colors line-clamp-1 font-sora tracking-tight"
        >
          {entry.title}
        </Link>

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded-full font-black text-zinc-300 uppercase tracking-wider border border-white/10">
            {entry.type}
          </span>
          {/* Collection badge */}
          <span className="flex items-center gap-1 text-[9px] font-bold text-zinc-500">
            {BUILTIN_ICONS[entry.collection] || <Folder className="w-2.5 h-2.5" />}
            {entry.collection}
          </span>
        </div>

        <TagInput tags={entry.tags} onAdd={onAddTag} onRemove={onRemoveTag} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Collection selector */}
        <select
          value={entry.collection}
          onChange={e => onUpdateCollection(e.target.value)}
          onClick={e => e.stopPropagation()}
          className="hidden sm:block bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-xl text-[10px] text-zinc-300 font-bold px-2.5 py-2 outline-none focus:border-[var(--accent)]/50 cursor-pointer hover:border-white/20 transition-colors"
        >
          {collections.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <Link
          href={href}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[var(--accent)]/80 hover:bg-[var(--accent)] text-white text-xs font-black rounded-xl transition-all hover:shadow-[0_0_20px_var(--accent-glow)] whitespace-nowrap"
        >
          <Play className="w-3 h-3 fill-white" />
          <span className="hidden sm:inline">Watch</span>
        </Link>

        <button
          onClick={onRemove}
          className="p-2 text-zinc-500 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition-all cursor-pointer shrink-0"
          aria-label="Remove from watchlist"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </Reorder.Item>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WatchlistPage() {
  const {
    watchlist, removeFromWatchlist,
    updateWatchlistItem, reorderWatchlist,
    customCollections, addCollection, removeCollection,
  } = useWatch();

  const [localItems, setLocalItems] = useState<WatchlistItem[]>([]);
  const [search, setSearch]         = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [viewMode, setViewMode]     = useState<ViewMode>("grid");
  const [sortBy, setSortBy]         = useState<SortMode>("date");
  const [activeCollection, setActiveCollection] = useState("All");
  const [activeTag, setActiveTag]   = useState<string | null>(null);
  const [isDragMode, setIsDragMode] = useState(false);

  // New collection form
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  // Sync localItems with watchlist from context
  useEffect(() => {
    setLocalItems(watchlist.map((item, idx) => ({
      ...item,
      collection: item.collection || "To Watch",
      tags: item.tags || [],
      order: item.order != null ? item.order : idx,
    })));
  }, [watchlist]);

  // All collections (builtin + custom)
  const allCollections = useMemo(() => {
    const builtin = ["Favorites", "To Watch", "Completed"];
    return [...builtin, ...customCollections.filter(c => !builtin.includes(c))];
  }, [customCollections]);

  // All unique tags
  const allTags = useMemo(() =>
    Array.from(new Set(localItems.flatMap(i => i.tags))).filter(Boolean),
    [localItems]
  );

  // Filtered + sorted items
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return localItems.filter(w => {
      const matchSearch = !q || w.title.toLowerCase().includes(q);
      const matchType   = filterType === "all" || w.type === filterType;
      const matchColl   = activeCollection === "All" || w.collection === activeCollection;
      const matchTag    = !activeTag || w.tags.includes(activeTag);
      return matchSearch && matchType && matchColl && matchTag;
    });
  }, [localItems, search, filterType, activeCollection, activeTag]);

  const sorted = useMemo(() => {
    if (isDragMode) return filtered; // preserve drag order
    return [...filtered].sort((a, b) => {
      if (sortBy === "alpha") return a.title.localeCompare(b.title);
      if (sortBy === "type")  return a.type.localeCompare(b.type);
      return (b.addedAt || 0) - (a.addedAt || 0);
    });
  }, [filtered, sortBy, isDragMode]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAddFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;
    if (addCollection(name)) {
      setNewFolderName("");
      setShowAddFolder(false);
      toast.success(`Folder "${name}" created!`);
    } else {
      toast.error("Folder already exists");
    }
  };

  const handleUpdateCollection = useCallback((id: string, collection: string) => {
    updateWatchlistItem(id, { collection });
    toast.success(`Moved to "${collection}"`);
  }, [updateWatchlistItem]);

  const handleAddTag = useCallback((id: string, tag: string) => {
    const item = localItems.find(i => i.id === id);
    if (!item) return;
    if (item.tags.includes(tag)) { toast("Tag already exists", { icon: "ℹ️" }); return; }
    updateWatchlistItem(id, { tags: [...item.tags, tag] });
    toast.success(`#${tag} added`);
  }, [localItems, updateWatchlistItem]);

  const handleRemoveTag = useCallback((id: string, tag: string) => {
    const item = localItems.find(i => i.id === id);
    if (!item) return;
    updateWatchlistItem(id, { tags: item.tags.filter(t => t !== tag) });
  }, [localItems, updateWatchlistItem]);

  const handleRemove = useCallback((id: string) => {
    removeFromWatchlist(id);
    toast.success("Removed from watchlist");
  }, [removeFromWatchlist]);

  const handleReorder = useCallback((newOrder: WatchlistItem[]) => {
    setLocalItems(newOrder);
    reorderWatchlist(newOrder);
  }, [reorderWatchlist]);

  const resetFilters = useCallback(() => {
    setSearch(""); setFilterType("all"); setActiveCollection("All"); setActiveTag(null);
  }, []);

  const getLink = useCallback((entry: WatchlistItem) => {
    if (entry.type === "movie" || entry.type === "tv")
      return `/watch/${entry.type}/${entry.showId}`;
    return `/watch/anime/${entry.showId}`;
  }, []);

  if (!isMounted) return null;

  const filterIcons = { all: Filter, anime: Swords, movie: Film, tv: Tv2 } as const;
  const filterLabels = { all: "All", anime: "Anime", movie: "Movies", tv: "TV" } as const;

  return (
    <main className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] pb-24 md:pb-10">

      {/* ── Sticky Toolbar ───────────────────────────────────────── */}
      <div className="sticky top-[56px] md:top-[64px] z-40 bg-[var(--bg-main)]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[1800px] mx-auto px-4 md:px-10 py-3 space-y-3">

          {/* Row 1: Title + View controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center shrink-0">
                <Bookmark className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-black font-sora tracking-tight text-white">My Watchlist</h1>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  {watchlist.length} title{watchlist.length !== 1 ? "s" : ""} saved
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Grid / List toggle */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-0.5 rounded-xl flex shrink-0">
                <button
                  onClick={() => { setViewMode("grid"); setIsDragMode(false); }}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${viewMode === "grid" ? "bg-[var(--accent)] text-white shadow-[0_0_12px_var(--accent-glow)]" : "text-zinc-500 hover:text-white"}`}
                  title="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${viewMode === "list" ? "bg-[var(--accent)] text-white shadow-[0_0_12px_var(--accent-glow)]" : "text-zinc-500 hover:text-white"}`}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Sort */}
              {!isDragMode && (
                <button
                  onClick={() => setSortBy(prev => prev === "date" ? "alpha" : prev === "alpha" ? "type" : "date")}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/8 hover:bg-white/10 text-xs font-bold rounded-xl transition-all cursor-pointer text-zinc-400 hover:text-white whitespace-nowrap"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  {sortBy === "date" ? "By Date" : sortBy === "alpha" ? "A–Z" : "By Type"}
                </button>
              )}

              {/* Drag reorder toggle (list mode only) */}
              {viewMode === "list" && watchlist.length > 1 && (
                <button
                  onClick={() => setIsDragMode(!isDragMode)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    isDragMode
                      ? "bg-[var(--accent)] text-white border-transparent shadow-[0_0_12px_var(--accent-glow)]"
                      : "bg-white/5 border-white/8 text-zinc-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <GripVertical className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isDragMode ? "Done" : "Reorder"}</span>
                </button>
              )}

              {/* New Folder */}
              <button
                onClick={() => setShowAddFolder(!showAddFolder)}
                className="flex items-center gap-1.5 px-3 py-2 bg-[var(--accent)]/10 hover:bg-[var(--accent)] hover:text-white border border-[var(--accent)]/20 hover:border-transparent text-xs font-bold rounded-xl transition-all cursor-pointer text-[var(--accent)] whitespace-nowrap"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Folder</span>
              </button>
            </div>
          </div>

          {/* New Folder form */}
          <AnimatePresence>
            {showAddFolder && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAddFolder}
                className="flex items-center gap-2 w-full max-w-sm overflow-hidden"
              >
                <div className="flex items-center gap-2 flex-1 bg-[var(--bg-card)] border border-[var(--accent)]/30 rounded-xl px-3 py-2 focus-within:border-[var(--accent)]/60 transition-colors">
                  <FolderPlus className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                  <input
                    type="text"
                    required
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    placeholder="Folder name..."
                    maxLength={40}
                    className="flex-1 bg-transparent text-xs text-white outline-none placeholder-zinc-600 font-bold"
                  />
                </div>
                <button type="submit" className="px-3 py-2 bg-[var(--accent)] hover:bg-[var(--accent-secondary)] text-white text-xs font-black rounded-xl transition-all shrink-0">
                  Create
                </button>
                <button type="button" onClick={() => setShowAddFolder(false)} className="p-2 text-zinc-500 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Collection tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-0.5">
            {/* All */}
            <button
              onClick={() => setActiveCollection("All")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer border whitespace-nowrap ${
                activeCollection === "All"
                  ? "bg-[var(--accent)] text-white border-transparent"
                  : "bg-[var(--bg-card)] border-[var(--border-color)] text-zinc-400 hover:text-white"
              }`}
            >
              All <span className="text-[9px] opacity-60">{localItems.length}</span>
            </button>
            {allCollections.map(col => {
              const count = localItems.filter(i => i.collection === col).length;
              if (count === 0) return null;
              return (
                <button
                  key={col}
                  onClick={() => setActiveCollection(col)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer border whitespace-nowrap ${
                    activeCollection === col
                      ? "bg-[var(--accent)] text-white border-transparent"
                      : "bg-[var(--bg-card)] border-[var(--border-color)] text-zinc-400 hover:text-white"
                  }`}
                >
                  {BUILTIN_ICONS[col] || <Folder className="w-3 h-3" />}
                  {col}
                  <span className="text-[9px] opacity-60">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Type filter + tag filter */}
          {watchlist.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search watchlist..."
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-white/12 focus:border-[var(--accent)]/50 rounded-xl pl-10 pr-10 py-2.5 text-sm outline-none transition-all text-white placeholder-zinc-600"
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

              {/* Type chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar shrink-0">
                {(["all", "anime", "movie", "tv"] as FilterType[]).map(t => {
                  const Icon = filterIcons[t];
                  return (
                    <button
                      key={t}
                      onClick={() => setFilterType(t)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer border ${
                        filterType === t
                          ? "bg-[var(--accent)] text-white border-transparent shadow-[0_0_12px_var(--accent-glow)]"
                          : "bg-[var(--bg-card)] border-[var(--border-color)] text-zinc-400 hover:text-white hover:border-white/15"
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {filterLabels[t]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active tags filter */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pb-1">
              <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-zinc-500 shrink-0">
                <Tag className="w-3 h-3" /> Tags:
              </span>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                    activeTag === tag
                      ? "bg-[var(--accent)]/20 text-[var(--accent)] border-[var(--accent)]/30"
                      : "bg-white/5 border-white/8 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  #{tag}
                </button>
              ))}
              {activeTag && (
                <button
                  onClick={() => setActiveTag(null)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold text-zinc-500 hover:text-white border border-white/8 hover:border-white/15 transition-all cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" /> Clear
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="max-w-[1800px] mx-auto px-4 md:px-10 py-8">
        {watchlist.length === 0 ? (
          <EmptyState />
        ) : sorted.length === 0 ? (
          <NoResults onClear={resetFilters} />
        ) : viewMode === "grid" ? (
          /* ─── Grid ─── */
          <motion.div
            layout
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {sorted.map(entry => (
                <GridCard
                  key={entry.id}
                  entry={entry}
                  collections={allCollections}
                  href={getLink(entry)}
                  onRemove={() => handleRemove(entry.id)}
                  onUpdateCollection={c => handleUpdateCollection(entry.id, c)}
                  onAddTag={tag => handleAddTag(entry.id, tag)}
                  onRemoveTag={tag => handleRemoveTag(entry.id, tag)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : isDragMode ? (
          /* ─── List + Drag Reorder ─── */
          <div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-4 flex items-center gap-2 p-3 bg-[var(--accent)]/8 border border-[var(--accent)]/20 rounded-xl"
            >
              <GripVertical className="w-4 h-4 text-[var(--accent)]" />
              <p className="text-xs font-bold text-[var(--accent)]">Drag items to reorder your watchlist</p>
            </motion.div>
            <Reorder.Group
              axis="y"
              values={sorted}
              onReorder={handleReorder}
              className="space-y-3"
              as="div"
            >
              <AnimatePresence>
                {sorted.map(entry => (
                  <ListRow
                    key={entry.id}
                    entry={entry}
                    collections={allCollections}
                    href={getLink(entry)}
                    isDragEnabled={true}
                    onRemove={() => handleRemove(entry.id)}
                    onUpdateCollection={c => handleUpdateCollection(entry.id, c)}
                    onAddTag={tag => handleAddTag(entry.id, tag)}
                    onRemoveTag={tag => handleRemoveTag(entry.id, tag)}
                  />
                ))}
              </AnimatePresence>
            </Reorder.Group>
          </div>
        ) : (
          /* ─── List (no drag) ─── */
          <div className="space-y-3">
            <AnimatePresence>
              {sorted.map(entry => (
                <Reorder.Group
                  key={entry.id}
                  axis="y"
                  values={[entry]}
                  onReorder={() => {}}
                  as="div"
                >
                  <ListRow
                    entry={entry}
                    collections={allCollections}
                    href={getLink(entry)}
                    isDragEnabled={false}
                    onRemove={() => handleRemove(entry.id)}
                    onUpdateCollection={c => handleUpdateCollection(entry.id, c)}
                    onAddTag={tag => handleAddTag(entry.id, tag)}
                    onRemoveTag={tag => handleRemoveTag(entry.id, tag)}
                  />
                </Reorder.Group>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Summary */}
        {sorted.length > 0 && (
          <div className="text-center mt-10">
            <p className="text-xs text-zinc-700 font-semibold">
              {sorted.length} of {watchlist.length} total items
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
