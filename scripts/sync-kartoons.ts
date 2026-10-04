/**
 * ============================================================================
 * Kartoons Scraper CLI Runner
 * ============================================================================
 * Usage:
 *   npx tsx scripts/sync-kartoons.ts
 *   npx tsx scripts/sync-kartoons.ts --daemon --interval=6
 *   npx tsx scripts/sync-kartoons.ts --limit=10 --servers
 * ============================================================================
 */

import { kartoonsSyncWorker } from '../src/lib/cron/kartoons-sync';

async function main() {
  const args = process.argv.slice(2);
  const isDaemon = args.includes('--daemon');
  const syncServers = args.includes('--servers');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const intervalArg = args.find((a) => a.startsWith('--interval='));

  const maxShows = limitArg ? parseInt(limitArg.split('=')[1], 10) : 30;
  const intervalHours = intervalArg ? parseInt(intervalArg.split('=')[1], 10) : 6;

  console.log('----------------------------------------------------');
  console.log('🎬 Kartoons.to Catalog Scraper & Sync Engine');
  console.log('----------------------------------------------------');

  if (isDaemon) {
    console.log(`Starting continuous daemon worker (interval: ${intervalHours}h)...`);
    kartoonsSyncWorker.startRecurringScheduler(intervalHours);
    // Keep alive
    process.stdin.resume();
  } else {
    console.log(`Running one-shot catalog sync (limit: ${maxShows}, syncServers: ${syncServers})...`);
    const report = await kartoonsSyncWorker.runSync({ maxShows, syncServers });
    console.log('----------------------------------------------------');
    console.log('Sync Result Summary:', JSON.stringify(report, null, 2));
    process.exit(report.success ? 0 : 1);
  }
}

main().catch((err) => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
