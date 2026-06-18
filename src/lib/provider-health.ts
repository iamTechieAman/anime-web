import fs from 'fs';
import path from 'path';

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
    status: 'healthy' | 'slow' | 'offline'; // Green, Orange, Red
    lastChecked: number;
    isDead: boolean;
    uptimePercentage: number;
    errorLogs: { timestamp: string; message: string }[];
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
    { name: 'Gogoanime', category: 'stream', endpoint: 'https://gogoanime3.co' }
];

const STORAGE_PATH = '/tmp/provider_health.json';

class ProviderHealthEngine {
    private stats: Map<string, HealthStats> = new Map();
    private readonly MAX_CONSECUTIVE_FAILURES = 3;
    private readonly REVIVE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

    constructor() {
        this.loadFromFile();
        if (this.stats.size === 0) {
            this.seedDefaults();
        }
    }

    private seedDefaults() {
        DEFAULT_PROVIDERS.forEach(p => {
            this.stats.set(p.name, {
                name: p.name,
                category: p.category,
                successCount: 15, // start with some seed success
                failureCount: 0,
                consecutiveFailures: 0,
                latencyHistory: [200, 250, 180, 220, 240],
                avgResponseMs: 218,
                successRate: 100,
                healthScore: 100,
                status: 'healthy',
                lastChecked: Date.now() - 60000,
                isDead: false,
                uptimePercentage: 100,
                errorLogs: []
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
                    this.stats.set(key, val);
                });
                console.log('[Health Engine] Successfully loaded health logs from tmp storage.');
            }
        } catch (err) {
            console.warn('[Health Engine] Failed to load health logs from tmp storage:', err);
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
        if (!this.stats.has(provider)) {
            const defaultMatch = DEFAULT_PROVIDERS.find(p => p.name.toLowerCase() === provider.toLowerCase());
            this.stats.set(provider, {
                name: provider,
                category: defaultMatch?.category || 'stream',
                successCount: 0,
                failureCount: 0,
                consecutiveFailures: 0,
                latencyHistory: [],
                avgResponseMs: 0,
                successRate: 100,
                healthScore: 100,
                status: 'healthy',
                lastChecked: Date.now(),
                isDead: false,
                uptimePercentage: 100,
                errorLogs: []
            });
        }
        return this.stats.get(provider)!;
    }

    reportSuccess(provider: string, latencyMs: number) {
        const stat = this.initStat(provider);
        stat.successCount++;
        stat.consecutiveFailures = 0;
        stat.isDead = false;
        
        // Update latency history (max 20 elements)
        stat.latencyHistory.push(latencyMs);
        if (stat.latencyHistory.length > 20) {
            stat.latencyHistory.shift();
        }
        
        // Calculate average response
        const total = stat.latencyHistory.reduce((a, b) => a + b, 0);
        stat.avgResponseMs = Math.round(total / stat.latencyHistory.length);
        
        // Recalculate rates & scores
        const totalChecks = stat.successCount + stat.failureCount;
        stat.successRate = Math.round((stat.successCount / totalChecks) * 100);
        stat.uptimePercentage = stat.successRate;

        // Status determinations
        if (stat.avgResponseMs > 2500) {
            stat.status = 'slow';
        } else {
            stat.status = 'healthy';
        }

        stat.healthScore = Math.max(0, Math.min(100, 100 - (stat.avgResponseMs > 1500 ? 15 : 0)));
        stat.lastChecked = Date.now();
        
        this.saveToFile();
    }

    reportError(provider: string, message: string) {
        const stat = this.initStat(provider);
        stat.failureCount++;
        stat.consecutiveFailures++;
        
        // Append error log (max 10 elements)
        stat.errorLogs.unshift({
            timestamp: new Date().toISOString(),
            message: message || 'Unknown Error'
        });
        if (stat.errorLogs.length > 10) {
            stat.errorLogs.pop();
        }

        const totalChecks = stat.successCount + stat.failureCount;
        stat.successRate = Math.round((stat.successCount / totalChecks) * 100);
        stat.uptimePercentage = stat.successRate;

        if (stat.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
            stat.isDead = true;
            stat.status = 'offline';
            console.warn(`[Health Engine] Provider ${provider} marked as OFFLINE/DISABLED after ${stat.consecutiveFailures} consecutive failures.`);
        }

        stat.healthScore = Math.max(0, Math.min(100, 100 - (stat.consecutiveFailures * 30)));
        stat.lastChecked = Date.now();
        
        this.saveToFile();
    }

    isHealthy(provider: string): boolean {
        const stat = this.stats.get(provider);
        if (!stat) return true;

        if (stat.isDead) {
            const timeSinceLastCheck = Date.now() - stat.lastChecked;
            if (timeSinceLastCheck > this.REVIVE_COOLDOWN_MS) {
                console.log(`[Health Engine] Provider ${provider} cooldown expired. Auto-retry and reviving.`);
                stat.isDead = false;
                stat.status = 'healthy';
                stat.consecutiveFailures = 0;
                stat.healthScore = 70; // revived starting score
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
        // Trigger auto-revive for expired pings before returning
        this.stats.forEach((stat, name) => {
            if (stat.isDead && Date.now() - stat.lastChecked > this.REVIVE_COOLDOWN_MS) {
                stat.isDead = false;
                stat.status = 'healthy';
                stat.consecutiveFailures = 0;
                stat.healthScore = 70;
            }
        });
        this.saveToFile();
        return Object.fromEntries(this.stats);
    }
}

export const providerHealth = new ProviderHealthEngine();
