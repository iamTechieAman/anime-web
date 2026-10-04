import axios, { AxiosRequestConfig } from 'axios';
import * as cheerio from 'cheerio';
import * as crypto from 'crypto';
import { getUA } from '@/lib/user-agents';
import { scraperCache, SCRAPER_TTL } from '@/lib/cache/scraper-cache';
import connectToDatabase from '@/lib/db';
import {
  CartoonCatalogModel,
  ICartoonCatalog,
  ICartoonEpisode,
  ICartoonSeason,
  ICartoonServer,
} from '@/models/CartoonCatalog';

/**
 * ============================================================================
 * Kartoons Scraper & Data Pipeline Engine
 * ============================================================================
 * End-to-end scraper for https://kartoons.to:
 * - Scrapes complete catalog, all seasons, and full episode trees.
 * - Resolves multi-server playback targets (Server 1, Server 2, VIP, Direct HLS).
 * - Implements anti-bot evasion: rotating realistic User-Agents, strict Referer,
 *   Proof-of-Work (PoW) SHA-256 solver, AES-256-CBC stream decryptor.
 * - Handles connection retries with exponential backoff and jitter.
 * - Provides upsert pipeline directly into MongoDB.
 * ============================================================================
 */

export const KARTOONS_BASE_URL = 'https://kartoons.to';
export const KARTOONS_API_BASE = 'https://api.kartoons.to/api';
const AES_SECRET_KEY = 'bca9e0df1a5abb32906ca3f63ac04cef';

export interface ScrapedShowItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  poster: string;
  banner: string;
  rating?: number;
  year?: number;
  status: 'Ongoing' | 'Completed' | 'Upcoming';
  type: 'show' | 'movie';
  genres: string[];
  totalSeasons: number;
  totalEpisodes: number;
  seasons: ICartoonSeason[];
  sourceUrl: string;
}

export interface LatestEpisodeUpdate {
  showId: string;
  showTitle: string;
  episodeId: string;
  seasonNumber: number;
  episodeNumber: number;
  episodeTitle: string;
  poster?: string;
  releaseDate?: string;
}

export class KartoonsScraperEngine {
  private maxRetries: number;
  private baseDelayMs: number;

  constructor(maxRetries = 3, baseDelayMs = 1200) {
    this.maxRetries = maxRetries;
    this.baseDelayMs = baseDelayMs;
  }

  // ==========================================================================
  // Anti-Bot & Resilient HTTP Client
  // ==========================================================================

  /**
   * Generates realistic browser request headers
   */
  private getHeaders(customReferer?: string): Record<string, string> {
    return {
      'User-Agent': getUA(),
      'Referer': customReferer || `${KARTOONS_BASE_URL}/`,
      'Origin': KARTOONS_BASE_URL,
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-site',
      'Cache-Control': 'no-cache',
    };
  }

