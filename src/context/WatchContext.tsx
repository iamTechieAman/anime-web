"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useUserStore, isKidsFriendly } from '@/store/userStore';

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
    providerId?: string;
    serverId?: string;
    audio?: string;
    subtitle?: string;
    quality?: string;
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
    const activeProfileId = useUserStore(state => state.activeProfileId);
    const profiles = useUserStore(state => state.profiles);
    const [history, setHistory] = useState<WatchHistoryItem[]>([]);
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
    const [customCollections, setCustomCollections] = useState<string[]>(DEFAULT_COLLECTIONS);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const profileSeqRef = useRef(0);

    const isKidsMode = useMemo(() => {
        if (!activeProfileId) return false;
        return profiles.find(p => p.id === activeProfileId)?.isKids || false;
    }, [profiles, activeProfileId]);

    const filteredHistory = useMemo(() => {
        return isKidsMode ? history.filter(isKidsFriendly) : history;
    }, [history, isKidsMode]);

    const filteredWatchlist = useMemo(() => {
        return isKidsMode ? watchlist.filter(isKidsFriendly) : watchlist;
    }, [watchlist, isKidsMode]);

    const getActiveProfileKey = useCallback((): string => {
        if (activeProfileId) return activeProfileId;
        if (typeof window !== 'undefined') {
            const cookieMatch = document.cookie.match(/(^|;)\s*toonplayer_active_profile_id\s*=\s*([^;]+)/);
            if (cookieMatch) return cookieMatch[2];
            const stored = localStorage.getItem('toonplayer_profile');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (parsed.id) return parsed.id;
                } catch (_) {}
            }
        }
        return 'default';
    }, [activeProfileId]);

    // ── Load Per-Profile Data Synchronously + Sequence Protection ──
    useEffect(() => {
        const currentSeq = ++profileSeqRef.current;
        const pKey = getActiveProfileKey();

        // 1. Synchronously load profile-isolated data
        let localHistory: WatchHistoryItem[] = [];
        let localWatchlist: WatchlistItem[] = [];
        let localCollections: string[] = DEFAULT_COLLECTIONS;

        try {
            const h = localStorage.getItem(`toonplayer_history_${pKey}`) || 
                      (pKey === 'default' ? localStorage.getItem('toonplayer_history') : null);
            if (h) localHistory = JSON.parse(h);
        } catch (_) {}

        try {
            const w = localStorage.getItem(`toonplayer_watchlist_${pKey}`) || 
                      (pKey === 'default' ? localStorage.getItem('toonplayer_watchlist') : null);
            if (w) {
                const parsed = JSON.parse(w) as Partial<WatchlistItem>[];
                localWatchlist = parsed.map((item, idx) => normalizeWatchlistItem(item, idx));
            }
        } catch (_) {}

        try {
            const c = localStorage.getItem(`toonplayer_collections_${pKey}`);
            if (c) {
                const parsed = JSON.parse(c) as string[];
                if (Array.isArray(parsed) && parsed.length > 0) localCollections = parsed;
            }
        } catch (_) {}

        setHistory(localHistory);
        setWatchlist(localWatchlist);
        setCustomCollections(localCollections);
        setIsLoaded(true);

        // 2. Asynchronous user authentication and server sync (main profile only)
        const syncBackend = async () => {
            try {
                const res = await fetch('/api/user/me');
                if (res.ok) {
                    const data = await res.json();
                    if (currentSeq !== profileSeqRef.current) return; // Discard stale response
                    if (data?.user) {
                        setIsLoggedIn(true);
                        // Only merge backend data if this is the primary account profile
                        if (pKey === `profile-${data.user.id}` || pKey === 'default') {
                            if (Array.isArray(data.user.history) && data.user.history.length > 0) {
                                setHistory(data.user.history);
                                try {
                                    localStorage.setItem(`toonplayer_history_${pKey}`, JSON.stringify(data.user.history));
                                } catch (_) {}
                            }
                            if (Array.isArray(data.user.watchlist) && data.user.watchlist.length > 0) {
                                const wl = data.user.watchlist.map((item: WatchlistItem, idx: number) => normalizeWatchlistItem(item, idx));
                                setWatchlist(wl);
                                try {
                                    localStorage.setItem(`toonplayer_watchlist_${pKey}`, JSON.stringify(wl));
                                } catch (_) {}
                            }
                        }
                    }
                }
            } catch (_) {}
        };

        syncBackend();
    }, [activeProfileId, getActiveProfileKey]);

    // ── Persistence ───────────────────────────────────────────────
    useEffect(() => {
        if (!isLoaded) return;
        const pKey = getActiveProfileKey();
        try {
            localStorage.setItem(`toonplayer_history_${pKey}`, JSON.stringify(history));
        } catch (_) {}
    }, [history, isLoaded, getActiveProfileKey]);

    useEffect(() => {
        if (!isLoaded) return;
        const pKey = getActiveProfileKey();
        try {
            localStorage.setItem(`toonplayer_watchlist_${pKey}`, JSON.stringify(watchlist));
        } catch (_) {}
    }, [watchlist, isLoaded, getActiveProfileKey]);

    useEffect(() => {
        if (!isLoaded) return;
        const pKey = getActiveProfileKey();
        try {
            localStorage.setItem(`toonplayer_collections_${pKey}`, JSON.stringify(customCollections));
        } catch (_) {}
    }, [customCollections, isLoaded, getActiveProfileKey]);

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
        setWatchlist(prev => prev.map(item =>
            item.collection === name ? { ...item, collection: 'To Watch' } : item
        ));
    }, []);

    // ── History ───────────────────────────────────────────────────
    const addToHistory = useCallback(async (item: Omit<WatchHistoryItem, 'updatedAt'>) => {
        const isMovie = item.type === 'movie';
        const sanitizedItem: WatchHistoryItem = {
            ...item,
            episodeId: isMovie ? undefined : item.episodeId,
            episodeNumber: isMovie ? undefined : item.episodeNumber,
            season: isMovie ? undefined : item.season,
            updatedAt: Date.now()
        };

        const pKey = getActiveProfileKey();
        setHistory(prev => {
            const filtered = prev.filter(i => i.id !== sanitizedItem.id);
            const nextHistory = [sanitizedItem, ...filtered].slice(0, 200);
            try {
                localStorage.setItem(`toonplayer_history_${pKey}`, JSON.stringify(nextHistory));
            } catch (_) {}
            return nextHistory;
        });

        useUserStore.getState().addToHistory(pKey, sanitizedItem);

        if (isLoggedIn && (pKey.startsWith('profile-') || pKey === 'default')) {
            fetch('/api/user/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sanitizedItem)
            }).catch(() => {});
        }
    }, [isLoggedIn, getActiveProfileKey]);

    const removeFromHistory = useCallback(async (id: string) => {
        const pKey = getActiveProfileKey();
        setHistory(prev => {
            const next = prev.filter(i => i.id !== id);
            try {
                localStorage.setItem(`toonplayer_history_${pKey}`, JSON.stringify(next));
            } catch (_) {}
            return next;
        });
        if (isLoggedIn && (pKey.startsWith('profile-') || pKey === 'default')) {
            fetch(`/api/user/history?id=${id}`, { method: 'DELETE' }).catch(() => {});
        }
    }, [isLoggedIn, getActiveProfileKey]);

    const bulkRemoveFromHistory = useCallback((ids: string[]) => {
        const pKey = getActiveProfileKey();
        setHistory(prev => {
            const next = prev.filter(i => !ids.includes(i.id));
            try {
                localStorage.setItem(`toonplayer_history_${pKey}`, JSON.stringify(next));
            } catch (_) {}
            return next;
        });
        if (isLoggedIn && (pKey.startsWith('profile-') || pKey === 'default')) {
            ids.forEach(id =>
                fetch(`/api/user/history?id=${id}`, { method: 'DELETE' }).catch(() => {})
            );
        }
    }, [isLoggedIn, getActiveProfileKey]);

    const getHistoryItem = useCallback((id: string) => history.find(i => i.id === id), [history]);

    const clearHistory = useCallback(async () => {
        const pKey = getActiveProfileKey();
        setHistory([]);
        try {
            localStorage.setItem(`toonplayer_history_${pKey}`, JSON.stringify([]));
        } catch (_) {}
        if (isLoggedIn && (pKey.startsWith('profile-') || pKey === 'default')) {
            fetch(`/api/user/history?id=all`, { method: 'DELETE' }).catch(() => {});
        }
    }, [isLoggedIn, getActiveProfileKey]);

    // ── Watchlist ─────────────────────────────────────────────────
    const isInWatchlist = useCallback((id: string) => watchlist.some(i => i.id === id), [watchlist]);

    const addToWatchlist = useCallback(async (item: Omit<WatchlistItem, 'addedAt' | 'collection' | 'tags' | 'order'>) => {
        const pKey = getActiveProfileKey();
        if (watchlist.some(i => i.id === item.id)) return;
        const fullItem: WatchlistItem = {
            ...item,
            addedAt: Date.now(),
            collection: 'To Watch',
            tags: [],
            order: 0,
        };
        setWatchlist(prev => {
            const nextWl = [fullItem, ...prev.map(i => ({ ...i, order: i.order + 1 }))];
            try {
                localStorage.setItem(`toonplayer_watchlist_${pKey}`, JSON.stringify(nextWl));
            } catch (_) {}
            return nextWl;
        });

        useUserStore.getState().addToWatchlist(pKey, fullItem);

        if (isLoggedIn && (pKey.startsWith('profile-') || pKey === 'default')) {
            fetch('/api/user/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fullItem)
            }).catch(() => {});
        }
    }, [watchlist, isLoggedIn, getActiveProfileKey]);

    const removeFromWatchlist = useCallback(async (id: string) => {
        const pKey = getActiveProfileKey();
        setWatchlist(prev => {
            const nextWl = prev.filter(i => i.id !== id);
            try {
                localStorage.setItem(`toonplayer_watchlist_${pKey}`, JSON.stringify(nextWl));
            } catch (_) {}
            return nextWl;
        });
        useUserStore.getState().removeFromWatchlist(pKey, id);

        if (isLoggedIn && (pKey.startsWith('profile-') || pKey === 'default')) {
            fetch(`/api/user/favorites?id=${id}`, { method: 'DELETE' }).catch(() => {});
        }
    }, [isLoggedIn, getActiveProfileKey]);

    const updateWatchlistItem = useCallback((id: string, patch: Partial<Pick<WatchlistItem, 'collection' | 'tags'>>) => {
        const pKey = getActiveProfileKey();
        setWatchlist(prev => {
            const nextWl = prev.map(item => item.id === id ? { ...item, ...patch } : item);
            try {
                localStorage.setItem(`toonplayer_watchlist_${pKey}`, JSON.stringify(nextWl));
            } catch (_) {}
            return nextWl;
        });
    }, [getActiveProfileKey]);

    const reorderWatchlist = useCallback((newOrder: WatchlistItem[]) => {
        const pKey = getActiveProfileKey();
        const nextWl = newOrder.map((item, idx) => ({ ...item, order: idx }));
        setWatchlist(nextWl);
        try {
            localStorage.setItem(`toonplayer_watchlist_${pKey}`, JSON.stringify(nextWl));
        } catch (_) {}
    }, [getActiveProfileKey]);

    return (
        <WatchContext.Provider value={{
            history: filteredHistory,
            watchlist: filteredWatchlist,
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

