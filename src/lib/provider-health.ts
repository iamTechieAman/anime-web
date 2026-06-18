import type { ProviderName } from './providers/types';

interface HealthStats {
    success: number;
    errors: number;
    timeouts: number;
    lastChecked: number;
    isDead: boolean;
    consecutiveFailures: number;
}

class ProviderHealthEngine {
    private stats: Map<string, HealthStats> = new Map();
    private readonly MAX_CONSECUTIVE_FAILURES = 3;
    private readonly REVIVE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

    private initStat(provider: string): HealthStats {
        if (!this.stats.has(provider)) {
            this.stats.set(provider, {
                success: 0,
                errors: 0,
                timeouts: 0,
                lastChecked: Date.now(),
                isDead: false,
                consecutiveFailures: 0
            });
        }
        return this.stats.get(provider)!;
    }

    reportSuccess(provider: string) {
        const stat = this.initStat(provider);
        stat.success++;
        stat.consecutiveFailures = 0;
        stat.isDead = false;
        stat.lastChecked = Date.now();
    }

    reportError(provider: string, isTimeout = false) {
        const stat = this.initStat(provider);
        stat.errors++;
        if (isTimeout) stat.timeouts++;
        stat.consecutiveFailures++;
        
        if (stat.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
            stat.isDead = true;
            console.warn(`[Health Engine] Provider ${provider} marked as DEAD after ${stat.consecutiveFailures} consecutive failures.`);
        }
        stat.lastChecked = Date.now();
    }

    isHealthy(provider: string): boolean {
        const stat = this.stats.get(provider);
        if (!stat) return true; // Assume healthy until proven otherwise

        if (stat.isDead) {
            // Check if cooldown has passed
            const timeSinceLastCheck = Date.now() - stat.lastChecked;
            if (timeSinceLastCheck > this.REVIVE_COOLDOWN_MS) {
                console.log(`[Health Engine] Provider ${provider} cooldown expired. Reviving for a retry.`);
                stat.isDead = false;
                stat.consecutiveFailures = Math.max(0, stat.consecutiveFailures - 1);
                return true;
            }
            return false;
        }
        return true;
    }

    getHealthyProviders(providers: ProviderName[]): ProviderName[] {
        return providers.filter(p => this.isHealthy(p as string));
    }

    getStats() {
        return Object.fromEntries(this.stats);
    }
}

export const providerHealth = new ProviderHealthEngine();
