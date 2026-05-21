/**
 * Request Scrambler — Anti-Bot Detection Evasion
 *
 * "Scrampling" = request scrambling: randomizing the timing, ordering,
 * and fingerprint characteristics of HTTP requests to avoid pattern detection
 * by Cloudflare, DDoS-Guard, and rate-limiters.
 *
 * Techniques used (all Vercel-safe, no browser required):
 * 1. Randomized Accept-Language headers (looks like real browser locales)
 * 2. Randomized Accept-Encoding combinations
 * 3. Random connection hints (DNT, Sec-GPC)
 * 4. Jittered request delays
 * 5. Scrambled header ordering (obfuscates scraper fingerprints)
 * 6. Realistic sec-fetch-* headers per context
 * 7. Random cache-control hints
 */

import { getUA, randomUA } from './user-agents';

// Real browser Accept-Language pools
const ACCEPT_LANGUAGES = [
    'en-US,en;q=0.9',
    'en-US,en;q=0.9,ja;q=0.8',
    'en-GB,en;q=0.9,en-US;q=0.8',
    'en-US,en;q=0.8,ja-JP;q=0.6,ja;q=0.4',
    'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
    'en-US,en;q=0.5',
];

// Accept header variants
const ACCEPT_HTML = [
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
];

const ACCEPT_JSON = [
    'application/json, text/plain, */*',
    'application/json, */*',
    '*/*',
];

const ACCEPT_ENCODING = [
    'gzip, deflate, br',
    'gzip, deflate',
    'br, gzip',
];

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

/** Random int between min and max (inclusive) */
function randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Jittered delay: random ms between min-max */
export function jitterMs(minMs: number, maxMs: number): Promise<void> {
    const delay = randInt(minMs, maxMs);
    return new Promise(resolve => setTimeout(resolve, delay));
}

export interface ScrambledHeaders {
    [key: string]: string;
}

/**
 * Build a scrambled, realistic-looking browser header set for HTML page requests.
 * Use for: provider pages, anime listing pages, search endpoints.
 */
export function scrampleHeaders(referer?: string, ua?: string): ScrambledHeaders {
    const userAgent = ua || getUA();
    const isFirefox = userAgent.includes('Firefox');
    const isChrome = userAgent.includes('Chrome') && !userAgent.includes('Edge');
    const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome');

    const headers: ScrambledHeaders = {
        'User-Agent': userAgent,
        'Accept': pick(ACCEPT_HTML),
        'Accept-Language': pick(ACCEPT_LANGUAGES),
        'Accept-Encoding': pick(ACCEPT_ENCODING),
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    };

    if (referer) {
        headers['Referer'] = referer;
        headers['Origin'] = new URL(referer).origin;
    }

    // Add realistic DNT / Sec-GPC randomly (some browsers send these)
    if (Math.random() > 0.5) headers['DNT'] = '1';
    if (Math.random() > 0.7) headers['Sec-GPC'] = '1';

    // Sec-Fetch headers (Chrome/Edge send these; Firefox partially)
    if (isChrome) {
        headers['Sec-Fetch-Dest'] = referer ? 'document' : 'empty';
        headers['Sec-Fetch-Mode'] = referer ? 'navigate' : 'cors';
        headers['Sec-Fetch-Site'] = referer ? 'same-site' : 'none';
        headers['Sec-Fetch-User'] = '?1';
        // Sec-CH-UA variants for Chrome
        const chromeVersion = userAgent.match(/Chrome\/([\d]+)/)?.[1] || '122';
        headers['Sec-CH-UA'] = `"Google Chrome";v="${chromeVersion}", "Chromium";v="${chromeVersion}", "Not:A-Brand";v="99"`;
        headers['Sec-CH-UA-Mobile'] = userAgent.includes('Mobile') ? '?1' : '?0';
        headers['Sec-CH-UA-Platform'] = pick(['"Windows"', '"macOS"', '"Linux"', '"Android"']);
    } else if (isFirefox) {
        headers['Sec-Fetch-Dest'] = 'document';
        headers['Sec-Fetch-Mode'] = 'navigate';
        headers['Sec-Fetch-Site'] = referer ? 'cross-site' : 'none';
        headers['Sec-Fetch-User'] = '?1';
    }

    // Random cache control hint
    if (Math.random() > 0.6) {
        headers['Cache-Control'] = pick(['max-age=0', 'no-cache']);
    }

    return headers;
}

/**
 * Build scrambled headers for JSON/API requests.
 * Use for: GraphQL, REST API endpoints, JSON embeds.
 */
export function scrampleApiHeaders(referer?: string, ua?: string): ScrambledHeaders {
    const userAgent = ua || getUA();
    const headers: ScrambledHeaders = {
        'User-Agent': userAgent,
        'Accept': pick(ACCEPT_JSON),
        'Accept-Language': pick(ACCEPT_LANGUAGES),
        'Accept-Encoding': pick(ACCEPT_ENCODING),
        'Content-Type': 'application/json',
    };

    if (referer) {
        headers['Referer'] = referer;
        headers['Origin'] = new URL(referer).origin;
    }

    if (Math.random() > 0.5) headers['DNT'] = '1';

    return headers;
}

/**
 * Build scrambled headers for XHR/fetch requests from within an embed page.
 * Use for: iframe embed pages, stream URL fetching.
 */
export function scrampleXhrHeaders(pageOrigin: string, ua?: string): ScrambledHeaders {
    const userAgent = ua || randomUA();
    return {
        'User-Agent': userAgent,
        'Accept': pick(ACCEPT_JSON),
        'Accept-Language': pick(ACCEPT_LANGUAGES),
        'Referer': pageOrigin,
        'Origin': pageOrigin,
        'X-Requested-With': 'XMLHttpRequest',
    };
}

/**
 * Retry wrapper with exponential backoff + jitter.
 * Retries fn up to maxAttempts times, doubling delay each time.
 *
 * @param fn          - async function to retry
 * @param maxAttempts - max number of total attempts (default 3)
 * @param baseDelayMs - initial delay in ms (default 500)
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    maxAttempts = 3,
    baseDelayMs = 500,
): Promise<T> {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (err: any) {
            lastError = err;
            if (attempt < maxAttempts) {
                // Exponential backoff with ±20% jitter
                const delay = baseDelayMs * Math.pow(2, attempt - 1);
                const jitter = delay * 0.2 * (Math.random() * 2 - 1);
                await jitterMs(Math.max(100, delay + jitter), Math.max(200, delay + jitter + 100));
                console.warn(`[Retry] Attempt ${attempt} failed (${err.message}), retrying in ~${Math.round(delay)}ms...`);
            }
        }
    }
    throw lastError || new Error('withRetry: all attempts failed');
}

/**
 * Scramble a set of request header keys (randomize ordering).
 * Header ordering can be a fingerprinting vector for some WAFs.
 */
export function scrambleHeaderOrder(headers: ScrambledHeaders): ScrambledHeaders {
    const entries = Object.entries(headers);
    // Fisher-Yates shuffle
    for (let i = entries.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [entries[i], entries[j]] = [entries[j], entries[i]];
    }
    return Object.fromEntries(entries);
}
