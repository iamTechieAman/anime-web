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

    useEffect(() => {
        try {
            const storedHistory = localStorage.getItem('toonplayer_history');
            const storedWatchlist = localStorage.getItem('toonplayer_watchlist');
            if (storedHistory) setHistory(JSON.parse(storedHistory));
            if (storedWatchlist) setWatchlist(JSON.parse(storedWatchlist));
        } catch (e) {
            console.error('Failed to load watch data:', e);
        }
        setIsLoaded(true);
    }, []);

    useEffect(() => {
        if (!isLoaded) return;
        localStorage.setItem('toonplayer_history', JSON.stringify(history));
    }, [history, isLoaded]);

    useEffect(() => {
        if (!isLoaded) return;
        localStorage.setItem('toonplayer_watchlist', JSON.stringify(watchlist));
    }, [watchlist, isLoaded]);

    const addToHistory = (item: Omit<WatchHistoryItem, 'updatedAt'>) => {
        setHistory(prev => {
            const filtered = prev.filter(i => i.id !== item.id);
            return [{ ...item, updatedAt: Date.now() }, ...filtered].slice(0, 50); // Keep last 50
        });
    };

    const removeFromHistory = (id: string) => {
        setHistory(prev => prev.filter(i => i.id !== id));
    };

    const getHistoryItem = (id: string) => history.find(i => i.id === id);

    const clearHistory = () => setHistory([]);

    const addToWatchlist = (item: Omit<WatchlistItem, 'addedAt'>) => {
        setWatchlist(prev => {
            if (prev.some(i => i.id === item.id)) return prev;
            return [{ ...item, addedAt: Date.now() }, ...prev];
        });
    };

    const removeFromWatchlist = (id: string) => {
        setWatchlist(prev => prev.filter(i => i.id !== id));
    };

    const isInWatchlist = (id: string) => watchlist.some(i => i.id === id);

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