  /**
   * Executes HTTP requests with exponential backoff, jitter, and rotating User-Agents
   */
  private async executeWithRetry<T>(
    url: string,
    options: AxiosRequestConfig = {},
    retries = this.maxRetries
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await axios({
          url,
          timeout: 20000,
          ...options,
          headers: {
            ...this.getHeaders(options.headers?.Referer as string),
            ...(options.headers || {}),
          },
        });
        return response.data;
      } catch (err: any) {
        lastError = err;
        const status = err.response?.status;

        // Do not retry 404s
        if (status === 404) {
          throw err;
        }

        if (attempt < retries) {
          // Exponential backoff: base * 2^attempt + random jitter (0-500ms)
          const jitter = Math.floor(Math.random() * 500);
          const backoffDelay = this.baseDelayMs * Math.pow(2, attempt) + jitter;
          console.warn(
            `[KartoonsScraper] Request failed (${status || err.message}). Retrying ${attempt + 1}/${retries} in ${backoffDelay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        }
      }
    }
    throw lastError;
  }

  // ==========================================================================
  // PoW Challenge Solver & Cryptography
  // ==========================================================================

  private hasLeadingZeroBits(buffer: Buffer, bits: number): boolean {
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

  public solvePoW(nonce: string, bits: number, maxIterations = 5000000): number | null {
    let counter = 0;
    while (counter < maxIterations) {
      const hash = crypto.createHash('sha256').update(`${nonce}:${counter}`).digest();
      if (this.hasLeadingZeroBits(hash, bits)) {
        return counter;
      }
      counter++;
    }
    return null;
  }

  public decryptStreamLink(encryptedData: string, secretKey = AES_SECRET_KEY): string | null {
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
    } catch {
      return null;
    }
  }

  // ==========================================================================
  // Core Scraping Methods
  // ==========================================================================

  /**
   * Scrapes Featured & Home categories
   */
  async getFeaturedCatalog(): Promise<{
    featuredShows: ScrapedShowItem[];
    featuredMovies: ScrapedShowItem[];
    categories: string[];
  }> {
    const cacheKey = 'kartoons:catalog:featured';
    const cached = await scraperCache.get<{
      featuredShows: ScrapedShowItem[];
      featuredMovies: ScrapedShowItem[];
      categories: string[];
    }>(cacheKey);

    if (cached) return cached;

    try {
      const [showsRes, moviesRes] = await Promise.allSettled([
        this.executeWithRetry<{ success: boolean; data: any[] }>(`${KARTOONS_API_BASE}/shows/featured`),
        this.executeWithRetry<{ success: boolean; data: any[] }>(`${KARTOONS_API_BASE}/movies/featured`),
      ]);

      const rawShows = showsRes.status === 'fulfilled' && showsRes.value?.data ? showsRes.value.data : [];
      const rawMovies = moviesRes.status === 'fulfilled' && moviesRes.value?.data ? moviesRes.value.data : [];

      const categoriesSet = new Set<string>();

      const mapPreview = (item: any, type: 'show' | 'movie'): ScrapedShowItem => {
        const id = item._id || item.id;
        const genres = Array.isArray(item.tags) ? item.tags : [];
        genres.forEach((g: string) => categoriesSet.add(g));

        return {
          id,
          slug: this.slugify(item.title || item.name || id),
          title: item.title || item.name || 'Untitled',
          description: item.description || item.overview || '',
          poster: item.image || item.poster || '',
          banner: item.coverImage || item.banner || item.image || '',
          rating: item.rating ? Number(item.rating) : undefined,
          year: item.startYear || item.releaseYear || undefined,
          status: item.status === 'Ongoing' ? 'Ongoing' : 'Completed',
          type,
          genres,
          totalSeasons: 1,
          totalEpisodes: 0,
          seasons: [],
          sourceUrl: `${KARTOONS_BASE_URL}/${type}/${id}`,
        };
      };

      const result = {
        featuredShows: rawShows.map((s) => mapPreview(s, 'show')),
        featuredMovies: rawMovies.map((m) => mapPreview(m, 'movie')),
        categories: Array.from(categoriesSet),
      };

      await scraperCache.set(cacheKey, result, SCRAPER_TTL.HOME_CATALOG);
      return result;
    } catch (err: any) {
      console.error('[KartoonsScraper] Error fetching featured catalog:', err.message);
      // Cheerio HTML Fallback
      return this.scrapeFeaturedFromHtml();
    }
  }

  /**
   * Cheerio HTML scraper fallback for featured section
   */
  private async scrapeFeaturedFromHtml(): Promise<{
    featuredShows: ScrapedShowItem[];
    featuredMovies: ScrapedShowItem[];
    categories: string[];
  }> {
    const html = await this.executeWithRetry<string>(`${KARTOONS_BASE_URL}/home`, {
      headers: { Accept: 'text/html,application/xhtml+xml' },
    });
    const $ = cheerio.load(html);
    const shows: ScrapedShowItem[] = [];

    $('a[href*="/show/"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const title = $(el).find('h3, h2, .title, p').first().text().trim() || $(el).attr('title') || '';
      const img = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';
      const idMatch = href.match(/\/show\/([a-zA-Z0-9_-]+)/);

      if (idMatch && title) {
        shows.push({
          id: idMatch[1],
          slug: this.slugify(title),
          title,
          description: '',
          poster: img,
          banner: img,
          status: 'Completed',
          type: 'show',
          genres: ['Animation', 'Action'],
          totalSeasons: 1,
          totalEpisodes: 0,
          seasons: [],
          sourceUrl: href.startsWith('http') ? href : `${KARTOONS_BASE_URL}${href}`,
        });
      }
    });

    return {
      featuredShows: shows,
      featuredMovies: [],
      categories: ['Animation', 'Action', 'Adventure', 'Comedy'],
    };
  }

  /**
   * Scrapes Latest Episode Updates (used by the recurring Cron Job)
   */
  async getLatestEpisodes(): Promise<LatestEpisodeUpdate[]> {
    const cacheKey = 'kartoons:latest:episodes';
    const cached = await scraperCache.get<LatestEpisodeUpdate[]>(cacheKey);
    if (cached) return cached;

    try {
      // 1. Try API latest episodes endpoint
      const res = await this.executeWithRetry<{ success: boolean; data: any[] }>(
        `${KARTOONS_API_BASE}/shows/latest-episodes`
      );

      if (res?.success && Array.isArray(res.data)) {
        const updates: LatestEpisodeUpdate[] = res.data.map((item) => ({
          showId: item.showId || item.show?._id || item.show?.id || '',
          showTitle: item.showTitle || item.show?.title || 'Unknown Show',
          episodeId: item._id || item.id,
          seasonNumber: item.seasonNumber ?? 1,
          episodeNumber: item.episodeNumber ?? 1,
          episodeTitle: item.title || `Episode ${item.episodeNumber ?? 1}`,
          poster: item.image || item.thumbnail || '',
          releaseDate: item.createdAt || new Date().toISOString(),
        }));

        await scraperCache.set(cacheKey, updates, 900); // 15 mins cache
        return updates;
      }
    } catch {
      // Fallback: Scrape HTML latest section
    }

    // Cheerio fallback for latest episodes
    try {
      const html = await this.executeWithRetry<string>(`${KARTOONS_BASE_URL}/home`, {
        headers: { Accept: 'text/html' },
      });
      const $ = cheerio.load(html);
      const updates: LatestEpisodeUpdate[] = [];

      $('.latest-episode, [class*="latest"], .episode-card').each((_, el) => {
        const href = $(el).find('a').attr('href') || $(el).attr('href') || '';
        const title = $(el).find('.title, h4, h3').text().trim();
        const epText = $(el).find('.ep, .badge, .number').text().trim();
        const img = $(el).find('img').attr('src') || '';

        // Pattern: /watch/show/{showId}/season/{season}/episode/{ep}
        const match = href.match(/\/show\/([a-zA-Z0-9_-]+)\/season\/(\d+)\/episode\/(\d+)/);
        if (match) {
          updates.push({
            showId: match[1],
            showTitle: title || 'Cartoon Update',
            episodeId: `${match[1]}_s${match[2]}_e${match[3]}`,
            seasonNumber: parseInt(match[2], 10),
            episodeNumber: parseInt(match[3], 10),
            episodeTitle: epText ? `Episode ${epText}` : `Episode ${match[3]}`,
            poster: img,
          });
        }
      });

      await scraperCache.set(cacheKey, updates, 900);
      return updates;
    } catch (err: any) {
      console.warn('[KartoonsScraper] Could not fetch latest episodes:', err.message);
      return [];
    }
  }

  /**
   * Scrapes Complete Show Metadata, all seasons, and full episode trees
   */
  async getShowDetails(showIdOrUrl: string): Promise<ScrapedShowItem> {
    const cleanId = showIdOrUrl.includes('/')
      ? showIdOrUrl.split('/').filter(Boolean).pop()!
      : showIdOrUrl.trim();

    const cacheKey = `kartoons:show:${cleanId}`;
    const cached = await scraperCache.get<ScrapedShowItem>(cacheKey);
    if (cached) return cached;

    const showRes = await this.executeWithRetry<{ success: boolean; data: any }>(
      `${KARTOONS_API_BASE}/shows/${cleanId}`
    );

    if (!showRes?.success || !showRes.data) {
      throw new Error(`Kartoons show not found: ${cleanId}`);
    }

    const show = showRes.data;
    const rawSeasons: any[] = show.seasons || [];

    // Concurrently fetch all episodes for each season
    const seasons: ICartoonSeason[] = await Promise.all(
      rawSeasons.map(async (season, index) => {
        const seasonId = season._id || season.id || `season_${index + 1}`;
        const seasonNumber = season.seasonNumber ?? index + 1;
        let episodes: ICartoonEpisode[] = [];

        try {
          const epRes = await this.executeWithRetry<{ success: boolean; data: any[] }>(
            `${KARTOONS_API_BASE}/shows/${cleanId}/season/${seasonId}/all-episodes`
          );

          if (epRes?.success && Array.isArray(epRes.data)) {
            episodes = epRes.data.map((ep, epIndex) => {
              const epId = ep._id || ep.id;
              const epNum = ep.episodeNumber ?? epIndex + 1;

              // Pre-populate multi-server embed options
              const servers = this.buildInitialServerOptions(cleanId, seasonNumber, epNum, epId);

              return {
                episodeId: epId,
                episodeNumber: epNum,
                title: ep.title || `Episode ${epNum}`,
                duration: ep.duration ? `${ep.duration} min` : undefined,
                thumbnail: ep.image || show.image || '',
                detailUrl: `${KARTOONS_BASE_URL}/watch/show/${cleanId}/season/${seasonNumber}/episode/${epNum}`,
                servers,
              };
            });
          }
        } catch {
          // If all-episodes endpoint is rate-limited, read embedded episodes if present
          if (Array.isArray(season.episodes)) {
            episodes = season.episodes.map((ep: any, epIndex: number) => {
              const epId = ep._id || ep.id || `${cleanId}_${seasonNumber}_${epIndex + 1}`;
              const epNum = ep.episodeNumber ?? epIndex + 1;
              const servers = this.buildInitialServerOptions(cleanId, seasonNumber, epNum, epId);

              return {
                episodeId: epId,
                episodeNumber: epNum,
                title: ep.title || `Episode ${epNum}`,
                duration: ep.duration ? `${ep.duration} min` : undefined,
                thumbnail: ep.image || show.image || '',
                detailUrl: `${KARTOONS_BASE_URL}/watch/show/${cleanId}/season/${seasonNumber}/episode/${epNum}`,
                servers,
              };
            });
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

    const totalEpisodes = seasons.reduce((acc, s) => acc + s.episodes.length, 0);

    const fullShow: ScrapedShowItem = {
      id: show._id || cleanId,
      slug: this.slugify(show.title || cleanId),
      title: show.title || 'Untitled Cartoon',
      description: show.description || '',
      poster: show.image || '',
      banner: show.coverImage || show.image || '',
      rating: show.rating ? Number(show.rating) : undefined,
      year: show.startYear || show.releaseYear || undefined,
      status: show.status === 'Ongoing' ? 'Ongoing' : 'Completed',
      type: 'show',
      genres: Array.isArray(show.tags) ? show.tags : [],
      totalSeasons: seasons.length,
      totalEpisodes,
      seasons,
      sourceUrl: `${KARTOONS_BASE_URL}/show/${cleanId}`,
    };

    await scraperCache.set(cacheKey, fullShow, SCRAPER_TTL.SHOW_DETAILS);
    return fullShow;
  }

  /**
   * Builds multi-server playback and embed options for an episode
   */
  private buildInitialServerOptions(
    showId: string,
    seasonNumber: number,
    episodeNumber: number,
    episodeId: string
  ): ICartoonServer[] {
    const watchUrl = `${KARTOONS_BASE_URL}/watch/show/${showId}/season/${seasonNumber}/episode/${episodeNumber}`;
    const directPlayerUrl = `${KARTOONS_BASE_URL}/player?episode=${episodeId}`;

    return [
      {
        name: 'Server 1 (Kartoons Stream)',
        serverType: 'embed',
        url: watchUrl,
        quality: '1080p',
        isM3U8: false,
        priority: 1,
        isWorking: true,
      },
      {
        name: 'Server 2 (Direct Embed Player)',
        serverType: 'embed',
        url: directPlayerUrl,
        quality: 'auto',
        isM3U8: false,
        priority: 2,
        isWorking: true,
      },
      {
        name: 'VIP Backup Server',
        serverType: 'embed',
        url: `${watchUrl}?server=vip`,
        quality: '1080p',
        isM3U8: false,
        priority: 3,
        isWorking: true,
      },
    ];
  }

  /**
   * Resolves direct media playback stream (.m3u8) or live multi-server list for an episode
   */
  async resolveEpisodeServers(
    episodeId: string,
    meta?: { showId?: string; seasonNumber?: number; episodeNumber?: number }
  ): Promise<ICartoonServer[]> {
    const cacheKey = `kartoons:servers:${episodeId}`;
    const cached = await scraperCache.get<ICartoonServer[]>(cacheKey);
    if (cached) return cached;

    const servers: ICartoonServer[] = [];

    try {
      // 1. Check PoW challenge & decrypt direct stream links
      const powChallengeRes = await this.executeWithRetry<{
        success: boolean;
        data: { enabled: boolean; nonce: string; bits: number };
      }>(`${KARTOONS_API_BASE}/challenge/pow?content=episode:${episodeId}`);

      const challenge = powChallengeRes?.data;
      const requestHeaders = this.getHeaders();

      if (challenge?.enabled && challenge.nonce && challenge.bits) {
        const solution = this.solvePoW(challenge.nonce, challenge.bits);
        if (solution !== null) {
          requestHeaders['X-Pow-Nonce'] = challenge.nonce;
          requestHeaders['X-Pow-Solution'] = String(solution);
        }
      }

      // Fetch decrypted links
      const linksRes = await axios.get<{ success: boolean; data: any[] }>(
        `${KARTOONS_API_BASE}/shows/episode/${episodeId}/links`,
        { headers: requestHeaders, timeout: 8000 }
      );

      if (linksRes.data?.success && Array.isArray(linksRes.data.data)) {
        linksRes.data.data.forEach((item, index) => {
          let directUrl: string | null = null;
          if (item.link) {
            directUrl = this.decryptStreamLink(item.link);
          }

          if (directUrl) {
            const isM3U8 = directUrl.includes('.m3u8');
            servers.push({
              name: `Server ${index + 1} (${item.server || item.name || 'Direct HLS'})`,
              serverType: isM3U8 ? 'hls' : 'direct',
              url: directUrl,
              quality: item.quality || item.name || 'auto',
              isM3U8,
              priority: index === 0 ? 1 : 2,
              isWorking: true,
            });
          }
        });
      }
    } catch {
      // Direct decryption blocked by Cloudflare; continue with embed server options
    }

    // Add safe iframe embed player fallbacks
    const fallbackWatchUrl = meta?.showId && meta.seasonNumber && meta.episodeNumber
      ? `${KARTOONS_BASE_URL}/watch/show/${meta.showId}/season/${meta.seasonNumber}/episode/${meta.episodeNumber}`
      : `${KARTOONS_BASE_URL}/player?episode=${episodeId}`;

    servers.push(
      {
        name: 'Kartoons Embed Player',
        serverType: 'embed',
        url: fallbackWatchUrl,
        quality: '1080p',
        isM3U8: false,
        priority: servers.length + 1,
        isWorking: true,
      },
      {
        name: 'Backup Server 2',
        serverType: 'embed',
        url: `${KARTOONS_BASE_URL}/player?episode=${episodeId}`,
        quality: 'auto',
        isM3U8: false,
        priority: servers.length + 2,
        isWorking: true,
      }
    );

    await scraperCache.set(cacheKey, servers, SCRAPER_TTL.STREAM_SERVERS);
    return servers;
  }

  // ==========================================================================
  // Database Pipeline & Storage
  // ==========================================================================

  /**
   * Persists a scraped cartoon into MongoDB with atomic upsert
   */
  async upsertToDatabase(showData: ScrapedShowItem): Promise<ICartoonCatalog | null> {
    try {
      await connectToDatabase();

      const changeHash = crypto
        .createHash('md5')
        .update(`${showData.id}:${showData.totalEpisodes}:${showData.totalSeasons}:${showData.status}`)
        .digest('hex');

      const doc = await CartoonCatalogModel.findOneAndUpdate(
        { externalId: showData.id },
        {
          $set: {
            externalId: showData.id,
            slug: showData.slug,
            title: showData.title,
            description: showData.description,
            poster: showData.poster,
            banner: showData.banner,
            rating: showData.rating,
            year: showData.year,
            status: showData.status,
            type: showData.type,
            genres: showData.genres,
            totalSeasons: showData.totalSeasons,
            totalEpisodes: showData.totalEpisodes,
            seasons: showData.seasons,
            sourceUrl: showData.sourceUrl,
            changeHash,
            lastScrapedAt: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return doc;
    } catch (err: any) {
      console.error(`[KartoonsScraper] DB upsert failed for "${showData.title}":`, err.message);
      return null;
    }
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

// Global Singleton Scraper Instance
export const kartoonsScraper = new KartoonsScraperEngine();
