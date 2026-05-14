"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

export interface WatchHistoryItem {
    id: string; // The unique ID for the history item (e.g., showId-episodeId)
    showId: string; // The actual ID of the show
    type: 'anime' | 'movie' | 'tv';
    title: string;
    poster: string;
    episodeId?: string;
    episodeNumber?: number;
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
}

interface WatchContextType {
    history: WatchHistoryItem[];
    watchlist: WatchlistItem[];
    addToHistory: (item: Omit<WatchHistoryItem, 'updatedAt'>) => void;
    removeFromHistory: (id: string) => void;
    getHistoryItem: (id: string) => WatchHistoryItem | undefined;
    addToWatchlist: (item: Omit<WatchlistItem, 'addedAt'>) => void;
    removeFromWatchlist: (id: string) => void;
    isInWatchlist: (id: string) => boolean;
    clearHistory: () => void;
}

const WatchContext = createContext<WatchContextType | undefined>(undefined);

export function WatchProvider({ children }: { children: React.ReactNode }) {
    const [history, setHistory] = useState<WatchHistoryItem[]>([]);
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // Try fetching from DB first
                const res = await fetch('/api/user/me');
                if (res.ok) {
                    const data = await res.json();
                    setHistory(data.user.history || []);
                    setWatchlist(data.user.watchlist || []);
                    setIsLoggedIn(true);
                } else {
                    // Fallback to local storage if not logged in
                    const storedHistory = localStorage.getItem('toonplayer_history');
                    const storedWatchlist = localStorage.getItem('toonplayer_watchlist');
                    if (storedHistory) setHistory(JSON.parse(storedHistory));
                    if (storedWatchlist) setWatchlist(JSON.parse(storedWatchlist));
                }
            } catch (e) {
                console.error('Failed to load watch data:', e);
            }
            setIsLoaded(true);
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        if (!isLoaded || isLoggedIn) return;
        localStorage.setItem('toonplayer_history', JSON.stringify(history));
    }, [history, isLoaded, isLoggedIn]);

    useEffect(() => {
        if (!isLoaded || isLoggedIn) return;
        localStorage.setItem('toonplayer_watchlist', JSON.stringify(watchlist));
    }, [watchlist, isLoaded, isLoggedIn]);

    const addToHistory = React.useCallback(async (item: Omit<WatchHistoryItem, 'updatedAt'>) => {
        const fullItem = { ...item, updatedAt: Date.now() };
        setHistory(prev => {
            const filtered = prev.filter(i => i.id !== item.id);
            return [fullItem, ...filtered].slice(0, 50); // Keep last 50
        });

        if (isLoggedIn) {
            fetch('/api/user/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fullItem)
            }).catch(console.error);
        }
    }, [isLoggedIn]);

    const removeFromHistory = React.useCallback(async (id: string) => {
        setHistory(prev => prev.filter(i => i.id !== id));
        if (isLoggedIn) {
            fetch(`/api/user/history?id=${id}`, { method: 'DELETE' }).catch(console.error);
        }
    }, [isLoggedIn]);

    const getHistoryItem = React.useCallback((id: string) => history.find(i => i.id === id), [history]);

    const clearHistory = React.useCallback(async () => {
        setHistory([]);
        if (isLoggedIn) {
            fetch(`/api/user/history?id=all`, { method: 'DELETE' }).catch(console.error);
        }
    }, [isLoggedIn]);

    const isInWatchlist = React.useCallback((id: string) => watchlist.some(i => i.id === id), [watchlist]);

    const addToWatchlist = React.useCallback(async (item: Omit<WatchlistItem, 'addedAt'>) => {
        if (isInWatchlist(item.id)) return;
        const fullItem = { ...item, addedAt: Date.now() };
        
        setWatchlist(prev => [fullItem, ...prev]);

        if (isLoggedIn) {
            fetch('/api/user/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fullItem)
            }).catch(console.error);
        }
    }, [isInWatchlist, isLoggedIn]);

    const removeFromWatchlist = React.useCallback(async (id: string) => {
        setWatchlist(prev => prev.filter(i => i.id !== id));
        if (isLoggedIn) {
            fetch(`/api/user/favorites?id=${id}`, { method: 'DELETE' }).catch(console.error);
        }
    }, [isLoggedIn]);

    return (
        <WatchContext.Provider value={{
            history, watchlist, addToHistory, removeFromHistory, getHistoryItem, clearHistory,
            addToWatchlist, removeFromWatchlist, isInWatchlist
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
