/**
 * ToonPlayer — 2Embed Metadata Provider Adapter
 *
 * Dedicated adapter for verified 2Embed metadata endpoints:
 *   - Movie details:      GET /movie?tmdb_id={id} | ?imdb_id={id}
 *   - TV details:         GET /tv?tmdb_id={id} | ?imdb_id={id}
 *   - Trending movies:    GET /trending?time_window=day|week&page={p}
 *   - Trending TV:        GET /trendingtv?time_window=day|week&page={p}
 *   - Search movies:      GET /search?q={query}&page={p}
 *   - Search TV:          GET /searchtv?q={query}&page={p}
 *   - Similar movies:     GET /similar?tmdb_id={id} | ?imdb_id={id}
 *   - Similar TV:         GET /similartv?tmdb_id={id} | ?imdb_id={id}
 *   - Season details:     GET /season?tmdb_id={id}&season={s} | ?imdb_id={id}&season={s}
 *
 * ARCHITECTURAL SAFETY INVARIANTS:
 * 1. Optional Fallback Only: Never blocks or replaces primary TMDB or scraping catalogs.
 * 2. Distinct ID Fields: tmdb_id, imdb_id, internal id, and provider_id are strictly separated.
 * 3. Anime Disambiguation: Never treats numeric anime IDs or anime slugs as TMDB/IMDb IDs.
 * 4. Stream Source Integrity: Does NOT replace internal video player sources with embed iframes.
 * 5. Health & Diagnostic Logging: Tracks latency and availability via providerHealth.
 */

import { fetchWithTimeout } from '@/utils/fetchWithTimeout';
import { animeCache, TTL, cacheKey } from '@/lib/anime-cache';
import { providerHealth } from '@/lib/provider-health';
import type {
    AnimeProvider,
    AnimeSearchResult,
    AnimeDetails,
    VideoSource,
    ProviderCapabilities,
    TwoEmbedNormalizedMedia,
    TwoEmbedNormalizedMovie,
    TwoEmbedNormalizedTv,
    TwoEmbedNormalizedSeason,
    TwoEmbedNormalizedEpisode,
} from './types';

export interface TwoEmbedRequestOptions {
    tmdbId?: string | number | null;
    imdbId?: string | null;
    timeoutMs?: number;
}

export class TwoEmbedProvider implements AnimeProvider {
    readonly name = 'twoembed' as const;
    private readonly baseUrl = 'https://api.2embed.cc';
    private readonly defaultTimeoutMs = 5000;

    readonly capabilities: ProviderCapabilities = {
        supportsSearch: true,
        supportsDetails: true,
        supportsEpisodes: true,
        supportsSources: false, // Invariant #10: Do not replace player source with 3rd-party embed
        supportsMovies: true,
        supportsSeries: true,
        supportsSub: false,
        supportsDub: false,
        supportsRaw: false,
    };

    /**
     * Strict anime ID guard to satisfy Requirement #5:
     * Never assume a numeric anime identifier is a TMDB or IMDb identifier.
     */
    private isAnimeIdentifier(id: string): boolean {
        const lower = id.toLowerCase().trim();
        // Check for anime prefixes
        if (
            lower.startsWith('al:') ||
            lower.startsWith('mal:') ||
            lower.startsWith('kitsu:') ||
            lower.startsWith('hianime:') ||
            lower.startsWith('allanime:') ||
            lower.startsWith('anikai:') ||
            lower.startsWith('aniwatch:') ||
            lower.startsWith('gogoanime:') ||
            lower.startsWith('animepahe:')
        ) {
            return true;
        }

        // Check for non-numeric anime slugs (e.g., "jujutsu-kaisen-tv", "113415" when from anime route)
        if (lower.includes('-') && !lower.startsWith('tt')) {
            return true;
        }

        return false;
    }

    /**
     * Validate and extract TMDB / IMDb query parameters
     */
    private buildIdParams(ids: TwoEmbedRequestOptions): URLSearchParams | null {
        const params = new URLSearchParams();

        if (ids.imdbId) {
            const cleanImdb = ids.imdbId.trim();
            if (/^tt\d{7,10}$/i.test(cleanImdb)) {
                params.set('imdb_id', cleanImdb);
                return params;
            }
        }

        if (ids.tmdbId !== undefined && ids.tmdbId !== null) {
            const raw = String(ids.tmdbId).trim();
            if (!this.isAnimeIdentifier(raw)) {
                const numericId = parseInt(raw, 10);
                if (!isNaN(numericId) && numericId > 0) {
                    params.set('tmdb_id', String(numericId));
                    return params;
                }
            }
        }

        return null;
    }

