"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export interface WatchHistoryItem {
    id: string;
    showId: string;
    type: 'anime' | 'movie' | 'tv';
    title: string;
    poster: string;
    episodeId?: string;
    episodeNumber?: number;
    season?: number;
    currentTime: number;
    duration: number;
    updatedAt: number;
}

export interface WatchlistItem {
    id: string;
    showId: string;
    type: 'anime' | 'movie' | 'tv';
    title: string;
    poster: string;
    addedAt: number;
    collection: string;
    tags: string[];
    order: number;
}

interface WatchContextType {
    history: WatchHistoryItem[];
    watchlist: WatchlistItem[];
    // Custom collections (persisted in localStorage)
    customCollections: string[];
    addCollection: (name: string) => boolean;
    removeCollection: (name: string) => void;
    // History
    addToHistory: (item: Omit<WatchHistoryItem, 'updatedAt'>) => void;
    removeFromHistory: (id: string) => void;
    getHistoryItem: (id: string) => WatchHistoryItem | undefined;
    clearHistory: () => void;
    bulkRemoveFromHistory: (ids: string[]) => void;
    // Watchlist
    addToWatchlist: (item: Omit<WatchlistItem, 'addedAt' | 'collection' | 'tags' | 'order'>) => void;
    removeFromWatchlist: (id: string) => void;
    isInWatchlist: (id: string) => boolean;
    updateWatchlistItem: (id: string, patch: Partial<Pick<WatchlistItem, 'collection' | 'tags'>>) => void;
    reorderWatchlist: (newOrder: WatchlistItem[]) => void;
}

const DEFAULT_COLLECTIONS = ['Favorites', 'To Watch', 'Completed'];

function normalizeWatchlistItem(item: Partial<WatchlistItem>, idx: number): WatchlistItem {
    const base = item as WatchlistItem;
    return {
        ...base,
        collection: base.collection || 'To Watch',
        tags: base.tags || [],
        order: base.order != null ? base.order : idx,
    };
}

const WatchContext = createContext<WatchContextType | undefined>(undefined);

