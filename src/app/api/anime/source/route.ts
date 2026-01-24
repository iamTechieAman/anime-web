import { NextResponse } from "next/server";
import { getProvider, type ProviderName } from "@/lib/providers";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const showId = searchParams.get("id");
    const episodeString = searchParams.get("ep");
    const mode = (searchParams.get("mode") || "sub") as "sub" | "dub" | "raw";
    const providerParam = searchParams.get("provider") as ProviderName;

    console.log(`[SourceAPI] Requesting: ID=${showId}, Ep=${episodeString}, Mode=${mode}`);

    if (!showId || !episodeString) {
        return NextResponse.json(
            { error: "Show ID and Episode Number are required" },
            { status: 400 }
        );
    }

    // Heuristic detection: HiAnime IDs usually end with hyphen+number (e.g. one-piece-100)
    const isHiAnimeId = /-[0-9]+$/.test(showId);
    const defaultProvider = isHiAnimeId ? "hianime" : "allanime";
    const providerName = providerParam || defaultProvider;

    try {
        const provider = getProvider(providerName);
        console.log(`[SourceAPI] Using provider: ${providerName}`);

        const sources = await provider.getSources(showId, episodeString, mode);

        if (!sources || sources.length === 0) {
            return NextResponse.json({
                error: `No ${mode.toUpperCase()} sources available. Try switching mode.`,
            }, { status: 404 });
        }

        // Transform sources to internal format expected by frontend
        // Frontend expects "links" array with { link, hls, resolutionStr }
        // Use proxy ONLY for URLs that need CORS bypass (SharePoint, GDrive)
        const links = sources.map(s => {
            // Check if URL needs proxy for CORS
            const needsProxy = s.url.includes('sharepoint.com') ||
                s.url.includes('drive.google.com') ||
                s.url.includes('googleapis.com');

            const finalUrl = needsProxy && s.url.startsWith('http')
                ? `/api/proxy?url=${encodeURIComponent(s.url)}`
                : s.url;

            return {
                link: finalUrl,
                hls: s.isM3U8,
                resolutionStr: s.quality || "default",
                fromCache: new Date().toISOString()
            };
        });

        return NextResponse.json({ links });

    } catch (error: any) {
        console.error("[SourceAPI] Error:", error.message);

        // Always try fallback if not explicitly requested
        if (!providerParam) {
            const fallbackProviderName = providerName === "allanime" ? "hianime" : "allanime";
            try {
                console.log(`[SourceAPI] Retrying with fallback: ${fallbackProviderName}`);
                const fallbackProvider = getProvider(fallbackProviderName);
                const sources = await fallbackProvider.getSources(showId, episodeString, mode);

                if (sources && sources.length > 0) {
                    console.log(`[SourceAPI] ✓ Fallback ${fallbackProviderName} succeeded!`);
                    const links = sources.map(s => {
                        const needsProxy = s.url.includes('sharepoint.com') ||
                            s.url.includes('drive.google.com') ||
                            s.url.includes('googleapis.com');
                        const finalUrl = needsProxy && s.url.startsWith('http')
                            ? `/api/proxy?url=${encodeURIComponent(s.url)}`
                            : s.url;
                        return {
                            link: finalUrl,
                            hls: s.isM3U8,
                            resolutionStr: s.quality || "default",
                            fromCache: new Date().toISOString()
                        };
                    });
                    return NextResponse.json({ links });
                }
            } catch (fallbackErr: any) {
                console.error(`[SourceAPI] Fallback ${fallbackProviderName} failed:`, fallbackErr.message);
            }
        }

        // Provide helpful error message with context
        const isHiAnimeError = providerName === "hianime" || error.message.includes("404");
        const errorMessage = isHiAnimeError
            ? "This show may not be available. The video source provider is currently unavailable."
            : `Source fetch failed: ${error.message}`;

        const suggestion = isHiAnimeError
            ? "Try searching for this anime on the home page to find an alternative version, or switch to Sub/Dub mode."
            : "Try switching to a different mode (Sub/Dub) or episode";

        return NextResponse.json(
            {
                error: errorMessage,
                suggestion,
                provider: providerName,
                fallbackAttempted: !providerParam
            },
            { status: 500 }
        );
    }
}
