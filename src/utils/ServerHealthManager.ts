"use client";

import { getCanonicalProviderId } from "@/lib/providers/registry";

export type ProviderHealthState =
    | 'unknown'
    | 'checking'
    | 'available'
    | 'temporarily_unavailable'
    | 'unsupported_content'
    | 'embedding_not_permitted'
    | 'rate_limited'
    | 'configuration_error';

export type FailureReason =
    | 'unsupported_content'      // Catalog miss, content not found, 404, or wrong media type
    | 'network_timeout'          // Ping or scraper fetch exceeded bounded timeout
    | 'origin_unreachable'       // 523, 502, 503, host down
    | 'embedding_rejected'       // X-Frame-Options SAMEORIGIN / CSP frame-ancestors block
    | 'rate_limited'             // 429 Too Many Requests
    | 'scraper_extraction_error' // Upstream scraper failed to locate media stream
    | 'invalid_response'         // Malformed or empty response from upstream
    | 'generic_failure';

export interface ProviderStateInfo {
    state: ProviderHealthState;
    reason?: FailureReason;
    details?: string;
    cooldownUntil?: number;
    failureCount: number;
    latencyMs?: number;
    updatedAt: number;
}

class ServerHealthManagerClass {
    private healthCache: Record<string, number> = {};
    private failureCooldowns: Record<string, number> = {};
    private pendingChecks: Record<string, Promise<number> | undefined> = {};
    
    // Per-provider detailed health state
    private providerStates: Record<string, ProviderStateInfo> = {};
    // Per-content failure tracking: contentKey -> Set of failed server IDs
    private contentFailures: Record<string, Set<string>> = {};
    // Per-server distinct failed content tracking: serverId -> Set of contentKeys
    private serverContentFailures: Record<string, Set<string>> = {};

    constructor() {}

    /**
     * Record a classified failure for a server.
     * Distinguishes per-title content misses from provider-wide infrastructure outages.
     */
    public recordFailure(
        serverId: string,
        reason: FailureReason = 'generic_failure',
        contentKey?: string,
        details?: string
    ) {
        if (!serverId) return;

        const canonicalId = getCanonicalProviderId(serverId);
        const idsToUpdate = new Set<string>([serverId]);
        if (canonicalId) idsToUpdate.add(canonicalId);

        const now = Date.now();
        const prev = this.providerStates[serverId] || {
            state: 'unknown',
            failureCount: 0,
            updatedAt: now
        };

        const newFailureCount = prev.failureCount + 1;

        // Track per-content failure across raw ID and canonical ID
        if (contentKey) {
            if (!this.contentFailures[contentKey]) {
                this.contentFailures[contentKey] = new Set();
            }
            idsToUpdate.forEach(id => {
                this.contentFailures[contentKey].add(id);
                if (!this.serverContentFailures[id]) {
                    this.serverContentFailures[id] = new Set();
                }
                this.serverContentFailures[id].add(contentKey);
            });
        }

        let state: ProviderHealthState = 'temporarily_unavailable';
        let cooldownMs = 30000;

        switch (reason) {
            case 'unsupported_content':
                // Per-title unsupported content does NOT disable the server for other titles!
                state = 'unsupported_content';
                cooldownMs = 0; // No global server cooldown
                console.info(`[ServerHealthManager] ℹ️ Server "${serverId}" marked unsupported for content "${contentKey || 'current'}" (other titles unaffected).`);
                break;

            case 'embedding_rejected':
                state = 'embedding_not_permitted';
                cooldownMs = 300000; // 5 minutes cooldown for framing rejections
                console.warn(`[ServerHealthManager] 🚫 Server "${serverId}" rejected iframe embedding (X-Frame-Options/CSP). Cooldown: ${cooldownMs}ms`);
                break;

            case 'rate_limited':
                state = 'rate_limited';
                cooldownMs = 60000; // 1 minute backoff for rate limits
                console.warn(`[ServerHealthManager] ⏳ Server "${serverId}" rate-limited. Backing off for ${cooldownMs}ms.`);
                break;

            case 'origin_unreachable':
                state = 'temporarily_unavailable';
                cooldownMs = 90000; // 90 seconds for 523/502 origin down
                console.warn(`[ServerHealthManager] 🔌 Server "${serverId}" origin unreachable (HTTP 502/523). Cooldown: ${cooldownMs}ms`);
                break;

            case 'network_timeout':
            case 'scraper_extraction_error':
            case 'generic_failure':
            default:
                // Exponential backoff capped at 60s
                cooldownMs = Math.min(60000, 15000 * Math.pow(1.5, Math.min(4, newFailureCount - 1)));
                state = 'temporarily_unavailable';
                console.warn(`[ServerHealthManager] ⚠️ Server "${serverId}" transient failure (#${newFailureCount}): ${reason}. Cooldown: ${cooldownMs}ms`);
                break;
        }

        // Apply global server cooldown ONLY if this is a global failure OR the server failed on >= 3 distinct titles
        const distinctContentFails = this.serverContentFailures[serverId]?.size || 0;
        const isGlobalOutage = reason !== 'unsupported_content' || distinctContentFails >= 3;

        if (isGlobalOutage && cooldownMs > 0) {
            this.failureCooldowns[serverId] = now + cooldownMs;
            this.healthCache[serverId] = 9000 + Math.min(999, cooldownMs / 100);
        }

        this.providerStates[serverId] = {
            state: isGlobalOutage ? state : 'available',
            reason,
            details,
            cooldownUntil: isGlobalOutage ? now + cooldownMs : undefined,
            failureCount: newFailureCount,
            updatedAt: now
        };
    }

