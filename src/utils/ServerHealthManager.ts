"use client";

class ServerHealthManagerClass {
    private healthCache: Record<string, number> = {};
    private blacklist: Set<string> = new Set();
    private pendingChecks: Record<string, Promise<number>> = {};

    constructor() {
        if (typeof window !== "undefined") {
            try {
                const storedBlacklist = sessionStorage.getItem("toonplayer_dead_servers");
                if (storedBlacklist) {
                    this.blacklist = new Set(JSON.parse(storedBlacklist));
                }
            } catch (_) {}
        }
    }

    /**
     * Mark a server as dead globally
     */
    public blacklistServer(serverId: string) {
        if (!serverId) return;
        this.blacklist.add(serverId);
        this.healthCache[serverId] = Infinity; // Infinity latency
        console.warn(`[ServerHealthManager] 🚨 Server Blacklisted: ${serverId}`);
        
        if (typeof window !== "undefined") {
            sessionStorage.setItem("toonplayer_dead_servers", JSON.stringify(Array.from(this.blacklist)));
        }
    }

    /**
     * Check if a server is blacklisted
     */
    public isBlacklisted(serverId: string): boolean {
        return this.blacklist.has(serverId);
    }

    /**
     * Ping a server and cache its health latency
     */
    public async checkHealth(serverId: string, testUrl: string, timeoutMs: number = 3000): Promise<number> {
        if (this.isBlacklisted(serverId)) return Infinity;
        if (this.healthCache[serverId]) return this.healthCache[serverId];
        
        // Prevent concurrent identical checks
        if (this.pendingChecks[serverId]) {
            return this.pendingChecks[serverId];
        }

        const checkPromise = new Promise<number>((resolve) => {
            const start = Date.now();
            const controller = new AbortController();
            const timeout = setTimeout(() => {
                controller.abort();
                this.blacklistServer(serverId);
                resolve(Infinity);
            }, timeoutMs);

            fetch(testUrl, { method: "HEAD", signal: controller.signal, mode: "no-cors" })
                .then(() => {
                    clearTimeout(timeout);
                    const latency = Date.now() - start;
                    this.healthCache[serverId] = latency;
                    resolve(latency);
                })
                .catch(() => {
                    clearTimeout(timeout);
                    this.blacklistServer(serverId);
                    resolve(Infinity);
                });
        });

        this.pendingChecks[serverId] = checkPromise;
        const result = await checkPromise;
        delete this.pendingChecks[serverId];
        return result;
    }

    /**
     * Sorts and filters an array of servers, prioritizing healthy ones and dropping blacklisted ones.
     */
    public filterAndSortServers(servers: any[], idKey: string = 'serverId'): any[] {
        return servers
            .filter(s => !this.isBlacklisted(s[idKey]))
            .sort((a, b) => {
                const healthA = this.healthCache[a[idKey]] ?? 9999;
                const healthB = this.healthCache[b[idKey]] ?? 9999;
                return healthA - healthB;
            });
    }

    /**
     * Clear all caches (e.g. on forced refresh)
     */
    public clearCache() {
        this.healthCache = {};
        this.blacklist.clear();
        this.pendingChecks = {};
        if (typeof window !== "undefined") {
            sessionStorage.removeItem("toonplayer_dead_servers");
        }
        console.log(`[ServerHealthManager] 🧹 Cache cleared.`);
    }
}

// Export singleton instance
export const ServerHealthManager = new ServerHealthManagerClass();
