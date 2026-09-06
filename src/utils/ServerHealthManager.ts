"use client";

class ServerHealthManagerClass {
    private healthCache: Record<string, number> = {};
    private failureCooldowns: Record<string, number> = {};
    private pendingChecks: Record<string, Promise<number>> = {};

    constructor() {}

    /**
     * Mark a server with a temporary failure cooldown (e.g., rotation on current title)
     */
    public markTemporaryFailure(serverId: string, cooldownMs: number = 30000) {
        if (!serverId) return;
        this.failureCooldowns[serverId] = Date.now() + cooldownMs;
        this.healthCache[serverId] = 9000 + Math.min(999, cooldownMs / 100);
        console.warn(`[ServerHealthManager] ⚠️ Server marked with temporary failure cooldown (${cooldownMs}ms): ${serverId}`);
    }

    /**
     * Backward compatible alias for temporary failure handling
     */
    public blacklistServer(serverId: string) {
        this.markTemporaryFailure(serverId, 45000);
    }

    /**
     * Check if a server is currently in active failure cooldown
     */
    public isBlacklisted(serverId: string): boolean {
        if (!serverId) return false;
        const cooldownUntil = this.failureCooldowns[serverId];
        if (cooldownUntil && Date.now() < cooldownUntil) {
            return true;
        }
        // Cooldown expired
        if (cooldownUntil) {
            delete this.failureCooldowns[serverId];
        }
        return false;
    }

    /**
     * Ping a server and cache its health latency
     */
    public async checkHealth(serverId: string, testUrl: string, timeoutMs: number = 3000): Promise<number> {
        if (this.isBlacklisted(serverId)) return 9999;
        if (this.healthCache[serverId] && this.healthCache[serverId] < 5000) return this.healthCache[serverId];

        // Prevent concurrent identical checks
        if (this.pendingChecks[serverId]) {
            return this.pendingChecks[serverId];
        }

        const checkPromise = new Promise<number>((resolve) => {
            const start = Date.now();
            const controller = new AbortController();
            const timeout = setTimeout(() => {
                controller.abort();
                this.markTemporaryFailure(serverId, 20000);
                resolve(9999);
            }, timeoutMs);

            fetch(testUrl, { method: "HEAD", signal: controller.signal, mode: "no-cors" })
                .then(() => {
                    clearTimeout(timeout);
                    const latency = Date.now() - start;
                    this.healthCache[serverId] = latency;
                    delete this.failureCooldowns[serverId];
                    resolve(latency);
                })
                .catch(() => {
                    clearTimeout(timeout);
                    this.markTemporaryFailure(serverId, 20000);
                    resolve(9999);
                });
        });

        this.pendingChecks[serverId] = checkPromise;
        const result = await checkPromise;
        delete this.pendingChecks[serverId];
        return result;
    }

    /**
     * Sorts and filters an array of servers, prioritizing healthy ones over degraded ones.
     */
    public filterAndSortServers(servers: any[], idKey: string = 'serverId'): any[] {
        if (!Array.isArray(servers)) return [];
        return [...servers].sort((a, b) => {
            const isBlockedA = this.isBlacklisted(a[idKey]);
            const isBlockedB = this.isBlacklisted(b[idKey]);
            if (isBlockedA !== isBlockedB) {
                return isBlockedA ? 1 : -1;
            }
            const healthA = this.healthCache[a[idKey]] ?? 500;
            const healthB = this.healthCache[b[idKey]] ?? 500;
            return healthA - healthB;
        });
    }

    /**
     * Clear all caches (e.g. on user navigation or refresh)
     */
    public clearCache() {
        this.healthCache = {};
        this.failureCooldowns = {};
        this.pendingChecks = {};
        console.log(`[ServerHealthManager] 🧹 Health cache reset.`);
    }
}

// Export singleton instance
export const ServerHealthManager = new ServerHealthManagerClass();

