import fs from 'fs';
import path from 'path';

export type ProviderHealthStatus =
    | 'HEALTHY'
    | 'DEGRADED'
    | 'SCRAPER_ERROR'
    | 'TEMPORARY_FAILURE'
    | 'UNAVAILABLE'
    | 'UNSUPPORTED';

export interface ProviderDiagnosticLog {
    timestamp: string;
    requestType: 'search' | 'details' | 'episodes' | 'sources' | 'ping';
    httpStatus?: number;
    validationResult: 'VALID' | 'EMPTY' | 'MALFORMED' | 'UNSUPPORTED';
    parserResult: 'SUCCESS' | 'PARSER_FAILURE' | 'NO_MATCH' | 'SKIPPED';
    sourceCount: number;
    finalClassification: ProviderHealthStatus;
    durationMs: number;
    message?: string;
}

export interface HealthStats {
    name: string;
    category: 'metadata' | 'stream';
    successCount: number;
    failureCount: number;
    consecutiveFailures: number;
    latencyHistory: number[]; // Keep last 20 responses
    avgResponseMs: number;
    successRate: number;
    healthScore: number;
    status: ProviderHealthStatus;
    lastChecked: number;
    isDead: boolean;
    uptimePercentage: number;
    errorLogs: { timestamp: string; message: string; classification?: ProviderHealthStatus }[];
    recentDiagnostics?: ProviderDiagnosticLog[];
}

const DEFAULT_PROVIDERS: { name: string; category: 'metadata' | 'stream'; endpoint: string }[] = [
    { name: 'TMDB API', category: 'metadata', endpoint: 'https://api.themoviedb.org/3' },
    { name: 'AniList API', category: 'metadata', endpoint: 'https://graphql.anilist.co' },
    { name: 'Jikan API', category: 'metadata', endpoint: 'https://api.jikan.moe/v4/status' },
    { name: 'VidSrc ME', category: 'stream', endpoint: 'https://vidsrc.me' },
    { name: 'VidSrc TO', category: 'stream', endpoint: 'https://vidsrc.to' },
    { name: 'SuperEmbed', category: 'stream', endpoint: 'https://multiembed.com.co' },
    { name: 'AutoEmbed', category: 'stream', endpoint: 'https://player.autoembed.to' },
    { name: 'HiAnime', category: 'stream', endpoint: 'https://hianime.to' },
    { name: 'Gogoanime', category: 'stream', endpoint: 'https://gogoanime3.co' },
    { name: 'Consumet', category: 'stream', endpoint: 'https://api.consumet.org' },
    { name: 'AniWatch', category: 'stream', endpoint: 'https://aniwatchtv.to' },
    { name: 'Anikai', category: 'stream', endpoint: 'https://anikai.to' },
    { name: 'AllAnime', category: 'stream', endpoint: 'https://allanime.to' },
    { name: 'CinEvo', category: 'stream', endpoint: 'https://cinevo.net' },
];

const STORAGE_PATH = '/tmp/provider_health.json';

class ProviderHealthEngine {
    private stats: Map<string, HealthStats> = new Map();
    // Only consecutive hard network/server dropouts trigger UNAVAILABLE cooldown
    private readonly MAX_HARD_FAILURES = 6;
    private readonly REVIVE_COOLDOWN_MS = 60 * 1000; // 1 minute auto-retry

    constructor() {
        this.loadFromFile();
        if (this.stats.size === 0) {
            this.seedDefaults();
        }
    }

    private seedDefaults() {
        DEFAULT_PROVIDERS.forEach(p => {
            this.stats.set(p.name.toLowerCase(), {
                name: p.name,
                category: p.category,
                successCount: 15,
                failureCount: 0,
                consecutiveFailures: 0,
                latencyHistory: [200, 250, 180, 220, 240],
                avgResponseMs: 218,
                successRate: 100,
                healthScore: 100,
                status: 'HEALTHY',
                lastChecked: Date.now() - 60000,
                isDead: false,
                uptimePercentage: 100,
                errorLogs: [],
                recentDiagnostics: [],
            });
        });
        this.saveToFile();
    }

