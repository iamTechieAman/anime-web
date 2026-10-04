/**
 * ============================================================================
 * Scraper & Catalog Caching Layer (In-Memory LRU + Redis Hook)
 * ============================================================================
 * Provides sub-millisecond cached responses for:
 * - Scraped home catalogs (TTL: 30-60 mins)
 * - Show season/episode listings (TTL: 1-2 hours)
 * - Resolved server embed sources (TTL: 5-15 mins)
 * - Search results (TTL: 15-30 mins)
 */

interface CacheNode<T> {
  key: string;
  value: T;
  expiresAt: number;
}

export class ScraperCache {
  private cache = new Map<string, CacheNode<any>>();
  private maxCapacity: number;
  private hits = 0;
  private misses = 0;

  constructor(maxCapacity = 2500) {
    this.maxCapacity = maxCapacity;
  }

  /**
   * Get an item from the cache
   */
  async get<T>(key: string): Promise<T | null> {
    const node = this.cache.get(key);

    if (!node) {
      this.misses++;
      // Optional: Check Redis if configured
      return this.getFromRedis<T>(key);
    }

    // Check expiration
    if (Date.now() > node.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Move to most recently used (LRU re-insertion)
    this.cache.delete(key);
    this.cache.set(key, node);
    this.hits++;
    return node.value as T;
  }

  /**
   * Synchronous get for non-async call sites
   */
  getSync<T>(key: string): T | null {
    const node = this.cache.get(key);
    if (!node) return null;
    if (Date.now() > node.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    this.cache.delete(key);
    this.cache.set(key, node);
    return node.value as T;
  }

  /**
   * Set an item with TTL in seconds
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const ttlMs = ttlSeconds * 1000;

    // LRU eviction if capacity exceeded
    if (this.cache.size >= this.maxCapacity) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      key,
      value,
      expiresAt: Date.now() + ttlMs,
    });

    // Optional: write-through to Redis
    await this.setInRedis(key, value, ttlSeconds);
  }

  /**
   * Synchronous set
   */
  setSync<T>(key: string, value: T, ttlSeconds: number): void {
    const ttlMs = ttlSeconds * 1000;
    if (this.cache.size >= this.maxCapacity) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, {
      key,
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Delete an item
   */
  async del(key: string): Promise<void> {
    this.cache.delete(key);
    await this.delInRedis(key);
  }

  /**
   * Clear all items in memory
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Read-through cache helper: Returns cached data or fetches fresh, caches, and returns.
   */
  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttlSeconds: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const fresh = await fetchFn();
    if (fresh !== null && fresh !== undefined) {
      await this.set(key, fresh, ttlSeconds);
    }
    return fresh;
  }

  /**
   * Performance metrics
   */
  stats() {
    const total = this.hits + this.misses;
    const hitRatio = total > 0 ? (this.hits / total) * 100 : 0;
    return {
      size: this.cache.size,
      maxCapacity: this.maxCapacity,
      hits: this.hits,
      misses: this.misses,
      hitRatio: `${hitRatio.toFixed(1)}%`,
    };
  }

  // --------------------------------------------------------------------------
  // Optional Redis Adapter (Upstash REST or Redis URL)
  // --------------------------------------------------------------------------

  private async getFromRedis<T>(key: string): Promise<T | null> {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!redisUrl || !redisToken) return null;

    try {
      const res = await fetch(`${redisUrl}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.result) {
        return JSON.parse(data.result) as T;
      }
    } catch {
      // Fallback silently if Redis is unreachable
    }
    return null;
  }

  private async setInRedis<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!redisUrl || !redisToken) return;

    try {
      const strVal = JSON.stringify(value);
      await fetch(`${redisUrl}/setex/${encodeURIComponent(key)}/${ttlSeconds}/${encodeURIComponent(strVal)}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
        cache: 'no-store',
      });
    } catch {
      // Non-blocking write
    }
  }

  private async delInRedis(key: string): Promise<void> {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!redisUrl || !redisToken) return;

    try {
      await fetch(`${redisUrl}/del/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
        cache: 'no-store',
      });
    } catch {}
  }
}

// Global Singleton Cache Instance
export const scraperCache = new ScraperCache(2500);

export const SCRAPER_TTL = {
  HOME_CATALOG: 3600,       // 1 hour
  SHOW_DETAILS: 7200,       // 2 hours
  EPISODE_LIST: 7200,       // 2 hours
  STREAM_SERVERS: 900,      // 15 mins
  SEARCH_RESULTS: 1800,     // 30 mins
};