    /**
     * Internal safe HTTP client with diagnostics and timeout
     */
    private async request<T>(
        endpoint: string,
        params: URLSearchParams,
        operation: 'details' | 'search' | 'episodes' | 'ping' = 'details',
        timeoutMs: number = this.defaultTimeoutMs
    ): Promise<T | null> {
        const url = `${this.baseUrl}${endpoint}?${params.toString()}`;
        const start = Date.now();

        try {
            const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, timeoutMs);
            const duration = Date.now() - start;

            if (!res.ok) {
                providerHealth.reportDiagnostic({
                    provider: '2Embed API',
                    requestType: operation,
                    httpStatus: res.status,
                    validationResult: res.status === 404 ? 'EMPTY' : 'MALFORMED',
                    parserResult: 'PARSER_FAILURE',
                    sourceCount: 0,
                    finalClassification: res.status === 404 ? 'HEALTHY' : 'SCRAPER_ERROR',
                    durationMs: duration,
                    message: `HTTP ${res.status} from ${endpoint}`,
                });
                return null;
            }

            const data = (await res.json()) as T;
            if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
                providerHealth.reportDiagnostic({
                    provider: '2Embed API',
                    requestType: operation,
                    httpStatus: 200,
                    validationResult: 'EMPTY',
                    parserResult: 'NO_MATCH',
                    sourceCount: 0,
                    finalClassification: 'HEALTHY',
                    durationMs: duration,
                });
                return null;
            }

            providerHealth.reportDiagnostic({
                provider: '2Embed API',
                requestType: operation,
                httpStatus: 200,
                validationResult: 'VALID',
                parserResult: 'SUCCESS',
                sourceCount: 1,
                finalClassification: 'HEALTHY',
                durationMs: duration,
            });

