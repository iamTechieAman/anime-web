import { NextRequest, NextResponse } from 'next/server';
import { kartoonsSyncWorker } from '@/lib/cron/kartoons-sync';

/**
 * ============================================================================
 * Kartoons Auto-Sync Cron Endpoint (Next.js App Router)
 * ============================================================================
 * POST or GET /api/cron/kartoons-sync
 *
 * Headers:
 * - Authorization: Bearer <CRON_SECRET> (optional if CRON_SECRET is set in env)
 *
 * Query Params:
 * - maxShows: Limit the number of shows to sync per run (default: 30)
 * - syncServers: If true, pre-resolves direct HLS servers for latest episodes
 * ============================================================================
 */

export async function GET(request: NextRequest) {
  return handleSync(request);
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}

async function handleSync(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  // Verify CRON_SECRET if configured in production
  if (cronSecret) {
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    if (token !== cronSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or missing CRON_SECRET' },
        { status: 401 }
      );
    }
  }

  const { searchParams } = new URL(request.url);
  const maxShows = searchParams.get('maxShows') ? parseInt(searchParams.get('maxShows')!, 10) : 25;
  const syncServers = searchParams.get('syncServers') === 'true';

  try {
    const report = await kartoonsSyncWorker.runSync({ maxShows, syncServers });
    return NextResponse.json({
      success: report.success,
      message: `Synchronized ${report.showsUpserted} shows from Kartoons.to in ${(report.durationMs / 1000).toFixed(1)}s`,
      report,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Catalog sync failed',
      },
      { status: 500 }
    );
  }
}
