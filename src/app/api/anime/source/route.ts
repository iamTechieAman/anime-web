export const runtime = "edge";
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

    // Consumet Provider serves as a highly robust entrypoint
    const defaultProvider = "consumet";
    let providerName = providerParam || defaultProvider;

    // 0. AUTO-DETECT PROVIDER FROM ID PREFIX
    if (showId && showId.includes(":")) {
        const [prefix] = showId.split(":");
        const prefixMap: Record<string, ProviderName> = {
            'aw': 'aniwatch',
            'hi': 'hianime',
            'al': 'allanime',
            'on': 'onoflix',
            'of': 'onoflix',
            'wa': 'watchanimeworld',
            'ja': 'justanime',
            'ax': 'animex',
            'cb': 'cinebolt',
            'un': 'cinebolt'
        };
        if (prefixMap[prefix]) {
            providerName = prefixMap[prefix];
            console.log(`[SourceAPI] Auto-detected provider: ${providerName} from ID prefix: ${prefix}`);
        }
    }

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
                isIframe: s.isIframe || false,
                fromCache: new Date().toISOString()
            };
        });

        return NextResponse.json({ links });

    } catch (error: any) {
        console.error("[SourceAPI] Error:", error.message);

        // ==========================================
        // AGGRESSIVE SOURCE SCRAMBLING (Multi-Provider Fallback)
        // ==========================================
        try {
            console.log(`[SourceAPI] Primary provider ${providerName} failed. Initiating Scrambling...`);

            // 1. Resolve Show Title if not provided
            let searchTitle = searchParams.get("title") || "";
            if (!searchTitle) {
                try {
                    const infoProviders: ProviderName[] = ["allanime", "hianime", "consumet"];
                    for (const ip of infoProviders) {
                        try {
                            const info = await getProvider(ip).getInfo(showId);
                            if (info?.title) { searchTitle = info.title; break; }
                        } catch (e) { }
                    }
                } catch (e) { }
            }

            // 2. Define and SHUFFLE fallback providers
            const fallbacks: ProviderName[] = ["consumet", "allanime", "hianime", "aniwatch", "anikai", "vidsrc"];
            const otherProviders = fallbacks
                .filter(p => p !== providerName)
                .sort(() => Math.random() - 0.5); // Randomize to avoid repeated failures

            console.log(`[SourceAPI] Scrambling: ${otherProviders.join(', ')}`);

            // 3. Try to get sources from other providers
            for (const fbName of otherProviders) {
                try {
                    console.log(`[SourceAPI] Trying scrambled fallback: ${fbName}`);
                    const fbProvider = getProvider(fbName);
                    let fbId = showId;

                    if (searchTitle) {
                        const results = await fbProvider.search(searchTitle);
                        if (results.length > 0) {
                            const match = results.find(r => 
                                r.title.toLowerCase().includes(searchTitle.toLowerCase()) || 
                                searchTitle.toLowerCase().includes(r.title.toLowerCase())
                            ) || results[0];
                            fbId = match.id;
                        }
                    }

                    const sources = await fbProvider.getSources(fbId, episodeString, mode);

                    if (sources && sources.length > 0) {
                        console.log(`[SourceAPI] ✓ Scrambling succeeded with ${fbName}!`);
                        const links = sources.map(s => ({
                            link: s.url,
                            hls: s.isM3U8,
                            resolutionStr: s.quality || "auto",
                            isIframe: s.isIframe || false,
                            fromCache: new Date().toISOString()
                        }));
                        return NextResponse.json({ links, provider: fbName });
                    }
                } catch (fbErr) {
                    continue; // try next
                }
            }
        } catch (scrambleErr: any) {
            console.error(`[SourceAPI] Scrambling failed completely:`, scrambleErr.message);
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
