import { AnimeProvider, ProviderName, AnimeSearchResult, AnimeDetails, VideoSource, ProviderCapabilities, ProviderResult, ProviderError, ProviderErrorCode, ProviderSourceResult, ProviderSourceStatus, SourceResolution } from './types';
import { getProvider } from './index';
import { providerHealth, ProviderHealthStatus, ProviderOperationType } from '../provider-health';

// Capability configuration for all known providers
export const PROVIDER_CAPABILITIES: Record<ProviderName, ProviderCapabilities> = {
    hianime: {
        supportsSearch: true,
        supportsDetails: true,
        supportsEpisodes: true,
        supportsSources: true,
        supportsMovies: true,
        supportsSeries: true,
        supportsSub: true,
        supportsDub: true,
        supportsRaw: true,
    },
    consumet: {
        supportsSearch: true,
        supportsDetails: true,
        supportsEpisodes: true,
        supportsSources: true,
        supportsMovies: true,
        supportsSeries: true,
        supportsSub: true,
        supportsDub: true,
        supportsRaw: false,
    },
    aniwatch: {
        supportsSearch: true,
        supportsDetails: true,
        supportsEpisodes: true,
        supportsSources: true,
        supportsMovies: true,
        supportsSeries: true,
        supportsSub: true,
        supportsDub: true,
        supportsRaw: false,
    },
    anikai: {
        supportsSearch: true,
        supportsDetails: true,
        supportsEpisodes: true,
        supportsSources: true,
        supportsMovies: true,
        supportsSeries: true,
        supportsSub: true,
        supportsDub: true,
        supportsRaw: false,
    },
    aniwave: {
        supportsSearch: true,
        supportsDetails: true,
        supportsEpisodes: true,
        supportsSources: true,
        supportsMovies: true,
        supportsSeries: true,
        supportsSub: true,
        supportsDub: true,
        supportsRaw: false,
    },
    aniwatchtv: {
        supportsSearch: true,
        supportsDetails: true,
        supportsEpisodes: true,
        supportsSources: true,
        supportsMovies: true,
        supportsSeries: true,
        supportsSub: true,
        supportsDub: true,
        supportsRaw: false,
    },
    animepahe: {
        supportsSearch: true,
        supportsDetails: true,
        supportsEpisodes: true,
        supportsSources: true,
        supportsMovies: true,
        supportsSeries: true,
        supportsSub: true,
        supportsDub: true,
        supportsRaw: false,
    },
    gogoanime: {
        supportsSearch: true,
        supportsDetails: true,
        supportsEpisodes: true,
        supportsSources: true,
        supportsMovies: true,
        supportsSeries: true,
        supportsSub: true,
        supportsDub: true,
        supportsRaw: false,
    },
    allanime: {
        supportsSearch: true,
        supportsDetails: true,
        supportsEpisodes: true,
        supportsSources: true,
        supportsMovies: true,
        supportsSeries: true,
        supportsSub: true,
        supportsDub: true,
        supportsRaw: true,
    },
    cinevo: {
        supportsSearch: true,
        supportsDetails: true,
        supportsEpisodes: true,
        supportsSources: true,
        supportsMovies: true,
        supportsSeries: true,
        supportsSub: true,
        supportsDub: true,
        supportsRaw: false,
    },
    vidsrc: {
        supportsSearch: false,
        supportsDetails: false,
        supportsEpisodes: false,
        supportsSources: true,
        supportsMovies: true,
        supportsSeries: true,
        supportsSub: true,
        supportsDub: true,
        supportsRaw: false,
    },
    jikan: {
        supportsSearch: true,
        supportsDetails: true,
        supportsEpisodes: true,
        supportsSources: false,
        supportsMovies: true,
        supportsSeries: true,
        supportsSub: true,
        supportsDub: false,
        supportsRaw: false,
    },
    kartoons: {
        supportsSearch: true,
        supportsDetails: true,
        supportsEpisodes: true,
        supportsSources: true,
        supportsMovies: true,
        supportsSeries: true,
        supportsSub: true,
        supportsDub: true,
        supportsRaw: false,
    },
};

// Priority list for fallback
const FALLBACK_ORDER: ProviderName[] = [
    'hianime',
    'consumet',
    'aniwatch',
    'anikai',
    'aniwave',
    'aniwatchtv',
    'animepahe',
    'gogoanime',
    'kartoons',
    'allanime',
    'cinevo',
    'vidsrc',
    'jikan',
];

export function normalizeProvider(name?: string | null): ProviderName {
    if (!name) return 'hianime';
    const lower = name.toLowerCase().trim();
    if (lower === 'hi' || lower === 'hianime' || lower === 'hianime_fallback') return 'hianime';
    if (lower === 'aw' || lower === 'aniwatch') return 'aniwatch';
    if (lower === 'anikai') return 'anikai';
    if (lower === 'allanime') return 'allanime';
    if (lower === 'aniwave') return 'aniwave';
    if (lower === 'aniwatchtv') return 'aniwatchtv';
    if (lower === 'consumet' || lower === 'anilist') return 'consumet';
    if (lower === 'gogoanime') return 'gogoanime';
    if (lower === 'animepahe') return 'animepahe';
    if (lower === 'cinevo') return 'cinevo';
    if (lower === 'vidsrc') return 'vidsrc';
    if (lower === 'jikan') return 'jikan';
    return 'hianime';
}

export function getProviderCapabilities(name: ProviderName): ProviderCapabilities {
    const provider = safeGetProvider(name);
    if (provider?.capabilities) {
        return { ...PROVIDER_CAPABILITIES[name], ...provider.capabilities };
    }
    return PROVIDER_CAPABILITIES[name] || {
        supportsSearch: true,
        supportsDetails: true,
        supportsEpisodes: true,
        supportsSources: true,
        supportsMovies: true,
        supportsSeries: true,
    };
}

