/**
 * Provider Health Monitor
 * Tracks per-provider success/failure metrics in memory.
 * Integrates with anime-cache for TTL-based persistence across requests.
 *
 * Health Score: 0–100
 * - 100 = perfect (no recent failures)
 * - 0   = completely dead (all recent requests failed)
 *
 * Providers with score < 20 are auto-skipped in source/episode routes.
 */

import { animeCache } from './anime-cache';

export interface ProviderHealthRecord {
    provider: string;
    score: number;           // 0–100
    lastSuccess: number;     // unix timestamp ms
    lastFailure: number;     // unix timestamp ms
    successCount: number;    // rolling 1h window
    failureCount: number;    // rolling 1h window
    avgResponseMs: number;   // rolling average
    isBlacklisted: boolean;  // score < BLACKLIST_THRESHOLD
}

const HEALTH_CACHE_KEY = (name: string) => `health:${name}`;
const HEALTH_TTL = 60 * 60 * 1000; // 1 hour
const BLACKLIST_THRESHOLD = 20;
const RESPONSE_WEIGHT = 0.2; // how much response time affects score

function getRecord(provider: string): ProviderHealthRecord {
    const cached = animeCache.get<ProviderHealthRecord>(HEALTH_CACHE_KEY(provider));
    if (cached) return cached;
    return {
        provider,
        score: 100,
        lastSuccess: 0,
        lastFailure: 0,
        successCount: 0,
        failureCount: 0,
        avgResponseMs: 0,
        isBlacklisted: false,
    };
}

function saveRecord(record: ProviderHealthRecord): void {
    animeCache.set(HEALTH_CACHE_KEY(record.provider), record, HEALTH_TTL);
}

/** Call when a provider request succeeds */
export function recordSuccess(provider: string, responseMs: number): void {
    const rec = getRecord(provider);
    rec.lastSuccess = Date.now();
    rec.successCount++;

    // Exponential moving average for response time
    rec.avgResponseMs = rec.avgResponseMs === 0
        ? responseMs
        : Math.round(rec.avgResponseMs * 0.8 + responseMs * 0.2);

    // Recalculate score: base from success ratio, penalise for slow responses
    const total = rec.successCount + rec.failureCount;
    const successRatio = total > 0 ? rec.successCount / total : 1;
    const speedPenalty = Math.min(30, Math.max(0, (rec.avgResponseMs - 2000) / 100));
    rec.score = Math.round(Math.max(0, Math.min(100, successRatio * 100 - speedPenalty * RESPONSE_WEIGHT)));
    rec.isBlacklisted = rec.score < BLACKLIST_THRESHOLD;

    saveRecord(rec);
}

/** Call when a provider request fails */
export function recordFailure(provider: string): void {
    const rec = getRecord(provider);
    rec.lastFailure = Date.now();
    rec.failureCount++;

    const total = rec.successCount + rec.failureCount;
    const successRatio = total > 0 ? rec.successCount / total : 0;
    rec.score = Math.round(Math.max(0, successRatio * 100));
    rec.isBlacklisted = rec.score < BLACKLIST_THRESHOLD;

    saveRecord(rec);
}

/** Get health record for a provider */
export function getHealth(provider: string): ProviderHealthRecord {
    return getRecord(provider);
}

/** Get all tracked providers sorted by score descending */
export function getAllHealth(providerNames: string[]): ProviderHealthRecord[] {
    return providerNames
        .map(p => getRecord(p))
        .sort((a, b) => b.score - a.score);
}

/** Check if a provider is blacklisted (too many failures) */
export function isBlacklisted(provider: string): boolean {
    return getRecord(provider).isBlacklisted;
}

/**
 * Filter and sort a provider list by health score.
 * Blacklisted providers are moved to the end (not removed — still tried as last resort).
 */
export function sortByHealth(providers: string[]): string[] {
    const records = providers.map(p => ({ name: p, ...getRecord(p) }));
    const healthy = records.filter(r => !r.isBlacklisted).sort((a, b) => b.score - a.score);
    const blacklisted = records.filter(r => r.isBlacklisted).sort((a, b) => b.score - a.score);
    return [...healthy, ...blacklisted].map(r => r.name);
}

/** Reset a provider's health (manual override) */
export function resetHealth(provider: string): void {
    const fresh: ProviderHealthRecord = {
        provider,
        score: 100,
        lastSuccess: 0,
        lastFailure: 0,
        successCount: 0,
        failureCount: 0,
        avgResponseMs: 0,
        isBlacklisted: false,
    };
    saveRecord(fresh);
}
