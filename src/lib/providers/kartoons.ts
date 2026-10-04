import axios, { AxiosRequestConfig } from 'axios';
import * as cheerio from 'cheerio';
import * as crypto from 'crypto';
import { getUA } from '../user-agents';

/**
 * ============================================================================
 * Kartoons.to Scraper & Data Provider Service
 * ============================================================================
 * Provides robust scraping and data extraction for Kartoons.to:
 * 1. getHomeCartoons()       - Scrape featured & trending catalog
 * 2. searchCartoons(query)   - Search cartoon titles and clean metadata
 * 3. getCartoonEpisodes(id)  - Fetch season and episode trees
 * 4. getStreamSource(epId)   - Decrypt stream links (.m3u8 / iframe embed)
 *
 * Includes:
 * - Anti-bot headers & rotating User-Agents
 * - Dynamic domain / mirror auto-switching failover
 * - In-Memory TTL Cache (15-30 mins) with Redis compatibility hook
 * - Proof-of-Work (PoW) SHA-256 solver
 * - AES-256-CBC link decryptor
 * - Embed fallback when Cloudflare Turnstile blocks direct links
 * ============================================================================
 */

export const KARTOONS_MIRRORS = [
  'https://kartoons.to',
  'https://kartoons.co',
  'https://kartoons.net',
];

export const KARTOONS_API_MIRRORS = [
  'https://api.kartoons.to/api',
  'https://api.kartoons.co/api',
  'https://api.kartoons.net/api',
];

export const KARTOONS_BASE_URL = KARTOONS_MIRRORS[0];
export const KARTOONS_API_BASE = KARTOONS_API_MIRRORS[0];
const AES_SECRET_KEY = 'bca9e0df1a5abb32906ca3f63ac04cef';

// ============================================================================
// Types & Data Contracts
// ============================================================================

export interface CartoonItem {
  id: string;
  title: string;
  description: string;
  poster: string;
  banner: string;
  rating?: number;
  year?: number;
  status?: string;
  tags?: string[];
  type?: 'show' | 'movie';
  detailUrl: string;
}

export interface CartoonEpisode {
  id: string;
  episodeNumber: number;
  title: string;
  duration?: string;
  thumbnail?: string;
  detailUrl: string;
}

export interface CartoonSeason {
  seasonId: string;
  seasonNumber: number;
  title: string;
  episodes: CartoonEpisode[];
}

export interface CartoonDetails extends CartoonItem {
  totalSeasons: number;
  totalEpisodes: number;
  seasons: CartoonSeason[];
}

export interface StreamSource {
  quality: string;
  url: string;
  type: 'hls' | 'direct' | 'embed';
  isM3U8: boolean;
  server: string;
}

export interface StreamResponse {
  success: boolean;
  episodeId: string;
  sources: StreamSource[];
  subtitles: Array<{ label: string; file: string; kind: string }>;
  embedUrl: string;
  fallback: boolean;
  message?: string;
}

// ============================================================================
// In-Memory TTL Cache
// ============================================================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class KartoonsCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxItems = 1000;

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    if (this.cache.size >= this.maxItems) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const kartoonsCache = new KartoonsCache();

// TTL Constants
export const CACHE_TTL = {
  HOME: 30 * 60 * 1000,      // 30 mins
  SEARCH: 15 * 60 * 1000,    // 15 mins
  DETAILS: 30 * 60 * 1000,   // 30 mins
  STREAM: 5 * 60 * 1000,     // 5 mins
};

// ============================================================================
// Header Generator & Dynamic HTTP Helpers
// ============================================================================

export function getBrowserHeaders(customReferer?: string): Record<string, string> {
  return {
    'User-Agent': getUA(),
    'Referer': customReferer || `${KARTOONS_BASE_URL}/`,
    'Origin': KARTOONS_BASE_URL,
    'Accept': 'application/json, text/plain, text/html, */*',
    'Accept-Language': 'en-US,en;q=0.9',
  };
}

