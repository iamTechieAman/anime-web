import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  type: 'adult' | 'teen' | 'kids' | 'guest';
  isKids: boolean;
  theme: string;
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
  syncProfile: (profile: Partial<Profile> & { id: string; name: string; avatar: string }) => void; // Sync external profile (e.g. Clerk)
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
  { id: 'profile-adult', name: 'Adult', avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Adult', type: 'adult', isKids: false, theme: 'red' },
  { id: 'profile-teen', name: 'Teen', avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Teen', type: 'teen', isKids: false, theme: 'blue' },
  { id: 'profile-kids', name: 'Kids', avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Kids', type: 'kids', isKids: true, theme: 'green' },
  { id: 'profile-guest', name: 'Guest', avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Guest', type: 'guest', isKids: false, theme: 'purple' }
];

export function isKidsFriendly(item: any): boolean {
  if (!item) return false;
  
  const title = (item.title || item.name || "").toLowerCase();
  const overview = (item.overview || "").toLowerCase();
  
  // Explicitly hide Horror, Thriller, Adult, Crime
  const blockedKeywords = [
    "horror", "thriller", "slasher", "gore", "bloody", "crime", "murder", "assassin",
    "serial killer", "erotic", "adult", "sexy", "dracula", "fifty shades", "vampire",
    "mafia", "gangster", "narcos", "breaking bad", "death note", "chainsaw man"
  ];
  
  if (item.adult) return false;
  
  if (blockedKeywords.some(keyword => title.includes(keyword))) {
    return false;
  }
  
  const genreIds = item.genre_ids || [];
  if (genreIds.some((id: number) => id === 27 || id === 53 || id === 80)) {
    return false;
  }
  
  const genres = item.genres || [];
  if (genres.some((g: any) => {
    const name = typeof g === 'string' ? g.toLowerCase() : (g.name || "").toLowerCase();
    return name.includes('horror') || name.includes('thriller') || name.includes('crime') || name.includes('adult');
  })) {
    return false;
  }
  
  // Only show Kids movies, Kids anime, Cartoons, Pixar, Disney, Dreamworks, Studio Ghibli, Family
  const allowedKeywords = [
    "kids", "kid", "cartoon", "pixar", "disney", "dreamworks", "ghibli", "family", "toy story",
    "shrek", "frozen", "nemo", "lion king", "mickey", "donald", "anime", "pokemon", "naruto", "one piece",
    "doraemon", "shin chan", "ben 10", "powerpuff", "tom and jerry", "rick and morty", "adventure time",
    "ed, edd n eddy", "grinch"
  ];
  
  if (allowedKeywords.some(keyword => title.includes(keyword))) {
    return true;
  }
  
  if (genreIds.some((id: number) => id === 10751 || id === 10762 || id === 16)) {
    return true;
  }
  
  if (genres.some((g: any) => {
    const name = typeof g === 'string' ? g.toLowerCase() : (g.name || "").toLowerCase();
    return name.includes('family') || name.includes('kids') || name.includes('animation') || name.includes('child');
  })) {
    return true;
  }
  
  return false;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      profiles: defaultProfiles,
      activeProfileId: null,
      history: {},
      watchlist: {},
      settings: {},

      addProfile: (profile) => set((state) => ({
        profiles: [...state.profiles, { ...profile, id: `profile-${Date.now()}` } as Profile]
      })),

      removeProfile: (id) => set((state) => ({
        profiles: state.profiles.filter(p => p.id !== id),
        activeProfileId: state.activeProfileId === id ? null : state.activeProfileId
      })),

      setActiveProfile: (id) => set((state) => {
        if (typeof window !== 'undefined') {
          if (id) {
            const profile = state.profiles.find(p => p.id === id);
            if (profile) {
              localStorage.setItem("toonplayer_profile", JSON.stringify(profile));
              localStorage.setItem(`kids-filter-${id}`, profile.isKids ? 'true' : 'false');
            }
          } else {
            localStorage.removeItem("toonplayer_profile");
          }
          setTimeout(() => {
            window.dispatchEvent(new Event("profileUpdated"));
          }, 0);
        }
        return { activeProfileId: id };
      }),

      syncProfile: (profile) => set((state) => {
        const fullProfile = {
          type: 'adult' as const,
          isKids: false,
          theme: 'red',
          ...profile
        };
        const exists = state.profiles.find(p => p.id === profile.id);
        if (exists) {
            return {
                profiles: state.profiles.map(p => p.id === profile.id ? { ...p, ...fullProfile } as Profile : p)
            };
        }
        return { profiles: [fullProfile as Profile, ...state.profiles] };
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