export function categorizeError(err: any, providerId: string, durationMs?: number): ProviderError {
    const message = err?.message || String(err || 'Unknown error');
    const lower = message.toLowerCase();
    const status = err?.status || err?.statusCode || err?.response?.status;

    let code: ProviderErrorCode = 'UNKNOWN_ERROR';

    if (err?.isParserError || err?.code === 'PARSER_ERROR' || lower.includes('parsererror')) {
        code = 'PARSER_ERROR';
    } else if (status === 429 || lower.includes('rate limit') || lower.includes('too many requests')) {
        code = 'RATE_LIMITED';
    } else if (
        lower.includes('timeout') ||
        lower.includes('timed out') ||
        lower.includes('econnaborted') ||
        lower.includes('etimedout') ||
        err?.name === 'TimeoutError' ||
        err?.name === 'AbortError'
    ) {
        code = 'TIMEOUT';
    } else if (status && status >= 400) {
        code = 'HTTP_ERROR';
    } else if (
        lower.includes('enotfound') ||
        lower.includes('econnrefused') ||
        lower.includes('fetch failed') ||
        lower.includes('network error') ||
        lower.includes('failed to fetch')
    ) {
        code = 'NETWORK_ERROR';
    } else if (
        lower.includes('cheerio') ||
        lower.includes('parser') ||
        lower.includes('parse error') ||
        lower.includes('syntaxerror') ||
        lower.includes('unexpected token')
    ) {
        code = 'PARSER_ERROR';
    } else if (lower.includes('empty response') || lower.includes('empty body')) {
        code = 'EMPTY_RESPONSE';
    } else if (
        lower.includes('invalid response') ||
        lower.includes('malformed') ||
        lower.includes('invalid schema')
    ) {
        code = 'INVALID_RESPONSE';
    } else if (lower.includes('unsupported') || lower.includes('not supported')) {
        code = 'UNSUPPORTED';
    } else if (lower.includes('no source') || lower.includes('no stream') || lower.includes('not found')) {
        code = 'NO_SOURCE';
    }

    const details = err?.isParserError
        ? {
              provider: err.provider,
              operation: err.operation,
              contentId: err.contentId,
              reason: err.reason,
              stack: err?.stack,
          }
        : err?.stack || undefined;

    return {
        code,
        message,
        providerId: err?.provider || providerId,
        statusCode: status,
        details,
        durationMs,
    };
}

export interface DiagnosticPayload {
    provider: string;
    operation: 'search' | 'getDetails' | 'getEpisodes' | 'getSources' | 'ping';
    animeId?: string;
    episodeId?: string;
    startedAt?: string;
    status: 'SUCCESS' | 'FAILURE';
    httpStatus?: number;
    validationResult: 'VALID' | 'EMPTY' | 'MALFORMED' | 'UNSUPPORTED';
    parserResult: 'SUCCESS' | 'PARSER_FAILURE' | 'NO_MATCH' | 'SKIPPED';
    sourceCount: number;
    finalClassification: ProviderHealthStatus;
    durationMs: number;
    retryCount?: number;
    details?: string;
}

export function sanitizeDiagnosticMessage(msg?: string): string {
    if (!msg) return '';
    return String(msg)
        .replace(/(authorization|bearer)\s*[:=]?\s*(bearer\s+)?[^\s,;&]+/gi, '$1: [REDACTED]')
        .replace(/(cookie|set-cookie)\s*[:=]\s*[^;\r\n]+/gi, '$1: [REDACTED]')
        .replace(/(token|api_key|apikey|secret|password|access_token)=[^&%\s]+/gi, '$1=[REDACTED]');
}

export function logProviderDiagnostic(diag: DiagnosticPayload) {
    const isDev = process.env.NODE_ENV === 'development' || process.env.ENABLE_PROVIDER_DIAGNOSTICS === 'true';
    const sanitizedReason = diag.details ? sanitizeDiagnosticMessage(diag.details) : undefined;

    if (isDev) {
        const formatted = [
            `=== [PROVIDER DIAGNOSTIC] ===`,
            `Provider:       ${diag.provider}`,
            `Operation:      ${diag.operation}`,
            `Anime:          ${diag.animeId || 'N/A'}`,
            `Episode:        ${diag.episodeId || 'N/A'}`,
            `Request Started:${diag.startedAt || new Date().toISOString()}`,
            `HTTP:           ${diag.httpStatus ?? 'N/A'}`,
            `Duration:       ${diag.durationMs}ms`,
            `Retry Count:    ${diag.retryCount ?? 0}`,
            `Parser:         ${diag.parserResult}`,
            `Source Count:   ${diag.sourceCount}`,
            `Classification: ${diag.finalClassification}`,
            ...(sanitizedReason ? [`Reason:         ${sanitizedReason}`] : []),
            `=============================`,
        ].join('\n');
        console.log(formatted);
    }

    try {
        const requestType: ProviderOperationType =
            diag.operation === 'getSources' ? 'sources' :
            diag.operation === 'getDetails' ? 'details' :
            diag.operation === 'getEpisodes' ? 'episodes' :
            diag.operation === 'search' ? 'search' : 'ping';

        providerHealth.reportDiagnostic({
            provider: diag.provider,
            requestType,
            httpStatus: diag.httpStatus,
            validationResult: diag.validationResult,
            parserResult: diag.parserResult,
            sourceCount: diag.sourceCount,
            finalClassification: diag.finalClassification,
            durationMs: diag.durationMs,
            message: sanitizedReason,
        });
    } catch (_) {}
}

