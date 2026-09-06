import { AnimeProvider, ProviderName, AnimeSearchResult, AnimeDetails, VideoSource, ProviderCapabilities, ProviderResult, ProviderError, ProviderErrorCode } from './types';
import { getProvider } from './index';
import { providerHealth, ProviderHealthStatus } from '../provider-health';

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

    if (status === 429 || lower.includes('rate limit') || lower.includes('too many requests')) {
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

    return {
        code,
        message,
        providerId,
        statusCode: status,
        details: err?.stack || undefined,
        durationMs,
    };
}

export function logProviderDiagnostic(diag: {
    provider: string;
    requestType: 'search' | 'details' | 'episodes' | 'sources';
    status: 'SUCCESS' | 'FAILURE';
    httpStatus?: number;
    validationResult: 'VALID' | 'EMPTY' | 'MALFORMED' | 'UNSUPPORTED';
    parserResult: 'SUCCESS' | 'PARSER_FAILURE' | 'NO_MATCH' | 'SKIPPED';
    sourceCount: number;
    finalClassification: ProviderHealthStatus;
    durationMs: number;
    details?: string;
}) {
    console.log(
        `[ProviderDiagnostics] [${diag.provider}] reqType=${diag.requestType} | status=${diag.status} | HTTP=${diag.httpStatus ?? 'N/A'} | validation=${diag.validationResult} | parser=${diag.parserResult} | count=${diag.sourceCount} | class=${diag.finalClassification} (${diag.durationMs}ms)${diag.details ? ' - ' + diag.details : ''}`
    );

    try {
        providerHealth.reportDiagnostic({
            provider: diag.provider,
            requestType: diag.requestType,
            httpStatus: diag.httpStatus,
            validationResult: diag.validationResult,
            parserResult: diag.parserResult,
            sourceCount: diag.sourceCount,
            finalClassification: diag.finalClassification,
            durationMs: diag.durationMs,
            message: diag.details,
        });
    } catch (_) {}
}

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
export function rankVideoSources(sources: VideoSource[]): VideoSource[] {
    return [...sources].sort((a, b) => {
        const scoreA = getSourceScore(a);
        const scoreB = getSourceScore(b);
        return scoreB - scoreA;
    });
}