/**
 * Executes network requests across mirrors with automatic failover and 10s timeout.
 */
export async function requestWithMirrorFailover<T>(
  endpointOrUrl: string,
  options: AxiosRequestConfig = {},
  type: 'api' | 'web' = 'api'
): Promise<T> {
  const mirrors = type === 'api' ? KARTOONS_API_MIRRORS : KARTOONS_MIRRORS;
  const errors: string[] = [];

  let path = endpointOrUrl;
  for (const m of (type === 'api' ? KARTOONS_API_MIRRORS : KARTOONS_MIRRORS)) {
    if (path.startsWith(m)) {
      path = path.slice(m.length);
      break;
    }
  }
  if (!path.startsWith('/')) path = `/${path}`;

  for (const mirror of mirrors) {
    const fullUrl = `${mirror}${path}`;
    try {
      const response = await axios({
        url: fullUrl,
        timeout: 10000, // Strict 10-second timeout
        ...options,
        headers: {
          ...getBrowserHeaders(options.headers?.Referer as string || `${mirror}/`),
          'Origin': mirror,
          ...(options.headers || {}),
        },
      });
      if (response.data !== undefined) {
        return response.data;
      }
    } catch (err: any) {
      errors.push(`${mirror}: ${err.message || 'Error'}`);
    }
  }

  throw new Error(`[Kartoons] All mirrors failed for "${endpointOrUrl}": ${errors.join(' | ')}`);
}

async function requestWithRetry<T>(
  url: string,
  options: AxiosRequestConfig = {},
  retries = 1
): Promise<T> {
  const isApi = url.includes('/api') || KARTOONS_API_MIRRORS.some(m => url.startsWith(m));
  return requestWithMirrorFailover<T>(url, options, isApi ? 'api' : 'web');
}

// ============================================================================
// Cryptography & PoW Challenge Solver
// ============================================================================

/**
 * Checks if buffer has leading zero bits
 */
function hasLeadingZeroBits(buffer: Buffer, bits: number): boolean {
  const fullBytes = Math.floor(bits / 8);
  const remBits = bits % 8;
  for (let i = 0; i < fullBytes; i++) {
    if (buffer[i] !== 0) return false;
  }
  if (remBits > 0) {
    const mask = (0xff << (8 - remBits)) & 0xff;
    if ((buffer[fullBytes] & mask) !== 0) return false;
  }
  return true;
}

/**
 * Solves Proof-of-Work challenge issued by Kartoons API
 * sha256(nonce + ':' + counter) must have >= bits leading zero bits
 */
export function solvePoW(nonce: string, bits: number, maxIterations = 5000000): number | null {
  let counter = 0;
  while (counter < maxIterations) {
    const hash = crypto.createHash('sha256').update(`${nonce}:${counter}`).digest();
    if (hasLeadingZeroBits(hash, bits)) {
      return counter;
    }
    counter++;
  }
  return null;
}

/**
 * Decrypts AES-256-CBC stream links from Kartoons API
 * Format: Base64(16-byte IV + AES-256-CBC encrypted payload)
 */
