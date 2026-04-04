"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export type NotificationCategory = 'episodes' | 'trending' | 'recommendations' | 'watchlist' | 'community' | 'system';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'update' | 'alert';
  category: NotificationCategory;
  timestamp: number;
  read: boolean;
  link?: string;
  icon?: string;
}

export interface NotificationPreferences {
  episodes: boolean;
  trending: boolean;
  recommendations: boolean;
  watchlist: boolean;
  community: boolean;
  aiSmartAlerts: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  episodes: true,
  trending: true,
  recommendations: true,
  watchlist: true,
  community: true,
  aiSmartAlerts: true,
};

interface NotificationContextType {
  notifications: Notification[];
  preferences: NotificationPreferences;
  unreadCount: number;
  addNotification: (notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  updatePreference: (key: keyof NotificationPreferences, value: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// AI Smart Alert Engine — analyzes watch history to determine usage patterns
function getSmartAlertContext(): { isUsualWatchTime: boolean; favoriteGenre: string; watchStreak: number } {
  try {
    const history = JSON.parse(localStorage.getItem('toonplayer_watch_history') || '[]');
    const hour = new Date().getHours();

    // Determine most common watch hour from history timestamps
    const hourCounts: Record<number, number> = {};
    history.forEach((item: any) => {
      if (item.watchedAt) {
        const h = new Date(item.watchedAt).getHours();
        hourCounts[h] = (hourCounts[h] || 0) + 1;
      }
    });
    const mostActiveHour = Object.entries(hourCounts).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
    const peakHour = mostActiveHour ? parseInt(mostActiveHour[0]) : 22;
    const isUsualWatchTime = Math.abs(hour - peakHour) <= 1;

    // Determine favorite genre based on recent watched content
    const genreCounts: Record<string, number> = {};
    history.slice(0, 20).forEach((item: any) => {
      if (item.genre) genreCounts[item.genre] = (genreCounts[item.genre] || 0) + 1;
    });
    const topGenre = Object.entries(genreCounts).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
    const favoriteGenre = topGenre ? topGenre[0] : 'Action';

    // Calculate watch streak (consecutive days watched)
    const days = new Set(history.map((h: any) => h.watchedAt ? new Date(h.watchedAt).toDateString() : null).filter(Boolean));
    const watchStreak = days.size;

    return { isUsualWatchTime, favoriteGenre, watchStreak };
  } catch {
    return { isUsualWatchTime: false, favoriteGenre: 'Action', watchStreak: 0 };
  }
}

// Pool of AI-generated personalized notifications
const AI_ALERTS = [
  {
    id: 'ai_peak_time',
    title: '🎬 It\'s your watch time!',
    message: 'Based on your viewing habits, now is when you usually watch — new episodes are ready for you.',
    type: 'info' as const,
    category: 'recommendations' as NotificationCategory,
    link: '/discover',
    icon: '🧠',
  },
  {
    id: 'ai_streak',
    title: '🔥 You\'re on a streak!',
    message: 'You\'ve been watching consistently. Don\'t break it — your personalized picks are ready.',
    type: 'info' as const,
    category: 'recommendations' as NotificationCategory,
    link: '/discover',
    icon: '🔥',
  },
  {
    id: 'ai_taste',
    title: '✨ Based on your taste',
    message: 'New anime matching your favorite genres just dropped. You might love it.',
    type: 'info' as const,
    category: 'recommendations' as NotificationCategory,
    link: '/discover',
    icon: '✨',
  },
];

const COMMUNITY_ALERTS: Omit<Notification, 'timestamp' | 'read'>[] = [
  {
    id: 'community_trending_1',
    title: '📈 Community is watching',
    message: '"Jujutsu Kaisen S3" is trending in your region — 8,200 users watching right now.',
    type: 'info',
    category: 'community',
    link: '/search?query=Jujutsu+Kaisen',
  },
  {
    id: 'community_trending_2',
    title: '🌐 Top Pick This Week',
    message: '"Solo Leveling Season 2" is the #1 most-watched anime on ToonPlayer globally.',
    type: 'info',
    category: 'community',
    link: '/search?query=Solo+Leveling',
  },
];

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFS);

  // Load preferences and notifications from localStorage on mount
  useEffect(() => {
    // Load preferences
    const savedPrefs = localStorage.getItem('toonplayer_notif_prefs');
    if (savedPrefs) {
      try { setPreferences({ ...DEFAULT_PREFS, ...JSON.parse(savedPrefs) }); } catch {}
    }

    // Load notifications
    const saved = localStorage.getItem('toonplayer_notifications');
    let initialNotifs: Notification[] = [];

    if (!saved) {
      initialNotifs = [{
        id: 'welcome_v19',
        title: '🚀 ToonPlayer V1.9 is Live!',
        message: 'PWA support, fuzzy search, Continue Watching, and now Smart Notifications are all here. Enjoy!',
        type: 'update',
        category: 'system',
        timestamp: Date.now(),
        read: false,
      }];
      localStorage.setItem('toonplayer_notifications', JSON.stringify(initialNotifs));
      setNotifications(initialNotifs);
    } else {
      try {
        setNotifications(JSON.parse(saved));
      } catch { setNotifications([]); }
    }

    // Real-time Storage Sync (multiple tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'toonplayer_notifications') {
        try { if (e.newValue) setNotifications(JSON.parse(e.newValue)); } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // ─── AI Smart Alert Engine ───────────────────────────────────────
    const aiTimer = setTimeout(() => {
      const prefs = JSON.parse(localStorage.getItem('toonplayer_notif_prefs') || JSON.stringify(DEFAULT_PREFS));
      if (!prefs.aiSmartAlerts) return;

      const { isUsualWatchTime, watchStreak } = getSmartAlertContext();
      const existingNotifs: Notification[] = JSON.parse(localStorage.getItem('toonplayer_notifications') || '[]');

      let alertToSend = AI_ALERTS[2]; // default: taste-based
      if (isUsualWatchTime) alertToSend = AI_ALERTS[0]; // peak time alert
      else if (watchStreak >= 3) alertToSend = AI_ALERTS[1]; // streak alert

      const alreadySent = existingNotifs.some(n => n.id === alertToSend.id);
      if (alreadySent) return;

      const newNotif: Notification = {
        ...alertToSend,
        timestamp: Date.now(),
        read: false,
      };
      const updated = [newNotif, ...existingNotifs];
      localStorage.setItem('toonplayer_notifications', JSON.stringify(updated));
      setNotifications([...updated]);
    }, 4000);

    // ─── Community Activity Alert ─────────────────────────────────────
    const communityTimer = setTimeout(() => {
      const prefs = JSON.parse(localStorage.getItem('toonplayer_notif_prefs') || JSON.stringify(DEFAULT_PREFS));
      if (!prefs.community) return;

      const existingNotifs: Notification[] = JSON.parse(localStorage.getItem('toonplayer_notifications') || '[]');
      const alert = COMMUNITY_ALERTS[Math.floor(Math.random() * COMMUNITY_ALERTS.length)];
      const alreadySent = existingNotifs.some(n => n.id === alert.id);
      if (alreadySent) return;

      const newNotif: Notification = { ...alert, timestamp: Date.now(), read: false };
      const updated = [newNotif, ...existingNotifs];
      localStorage.setItem('toonplayer_notifications', JSON.stringify(updated));
      setNotifications([...updated]);
    }, 8000);

    // ─── New Episode Simulation (Trending Show) ───────────────────────
    const episodeTimer = setTimeout(() => {
      const prefs = JSON.parse(localStorage.getItem('toonplayer_notif_prefs') || JSON.stringify(DEFAULT_PREFS));
      if (!prefs.episodes) return;

      const existingNotifs: Notification[] = JSON.parse(localStorage.getItem('toonplayer_notifications') || '[]');
      const hasMockEp = existingNotifs.some(n => n.id === 'ep_demon_slayer_s3e1');
      if (hasMockEp) return;

      const newNotif: Notification = {
        id: 'ep_demon_slayer_s3e1',
        title: '🔥 New Episode — Demon Slayer',
        message: 'Hashira Training Arc - Episode 5 is now streaming in 1080p. Your watchlist updated!',
        type: 'info',
        category: 'episodes',
        timestamp: Date.now(),
        read: false,
        link: '/search?query=Demon+Slayer',
      };
      const updated = [newNotif, ...existingNotifs];
      localStorage.setItem('toonplayer_notifications', JSON.stringify(updated));
      setNotifications([...updated]);
    }, 12000);

    return () => {
      clearTimeout(aiTimer);
      clearTimeout(communityTimer);
      clearTimeout(episodeTimer);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = (notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    // Check preference before adding
    const catKey = notif.category as keyof NotificationPreferences;
    if (catKey in preferences && !preferences[catKey]) return;

    const newNotif: Notification = {
      ...notif,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      read: false,
    };
    const updated = [newNotif, ...notifications].slice(0, 50);
    setNotifications(updated);
    localStorage.setItem('toonplayer_notifications', JSON.stringify(updated));
  };

  const markAsRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    localStorage.setItem('toonplayer_notifications', JSON.stringify(updated));
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem('toonplayer_notifications', JSON.stringify(updated));
  };

  const clearNotifications = () => {
    setNotifications([]);
    localStorage.removeItem('toonplayer_notifications');
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    localStorage.setItem('toonplayer_notif_prefs', JSON.stringify(updated));
  };

  return (
    <NotificationContext.Provider value={{
      notifications, preferences, unreadCount,
      addNotification, markAsRead, markAllAsRead, clearNotifications, updatePreference,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
}