export function isRetryableError(error?: ProviderError): boolean {
    if (!error) return false;
    // Transient network errors and timeouts are retryable
    if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT' || error.code === 'RATE_LIMITED') {
        return true;
    }
    // Transient server errors (500, 502, 503, 504) are retryable
    if (error.code === 'HTTP_ERROR' && error.statusCode) {
        return [429, 500, 502, 503, 504].includes(error.statusCode);
    }
    // PARSER_ERROR, EMPTY_RESPONSE, INVALID_RESPONSE, NO_SOURCE, UNSUPPORTED, 400, 404 are deterministic & non-retryable
    return false;
}

export function getRetryDelay(attempt: number, baseMs = 300, maxMs = 1000): number {
    const exponential = baseMs * Math.pow(1.5, attempt);
    const jitter = Math.floor(Math.random() * 100);
    return Math.min(maxMs, exponential) + jitter;
}

class RequestCoalescer {
    private inFlight = new Map<string, Promise<any>>();

    async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
        if (this.inFlight.has(key)) {
            return this.inFlight.get(key) as Promise<T>;
        }

        const promise = fn().finally(() => {
            this.inFlight.delete(key);
        });

        this.inFlight.set(key, promise);
        return promise;
    }

    clear() {
        this.inFlight.clear();
    }
}

export const requestCoalescer = new RequestCoalescer();

export async function executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    providerId: string
): Promise<ProviderResult<T>> {
    const start = Date.now();
    try {
        const result = await Promise.race([
            fn(),
            new Promise<T>((_, reject) =>
                setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
            ),
        ]);
        const durationMs = Date.now() - start;
        return {
            success: true,
            data: result,
            providerId,
            durationMs,
        };
    } catch (err: any) {
        const durationMs = Date.now() - start;
        return {
            success: false,
            error: categorizeError(err, providerId, durationMs),
            providerId,
            durationMs,
        };
    }
}

export async function executeWithRetry<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    providerId: string,
    maxAttempts: number = 2
): Promise<ProviderResult<T>> {
    let lastError: ProviderError | undefined;
    let totalDurationMs = 0;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const singleResult = await executeWithTimeout<T>(fn, timeoutMs, providerId);
        totalDurationMs += singleResult.durationMs;

        if (singleResult.success && singleResult.data) {
            return {
                ...singleResult,
                durationMs: totalDurationMs,
            };
        }

        lastError = singleResult.error;

        // Classify first: if non-retryable (parser error, unsupported, invalid id), abort immediately
        if (lastError && !isRetryableError(lastError)) {
            break;
        }

        // Only retry if attempts remain and failure is transient
        if (attempt < maxAttempts) {
            const delay = getRetryDelay(attempt, 250, 750);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    return {
        success: false,
        error: lastError || categorizeError(new Error('Operation failed'), providerId, totalDurationMs),
        providerId,
        durationMs: totalDurationMs,
    };
}

export function isValidVideoSource(source: any): boolean {
    if (!source || typeof source !== 'object') return false;
    const url = source.url || source.link;
    if (!url || typeof url !== 'string') return false;
    const cleanUrl = url.trim();
    if (
        cleanUrl.length === 0 ||
        cleanUrl === 'null' ||
        cleanUrl === 'undefined' ||
        cleanUrl === 'about:blank' ||
        cleanUrl.includes('undefined') ||
        cleanUrl.includes('[object')
    ) {
        return false;
    }
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('/api/')) {
        return false;
    }
    return true;
}

/**
 * Rank video sources by quality and reliability:
 * 1. Direct HLS streams (.m3u8, isIframe: false)
 * 2. Direct MP4 streams (isIframe: false)
 * 3. Dedicated embed players
 * 4. Multi-embed fallbacks
 */
export function rankVideoSources(sources: VideoSource[], requestedMode?: 'sub' | 'dub' | 'raw'): VideoSource[] {
    return [...sources].sort((a, b) => {
        const scoreA = getSourceScore(a, requestedMode);
        const scoreB = getSourceScore(b, requestedMode);
        return scoreB - scoreA;
    });
}

function getSourceScore(source: VideoSource, requestedMode?: 'sub' | 'dub' | 'raw'): number {
    let score = 0;
    const url = (source.url || (source as any).link || '').toLowerCase();
    const isM3U8 = Boolean(source.isM3U8 || url.includes('.m3u8'));
    const isIframe = Boolean(source.isIframe);

    // Base score by stream type
    if (isM3U8 && !isIframe) {
        score += 1000; // Direct HLS is best
    } else if (!isIframe) {
        score += 500;  // Direct MP4/stream
    } else {
        score += 100;  // Iframe embed
    }

    // Quality bonus
    const quality = (source.quality || '').toLowerCase();
    if (quality.includes('1080')) score += 40;
    else if (quality.includes('720')) score += 30;
    else if (quality.includes('480')) score += 20;
    else if (quality.includes('auto') || quality.includes('default')) score += 25;

    // Direct stream bonus (not vidsrc/autoembed multi-embeds)
    if (!url.includes('vidsrc') && !url.includes('autoembed') && !url.includes('multiembed')) {
        score += 10;
    }

    // Mode match bonus: boost sources whose type matches what the user requested
    if (requestedMode && source.type) {
        if (source.type === requestedMode) {
            score += 15;
        }
    }

    // Subtitle availability bonus
    if (source.subtitles && Array.isArray(source.subtitles) && source.subtitles.length > 0) {
        score += 5;
    }

    // Provider reliability bonus from health engine
    if (source.providerId) {
        try {
            if (providerHealth.isHealthy(source.providerId, 'sources')) {
                score += 10;
            }
        } catch (_) {}
    }

    return score;
}