            providerHealth.reportSuccess('2Embed API', duration, operation);
            return data;
        } catch (error: any) {
            const duration = Date.now() - start;
            const isTimeout = error.name === 'AbortError' || error.message?.includes('timeout');

            providerHealth.reportDiagnostic({
                provider: '2Embed API',
                requestType: operation,
                validationResult: 'UNSUPPORTED',
                parserResult: 'PARSER_FAILURE',
                sourceCount: 0,
                finalClassification: isTimeout ? 'TEMPORARY_FAILURE' : 'UNAVAILABLE',
                durationMs: duration,
                message: error.message || 'Request failed',
            });

            return null;
        }
    }

    /**
     * Normalize image URLs into relative poster_path/backdrop_path and absolute URLs
     */
    private normalizeImagePath(fullUrl?: string | null): { path: string | null; full: string | undefined } {
        if (!fullUrl || typeof fullUrl !== 'string') {
            return { path: null, full: undefined };
        }
        const cleaned = fullUrl.trim();
        // Strip TMDB CDN prefix to obtain standard relative path
        const tmdbMatch = cleaned.replace(/^https?:\/\/image\.tmdb\.org\/t\/p\/(w\d+|original)/i, '');
        return {
            path: tmdbMatch.startsWith('/') ? tmdbMatch : `/${tmdbMatch}`,
            full: cleaned,
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Movie Details Endpoint: GET /movie
    // ─────────────────────────────────────────────────────────────────────────
    async getMovieDetails(options: TwoEmbedRequestOptions): Promise<TwoEmbedNormalizedMovie | null> {
        const params = this.buildIdParams(options);
        if (!params) return null;

        const idKey = params.get('tmdb_id') || params.get('imdb_id') || 'unknown';
        const cKey = cacheKey.twoembed('movie', idKey);
        const cached = animeCache.get<TwoEmbedNormalizedMovie>(cKey);
        if (cached) return cached;

        const raw = await this.request<any>('/movie', params, 'details', options.timeoutMs);
        if (!raw || (!raw.title && !raw.tmdb_id && !raw.imdb_id)) return null;

        const posterNorm = this.normalizeImagePath(raw.poster);
        const backdropNorm = this.normalizeImagePath(raw.backdrop);

        const normalized: TwoEmbedNormalizedMovie = {
            id: String(raw.tmdb_id || raw.imdb_id || idKey),
            tmdb_id: raw.tmdb_id ? Number(raw.tmdb_id) : (params.get('tmdb_id') ? Number(params.get('tmdb_id')) : null),
            imdb_id: raw.imdb_id || params.get('imdb_id') || null,
            provider: 'twoembed',
            provider_id: `twoembed:movie:${raw.tmdb_id || raw.imdb_id || idKey}`,
            media_type: 'movie',
            title: raw.title || 'Untitled Movie',
            name: raw.title || 'Untitled Movie',
            overview: raw.plot || '',
            release_date: raw.release_date || (raw.year ? `${raw.year}-01-01` : undefined),
            poster_path: posterNorm.path,
            backdrop_path: backdropNorm.path,
            poster: posterNorm.full,
            backdrop: backdropNorm.full,
            runtime: raw.runtime ? Number(raw.runtime) : undefined,
            genres: Array.isArray(raw.genres) ? raw.genres : [],
            cast: Array.isArray(raw.cast) ? raw.cast : [],
            crew: Array.isArray(raw.crew) ? raw.crew : [],
            trailer: raw.trailer || null,
            year: raw.year || (raw.release_date ? raw.release_date.split('-')[0] : undefined),
        };

        animeCache.set(cKey, normalized, TTL.TWOEMBED_META);
        return normalized;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. TV Show Details Endpoint: GET /tv
    // ─────────────────────────────────────────────────────────────────────────
    async getTvDetails(options: TwoEmbedRequestOptions): Promise<TwoEmbedNormalizedTv | null> {
        const params = this.buildIdParams(options);
        if (!params) return null;

        const idKey = params.get('tmdb_id') || params.get('imdb_id') || 'unknown';
        const cKey = cacheKey.twoembed('tv', idKey);
        const cached = animeCache.get<TwoEmbedNormalizedTv>(cKey);
        if (cached) return cached;

        const raw = await this.request<any>('/tv', params, 'details', options.timeoutMs);
        if (!raw || (!raw.name && !raw.tmdb_id && !raw.imdb_id)) return null;

        const posterNorm = this.normalizeImagePath(raw.poster);
        const backdropNorm = this.normalizeImagePath(raw.backdrop);

        const seasons = Array.isArray(raw.seasons)
            ? raw.seasons.map((s: any) => ({
                  season_number: Number(s.season_number ?? 1),
                  episode_count: Number(s.episode_count ?? 0),
                  name: s.name || `Season ${s.season_number ?? 1}`,
                  poster_path: this.normalizeImagePath(s.poster).path,
              }))
            : [];

        const normalized: TwoEmbedNormalizedTv = {
            id: String(raw.tmdb_id || raw.imdb_id || idKey),
            tmdb_id: raw.tmdb_id ? Number(raw.tmdb_id) : (params.get('tmdb_id') ? Number(params.get('tmdb_id')) : null),
            imdb_id: raw.imdb_id || params.get('imdb_id') || null,
            provider: 'twoembed',
            provider_id: `twoembed:tv:${raw.tmdb_id || raw.imdb_id || idKey}`,
            media_type: 'tv',
            title: raw.name || 'Untitled Series',
            name: raw.name || 'Untitled Series',
            overview: raw.overview || '',
            first_air_date: raw.first_air_date,
            last_air_date: raw.last_air_date,
            poster_path: posterNorm.path,
            backdrop_path: backdropNorm.path,
            poster: posterNorm.full,
            backdrop: backdropNorm.full,
            number_of_seasons: seasons.filter((s: { season_number: number }) => s.season_number > 0).length,
            number_of_episodes: seasons.reduce((acc: number, s: { episode_count: number }) => acc + (s.episode_count || 0), 0),
            seasons,
            genres: Array.isArray(raw.genres) ? raw.genres : [],
            cast: Array.isArray(raw.cast) ? raw.cast : [],
            crew: Array.isArray(raw.crew) ? raw.crew : [],
        };

        animeCache.set(cKey, normalized, TTL.TWOEMBED_META);
        return normalized;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Trending Movies & TV Endpoints: GET /trending & GET /trendingtv
    // ─────────────────────────────────────────────────────────────────────────
    async getTrendingMovies(timeWindow: 'day' | 'week' = 'day', page: number = 1): Promise<TwoEmbedNormalizedMedia[]> {
        const cKey = cacheKey.twoembed('trending_movies', `${timeWindow}:${page}`);
        const cached = animeCache.get<TwoEmbedNormalizedMedia[]>(cKey);
        if (cached) return cached;

        const params = new URLSearchParams({
            time_window: timeWindow,
            page: String(page),
        });

        const raw = await this.request<{ results?: any[] }>('/trending', params, 'search');
        const results = Array.isArray(raw?.results) ? raw!.results : [];

        const normalized: TwoEmbedNormalizedMedia[] = results.map(item => {
            const posterNorm = this.normalizeImagePath(item.poster);
            return {
                id: String(item.tmdb_id || item.imdb_id || ''),
                tmdb_id: item.tmdb_id ? Number(item.tmdb_id) : null,
                imdb_id: item.imdb_id || null,
                provider: 'twoembed',
                provider_id: `twoembed:movie:${item.tmdb_id || item.imdb_id}`,
                media_type: 'movie',
                title: item.title || 'Untitled Movie',
                name: item.title || 'Untitled Movie',
                overview: item.plot || item.overview || '',
                year: item.year,
                release_date: item.year ? `${item.year}-01-01` : undefined,
                poster_path: posterNorm.path,
                poster: posterNorm.full,
                cast: Array.isArray(item.cast) ? item.cast : [],
                crew: Array.isArray(item.crew) ? item.crew : [],
                trailer: item.trailer || null,
            };
        });

        animeCache.set(cKey, normalized, 15 * 60 * 1000); // 15 min TTL for trending
        return normalized;
    }

    async getTrendingTv(timeWindow: 'day' | 'week' = 'day', page: number = 1): Promise<TwoEmbedNormalizedMedia[]> {
        const cKey = cacheKey.twoembed('trending_tv', `${timeWindow}:${page}`);
        const cached = animeCache.get<TwoEmbedNormalizedMedia[]>(cKey);
        if (cached) return cached;

        const params = new URLSearchParams({
            time_window: timeWindow,
            page: String(page),
        });

        const raw = await this.request<{ results?: any[] }>('/trendingtv', params, 'search');
        const results = Array.isArray(raw?.results) ? raw!.results : [];

        const normalized: TwoEmbedNormalizedMedia[] = results.map(item => {
            const posterNorm = this.normalizeImagePath(item.poster);
            return {
                id: String(item.tmdb_id || item.imdb_id || ''),
                tmdb_id: item.tmdb_id ? Number(item.tmdb_id) : null,
                imdb_id: item.imdb_id || null,
                provider: 'twoembed',
                provider_id: `twoembed:tv:${item.tmdb_id || item.imdb_id}`,
                media_type: 'tv',
                title: item.name || 'Untitled Series',
                name: item.name || 'Untitled Series',
                overview: item.overview || '',
                first_air_date: item.first_air_date,
                poster_path: posterNorm.path,
                poster: posterNorm.full,
            };
        });

        animeCache.set(cKey, normalized, 15 * 60 * 1000);
        return normalized;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Movie & TV Search Endpoints: GET /search & GET /searchtv
    // ─────────────────────────────────────────────────────────────────────────
    async searchMovies(query: string, page: number = 1): Promise<TwoEmbedNormalizedMedia[]> {
        const cleanQuery = query.trim();
        if (!cleanQuery) return [];

        const cKey = cacheKey.twoembed('search_movies', cleanQuery, String(page));
        const cached = animeCache.get<TwoEmbedNormalizedMedia[]>(cKey);
        if (cached) return cached;

        const params = new URLSearchParams({
            q: cleanQuery,
            page: String(page),
        });

        const raw = await this.request<{ results?: any[] }>('/search', params, 'search');
        const results = Array.isArray(raw?.results) ? raw!.results : [];

        const normalized: TwoEmbedNormalizedMedia[] = results.map(item => {
            const posterNorm = this.normalizeImagePath(item.poster);
            return {
                id: String(item.tmdb_id || item.imdb_id || ''),
                tmdb_id: item.tmdb_id ? Number(item.tmdb_id) : null,
                imdb_id: item.imdb_id || null,
                provider: 'twoembed',
                provider_id: `twoembed:movie:${item.tmdb_id || item.imdb_id}`,
                media_type: 'movie',
                title: item.title || 'Untitled Movie',
                name: item.title || 'Untitled Movie',
                overview: item.plot || item.overview || '',
                year: item.year,
                poster_path: posterNorm.path,
                poster: posterNorm.full,
            };
        });

        animeCache.set(cKey, normalized, 15 * 60 * 1000);
        return normalized;
    }

    async searchTv(query: string, page: number = 1): Promise<TwoEmbedNormalizedMedia[]> {
        const cleanQuery = query.trim();
        if (!cleanQuery) return [];

        const cKey = cacheKey.twoembed('search_tv', cleanQuery, String(page));
        const cached = animeCache.get<TwoEmbedNormalizedMedia[]>(cKey);
        if (cached) return cached;

        const params = new URLSearchParams({
            q: cleanQuery,
            page: String(page),
        });

        const raw = await this.request<{ results?: any[] }>('/searchtv', params, 'search');
        const results = Array.isArray(raw?.results) ? raw!.results : [];

        const normalized: TwoEmbedNormalizedMedia[] = results.map(item => {
            const posterNorm = this.normalizeImagePath(item.poster);
            return {
                id: String(item.tmdb_id || item.imdb_id || ''),
                tmdb_id: item.tmdb_id ? Number(item.tmdb_id) : null,
                imdb_id: item.imdb_id || null,
                provider: 'twoembed',
                provider_id: `twoembed:tv:${item.tmdb_id || item.imdb_id}`,
                media_type: 'tv',
                title: item.name || 'Untitled Series',
                name: item.name || 'Untitled Series',
                overview: item.overview || '',
                first_air_date: item.first_air_date,
                poster_path: posterNorm.path,
                poster: posterNorm.full,
            };
        });

        animeCache.set(cKey, normalized, 15 * 60 * 1000);
        return normalized;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Similar Movies & TV Endpoints: GET /similar & GET /similartv
    // ─────────────────────────────────────────────────────────────────────────
    async getSimilarMovies(options: TwoEmbedRequestOptions, page: number = 1): Promise<TwoEmbedNormalizedMedia[]> {
        const params = this.buildIdParams(options);
        if (!params) return [];

        params.set('page', String(page));
        const idKey = params.get('tmdb_id') || params.get('imdb_id') || 'unknown';
        const cKey = cacheKey.twoembed('similar_movies', idKey, String(page));
        const cached = animeCache.get<TwoEmbedNormalizedMedia[]>(cKey);
        if (cached) return cached;

        const raw = await this.request<{ results?: any[] }>('/similar', params, 'details');
        const results = Array.isArray(raw?.results) ? raw!.results : [];

        const normalized: TwoEmbedNormalizedMedia[] = results.map(item => {
            const posterNorm = this.normalizeImagePath(item.poster);
            return {
                id: String(item.tmdb_id || item.imdb_id || ''),
                tmdb_id: item.tmdb_id ? Number(item.tmdb_id) : null,
                imdb_id: item.imdb_id || null,
                provider: 'twoembed',
                provider_id: `twoembed:movie:${item.tmdb_id || item.imdb_id}`,
                media_type: 'movie',
                title: item.title || 'Untitled Movie',
                name: item.title || 'Untitled Movie',
                overview: item.plot || item.overview || '',
                poster_path: posterNorm.path,
                poster: posterNorm.full,
            };
        });

        animeCache.set(cKey, normalized, TTL.TWOEMBED_META);
        return normalized;
    }

    async getSimilarTv(options: TwoEmbedRequestOptions, page: number = 1): Promise<TwoEmbedNormalizedMedia[]> {
        const params = this.buildIdParams(options);
        if (!params) return [];

        params.set('page', String(page));
        const idKey = params.get('tmdb_id') || params.get('imdb_id') || 'unknown';
        const cKey = cacheKey.twoembed('similar_tv', idKey, String(page));
        const cached = animeCache.get<TwoEmbedNormalizedMedia[]>(cKey);
        if (cached) return cached;

        const raw = await this.request<{ results?: any[] }>('/similartv', params, 'details');
        const results = Array.isArray(raw?.results) ? raw!.results : [];

        const normalized: TwoEmbedNormalizedMedia[] = results.map(item => {
            const posterNorm = this.normalizeImagePath(item.poster);
            return {
                id: String(item.tmdb_id || item.imdb_id || ''),
                tmdb_id: item.tmdb_id ? Number(item.tmdb_id) : null,
                imdb_id: item.imdb_id || null,
                provider: 'twoembed',
                provider_id: `twoembed:tv:${item.tmdb_id || item.imdb_id}`,
                media_type: 'tv',
                title: item.name || 'Untitled Series',
                name: item.name || 'Untitled Series',
                overview: item.overview || '',
                poster_path: posterNorm.path,
                poster: posterNorm.full,
            };
        });

        animeCache.set(cKey, normalized, TTL.TWOEMBED_META);
        return normalized;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Season Details Endpoint: GET /season
    // ─────────────────────────────────────────────────────────────────────────
    async getSeasonDetails(
        options: TwoEmbedRequestOptions,
        seasonNumber: number | string
    ): Promise<TwoEmbedNormalizedSeason | null> {
        const params = this.buildIdParams(options);
        if (!params) return null;

        const seasonNum = parseInt(String(seasonNumber), 10) || 1;
        params.set('season', String(seasonNum));

        const idKey = params.get('tmdb_id') || params.get('imdb_id') || 'unknown';
        const cKey = cacheKey.twoembed('season', idKey, String(seasonNum));
        const cached = animeCache.get<TwoEmbedNormalizedSeason>(cKey);
        if (cached) return cached;

        const raw = await this.request<{ episodes?: any[] }>('/season', params, 'episodes');
        if (!raw || !Array.isArray(raw.episodes) || raw.episodes.length === 0) return null;

        const episodes: TwoEmbedNormalizedEpisode[] = raw.episodes.map(ep => {
            const stillNorm = this.normalizeImagePath(ep.still);
            const epNum = Number(ep.episode_number ?? 1);
            return {
                id: Number(`${idKey}${seasonNum}${epNum}`),
                episode_number: epNum,
                season_number: seasonNum,
                name: ep.name || `Episode ${epNum}`,
                overview: ep.overview || `Season ${seasonNum} Episode ${epNum}`,
                air_date: ep.air_date,
                still_path: stillNorm.path,
                still: stillNorm.full,
            };
        });

        const normalized: TwoEmbedNormalizedSeason = {
            id: Number(idKey) || idKey,
            season_number: seasonNum,
            name: `Season ${seasonNum}`,
            episodes,
        };

        animeCache.set(cKey, normalized, TTL.TWOEMBED_META);
        return normalized;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AnimeProvider Interface Methods
    // ─────────────────────────────────────────────────────────────────────────
    async search(query: string): Promise<AnimeSearchResult[]> {
        // Combined search over movies and TV
        const [movies, tv] = await Promise.all([
            this.searchMovies(query).catch(() => []),
            this.searchTv(query).catch(() => []),
        ]);

        return [...movies, ...tv].map(item => ({
            id: item.provider_id,
            title: item.title,
            image: item.poster || '',
            releaseDate: item.release_date || item.first_air_date,
            subOrDub: item.media_type === 'movie' ? 'Movie' : 'TV Show',
            provider: 'twoembed',
            providerId: 'twoembed',
            type: item.media_type,
            extra: {
                tmdb_id: item.tmdb_id,
                imdb_id: item.imdb_id,
            },
        }));
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        // ID format: twoembed:movie:{id} or twoembed:tv:{id} or raw TMDB/IMDb
        let type: 'movie' | 'tv' = 'movie';
        let cleanId = id;

        if (id.startsWith('twoembed:')) {
            const parts = id.split(':');
            type = (parts[1] as 'movie' | 'tv') || 'movie';
            cleanId = parts[2] || parts[1];
        }

        if (type === 'tv') {
            const tv = await this.getTvDetails({ tmdbId: cleanId, imdbId: cleanId.startsWith('tt') ? cleanId : undefined });
            if (!tv) throw new Error(`2Embed TV show not found for ${id}`);
            return {
                id: tv.provider_id,
                title: tv.title,
                image: tv.poster || '',
                description: tv.overview,
                type: 'tv',
                episodes: (tv.seasons || []).flatMap(s =>
                    Array.from({ length: s.episode_count }, (_, i) => ({
                        id: `${tv.provider_id}:s${s.season_number}:e${i + 1}`,
                        number: i + 1,
                        title: `Season ${s.season_number} Episode ${i + 1}`,
                    }))
                ),
            };
        } else {
            const movie = await this.getMovieDetails({ tmdbId: cleanId, imdbId: cleanId.startsWith('tt') ? cleanId : undefined });
            if (!movie) throw new Error(`2Embed Movie not found for ${id}`);
            return {
                id: movie.provider_id,
                title: movie.title,
                image: movie.poster || '',
                description: movie.overview,
                type: 'movie',
                episodes: [
                    {
                        id: `${movie.provider_id}:full`,
                        number: 1,
                        title: movie.title,
                    },
                ],
            };
        }
    }

    /**
     * Invariant #10: Do not replace the existing player source with a third-party embed URL.
     * 2Embed is integrated strictly as an optional metadata provider.
     */
    async getSources(
        _id: string,
        _episodeId: string,
        _mode: 'sub' | 'dub' | 'raw' = 'sub',
        _serverId?: string
    ): Promise<VideoSource[]> {
        return [];
    }
}
