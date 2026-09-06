/**
 * Parser Utilities and Error Handling
 * Provides safe data extraction, response validation, URL validation,
 * metadata normalization, and structured ParserError reporting.
 */

export class ParserError extends Error {
    readonly code = 'PARSER_ERROR' as const;
    readonly isParserError = true;
    readonly provider: string;
    readonly operation: string;
    readonly contentId: string;
    readonly reason: string;

    constructor(provider: string, operation: string, contentId: string, reason: string) {
        super(`[ParserError] [${provider}] Operation "${operation}" failed on "${contentId}": ${reason}`);
        this.name = 'ParserError';
        this.provider = provider;
        this.operation = operation;
        this.contentId = contentId;
        this.reason = reason;
    }
}

/**
 * Validates whether a given string is a usable, non-empty HTTP/HTTPS or relative URL.
 */
export function isValidUrl(url: unknown): url is string {
    if (typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (trimmed.length < 3) return false;
    return (
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('//') ||
        trimmed.startsWith('/') ||
        trimmed.startsWith('data:image/') ||
        trimmed.startsWith('blob:')
    );
}

/**
 * Ensures a URL string is properly sanitized and returns an empty string or fallback if invalid.
 */
export function sanitizeUrl(url: unknown, fallback = ''): string {
    if (!isValidUrl(url)) return fallback;
    const trimmed = (url as string).trim();
    // Prepend protocol if protocol-relative
    if (trimmed.startsWith('//')) {
        return `https:${trimmed}`;
    }
    return trimmed;
}

/**
 * Safely extracts a trimmed string from any unknown value.
 */
export function safeString(val: unknown, fallback = ''): string {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val.trim();
    if (typeof val === 'number') return String(val);
    return fallback;
}

/**
 * Safely parses an integer from any unknown value with fallback.
 */
export function safeInt(val: unknown, fallback = 0): number {
    if (typeof val === 'number' && !isNaN(val)) return Math.floor(val);
    if (typeof val === 'string') {
        const parsed = parseInt(val.replace(/[^\d-]/g, ''), 10);
        return isNaN(parsed) ? fallback : parsed;
    }
    return fallback;
}

/**
 * Safely returns an array, or an empty array if invalid.
 */
export function safeArray<T>(val: unknown): T[] {
    return Array.isArray(val) ? val : [];
}

/**
 * Safely parses JSON with fallback.
 */
export function safeJsonParse<T>(raw: unknown, fallback: T): T {
    if (typeof raw !== 'string') {
        if (typeof raw === 'object' && raw !== null) return raw as T;
        return fallback;
    }
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

/**
 * Normalizes quality labels to standard representation.
 */
export function normalizeQuality(quality: unknown): string {
    const q = safeString(quality).toLowerCase();
    if (!q || q === 'auto' || q === 'default' || q === 'adaptive') return 'auto';
    if (q.includes('1080') || q.includes('fhd')) return '1080p';
    if (q.includes('720') || q.includes('hd')) return '720p';
    if (q.includes('480') || q.includes('sd')) return '480p';
    if (q.includes('360')) return '360p';
    if (q.includes('240')) return '240p';
    return safeString(quality) || 'auto';
}

/**
 * Normalizes subtitle objects, filtering out invalid URLs and normalizing language tags.
 */
export function normalizeSubtitles(
    subtitles: unknown
): Array<{ url: string; lang: string; label?: string }> {
    if (!Array.isArray(subtitles)) return [];

    const normalized: Array<{ url: string; lang: string; label?: string }> = [];

    for (const sub of subtitles) {
        if (!sub || typeof sub !== 'object') continue;
        const url = sanitizeUrl(sub.url || sub.file);
        const lang = safeString(sub.lang || sub.label || sub.language || 'English');
        const label = safeString(sub.label || sub.name || lang);

        if (url && isValidUrl(url)) {
            normalized.push({
                url,
                lang: lang || 'English',
                label: label || lang || 'English',
            });
        }
    }

    return normalized;
}

/**
 * Normalizes video source objects with null/undefined protection and URL validation.
 */
export function normalizeVideoSource(src: {
    url: unknown;
    isM3U8?: boolean;
    quality?: unknown;
    isIframe?: boolean;
    server?: unknown;
    type?: unknown;
    headers?: Record<string, string>;
    providerId?: string;
    subtitles?: unknown;
}): {
    url: string;
    isM3U8: boolean;
    quality: string;
    isIframe?: boolean;
    server?: string;
    type?: 'sub' | 'dub' | 'raw';
    headers?: Record<string, string>;
    providerId?: string;
    subtitles?: Array<{ url: string; lang: string; label?: string }>;
} | null {
    if (!src || !isValidUrl(src.url)) return null;

    const url = sanitizeUrl(src.url);
    const isM3U8 = src.isM3U8 === true || url.includes('.m3u8');
    const quality = normalizeQuality(src.quality);
    const server = safeString(src.server) || undefined;
    const typeStr = safeString(src.type).toLowerCase();
    const type: 'sub' | 'dub' | 'raw' | undefined =
        typeStr === 'dub' ? 'dub' : typeStr === 'raw' ? 'raw' : typeStr === 'sub' ? 'sub' : undefined;

    const subs = normalizeSubtitles(src.subtitles);

    return {
        url,
        isM3U8,
        quality,
        isIframe: src.isIframe === true,
        ...(server ? { server } : {}),
        ...(type ? { type } : {}),
        ...(src.headers ? { headers: src.headers } : {}),
        ...(src.providerId ? { providerId: src.providerId } : {}),
        ...(subs.length > 0 ? { subtitles: subs } : {}),
    };
}
