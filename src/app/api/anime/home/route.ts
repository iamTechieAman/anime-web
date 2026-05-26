import { NextResponse } from "next/server";
import { getProvider } from "@/lib/providers";

export async function GET() {
    try {
        const hianime = getProvider('hianime');
        const anikai = getProvider('anikai');
        const consumet = getProvider('consumet');
        const aniwave = getProvider('aniwave');
        const aniwatchtv = getProvider('aniwatchtv');

        // Parallelize fetching with a total timeout
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout")), 8000)
        );

        const fetchHome = async () => {
            try {
                // Try Aniwave first (aniwaves.ru — live Aniwave mirror)
                const [trending, latest] = await Promise.all([
                    aniwave.getTrending?.() ?? Promise.resolve([]),
                    aniwave.getRecent?.() ?? Promise.resolve([])
                ]);
                if (trending.length > 0 || latest.length > 0) {
                    console.log("[AnimeHome] Successfully fetched from Aniwave");
                    return { trending, latest, slides: [] };
                }
            } catch (e) {
                console.warn('[AnimeHome] Aniwave failed, trying AniwatchTV:', e);
            }

            try {
                // Try AniwatchTV second (aniwatchtv.com.ro — WP site with sub+dub)
                const [trending, latest] = await Promise.all([
                    aniwatchtv.getTrending?.() ?? Promise.resolve([]),
                    aniwatchtv.getRecent?.() ?? Promise.resolve([])
                ]);
                if (trending.length > 0 || latest.length > 0) {
                    console.log("[AnimeHome] Successfully fetched from AniwatchTV");
                    return { trending, latest, slides: [] };
                }
            } catch (e) {
                console.warn('[AnimeHome] AniwatchTV failed, trying HiAnime:', e);
            }

            try {
                // Try HiAnime as fallback
                const [trending, latest] = await Promise.all([
                    hianime.getTrending?.() ?? Promise.resolve([]),
                    hianime.getRecent?.() ?? Promise.resolve([])
                ]);

                if (trending.length > 0 || latest.length > 0) {
                    console.log("[AnimeHome] Successfully fetched from HiAnime");
                    return { trending, latest, slides: [] };
                }
            } catch (e) {
                console.warn("[AnimeHome] HiAnime failed, trying Consumet:", e);
            }

            try {
                // Try Consumet (API-based)
                const [trending, latest] = await Promise.all([
                    consumet.getTrending?.() ?? Promise.resolve([]),
                    consumet.getRecent?.() ?? Promise.resolve([])
                ]);

                if (trending.length > 0 || latest.length > 0) {
                    console.log("[AnimeHome] Successfully fetched from Consumet");
                    return { trending, latest, slides: [] };
                }
            } catch (e) {
                console.error('[AnimeHome] All providers failed:', e);
            }

            return { trending: [], latest: [], slides: [] };
        };


        const result: any = await Promise.race([fetchHome(), timeoutPromise]);

        return NextResponse.json(result, {
            headers: {
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            }
        });
    } catch (error: any) {
        console.error("[AnimeHome] Critical Failure:", error.message);
        return NextResponse.json({ trending: [], latest: [] }, { status: 200 });
    }
}