function getSourceScore(source: VideoSource): number {
    let score = 0;
    const url = (source.url || (source as any).link || '').toLowerCase();
    const isM3U8 = Boolean(source.isM3U8 || url.includes('.m3u8'));
    const isIframe = Boolean(source.isIframe);

    if (isM3U8 && !isIframe) {
        score += 1000;
    } else if (!isIframe) {
        score += 500;
    } else {
        score += 100;
    }

    const quality = (source.quality || '').toLowerCase();
    if (quality.includes('1080')) score += 40;
    else if (quality.includes('720')) score += 30;
    else if (quality.includes('480')) score += 20;
    else if (quality.includes('auto') || quality.includes('default')) score += 25;

    // Direct stream bonus
    if (!url.includes('vidsrc') && !url.includes('autoembed')) {
        score += 10;
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

        const errors: ProviderError[] = [];
        for (const providerName of FALLBACK_ORDER) {
            const caps = getProviderCapabilities(providerName);
            if (!caps.supportsSearch) {
                logProviderDiagnostic({
                    provider: providerName,
                    requestType: 'search',
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

            const result = await executeWithTimeout<AnimeSearchResult[]>(
                () => provider.search(cleanQuery),
                7000,
                providerName
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
                        requestType: 'search',
                        status: 'SUCCESS',
                        httpStatus: 200,
                        validationResult: 'VALID',
                        parserResult: 'SUCCESS',
                        sourceCount: validResults.length,
                        finalClassification: result.durationMs > 2500 ? 'DEGRADED' : 'HEALTHY',
                        durationMs: result.durationMs,
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
                    requestType: 'search',
                    status: 'FAILURE',
                    httpStatus: err.statusCode,
                    validationResult: err.code === 'INVALID_RESPONSE' ? 'MALFORMED' : err.code === 'EMPTY_RESPONSE' ? 'EMPTY' : 'VALID',
                    parserResult: err.code === 'PARSER_ERROR' ? 'PARSER_FAILURE' : 'SKIPPED',
                    sourceCount: 0,
                    finalClassification: classification,
                    durationMs: result.durationMs,
                    details: err.message,
                });
            }
        }
        console.warn(`[AnimeProviderManager] All eligible providers failed for search: "${cleanQuery}". Errors:`, errors.map(e => `[${e.providerId}:${e.code}] ${e.message}`));
        return [];
    }

    static async getInfo(id: string, preferredProvider?: ProviderName): Promise<AnimeDetails | null> {
        const cleanId = (id || '').trim();
        if (!cleanId) return null;

        const normalizedPref = preferredProvider ? normalizeProvider(preferredProvider) : undefined;
        const order = normalizedPref
            ? [normalizedPref, ...FALLBACK_ORDER.filter(p => p !== normalizedPref)]
            : FALLBACK_ORDER;

        const errors: ProviderError[] = [];
        for (const providerName of order) {
            const caps = getProviderCapabilities(providerName);
            if (!caps.supportsDetails) {
                logProviderDiagnostic({
                    provider: providerName,
                    requestType: 'details',
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

            const result = await executeWithTimeout<AnimeDetails>(
                () => provider.getInfo(cleanId),
                8000,
                providerName
            );

            if (result.success && result.data && result.data.id && Array.isArray(result.data.episodes)) {
                logProviderDiagnostic({
                    provider: providerName,
                    requestType: 'details',
                    status: 'SUCCESS',
                    httpStatus: 200,
                    validationResult: 'VALID',
                    parserResult: 'SUCCESS',
                    sourceCount: result.data.episodes.length,
                    finalClassification: result.durationMs > 2500 ? 'DEGRADED' : 'HEALTHY',
                    durationMs: result.durationMs,
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
                    requestType: 'details',
                    status: 'FAILURE',
                    httpStatus: err.statusCode,
                    validationResult: err.code === 'INVALID_RESPONSE' ? 'MALFORMED' : err.code === 'EMPTY_RESPONSE' ? 'EMPTY' : 'VALID',
                    parserResult: err.code === 'PARSER_ERROR' ? 'PARSER_FAILURE' : 'SKIPPED',
                    sourceCount: 0,
                    finalClassification: classification,
                    durationMs: result.durationMs,
                    details: err.message,
                });
            }
        }
        console.warn(`[AnimeProviderManager] All eligible providers failed for info: "${cleanId}". Errors:`, errors.map(e => `[${e.providerId}:${e.code}] ${e.message}`));
        return null;
    }

    static async getSources(
        id: string,
        episodeId: string,
        mode: 'sub' | 'dub' | 'raw' = 'sub',
        preferredProvider?: ProviderName,
        serverId?: string,
        fallbackMalId?: number
    ): Promise<VideoSource[]> {
        const cleanId = (id || '').trim();
        const cleanEp = (episodeId || '').trim();
        if (!cleanId || !cleanEp) return [];

        const normalizedPref = preferredProvider ? normalizeProvider(preferredProvider) : undefined;
        const order = normalizedPref
            ? [normalizedPref, ...FALLBACK_ORDER.filter(p => p !== normalizedPref)]
            : FALLBACK_ORDER;

        const errors: ProviderError[] = [];
        const seenUrls = new Set<string>();
        const validSources: VideoSource[] = [];

        console.log(`[AnimeProviderManager] 🚀 Fetching sources: id=${cleanId} ep=${cleanEp} mode=${mode} pref=${normalizedPref || 'none'}`);

        for (const providerName of order) {
            const caps = getProviderCapabilities(providerName);
            if (!caps.supportsSources) {
                logProviderDiagnostic({
                    provider: providerName,
                    requestType: 'sources',
                    status: 'FAILURE',
                    validationResult: 'UNSUPPORTED',
                    parserResult: 'SKIPPED',
                    sourceCount: 0,
                    finalClassification: 'UNSUPPORTED',
                    durationMs: 0,
                    details: 'Sources endpoint not supported',
                });
                continue;
            }

            // Check sub/dub capability if specified
            if (mode === 'dub' && caps.supportsDub === false) continue;
            if (mode === 'raw' && caps.supportsRaw === false) continue;

            const provider = safeGetProvider(providerName);
            if (!provider) continue;

            const result = await executeWithTimeout<VideoSource[]>(
                () => provider.getSources(cleanId, cleanEp, mode, serverId),
                7000,
                providerName
            );

            if (result.success && result.data && Array.isArray(result.data) && result.data.length > 0) {
                for (const s of result.data) {
                    if (isValidVideoSource(s)) {
                        const url = s.url || (s as any).link;
                        if (!seenUrls.has(url)) {
                            seenUrls.add(url);
                            validSources.push({
                                ...s,
                                url,
                                server: s.server || providerName,
                                providerId: s.providerId || providerName,
                                type: s.type || mode,
                            });
                        }
                    }
                }

                if (validSources.length > 0) {
                    logProviderDiagnostic({
                        provider: providerName,
                        requestType: 'sources',
                        status: 'SUCCESS',
                        httpStatus: 200,
                        validationResult: 'VALID',
                        parserResult: 'SUCCESS',
                        sourceCount: validSources.length,
                        finalClassification: result.durationMs > 2500 ? 'DEGRADED' : 'HEALTHY',
                        durationMs: result.durationMs,
                    });
                    console.log(`[AnimeProviderManager] ⚡ ${providerName} resolved ${validSources.length} sources in ${result.durationMs}ms`);
                    return rankVideoSources(validSources);
                }
            } else if (!result.success && result.error) {
                const err = result.error;
                errors.push(err);
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
                    requestType: 'sources',
                    status: 'FAILURE',
                    httpStatus: err.statusCode,
                    validationResult: err.code === 'INVALID_RESPONSE' ? 'MALFORMED' : err.code === 'EMPTY_RESPONSE' ? 'EMPTY' : 'VALID',
                    parserResult: err.code === 'PARSER_ERROR' ? 'PARSER_FAILURE' : 'SKIPPED',
                    sourceCount: 0,
                    finalClassification: classification,
                    durationMs: result.durationMs,
                    details: err.message,
                });
            }
        }

        console.warn(
            `[AnimeProviderManager] All primary scrapers failed for ${cleanId} ep ${cleanEp}. Attempting multi-embed fallbacks. Errors:`,
            errors.map(e => `[${e.providerId}:${e.code}] ${e.message}`)
        );

        // Multi-Embed Fallbacks using MAL ID
        try {
            let finalMalId = fallbackMalId;
            if (!finalMalId && /^\d+$/.test(cleanId)) {
                finalMalId = parseInt(cleanId, 10);
            }
            if (!finalMalId) {
                const info = await this.getInfo(cleanId);
                if (info?.malId) finalMalId = info.malId;
            }

            if (finalMalId) {
                // Parse episode number
                let epNum = '1';
                if (cleanEp.includes('episode-')) {
                    const match = cleanEp.match(/episode-(\d+)/);
                    if (match) epNum = match[1];
                } else if (/^\d+$/.test(cleanEp)) {
                    epNum = cleanEp;
                }

                const fallbackEmbeds: VideoSource[] = [
                    {
                        url: `https://vidsrc.me/embed/anime?mal=${finalMalId}&episode=${epNum}`,
                        quality: 'VidSrc (Multi)',
                        isM3U8: false,
                        isIframe: true,
                        server: 'vidsrc_me',
                        providerId: 'vidsrc',
                        type: mode,
                    },
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
                ];

                return rankVideoSources(fallbackEmbeds);
            }
        } catch (fallbackErr: any) {
            console.error(`[AnimeProviderManager] Fallback embed resolution failed:`, fallbackErr.message);
        }

        return [];
    }
}

export default AnimeProviderManager;


