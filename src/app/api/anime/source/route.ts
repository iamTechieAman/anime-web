import { NextResponse } from "next/server";
import { getProvider, type ProviderName } from "@/lib/providers";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const showId = searchParams.get("id");
    const episodeString = searchParams.get("ep");
    const mode = (searchParams.get("mode") || "sub") as "sub" | "dub" | "raw";
    const serverId = searchParams.get("serverId") || undefined;
    const providerParam = searchParams.get("provider") as ProviderName;

    console.log(`[SourceAPI] Requesting: ID=${showId}, Ep=${episodeString}, Mode=${mode}, ServerID=${serverId}`);

    if (!showId || !episodeString) {
        return NextResponse.json(
            { error: "Show ID and Episode Number are required" },
            { status: 400 }
        );
    }

    // Anikai Provider now handles fallback chaining (Anikai -> AllAnime -> HiAnime)
    // So it's the safest default for most IDs.
    const defaultProvider = "anikai";
    const providerName = providerParam || defaultProvider;
    let provider;

    try {
        provider = getProvider(providerName);
        console.log(`[SourceAPI] Using provider: ${providerName}`);

        const sources = await provider.getSources(showId, episodeString, mode, serverId);

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

        // ==========================================
        // SMART FALLBACK (Try other providers)
        // ==========================================
        try {
            console.log(`[SourceAPI] Primary provider ${providerName} failed. Attempting Smart Fallback...`);

            // 1. Resolve Show Title to search on other providers
            let searchTitle = "";
            try {
                // If we don't have a title, try to fetch it from ANY provider that worked for info
                const infoProvider = getProvider(providerName);
                const info = await infoProvider.getInfo(showId);
                searchTitle = info.title;
            } catch (e) {
                console.log("[SourceAPI] Could not fetch info from primary provider for title resolution.");
            }

            // 2. Define fallback providers (Prioritize AllAnime as it's most reliable)
            const fallbacks: ProviderName[] = ["allanime", "anikai", "hianime", "aniwatch"];
            const otherProviders = fallbacks.filter(p => p !== providerName);

            for (const fallbackName of otherProviders) {
                try {
                    console.log(`[SourceAPI] Trying fallback: ${fallbackName}`);
                    const fallbackProvider = getProvider(fallbackName);
                    let fallbackId = showId;

                    // If we have a title, search first to get the correct ID for this provider
                    if (searchTitle) {
                        const results = await fallbackProvider.search(searchTitle);
                        if (results.length > 0) {
                            // Find best match (simple match for now)
                            const bestMatch = results.find(r =>
                                r.title.toLowerCase().includes(searchTitle.toLowerCase()) ||
                                searchTitle.toLowerCase().includes(r.title.toLowerCase())
                            ) || results[0];

                            console.log(`[SourceAPI] Resolved "${searchTitle}" to ${fallbackName} ID: ${bestMatch.id}`);
                            fallbackId = bestMatch.id;
                        }
                    }

                    // Try to get sources with (potentially new) ID
                    const sources = await fallbackProvider.getSources(fallbackId, episodeString, mode);

                    if (sources && sources.length > 0) {
                        console.log(`[SourceAPI] ✓ Universal Fallback ${fallbackName} succeeded!`);
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
                        return NextResponse.json({ links, provider: fallbackName });
                    }
                } catch (fbErr) {
                    // Silently fail and try next provider
                }
            }
        } catch (fallbackErr: any) {
            console.error(`[SourceAPI] Smart Fallback failed completely:`, fallbackErr.message);
        }

        // Provide helpful error message with context if everything fails
        const status = error.message.includes("not found") ? 404 : 500;
        return NextResponse.json(
            {
                error: "This show is currently unavailable on all sources.",
                suggestion: "Try switching between Sub and Dub, or check back later as we update our servers.",
                originalError: error.message
            },
            { status }
        );
    }
}
