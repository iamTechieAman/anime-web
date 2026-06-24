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

export function getAvatarUrl(name: string, theme: string = 'orange'): string {
  const seed = (name || "Avatar").trim();
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

const DICEBEAR_SEEDS = ["Totoro", "Ponyo", "Luffy", "Naruto", "Nezuko", "Goku", "Pikachu", "Chihiro", "Felix", "Aneka", "Milo", "Luna", "Oliver", "Shadow", "Midnight", "Frost"];

export function getRandomBitmojiUrl(name?: string): string {
  const seed = name && name.trim() ? name.trim() : DICEBEAR_SEEDS[Math.floor(Math.random() * DICEBEAR_SEEDS.length)];
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

const defaultSettings: UserSettings = {
  autoplay: true,
  autoSkipIntro: false,
  highQuality: true,
  reduceMotion: false,
  subtitleLanguage: 'en',
};

const defaultProfiles: Profile[] = [
  { id: 'profile-kids', name: 'Kids', avatar: getAvatarUrl('Kids', 'green'), type: 'kids', isKids: true, theme: 'green' },
  { id: 'profile-guest', name: 'Guest', avatar: getAvatarUrl('Guest', 'purple'), type: 'guest', isKids: false, theme: 'purple' }
];

export function isKidsFriendly(item: any): boolean {
  if (!item) return false;
  
  const title = (item.title || item.name || "").toLowerCase();
  const overview = (item.overview || "").toLowerCase();
  
  // Hide: 18+, Horror, Erotic, Violence, Thriller, Crime
  const blockedKeywords = [
    "18+", "horror", "erotic", "violence", "gore", "bloody", "slasher", "sexy", "adult", 
    "nsfw", "ecchi", "hentai", "thriller", "crime", "murder", "assassin", "gangster", 
    "mafia", "suicide", "dark", "satan", "demon slayer", "chainsaw man", "jujutsu kaisen",
    "attack on titan", "death note", "tokyo ghoul", "hellsing", "berserk", "goblin slayer"
  ];
  
  if (item.adult) return false;
  
  if (blockedKeywords.some(keyword => title.includes(keyword) || overview.includes(keyword))) {
    return false;
  }
  
  // Block via TMDB genre IDs (27 = Horror, 53 = Thriller, 80 = Crime)
  const genreIds = item.genre_ids || [];
  if (genreIds.some((id: number) => id === 27 || id === 53 || id === 80)) {
    return false;
  }
  
  const genres = item.genres || [];
  if (genres.some((g: any) => {
    const name = typeof g === 'string' ? g.toLowerCase() : (g.name || "").toLowerCase();
    return name.includes('horror') || name.includes('thriller') || name.includes('crime') || name.includes('adult') || name.includes('erotic') || name.includes('violence');
  })) {
    return false;
  }
  
  // Only allow: Kids Movies, Kids Anime, Kids Shows, Disney, Pixar, Cartoons, Family
  const allowedKeywords = [
    "kids", "kid", "cartoon", "pixar", "disney", "dreamworks", "ghibli", "family", "toy story",
    "shrek", "frozen", "nemo", "lion king", "mickey", "donald", "doraemon", "shin chan", "ben 10",
    "powerpuff", "tom and jerry", "adventure time", "pokemon", "naruto", "one piece", "anime",
    "animation", "cocomelon", "peppa", "barbie", "lego", "nickelodeon", "disney+", "pixar", "spongebob",
    "looney tunes", "scooby", "avatar the last airbender", "phineas", "gravity falls"
  ];
  
  if (allowedKeywords.some(keyword => title.includes(keyword))) {
    return true;
  }
  
  // TMDB Genres: 10751 = Family, 10762 = Kids, 16 = Animation
  if (genreIds.some((id: number) => id === 10751 || id === 10762 || id === 16)) {
    return true;
  }
  
  if (genres.some((g: any) => {
    const name = typeof g === 'string' ? g.toLowerCase() : (g.name || "").toLowerCase();
    return name.includes('family') || name.includes('kids') || name.includes('animation') || name.includes('child') || name.includes('disney') || name.includes('pixar') || name.includes('cartoon');
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

      addProfile: (profile) => set((state) => {
        const avatar = profile.avatar
          ? profile.avatar 
          : getRandomBitmojiUrl(profile.name);
        return {
          profiles: [...state.profiles, { ...profile, avatar, id: `profile-${Date.now()}` } as Profile]
        };
      }),

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
              window.sessionStorage.setItem("toonplayer-session-active", "true");
              window.sessionStorage.setItem("toonplayer_active_profile_id", id);
              document.cookie = `toonplayer_active_profile_id=${id}; path=/; max-age=31536000; SameSite=Lax`;
            }
          } else {
            localStorage.removeItem("toonplayer_profile");
            window.sessionStorage.removeItem("toonplayer-session-active");
            window.sessionStorage.removeItem("toonplayer_active_profile_id");
            document.cookie = "toonplayer_active_profile_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
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
