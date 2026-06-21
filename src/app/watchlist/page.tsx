"use client";

import { useState, useEffect } from "react";
import { Bookmark, Trash2, Play, Search, X, Grid, List, FolderPlus, Tag, ArrowUpDown, Plus, Check } from "lucide-react";
import Link from "next/link";
import { useWatch } from "@/context/WatchContext";
import toast from "react-hot-toast";

interface WatchlistItem {
  id: string;
  showId: string;
  type: string;
  title: string;
  poster: string;
  addedAt?: number;
  collection?: string;
  tags?: string[];
}

export default function WatchlistPage() {
  const { watchlist, removeFromWatchlist, addToWatchlist } = useWatch();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "anime" | "movie" | "tv">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"date" | "alpha">("date");
  
  // Custom Collections / Folders
  const [collections, setCollections] = useState<string[]>(["All", "Favorites", "To Watch", "Completed"]);
  const [activeCollection, setActiveCollection] = useState("All");
  const [newCollectionName, setNewCollectionName] = useState("");
  const [showAddCollection, setShowAddCollection] = useState(false);

  // Custom Tags
  const [activeTag, setActiveTag] = useState<string | null>(null);
  
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Standardize items with defaults on load
    if (watchlist) {
      const mapped = watchlist.map((item, idx) => ({
        ...item,
        addedAt: item.addedAt || (Date.now() - idx * 60000), // fallback timestamp
        collection: item.collection || "To Watch",
        tags: item.tags || []
      }));
      setItems(mapped);
    }
  }, [watchlist]);

  const handleRemove = (id: string) => {
    removeFromWatchlist(id);
    toast.success("Removed from watchlist");
  };

  const handleAddCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;
    const name = newCollectionName.trim();
    if (!collections.includes(name)) {
      setCollections(prev => [...prev, name]);
      setNewCollectionName("");
      setShowAddCollection(false);
      toast.success(`Collection "${name}" created!`);
    } else {
      toast.error("Collection already exists");
    }
  };

  const updateItemCollection = (itemId: string, collection: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        toast.success(`Moved to "${collection}"`);
        return { ...item, collection };
      }
      return item;
    }));
  };

  const handleAddTag = (itemId: string, tag: string) => {
    if (!tag.trim()) return;
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const cleanedTag = tag.trim().toLowerCase();
        if (item.tags && item.tags.includes(cleanedTag)) return item;
        toast.success(`Tag "${cleanedTag}" added`);
        return { ...item, tags: [...(item.tags || []), cleanedTag] };
      }
      return item;
    }));
  };

  const handleRemoveTag = (itemId: string, tagToRemove: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, tags: (item.tags || []).filter(t => t !== tagToRemove) };
      }
      return item;
    }));
  };

  // Filter items
  const filtered = items.filter((w) => {
    const matchesSearch = w.title.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || w.type === filterType;
    const matchesCollection = activeCollection === "All" || w.collection === activeCollection;
    const matchesTag = !activeTag || (w.tags && w.tags.includes(activeTag));
    return matchesSearch && matchesType && matchesCollection && matchesTag;
  });

  // Sort items
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "alpha") {
      return a.title.localeCompare(b.title);
    }
    // Newest first
    return (b.addedAt || 0) - (a.addedAt || 0);
  });

  // Extract all unique tags in watchlist
  const allUniqueTags = Array.from(
    new Set(items.flatMap(item => item.tags || []))
  );

  const getWatchlistLink = (entry: WatchlistItem) => {
    if (entry.type === 'movie' || entry.type === 'tv') {
      return `/watch/${entry.type}/${entry.showId}`;
    }
    return `/watch/anime/${entry.showId}`;
  };

  if (!isMounted) return null;

  return (
    <main className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] pb-24 md:pb-10">
      {/* Sticky header with glassmorphism */}
      <div className="sticky top-[56px] md:top-[64px] z-40 bg-[var(--bg-main)]/90 backdrop-blur-xl border-b border-white/5 px-6 md:px-12 py-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
              <Bookmark className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div>
              <h1 className="text-xl font-black font-sora tracking-tight text-white">My Watchlist</h1>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{watchlist.length} items</p>
            </div>
          </div>

          {/* List/Grid sorting toggles */}
          <div className="flex items-center gap-3">
            {/* View Mode */}
            <div className="bg-[#12131A] border border-white/5 p-1 rounded-xl flex">
              <button 
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === "grid" ? "bg-[var(--accent)] text-white" : "text-zinc-500 hover:text-white"}`}
                title="Grid view"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === "list" ? "bg-[var(--accent)] text-white" : "text-zinc-500 hover:text-white"}`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Sort Toggle */}
            <button
              onClick={() => setSortBy(prev => prev === "date" ? "alpha" : "date")}
              className="flex items-center gap-1.5 h-9 px-3 bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{sortBy === "date" ? "Recently Added" : "A-Z"}</span>
            </button>

            {/* Create Folder button */}
            <button
              onClick={() => setShowAddCollection(!showAddCollection)}
              className="flex items-center gap-1.5 h-9 px-3 bg-[var(--accent)]/10 hover:bg-[var(--accent)] hover:text-white border border-[var(--accent)]/20 hover:border-transparent text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5 text-[var(--accent)] hover:text-inherit" />
              <span className="hidden sm:inline">New Folder</span>
            </button>
          </div>
        </div>

        {/* Collections filter row */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar py-0.5 border-t border-white/5 pt-3">
          {collections.map(col => (
            <button
              key={col}
              onClick={() => setActiveCollection(col)}
              className={`px-4 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeCollection === col 
                  ? "bg-[var(--accent)] text-white" 
                  : "bg-[#12131A] border border-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              {col}
            </button>
          ))}
        </div>

        {/* Dynamic tagging subheader filters */}
        {allUniqueTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2">
            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500 mr-2 flex items-center gap-1">
              <Tag className="w-3 h-3" /> Tags:
            </span>
            {allUniqueTags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                  activeTag === tag
                    ? "bg-purple-600/20 text-purple-400 border-purple-500/30"
                    : "bg-white/5 border-white/5 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Custom Folder Addition Dialog */}
        {showAddCollection && (
          <form onSubmit={handleAddCollection} className="p-3 bg-[#12131A] border border-white/10 rounded-2xl flex items-center gap-2 w-full max-w-sm">
            <input 
              type="text"
              required
              value={newCollectionName}
              onChange={e => setNewCollectionName(e.target.value)}
              placeholder="Folder/Collection name..."
              className="flex-1 bg-black border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[var(--accent)]/50"
            />
            <button type="submit" className="px-3 py-1.5 bg-[var(--accent)] text-white text-xs font-black rounded-xl">Create</button>
            <button type="button" onClick={() => setShowAddCollection(false)} className="p-1.5 text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
          </form>
        )}

        {/* Search */}
        {watchlist.length > 0 && (
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search watchlist titles..."
              className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-white/10 focus:border-[var(--accent)]/50 rounded-xl pl-10 pr-10 py-2.5 text-sm outline-none transition-all text-white placeholder-zinc-500"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/5 rounded-full">
                <X className="w-3.5 h-3.5 text-zinc-500" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="w-full px-6 md:px-12 py-8">
        {watchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center max-w-md mx-auto">
            <div className="w-20 h-20 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center mb-6 shadow-2xl shadow-[var(--accent-glow)]/10">
              <Bookmark className="w-8 h-8 text-[var(--accent)] animate-bounce" />
            </div>
            <p className="text-xl font-black font-sora text-white mb-2">Your Watchlist is Empty</p>
            <p className="text-sm text-zinc-500 mb-8">Click "My List" on any movie or anime details page to save it for later.</p>
            <Link href="/" className="px-6 py-3 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] text-white rounded-xl text-sm font-black hover:shadow-[0_0_25px_var(--accent-glow)] transition-all duration-300">
              Browse Hot Releases
            </Link>
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-black text-white text-lg mb-1">No matches found</p>
            <p className="text-sm text-zinc-500">Try choosing a different folder tag or adjusting search text.</p>
          </div>
        ) : viewMode === "grid" ? (
          /* === GRID MODE === */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 md:gap-6">
            {sorted.map((entry) => (
              <div 
                key={entry.id} 
                className="group relative rounded-2xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent)]/50 hover:shadow-[0_4px_30px_-8px_var(--accent-glow)] hover:-translate-y-1 transition-all duration-300 aspect-[2/3] flex flex-col justify-end"
              >
                <Link href={getWatchlistLink(entry)} className="absolute inset-0 block w-full h-full select-none">
                  {entry.poster ? (
                    <img src={entry.poster} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full bg-black/40 flex items-center justify-center"><Play className="w-10 h-10 text-white/20" /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent opacity-90" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center transform scale-50 group-hover:scale-100 transition-transform shadow-lg">
                      <Play className="w-5 h-5 text-white fill-current ml-1" />
                    </div>
                  </div>
                </Link>

                {/* Info & annotation overlay */}
                <div className="relative p-3 space-y-1 z-10 pointer-events-none select-none">
                  <h3 className="font-bold text-xs text-white line-clamp-1 group-hover:line-clamp-2 transition-all font-sora">{entry.title}</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] bg-white/10 border border-white/10 text-white px-1 py-0.5 rounded font-black uppercase tracking-wider">{entry.type}</span>
                    <span className="text-[8px] bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded font-bold border border-orange-500/20">{entry.collection}</span>
                  </div>
                </div>

                {/* Inline Controls (Move, tag, delete) */}
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <select
                    value={entry.collection}
                    onChange={e => updateItemCollection(entry.id, e.target.value)}
                    className="bg-black/80 backdrop-blur-md border border-white/10 rounded-lg text-[9px] text-zinc-300 font-bold px-1.5 py-1 focus:ring-0 focus:outline-none cursor-pointer"
                  >
                    {collections.filter(x => x !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button
                    onClick={() => handleRemove(entry.id)}
                    className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-transform active:scale-90"
                    title="Remove from Watchlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* === LIST MODE === */
          <div className="space-y-3">
            {sorted.map((entry) => (
              <div 
                key={entry.id}
                className="group flex items-center gap-4 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent)]/30 hover:shadow-[0_4px_30px_-8px_var(--accent-glow)] rounded-2xl p-3.5 transition-all duration-300"
              >
                <div className="w-14 h-20 rounded-xl overflow-hidden bg-black/40 shrink-0">
                  {entry.poster ? <img src={entry.poster} alt="" className="w-full h-full object-cover" /> : null}
                </div>
                
                <div className="flex-1 min-w-0">
                  <Link href={getWatchlistLink(entry)} className="font-black text-base text-white hover:text-[var(--accent)] transition-colors line-clamp-1 font-sora tracking-tight">
                    {entry.title}
                  </Link>
                  
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[9px] bg-white/15 px-2 py-0.5 rounded-full font-black text-zinc-300 uppercase tracking-wider">{entry.type}</span>
                    <span className="text-[10px] text-zinc-500 font-semibold">&middot;</span>
                    <span className="text-xs text-zinc-400">Folder: <span className="text-[var(--accent)] font-bold">{entry.collection}</span></span>
                  </div>

                  {/* Add Tag Inline Form */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {entry.tags && entry.tags.map(t => (
                      <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold rounded">
                        #{t}
                        <button onClick={() => handleRemoveTag(entry.id, t)} className="hover:text-red-400 font-normal">×</button>
                      </span>
                    ))}
                    <button 
                      onClick={() => {
                        const t = prompt("Enter tag name (e.g. action, series):");
                        if (t) handleAddTag(entry.id, t);
                      }}
                      className="px-2 py-0.5 bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] font-bold text-zinc-400 rounded cursor-pointer"
                    >
                      + Tag
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Folder Selector */}
                  <select
                    value={entry.collection}
                    onChange={e => updateItemCollection(entry.id, e.target.value)}
                    className="bg-[#12131A] border border-white/10 rounded-xl text-xs text-zinc-300 font-bold px-3 py-2 outline-none focus:border-[var(--accent)]/50 cursor-pointer"
                  >
                    {collections.filter(x => x !== "All").map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  <Link 
                    href={getWatchlistLink(entry)} 
                    className="px-4 py-2 bg-[var(--accent)]/80 hover:bg-[var(--accent)] text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    Stream
                  </Link>

                  <button
                    onClick={() => handleRemove(entry.id)}
                    className="p-2 text-zinc-500 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