    private loadFromFile() {
        try {
            if (fs.existsSync(STORAGE_PATH)) {
                const raw = fs.readFileSync(STORAGE_PATH, 'utf8');
                const parsed = JSON.parse(raw);
                Object.entries(parsed).forEach(([key, val]: [string, any]) => {
                    this.stats.set(key.toLowerCase(), val);
                });
            }
        } catch (err) {
            // Silently ignore storage read errors in serverless
        }
    }

    private saveToFile() {
        try {
            const data = Object.fromEntries(this.stats);
            fs.writeFileSync(STORAGE_PATH, JSON.stringify(data, null, 2), 'utf8');
        } catch (err) {
            // In read-only or permissionless environments, fail silently
        }
    }

    private initStat(provider: string): HealthStats {
        const key = provider.toLowerCase().trim();
        if (!this.stats.has(key)) {
            const defaultMatch = DEFAULT_PROVIDERS.find(p => p.name.toLowerCase() === key);
            this.stats.set(key, {
                name: defaultMatch?.name || provider,
                category: defaultMatch?.category || 'stream',
                successCount: 0,
                failureCount: 0,
                consecutiveFailures: 0,
                latencyHistory: [],
                avgResponseMs: 0,
                successRate: 100,
                healthScore: 100,
                status: 'HEALTHY',
                lastChecked: Date.now(),
                isDead: false,
                uptimePercentage: 100,
                errorLogs: [],
                recentDiagnostics: [],
            });
        }
        return this.stats.get(key)!;
    }

    reportSuccess(provider: string, latencyMs: number) {
        const stat = this.initStat(provider);
        stat.successCount++;
        stat.consecutiveFailures = 0;
        stat.isDead = false;
        stat.status = latencyMs > 2500 ? 'DEGRADED' : 'HEALTHY';

        stat.latencyHistory.push(latencyMs);
        if (stat.latencyHistory.length > 20) {
            stat.latencyHistory.shift();
        }

        const total = stat.latencyHistory.reduce((a, b) => a + b, 0);
        stat.avgResponseMs = Math.round(total / stat.latencyHistory.length);

        const totalChecks = stat.successCount + stat.failureCount;
        stat.successRate = Math.round((stat.successCount / totalChecks) * 100);
        stat.uptimePercentage = stat.successRate;

        stat.healthScore = Math.max(0, Math.min(100, 100 - (stat.avgResponseMs > 1500 ? 15 : 0)));
        stat.lastChecked = Date.now();

        this.saveToFile();
    }