function safeGetProvider(name: ProviderName): AnimeProvider | null {
    try {
        return getProvider(name);
    } catch {
        return null;
    }
}

export class AnimeProviderManager {
    static async search(query: string): Promise<AnimeSearchResult[]> {
        const cleanQuery = (query || '').trim();
        if (!cleanQuery) return [];

        return requestCoalescer.execute(`search:${cleanQuery.toLowerCase()}`, async () => {
            const errors: ProviderError[] = [];
            for (const providerName of FALLBACK_ORDER) {
                const caps = getProviderCapabilities(providerName);
                if (!caps.supportsSearch) {
                    logProviderDiagnostic({
                        provider: providerName,
                        operation: 'search',
                        animeId: cleanQuery,
                        status: 'FAILURE',
                        validationResult: 'UNSUPPORTED',
                        parserResult: 'SKIPPED',
                        sourceCount: 0,
                        finalClassification: 'UNSUPPORTED',
                        durationMs: 0,
                        details: 'Search endpoint not supported',
                    });
                    continue;
                }

                const provider = safeGetProvider(providerName);
                if (!provider) continue;

                const result = await executeWithRetry<AnimeSearchResult[]>(
                    () => provider.search(cleanQuery),
                    6000,
                    providerName,
                    2
                );

                if (result.success && result.data && Array.isArray(result.data) && result.data.length > 0) {
                    const validResults = result.data
                        .filter(r => r && r.id && r.title)
                        .map(r => ({
                            ...r,
                            canonicalId: r.canonicalId || r.id,
                            providerId: r.providerId || providerName,
                        }));

                    if (validResults.length > 0) {
                        logProviderDiagnostic({
                            provider: providerName,
                            operation: 'search',
                            animeId: cleanQuery,
                            status: 'SUCCESS',
                            httpStatus: 200,
                            validationResult: 'VALID',
                            parserResult: 'SUCCESS',
                            sourceCount: validResults.length,
                            finalClassification: result.durationMs > 2500 ? 'DEGRADED' : 'HEALTHY',
                            durationMs: result.durationMs,
                            retryCount: result.retryCount,
                        });
                        return validResults;
                    }
                } else if (!result.success && result.error) {
                    const err = result.error;
                    errors.push(err);
                    const classification: ProviderHealthStatus =
                        err.code === 'PARSER_ERROR' || err.code === 'EMPTY_RESPONSE' || err.code === 'INVALID_RESPONSE'
                            ? 'SCRAPER_ERROR'
                            : err.code === 'TIMEOUT'
                            ? 'TEMPORARY_FAILURE'
                            : err.code === 'RATE_LIMITED'
                            ? 'DEGRADED'
                            : err.code === 'NETWORK_ERROR'
                            ? 'UNAVAILABLE'
                            : 'TEMPORARY_FAILURE';

                    logProviderDiagnostic({
                        provider: providerName,
                        operation: 'search',
                        animeId: cleanQuery,
                        status: 'FAILURE',
                        httpStatus: err.statusCode,
                        validationResult: err.code === 'INVALID_RESPONSE' ? 'MALFORMED' : err.code === 'EMPTY_RESPONSE' ? 'EMPTY' : 'VALID',
                        parserResult: err.code === 'PARSER_ERROR' ? 'PARSER_FAILURE' : 'SKIPPED',
                        sourceCount: 0,
                        finalClassification: classification,
                        durationMs: result.durationMs,
                        retryCount: result.retryCount,
                        details: err.message,
                    });
                }
            }
            console.warn(`[AnimeProviderManager] All eligible providers failed for search: "${cleanQuery}". Errors:`, errors.map(e => `[${e.providerId}:${e.code}] ${e.message}`));
            return [];
        });
    }