export function WatchProvider({ children }: { children: React.ReactNode }) {
    const [history, setHistory] = useState<WatchHistoryItem[]>([]);
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
    const [customCollections, setCustomCollections] = useState<string[]>(DEFAULT_COLLECTIONS);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // ── Initial Load ──────────────────────────────────────────────
    useEffect(() => {
        const loadInitialData = async () => {
            // Always load custom collections from localStorage first
            try {
                const storedCols = localStorage.getItem('toonplayer_collections');
                if (storedCols) {
                    const parsed = JSON.parse(storedCols) as string[];
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setCustomCollections(parsed);
                    }
                }
            } catch (_) {}

            try {
                const res = await fetch('/api/user/me');
                if (res.ok) {
                    const data = await res.json();
                    if (data.user) {
                        setHistory(data.user.history || []);
                        const wl = (data.user.watchlist || []).map((item: WatchlistItem, idx: number) =>
                            normalizeWatchlistItem(item, idx)
                        );
                        setWatchlist(wl);
                        setIsLoggedIn(true);
                    } else {
                        loadFromLocalStorage();
                    }
                } else {
                    loadFromLocalStorage();
                }
            } catch (_) {
                loadFromLocalStorage();
            }
            setIsLoaded(true);
        };

        const loadFromLocalStorage = () => {
            try {
                const storedHistory = localStorage.getItem('toonplayer_history');
                const storedWatchlist = localStorage.getItem('toonplayer_watchlist');
                if (storedHistory) setHistory(JSON.parse(storedHistory));
                if (storedWatchlist) {
                    const wl = (JSON.parse(storedWatchlist) as Partial<WatchlistItem>[]).map(
                        (item, idx) => normalizeWatchlistItem(item, idx)
                    );
                    setWatchlist(wl);
                }
            } catch (_) {}
        };

        loadInitialData();
    }, []);

    // ── Persistence ───────────────────────────────────────────────
    useEffect(() => {
        if (!isLoaded || isLoggedIn) return;
        localStorage.setItem('toonplayer_history', JSON.stringify(history));
    }, [history, isLoaded, isLoggedIn]);

    useEffect(() => {
        if (!isLoaded || isLoggedIn) return;
        localStorage.setItem('toonplayer_watchlist', JSON.stringify(watchlist));
    }, [watchlist, isLoaded, isLoggedIn]);

    useEffect(() => {
        if (!isLoaded) return;
        localStorage.setItem('toonplayer_collections', JSON.stringify(customCollections));
    }, [customCollections, isLoaded]);

    // ── Collections ───────────────────────────────────────────────
    const addCollection = useCallback((name: string): boolean => {
        const trimmed = name.trim();
        if (!trimmed) return false;
        if (customCollections.includes(trimmed)) return false;
        setCustomCollections(prev => [...prev, trimmed]);
        return true;
    }, [customCollections]);

    const removeCollection = useCallback((name: string) => {
        if (DEFAULT_COLLECTIONS.includes(name)) return;
        setCustomCollections(prev => prev.filter(c => c !== name));
        // Move items from deleted collection to "To Watch"
        setWatchlist(prev => prev.map(item =>
            item.collection === name ? { ...item, collection: 'To Watch' } : item
        ));
    }, []);

    // ── History ───────────────────────────────────────────────────
    const addToHistory = useCallback(async (item: Omit<WatchHistoryItem, 'updatedAt'>) => {
        const fullItem = { ...item, updatedAt: Date.now() };
        setHistory(prev => {
            const filtered = prev.filter(i => i.id !== item.id);
            return [fullItem, ...filtered].slice(0, 200);
        });
        if (isLoggedIn) {
            fetch('/api/user/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fullItem)
            }).catch(() => {});
        }
    }, [isLoggedIn]);

    const removeFromHistory = useCallback(async (id: string) => {
        setHistory(prev => prev.filter(i => i.id !== id));
        if (isLoggedIn) {
            fetch(`/api/user/history?id=${id}`, { method: 'DELETE' }).catch(() => {});
        }
    }, [isLoggedIn]);

    const bulkRemoveFromHistory = useCallback((ids: string[]) => {
        setHistory(prev => prev.filter(i => !ids.includes(i.id)));
        if (isLoggedIn) {
            ids.forEach(id =>
                fetch(`/api/user/history?id=${id}`, { method: 'DELETE' }).catch(() => {})
            );
        }
    }, [isLoggedIn]);

    const getHistoryItem = useCallback((id: string) => history.find(i => i.id === id), [history]);

    const clearHistory = useCallback(async () => {
        setHistory([]);
        if (isLoggedIn) {
            fetch(`/api/user/history?id=all`, { method: 'DELETE' }).catch(() => {});
        }
    }, [isLoggedIn]);

    // ── Watchlist ─────────────────────────────────────────────────
    const isInWatchlist = useCallback((id: string) => watchlist.some(i => i.id === id), [watchlist]);

    const addToWatchlist = useCallback(async (item: Omit<WatchlistItem, 'addedAt' | 'collection' | 'tags' | 'order'>) => {
        if (watchlist.some(i => i.id === item.id)) return;
        const fullItem: WatchlistItem = {
            ...item,
            addedAt: Date.now(),
            collection: 'To Watch',
            tags: [],
            order: 0,
        };
        setWatchlist(prev => [fullItem, ...prev.map(i => ({ ...i, order: i.order + 1 }))]);
        if (isLoggedIn) {
            fetch('/api/user/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fullItem)
            }).catch(() => {});
        }
    }, [watchlist, isLoggedIn]);

    const removeFromWatchlist = useCallback(async (id: string) => {
        setWatchlist(prev => prev.filter(i => i.id !== id));
        if (isLoggedIn) {
            fetch(`/api/user/favorites?id=${id}`, { method: 'DELETE' }).catch(() => {});
        }
    }, [isLoggedIn]);

    const updateWatchlistItem = useCallback((id: string, patch: Partial<Pick<WatchlistItem, 'collection' | 'tags'>>) => {
        setWatchlist(prev => prev.map(item =>
            item.id === id ? { ...item, ...patch } : item
        ));
    }, []);

    const reorderWatchlist = useCallback((newOrder: WatchlistItem[]) => {
        setWatchlist(newOrder.map((item, idx) => ({ ...item, order: idx })));
    }, []);

    return (
        <WatchContext.Provider value={{
            history,
            watchlist,
            customCollections,
            addCollection,
            removeCollection,
            addToHistory,
            removeFromHistory,
            bulkRemoveFromHistory,
            getHistoryItem,
            clearHistory,
            addToWatchlist,
            removeFromWatchlist,
            isInWatchlist,
            updateWatchlistItem,
            reorderWatchlist,
        }}>
            {children}
        </WatchContext.Provider>
    );
}

export const useWatch = () => {
    const context = useContext(WatchContext);
    if (context === undefined) {
        throw new Error('useWatch must be used within a WatchProvider');
    }
    return context;
};
