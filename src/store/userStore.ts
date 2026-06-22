import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  isKids?: boolean;
}

export interface WatchHistoryItem {
  id: string;
  type: string;
  title: string;
  poster: string;
  progress: number;
  duration: number;
  episode?: number;
  season?: number;
  timestamp: number;
}

export interface UserSettings {
  autoplay: boolean;
  autoSkipIntro: boolean;
  highQuality: boolean;
  reduceMotion: boolean;
  subtitleLanguage: string;
}

interface UserState {
  profiles: Profile[];
  activeProfileId: string | null;
  history: Record<string, WatchHistoryItem[]>; // Keyed by profileId
  watchlist: Record<string, any[]>; // Keyed by profileId
  settings: Record<string, UserSettings>; // Keyed by profileId
  
  // Actions
  addProfile: (profile: Omit<Profile, 'id'>) => void;
  removeProfile: (id: string) => void;
  setActiveProfile: (id: string | null) => void;
  syncProfile: (profile: Profile) => void; // Sync external profile (e.g. Clerk)
  updateSettings: (profileId: string, settings: Partial<UserSettings>) => void;
  addToHistory: (profileId: string, item: WatchHistoryItem) => void;
  addToWatchlist: (profileId: string, item: any) => void;
  removeFromWatchlist: (profileId: string, itemId: string) => void;
}

const defaultSettings: UserSettings = {
  autoplay: true,
  autoSkipIntro: false,
  highQuality: true,
  reduceMotion: false,
  subtitleLanguage: 'en',
};

const defaultProfiles: Profile[] = [
  { id: 'profile-kids', name: 'Kids', avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Kids', isKids: true },
  { id: 'profile-guest', name: 'Guest', avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Guest' }
];

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      profiles: defaultProfiles,
      activeProfileId: null,
      history: {},
      watchlist: {},
      settings: {},

      addProfile: (profile) => set((state) => ({
        profiles: [...state.profiles, { ...profile, id: `profile-${Date.now()}` }]
      })),

      removeProfile: (id) => set((state) => ({
        profiles: state.profiles.filter(p => p.id !== id),
        activeProfileId: state.activeProfileId === id ? null : state.activeProfileId
      })),

      setActiveProfile: (id) => set({ activeProfileId: id }),

      syncProfile: (profile) => set((state) => {
        const exists = state.profiles.find(p => p.id === profile.id);
        if (exists) {
            return {
                profiles: state.profiles.map(p => p.id === profile.id ? { ...p, ...profile } : p)
            };
        }
        return { profiles: [profile, ...state.profiles] };
      }),

      updateSettings: (profileId, newSettings) => set((state) => ({
        settings: {
          ...state.settings,
          [profileId]: { ...(state.settings[profileId] || defaultSettings), ...newSettings }
        }
      })),

      addToHistory: (profileId, item) => set((state) => {
        const userHistory = state.history[profileId] || [];
        const filtered = userHistory.filter(h => h.id !== item.id);
        return {
          history: {
            ...state.history,
            [profileId]: [item, ...filtered].slice(0, 100) // Keep last 100
          }
        };
      }),

      addToWatchlist: (profileId, item) => set((state) => {
        const userWatchlist = state.watchlist[profileId] || [];
        if (userWatchlist.find(w => w.id === item.id)) return state;
        return {
          watchlist: {
            ...state.watchlist,
            [profileId]: [item, ...userWatchlist]
          }
        };
      }),

      removeFromWatchlist: (profileId, itemId) => set((state) => {
        const userWatchlist = state.watchlist[profileId] || [];
        return {
          watchlist: {
            ...state.watchlist,
            [profileId]: userWatchlist.filter(w => w.id !== itemId)
          }
        };
      })
    }),
    {
      name: 'toonplayer-unified-store',
      storage: createJSONStorage(() => {
        // Fallback to in-memory if localStorage fails (e.g., incognito)
        try {
          return window.localStorage;
        } catch {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {}
          };
        }
      })
    }
  )
);