    static async getInfo(id: string, preferredProvider?: ProviderName): Promise<AnimeDetails | null> {
        const cleanId = (id || '').trim();
        if (!cleanId) return null;

        const normalizedPref = preferredProvider ? normalizeProvider(preferredProvider) : undefined;
        const coalescerKey = `info:${normalizedPref || 'auto'}:${cleanId}`;

        return requestCoalescer.execute(coalescerKey, async () => {
            const order = normalizedPref
                ? [normalizedPref, ...FALLBACK_ORDER.filter(p => p !== normalizedPref)]
                : FALLBACK_ORDER;

            const errors: ProviderError[] = [];
            for (const providerName of order) {
                const caps = getProviderCapabilities(providerName);
                if (!caps.supportsDetails) {
                    logProviderDiagnostic({
                        provider: providerName,
                        operation: 'getDetails',
                        animeId: cleanId,
                        status: 'FAILURE',
                        validationResult: 'UNSUPPORTED',
                        parserResult: 'SKIPPED',
                        sourceCount: 0,
                        finalClassification: 'UNSUPPORTED',
                        durationMs: 0,
                        details: 'Details endpoint not supported',
                    });
                    continue;
                }

                const provider = safeGetProvider(providerName);
                if (!provider) continue;

                const result = await executeWithRetry<AnimeDetails>(
                    () => provider.getInfo(cleanId),
                    7000,
                    providerName,
                    2
                );

                if (result.success && result.data && result.data.id && Array.isArray(result.data.episodes)) {
                    logProviderDiagnostic({
                        provider: providerName,
                        operation: 'getDetails',
                        animeId: cleanId,
                        status: 'SUCCESS',
                        httpStatus: 200,
                        validationResult: 'VALID',
                        parserResult: 'SUCCESS',
                        sourceCount: result.data.episodes.length,
                        finalClassification: result.durationMs > 2500 ? 'DEGRADED' : 'HEALTHY',
                        durationMs: result.durationMs,
                        retryCount: result.retryCount,
                    });
                    return {
                        ...result.data,
                        canonicalId: result.data.canonicalId || result.data.id,
                        providerId: result.data.providerId || providerName,
                    };
                } else if (!result.success && result.error) {
                    const err = result.error;
                    errors.push(err);
                    const classification: ProviderHealthStatus =
                        err.code === 'PARSER_ERROR' || err.code === 'EMPTY_RESPONSE' || err.code === 'INVALID_RESPONSE'
                            ? 'SCRAPER_ERROR'
                            : err.code === 'TIMEOUT'
                            ? 'TEMPORARY_FAILURE'
                            : err.code === 'RATE_LIMITED'
                            ? 'DEGRADED'
                            : err.code === 'NETWORK_ERROR'
                            ? 'UNAVAILABLE'
                            : 'TEMPORARY_FAILURE';

                    logProviderDiagnostic({
                        provider: providerName,
                        operation: 'getDetails',
                        animeId: cleanId,
                        status: 'FAILURE',
                        httpStatus: err.statusCode,
                        validationResult: err.code === 'INVALID_RESPONSE' ? 'MALFORMED' : err.code === 'EMPTY_RESPONSE' ? 'EMPTY' : 'VALID',
                        parserResult: err.code === 'PARSER_ERROR' ? 'PARSER_FAILURE' : 'SKIPPED',
                        sourceCount: 0,
                        finalClassification: classification,
                        durationMs: result.durationMs,
                        retryCount: result.retryCount,
                        details: err.message,
                    });
                }
            }
            console.warn(`[AnimeProviderManager] All eligible providers failed for info: "${cleanId}". Errors:`, errors.map(e => `[${e.providerId}:${e.code}] ${e.message}`));
            return null;
        });
    }

    // ------------- PROVIDER TIER DEFINITIONS -------------
    private static readonly PRIMARY_SCRAPERS: ProviderName[] = [
        'hianime', 'consumet', 'aniwatch', 'anikai',
    ];
    private static readonly SECONDARY_SCRAPERS: ProviderName[] = [
        'aniwave', 'aniwatchtv', 'animepahe', 'gogoanime', 'allanime',
    ];

    /**
     * Maps a ProviderErrorCode to a ProviderSourceStatus.
     */
    private static classifyErrorToSourceStatus(code: ProviderErrorCode): ProviderSourceStatus {
        switch (code) {
            case 'TIMEOUT': return 'TIMEOUT';
            case 'NETWORK_ERROR': return 'UNAVAILABLE';
            case 'UNSUPPORTED': return 'UNSUPPORTED';
            case 'NO_SOURCE': return 'NO_SOURCE';
            case 'PARSER_ERROR':
            case 'EMPTY_RESPONSE':
            case 'INVALID_RESPONSE':
                return 'SCRAPER_ERROR';
            case 'RATE_LIMITED':
            case 'HTTP_ERROR':
            default:
                return 'TEMPORARY_FAILURE';
        }
    }

    /**
     * Query a single provider and return a structured ProviderSourceResult.
     */
    private static async queryProvider(
        providerName: ProviderName,
        cleanId: string,
        cleanEp: string,
        mode: 'sub' | 'dub' | 'raw',
        serverId?: string,
    ): Promise<ProviderSourceResult> {
        const caps = getProviderCapabilities(providerName);

        // Capability check
        if (!caps.supportsSources) {
            return { provider: providerName, status: 'UNSUPPORTED', sources: [], durationMs: 0 };
        }
        if (mode === 'dub' && caps.supportsDub === false) {
            return { provider: providerName, status: 'UNSUPPORTED', sources: [], durationMs: 0 };
        }
        if (mode === 'raw' && caps.supportsRaw === false) {
            return { provider: providerName, status: 'UNSUPPORTED', sources: [], durationMs: 0 };
        }

        const provider = safeGetProvider(providerName);
        if (!provider) {
            return { provider: providerName, status: 'UNAVAILABLE', sources: [], durationMs: 0 };
        }

        // Health check: skip provider if 'sources' operation is currently in hard network cooldown
        if (!providerHealth.isHealthy(providerName, 'sources')) {
            return {
                provider: providerName,
                status: 'TEMPORARY_FAILURE',
                sources: [],
                durationMs: 0,
                error: categorizeError(new Error('Provider in temporary network cooldown'), providerName, 0),
            };
        }

        const result = await executeWithRetry<VideoSource[]>(
            () => provider.getSources(cleanId, cleanEp, mode, serverId),
            6500,
            providerName,
            2
        );

        if (result.success && result.data && Array.isArray(result.data) && result.data.length > 0) {
            const validSources: VideoSource[] = [];
            for (const s of result.data) {
                if (isValidVideoSource(s)) {
                    validSources.push({
                        ...s,
                        url: s.url || (s as any).link,
                        server: s.server || providerName,
                        providerId: s.providerId || providerName,
                        type: s.type || mode,
                    });
                }
            }

            const status: ProviderSourceStatus = validSources.length > 0 ? 'SUCCESS' : 'NO_SOURCE';
            const classification: ProviderHealthStatus = validSources.length > 0
                ? (result.durationMs > 2500 ? 'DEGRADED' : 'HEALTHY')
                : 'SCRAPER_ERROR';

            logProviderDiagnostic({
                provider: providerName,
                operation: 'getSources',
                animeId: cleanId,
                episodeId: cleanEp,
                status: validSources.length > 0 ? 'SUCCESS' : 'FAILURE',
                httpStatus: 200,
                validationResult: validSources.length > 0 ? 'VALID' : 'EMPTY',
                parserResult: validSources.length > 0 ? 'SUCCESS' : 'NO_MATCH',
                sourceCount: validSources.length,
                finalClassification: classification,
                durationMs: result.durationMs,
                retryCount: result.retryCount,
            });

            return { provider: providerName, status, sources: validSources, durationMs: result.durationMs };
        }

        // Failure path
        const err = result.error || categorizeError(new Error('Unknown failure'), providerName, result.durationMs);
        const sourceStatus = this.classifyErrorToSourceStatus(err.code);
        const classification: ProviderHealthStatus =
            err.code === 'PARSER_ERROR' || err.code === 'EMPTY_RESPONSE' || err.code === 'INVALID_RESPONSE' || err.code === 'NO_SOURCE'
                ? 'SCRAPER_ERROR'
                : err.code === 'TIMEOUT'
                ? 'TEMPORARY_FAILURE'
                : err.code === 'RATE_LIMITED'
                ? 'DEGRADED'
                : err.code === 'NETWORK_ERROR'
                ? 'UNAVAILABLE'
                : 'TEMPORARY_FAILURE';

        logProviderDiagnostic({
            provider: providerName,
            operation: 'getSources',
            animeId: cleanId,
            episodeId: cleanEp,
            status: 'FAILURE',
            httpStatus: err.statusCode,
            validationResult: err.code === 'INVALID_RESPONSE' ? 'MALFORMED' : err.code === 'EMPTY_RESPONSE' ? 'EMPTY' : 'VALID',
            parserResult: err.code === 'PARSER_ERROR' ? 'PARSER_FAILURE' : 'SKIPPED',
            sourceCount: 0,
            finalClassification: classification,
            durationMs: result.durationMs,
            retryCount: result.retryCount,
            details: err.message,
        });

        return { provider: providerName, status: sourceStatus, sources: [], error: err, durationMs: result.durationMs };
    }