    /**
     * Record a successful response or playback initialization
     */
    public recordSuccess(serverId: string, contentKey?: string, latencyMs?: number) {
        if (!serverId) return;

        const canonicalId = getCanonicalProviderId(serverId);
        const idsToUpdate = [serverId];
        if (canonicalId && canonicalId !== serverId) idsToUpdate.push(canonicalId);

        const now = Date.now();
        if (contentKey && this.contentFailures[contentKey]) {
            idsToUpdate.forEach(id => this.contentFailures[contentKey].delete(id));
        }

        idsToUpdate.forEach(id => {
            delete this.failureCooldowns[id];
            const latency = latencyMs !== undefined ? latencyMs : 250;
            this.healthCache[id] = latency;

            this.providerStates[id] = {
                state: 'available',
                failureCount: 0,
                latencyMs: latency,
                updatedAt: now
            };
        });
    }

    /**
     * Check if a server is available for playback (globally and optionally for specific content)
     */
    public isAvailable(serverId: string, contentKey?: string): boolean {
        if (!serverId) return false;

        const canonicalId = getCanonicalProviderId(serverId);

        // 1. Check content-specific failure (check both raw ID and canonical ID)
        if (contentKey && (this.contentFailures[contentKey]?.has(serverId) || (canonicalId && this.contentFailures[contentKey]?.has(canonicalId)))) {
            return false;
        }

        // 2. Check global failure cooldown
        const cooldownUntil = this.failureCooldowns[serverId] || (canonicalId ? this.failureCooldowns[canonicalId] : undefined);
        if (cooldownUntil) {
            if (Date.now() < cooldownUntil) {
                return false;
            }
            // Cooldown expired — grant temporary recovery check
            delete this.failureCooldowns[serverId];
            if (canonicalId) delete this.failureCooldowns[canonicalId];
            if (this.providerStates[serverId]) {
                this.providerStates[serverId].state = 'unknown';
            }
            if (canonicalId && this.providerStates[canonicalId]) {
                this.providerStates[canonicalId].state = 'unknown';
            }
        }

        return true;
    }

