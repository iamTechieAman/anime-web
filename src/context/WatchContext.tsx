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
    season?: number;
    episodeNumber?: number;
    episodeId?: string;
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

export function normalizeLegacyHistoryItem(raw: any): WatchHistoryItem | null {
    if (!raw || typeof raw !== 'object') return null;

    const rawId = String(raw.id || raw.showId || raw._id || '').trim();
    if (!rawId || rawId === 'undefined' || rawId === 'null') return null;

    let type: 'anime' | 'movie' | 'tv' = 'movie';
    if (raw.type === 'anime' || raw.media_type === 'anime' || rawId.startsWith('hi:') || rawId.startsWith('aw:') || rawId.startsWith('anikai:')) {
        type = 'anime';
    } else if (raw.type === 'tv' || raw.media_type === 'tv' || raw.type === 'series' || raw.media_type === 'series') {
        type = 'tv';
    } else if (raw.type === 'movie' || raw.media_type === 'movie' || raw.type === 'film') {
        type = 'movie';
    } else if (raw.season !== undefined || raw.episodeId !== undefined || raw.episodeNumber !== undefined || raw.episode !== undefined) {
        type = 'tv';
    }

    const showId = String(raw.showId || raw.id || rawId).trim();
    const title = String(raw.title || raw.name || 'Untitled').trim();
    const poster = String(raw.poster || raw.poster_path || raw.image || '').trim();

    const isMovie = type === 'movie';
    const season = isMovie ? undefined : (raw.season != null ? Number(raw.season) : undefined);
    const episodeNumber = isMovie ? undefined : (raw.episodeNumber != null ? Number(raw.episodeNumber) : (raw.episode != null ? Number(raw.episode) : undefined));
    const episodeId = isMovie ? undefined : (raw.episodeId ? String(raw.episodeId) : undefined);

    const currentTime = typeof raw.currentTime === 'number' && !isNaN(raw.currentTime) && raw.currentTime >= 0 
        ? raw.currentTime 
        : (typeof raw.progress === 'number' && !isNaN(raw.progress) ? raw.progress : 0);
    const duration = typeof raw.duration === 'number' && !isNaN(raw.duration) && raw.duration >= 0 
        ? raw.duration 
        : 0;
    const updatedAt = typeof raw.updatedAt === 'number' && !isNaN(raw.updatedAt) 
        ? raw.updatedAt 
        : (typeof raw.timestamp === 'number' && !isNaN(raw.timestamp) ? raw.timestamp : Date.now());

    return {
        id: rawId,
        showId: showId || rawId,
        type,
        title,
        poster,
        season,
        episodeNumber,
        episodeId,
        currentTime,
        duration,
        updatedAt,
        providerId: raw.providerId || raw.provider,
        serverId: raw.serverId,
        audio: raw.audio,
        subtitle: raw.subtitle,
        quality: raw.quality
    };
}

export function normalizeLegacyWatchlistItem(raw: any, idx: number): WatchlistItem | null {
    if (!raw || typeof raw !== 'object') return null;

    const rawId = String(raw.id || raw.showId || raw._id || '').trim();
    if (!rawId || rawId === 'undefined' || rawId === 'null') return null;

    let type: 'anime' | 'movie' | 'tv' = 'movie';
    if (raw.type === 'anime' || raw.media_type === 'anime' || rawId.startsWith('hi:') || rawId.startsWith('aw:') || rawId.startsWith('anikai:')) {
        type = 'anime';
    } else if (raw.type === 'tv' || raw.media_type === 'tv' || raw.type === 'series') {
        type = 'tv';
    } else if (raw.type === 'movie' || raw.media_type === 'movie' || raw.type === 'film') {
        type = 'movie';
    }

    const showId = String(raw.showId || raw.id || rawId).trim();
    const title = String(raw.title || raw.name || 'Untitled').trim();
    const poster = String(raw.poster || raw.poster_path || raw.image || '').trim();
    const addedAt = typeof raw.addedAt === 'number' && !isNaN(raw.addedAt) ? raw.addedAt : Date.now();
    const collection = String(raw.collection || 'To Watch').trim();
    const tags = Array.isArray(raw.tags) ? raw.tags : [];
    const order = typeof raw.order === 'number' && !isNaN(raw.order) ? raw.order : idx;

    return {
        id: rawId,
        showId: showId || rawId,
        type,
        title,
        poster,
        addedAt,
        collection,
        tags,
        order
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

    // ── Load Per-Profile Data Synchronously + Migration + Sequence Protection ──
    useEffect(() => {
        const currentSeq = ++profileSeqRef.current;
        const pKey = getActiveProfileKey();

        // 1. Synchronously load and normalize profile-isolated data
        let localHistory: WatchHistoryItem[] = [];
        let localWatchlist: WatchlistItem[] = [];
        let localCollections: string[] = DEFAULT_COLLECTIONS;

        try {
            const h = localStorage.getItem(`toonplayer_history_${pKey}`) || 
                      (pKey === 'default' ? localStorage.getItem('toonplayer_history') : null);
            if (h) {
                const parsed = JSON.parse(h);
                if (Array.isArray(parsed)) {
                    localHistory = parsed
                        .map(normalizeLegacyHistoryItem)
                        .filter((item): item is WatchHistoryItem => item !== null);
                }
            }
        } catch (_) {}

        try {
            const w = localStorage.getItem(`toonplayer_watchlist_${pKey}`) || 
                      (pKey === 'default' ? localStorage.getItem('toonplayer_watchlist') : null);
            if (w) {
                const parsed = JSON.parse(w);
                if (Array.isArray(parsed)) {
                    localWatchlist = parsed
                        .map((item, idx) => normalizeLegacyWatchlistItem(item, idx))
                        .filter((item): item is WatchlistItem => item !== null);
                }
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
                                const normalizedHistory = data.user.history
                                    .map(normalizeLegacyHistoryItem)
                                    .filter((item: any): item is WatchHistoryItem => item !== null);
                                setHistory(normalizedHistory);
                                try {
                                    localStorage.setItem(`toonplayer_history_${pKey}`, JSON.stringify(normalizedHistory));
                                } catch (_) {}
                            }
                            if (Array.isArray(data.user.watchlist) && data.user.watchlist.length > 0) {
                                const normalizedWatchlist = data.user.watchlist
                                    .map((item: any, idx: number) => normalizeLegacyWatchlistItem(item, idx))
                                    .filter((item: any): item is WatchlistItem => item !== null);
                                setWatchlist(normalizedWatchlist);
                                try {
                                    localStorage.setItem(`toonplayer_watchlist_${pKey}`, JSON.stringify(normalizedWatchlist));
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