    /**
     * Query a tier of providers in parallel and collect results.
     * Returns all ProviderSourceResults and any valid, deduplicated sources.
     */
    private static async queryTier(
        providers: ProviderName[],
        cleanId: string,
        cleanEp: string,
        mode: 'sub' | 'dub' | 'raw',
        serverId: string | undefined,
        seenUrls: Set<string>,
    ): Promise<{ results: ProviderSourceResult[]; sources: VideoSource[] }> {
        if (providers.length === 0) {
            return { results: [], sources: [] };
        }

        // Fan out all providers in parallel.
        // Each provider already has its own per-request timeout via executeWithRetry,
        // so we just await all of them.
        const providerPromises = providers.map(name => this.queryProvider(name, cleanId, cleanEp, mode, serverId));
        const allSettled = await Promise.allSettled(providerPromises);

        const results: ProviderSourceResult[] = [];
        const sources: VideoSource[] = [];

        for (const entry of allSettled) {
            if (entry.status === 'fulfilled') {
                const pr = entry.value;
                results.push(pr);
                for (const s of pr.sources) {
                    const url = s.url;
                    if (url && !seenUrls.has(url)) {
                        seenUrls.add(url);
                        sources.push(s);
                    }
                }
            } else {
                // Promise itself rejected (shouldn't happen since queryProvider catches internally)
                results.push({
                    provider: 'hianime' as ProviderName,
                    status: 'TEMPORARY_FAILURE',
                    sources: [],
                    durationMs: 0,
                    error: categorizeError(entry.reason, 'unknown', 0),
                });
            }
        }

        return { results, sources };
    }

