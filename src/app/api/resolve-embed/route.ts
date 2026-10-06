import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

const USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
];

/**
 * ============================================================================
 * Universal Video Embed Resolver API Route
 * ============================================================================
 * Endpoint: /api/resolve-embed?url=https://...
 * 
 * Takes a full target website URL (e.g., Kartoons, HiAnime, or custom streaming site),
 * fetches the HTML server-side, extracts the underlying video embed iframe or m3u8 stream,
 * and returns ONLY the safe embed URL as a clean JSON response.
 * ============================================================================
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const targetUrl = searchParams.get("url");

        if (!targetUrl) {
            return NextResponse.json(
                { success: false, error: "Missing required 'url' query parameter" },
                { status: 400 }
            );
        }

        // Validate URL format
        let parsedTarget: URL;
        try {
            parsedTarget = new URL(targetUrl);
        } catch (_) {
            return NextResponse.json(
                { success: false, error: "Invalid URL provided" },
                { status: 400 }
            );
        }

        const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

        // Fetch full site HTML server-side
        const response = await axios.get(parsedTarget.toString(), {
            headers: {
                "User-Agent": userAgent,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": `${parsedTarget.origin}/`,
            },
            timeout: 10000,
            maxRedirects: 5,
        });

        if (!response.data || typeof response.data !== "string") {
            return NextResponse.json(
                { success: false, error: "Failed to retrieve valid HTML from target URL" },
                { status: 502 }
            );
        }

        const html = response.data;
        const $ = cheerio.load(html);
        let extractedEmbedUrl: string | null = null;

        // 1. Look for standard player iframe selectors
        $("iframe#player, iframe.player, iframe.embed-player, iframe[src*='embed'], iframe[src*='filemoon'], iframe[src*='stream'], iframe[src*='vidsrc'], iframe[src*='autoembed'], iframe[src*='player'], iframe[src]").each((_, el) => {
            if (extractedEmbedUrl) return;
            const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-player");
            if (src && !src.includes("about:blank") && !src.startsWith("javascript:") && !src.includes("googleads")) {
                extractedEmbedUrl = src;
            }
        });

        // 2. Check data-attributes on player container elements
        if (!extractedEmbedUrl) {
            $("[data-src], [data-embed], [data-player], [data-url], [data-link], [data-video]").each((_, el) => {
                if (extractedEmbedUrl) return;
                const val = $(el).attr("data-src") || $(el).attr("data-embed") || $(el).attr("data-player") || $(el).attr("data-url") || $(el).attr("data-link") || $(el).attr("data-video");
                if (val && (val.startsWith("http://") || val.startsWith("https://") || val.startsWith("//"))) {
                    extractedEmbedUrl = val;
                }
            });
        }

        // 3. Scan inline script tags for video embed or .m3u8 URLs via Regex
        if (!extractedEmbedUrl) {
            $("script").each((_, el) => {
                if (extractedEmbedUrl) return;
                const scriptText = $(el).html() || "";

                // Match iframe src or filemoon/vidcloud/streamwish embed links
                const embedMatch = scriptText.match(/https?:\/\/[^\s"'<>]+\/(?:e|embed|v|player|watch)\/[^\s"'<>]+/i) ||
                                  scriptText.match(/https?:\/\/(?:filemoon|vidcloud|streamwish|vidsrc|autoembed|peachify|vidlink|megacloud)[^\s"'<>]+/i) ||
                                  scriptText.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i);
                if (embedMatch) {
                    extractedEmbedUrl = embedMatch[0];
                }
            });
        }

        // 4. Normalize protocol-relative URLs (//example.com/embed)
        if (extractedEmbedUrl && typeof extractedEmbedUrl === "string") {
            let finalUrl: string = extractedEmbedUrl;
            if (finalUrl.startsWith("//")) {
                finalUrl = `https:${finalUrl}`;
            } else if (finalUrl.startsWith("/")) {
                finalUrl = `${parsedTarget.origin}${finalUrl}`;
            }

            return NextResponse.json({
                success: true,
                embedUrl: finalUrl,
                originHost: parsedTarget.hostname,
            });
        }

        return NextResponse.json({
            success: false,
            error: "Unable to locate video embed player link in page HTML",
        });

    } catch (error: any) {
        console.error("[Universal Embed Resolver Error]:", error.message);
        return NextResponse.json({
            success: false,
            error: error.message || "Failed to resolve embed URL from target site",
        }, { status: 500 });
    }
}
