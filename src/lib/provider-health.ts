import fs from 'fs';
import path from 'path';

export type ProviderHealthStatus =
    | 'HEALTHY'
    | 'DEGRADED'
    | 'SCRAPER_ERROR'
    | 'TEMPORARY_FAILURE'
    | 'UNAVAILABLE'
    | 'UNSUPPORTED';

export type ProviderOperationType = 'search' | 'details' | 'episodes' | 'sources' | 'ping';

export type ProviderMetric =
    | 'success'
    | 'timeout'
    | 'network_error'
    | 'http_error'
    | 'parser_error'
    | 'no_result';

export interface ProviderDiagnosticLog {
    timestamp: string;
    requestType: ProviderOperationType;
    httpStatus?: number;
    validationResult: 'VALID' | 'EMPTY' | 'MALFORMED' | 'UNSUPPORTED';
    parserResult: 'SUCCESS' | 'PARSER_FAILURE' | 'NO_MATCH' | 'SKIPPED';
    sourceCount: number;
    finalClassification: ProviderHealthStatus;
    durationMs: number;
    message?: string;
}

export interface OperationHealthStats {
    operation: ProviderOperationType;
    successCount: number;
    failureCount: number;
    consecutiveFailures: number;
    status: ProviderHealthStatus;
    lastChecked: number;
    avgResponseMs: number;
    latencyHistory: number[];
    recentResults: {
        timestamp: string;
        metric: ProviderMetric;
        classification: ProviderHealthStatus;
        durationMs: number;
        message?: string;
    }[];
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
    operationHealth?: Partial<Record<ProviderOperationType, OperationHealthStats>>;
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
const MAX_SLIDING_WINDOW = 20;

function classifyMetric(diag: {
    finalClassification: ProviderHealthStatus;
    validationResult?: 'VALID' | 'EMPTY' | 'MALFORMED' | 'UNSUPPORTED';
    parserResult?: 'SUCCESS' | 'PARSER_FAILURE' | 'NO_MATCH' | 'SKIPPED';
    httpStatus?: number;
    message?: string;
}): ProviderMetric {
    if (diag.finalClassification === 'HEALTHY') return 'success';

    // Single title miss or empty results for specific request is NOT a server failure
    if (diag.parserResult === 'NO_MATCH' || diag.validationResult === 'EMPTY') {
        if (!diag.httpStatus || diag.httpStatus === 200) return 'no_result';
    }

    if (diag.parserResult === 'PARSER_FAILURE' || diag.validationResult === 'MALFORMED' || diag.finalClassification === 'SCRAPER_ERROR') {
        return 'parser_error';
    }

    if (diag.finalClassification === 'TEMPORARY_FAILURE' || (diag.message && diag.message.toLowerCase().includes('timeout'))) {
        return 'timeout';
    }

    if (diag.httpStatus && diag.httpStatus >= 500) {
        return 'http_error';
    }

    if (diag.finalClassification === 'UNAVAILABLE') {
        return 'network_error';
    }

    return 'parser_error';
}

class ProviderHealthEngine {
    private stats: Map<string, HealthStats> = new Map();
    // Only consecutive hard network/server dropouts trigger UNAVAILABLE cooldown
    private readonly MAX_HARD_FAILURES = 5;
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
                operationHealth: {},
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
                operationHealth: {},
            });
        }
        const stat = this.stats.get(key)!;
        if (!stat.operationHealth) {
            stat.operationHealth = {};
        }
        return stat;
    }

    private initOperationStat(stat: HealthStats, op: ProviderOperationType): OperationHealthStats {
        if (!stat.operationHealth) {
            stat.operationHealth = {};
        }
        if (!stat.operationHealth[op]) {
            stat.operationHealth[op] = {
                operation: op,
                successCount: 0,
                failureCount: 0,
                consecutiveFailures: 0,
                status: 'HEALTHY',
                lastChecked: Date.now(),
                avgResponseMs: 0,
                latencyHistory: [],
                recentResults: [],
            };
        }
        return stat.operationHealth[op]!;
    }

    reportSuccess(provider: string, latencyMs: number, operation: ProviderOperationType = 'ping') {
        const stat = this.initStat(provider);
        const opStat = this.initOperationStat(stat, operation);

        stat.successCount++;
        stat.consecutiveFailures = 0;
        stat.isDead = false;
        stat.status = latencyMs > 2500 ? 'DEGRADED' : 'HEALTHY';

        opStat.successCount++;
        opStat.consecutiveFailures = 0;
        opStat.status = latencyMs > 2500 ? 'DEGRADED' : 'HEALTHY';
        opStat.lastChecked = Date.now();

        if (latencyMs > 0) {
            stat.latencyHistory.push(latencyMs);
            if (stat.latencyHistory.length > MAX_SLIDING_WINDOW) stat.latencyHistory.shift();
            const total = stat.latencyHistory.reduce((a, b) => a + b, 0);
            stat.avgResponseMs = Math.round(total / stat.latencyHistory.length);

            opStat.latencyHistory.push(latencyMs);
            if (opStat.latencyHistory.length > MAX_SLIDING_WINDOW) opStat.latencyHistory.shift();
            opStat.avgResponseMs = Math.round(opStat.latencyHistory.reduce((a, b) => a + b, 0) / opStat.latencyHistory.length);
        }

        opStat.recentResults.unshift({
            timestamp: new Date().toISOString(),
            metric: 'success',
            classification: stat.status,
            durationMs: latencyMs,
        });
        if (opStat.recentResults.length > MAX_SLIDING_WINDOW) opStat.recentResults.pop();

        const totalChecks = stat.successCount + stat.failureCount;
        stat.successRate = Math.round((stat.successCount / (totalChecks || 1)) * 100);
        stat.uptimePercentage = stat.successRate;
        stat.healthScore = Math.max(0, Math.min(100, 100 - (stat.avgResponseMs > 1500 ? 15 : 0)));
        stat.lastChecked = Date.now();

        this.saveToFile();
    }

    reportDiagnostic(diagnostic: {
        provider: string;
        requestType: ProviderOperationType;
        httpStatus?: number;
        validationResult: 'VALID' | 'EMPTY' | 'MALFORMED' | 'UNSUPPORTED';
        parserResult: 'SUCCESS' | 'PARSER_FAILURE' | 'NO_MATCH' | 'SKIPPED';
        sourceCount: number;
        finalClassification: ProviderHealthStatus;
        durationMs: number;
        message?: string;
    }) {
        const stat = this.initStat(diagnostic.provider);
        const opStat = this.initOperationStat(stat, diagnostic.requestType);
        const classification = diagnostic.finalClassification;
        const metric = classifyMetric(diagnostic);

        // Record sliding result on operation level
        opStat.recentResults.unshift({
            timestamp: new Date().toISOString(),
            metric,
            classification,
            durationMs: diagnostic.durationMs,
            message: diagnostic.message,
        });
        if (opStat.recentResults.length > MAX_SLIDING_WINDOW) opStat.recentResults.pop();

        if (metric === 'success') {
            stat.successCount++;
            stat.consecutiveFailures = 0;
            stat.isDead = false;
            stat.status = diagnostic.durationMs > 2500 ? 'DEGRADED' : 'HEALTHY';

            opStat.successCount++;
            opStat.consecutiveFailures = 0;
            opStat.status = diagnostic.durationMs > 2500 ? 'DEGRADED' : 'HEALTHY';
        } else if (metric === 'no_result') {
            // Content miss for specific anime/episode: server is healthy & reachable!
            stat.successCount++;
            opStat.successCount++;
            // Do NOT increment consecutiveFailures or drop health status to error
            if (stat.status === 'UNAVAILABLE') stat.status = 'HEALTHY';
            if (opStat.status === 'UNAVAILABLE') opStat.status = 'HEALTHY';
        } else if (metric === 'parser_error') {
            // Parser/scraper error: operation parser issue, but underlying server IS online
            stat.failureCount++;
            opStat.failureCount++;
            opStat.status = 'SCRAPER_ERROR';
            stat.isDead = false; // Server remains reachable!
            if (stat.status !== 'UNAVAILABLE') stat.status = 'SCRAPER_ERROR';
        } else if (metric === 'timeout') {
            stat.failureCount++;
            opStat.failureCount++;
            opStat.consecutiveFailures++;
            opStat.status = 'TEMPORARY_FAILURE';
            if (stat.status !== 'UNAVAILABLE') stat.status = 'TEMPORARY_FAILURE';
        } else if (metric === 'network_error' || metric === 'http_error') {
            stat.failureCount++;
            stat.consecutiveFailures++;
            opStat.failureCount++;
            opStat.consecutiveFailures++;

            if (opStat.consecutiveFailures >= this.MAX_HARD_FAILURES) {
                opStat.status = 'UNAVAILABLE';
            } else {
                opStat.status = 'TEMPORARY_FAILURE';
            }

            if (stat.consecutiveFailures >= this.MAX_HARD_FAILURES) {
                stat.isDead = true;
                stat.status = 'UNAVAILABLE';
            } else {
                stat.status = 'TEMPORARY_FAILURE';
            }
        }

        if (diagnostic.durationMs > 0) {
            stat.latencyHistory.push(diagnostic.durationMs);
            if (stat.latencyHistory.length > MAX_SLIDING_WINDOW) stat.latencyHistory.shift();
            stat.avgResponseMs = Math.round(stat.latencyHistory.reduce((a, b) => a + b, 0) / stat.latencyHistory.length);

            opStat.latencyHistory.push(diagnostic.durationMs);
            if (opStat.latencyHistory.length > MAX_SLIDING_WINDOW) opStat.latencyHistory.shift();
            opStat.avgResponseMs = Math.round(opStat.latencyHistory.reduce((a, b) => a + b, 0) / opStat.latencyHistory.length);
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
        opStat.lastChecked = Date.now();

        // Calculate health score using sliding window ratios
        const totalChecks = stat.successCount + stat.failureCount;
        stat.successRate = totalChecks > 0 ? Math.round((stat.successCount / totalChecks) * 100) : 100;
        stat.uptimePercentage = stat.successRate;
        stat.healthScore = Math.max(0, Math.min(100, 100 - (stat.consecutiveFailures * 15) - (stat.avgResponseMs > 2000 ? 15 : 0)));

        this.saveToFile();
    }

    reportError(
        provider: string,
        message: string,
        classification: ProviderHealthStatus = 'TEMPORARY_FAILURE',
        operation: ProviderOperationType = 'ping'
    ) {
        const stat = this.initStat(provider);
        const opStat = this.initOperationStat(stat, operation);
        const metric = classifyMetric({ finalClassification: classification, message });

        stat.failureCount++;
        opStat.failureCount++;

        stat.errorLogs.unshift({
            timestamp: new Date().toISOString(),
            message: message || 'Unknown Error',
            classification,
        });
        if (stat.errorLogs.length > 10) {
            stat.errorLogs.pop();
        }

        opStat.recentResults.unshift({
            timestamp: new Date().toISOString(),
            metric,
            classification,
            durationMs: 0,
            message,
        });
        if (opStat.recentResults.length > MAX_SLIDING_WINDOW) opStat.recentResults.pop();

        if (classification === 'UNAVAILABLE') {
            stat.consecutiveFailures++;
            opStat.consecutiveFailures++;
            if (stat.consecutiveFailures >= this.MAX_HARD_FAILURES) {
                stat.isDead = true;
                stat.status = 'UNAVAILABLE';
            } else {
                stat.status = 'TEMPORARY_FAILURE';
            }
            if (opStat.consecutiveFailures >= this.MAX_HARD_FAILURES) {
                opStat.status = 'UNAVAILABLE';
            } else {
                opStat.status = 'TEMPORARY_FAILURE';
            }
        } else {
            stat.status = classification;
            opStat.status = classification;
            stat.isDead = false;
        }

        const totalChecks = stat.successCount + stat.failureCount;
        stat.successRate = totalChecks > 0 ? Math.round((stat.successCount / totalChecks) * 100) : 100;
        stat.uptimePercentage = stat.successRate;
        stat.healthScore = Math.max(0, Math.min(100, 100 - (stat.consecutiveFailures * 15)));
        stat.lastChecked = Date.now();
        opStat.lastChecked = Date.now();

        this.saveToFile();
    }

    /**
     * Check if a provider (or specific operation on a provider) is healthy.
     * Implements auto-revive for short-lived health states.
     */
    isHealthy(provider: string, operation?: ProviderOperationType): boolean {
        const stat = this.stats.get(provider.toLowerCase().trim());
        if (!stat) return true;

        // Auto-revive global dead state after cooldown
        if (stat.isDead) {
            const timeSinceLastCheck = Date.now() - stat.lastChecked;
            if (timeSinceLastCheck > this.REVIVE_COOLDOWN_MS) {
                stat.isDead = false;
                stat.status = 'HEALTHY';
                stat.consecutiveFailures = 0;
                stat.healthScore = 75;
                if (stat.operationHealth) {
                    Object.values(stat.operationHealth).forEach(op => {
                        if (op) {
                            op.consecutiveFailures = 0;
                            op.status = 'HEALTHY';
                        }
                    });
                }
                this.saveToFile();
                return true;
            }
            return false;
        }

        // If checking specific operation
        if (operation && stat.operationHealth && stat.operationHealth[operation]) {
            const opStat = stat.operationHealth[operation]!;
            if (opStat.status === 'UNAVAILABLE') {
                const timeSinceLastCheck = Date.now() - opStat.lastChecked;
                if (timeSinceLastCheck > this.REVIVE_COOLDOWN_MS) {
                    opStat.status = 'HEALTHY';
                    opStat.consecutiveFailures = 0;
                    this.saveToFile();
                    return true;
                }
                return false;
            }
        }

        return true;
    }

    getHealthyProviders(providers: string[], operation?: ProviderOperationType): string[] {
        return providers.filter(p => this.isHealthy(p, operation));
    }

    getOperationHealth(provider: string, operation: ProviderOperationType): ProviderHealthStatus {
        const stat = this.stats.get(provider.toLowerCase().trim());
        if (!stat || !stat.operationHealth || !stat.operationHealth[operation]) {
            return 'HEALTHY';
        }
        return stat.operationHealth[operation]!.status;
    }

    getStats(): Record<string, HealthStats> {
        this.stats.forEach((stat) => {
            if (stat.isDead && Date.now() - stat.lastChecked > this.REVIVE_COOLDOWN_MS) {
                stat.isDead = false;
                stat.status = 'HEALTHY';
                stat.consecutiveFailures = 0;
                stat.healthScore = 75;
            }
            if (stat.operationHealth) {
                Object.values(stat.operationHealth).forEach(op => {
                    if (op && op.status === 'UNAVAILABLE' && Date.now() - op.lastChecked > this.REVIVE_COOLDOWN_MS) {
                        op.status = 'HEALTHY';
                        op.consecutiveFailures = 0;
                    }
                });
            }
        });
        this.saveToFile();
        return Object.fromEntries(this.stats);
    }
}

export const providerHealth = new ProviderHealthEngine();


