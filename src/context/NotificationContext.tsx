"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'update' | 'alert';
  timestamp: number;
  read: boolean;
  link?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('toonplayer_notifications');
    if (saved) {
      try {
        setNotifications(JSON.parse(saved));
      } catch (e) {
        setNotifications([]);
      }
    } else {
      const initial1: Notification = {
        id: 'welcome_v1_7',
        title: '🚀 ToonPlayer V1.7 Released!',
        message: 'Massive update: Ultra-fast UI with zero lag on mobile devices, automatic server fallback system, new ToonNortan server, and fully working Share & Watchlist features!',
        type: 'update',
        timestamp: Date.now(),
        read: false
      };
      setNotifications([initial1]);
      localStorage.setItem('toonplayer_notifications', JSON.stringify([initial1]));
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = (notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: Notification = {
      ...notif,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      read: false
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

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