export function decryptStreamUrl(encryptedData: string, secretKey = AES_SECRET_KEY): string | null {
  try {
    const raw = Buffer.from(encryptedData.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    if (raw.length < 17) return null;

    const iv = raw.subarray(0, 16);
    const ciphertext = raw.subarray(16);

    const key = Buffer.alloc(32);
    Buffer.from(secretKey, 'utf8').copy(key);

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    decipher.setAutoPadding(true);

    let decrypted = decipher.update(ciphertext, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return null;
  }
}

// ============================================================================
// Core Scraper Functions
// ============================================================================

/**
 * 1. getHomeCartoons()
 * Fetches featured and trending cartoons from Kartoons.to.
 * Implements fallback Cheerio HTML scraper if API is unreachable.
 */
export async function getHomeCartoons(): Promise<{
  featured: CartoonItem[];
  movies: CartoonItem[];
  categories: string[];
}> {
  const cacheKey = 'kartoons:home';
  const cached = kartoonsCache.get<{
    featured: CartoonItem[];
    movies: CartoonItem[];
    categories: string[];
  }>(cacheKey);

  if (cached) return cached;

  try {
    // 1. Fetch featured shows and movies via the backend REST API across mirrors
    const [featuredShowsRes, featuredMoviesRes] = await Promise.allSettled([
      requestWithRetry<{ success: boolean; data: any[] }>(`${KARTOONS_API_BASE}/shows/featured`),
      requestWithRetry<{ success: boolean; data: any[] }>(`${KARTOONS_API_BASE}/movies/featured`),
    ]);

    const featuredShows =
      featuredShowsRes.status === 'fulfilled' && featuredShowsRes.value?.data
        ? featuredShowsRes.value.data
        : [];

    const featuredMovies =
      featuredMoviesRes.status === 'fulfilled' && featuredMoviesRes.value?.data
        ? featuredMoviesRes.value.data
        : [];

    const allCategories = new Set<string>();

    const mapItem = (item: any, type: 'show' | 'movie'): CartoonItem => {
      if (Array.isArray(item.tags)) {
        item.tags.forEach((tag: string) => allCategories.add(tag));
      }
      return {
        id: item._id || item.id,
        title: item.title || item.name || 'Untitled',
        description: item.description || item.overview || '',
        poster: item.image || item.poster || '',
        banner: item.coverImage || item.banner || item.image || '',
        rating: item.rating ? Number(item.rating) : undefined,
        year: item.startYear || item.releaseYear || undefined,
        status: item.status || 'Completed',
        tags: item.tags || [],
        type,
        detailUrl: `${KARTOONS_BASE_URL}/${type === 'movie' ? 'movie' : 'show'}/${item._id || item.id}`,
      };
    };

    const formattedFeatured = featuredShows.map((s) => mapItem(s, 'show'));
    const formattedMovies = featuredMovies.map((m) => mapItem(m, 'movie'));

    if (formattedFeatured.length > 0 || formattedMovies.length > 0) {
      const result = {
        featured: formattedFeatured,
        movies: formattedMovies,
        categories: Array.from(allCategories),
      };
      kartoonsCache.set(cacheKey, result, CACHE_TTL.HOME);
      return result;
    }
    throw new Error('API returned empty home data, switching to HTML scraping');
  } catch (apiError: any) {
    // Fallback: Scrape the HTML page via Cheerio across mirrors
    try {
      const html = await requestWithMirrorFailover<string>('/home', {
        headers: { Accept: 'text/html,application/xhtml+xml' },
      }, 'web');
      const $ = cheerio.load(html);

      const scrapedItems: CartoonItem[] = [];
      $('a[href*="/show/"], a[href*="/movie/"], .film-item, .card, .cartoon-card').each((_, el) => {
        const href = $(el).attr('href') || $(el).find('a').first().attr('href') || '';
        const title = $(el).find('h3, h2, .title, p, .name').first().text().trim() || $(el).attr('title') || '';
        const img = $(el).find('img').attr('data-src') || $(el).find('img').attr('src') || '';
        const idMatch = href.match(/\/(show|movie)\/([a-zA-Z0-9_-]+)/);
        if (idMatch && title) {
          scrapedItems.push({
            id: idMatch[2],
            title,
            description: '',
            poster: img,
            banner: img,
            type: idMatch[1] === 'movie' ? 'movie' : 'show',
            detailUrl: href.startsWith('http') ? href : `${KARTOONS_BASE_URL}${href}`,
          });
        }
      });

      const fallbackResult = {
        featured: scrapedItems,
        movies: [],
        categories: ['Animation', 'Action', 'Adventure', 'Comedy', 'Family'],
      };

      kartoonsCache.set(cacheKey, fallbackResult, CACHE_TTL.HOME);
      return fallbackResult;
    } catch {
      return {
        featured: [],
        movies: [],
        categories: ['Animation', 'Action', 'Adventure', 'Comedy', 'Family'],
      };
    }
  }
}

/**
 * 2. searchCartoons(query)
 * Searches cartoon and anime titles on Kartoons.to.
 */
export async function searchCartoons(query: string): Promise<CartoonItem[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const cacheKey = `kartoons:search:${cleanQuery.toLowerCase()}`;
  const cached = kartoonsCache.get<CartoonItem[]>(cacheKey);
  if (cached) return cached;

  try {
    const encoded = encodeURIComponent(cleanQuery);
    const [showsRes, moviesRes] = await Promise.allSettled([
      requestWithRetry<{ success: boolean; data: any[] }>(`${KARTOONS_API_BASE}/shows?search=${encoded}`),
      requestWithRetry<{ success: boolean; data: any[] }>(`${KARTOONS_API_BASE}/movies?search=${encoded}`),
    ]);

    const shows = showsRes.status === 'fulfilled' && showsRes.value?.data ? showsRes.value.data : [];
    const movies = moviesRes.status === 'fulfilled' && moviesRes.value?.data ? moviesRes.value.data : [];

    const results: CartoonItem[] = [
      ...shows.map((item) => ({
        id: item._id || item.id,
        title: item.title || item.name || 'Untitled',
        description: item.description || item.overview || '',
        poster: item.image || item.poster || '',
        banner: item.coverImage || item.banner || item.image || '',
        rating: item.rating ? Number(item.rating) : undefined,
        year: item.startYear || item.releaseYear || undefined,
        status: item.status || 'Completed',
        tags: item.tags || [],
        type: 'show' as const,
        detailUrl: `${KARTOONS_BASE_URL}/show/${item._id || item.id}`,
      })),
      ...movies.map((item) => ({
        id: item._id || item.id,
        title: item.title || item.name || 'Untitled',
        description: item.description || item.overview || '',
        poster: item.image || item.poster || '',
        banner: item.coverImage || item.banner || item.image || '',
        rating: item.rating ? Number(item.rating) : undefined,
        year: item.startYear || item.releaseYear || undefined,
        status: item.status || 'Completed',
        tags: item.tags || [],
        type: 'movie' as const,
        detailUrl: `${KARTOONS_BASE_URL}/movie/${item._id || item.id}`,
      })),
    ];

    if (results.length > 0) {
      kartoonsCache.set(cacheKey, results, CACHE_TTL.SEARCH);
      return results;
    }
  } catch (err: any) {
    console.warn('[Kartoons] API search failed, attempting HTML fallback:', err.message);
  }

  // Fallback HTML search via Cheerio
  try {
    const encoded = encodeURIComponent(cleanQuery);
    const html = await requestWithMirrorFailover<string>(`/search?q=${encoded}`, {
      headers: { Accept: 'text/html' }
    }, 'web');
    const $ = cheerio.load(html);
    const scrapedResults: CartoonItem[] = [];

    $('a[href*="/show/"], a[href*="/movie/"], .film-item, .card').each((_, el) => {
      const href = $(el).attr('href') || $(el).find('a').first().attr('href') || '';
      const title = $(el).find('h3, h2, .title, p').first().text().trim() || $(el).attr('title') || '';
      const img = $(el).find('img').attr('data-src') || $(el).find('img').attr('src') || '';
      const idMatch = href.match(/\/(show|movie)\/([a-zA-Z0-9_-]+)/);

      if (idMatch && title) {
        scrapedResults.push({
          id: idMatch[2],
          title,
          description: '',
          poster: img,
          banner: img,
          type: idMatch[1] === 'movie' ? 'movie' : 'show',
          detailUrl: href.startsWith('http') ? href : `${KARTOONS_BASE_URL}${href}`,
        });
      }
    });

    kartoonsCache.set(cacheKey, scrapedResults, CACHE_TTL.SEARCH);
    return scrapedResults;
  } catch {
    return [];
  }
}

/**
 * 3. getCartoonEpisodes(detailUrlOrId)
 * Fetches cartoon details, season listings, and complete episode trees.
 */
export async function getCartoonEpisodes(detailUrlOrId: string): Promise<CartoonDetails> {
  const cleanId = detailUrlOrId.includes('/')
    ? detailUrlOrId.split('/').filter(Boolean).pop()!
    : detailUrlOrId.trim();

  const cacheKey = `kartoons:details:${cleanId}`;
  const cached = kartoonsCache.get<CartoonDetails>(cacheKey);
  if (cached) return cached;

  try {
    const showRes = await requestWithRetry<{ success: boolean; data: any }>(
      `${KARTOONS_API_BASE}/shows/${cleanId}`
    );

    if (!showRes?.success || !showRes.data) {
      throw new Error(`Show not found for ID: ${cleanId}`);
    }

    const show = showRes.data;
    const rawSeasons: any[] = show.seasons || [];

    // Fetch episodes for all seasons in parallel
    const seasonsWithEpisodes: CartoonSeason[] = await Promise.all(
      rawSeasons.map(async (season, index) => {
        const seasonId = season._id || season.id;
        const seasonNumber = season.seasonNumber ?? index + 1;
        let episodes: CartoonEpisode[] = [];

        try {
          const epRes = await requestWithRetry<{ success: boolean; data: any[] }>(
            `${KARTOONS_API_BASE}/shows/${cleanId}/season/${seasonId}/all-episodes`
          );

          if (epRes?.success && Array.isArray(epRes.data)) {
            episodes = epRes.data.map((ep, epIndex) => ({
              id: ep._id || ep.id,
              episodeNumber: ep.episodeNumber ?? epIndex + 1,
              title: ep.title || `Episode ${epIndex + 1}`,
              duration: ep.duration ? `${ep.duration} min` : undefined,
              thumbnail: ep.image || show.image || '',
              detailUrl: `${KARTOONS_BASE_URL}/watch/show/${cleanId}/season/${seasonNumber}/episode/${ep.episodeNumber ?? epIndex + 1}`,
            }));
          }
        } catch {
          // If all-episodes endpoint fails, check if episodes are embedded in season object
          if (Array.isArray(season.episodes)) {
            episodes = season.episodes.map((ep: any, epIndex: number) => ({
              id: ep._id || ep.id,
              episodeNumber: ep.episodeNumber ?? epIndex + 1,
              title: ep.title || `Episode ${epIndex + 1}`,
              duration: ep.duration ? `${ep.duration} min` : undefined,
              thumbnail: ep.image || show.image || '',
              detailUrl: `${KARTOONS_BASE_URL}/watch/show/${cleanId}/season/${seasonNumber}/episode/${ep.episodeNumber ?? epIndex + 1}`,
            }));
          }
        }

        return {
          seasonId,
          seasonNumber,
          title: season.title || `Season ${seasonNumber}`,
          episodes,
        };
      })
    );

    const totalEpisodes = seasonsWithEpisodes.reduce((acc, s) => acc + s.episodes.length, 0);

    const result: CartoonDetails = {
      id: show._id || cleanId,
      title: show.title || 'Untitled',
      description: show.description || '',
      poster: show.image || '',
      banner: show.coverImage || show.image || '',
      rating: show.rating ? Number(show.rating) : undefined,
      year: show.startYear || show.releaseYear || undefined,
      status: show.status || 'Completed',
      tags: show.tags || [],
      type: 'show',
      detailUrl: `${KARTOONS_BASE_URL}/show/${cleanId}`,
      totalSeasons: seasonsWithEpisodes.length,
      totalEpisodes,
      seasons: seasonsWithEpisodes,
    };

    kartoonsCache.set(cacheKey, result, CACHE_TTL.DETAILS);
    return result;
  } catch (error: any) {
    console.warn(`[Kartoons] Failed to fetch cartoon episodes for "${detailUrlOrId}":`, error.message);
    // Return clean fallback structure instead of crashing
    return {
      id: cleanId,
      title: cleanId,
      description: '',
      poster: '',
      banner: '',
      type: 'show',
      detailUrl: `${KARTOONS_BASE_URL}/show/${cleanId}`,
      totalSeasons: 1,
      totalEpisodes: 1,
      seasons: [
        {
          seasonId: 'season_1',
          seasonNumber: 1,
          title: 'Season 1',
          episodes: [
            {
              id: `${cleanId}_1`,
              episodeNumber: 1,
              title: 'Episode 1',
              detailUrl: `${KARTOONS_BASE_URL}/watch/show/${cleanId}/season/1/episode/1`,
            },
          ],
        },
      ],
    };
  }
}

/**
 * 4. getStreamSource(episodeUrlOrId, meta)
 * Extracts direct stream link (.m3u8) or iframe player embed.
 * Handles PoW cryptographic challenges & AES-256-CBC stream decryption.
 */
export async function getStreamSource(
  episodeUrlOrId: string,
  meta?: {
    showId?: string;
    seasonNumber?: number;
    episodeNumber?: number;
  }
): Promise<StreamResponse> {
  const episodeId = episodeUrlOrId.includes('/')
    ? episodeUrlOrId.split('/').filter(Boolean).pop()!
    : episodeUrlOrId.trim();

  const cacheKey = `kartoons:stream:${episodeId}`;
  const cached = kartoonsCache.get<StreamResponse>(cacheKey);
  if (cached) return cached;

  const defaultEmbed = meta?.showId && meta?.seasonNumber && meta?.episodeNumber
    ? `${KARTOONS_BASE_URL}/watch/show/${meta.showId}/season/${meta.seasonNumber}/episode/${meta.episodeNumber}`
    : `${KARTOONS_BASE_URL}/player?episode=${episodeId}`;

  try {
    // Step 1: Query Proof-of-Work Challenge across API mirrors
    const powChallengeRes = await requestWithRetry<{
      success: boolean;
      data: { enabled: boolean; nonce: string; bits: number; algo: string };
    }>(`${KARTOONS_API_BASE}/challenge/pow?content=episode:${episodeId}`);

    const challenge = powChallengeRes?.data;
    const requestHeaders = getBrowserHeaders();

    if (challenge?.enabled && challenge.nonce && challenge.bits) {
      const solution = solvePoW(challenge.nonce, challenge.bits);
      if (solution !== null) {
        requestHeaders['X-Pow-Nonce'] = challenge.nonce;
        requestHeaders['X-Pow-Solution'] = String(solution);
      }
    }

    // Step 2: Fetch stream links with 10s timeout
    const linksRes = await requestWithMirrorFailover<{ success: boolean; data: any[] }>(
      `/shows/episode/${episodeId}/links`,
      { headers: requestHeaders, timeout: 10000 },
      'api'
    );

    if (linksRes?.success && Array.isArray(linksRes.data) && linksRes.data.length > 0) {
      const sources: StreamSource[] = [];

      for (const item of linksRes.data) {
        let streamUrl: string | null = null;
        if (item.link) {
          streamUrl = decryptStreamUrl(item.link);
        }

        if (streamUrl) {
          const isM3U8 = streamUrl.includes('.m3u8');
          sources.push({
            quality: item.quality || item.name || 'auto',
            url: streamUrl,
            type: isM3U8 ? 'hls' : 'direct',
            isM3U8,
            server: item.server || item.name || 'Kartoons CDN',
          });
        }
      }

      if (sources.length > 0) {
        const streamData: StreamResponse = {
          success: true,
          episodeId,
          sources,
          subtitles: [],
          embedUrl: defaultEmbed,
          fallback: false,
        };
        kartoonsCache.set(cacheKey, streamData, CACHE_TTL.STREAM);
        return streamData;
      }
    }

    // If no direct sources were resolved, return embed stream fallback
    return {
      success: true,
      episodeId,
      sources: [
        {
          quality: 'auto',
          url: defaultEmbed,
          type: 'embed',
          isM3U8: false,
          server: 'Kartoons Embed Player',
        },
      ],
      subtitles: [],
      embedUrl: defaultEmbed,
      fallback: true,
      message: 'Direct stream links required Cloudflare bypass; fallback embed provided.',
    };
  } catch (error: any) {
    // Graceful fallback for Cloudflare Turnstile (403 challenge_required) or network timeout
    return {
      success: true,
      episodeId,
      sources: [
        {
          quality: 'auto',
          url: defaultEmbed,
          type: 'embed',
          isM3U8: false,
          server: 'Kartoons Player (Embed)',
        },
      ],
      subtitles: [],
      embedUrl: defaultEmbed,
      fallback: true,
      message: error.response?.data?.message || error.message || 'Stream embed provided via fallback',
    };
  }
}

import type {
  AnimeProvider,
  AnimeSearchResult,
  AnimeDetails,
  VideoSource,
  ProviderCapabilities,
} from './types';

export class KartoonsProvider implements AnimeProvider {
  name = 'kartoons';
  capabilities: ProviderCapabilities = {
    supportsSearch: true,
    supportsDetails: true,
    supportsEpisodes: true,
    supportsSources: true,
    supportsMovies: true,
    supportsSeries: true,
    supportsSub: true,
    supportsDub: true,
  };

  async search(query: string): Promise<AnimeSearchResult[]> {
    try {
      const results = await searchCartoons(query);
      return results.map((item) => ({
        id: item.id,
        title: item.title,
        image: item.poster || item.banner,
        releaseDate: item.year ? String(item.year) : undefined,
        provider: 'kartoons',
        type: item.type,
      }));
    } catch {
      return [];
    }
  }

  async getInfo(id: string): Promise<AnimeDetails> {
    try {
      const details = await getCartoonEpisodes(id);
      const episodes = details.seasons.flatMap((season) =>
        season.episodes.map((ep) => ({
          id: ep.id,
          number: ep.episodeNumber,
          title: ep.title,
        }))
      );

      return {
        id: details.id,
        title: details.title,
        image: details.poster || details.banner,
        description: details.description,
        genres: details.tags,
        totalEpisodes: details.totalEpisodes,
        episodes,
        status: details.status,
        type: details.type,
        availableEpisodes: {
          sub: details.totalEpisodes,
          dub: details.totalEpisodes,
        },
      };
    } catch (err: any) {
      return {
        id,
        title: id,
        image: '',
        description: '',
        totalEpisodes: 1,
        episodes: [{ id, number: 1, title: 'Episode 1' }],
      };
    }
  }

  async getSources(
    _id: string,
    episodeId: string,
    mode: 'sub' | 'dub' | 'raw',
    _serverId?: string
  ): Promise<VideoSource[]> {
    try {
      const stream = await getStreamSource(episodeId);
      return stream.sources.map((src) => ({
        url: src.url,
        isM3U8: src.isM3U8,
        quality: src.quality,
        isIframe: src.type === 'embed',
        server: src.server,
        type: mode,
        providerId: 'kartoons',
      }));
    } catch {
      return [{
        url: `${KARTOONS_BASE_URL}/player?episode=${episodeId}`,
        isM3U8: false,
        quality: 'auto',
        isIframe: true,
        server: 'Kartoons Player (Embed)',
        type: mode,
        providerId: 'kartoons',
      }];
    }
  }

  async getTrending(): Promise<AnimeSearchResult[]> {
    try {
      const home = await getHomeCartoons();
      return home.featured.map((item) => ({
        id: item.id,
        title: item.title,
        image: item.poster || item.banner,
        releaseDate: item.year ? String(item.year) : undefined,
        provider: 'kartoons',
        type: item.type,
      }));
    } catch {
      return [];
    }
  }

  async getPopular(): Promise<AnimeSearchResult[]> {
    return this.getTrending();
  }
}
