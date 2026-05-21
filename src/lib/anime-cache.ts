/**
 * ToonPlayer — In-Memory Anime Cache
 * Simple TTL-based Map cache. No Redis required.
 * Survives for the lifetime of the serverless function instance.
 *
 * TTL Guide:
 *  - AniList metadata: 60 min (rarely changes)
 *  - Episode lists:    30 min (new eps drop daily)
 *  - Stream sources:   5  min (CDN URLs expire)
 *  - Provider health:  10 min
 */

interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

class AnimeCache {
    private store = new Map<string, CacheEntry<any>>();
    private readonly MAX_SIZE = 500; // prevent unbounded memory growth

    set<T>(key: string, value: T, ttlMs: number): void {
        // Evict oldest if at capacity
        if (this.store.size >= this.MAX_SIZE) {
            const firstKey = this.store.keys().next().value;
            if (firstKey) this.store.delete(firstKey);
        }
        this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    }

    get<T>(key: string): T | null {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return entry.value as T;
    }

    has(key: string): boolean {
        return this.get(key) !== null;
    }

    delete(key: string): void {
        this.store.delete(key);
    }

    /** Purge all expired entries */
    purge(): void {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
            if (now > entry.expiresAt) this.store.delete(key);
        }
    }

    get size(): number {
        return this.store.size;
    }
}

// Singleton instance — shared across requests in same serverless instance
export const animeCache = new AnimeCache();

// TTL constants (ms)
export const TTL = {
    ANILIST_META: 60 * 60 * 1000,   // 60 min
    EPISODE_LIST: 30 * 60 * 1000,   // 30 min
    SOURCES:       5 * 60 * 1000,   //  5 min
    PROVIDER_HEALTH: 10 * 60 * 1000, // 10 min
    JIKAN_META:   120 * 60 * 1000,  // 2 hours
} as const;

// Cache key builders
export const cacheKey = {
    anilist: (id: string) => `al:${id}`,
    episodes: (animeId: string, provider: string) => `ep:${provider}:${animeId}`,
    sources: (animeId: string, ep: string, mode: string) => `src:${animeId}:${ep}:${mode}`,
    jikan: (malId: string) => `jk:${malId}`,
    search: (query: string, provider: string) => `s:${provider}:${query.toLowerCase().trim()}`,
} as const;