    /**
     * Backward-compatible alias for failure cooldown
     */
    public markTemporaryFailure(serverId: string, cooldownMs: number = 30000, contentKey?: string) {
        if (!serverId) return;
        this.recordFailure(serverId, 'generic_failure', contentKey);
        if (cooldownMs > 0) {
            this.failureCooldowns[serverId] = Date.now() + cooldownMs;
        }
    }

    /**
     * Backward-compatible alias for temporary failure handling
     */
    public blacklistServer(serverId: string, contentKey?: string) {
        this.recordFailure(serverId, 'generic_failure', contentKey);
    }

    /**
     * Backward-compatible check if a server is currently in active failure cooldown
     */
    public isBlacklisted(serverId: string, contentKey?: string): boolean {
        return !this.isAvailable(serverId, contentKey);
    }

    /**
     * Get the current detailed state of a provider
     */
    public getProviderState(serverId: string, contentKey?: string): ProviderHealthState {
        if (!serverId) return 'unknown';
        if (contentKey && this.contentFailures[contentKey]?.has(serverId)) {
            return 'unsupported_content';
        }
        const stateInfo = this.providerStates[serverId];
        if (!this.isAvailable(serverId)) {
            return stateInfo?.state || 'temporarily_unavailable';
        }
        return stateInfo?.state || 'available';
    }

    /**
     * Ping a server and cache its health latency with strict bounded timeout
     */
    public async checkHealth(serverId: string, testUrl: string, timeoutMs: number = 3000): Promise<number> {
        if (!this.isAvailable(serverId)) return 9999;
        if (this.healthCache[serverId] && this.healthCache[serverId] < 5000) return this.healthCache[serverId];

        // Prevent concurrent duplicate checks
        if (this.pendingChecks[serverId]) {
            return this.pendingChecks[serverId]!;
        }

        const checkPromise = new Promise<number>((resolve) => {
            const start = Date.now();
            const controller = new AbortController();
            const timeout = setTimeout(() => {
                controller.abort();
                this.recordFailure(serverId, 'network_timeout');
                resolve(9999);
            }, timeoutMs);

            fetch(testUrl, { method: "HEAD", signal: controller.signal, mode: "no-cors" })
                .then(() => {
                    clearTimeout(timeout);
                    const latency = Date.now() - start;
                    this.recordSuccess(serverId, undefined, latency);
                    resolve(latency);
                })
                .catch((err) => {
                    clearTimeout(timeout);
                    const reason: FailureReason = err.name === 'AbortError' ? 'network_timeout' : 'origin_unreachable';
                    this.recordFailure(serverId, reason);
                    resolve(9999);
                });
        });

        this.pendingChecks[serverId] = checkPromise;
        const result = await checkPromise;
        delete this.pendingChecks[serverId];
        return result;
    }

    /**
     * Sorts and filters an array of servers, prioritizing healthy ones over degraded or content-failed ones.
     */
    public filterAndSortServers(servers: any[], idKey: string = 'serverId', contentKey?: string): any[] {
        if (!Array.isArray(servers)) return [];
        return [...servers].sort((a, b) => {
            const idA = a[idKey] || a.id;
            const idB = b[idKey] || b.id;

            const isAvailableA = this.isAvailable(idA, contentKey);
            const isAvailableB = this.isAvailable(idB, contentKey);

            if (isAvailableA !== isAvailableB) {
                return isAvailableA ? -1 : 1;
            }

            const healthA = this.healthCache[idA] ?? 500;
            const healthB = this.healthCache[idB] ?? 500;
            return healthA - healthB;
        });
    }

    /**
     * Clear all caches (e.g. on full user navigation or manual reset)
     */
    public clearCache() {
        this.healthCache = {};
        this.failureCooldowns = {};
        this.pendingChecks = {};
        this.providerStates = {};
        this.contentFailures = {};
        this.serverContentFailures = {};
        console.log(`[ServerHealthManager] 🧹 Health cache reset.`);
    }
}

// Export singleton instance
export const ServerHealthManager = new ServerHealthManagerClass();