    /**
     * Generate Tier 4 embed fallback sources from MAL ID.
     */
    private static async generateEmbedFallbacks(
        cleanId: string,
        cleanEp: string,
        mode: 'sub' | 'dub' | 'raw',
        fallbackMalId?: number,
    ): Promise<{ results: ProviderSourceResult[]; sources: VideoSource[] }> {
        const results: ProviderSourceResult[] = [];
        const sources: VideoSource[] = [];
        const start = Date.now();

        try {
            let finalMalId = fallbackMalId;

            // If cleanId looks numeric, try it as AniList ID → resolve MAL ID
            if (!finalMalId && /^\d+$/.test(cleanId)) {
                finalMalId = parseInt(cleanId, 10);
            }

            // Last resort: look up via getInfo
            if (!finalMalId) {
                try {
                    const info = await this.getInfo(cleanId);
                    if (info?.malId) finalMalId = info.malId;
                } catch (_) {}
            }

            // Try AniList GraphQL to resolve MAL ID if we still only have AniList ID
            if (!finalMalId && /^\d+$/.test(cleanId)) {
                try {
                    const query = `query ($id: Int) { Media (id: $id, type: ANIME) { idMal } }`;
                    const res = await Promise.race([
                        fetch('https://graphql.anilist.co', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ query, variables: { id: parseInt(cleanId, 10) } }),
                            signal: AbortSignal.timeout(3000),
                        }),
                        new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('AniList GraphQL Timeout')), 3000)),
                    ]);
                    if (res.ok) {
                        const data = await res.json();
                        if (data?.data?.Media?.idMal) finalMalId = data.data.Media.idMal;
                    }
                } catch (_) {}
            }

            if (!finalMalId) {
                results.push({
                    provider: 'vidsrc',
                    status: 'NO_SOURCE',
                    sources: [],
                    durationMs: Date.now() - start,
                });
                return { results, sources };
            }

            // Parse episode number
            let epNum = '1';
            if (cleanEp.includes('episode-')) {
                const match = cleanEp.match(/episode-(\d+)/);
                if (match) epNum = match[1];
            } else if (/^\d+$/.test(cleanEp)) {
                epNum = cleanEp;
            }

            // AMVSTR direct stream (Tier 4a: try a direct HLS stream first)
            if (/^\d+$/.test(cleanId)) {
                try {
                    const amvstrRes = await Promise.race([
                        fetch(`https://api.amvstr.me/api/v2/stream/${cleanId}/${epNum}`, {
                            headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
                            signal: AbortSignal.timeout(4000),
                        }),
                        new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('AMVSTR Timeout')), 4000)),
                    ]);
                    if (amvstrRes.ok) {
                        const amvstrData = await amvstrRes.json();
                        const streamUrl = amvstrData?.stream?.multi?.main?.url || amvstrData?.stream?.nspl?.main?.url;
                        if (streamUrl && isValidVideoSource({ url: streamUrl })) {
                            sources.push({
                                url: streamUrl,
                                isM3U8: true,
                                quality: 'Auto (AMVSTR)',
                                isIframe: false,
                                server: 'amvstr',
                                providerId: 'amvstr',
                                type: mode,
                            });
                            results.push({
                                provider: 'vidsrc' as ProviderName,
                                status: 'SUCCESS',
                                sources: [sources[sources.length - 1]],
                                durationMs: Date.now() - start,
                            });
                        }
                    }
                } catch (_) {}
            }

            // Multi-embed fallbacks
            const embedSources: VideoSource[] = [
                {
                    url: `https://vidsrc.cc/v2/embed/anime/${finalMalId}/${epNum}`,
                    quality: 'VidSrc.cc',
                    isM3U8: false,
                    isIframe: true,
                    server: 'vidsrc_cc',
                    providerId: 'vidsrc',
                    type: mode,
                },
                {
                    url: `https://vidsrc.to/embed/anime/${finalMalId}/${epNum}`,
                    quality: 'VidSrc.to',
                    isM3U8: false,
                    isIframe: true,
                    server: 'vidsrc_to',
                    providerId: 'vidsrc',
                    type: mode,
                },
                {
                    url: `https://vidsrc.me/embed/anime?mal=${finalMalId}&episode=${epNum}`,
                    quality: 'VidSrc.me',
                    isM3U8: false,
                    isIframe: true,
                    server: 'vidsrc_me',
                    providerId: 'vidsrc',
                    type: mode,
                },
                {
                    url: `https://vidsrc.net/embed/anime/${finalMalId}/${epNum}`,
                    quality: 'VidSrc.net',
                    isM3U8: false,
                    isIframe: true,
                    server: 'vidsrc_net',
                    providerId: 'vidsrc',
                    type: mode,
                },
                {
                    url: `https://player.autoembed.cc/embed/anime/${finalMalId}/${epNum}`,
                    quality: 'AutoEmbed',
                    isM3U8: false,
                    isIframe: true,
                    server: 'autoembed',
                    providerId: 'vidsrc',
                    type: mode,
                },
                {
                    url: `https://animeplayer.pt/api/embed?id=${finalMalId}&episode=${epNum}`,
                    quality: 'AnimePlayer',
                    isM3U8: false,
                    isIframe: true,
                    server: 'animeplayer',
                    providerId: 'animeplayer',
                    type: mode,
                },
            ];

            sources.push(...embedSources);
            results.push({
                provider: 'vidsrc',
                status: 'SUCCESS',
                sources: embedSources,
                durationMs: Date.now() - start,
            });
        } catch (err: any) {
            console.error('[AnimeProviderManager] Tier 4 embed fallback failed:', err.message);
            results.push({
                provider: 'vidsrc',
                status: 'TEMPORARY_FAILURE',
                sources: [],
                error: categorizeError(err, 'vidsrc', Date.now() - start),
                durationMs: Date.now() - start,
            });
        }

        return { results, sources };
    }

    /**
     * Full multi-provider source resolution with per-provider diagnostics.
     * Uses tiered parallel fan-out:
     *   Tier 1: Preferred provider (solo, fast-path)
     *   Tier 2: Primary scrapers (parallel)
     *   Tier 3: Secondary scrapers (parallel, only if Tier 2 yielded nothing)
     *   Tier 4: Embed fallbacks (AMVSTR + multi-embed iframes)
     */
    static async resolveSourcesWithDiagnostics(
        id: string,
        episodeId: string,
        mode: 'sub' | 'dub' | 'raw' = 'sub',
        preferredProvider?: ProviderName,
        serverId?: string,
        fallbackMalId?: number,
    ): Promise<SourceResolution> {
        const cleanId = (id || '').trim();
        const cleanEp = (episodeId || '').trim();
        const totalStart = Date.now();

        if (!cleanId || !cleanEp) {
            return {
                success: false,
                sources: [],
                providerResults: [],
                resolvedBy: [],
                totalDurationMs: 0,
                tier: 1,
                errorSummary: 'Missing anime ID or episode ID',
            };
        }

        const normalizedPref = preferredProvider ? normalizeProvider(preferredProvider) : undefined;
        const coalescerKey = `resolve:${normalizedPref || 'auto'}:${cleanId}:${cleanEp}:${mode}:${serverId || 'auto'}`;

        return requestCoalescer.execute(coalescerKey, async () => {
            const allProviderResults: ProviderSourceResult[] = [];
            const seenUrls = new Set<string>();
            let collectedSources: VideoSource[] = [];
            let resolvedBy: ProviderName[] = [];
            let resolvedTier: 1 | 2 | 3 | 4 = 1;

            console.log(`[SourceResolver] 🚀 Resolving: id=${cleanId} ep=${cleanEp} mode=${mode} pref=${normalizedPref || 'none'}`);

            // ========== TIER 1: Preferred Provider (solo fast-path) ==========
            if (normalizedPref) {
                const pr = await this.queryProvider(normalizedPref, cleanId, cleanEp, mode, serverId);
                allProviderResults.push(pr);

                if (pr.status === 'SUCCESS' && pr.sources.length > 0) {
                    for (const s of pr.sources) {
                        if (s.url && !seenUrls.has(s.url)) {
                            seenUrls.add(s.url);
                            collectedSources.push(s);
                        }
                    }
                    resolvedBy.push(normalizedPref);
                    resolvedTier = 1;
                    console.log(`[SourceResolver] ⚡ Tier 1 (${normalizedPref}): ${collectedSources.length} sources in ${pr.durationMs}ms`);

                    return {
                        success: true,
                        sources: rankVideoSources(collectedSources, mode),
                        providerResults: allProviderResults,
                        resolvedBy,
                        totalDurationMs: Date.now() - totalStart,
                        tier: resolvedTier,
                    };
                }
                console.log(`[SourceResolver] ⚠️ Tier 1 (${normalizedPref}): ${pr.status} — falling through to Tier 2`);
            }

            // ========== TIER 2: Primary Scrapers (parallel) ==========
            const tier2Providers = this.PRIMARY_SCRAPERS.filter(p => p !== normalizedPref);
            const tier2 = await this.queryTier(tier2Providers, cleanId, cleanEp, mode, serverId, seenUrls);
            allProviderResults.push(...tier2.results);

            if (tier2.sources.length > 0) {
                collectedSources.push(...tier2.sources);
                resolvedBy = tier2.results
                    .filter(r => r.status === 'SUCCESS' && r.sources.length > 0)
                    .map(r => r.provider);
                resolvedTier = 2;
                console.log(`[SourceResolver] ⚡ Tier 2: ${collectedSources.length} sources from [${resolvedBy.join(', ')}]`);

                return {
                    success: true,
                    sources: rankVideoSources(collectedSources, mode),
                    providerResults: allProviderResults,
                    resolvedBy,
                    totalDurationMs: Date.now() - totalStart,
                    tier: resolvedTier,
                };
            }
            console.log(`[SourceResolver] ⚠️ Tier 2: no valid sources — falling through to Tier 3`);

            // ========== TIER 3: Secondary Scrapers (parallel) ==========
            const tier3Providers = this.SECONDARY_SCRAPERS.filter(p => p !== normalizedPref);
            const tier3 = await this.queryTier(tier3Providers, cleanId, cleanEp, mode, serverId, seenUrls);
            allProviderResults.push(...tier3.results);

            if (tier3.sources.length > 0) {
                collectedSources.push(...tier3.sources);
                resolvedBy = tier3.results
                    .filter(r => r.status === 'SUCCESS' && r.sources.length > 0)
                    .map(r => r.provider);
                resolvedTier = 3;
                console.log(`[SourceResolver] ⚡ Tier 3: ${collectedSources.length} sources from [${resolvedBy.join(', ')}]`);

                return {
                    success: true,
                    sources: rankVideoSources(collectedSources, mode),
                    providerResults: allProviderResults,
                    resolvedBy,
                    totalDurationMs: Date.now() - totalStart,
                    tier: resolvedTier,
                };
            }
            console.log(`[SourceResolver] ⚠️ Tier 3: no valid sources — falling through to Tier 4 (embeds)`);

            // ========== TIER 4: Embed Fallbacks ==========
            const tier4 = await this.generateEmbedFallbacks(cleanId, cleanEp, mode, fallbackMalId);
            allProviderResults.push(...tier4.results);

            if (tier4.sources.length > 0) {
                collectedSources.push(...tier4.sources);
                resolvedBy = ['vidsrc'];
                resolvedTier = 4;
                console.log(`[SourceResolver] ⚡ Tier 4: ${tier4.sources.length} embed fallbacks`);

                return {
                    success: true,
                    sources: rankVideoSources(collectedSources, mode),
                    providerResults: allProviderResults,
                    resolvedBy,
                    totalDurationMs: Date.now() - totalStart,
                    tier: resolvedTier,
                };
            }

            // ========== ALL TIERS FAILED ==========
            const failedProviders = allProviderResults
                .filter(r => r.status !== 'UNSUPPORTED')
                .map(r => `[${r.provider}:${r.status}]`);

            const errorSummary = failedProviders.length > 0
                ? `All ${failedProviders.length} providers failed: ${failedProviders.join(' ')}`
                : 'No eligible providers found';

            console.warn(`[SourceResolver] ❌ All tiers failed for ${cleanId} ep ${cleanEp}. ${errorSummary}`);

            return {
                success: false,
                sources: [],
                providerResults: allProviderResults,
                resolvedBy: [],
                totalDurationMs: Date.now() - totalStart,
                tier: 4,
                errorSummary,
            };
        });
    }

    /**
     * Backward-compatible getSources: returns just VideoSource[].
     * Internally delegates to resolveSourcesWithDiagnostics.
     */
    static async getSources(
        id: string,
        episodeId: string,
        mode: 'sub' | 'dub' | 'raw' = 'sub',
        preferredProvider?: ProviderName,
        serverId?: string,
        fallbackMalId?: number
    ): Promise<VideoSource[]> {
        const resolution = await this.resolveSourcesWithDiagnostics(
            id, episodeId, mode, preferredProvider, serverId, fallbackMalId
        );
        return resolution.sources;
    }
}

export default AnimeProviderManager;
