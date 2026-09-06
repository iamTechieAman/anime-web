import { NextRequest, NextResponse } from "next/server";
import { getUA } from "@/lib/user-agents";
import { isSafeExternalUrl } from "@/lib/sanitizer";

// Domain-to-Referer lookup for anime CDNs
const CDN_REFERERS: Record<string, string> = {
    'megacloud.tv': 'https://hianime.lol',
    'mega.nz': 'https://hianime.lol',
    'rapid-cloud.co': 'https://zoro.to',
    'rabbitstream.net': 'https://zoro.to',
    'allanime.day': 'https://allmanga.to',
    'gogocdn.net': 'https://gogoanime.hu',
    'playtaku.net': 'https://gogoanime.hu',
    'vidstreaming.io': 'https://gogoanime.hu',
    'anime-taku.net': 'https://hianime.lol',
    'vidlink.pro': 'https://vidlink.pro',
    'vidsrc.to': 'https://vidsrc.to',
    'vidsrc.pro': 'https://vidsrc.pro',
    'vidsrc.me': 'https://vidsrc.me',
    'embed.su': 'https://embed.su',
    'autoembed.co': 'https://autoembed.co',
    'cineby.pro': 'https://cineby.pro',
    'nontongo.win': 'https://nontongo.win',
    'peachify.top': 'https://peachify.top',
    'vidfast.pro': 'https://vidfast.pro',
    'multiembed.mov': 'https://multiembed.mov',
    'youtube-anime.com': 'https://allmanga.to',
    'animepahe.ru': 'https://animepahe.ru',
    'kwik.si': 'https://animepahe.ru',
    'files.cache.luluvdo.com': 'https://hianime.lol',
};

