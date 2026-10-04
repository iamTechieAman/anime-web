import { NextRequest, NextResponse } from 'next/server';
import {
  getHomeCartoons,
  searchCartoons,
  getCartoonEpisodes,
  getStreamSource,
} from '@/lib/providers/kartoons';

/**
 * ============================================================================
 * Kartoons API Route Handler (Next.js App Router)
 * ============================================================================
 * Endpoint: /api/cartoon/kartoons
 *
 * Query Parameters:
 * - action=home                      -> Featured & latest catalog
 * - action=search&q={query}          -> Search cartoon titles
 * - action=episodes&id={showIdOrUrl} -> Fetch season/episode listing
 * - action=stream&episodeId={epId}   -> Fetch direct/embed video source
 * ============================================================================
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || (searchParams.get('q') ? 'search' : 'home');

    // 1. Home / Featured Cartoons
    if (action === 'home') {
      const data = await getHomeCartoons();
      return NextResponse.json({
        success: true,
        action: 'home',
        data,
      });
    }

    // 2. Search Cartoons
    if (action === 'search') {
      const query = searchParams.get('q') || searchParams.get('query');
      if (!query || query.trim().length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing required query parameter "q". Example: /api/cartoon/kartoons?action=search&q=avatar',
          },
          { status: 400 }
        );
      }

      const results = await searchCartoons(query);
      return NextResponse.json({
        success: true,
        action: 'search',
        query,
        count: results.length,
        data: results,
      });
    }

    // 3. Cartoon Details & Complete Episode Lists
    if (action === 'episodes' || action === 'details') {
      const idOrUrl = searchParams.get('id') || searchParams.get('url') || searchParams.get('slug');
      if (!idOrUrl) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing required parameter "id" or "url". Example: /api/cartoon/kartoons?action=episodes&id=6820fc40d1f9d64912f80c8d',
          },
          { status: 400 }
        );
      }

      const details = await getCartoonEpisodes(idOrUrl);
      return NextResponse.json({
        success: true,
        action: 'episodes',
        data: details,
      });
    }

    // 4. Stream Source (.m3u8 / embed player)
    if (action === 'stream' || action === 'source') {
      const episodeId = searchParams.get('episodeId') || searchParams.get('id');
      if (!episodeId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing required parameter "episodeId". Example: /api/cartoon/kartoons?action=stream&episodeId=68222dfe280f728bd7f0f380',
          },
          { status: 400 }
        );
      }

      const showId = searchParams.get('showId') || undefined;
      const seasonNumber = searchParams.get('season') ? Number(searchParams.get('season')) : undefined;
      const episodeNumber = searchParams.get('ep') ? Number(searchParams.get('ep')) : undefined;

      const stream = await getStreamSource(episodeId, {
        showId,
        seasonNumber,
        episodeNumber,
      });

      return NextResponse.json({
        success: true,
        action: 'stream',
        data: stream,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: `Invalid action "${action}". Supported actions: home, search, episodes, stream`,
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Kartoons API Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An unexpected error occurred while processing the request',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
