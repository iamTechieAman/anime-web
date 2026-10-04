import { kartoonsScraper, ScrapedShowItem } from '@/lib/scrapers/kartoons-engine';
import { scraperCache, SCRAPER_TTL } from '@/lib/cache/scraper-cache';
import connectToDatabase from '@/lib/db';
import { CartoonCatalogModel } from '@/models/CartoonCatalog';

/**
 * ============================================================================
 * Kartoons Auto-Sync Cron Job & Data Pipeline Worker
 * ============================================================================
 * Automated sync worker that:
 * 1. Fetches featured catalog & newly released episodes from Kartoons.to.
 * 2. Compares against MongoDB to identify new or changed titles.
 * 3. Scrapes full season trees and multi-server embed targets.
 * 4. Upserts to MongoDB and warms the in-memory/Redis cache.
 * 5. Can be run via:
 *    - Next.js Scheduled API Route (Vercel Cron / Cloudflare Worker / cron-job.org)
 *    - In-Process Timer (Node.js daemon)
 *    - Standalone CLI execution (`npx tsx scripts/sync-kartoons.ts`)
 * ============================================================================
 */

export interface SyncReport {
  success: boolean;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  featuredScanned: number;
  latestUpdatesScanned: number;
  showsUpserted: number;
  errors: string[];
}

export class KartoonsSyncWorker {
  private isRunning = false;

  /**
   * Main sync workflow
   */
  async runSync(options: { maxShows?: number; syncServers?: boolean } = {}): Promise<SyncReport> {
    if (this.isRunning) {
      console.warn('[KartoonsSync] A sync job is already in progress. Skipping concurrent run.');
      return {
        success: false,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 0,
        featuredScanned: 0,
        latestUpdatesScanned: 0,
        showsUpserted: 0,
        errors: ['Job already running'],
      };
    }

    this.isRunning = true;
    const startTime = Date.now();
    const startedAt = new Date().toISOString();
    const errors: string[] = [];
    let showsUpserted = 0;

    console.log(`[KartoonsSync] 🚀 Starting catalog sync at ${startedAt}...`);

    try {
      // Connect to Database
      await connectToDatabase();

      // Step 1: Scrape Featured Shows & Movies
      console.log('[KartoonsSync] 1/4 Fetching featured catalog...');
      const featured = await kartoonsScraper.getFeaturedCatalog();
      const featuredShows = featured.featuredShows || [];
      const featuredMovies = featured.featuredMovies || [];
      const candidateList: Array<{ id: string; type: 'show' | 'movie' }> = [
        ...featuredShows.map((s) => ({ id: s.id, type: 'show' as const })),
        ...featuredMovies.map((m) => ({ id: m.id, type: 'movie' as const })),
      ];

      // Step 2: Scrape Latest Episode Updates
      console.log('[KartoonsSync] 2/4 Checking latest released episodes...');
      const latestUpdates = await kartoonsScraper.getLatestEpisodes();
      latestUpdates.forEach((up) => {
        if (up.showId && !candidateList.some((c) => c.id === up.showId)) {
          candidateList.push({ id: up.showId, type: 'show' });
        }
      });

      console.log(
        `[KartoonsSync] Discovered ${candidateList.length} candidate shows/movies to synchronize.`
      );

      // Limit candidates if specified
      const targetList = options.maxShows
        ? candidateList.slice(0, options.maxShows)
        : candidateList.slice(0, 30); // Default to top 30 active shows to respect rate limits

      // Step 3: Fetch Full Season/Episode Details & Upsert into Database
      console.log(`[KartoonsSync] 3/4 Extracting seasons and multi-server links for ${targetList.length} titles...`);

      for (const item of targetList) {
        try {
          // Delay between show scrapes to be respectful and prevent anti-bot bans
          await new Promise((r) => setTimeout(r, 800));

          if (item.type === 'show') {
            const fullShow = await kartoonsScraper.getShowDetails(item.id);

            // Optionally pre-resolve direct server stream links for the 3 most recent episodes
            if (options.syncServers) {
              const latestSeason = fullShow.seasons[fullShow.seasons.length - 1];
              if (latestSeason && latestSeason.episodes.length > 0) {
                const sampleEps = latestSeason.episodes.slice(-2);
                for (const ep of sampleEps) {
                  const resolvedServers = await kartoonsScraper.resolveEpisodeServers(ep.episodeId, {
                    showId: fullShow.id,
                    seasonNumber: latestSeason.seasonNumber,
                    episodeNumber: ep.episodeNumber,
                  });
                  if (resolvedServers.length > 0) {
                    ep.servers = resolvedServers;
                  }
                }
              }
            }

            const saved = await kartoonsScraper.upsertToDatabase(fullShow);
            if (saved) {
              showsUpserted++;
              console.log(`[KartoonsSync]  Synced: "${fullShow.title}" (${fullShow.totalEpisodes} eps)`);
            }
          }
        } catch (err: any) {
          const errMsg = `Failed to sync item ${item.id}: ${err.message}`;
          console.error(`[KartoonsSync] ⚠️ ${errMsg}`);
          errors.push(errMsg);
        }
      }

      // Step 4: Warm Caches with Synchronized DB Catalog
      console.log('[KartoonsSync] 4/4 Refreshing catalog cache with fresh data...');
      try {
        const topCatalog = await CartoonCatalogModel.find({})
          .sort({ updatedAt: -1 })
          .limit(40)
          .lean();

        if (topCatalog.length > 0) {
          await scraperCache.set('kartoons:db:recent_catalog', topCatalog, SCRAPER_TTL.HOME_CATALOG);
        }
      } catch (cacheErr: any) {
        console.warn('[KartoonsSync] Cache refresh notice:', cacheErr.message);
      }

      const completedAt = new Date().toISOString();
      const durationMs = Date.now() - startTime;

      console.log(
        `[KartoonsSync]  Sync finished in ${(durationMs / 1000).toFixed(1)}s. ${showsUpserted} shows upserted.`
      );

      return {
        success: true,
        startedAt,
        completedAt,
        durationMs,
        featuredScanned: candidateList.length,
        latestUpdatesScanned: latestUpdates.length,
        showsUpserted,
        errors,
      };
    } catch (criticalErr: any) {
      console.error('[KartoonsSync]  Critical sync worker failure:', criticalErr);
      errors.push(criticalErr.message);

      return {
        success: false,
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        featuredScanned: 0,
        latestUpdatesScanned: 0,
        showsUpserted,
        errors,
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Starts a persistent recurring background timer (every 6 or 12 hours)
   */
  startRecurringScheduler(intervalHours = 6): () => void {
    const intervalMs = intervalHours * 60 * 60 * 1000;
    console.log(`[KartoonsSync] Initializing auto-sync scheduler every ${intervalHours} hours.`);

    // Run first sync shortly after startup (10 seconds delay)
    const initialTimer = setTimeout(() => {
      this.runSync().catch((e) => console.error('[KartoonsSync] Initial run error:', e));
    }, 10000);

    // Recurring interval
    const recurringInterval = setInterval(() => {
      this.runSync().catch((e) => console.error('[KartoonsSync] Recurring run error:', e));
    }, intervalMs);

    // Prevent process hanging on test/exit
    if (typeof recurringInterval.unref === 'function') {
      recurringInterval.unref();
      initialTimer.unref();
    }

    // Return cleanup stopper
    return () => {
      clearTimeout(initialTimer);
      clearInterval(recurringInterval);
      console.log('[KartoonsSync] Auto-sync scheduler stopped.');
    };
  }
}

// Global Singleton Sync Worker
export const kartoonsSyncWorker = new KartoonsSyncWorker();
