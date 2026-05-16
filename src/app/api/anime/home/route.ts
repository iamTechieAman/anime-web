import { NextResponse } from "next/server";
import { getProvider } from "@/lib/providers";

export async function GET() {
    try {
        const hianime = getProvider('hianime');
        const aniwaves = getProvider('aniwaves');
        const consumet = getProvider('consumet');

        // Parallelize fetching with a total timeout
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout")), 8000)
        );

        const fetchHome = async () => {
            try {
                // Try HiAnime first (fastest, no scraper needed)
                const [trending, latest] = await Promise.all([
                    hianime.getTrending(),
                    hianime.getRecent()
                ]);

                if (trending.length > 0 || latest.length > 0) {
                    return { trending, latest };
                }
            } catch (e) {
                console.warn("[AnimeHome] HiAnime failed, trying Consumet:", e);
            }

            try {
                // Try Consumet (API-based, usually reliable)
                const [trending, latest] = await Promise.all([
                    consumet.getTrending(),
                    consumet.getRecent()
                ]);

                if (trending.length > 0 || latest.length > 0) {
                    return { trending, latest };
                }
            } catch (e) {
                console.warn("[AnimeHome] Consumet failed, trying Aniwave:", e);
            }

            try {
                // Try the new Aniwave (singular) scraper
                const aniwave = getProvider('aniwave');
                const [trending, latest] = await Promise.all([
                    aniwave.getTrending(),
                    aniwave.getRecent()
                ]);
                if (trending.length > 0 || latest.length > 0) {
                    return { trending, latest };
                }
            } catch (e) {
                console.warn("[AnimeHome] Aniwave (singular) failed, trying Aniwaves:", e);
            }

            try {
                // Fallback to Aniwaves (plural, uses scraper client)
                const aniwaves = getProvider('aniwaves');
                const data = await aniwaves.getRecent();
                const trending = await aniwaves.getTrending();
                return { trending, latest: data };
            } catch (e) {
                console.error("[AnimeHome] All providers failed:", e);
                return { trending: [], latest: [] };
            }
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

