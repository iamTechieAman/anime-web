import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { CartoonCatalogModel } from "@/models/CartoonCatalog";
import { getStreamSource, KARTOONS_BASE_URL, KARTOONS_MIRRORS } from "@/lib/providers/kartoons";

/**
 * ============================================================================
 * Kartoons Embed Scraper API Route
 * ============================================================================
 * Endpoint: /api/scrape/kartoons
 * 
 * Query Parameters:
 * - showId / id  : Cartoon identifier or slug (e.g. "doraemon-hindi", "681c812b744a1cb77f1d1787")
 * - season / s   : Season number (default: 1)
 * - episode / e  : Episode number (default: 1)
 * - type         : Media type ("cartoon" | "show" | "movie" | "tv")
 * ============================================================================
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const showId = searchParams.get("showId") || searchParams.get("id");
    const seasonStr = searchParams.get("season") || searchParams.get("s") || "1";
    const episodeStr = searchParams.get("episode") || searchParams.get("e") || searchParams.get("ep") || "1";
    const type = (searchParams.get("type") || "show").toLowerCase();

    if (!showId) {
      return NextResponse.json(
        { 
          success: false, 
          code: "INVALID_PARAMETERS",
          error: "Missing required query parameter 'showId' or 'id'" 
        },
        { status: 400 }
      );
    }

    const seasonNum = parseInt(seasonStr, 10) || 1;
    const episodeNum = parseInt(episodeStr, 10) || 1;

    // DIAGNOSTIC 1: Content Type & Identifier Check
    // Kartoons Direct exclusively indexes cartoon and anime titles by custom IDs/slugs.
    // TMDB numeric IDs (e.g. 550, 1399) or non-cartoon types are not present in the Kartoons catalog.
    const isPureNumericTmdbId = /^\d{1,7}$/.test(showId.trim());
    if (type === "movie" || isPureNumericTmdbId) {
      return NextResponse.json({
        success: false,
        code: "UNSUPPORTED_CONTENT",
        unsupported: true,
        error: "Kartoons Direct only indexes cartoon & anime series with canonical slugs. Numeric TMDB identifiers are not supported by this provider.",
        provider: "kartoons",
        showId
      }, { status: 422 });
    }

    let resolvedEmbedUrl: string | null = null;
    let resolvedSourceType: 'hls' | 'embed' = 'embed';

    // STRATEGY 1: Check Local CartoonCatalog Database
    try {
      await connectToDatabase();
      const cartoon = await CartoonCatalogModel.findOne({
        $or: [
          { externalId: showId },
          { slug: showId },
          { _id: showId.match(/^[0-9a-fA-F]{24}$/) ? showId : null }
        ]
      }).lean();

      if (cartoon && cartoon.seasons) {
        const targetSeason = cartoon.seasons.find(
          (s: any) => s.seasonNumber === seasonNum || s.title?.includes(String(seasonNum))
        ) || cartoon.seasons[0];

        if (targetSeason?.episodes) {
          const targetEpisode = targetSeason.episodes.find(
            (ep: any) => ep.episodeNumber === episodeNum
          ) || targetSeason.episodes[0];

          if (targetEpisode) {
            // Check if episode has pre-scraped servers or stream link
            const firstServer = targetEpisode.servers?.[0];
            if (firstServer?.url) {
              resolvedEmbedUrl = firstServer.url;
              resolvedSourceType = firstServer.isM3U8 || firstServer.url.includes('.m3u8') ? 'hls' : 'embed';
            } else if (targetEpisode.episodeId) {
              // Try decrypting stream through Kartoons provider module
              try {
                const streamData = await getStreamSource(targetEpisode.episodeId, {
                  showId: cartoon.externalId || showId,
                  seasonNumber: seasonNum,
                  episodeNumber: episodeNum,
                });
                if (streamData?.sources?.[0]?.url) {
                  resolvedEmbedUrl = streamData.sources[0].url;
                  resolvedSourceType = streamData.sources[0].isM3U8 ? 'hls' : 'embed';
                } else if (streamData?.embedUrl) {
                  resolvedEmbedUrl = streamData.embedUrl;
                }
              } catch (providerErr: any) {
                console.warn(`[Kartoons API] getStreamSource error for ep ${targetEpisode.episodeId}:`, providerErr.message);
              }
            }
          }
        }
      }
    } catch (dbErr: any) {
      console.warn("[Kartoons API] Database catalog query skipped:", dbErr.message);
    }

    // STRATEGY 2: Legitimate Kartoons Player URL Builder
    if (!resolvedEmbedUrl) {
      // Build canonical Kartoons player URL
      resolvedEmbedUrl = `${KARTOONS_BASE_URL}/watch/show/${encodeURIComponent(showId)}/season/${seasonNum}/episode/${episodeNum}`;
    }

    // Return validated result
    if (resolvedEmbedUrl) {
      return NextResponse.json({
        success: true,
        embedUrl: resolvedEmbedUrl,
        streamUrl: resolvedEmbedUrl,
        sourceType: resolvedSourceType,
        type: resolvedSourceType,
        provider: "kartoons",
        showId,
        season: seasonNum,
        episode: episodeNum
      });
    }

    // DIAGNOSTIC 2: Graceful error response with actionable failure code
    return NextResponse.json({
      success: false,
      code: "EPISODE_NOT_FOUND",
      error: `Episode ${episodeNum} of Season ${seasonNum} was not found on Kartoons Direct.`,
      provider: "kartoons",
      showId
    }, { status: 404 });

  } catch (error: any) {
    console.error("[Kartoons Scraper API Error]:", error.message);
    return NextResponse.json({
      success: false,
      code: "PROVIDER_UNAVAILABLE",
      error: error.message || "Kartoons Direct upstream service temporarily unavailable",
      provider: "kartoons"
    }, { status: 502 });
  }
}
