import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

const KARTOONS_MIRRORS = [
  "https://kartoons.to",
  "https://kartoons.co",
  "https://kartoons.net",
];

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
];

/**
 * ============================================================================
 * Kartoons Embed Scraper API Route
 * ============================================================================
 * Endpoint: /api/scrape/kartoons
 * 
 * Query Parameters:
 * - showId / id  : Show or movie identifier (e.g. 65733)
 * - season / s   : Season number (default: 1)
 * - episode / e  : Episode number (default: 1)
 * - type         : Media type ("show" | "movie" | "tv")
 * ============================================================================
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const showId = searchParams.get("showId") || searchParams.get("id");
    const season = searchParams.get("season") || searchParams.get("s") || "1";
    const episode = searchParams.get("episode") || searchParams.get("e") || searchParams.get("ep") || "1";
    const type = (searchParams.get("type") || "show").toLowerCase();

    if (!showId) {
      return NextResponse.json(
        { success: false, error: "Missing required query parameter 'showId' or 'id'" },
        { status: 400 }
      );
    }

    // Construct target paths
    const targetPaths: string[] = [];
    if (type === "movie") {
      targetPaths.push(`/watch/movie/${showId}`);
      targetPaths.push(`/movie/${showId}`);
    } else {
      targetPaths.push(`/watch/show/${showId}/season/${season}/episode/${episode}`);
      targetPaths.push(`/watch/cartoon/${showId}/season/${season}/episode/${episode}`);
      targetPaths.push(`/show/${showId}`);
    }

    let foundEmbedUrl: string | null = null;

    // Fetch server-side across Kartoons mirrors
    for (const mirror of KARTOONS_MIRRORS) {
      if (foundEmbedUrl) break;

      for (const path of targetPaths) {
        if (foundEmbedUrl) break;

        const targetUrl = `${mirror}${path}`;
        const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

        try {
          const response = await axios.get(targetUrl, {
            headers: {
              "User-Agent": userAgent,
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.9",
              "Referer": `${mirror}/`,
            },
            timeout: 8000,
          });

          if (!response.data || typeof response.data !== "string") continue;

          const html = response.data;
          const $ = cheerio.load(html);

          // Strategy 1: Locate player iframe element
          $("iframe#player, iframe.player, iframe[src*='embed'], iframe[src*='filemoon'], iframe[src*='stream'], iframe[src*='vidsrc'], iframe[src*='autoembed'], iframe[src]").each((_, el) => {
            if (foundEmbedUrl) return;
            const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-player");
            if (src && !src.includes("about:blank") && !src.startsWith("javascript:")) {
              foundEmbedUrl = src.startsWith("//") ? `https:${src}` : src;
            }
          });

          // Strategy 2: Check data attributes on container elements
          if (!foundEmbedUrl) {
            $("[data-src], [data-embed], [data-player], [data-url], [data-link]").each((_, el) => {
              if (foundEmbedUrl) return;
              const val = $(el).attr("data-src") || $(el).attr("data-embed") || $(el).attr("data-player") || $(el).attr("data-url") || $(el).attr("data-link");
              if (val && (val.startsWith("http://") || val.startsWith("https://") || val.startsWith("//"))) {
                foundEmbedUrl = val.startsWith("//") ? `https:${val}` : val;
              }
            });
          }

          // Strategy 3: Regex scan inline script tags for video embed URLs
          if (!foundEmbedUrl) {
            $("script").each((_, el) => {
              if (foundEmbedUrl) return;
              const scriptText = $(el).html() || "";
              const match = scriptText.match(/https?:\/\/[^\s"'<>]+\/(?:e|embed|v|player|watch)\/[^\s"'<>]+/i) ||
                            scriptText.match(/https?:\/\/(?:filemoon|vidcloud|streamwish|vidsrc|autoembed|peachify|vidlink)[^\s"'<>]+/i);
              if (match) {
                foundEmbedUrl = match[0];
              }
            });
          }
        } catch (err: any) {
          console.warn(`[Kartoons Scraper] Request to ${targetUrl} failed:`, err.message);
        }
      }
    }

    if (foundEmbedUrl) {
      return NextResponse.json({
        success: true,
        embedUrl: foundEmbedUrl,
      });
    }

    // Return graceful failure so frontend can fall back to alternative servers without crashing
    return NextResponse.json({
      success: false,
      error: "Unable to extract Kartoons embed URL",
    });

  } catch (error: any) {
    console.error("[Kartoons Scraper API Error]:", error.message);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to scrape Kartoons embed URL",
    });
  }
}
