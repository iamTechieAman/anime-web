import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const targetUrl = searchParams.get("url");

    if (!targetUrl) {
        return new NextResponse("Missing url parameter", { status: 400 });
    }

    try {
        const headers = new Headers();
        headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0");
        headers.set("Referer", "https://allmanga.to");

        const range = request.headers.get("range");
        if (range) {
            headers.set("Range", range);
        }

        const response = await fetch(targetUrl, {
            headers: headers,
            method: "GET",
        });

        if (!response.ok) {
            return new NextResponse(`Proxy Error: ${response.statusText}`, { status: response.status });
        }

        const contentType = response.headers.get("Content-Type") || "";

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
            "Content-Length",
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
        return new NextResponse("Proxy Error: " + error.message, { status: 500 });
    }
}