function getReferer(url: string, override?: string | null): string {
    if (override) return override;
    try {
        const parsed = new URL(url);
        const host = parsed.hostname;
        for (const [domain, ref] of Object.entries(CDN_REFERERS)) {
            if (host.includes(domain)) return ref;
        }
        return parsed.origin;
    } catch (_) {}
    return 'https://allmanga.to';
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const targetUrl = searchParams.get("url");
    const refererOverride = searchParams.get("referer");

    if (!targetUrl) {
        return new NextResponse("Missing url parameter", { status: 400 });
    }

    if (!isSafeExternalUrl(targetUrl)) {
        return new NextResponse("Invalid or forbidden target URL", { status: 400 });
    }

    try {
        let response = null;
        let lastError = null;
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const referer = getReferer(targetUrl, refererOverride);
                const headers = new Headers();
                headers.set("User-Agent", attempt === 0 ? getUA() : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
                headers.set("Referer", referer);
                headers.set("Origin", referer);
                headers.set("Accept", "*/*");
                headers.set("Accept-Language", "en-US,en;q=0.9");
                headers.set("Accept-Encoding", "identity");

                const range = request.headers.get("range");
                if (range) {
                    headers.set("Range", range);
                }

                response = await fetch(targetUrl, {
                    headers: headers,
                    method: "GET",
                });
                if (response.ok) break;
            } catch (err: any) {
                lastError = err;
                if (attempt === 1) throw err;
                await new Promise(r => setTimeout(r, 500));
            }
        }

        if (!response || !response.ok) {
            const statusText = response?.statusText || "Upstream Error";
            return new NextResponse(`Proxy Error: ${statusText}`, { status: response?.status || 502 });
        }

        const contentType = response.headers.get("Content-Type") || "";

        // Handle CSS rewriting to bypass CORS on sub-resources (fonts, images)
        if (contentType.includes("text/css") || targetUrl.includes(".css")) {
            let cssText = await response.text();
            const cssBaseUrl = new URL(targetUrl);

            // Rewrite url(...) references so they go through this proxy
            cssText = cssText.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (match, quote, urlVal) => {
                const trimmedUrl = urlVal.trim();
                // Skip data URIs, blob, etc.
                if (trimmedUrl.startsWith('data:') || trimmedUrl.startsWith('blob:') || trimmedUrl.startsWith('javascript:')) {
                    return match;
                }
                
                // Do not rewrite already proxied URLs
                if (trimmedUrl.includes('/api/proxy')) {
                    return match;
                }

                try {
                    // Resolve relative URLs using the CSS file's URL as base
                    const resolved = new URL(trimmedUrl, targetUrl).toString();
                    return `url(${quote}${request.nextUrl.origin}/api/proxy?url=${encodeURIComponent(resolved)}&referer=${encodeURIComponent(cssBaseUrl.origin)}${quote})`;
                } catch (_) {
                    return match;
                }
            });

            const responseHeaders = new Headers();
            responseHeaders.set("Content-Type", "text/css; charset=utf-8");
            responseHeaders.set("Access-Control-Allow-Origin", "*");
            responseHeaders.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=60");

            return new NextResponse(cssText, {
                status: response.status,
                headers: responseHeaders,
            });
        }

        // Handle m3u8 rewriting for HLS streams
        // If the content is an m3u8 playlist, we must rewrite the segment URLs inside it
        // so that they ALSO go through this proxy.
        if (contentType.includes("application/vnd.apple.mpegurl") ||
            contentType.includes("application/x-mpegurl") ||
            (targetUrl.includes(".m3u8") && !contentType.includes("video/mp2t"))) { // avoid mistaking ts for m3u8 if headers wrong

            const text = await response.text();
            const baseUrl = new URL(targetUrl);
            // Base path for resolving relative URLs
            const basePath = baseUrl.origin + baseUrl.pathname.substring(0, baseUrl.pathname.lastIndexOf("/") + 1);

            const lines = text.split("\n");
            const modifiedLines = lines.map(line => {
                // Check if the line contains a URI attribute (common in EXT-X-MEDIA, EXT-X-I-FRAME-STREAM-INF, EXT-X-KEY)
                const uriMatch = line.match(/URI="([^"]+)"/);
                if (uriMatch && (line.includes("#EXT-X-I-FRAME-STREAM-INF") || line.includes("#EXT-X-MEDIA") || line.includes("#EXT-X-KEY"))) {
                    const originalUri = uriMatch[1];
                    let absoluteUri = originalUri;
                    if (!originalUri.startsWith("http")) {
                        try {
                            absoluteUri = new URL(originalUri, basePath).toString();
                        } catch (e) { }
                    }
                    const proxiedUri = `${request.nextUrl.origin}/api/proxy?url=${encodeURIComponent(absoluteUri)}`;
                    return line.replace(originalUri, proxiedUri);
                }

                // Skip comments and other tags
                if (!line.trim() || line.trim().startsWith("#")) {
                    return line;
                }

                // It's a URL (relative or absolute)
                let fullUrl = line.trim();

                // If it's relative, make it absolute
                if (!fullUrl.startsWith("http")) {
                    try {
                        fullUrl = new URL(fullUrl, basePath).toString();
                    } catch (e) {
                        // if fails, leave it (rare)
                    }
                }

                // Proxy it
                return `${request.nextUrl.origin}/api/proxy?url=${encodeURIComponent(fullUrl)}`;
            });

            const modifiedText = modifiedLines.join("\n");

            const responseHeaders = new Headers();
            responseHeaders.set("Content-Type", contentType);
            responseHeaders.set("Access-Control-Allow-Origin", "*");
            responseHeaders.set("Cache-Control", "public, max-age=300"); // 5min cache for playlists
            responseHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
            responseHeaders.set("Access-Control-Allow-Headers", "Range");

            return new NextResponse(modifiedText, {
                status: response.status,
                headers: responseHeaders,
            });
        }

        // Binary / Video stream pass-through (MP4, TS, etc.)
        const responseHeaders = new Headers();
        responseHeaders.set("Access-Control-Allow-Origin", "*");

        const copyHeaders = [
            "Content-Type",
            "Content-Range",
            "Accept-Ranges",
            "Last-Modified",
            "ETag"
        ];

        copyHeaders.forEach(header => {
            const value = response.headers.get(header);
            if (value) responseHeaders.set(header, value);
        });

        // Cache video segments for 1 hour
        if (contentType.includes("video") || targetUrl.includes(".ts")) {
            responseHeaders.set("Cache-Control", "public, max-age=3600, immutable");
        }


        return new NextResponse(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
        });

    } catch (error: any) {
        console.error("[Proxy] Error:", error);
        return new NextResponse("Proxy Error: Failed to fetch requested resource", { status: 500 });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Range, Authorization, Accept, Accept-Language",
        },
    });
}