    reportDiagnostic(diagnostic: {
        provider: string;
        requestType: 'search' | 'details' | 'episodes' | 'sources' | 'ping';
        httpStatus?: number;
        validationResult: 'VALID' | 'EMPTY' | 'MALFORMED' | 'UNSUPPORTED';
        parserResult: 'SUCCESS' | 'PARSER_FAILURE' | 'NO_MATCH' | 'SKIPPED';
        sourceCount: number;
        finalClassification: ProviderHealthStatus;
        durationMs: number;
        message?: string;
    }) {
        const stat = this.initStat(diagnostic.provider);
        const classification = diagnostic.finalClassification;

        if (classification === 'HEALTHY') {
            stat.successCount++;
            stat.consecutiveFailures = 0;
            stat.isDead = false;
            stat.status = diagnostic.durationMs > 2500 ? 'DEGRADED' : 'HEALTHY';
        } else if (classification === 'SCRAPER_ERROR' || classification === 'TEMPORARY_FAILURE') {
            // Crucial: Scraper/parser errors or single title miss do NOT mark the server as offline or dead!
            stat.failureCount++;
            stat.status = classification;
            stat.isDead = false; // Underlying server remains reachable!
        } else if (classification === 'DEGRADED' || classification === 'UNSUPPORTED') {
            stat.status = classification;
            stat.isDead = false;
        } else if (classification === 'UNAVAILABLE') {
            stat.failureCount++;
            stat.consecutiveFailures++;
            if (stat.consecutiveFailures >= this.MAX_HARD_FAILURES) {
                stat.isDead = true;
                stat.status = 'UNAVAILABLE';
            } else {
                stat.status = 'TEMPORARY_FAILURE';
            }
        }

        if (diagnostic.durationMs > 0) {
            stat.latencyHistory.push(diagnostic.durationMs);
            if (stat.latencyHistory.length > 20) stat.latencyHistory.shift();
            const total = stat.latencyHistory.reduce((a, b) => a + b, 0);
            stat.avgResponseMs = Math.round(total / stat.latencyHistory.length);
        }

        if (!stat.recentDiagnostics) stat.recentDiagnostics = [];
        stat.recentDiagnostics.unshift({
            timestamp: new Date().toISOString(),
            requestType: diagnostic.requestType,
            httpStatus: diagnostic.httpStatus,
            validationResult: diagnostic.validationResult,
            parserResult: diagnostic.parserResult,
            sourceCount: diagnostic.sourceCount,
            finalClassification: classification,
            durationMs: diagnostic.durationMs,
            message: diagnostic.message,
        });
        if (stat.recentDiagnostics.length > 15) {
            stat.recentDiagnostics.pop();
        }

        stat.lastChecked = Date.now();
        this.saveToFile();
    }

    reportError(provider: string, message: string, classification: ProviderHealthStatus = 'TEMPORARY_FAILURE') {
        const stat = this.initStat(provider);
        stat.failureCount++;

        stat.errorLogs.unshift({
            timestamp: new Date().toISOString(),
            message: message || 'Unknown Error',
            classification,
        });
        if (stat.errorLogs.length > 10) {
            stat.errorLogs.pop();
        }

        if (classification === 'UNAVAILABLE') {
            stat.consecutiveFailures++;
            if (stat.consecutiveFailures >= this.MAX_HARD_FAILURES) {
                stat.isDead = true;
                stat.status = 'UNAVAILABLE';
            } else {
                stat.status = 'TEMPORARY_FAILURE';
            }
        } else {
            // Scraper, parser, unsupported, or temporary failures do NOT mark the provider dead
            stat.status = classification;
            stat.isDead = false;
        }

        const totalChecks = stat.successCount + stat.failureCount;
        stat.successRate = totalChecks > 0 ? Math.round((stat.successCount / totalChecks) * 100) : 100;
        stat.uptimePercentage = stat.successRate;
        stat.healthScore = Math.max(0, Math.min(100, 100 - (stat.consecutiveFailures * 15)));
        stat.lastChecked = Date.now();

        this.saveToFile();
    }

    isHealthy(provider: string): boolean {
        const stat = this.stats.get(provider.toLowerCase().trim());
        if (!stat) return true;

        if (stat.isDead) {
            const timeSinceLastCheck = Date.now() - stat.lastChecked;
            if (timeSinceLastCheck > this.REVIVE_COOLDOWN_MS) {
                stat.isDead = false;
                stat.status = 'HEALTHY';
                stat.consecutiveFailures = 0;
                stat.healthScore = 75;
                this.saveToFile();
                return true;
            }
            return false;
        }
        return true;
    }

    getHealthyProviders(providers: string[]): string[] {
        return providers.filter(p => this.isHealthy(p));
    }

    getStats(): Record<string, HealthStats> {
        this.stats.forEach((stat) => {
            if (stat.isDead && Date.now() - stat.lastChecked > this.REVIVE_COOLDOWN_MS) {
                stat.isDead = false;
                stat.status = 'HEALTHY';
                stat.consecutiveFailures = 0;
                stat.healthScore = 75;
            }
        });
        this.saveToFile();
        return Object.fromEntries(this.stats);
    }
}

export const providerHealth = new ProviderHealthEngine();

